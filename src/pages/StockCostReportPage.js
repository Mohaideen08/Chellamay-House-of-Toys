import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Typography, Paper, Stack, Chip,
  Card, CardContent, TextField, InputAdornment,
  IconButton, LinearProgress, useTheme,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from '../context/SnackbarContext';
import { esc } from '../utils/sanitize';
import dayjs from 'dayjs';

const fadeInUp = (delay = 0) => ({
  '@keyframes fadeInUp': {
    '0%': { opacity: 0, transform: 'translateY(24px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' },
  },
  animation: `fadeInUp 0.5s ease ${delay}s both`,
});

const StockCostReportPage = () => {
  const { profile } = useAuth();
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);

  // Redirect non-admins
  const isAdmin = profile?.role === 'admin';

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const query = supabase
      .from('products')
      .select('id, name, item_code, barcode, mrp, purchase_price, current_quantity, created_at, categories(name)')
      .order('name');

    if (dateFrom) {
      query.gte('created_at', dateFrom.startOf('day').toISOString());
    }
    if (dateTo) {
      query.lte('created_at', dateTo.endOf('day').toISOString());
    }

    const { data, error } = await query;
    if (error) {
      showSnackbar('Failed to load products', 'error');
    } else {
      setProducts(data ?? []);
    }
    setLoading(false);
  }, [dateFrom, dateTo, showSnackbar]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const filtered = products.filter((p) => {
    const q = searchText.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.item_code?.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q) ||
      p.categories?.name?.toLowerCase().includes(q)
    );
  });

  const totalProducts = filtered.length;
  const totalStockQty = filtered.reduce((s, p) => s + (p.current_quantity ?? 0), 0);
  const totalPurchaseCost = filtered.reduce(
    (s, p) => s + (Number(p.purchase_price) || 0) * (p.current_quantity ?? 0),
    0
  );
  const totalMRPValue = filtered.reduce(
    (s, p) => s + (Number(p.mrp) || 0) * (p.current_quantity ?? 0),
    0
  );

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=1000,height=700');
    if (!win) { showSnackbar('Pop-up blocked – allow pop-ups and try again', 'warning'); return; }

    const dateRange = dateFrom || dateTo
      ? `${dateFrom ? dayjs(dateFrom).format('DD/MM/YYYY') : '—'} to ${dateTo ? dayjs(dateTo).format('DD/MM/YYYY') : '—'}`
      : 'All Dates';

    const rows = filtered.map((p, i) => {
      const purchaseRate = Number(p.purchase_price) || 0;
      const qty = p.current_quantity ?? 0;
      const totalCost = purchaseRate * qty;
      return `<tr>
        <td>${i + 1}</td>
        <td>${esc(p.name)}</td>
        <td>${esc(p.item_code || '—')}</td>
        <td>${esc(p.categories?.name || '—')}</td>
        <td style="text-align:right">₹${purchaseRate.toFixed(2)}</td>
        <td style="text-align:center">${qty}</td>
        <td style="text-align:right;font-weight:700">₹${totalCost.toFixed(2)}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><title>Stock Cost Report</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 16px; }
      h2 { text-align: center; font-size: 15px; margin-bottom: 4px; }
      .sub { text-align: center; font-size: 10px; color: #555; margin-bottom: 12px; }
      .summary { display: flex; gap: 12px; margin-bottom: 14px; }
      .summary-card { flex: 1; border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; }
      .summary-card .label { font-size: 9px; color: #777; text-transform: uppercase; }
      .summary-card .value { font-size: 14px; font-weight: 700; color: #111; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #f3f4f6; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #ddd; }
      td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 10.5px; }
      tr:hover td { background: #fafafa; }
      .total-row td { font-weight: 700; border-top: 2px solid #111; background: #f9f9f9; }
      @media print { @page { margin: 10mm; } }
    </style></head><body>
    <h2>Stock Purchase Cost Report</h2>
    <div class="sub">Chellamay House of Toys &nbsp;|&nbsp; Generated: ${dayjs().format('DD MMM YYYY, hh:mm A')} &nbsp;|&nbsp; Date Filter: ${esc(dateRange)}</div>
    <div class="summary">
      <div class="summary-card"><div class="label">Products</div><div class="value">${totalProducts}</div></div>
      <div class="summary-card"><div class="label">Total Stock Qty</div><div class="value">${totalStockQty}</div></div>
      <div class="summary-card"><div class="label">Total Purchase Cost</div><div class="value">₹${totalPurchaseCost.toFixed(2)}</div></div>
      <div class="summary-card"><div class="label">Total MRP Value</div><div class="value">₹${totalMRPValue.toFixed(2)}</div></div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Product Name</th><th>Item Code</th><th>Category</th><th style="text-align:right">Purchase Rate</th><th style="text-align:center">Stock Qty</th><th style="text-align:right">Total Cost</th></tr></thead>
      <tbody>${rows}
        <tr class="total-row">
          <td colspan="5" style="text-align:right">Grand Total</td>
          <td style="text-align:center">${totalStockQty}</td>
          <td style="text-align:right">₹${totalPurchaseCost.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
    </body></html>`;

    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
    showSnackbar('Report sent to printer');
  };

  if (!isAdmin) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 2 }}>
        <AccountBalanceWalletRoundedIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
        <Typography variant="h6" color="text.secondary" fontWeight={700}>Admin Access Only</Typography>
        <Typography color="text.disabled" fontSize="0.87rem">You do not have permission to view this report.</Typography>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ minHeight: '100vh' }}>

        {/* ── Header ─────────────────────────────────────────────── */}
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
              <AccountBalanceWalletRoundedIcon sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.2 }}>
                Stock Purchase Cost Report
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.72rem' }}>
                Total investment value of current stock · Admin only
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<PrintRoundedIcon />}
            onClick={handlePrint}
            disabled={filtered.length === 0}
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
            Print Report
          </Button>
        </Box>

        {/* ── Summary Cards ───────────────────────────────────────── */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ ...fadeInUp(0.08), mb: 2.5 }}>
          {[
            { label: 'Total Products', value: totalProducts, icon: Inventory2RoundedIcon, color: theme.palette.primary.main },
            { label: 'Total Stock Qty', value: totalStockQty.toLocaleString(), icon: ShoppingCartRoundedIcon, color: '#0EA5E9' },
            { label: 'Total Purchase Cost', value: `₹${totalPurchaseCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: AccountBalanceWalletRoundedIcon, color: '#22C55E' },
            { label: 'Total MRP Value', value: `₹${totalMRPValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: TrendingUpRoundedIcon, color: theme.palette.secondary.main },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} elevation={0} sx={{ flex: 1, borderRadius: '10px', border: '1.5px solid', borderColor: alpha(card.color, 0.2), background: alpha(card.color, 0.04) }}>
                <CardContent sx={{ py: '14px !important', px: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: alpha(card.color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon sx={{ fontSize: 22, color: card.color }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {card.label}
                    </Typography>
                    <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: card.color, lineHeight: 1.3 }}>
                      {card.value}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Stack>

        {/* ── Filters ─────────────────────────────────────────────── */}
        <Paper
          elevation={0}
          sx={{
            ...fadeInUp(0.14),
            borderRadius: '8px',
            border: '1.5px solid',
            borderColor: 'rgba(var(--color-primary-rgb),0.13)',
            overflow: 'hidden',
          }}
        >
          {/* Filter Toolbar */}
          <Box sx={{
            px: { xs: 1.5, sm: 2.5 }, py: 1.8,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 1.5,
            borderBottom: '1.5px solid rgba(var(--color-primary-rgb),0.1)',
            bgcolor: '#fff',
          }}>
            <Stack direction="row" alignItems="center" spacing={1.2} flexWrap="wrap">
              <FilterListRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#1A1A2E' }}>Filters</Typography>
              <DatePicker
                label="From Date"
                value={dateFrom}
                onChange={setDateFrom}
                maxDate={dateTo ?? undefined}
                slotProps={{
                  textField: {
                    size: 'small',
                    sx: { width: 155, '& .MuiInputBase-root': { borderRadius: '8px', fontSize: '0.8rem' } },
                  },
                }}
              />
              <DatePicker
                label="To Date"
                value={dateTo}
                onChange={setDateTo}
                minDate={dateFrom ?? undefined}
                slotProps={{
                  textField: {
                    size: 'small',
                    sx: { width: 155, '& .MuiInputBase-root': { borderRadius: '8px', fontSize: '0.8rem' } },
                  },
                }}
              />
              {(dateFrom || dateTo) && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => { setDateFrom(null); setDateTo(null); }}
                  sx={{ borderRadius: '8px', fontSize: '0.74rem', py: 0.6, px: 1.5, borderColor: 'rgba(var(--color-primary-rgb),0.3)', color: 'primary.main' }}
                >
                  Clear
                </Button>
              )}
            </Stack>

            <TextField
              size="small"
              placeholder="Search by name, code, category…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              sx={{
                width: { xs: '100%', sm: 280 },
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  '& fieldset': { borderColor: 'rgba(var(--color-primary-rgb),0.22)' },
                  '&:hover fieldset': { borderColor: 'rgba(var(--color-primary-rgb),0.45)' },
                },
                '& input': { fontSize: '0.8rem' },
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
                      <CloseRoundedIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
          </Box>

          {loading && (
            <LinearProgress sx={{ '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` } }} />
          )}

          {/* Table */}
          <TableContainer sx={{ maxHeight: 520 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {['#', 'Product Name', 'Item Code', 'Category', 'Purchase Rate (₹)', 'Stock Qty', 'Total Cost (₹)'].map((h) => (
                    <TableCell
                      key={h}
                      align={['Purchase Rate (₹)', 'Stock Qty', 'Total Cost (₹)'].includes(h) ? 'right' : h === '#' ? 'center' : 'left'}
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
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        {searchText ? 'No products match your search' : 'No products found'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((product, index) => {
                  const purchaseRate = Number(product.purchase_price) || 0;
                  const qty = product.current_quantity ?? 0;
                  const totalCost = purchaseRate * qty;
                  return (
                    <TableRow
                      key={product.id}
                      sx={{
                        '&:hover': { background: alpha(theme.palette.primary.main, 0.03) },
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <TableCell align="center" sx={{ fontSize: '0.72rem', color: 'text.disabled', fontWeight: 600, width: 36 }}>
                        {index + 1}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 220 }}>
                        <Typography sx={{ fontSize: '0.84rem', fontWeight: 600, color: 'text.primary' }} noWrap>
                          {product.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
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
                      <TableCell>
                        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                          {product.categories?.name || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontSize: '0.84rem', fontWeight: 600, color: 'text.primary', fontFamily: 'monospace' }}>
                          ₹{purchaseRate.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={qty}
                          size="small"
                          sx={{
                            fontWeight: 700, fontSize: '0.7rem', minWidth: 40, height: 22,
                            bgcolor: qty > 10 ? alpha('#22C55E', 0.12) : qty > 0 ? alpha('#F59E0B', 0.12) : alpha('#EF4444', 0.12),
                            color: qty > 10 ? '#16A34A' : qty > 0 ? '#B45309' : '#EF4444',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontSize: '0.88rem', fontWeight: 800, color: theme.palette.primary.main, fontFamily: 'monospace' }}>
                          ₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* Grand Total Row */}
                {filtered.length > 0 && (
                  <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
                    <TableCell colSpan={5} align="right" sx={{ fontWeight: 800, fontSize: '0.84rem', color: 'text.primary', py: 1.5, borderTop: `2px solid ${alpha(theme.palette.primary.main, 0.2)}` }}>
                      Grand Total
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.88rem', color: '#0EA5E9', borderTop: `2px solid ${alpha(theme.palette.primary.main, 0.2)}` }}>
                      {totalStockQty}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1rem', color: theme.palette.primary.main, fontFamily: 'monospace', borderTop: `2px solid ${alpha(theme.palette.primary.main, 0.2)}` }}>
                      ₹{totalPurchaseCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default StockCostReportPage;
