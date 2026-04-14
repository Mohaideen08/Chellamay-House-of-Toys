import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Typography, Dialog, DialogContent, DialogActions,
  TextField, IconButton, Tooltip, Stack, Paper, InputAdornment, MenuItem,
  Switch, FormControlLabel, Chip, Avatar, useTheme, useMediaQuery,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import GroupWorkRoundedIcon from '@mui/icons-material/GroupWorkRounded';
import PercentRoundedIcon from '@mui/icons-material/PercentRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SystemUpdateAltRoundedIcon from '@mui/icons-material/SystemUpdateAltRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import { supabase } from '../services/supabase';
import ConfirmDialog from '../components/ConfirmDialog';
import { useSnackbar } from '../context/SnackbarContext';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

const EMPTY_FORM = {
  name: '', category_id: '', barcode: '', item_code: '', hsn: '',
  mrp: '', purchase_price: '', sales_price: '', final_price: '',
  gst_enabled: false, sgst_percent: '', cgst_percent: '', cess_percent: '',
  opening_quantity: '0', current_quantity: '0', dealer_id: '', branch_id: '',
};

const generateBarcode = (seq = 1) => {
  const ts = Date.now().toString().slice(-4);
  const num = String(seq).padStart(3, '0');
  return `CHT${ts}${num}`;
};

const SECRET_CODE = '9876';

/* ── animation helpers ──────────────────────────────────── */
const fadeInUp = (delay = 0) => ({
  '@keyframes fadeInUp': {
    from: { opacity: 0, transform: 'translateY(30px)' },
    to:   { opacity: 1, transform: 'translateY(0)' },
  },
  animation: `fadeInUp 0.55s cubic-bezier(.22,.68,0,1.2) ${delay}s forwards`,
  opacity: 0,
});

const ProductsPage = () => {
  const { showSnackbar } = useSnackbar();
  const { profile } = useAuth();
  const { user } = useAuth();
  const isAdmin = !!profile?.branchName; // all branch users can manage their branch
  const theme = useTheme();
  useMediaQuery(theme.breakpoints.down('sm'));

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [categories, setCategories] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [errors, setErrors] = useState({});
  const [restockTarget, setRestockTarget] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockNotes, setRestockNotes] = useState('');
  const [restocking, setRestocking] = useState(false);
  const [restockError, setRestockError] = useState('');
  const [restockBranchId, setRestockBranchId] = useState('');
  const [branchQtys, setBranchQtys] = useState([{ branchId: '', qty: '' }]);

  // ── Secret purchase-price state ──────────────────────────
  const [secretViewTarget, setSecretViewTarget] = useState(null);
  const [secretViewCode, setSecretViewCode] = useState('');
  const [secretViewError, setSecretViewError] = useState('');
  const [secretViewRevealed, setSecretViewRevealed] = useState(false);
  const [ppUnlocked, setPpUnlocked] = useState(false);
  const [ppSecretDialogOpen, setPpSecretDialogOpen] = useState(false);
  const [ppSecretCode, setPpSecretCode] = useState('');
  const [ppSecretError, setPpSecretError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [
      { data: products },
      { data: cats },
      { data: dls },
      { data: brs },
    ] = await Promise.all([
      supabase.from('products').select('*, categories(name), dealers(name), branches(name)').order('created_at', { ascending: false }),
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('dealers').select('id, name').order('name'),
      supabase.from('branches').select('id, name').order('name'),
    ]);
    setRows(products ?? []);
    setCategories(cats ?? []);
    setDealers(dls ?? []);
    setBranches(brs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openAdd = () => {
    setEditRow(null);
    setForm({ ...EMPTY_FORM, barcode: generateBarcode(rows.length + 1) });
    const userBranch = profile?.branchName
      ? branches.find((b) => b.name.toLowerCase() === profile.branchName.toLowerCase())
      : null;
    setBranchQtys([{ branchId: userBranch ? userBranch.id.toString() : '', qty: '' }]);
    setPpUnlocked(false);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditRow(row);
    setForm({
      name: row.name ?? '',
      category_id: row.category_id ?? '',
      barcode: row.barcode ?? '',
      item_code: row.item_code ?? '',
      hsn: row.hsn ?? '',
      mrp: row.mrp?.toString() ?? '',
      purchase_price: row.purchase_price?.toString() ?? '',
      sales_price: row.sales_price?.toString() ?? '',
      final_price: row.final_price?.toString() ?? '',
      gst_enabled: row.gst_enabled ?? false,
      sgst_percent: row.sgst_percent?.toString() ?? '',
      cgst_percent: row.cgst_percent?.toString() ?? '',
      cess_percent: row.cess_percent?.toString() ?? '',
      opening_quantity: row.opening_quantity?.toString() ?? '0',
      current_quantity: row.current_quantity?.toString() ?? '0',
      dealer_id: row.dealer_id ?? '',
      branch_id: row.branch_id ?? '',
    });
    setErrors({});
    // Load branch_quantities from product row – restrict to user's branch if not admin
    const bq = row.branch_quantities ?? {};
    let existingRows = Object.entries(bq).map(([branchId, qty]) => ({
      branchId: branchId.toString(),
      qty: qty.toString(),
    }));
    if (profile?.branchName) {
      const userBranch = branches.find((b) => b.name.toLowerCase() === profile.branchName.toLowerCase());
      if (userBranch) {
        existingRows = [{
          branchId: userBranch.id.toString(),
          qty: (bq[userBranch.id.toString()] ?? 0).toString(),
        }];
      }
    }
    setBranchQtys(existingRows.length > 0 ? existingRows : [{ branchId: '', qty: '' }]);
    setPpUnlocked(false);
    setDialogOpen(true);
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Product name is required';
    if (!form.mrp || isNaN(form.mrp) || Number(form.mrp) < 0) errs.mrp = 'Valid MRP required';
    if (!form.sales_price || isNaN(form.sales_price)) errs.sales_price = 'Valid sales price required';
    if (form.barcode.trim()) {
      const duplicate = rows.find(
        (r) => r.barcode === form.barcode.trim() && r.id !== editRow?.id
      );
      if (duplicate) errs.barcode = 'Barcode already exists on another product';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    // Build branch_quantities JSONB and total
    // For branch-restricted users editing, merge their branch qty into existing quantities
    const baseBranchQtys = (editRow && profile?.branchName)
      ? { ...(editRow.branch_quantities ?? {}) }
      : {};
    const branchQuantitiesObj = { ...baseBranchQtys };
    branchQtys.filter((r) => r.branchId !== '' && r.qty !== '').forEach((r) => {
      branchQuantitiesObj[r.branchId] = parseInt(r.qty) || 0;
    });
    const totalBranchQty = Object.values(branchQuantitiesObj).reduce((s, v) => s + v, 0);
    const payload = {
      name: form.name.trim(),
      category_id: form.category_id || null,
      barcode: form.barcode.trim() || null,
      item_code: form.item_code.trim() || null,
      hsn: form.hsn.trim() || null,
      mrp: parseFloat(form.mrp),
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
      sales_price: parseFloat(form.sales_price),
      final_price: form.final_price ? parseFloat(form.final_price) : null,
      gst_enabled: form.gst_enabled,
      sgst_percent: form.gst_enabled && form.sgst_percent ? parseFloat(form.sgst_percent) : null,
      cgst_percent: form.gst_enabled && form.cgst_percent ? parseFloat(form.cgst_percent) : null,
      cess_percent: form.gst_enabled && form.cess_percent ? parseFloat(form.cess_percent) : null,
      opening_quantity: editRow ? undefined : totalBranchQty,
      current_quantity: totalBranchQty,
      branch_quantities: branchQuantitiesObj,
      dealer_id: form.dealer_id || null,
      branch_id: form.branch_id || null,
      ...(!editRow && { created_by: user?.id ?? null, created_by_email: profile?.email ?? null }),
    };
    if (editRow) delete payload.opening_quantity;

    if (editRow) {
      const { error } = await supabase.from('products').update(payload).eq('id', editRow.id);
      if (error) { showSnackbar(error.message, 'error'); }
      else { showSnackbar('Product updated'); fetchAll(); setDialogOpen(false); }
    } else {
      const { error } = await supabase.from('products').insert(payload);
      if (error) { showSnackbar(error.message, 'error'); }
      else { showSnackbar('Product added'); fetchAll(); setDialogOpen(false); }
    }
    setSaving(false);
  };

  const handleRestock = async () => {
    const qty = parseInt(restockQty);
    if (!qty || qty < 1) { setRestockError('Enter a valid quantity (min 1)'); return; }
    if (!restockBranchId) { setRestockError('Select a branch'); return; }
    setRestocking(true);
    const product = restockTarget;
    const branchIdInt = parseInt(restockBranchId);
    const branchKey = restockBranchId.toString();
    const currentBranchQtys = product.branch_quantities ?? {};
    const qtyBefore = currentBranchQtys[branchKey] ?? 0;
    const qtyAfter = qtyBefore + qty;
    const updatedBranchQtys = { ...currentBranchQtys, [branchKey]: qtyAfter };
    const newTotal = Object.values(updatedBranchQtys).reduce((s, v) => s + (v ?? 0), 0);

    const { error: updateErr } = await supabase
      .from('products')
      .update({ branch_quantities: updatedBranchQtys, current_quantity: newTotal })
      .eq('id', product.id);

    if (updateErr) {
      showSnackbar(updateErr.message, 'error');
    } else {
      await supabase.from('restock_logs').insert({
        product_id: product.id,
        branch_id: branchIdInt,
        qty_added: qty,
        qty_before: qtyBefore,
        qty_after: qtyAfter,
        notes: restockNotes.trim() || null,
      });
      showSnackbar(`Restocked ${qty} units for "${product.name}"`);
      setRestockTarget(null);
      setRestockQty('');
      setRestockNotes('');
      setRestockError('');
      setRestockBranchId('');
      fetchAll();
    }
    setRestocking(false);
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('products').delete().eq('id', deleteTarget.id);
    if (error) showSnackbar(error.message, 'error');
    else { showSnackbar('Product deleted'); fetchAll(); }
    setDeleteTarget(null);
  };

  const filtered = rows.filter((r) => {
    const q = searchText.toLowerCase();
    return r.name?.toLowerCase().includes(q)
      || r.item_code?.toLowerCase().includes(q)
      || r.barcode?.toLowerCase().includes(q);
  });

  /* shared text-field pink-focus style */
  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      '&.Mui-focused fieldset': { bordercolor: 'primary.main' },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' },
  };

  const columns = [
    {
      field: 'name', headerName: 'Product Name', flex: 0.8, minWidth: 200,
      renderCell: (p) => (
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700 }} noWrap>{p.value}</Typography>
      ),
    },
    {
      field: 'item_code', headerName: 'Item Code', flex: 0.8, minWidth: 100, headerAlign: 'center', align: 'center',
      renderCell: (p) => (
        <Typography sx={{ fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 700, color: 'secondary.dark' }}>{p.value || '—'}</Typography>
      ),
    },
    {
      field: 'barcode', headerName: 'Barcode', flex: 0.6, minWidth: 120, headerAlign: 'center', align: 'center',
      renderCell: (p) => (
        <Typography sx={{ fontSize: '0.76rem', fontFamily: 'monospace', color: 'text.secondary' }}>{p.value || '—'}</Typography>
      ),
    },
    {
      field: 'mrp', headerName: 'MRP', flex: 0.6, minWidth: 80, headerAlign: 'center', align: 'center',
      renderCell: (p) => (
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1A1A2E' }}>₹{Number(p.value).toFixed(2)}</Typography>
      ),
    },
    {
      field: 'sales_price', headerName: 'Sales Price', flex: 0.6, minWidth: 100, headerAlign: 'center', align: 'center',
      renderCell: (p) => (
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#22C55E' }}>₹{Number(p.value).toFixed(2)}</Typography>
      ),
    },
    {
      field: 'final_price', headerName: 'Final Price', flex: 0.6, minWidth: 100, headerAlign: 'center', align: 'center',
      renderCell: (p) => p.value != null
        ? <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'primary.main' }}>₹{Number(p.value).toFixed(2)}</Typography>
        : <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled' }}>—</Typography>,
    },

    ...branches.map((branch) => ({
      field: `branch_${branch.id}`,
      headerName: `${branch.name}`,
      flex: 0.6, minWidth: 100 , headerAlign: 'center', align: 'center',
      renderCell: (p) => {
        const qty = (p.row.branch_quantities ?? {})[branch.id.toString()] ?? 0;
        return (
          <Chip
            label={qty}
            size="small"
            sx={{
              fontWeight: 700, fontSize: '0.78rem',
              bgcolor: qty <= 5 ? alpha('#EF4444', 0.12) : alpha('#22C55E', 0.12),
              color: qty <= 5 ? '#EF4444' : '#16A34A',
            }}
          />
        );
      },
    })),
    {
      field: 'created_by_email', headerName: 'Created By', flex: 0.5, minWidth: 120, headerAlign: 'center', align: 'center',
      renderCell: (p) => {
        const name = p.value ? p.value.split('@')[0] : null;
        const display = name ? name.charAt(0).toUpperCase() + name.slice(1) : '—';
        return <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{display}</Typography>;
      },
    },
    {
      field: 'created_at', headerName: 'Created On', flex: 0.8, minWidth: 170, headerAlign: 'center', align: 'center',
      renderCell: (p) => p.value ? (
        <Chip
          label={dayjs(p.value).format('DD MMM YY hh:mm A')}
          size="small"
          sx={{ fontSize: '0.7rem', fontWeight: 600, bgcolor: alpha(theme.palette.secondary.main, 0.08), color: 'secondary.dark' }}
        />
      ) : <Typography variant="caption" color="text.disabled">—</Typography>,
    },
    {
      field: 'actions', headerName: 'Actions', flex: 0.9, minWidth: 140, sortable: false, align: 'center', headerAlign: 'center',
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="View Purchase Price" arrow>
            <IconButton
              size="small"
              onClick={() => { setSecretViewTarget(p.row); setSecretViewCode(''); setSecretViewError(''); setSecretViewRevealed(false); }}
              sx={{
                bgcolor: alpha('#F59E0B', 0.08), color: '#F59E0B',
                '&:hover': { bgcolor: alpha('#F59E0B', 0.18), transform: 'scale(1.12)' },
                transition: 'all 0.2s ease',
              }}
            >
              <LockRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Product" arrow>
            <IconButton
              size="small"
              onClick={() => openEdit(p.row)}
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main',
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.18), transform: 'scale(1.12)' },
                transition: 'all 0.2s ease',
              }}
            >
              <EditRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Restock" arrow>
            <IconButton
              size="small"
              onClick={() => { setRestockTarget(p.row); setRestockQty(''); setRestockNotes(''); setRestockError(''); setRestockBranchId(branches.find((b) => b.name.toLowerCase() === profile?.branchName?.toLowerCase())?.id?.toString() ?? ''); }}
              sx={{
                bgcolor: alpha(theme.palette.secondary.main, 0.08), color: 'secondary.main',
                '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.18), transform: 'scale(1.12)' },
                transition: 'all 0.2s ease',
              }}
            >
              <SystemUpdateAltRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          {isAdmin && (
            <Tooltip title="Delete Product" arrow>
              <IconButton
                size="small"
                onClick={() => setDeleteTarget(p.row)}
                sx={{
                  bgcolor: alpha('#EF4444', 0.08), color: '#EF4444',
                  '&:hover': { bgcolor: alpha('#EF4444', 0.18), transform: 'scale(1.12)' },
                  transition: 'all 0.2s ease',
                }}
              >
                <DeleteRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      ),
    },
  ];

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
            <Inventory2RoundedIcon sx={{ color: '#fff', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.2 }}>
              Products
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.72rem' }}>
              {rows.length} product{rows.length !== 1 ? 's' : ''} in inventory
            </Typography>
          </Box>
        </Box>
        <Chip
          label={`${rows.length} Total`}
          size="small"
          sx={{
            bgcolor: 'rgba(255,255,255,0.2)', color: '#fff',
            fontWeight: 700, fontSize: '0.78rem',
            border: '1px solid rgba(255,255,255,0.3)',
          }}
        />
      </Box>

      {/* ── Toolbar ─────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          ...fadeInUp(0.1),
          mb: 2.5,
          p: { xs: 1.5, sm: 2 },
          borderRadius: '8px',
          border: '1.5px solid',
          borderColor: 'rgba(var(--color-primary-rgb),0.13)',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1.5, sm: 2 },
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <TextField
          size="small"
          placeholder="Search by name, item code or barcode…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon sx={{ color: 'primary.main', fontSize: 18 }} />
              </InputAdornment>
            ),
            sx: {
              borderRadius: '10px',
              bgcolor: alpha(theme.palette.primary.main, 0.04),
              '& input': { fontSize: '0.8rem' },
              '& input::placeholder': { fontSize: '0.77rem', opacity: 0.7 },
              '&.Mui-focused': { bgcolor: '#fff', boxShadow: '0 0 0 3px rgba(var(--color-primary-rgb),0.12)' },
            },
          }}
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: 'rgba(var(--color-primary-rgb),0.22)' },
              '&:hover fieldset': { borderColor: 'rgba(var(--color-primary-rgb),0.45)' },
              '&.Mui-focused fieldset': { bordercolor: 'primary.main' },
            },
          }}
        />
        {searchText && (
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'block' } }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </Typography>
        )}
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={openAdd}
          sx={{
            whiteSpace: 'nowrap',
            px: { xs: 2, sm: 2.5 }, py: 1,
            fontSize: '0.85rem',
            borderRadius: 2.5,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            boxShadow: '0 4px 15px rgba(var(--color-primary-rgb),0.4)',
            '&:hover': {
              background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
              boxShadow: '0 6px 22px rgba(var(--color-primary-rgb),0.5)',
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.25s ease',
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          Add Product
        </Button>
      </Paper>

      {/* ── Data Grid ───────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          ...fadeInUp(0.2),
          borderRadius: '8px',
          border: '1.5px solid',
          borderColor: 'rgba(var(--color-primary-rgb),0.1)',
          overflow: 'auto',
        }}
      >
        <DataGrid
          rows={filtered} columns={columns} loading={loading}
          disableRowSelectionOnClick pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          sx={{
            border: 'none',
            minWidth: 700,
            fontFamily: '"Poppins", sans-serif',
            '& .MuiDataGrid-columnHeaders': {
              background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb),0.09) 0%, rgba(var(--color-secondary-rgb),0.09) 100%)',
              borderBottom: '2px solid rgba(var(--color-primary-rgb),0.15)',
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: 700, fontSize: '0.78rem',
                color: 'primary.dark', letterSpacing: '0.05em', textTransform: 'uppercase',
              },
            },
            '& .MuiDataGrid-row': {
              transition: 'background 0.2s ease',
              '&:hover': {
                background: 'linear-gradient(90deg, rgba(var(--color-primary-rgb),0.04) 0%, rgba(var(--color-secondary-rgb),0.04) 100%)',
              },
            },
            '& .MuiDataGrid-cell': {
              borderColor: 'rgba(0,0,0,0.04)',
              '&:focus, &:focus-within': { outline: 'none' },
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid rgba(var(--color-primary-rgb),0.12)',
              bgcolor: 'rgba(var(--color-primary-rgb),0.02)',
            },
            '& .MuiTablePagination-root': { fontSize: '0.8rem' },
          }}
        />
      </Paper>

      {/* ── Add / Edit Dialog ───────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        scroll="paper"
        TransitionProps={{ timeout: 350 }}
        PaperProps={{
          sx: {
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(var(--color-primary-rgb),0.28)',
          },
        }}
      >
        {/* Dialog Header */}
        <Box sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          px: { xs: 2, sm: 3 }, py: 2.5,
          display: 'flex', alignItems: 'center', gap: 2,
          position: 'relative', overflow: 'hidden',
        }}>
          <Box sx={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
          <Avatar sx={{
            bgcolor: 'rgba(255,255,255,0.2)', width: 46, height: 46,
            border: '1.5px solid rgba(255,255,255,0.3)',
          }}>
            <Inventory2RoundedIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Avatar>
          <Box sx={{ flex: 1, zIndex: 1 }}>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.08rem', lineHeight: 1.2 }}>
              {editRow ? 'Edit Product' : 'Add New Product'}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.74rem', mt: 0.2 }}>
              {editRow ? 'Update product details below' : 'Fill in the details to add to inventory'}
            </Typography>
          </Box>
          <IconButton
            onClick={() => setDialogOpen(false)}
            sx={{
              color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', zIndex: 1,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.28)', transform: 'rotate(90deg)' },
              transition: 'all 0.3s ease',
            }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 0, bgcolor: '#FAFBFF' }}>
          <Box sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

            {/* Section: Basic Info */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'rgba(59,130,246,0.18)' }}>
              <Box sx={{
                px: 2.5, py: 1.4, bgcolor: '#F0F7FF',
                display: 'flex', alignItems: 'center', gap: 1,
                borderBottom: '1px solid rgba(59,130,246,0.15)',
                borderRadius: '12px 12px 0 0',
              }}>
                <ReceiptLongRoundedIcon sx={{ color: '#3B82F6', fontSize: 18 }} />
                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#3B82F6' }}>Basic Information</Typography>
              </Box>
              <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="Product Name *" fullWidth value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    error={!!errors.name} helperText={errors.name}
                    placeholder="e.g. Remote Control Car"
                    sx={fieldSx}
                  />
                  <TextField select label="Category" fullWidth value={form.category_id}
                    onChange={(e) => setField('category_id', e.target.value)} sx={fieldSx}>
                    <MenuItem value=""><em>None</em></MenuItem>
                    {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                  </TextField>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                  <TextField label="Item Code" fullWidth value={form.item_code}
                    onChange={(e) => setField('item_code', e.target.value)}
                    placeholder="e.g. TOY-001" sx={fieldSx} />
                  <TextField label="Barcode" fullWidth value={form.barcode}
                    onChange={(e) => setField('barcode', e.target.value)}
                    placeholder="Scan or type barcode"
                    error={!!errors.barcode}
                    helperText={errors.barcode}
                    sx={fieldSx}
                    InputProps={{
                      endAdornment: !editRow && (
                        <InputAdornment position="end">
                          <Tooltip title="Generate new barcode">
                            <IconButton size="small" onClick={() => setField('barcode', generateBarcode(rows.length + 1))}>
                              <RefreshRoundedIcon fontSize="small" sx={{ color: 'primary.main' }} />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField label="HSN (Optional)" fullWidth value={form.hsn}
                    onChange={(e) => setField('hsn', e.target.value)}
                    placeholder="e.g. 9503" sx={fieldSx} />
                </Box>
                {/* Branch-wise Quantity – dynamic rows */}
                <Box>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'secondary.main' }}>
                      {editRow ? 'Branch-wise Stock Quantity' : 'Opening Qty per Branch'}
                    </Typography>
                    <Chip
                      label={`Total: ${branchQtys.reduce((s, r) => s + (parseInt(r.qty) || 0), 0)} units`}
                      size="small"
                      sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: alpha(theme.palette.secondary.main, 0.1), color: 'secondary.dark' }}
                    />
                  </Stack>
                  <Stack spacing={1.2}>
                    {branchQtys.map((row, idx) => {
                      const usedBranchIds = branchQtys.map((r, i) => i !== idx ? r.branchId : null).filter(Boolean);
                      const allowedBranches = profile?.branchName
                        ? branches.filter((b) => b.name.toLowerCase() === profile.branchName.toLowerCase())
                        : branches;
                      const isBranchLocked = !!profile?.branchName;
                      return (
                        <Stack key={idx} direction="row" spacing={1} alignItems="flex-start">
                          <TextField
                            select
                            label="Branch"
                            size="small"
                            value={row.branchId}
                            onChange={(e) => setBranchQtys((prev) => prev.map((r, i) => i === idx ? { ...r, branchId: e.target.value } : r))}
                            sx={{ ...fieldSx, flex: 1 }}
                            disabled={isBranchLocked}
                          >
                            <MenuItem value=""><em>Select branch</em></MenuItem>
                            {allowedBranches.filter((b) => b.id.toString() === row.branchId || !usedBranchIds.includes(b.id.toString())).map((b) => (
                              <MenuItem key={b.id} value={b.id.toString()}>{b.name}</MenuItem>
                            ))}
                          </TextField>
                          <TextField
                            label="Qty"
                            type="number"
                            size="small"
                            value={row.qty}
                            onChange={(e) => setBranchQtys((prev) => prev.map((r, i) => i === idx ? { ...r, qty: e.target.value } : r))}
                            inputProps={{ min: 0 }}
                            sx={{ ...fieldSx, width: 110 }}
                            helperText={editRow && row.branchId
                              ? `Was: ${(editRow?.branch_quantities ?? {})[row.branchId] ?? 0}`
                              : undefined}
                          />
                          <IconButton
                            size="small"
                            onClick={() => setBranchQtys((prev) => prev.filter((_, i) => i !== idx))}
                            disabled={branchQtys.length === 1}
                            sx={{ mt: 0.5, color: '#EF4444', '&:hover': { bgcolor: alpha('#EF4444', 0.08) } }}
                          >
                            <CloseRoundedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Stack>
                      );
                    })}
                  </Stack>
                  {!profile?.branchName && branchQtys.length < branches.length && (
                    <Button
                      size="small"
                      startIcon={<AddRoundedIcon />}
                      onClick={() => setBranchQtys((prev) => [...prev, { branchId: '', qty: '' }])}
                      sx={{ mt: 1.2, color: 'secondary.main', fontWeight: 700, fontSize: '0.78rem', textTransform: 'none', px: 1 }}
                    >
                      Add another branch
                    </Button>
                  )}
                </Box>
              </Box>
            </Paper>

            {/* Section: Pricing */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'rgba(245,158,11,0.2)' }}>
              <Box sx={{
                px: 2.5, py: 1.4, bgcolor: '#FFF7ED',
                display: 'flex', alignItems: 'center', gap: 1,
                borderBottom: '1px solid rgba(245,158,11,0.15)',
                borderRadius: '12px 12px 0 0',
              }}>
                <LocalOfferRoundedIcon sx={{ color: '#F59E0B', fontSize: 18 }} />
                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#F59E0B' }}>Pricing</Typography>
              </Box>
              <Box sx={{ p: 2.5, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                <TextField label="MRP *" type="number" fullWidth value={form.mrp}
                  onChange={(e) => setField('mrp', e.target.value)}
                  error={!!errors.mrp} helperText={errors.mrp}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  inputProps={{ min: 0, step: '0.01' }} sx={fieldSx} />
                {editRow && !ppUnlocked ? (
                  /* Locked state – show masked placeholder with unlock button */
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, border: '1px solid rgba(245,158,11,0.45)', borderRadius: '10px', px: 1.5, py: '10px', bgcolor: alpha('#F59E0B', 0.04), flex: 1 }}>
                    <Typography sx={{ flex: 1, fontSize: '0.85rem', color: 'text.disabled', letterSpacing: '0.2em' }}>••••••</Typography>
                    <Tooltip title="Enter secret code to view & edit purchase price">
                      <IconButton size="small" onClick={() => { setPpSecretDialogOpen(true); setPpSecretCode(''); setPpSecretError(''); }}>
                        <LockRoundedIcon sx={{ fontSize: 16, color: '#F59E0B' }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ) : (
                  <TextField
                    label="Purchase Price"
                    type="number" fullWidth
                    value={form.purchase_price}
                    onChange={(e) => setField('purchase_price', e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      endAdornment: editRow && ppUnlocked ? (
                        <InputAdornment position="end">
                          <LockOpenRoundedIcon sx={{ fontSize: 16, color: '#22C55E' }} />
                        </InputAdornment>
                      ) : null,
                    }}
                    inputProps={{ min: 0, step: '0.01' }} sx={fieldSx} />
                )}
                <TextField label="Sales Price *" type="number" fullWidth value={form.sales_price}
                  onChange={(e) => setField('sales_price', e.target.value)}
                  error={!!errors.sales_price} helperText={errors.sales_price}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  inputProps={{ min: 0, step: '0.01' }} sx={fieldSx} />
                <TextField label="Final Price" type="number" fullWidth value={form.final_price}
                  onChange={(e) => setField('final_price', e.target.value)}
                  placeholder="e.g. after discount/offer"
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  inputProps={{ min: 0, step: '0.01' }} sx={fieldSx} />
              </Box>
            </Paper>

            {/* Section: GST */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'rgba(34,197,94,0.2)' }}>
              <Box sx={{
                px: 2.5, py: 1.4, bgcolor: '#F0FDF4',
                display: 'flex', alignItems: 'center', gap: 1,
                borderBottom: '1px solid rgba(34,197,94,0.15)',
                borderRadius: '12px 12px 0 0',
              }}>
                <PercentRoundedIcon sx={{ color: '#22C55E', fontSize: 18 }} />
                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#22C55E' }}>GST</Typography>
              </Box>
              <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                  control={<Switch checked={form.gst_enabled} onChange={(e) => setField('gst_enabled', e.target.checked)} color="success" />}
                  label={<Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{form.gst_enabled ? 'GST Enabled' : 'Enable GST'}</Typography>}
                />
                {form.gst_enabled && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                    <TextField label="SGST %" type="number" fullWidth value={form.sgst_percent}
                      onChange={(e) => setField('sgst_percent', e.target.value)}
                      InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                      inputProps={{ min: 0, max: 50, step: '0.01' }} sx={fieldSx} />
                    <TextField label="CGST %" type="number" fullWidth value={form.cgst_percent}
                      onChange={(e) => setField('cgst_percent', e.target.value)}
                      InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                      inputProps={{ min: 0, max: 50, step: '0.01' }} sx={fieldSx} />
                    <TextField label="Cess % (Optional)" type="number" fullWidth value={form.cess_percent}
                      onChange={(e) => setField('cess_percent', e.target.value)}
                      InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                      inputProps={{ min: 0, max: 20, step: '0.01' }} sx={fieldSx} />
                  </Box>
                )}
              </Box>
            </Paper>

            {/* Section: Assignment */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'rgba(var(--color-secondary-rgb),0.18)' }}>
              <Box sx={{
                px: 2.5, py: 1.4, bgcolor: '#FAF5FF',
                display: 'flex', alignItems: 'center', gap: 1,
                borderBottom: '1px solid rgba(var(--color-secondary-rgb),0.15)',
                borderRadius: '12px 12px 0 0',
              }}>
                <GroupWorkRoundedIcon sx={{ color: 'secondary.main', fontSize: 18 }} />
                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'secondary.main' }}>Assignment</Typography>
              </Box>
              <Box sx={{ p: 2.5 }}>
                <TextField select label="Dealer" fullWidth value={form.dealer_id}
                  onChange={(e) => setField('dealer_id', e.target.value)} sx={fieldSx}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {dealers.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                </TextField>
              </Box>
            </Paper>

          </Box>
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2.5, gap: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: '#fff' }}>
          <Button
            variant="outlined"
            onClick={() => setDialogOpen(false)}
            sx={{
              flex: 1, py: 1.2, borderRadius: 2.5,
              borderColor: 'rgba(var(--color-primary-rgb),0.35)', color: 'primary.main',
              '&:hover': { bordercolor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.04) },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained" onClick={handleSave} disabled={saving}
            sx={{
              flex: 1, py: 1.2, borderRadius: 2.5,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              boxShadow: '0 4px 15px rgba(var(--color-primary-rgb),0.35)',
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
                boxShadow: '0 6px 22px rgba(var(--color-primary-rgb),0.45)',
                transform: 'translateY(-1px)',
              },
              '&.Mui-disabled': { opacity: 0.65, background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`},
              transition: 'all 0.25s ease',
            }}
          >
            {saving ? 'Saving…' : editRow ? 'Update Product' : 'Add Product'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Product"
        message={`Delete "${deleteTarget?.name}"? Associated sales data will be preserved.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Restock Dialog ──────────────────────────────── */}
      <Dialog
        open={!!restockTarget}
        onClose={() => { setRestockTarget(null); setRestockBranchId(''); }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '10px', overflow: 'hidden' } }}
      >
        <Box sx={{
          background: 'linear-gradient(135deg,#9C27B0 0%,#6A1B9A 100%)',
          px: 2.5, py: 1.8,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SystemUpdateAltRoundedIcon sx={{ color: '#fff', fontSize: 20 }} />
            <Typography fontWeight={700} fontSize="1rem" color="#fff">Restock Product</Typography>
          </Box>
          <IconButton
            onClick={() => { setRestockTarget(null); setRestockBranchId(''); }}
            size="small"
            sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', transition: 'transform 0.3s', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)', transform: 'rotate(90deg)' } }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 2.5, bgcolor: '#FAFBFF' }}>
          <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5, color: 'secondary.dark' }}>
            {restockTarget?.name}
          </Typography>
          {restockBranchId && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Current stock ({branches.find((b) => b.id === parseInt(restockBranchId))?.name ?? '—'}):&nbsp;
              <strong>{(restockTarget?.branch_quantities ?? {})[restockBranchId.toString()] ?? 0}</strong>
            </Typography>
          )}
          <Stack spacing={2}>
            <TextField
              select
              label="Branch *"
              fullWidth
              size="small"
              value={restockBranchId}
              onChange={(e) => { setRestockBranchId(e.target.value); setRestockError(''); }}
              disabled={!!profile?.branchName}
              sx={fieldSx}
            >
              {(profile?.branchName
                ? branches.filter((b) => b.name.toLowerCase() === profile.branchName.toLowerCase())
                : branches
              ).map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Quantity to Add *"
              type="number"
              fullWidth
              size="small"
              value={restockQty}
              onChange={(e) => { setRestockQty(e.target.value); setRestockError(''); }}
              error={!!restockError}
              helperText={restockError}
              inputProps={{ min: 1 }}
              sx={fieldSx}
            />
            <TextField
              label="Notes (Optional)"
              fullWidth
              size="small"
              multiline
              minRows={2}
              value={restockNotes}
              onChange={(e) => setRestockNotes(e.target.value)}
              placeholder="e.g. Restocked from dealer, batch number…"
              sx={{ ...fieldSx, '& .MuiInputBase-input::placeholder': { fontSize: '0.77rem' } }}
            />
            {restockBranchId && restockQty && parseInt(restockQty) > 0 && (
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.secondary.main, 0.06), border: '1px solid', borderColor: alpha(theme.palette.secondary.main, 0.18) }}>
                <Typography variant="caption" color="text.secondary">After restock ({branches.find((b) => b.id === parseInt(restockBranchId))?.name ?? ''}):</Typography>
                <Typography variant="body2" fontWeight={800} sx={{ color: 'secondary.dark' }}>
                  {((restockTarget?.branch_quantities ?? {})[restockBranchId.toString()] ?? 0) + (parseInt(restockQty) || 0)} units
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1.5, bgcolor: '#FAFBFF' }}>
          <Button
            variant="outlined"
            onClick={() => { setRestockTarget(null); setRestockBranchId(''); }}
            sx={{ flex: 1, borderRadius: 2.5, borderColor: alpha(theme.palette.secondary.main, 0.5), color: 'secondary.main', '&:hover': { bordercolor: 'secondary.main', bgcolor: alpha(theme.palette.secondary.main, 0.05) } }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleRestock}
            disabled={restocking}
            startIcon={<SystemUpdateAltRoundedIcon />}
            sx={{ flex: 1, borderRadius: 2.5, background: 'linear-gradient(135deg,#9C27B0,#6A1B9A)', fontWeight: 700, '&:hover': { background: 'linear-gradient(135deg,#7B1FA2,#4A148C)' } }}
          >
            {restocking ? 'Saving…' : 'Confirm Restock'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Secret: View Purchase Price Dialog ──────────── */}
      <Dialog
        open={!!secretViewTarget}
        onClose={() => { setSecretViewTarget(null); setSecretViewRevealed(false); setSecretViewCode(''); setSecretViewError(''); }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '14px', overflow: 'hidden' } }}
      >
        <Box sx={{
          background: 'linear-gradient(135deg,#F59E0B 0%,#D97706 100%)',
          px: 2.5, py: 1.8,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockRoundedIcon sx={{ color: '#fff', fontSize: 20 }} />
            <Typography fontWeight={700} fontSize="1rem" color="#fff">Purchase Price</Typography>
          </Box>
          <IconButton
            onClick={() => { setSecretViewTarget(null); setSecretViewRevealed(false); setSecretViewCode(''); setSecretViewError(''); }}
            size="small"
            sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.18)', transition: 'transform 0.3s', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)', transform: 'rotate(90deg)' } }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 2.5, bgcolor: '#FAFBFF' }}>
          <Typography variant="body2" fontWeight={700} sx={{ mb: 2, color: '#92400E' }}>
            {secretViewTarget?.name}
          </Typography>
          {!secretViewRevealed ? (
            <Stack spacing={1.5}>
              <Typography variant="caption" color="text.secondary">
                Enter the secret code to reveal the purchase price.
              </Typography>
              <TextField
                label="Secret Code"
                type="password"
                fullWidth
                size="small"
                value={secretViewCode}
                onChange={(e) => { setSecretViewCode(e.target.value); setSecretViewError(''); }}
                error={!!secretViewError}
                helperText={secretViewError}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (secretViewCode === SECRET_CODE) { setSecretViewRevealed(true); }
                    else { setSecretViewError('Incorrect secret code'); }
                  }
                }}
                sx={fieldSx}
              />
            </Stack>
          ) : (
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha('#F59E0B', 0.1), border: '1.5px solid', borderColor: alpha('#F59E0B', 0.35), textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Purchase Price</Typography>
              <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: '#D97706' }}>
                {secretViewTarget?.purchase_price != null ? `₹${Number(secretViewTarget.purchase_price).toFixed(2)}` : '—'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1.5, bgcolor: '#FAFBFF' }}>
          <Button
            variant="outlined"
            onClick={() => { setSecretViewTarget(null); setSecretViewRevealed(false); setSecretViewCode(''); setSecretViewError(''); }}
            sx={{ flex: 1, borderRadius: 2.5, borderColor: alpha('#F59E0B', 0.5), color: '#D97706', '&:hover': { borderColor: '#F59E0B', bgcolor: alpha('#F59E0B', 0.05) } }}
          >
            Close
          </Button>
          {!secretViewRevealed && (
            <Button
              variant="contained"
              onClick={() => {
                if (secretViewCode === SECRET_CODE) { setSecretViewRevealed(true); }
                else { setSecretViewError('Incorrect secret code'); }
              }}
              startIcon={<LockOpenRoundedIcon />}
              sx={{ flex: 1, borderRadius: 2.5, background: 'linear-gradient(135deg,#F59E0B,#D97706)', fontWeight: 700, '&:hover': { background: 'linear-gradient(135deg,#D97706,#B45309)' } }}
            >
              Reveal
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ── Secret: Unlock Purchase Price Edit Dialog ────── */}
      <Dialog
        open={ppSecretDialogOpen}
        onClose={() => { setPpSecretDialogOpen(false); setPpSecretCode(''); setPpSecretError(''); }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '14px', overflow: 'hidden' } }}
      >
        <Box sx={{
          background: 'linear-gradient(135deg,#F59E0B 0%,#D97706 100%)',
          px: 2.5, py: 1.8,
          display: 'flex', alignItems: 'center', gap: 1,
        }}>
          <LockRoundedIcon sx={{ color: '#fff', fontSize: 20 }} />
          <Typography fontWeight={700} fontSize="1rem" color="#fff">Unlock Purchase Price</Typography>
        </Box>
        <DialogContent sx={{ p: 2.5, bgcolor: '#FAFBFF' }}>
          <Stack spacing={1.5}>
            <Typography variant="caption" color="text.secondary">
              Enter the secret code to unlock and edit the purchase price.
            </Typography>
            <TextField
              label="Secret Code"
              type="password"
              fullWidth
              size="small"
              value={ppSecretCode}
              onChange={(e) => { setPpSecretCode(e.target.value); setPpSecretError(''); }}
              error={!!ppSecretError}
              helperText={ppSecretError}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (ppSecretCode === SECRET_CODE) { setPpUnlocked(true); setPpSecretDialogOpen(false); }
                  else { setPpSecretError('Incorrect secret code'); }
                }
              }}
              sx={fieldSx}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1.5, bgcolor: '#FAFBFF' }}>
          <Button
            variant="outlined"
            onClick={() => { setPpSecretDialogOpen(false); setPpSecretCode(''); setPpSecretError(''); }}
            sx={{ flex: 1, borderRadius: 2.5, borderColor: alpha('#F59E0B', 0.5), color: '#D97706', '&:hover': { borderColor: '#F59E0B', bgcolor: alpha('#F59E0B', 0.05) } }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (ppSecretCode === SECRET_CODE) { setPpUnlocked(true); setPpSecretDialogOpen(false); }
              else { setPpSecretError('Incorrect secret code'); }
            }}
            startIcon={<LockOpenRoundedIcon />}
            sx={{ flex: 1, borderRadius: 2.5, background: 'linear-gradient(135deg,#F59E0B,#D97706)', fontWeight: 700, '&:hover': { background: 'linear-gradient(135deg,#D97706,#B45309)' } }}
          >
            Unlock
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default ProductsPage;

