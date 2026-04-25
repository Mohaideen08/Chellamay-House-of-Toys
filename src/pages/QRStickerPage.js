import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Box, Button, Typography, Paper, Stack, TextField, InputAdornment,
  Checkbox, Chip, Divider, Slider,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, IconButton, useTheme, useMediaQuery,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../services/supabase';
import { useSnackbar } from '../context/SnackbarContext';
import { esc } from '../utils/sanitize';
import dayjs from 'dayjs';

// ─── Sticker Print Template (inline styles – works in print window) ──────────
const StickerPreview = ({ items }) => {
  const now = dayjs().format('YYMMDD');
  return (
    <div style={{ padding: 14, background: '#e0e0e0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {items.flatMap((item) =>
          Array.from({ length: item.qty }, (_, i) => {
            const code = item.product.barcode || item.product.item_code || String(item.product.id);
            return (
              <div
                key={`${item.product.id}-${i}`}
                style={{
                  width: '100%',
                  aspectRatio: '35/22',
                  borderRadius: 6,
                  backgroundColor: '#fff',
                  fontFamily: 'Arial, sans-serif',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '4px 6px',
                  boxSizing: 'border-box',
                  boxShadow: 'none',
                }}
              >
                {/* Shop name header */}
                <div style={{ fontSize: 7, fontWeight: 700, color: '#111', letterSpacing: 0.4, marginBottom: 2 }}>செல்லமே</div>
                {/* Body: QR left | info right */}
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 10 }}>
                  <div style={{ flexShrink: 0 }}>
                    <QRCodeSVG value={code} size={16} level="M" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1.5 }}>
                    <div style={{ fontSize: 7, fontWeight: 700, color: '#111', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {item.product.name}
                    </div>
                    <div style={{ fontSize: 7, fontWeight: 900, color: '#000' }}>
                      MRP. {Math.round(item.product.mrp)}
                    </div>
                    <div style={{ fontSize: 9, color: '#333', fontFamily: 'monospace', fontWeight: 700 }}>
                      *{code}*
                    </div>
                    <div style={{ fontSize: 5.5, color: '#333', fontWeight: 700 }}>{now}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

/* ── animation helpers ──────────────────────────────────── */
const fadeInUp = (delay = 0) => ({
  '@keyframes fadeInUp': {
    from: { opacity: 0, transform: 'translateY(30px)' },
    to:   { opacity: 1, transform: 'translateY(0)' },
  },
  animation: `fadeInUp 0.55s cubic-bezier(.22,.68,0,1.2) ${delay}s forwards`,
  opacity: 0,
});

// ─── Main Page ────────────────────────────────────────────────────────────────
const QRStickerPage = () => {
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  useMediaQuery(theme.breakpoints.down('sm'));
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selected, setSelected] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [qtyDialogOpen, setQtyDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handlePrint = useCallback(() => {
    const win = window.open('', '_blank', 'width=1000,height=700');
    if (!win) { showSnackbar('Pop-up blocked – allow pop-ups and try again', 'warning'); return; }
    const itemsSnap = selectedItemsRef.current;
    const now = dayjs().format('YYMMDD');
    const stickers = itemsSnap.flatMap((item) =>
      Array.from({ length: item.qty }, (_, i) => {
        const code = item.product.barcode || item.product.item_code || String(item.product.id);
        const qrEl = document.querySelector(`[data-qr-id="${item.product.id}-${i}"] svg`);
        const qrHtml = qrEl ? qrEl.outerHTML : '';
        const pname = `<div class="pname">${esc(item.product.name)}</div>`;
        return `<div class="sticker"><div class="body"><div class="qr"><div class="shop">\u0b9a\u0bc6\u0bb2\u0bcd\u0bb2\u0bae\u0bc7</div>${qrHtml}</div><div class="info">${pname}<div class="price">MRP. ${Math.round(item.product.mrp)}</div><div class="code">*${esc(code)}*</div><div class="dt">${esc(now)}</div></div></div></div>`;
      })
    );
    const html = stickers.join('');
    // 4-inch roll: 101.6mm wide, sticker 35.8mm × 25mm (3 per row, no gap)
    const rowCount = Math.ceil(stickers.length / 3);
    const pageHeightMm = rowCount * 25; // each row = 25mm, no gap
    const styles = `
      @page { size: 103.6mm ${pageHeightMm}mm; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { font-family: Arial, sans-serif; background: #fff; width: 101.6mm; height: ${pageHeightMm}mm; overflow: hidden; }
      .grid { display: grid; grid-template-columns: repeat(3, 35.8mm); gap: 0; width: 101.4mm; height: ${pageHeightMm}mm; }
      .sticker { width: 35.8mm; height: 25mm; overflow: hidden; display: flex; flex-direction: column; padding: 0.8mm 1mm; background: #fff; page-break-inside: avoid; break-inside: avoid; }
      .body { display: flex; align-items: center; flex: 1; gap: 1.5pt; overflow: hidden; }
      .qr { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; }
      .shop { font-size: 5.5pt; font-weight: 700; color: #111; letter-spacing: 0.2px; margin-bottom: 0.5pt; text-align: center; }
      .qr svg { width: 10mm; height: 10mm; display: block; }
      .info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 0.3pt; overflow: hidden; }
      .pname { font-size: 5pt; font-weight: 700; color: #111; line-height: 1.2; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
      .price { font-size: 6pt; font-weight: 900; color: #000; white-space: nowrap; }
      .code { font-size: 5.5pt; font-weight: 900; color: #333; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .dt { font-size: 4pt; color: #333; font-weight: 700; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    `;
    win.document.write('<!DOCTYPE html><html><head><title>Chellamay Toys Stickers</title><style>' + styles + '</style></head><body><div class="grid">' + html + '</div></body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
    showSnackbar('Stickers sent to printer');
  }, [showSnackbar]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id, name, item_code, barcode, mrp, current_quantity, created_at')
      .order('name');
    if (!error) setProducts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const filtered = products.filter((p) => {
    const q = searchText.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.item_code?.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q)
    );
  });

  const toggleSelect = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    if (!quantities[id]) {
      const stock = products.find((p) => p.id === id)?.current_quantity ?? 1;
      setQuantities((prev) => ({ ...prev, [id]: Math.max(1, stock) }));
    }
  };

  const toggleAll = () => {
    if (selected.length === filtered.length) {
      setSelected([]);
    } else {
      const ids = filtered.map((p) => p.id);
      setSelected(ids);
      const newQtys = {};
      ids.forEach((id) => {
        if (!quantities[id]) {
          const stock = products.find((p) => p.id === id)?.current_quantity ?? 1;
          newQtys[id] = Math.max(1, stock);
        }
      });
      setQuantities((prev) => ({ ...prev, ...newQtys }));
    }
  };

  const setQty = (id, val) => {
    const v = Math.max(1, parseInt(val) || 1);
    setQuantities((prev) => ({ ...prev, [id]: v }));
  };

  const selectedItems = selected
    .map((id) => ({ product: products.find((p) => p.id === id), qty: quantities[id] || 1 }))
    .filter((item) => !!item.product);

  // always-current ref so handlePrint closure sees the latest items
  const selectedItemsRef = useRef(selectedItems);
  selectedItemsRef.current = selectedItems;

  const totalStickers = selectedItems.reduce((s, i) => s + i.qty, 0);

  const openQtyDialog = () => {
    if (selectedItems.length === 0) { showSnackbar('Select at least one product', 'warning'); return; }
    setQtyDialogOpen(true);
  };

  return (
    <Box sx={{ minHeight: '100vh' }}>

      {/* ── Header Bar ─────────────────────────────────── */}
      <Box
        sx={{
          ...fadeInUp(0),
          mb: 2.5,
          borderRadius: '8px',
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 60%, ${theme.palette.secondary.dark} 100%)`,
          px: { xs: 2, sm: 2.5 }, py: 1.4,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 1.5,
          boxShadow: '0 4px 18px rgba(var(--color-primary-rgb),0.32)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 38, height: 38, borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid rgba(255,255,255,0.3)',
          }}>
            <QrCodeScannerRoundedIcon sx={{ color: '#fff', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.2 }}>
              Barcode Sticker Generator
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.72rem' }}>
              Select products, set quantities &amp; print
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          {selected.length > 0 && (
            <Chip
              label={`${selected.length} selected · ${totalStickers} stickers`}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)', color: '#fff',
                fontWeight: 700, fontSize: '0.76rem',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            />
          )}
          <Button
            variant="contained"
            startIcon={<TuneRoundedIcon />}
            onClick={openQtyDialog}
            disabled={selected.length === 0}
            size="small"
            sx={{
              fontWeight: 700, px: 2, py: 0.75, borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.22)',
              color: '#fff',
              border: '1.5px solid rgba(255,255,255,0.35)',
              backdropFilter: 'blur(8px)',
              fontSize: '0.8rem',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.32)' },
              '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', border: '1.5px solid rgba(255,255,255,0.15)' },
            }}
          >
            Set Qty &amp; Print
          </Button>
        </Stack>
      </Box>

      {/* ── Product Table ────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          ...fadeInUp(0.12),
          borderRadius: '8px',
          border: '1.5px solid',
          borderColor: 'rgba(var(--color-primary-rgb),0.13)',
          overflow: 'hidden',
        }}
      >
        {/* Toolbar */}
        <Box sx={{
          px: { xs: 1.5, sm: 2.5 }, py: 1.8,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 1.5,
          borderBottom: '1.5px solid rgba(var(--color-primary-rgb),0.1)',
          bgcolor: '#fff',
        }}>
          <Stack direction="row" alignItems="center" spacing={1.2}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#1A1A2E' }}>Select Products</Typography>
            {!loading && (
              <Chip
                label={`${filtered.length} item${filtered.length !== 1 ? 's' : ''}`}
                size="small"
                sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.dark', fontWeight: 700, fontSize: '0.7rem' }}
              />
            )}
            {selected.length > 0 && (
              <Chip
                label={`${selected.length} checked`}
                size="small"
                sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), color: 'secondary.dark', fontWeight: 700, fontSize: '0.7rem' }}
              />
            )}
          </Stack>
          <TextField
            size="small"
            placeholder="Search by name, code or barcode…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{
              width: { xs: '100%', sm: 280 },
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                '& fieldset': { borderColor: 'rgba(var(--color-primary-rgb),0.22)' },
                '&:hover fieldset': { borderColor: 'rgba(var(--color-primary-rgb),0.45)' },
                '&.Mui-focused fieldset': { bordercolor: 'primary.main' },
                '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(var(--color-primary-rgb),0.12)' },
              },
              '& input': { fontSize: '0.8rem' },
              '& input::placeholder': { fontSize: '0.77rem', opacity: 0.7 },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                </InputAdornment>
              ),
              endAdornment: searchText ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchText('')}>
                    <CloseRounded sx={{ fontSize: 15, color: 'text.secondary' }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
        </Box>

        {loading && <LinearProgress sx={{ '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` } }} />}

        <TableContainer sx={{ maxHeight: 520 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb),0.09) 0%, rgba(var(--color-secondary-rgb),0.09) 100%)' }}>
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < filtered.length}
                    checked={filtered.length > 0 && selected.length === filtered.length}
                    onChange={toggleAll}
                    disabled={filtered.length === 0}
                    size="small"
                    color="secondary"
                  />
                </TableCell>
                {['#', 'Product Name', 'Item Code', 'Barcode', 'MRP (₹)', 'Stock', 'Date Added'].map((h) => (
                  <TableCell
                    key={h}
                    align={h === 'Product Name' || h === 'Date Added' ? 'left' : 'center'}
                    sx={{
                      background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb),0.09) 0%, rgba(var(--color-secondary-rgb),0.09) 100%)',
                      fontWeight: 700, fontSize: '0.72rem', color: 'primary.dark',
                      whiteSpace: 'nowrap', py: 1.2,
                      letterSpacing: '0.04em', textTransform: 'uppercase',
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      {searchText ? 'No products match your search' : 'No products found'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((product, index) => {
                const isSelected = selected.includes(product.id);
                const barcodeCode = product.barcode || product.item_code || String(product.id);
                return (
                  <TableRow
                    key={product.id}
                    onClick={() => toggleSelect(product.id)}
                    hover
                    sx={{
                      cursor: 'pointer',
                      bgcolor: isSelected
                        ? 'linear-gradient(90deg, rgba(var(--color-primary-rgb),0.06) 0%, rgba(var(--color-secondary-rgb),0.06) 100%)'
                        : 'inherit',
                      background: isSelected
                        ? 'linear-gradient(90deg, rgba(var(--color-primary-rgb),0.06) 0%, rgba(var(--color-secondary-rgb),0.06) 100%)'
                        : 'inherit',
                      transition: 'background 0.18s ease',
                      '&:hover': {
                        background: isSelected
                          ? 'linear-gradient(90deg, rgba(var(--color-primary-rgb),0.1) 0%, rgba(var(--color-secondary-rgb),0.1) 100%)'
                          : 'linear-gradient(90deg, rgba(var(--color-primary-rgb),0.03) 0%, rgba(var(--color-secondary-rgb),0.03) 100%)',
                      },
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        size="small"
                        color="secondary"
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelect(product.id)}
                      />
                    </TableCell>
                    {/* # */}
                    <TableCell align="center" sx={{ fontSize: '0.72rem', color: 'text.disabled', fontWeight: 600, width: 36 }}>
                      {index + 1}
                    </TableCell>
                    {/* Product Name */}
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography
                        sx={{ fontSize: '0.84rem', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#AD1457' : 'text.primary' }}
                        noWrap
                      >
                        {product.name}
                      </Typography>
                    </TableCell>
                    {/* Item Code */}
                    <TableCell align="center">
                      <Chip
                        label={product.item_code || '—'}
                        size="small"
                        sx={{
                          fontSize: '0.68rem', fontWeight: 700, height: 22,
                          bgcolor: alpha(theme.palette.secondary.main, 0.08), color: 'secondary.dark',
                          border: `1px solid ${alpha(theme.palette.secondary.main, 0.22)}`,
                        }}
                      />
                    </TableCell>
                    {/* Barcode */}
                    <TableCell align="center">
                      <Typography sx={{
                        fontFamily: 'monospace', fontSize: '0.74rem',
                        bgcolor: alpha(theme.palette.primary.main, 0.07),
                        px: 0.8, py: 0.3, borderRadius: 1,
                        color: 'primary.dark', fontWeight: 700, whiteSpace: 'nowrap',
                      }}>
                        {barcodeCode}
                      </Typography>
                    </TableCell>
                    {/* MRP */}
                    <TableCell align="center">
                      <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, color: 'primary.main', whiteSpace: 'nowrap' }}>
                        ₹{Number(product.mrp).toFixed(2)}
                      </Typography>
                    </TableCell>
                    {/* Stock */}
                    <TableCell align="center">
                      <Chip
                        label={product.current_quantity ?? 0}
                        size="small"
                        sx={{
                          fontWeight: 700, fontSize: '0.7rem', minWidth: 36, height: 22,
                          bgcolor: (product.current_quantity ?? 0) > 10
                            ? alpha('#22C55E', 0.12)
                            : (product.current_quantity ?? 0) > 0
                              ? alpha('#F59E0B', 0.12)
                              : alpha('#EF4444', 0.12),
                          color: (product.current_quantity ?? 0) > 10 ? '#16A34A'
                            : (product.current_quantity ?? 0) > 0 ? '#B45309' : '#EF4444',
                        }}
                      />
                    </TableCell>
                    {/* Date Added */}
                    <TableCell>
                      <Typography variant="caption" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>
                        {product.created_at ? dayjs(product.created_at).format('DD MMM YYYY hh:mm A') : '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ── Off-screen render area for barcode SVG capture ────────────── */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: 700, visibility: 'hidden' }}>
        {selectedItems.flatMap((item) =>
          Array.from({ length: item.qty }, (_, i) => {
            const code = item.product.barcode || item.product.item_code || String(item.product.id);
            return (
              <span key={`${item.product.id}-${i}`} data-qr-id={`${item.product.id}-${i}`}>
                <QRCodeSVG value={code} size={48} level="M" />
              </span>
            );
          })
        )}
      </div>

      {/* ── Set Sticker Quantities Dialog ────────────────────────────── */}
      <Dialog
        open={qtyDialogOpen}
        onClose={() => setQtyDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        TransitionProps={{ timeout: 350 }}
        PaperProps={{ sx: { borderRadius: '10px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(var(--color-primary-rgb),0.28)' } }}
      >
        {/* Dialog Header */}
        <DialogTitle sx={{ p: 0 }}>
          <Box sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            color: '#fff', px: { xs: 2, sm: 3 }, py: 2.5,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'relative', overflow: 'hidden',
          }}>
            <Box sx={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, zIndex: 1 }}>
              <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TuneRoundedIcon sx={{ fontSize: 22 }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.2 }} component="div">Set Sticker Quantities</Typography>
                <Typography sx={{ fontSize: '0.74rem', opacity: 0.78 }}>{selected.length} product{selected.length !== 1 ? 's' : ''} selected</Typography>
              </Box>
            </Box>
            <IconButton
              onClick={() => setQtyDialogOpen(false)}
              sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', zIndex: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.28)', transform: 'rotate(90deg)' }, transition: 'all 0.3s ease' }}
            >
              <CloseRounded fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        {/* Product Qty List */}
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ maxHeight: 400, overflowY: 'auto', px: 3, py: 2.5 }}>
            {selectedItems.map(({ product, qty }, idx) => {
              const barcodeCode = product.barcode || product.item_code || String(product.id);
              return (
                <Box key={product.id}>
                  {idx > 0 && <Divider sx={{ my: 2 }} />}
                  {/* Product info row */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: 2, flexShrink: 0, background: 'linear-gradient(135deg, #EDE9FE, #DDD6FE)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: 'secondary.dark' }}>{idx + 1}</Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>{product.name}</Typography>
                      <Typography variant="caption" sx={{ color: 'secondary.main', fontFamily: 'monospace', fontWeight: 600 }}>{barcodeCode}</Typography>
                    </Box>
                    <Chip label={`${qty} sticker${qty !== 1 ? 's' : ''}`} size="small" color="secondary" sx={{ fontWeight: 700, flexShrink: 0 }} />
                  </Box>
                  {/* Slider + Input */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pl: 0.5 }}>
                    <Slider
                      value={qty}
                      onChange={(_, v) => setQty(product.id, v)}
                      min={1} max={100} step={1}
                      size="small"
                      color="secondary"
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      type="number"
                      size="small"
                      value={qty}
                      onChange={(e) => setQty(product.id, e.target.value)}
                      sx={{ width: 74 }}
                      inputProps={{ min: 1, max: 500 }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* Summary bar */}
          <Box sx={{
            px: 3, py: 2,
            background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb),0.06) 0%, rgba(var(--color-secondary-rgb),0.06) 100%)',
            borderTop: '1.5px solid rgba(var(--color-primary-rgb),0.12)',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }} display="block">Products</Typography>
              <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: 'primary.dark', lineHeight: 1.2 }}>{selected.length}</Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }} display="block">Total Stickers</Typography>
              <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: 'primary.main', lineHeight: 1.2 }}>{totalStickers}</Typography>
            </Box>
            <Box sx={{ flex: 1, textAlign: 'right' }}>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Printed on</Typography>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: 'secondary.dark' }} display="block">
                {dayjs().format('DD MMM YYYY, hh:mm A')}
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        {/* Actions */}
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2.5, gap: 1.5, bgcolor: '#fff', borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            variant="outlined"
            onClick={() => setQtyDialogOpen(false)}
            sx={{
              flex: 1, py: 1.1, borderRadius: '10px',
              borderColor: 'rgba(var(--color-primary-rgb),0.35)', color: 'primary.main',
              '&:hover': { bordercolor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.04) },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="outlined"
            startIcon={<QrCodeScannerRoundedIcon />}
            onClick={() => { setQtyDialogOpen(false); setPreviewOpen(true); }}
            sx={{
              flex: 1, py: 1.1, borderRadius: '10px', fontWeight: 600,
              borderColor: 'rgba(var(--color-secondary-rgb),0.4)', color: 'secondary.main',
              '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.05), bordercolor: 'secondary.main' },
            }}
          >
            Preview
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintRoundedIcon />}
            onClick={() => { setQtyDialogOpen(false); handlePrint(); }}
            sx={{
              flex: 2, py: 1.1, borderRadius: '10px', fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              boxShadow: '0 4px 15px rgba(var(--color-primary-rgb),0.35)',
              '&:hover': { background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`, boxShadow: '0 6px 22px rgba(var(--color-primary-rgb),0.45)', transform: 'translateY(-1px)' },
              transition: 'all 0.25s ease',
            }}
          >
            Print {totalStickers} Sticker{totalStickers !== 1 ? 's' : ''}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Sticker Preview Dialog ───────────────────────────────────── */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="sm" fullWidth scroll="paper"
        TransitionProps={{ timeout: 350 }}
        PaperProps={{ sx: { borderRadius: '10px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(var(--color-primary-rgb),0.25)' } }}
      >
        <Box sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          px: { xs: 2, sm: 3 }, py: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <QrCodeScannerRoundedIcon sx={{ color: '#fff', fontSize: 22 }} />
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem' }}>
              Sticker Preview · {totalStickers} stickers
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => setPreviewOpen(false)}
            sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.28)', transform: 'rotate(90deg)' }, transition: 'all 0.3s ease' }}
          >
            <CloseRounded fontSize="small" />
          </IconButton>
        </Box>
        <DialogContent dividers sx={{ bgcolor: '#FAFBFF' }}>
          <StickerPreview items={selectedItems} />
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2.5, pt: 2, gap: 1.5, bgcolor: '#fff', borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            variant="outlined"
            onClick={() => setPreviewOpen(false)}
            sx={{ flex: 1, borderRadius: '10px', borderColor: 'rgba(var(--color-primary-rgb),0.35)', color: 'primary.main', '&:hover': { bordercolor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.04) } }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintRoundedIcon />}
            onClick={() => { setPreviewOpen(false); handlePrint(); }}
            sx={{
              flex: 2, borderRadius: '10px', fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              boxShadow: '0 4px 15px rgba(var(--color-primary-rgb),0.35)',
              '&:hover': { background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`, transform: 'translateY(-1px)' },
              transition: 'all 0.25s ease',
            }}
          >
            Print Now
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QRStickerPage;
