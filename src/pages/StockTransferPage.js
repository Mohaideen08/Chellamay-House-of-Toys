import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Button, Typography, Paper, Stack, Chip,
  TextField, InputAdornment, MenuItem,
  IconButton, Tooltip, Autocomplete,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import MoveDownRoundedIcon from '@mui/icons-material/MoveDownRounded';
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from '../context/SnackbarContext';
import ConfirmDialog from '../components/ConfirmDialog';
import dayjs from 'dayjs';

/* ── animation helpers ──────────────────────────────────── */
const fadeInUp = (delay = 0) => ({
  '@keyframes fadeInUp': {
    '0%': { opacity: 0, transform: 'translateY(24px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' },
  },
  animation: `fadeInUp 0.5s ease ${delay}s both`,
});


const StockTransferPage = () => {
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  /* ── master data ── */
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);

  /* ── form ── */
  const [fromBranch, setFromBranch] = useState(null);
  const [toBranch, setToBranch] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  /* ── history / filter ── */
  const [rows, setRows] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  /* ── fetch branches & products on mount ── */
  const fetchMasterData = useCallback(async () => {
    const [{ data: brs }, { data: prods }] = await Promise.all([
      supabase.from('branches').select('id, name').order('name'),
      supabase.from('products').select('id, name, item_code, barcode, current_quantity, branch_id').order('name'),
    ]);
    setBranches(brs ?? []);

    // Pre-select the logged-in user's branch as FROM
    if (brs && profile?.branchName) {
      const userBr = brs.find((b) => b.name.toLowerCase() === profile.branchName.toLowerCase());
      if (userBr) setFromBranch(userBr);
    }

    setProducts(prods ?? []);
  }, [profile?.branchName]);

  useEffect(() => { fetchMasterData(); }, [fetchMasterData]);

  /* ── products filtered to selected FROM branch ── */
  const branchProducts = useMemo(() => {
    if (!fromBranch) return [];
    // include products assigned to this branch OR with no branch assigned (null)
    return products.filter((p) => p.branch_id === fromBranch.id || p.branch_id === null);
  }, [products, fromBranch]);

  /* ── fetch transfer history ── */
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    let query = supabase
      .from('stock_transfers')
      .select('*, products(id, name, item_code), from_branch:branches!stock_transfers_from_branch_id_fkey(name), to_branch:branches!stock_transfers_to_branch_id_fkey(name)')
      .order('transferred_at', { ascending: false });

    if (profile?.branchName) {
      const br = branches.find((b) => b.name.toLowerCase() === profile.branchName.toLowerCase());
      if (br) query = query.eq('from_branch_id', br.id);
    }

    const { data, error } = await query;
    if (error) showSnackbar(error.message, 'error');
    else setRows(data ?? []);
    setLoadingHistory(false);
  }, [profile?.branchName, branches, showSnackbar]);

  useEffect(() => {
    if (branches.length > 0) fetchHistory();
  }, [fetchHistory, branches]);

  /* ── filtered rows for search ── */
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.products?.name?.toLowerCase().includes(q) ||
      r.products?.item_code?.toLowerCase().includes(q) ||
      r.from_branch?.name?.toLowerCase().includes(q) ||
      r.to_branch?.name?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  /* ── form validation ── */
  const validate = () => {
    const errors = {};
    if (!fromBranch) errors.fromBranch = 'Select source branch';
    if (!toBranch) errors.toBranch = 'Select destination branch';
    if (fromBranch && toBranch && fromBranch.id === toBranch.id) errors.toBranch = 'Destination must differ from source';
    if (!selectedProduct) errors.product = 'Select a product';
    if (!qty || parseInt(qty) < 1) errors.qty = 'Enter valid quantity (min 1)';
    if (selectedProduct && qty && parseInt(qty) > selectedProduct.current_quantity)
      errors.qty = `Only ${selectedProduct.current_quantity} in stock`;
    return errors;
  };

  /* ── submit transfer ── */
  const handleSubmit = async () => {
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setFormErrors({});
    setSubmitting(true);

    const transferQty = parseInt(qty);
    const newQty = selectedProduct.current_quantity - transferQty;

    // 1. Insert transfer record
    const { error: insertError } = await supabase.from('stock_transfers').insert({
      product_id: selectedProduct.id,
      from_branch_id: fromBranch.id,
      to_branch_id: toBranch.id,
      qty_transferred: transferQty,
      qty_before: selectedProduct.current_quantity,
      qty_after: newQty,
      transferred_at: dayjs().toISOString(),
      notes: notes.trim() || null,
      created_by: profile?.email ?? null,
    });

    if (insertError) {
      showSnackbar(insertError.message, 'error');
      setSubmitting(false);
      return;
    }

    // 2. Decrease stock in source branch
    const { error: updateError } = await supabase
      .from('products')
      .update({ current_quantity: newQty })
      .eq('id', selectedProduct.id);

    if (updateError) {
      showSnackbar(updateError.message, 'error');
      setSubmitting(false);
      return;
    }

    showSnackbar(`Transferred ${transferQty} unit(s) from ${fromBranch.name} → ${toBranch.name}`, 'success');

    // Reset form
    setSelectedProduct(null);
    setQty('');
    setNotes('');
    if (isAdmin) setFromBranch(null);
    setToBranch(null);

    // Refresh products & history
    await fetchMasterData();
    fetchHistory();
    setSubmitting(false);
  };

  /* ── delete transfer record ── */
  const handleDelete = async () => {
    const { error } = await supabase.from('stock_transfers').delete().eq('id', deleteTarget.id);
    if (error) showSnackbar(error.message, 'error');
    else { showSnackbar('Transfer record deleted'); fetchHistory(); }
    setDeleteTarget(null);
  };

  /* ── DataGrid columns ── */
  const columns = [
    {
      field: 'transferred_at',
      headerName: 'Date',
      width: 160,
      renderCell: ({ value }) => (
        <Typography variant="caption" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>
          {value ? dayjs(value).format('DD MMM YYYY hh:mm A') : '—'}
        </Typography>
      ),
    },
    {
      field: 'product',
      headerName: 'Product',
      flex: 1,
      minWidth: 160,
      renderCell: ({ row }) => (
        <Box>
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.3 }}>
            {row.products?.name ?? '—'}
          </Typography>
          {row.products?.item_code && (
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontFamily: 'monospace' }}>
              {row.products.item_code}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'from_branch',
      headerName: 'From Branch',
      width: 130,
      renderCell: ({ row }) => (
        <Chip
          label={row.from_branch?.name ?? '—'}
          size="small"
          sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.dark', fontWeight: 700, fontSize: '0.7rem' }}
        />
      ),
    },
    {
      field: 'to_branch',
      headerName: 'To Branch',
      width: 130,
      renderCell: ({ row }) => (
        <Chip
          label={row.to_branch?.name ?? '—'}
          size="small"
          sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.dark', fontWeight: 700, fontSize: '0.7rem' }}
        />
      ),
    },
    {
      field: 'qty_transferred',
      headerName: 'Qty',
      width: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ value }) => (
        <Chip
          label={value}
          size="small"
          sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.dark', fontWeight: 800, fontSize: '0.78rem' }}
        />
      ),
    },
    {
      field: 'qty_before',
      headerName: 'Before',
      width: 75,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ value }) => (
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'text.secondary' }}>{value ?? '—'}</Typography>
      ),
    },
    {
      field: 'qty_after',
      headerName: 'After',
      width: 75,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ value }) => (
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: value === 0 ? 'error.main' : 'success.dark' }}>{value ?? '—'}</Typography>
      ),
    },
    {
      field: 'notes',
      headerName: 'Notes',
      flex: 1,
      minWidth: 120,
      renderCell: ({ value }) => (
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', fontStyle: value ? 'normal' : 'italic' }}>
          {value || '—'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 56,
      sortable: false,
      renderCell: ({ row }) => (
        isAdmin && (
          <Tooltip title="Delete record">
            <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
              <DeleteRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )
      ),
    },
  ];

  /* ── summary stats ── */
  const totalTransferred = rows.reduce((s, r) => s + (r.qty_transferred || 0), 0);

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      bgcolor: alpha(theme.palette.primary.main, 0.03),
      '& fieldset': { borderColor: 'rgba(var(--color-primary-rgb),0.22)' },
      '&:hover fieldset': { borderColor: 'rgba(var(--color-primary-rgb),0.45)' },
      '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
      '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}` },
    },
    '& .MuiInputLabel-root': { fontSize: '0.85rem' },
    '& input': { fontSize: '0.85rem' },
  };

  return (
      <Box sx={{ minHeight: '100vh' }}>

        {/* ── Header Bar ── */}
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
              <SwapHorizRoundedIcon sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.2 }}>
                Stock Transfer
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.72rem' }}>
                Shift products between branches
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              icon={<MoveDownRoundedIcon sx={{ fontSize: 15, color: 'rgba(255,255,255,0.8) !important' }} />}
              label={`${rows.length} transfer${rows.length !== 1 ? 's' : ''} · ${totalTransferred} units`}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 700, fontSize: '0.75rem', border: '1px solid rgba(255,255,255,0.28)' }}
            />
          </Stack>
        </Box>

        {/* ── Transfer Form ── */}
        <Paper
          elevation={0}
          sx={{
            ...fadeInUp(0.07),
            mb: 2.5,
            borderRadius: '8px',
            border: '1.5px solid',
            borderColor: 'rgba(var(--color-primary-rgb),0.13)',
            overflow: 'hidden',
          }}
        >
          {/* Form Header */}
          <Box sx={{
            px: { xs: 2, sm: 3 }, py: 1.8,
            borderBottom: '1.5px solid rgba(var(--color-primary-rgb),0.1)',
            display: 'flex', alignItems: 'center', gap: 1.2,
            background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb),0.05) 0%, rgba(var(--color-secondary-rgb),0.05) 100%)',
          }}>
            <WarehouseRoundedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#1A1A2E' }}>
              New Transfer
            </Typography>
          </Box>

          {/* Form Fields */}
          <Box sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap alignItems="flex-start">

              {/* FROM Branch */}
              <TextField
                select
                label="From Branch *"
                value={fromBranch?.id ?? ''}
                onChange={(e) => {
                  const br = branches.find((b) => b.id === e.target.value);
                  setFromBranch(br ?? null);
                  setSelectedProduct(null); // reset product when branch changes
                  setFormErrors((p) => ({ ...p, fromBranch: undefined }));
                }}
                disabled={!isAdmin && !!profile?.branchName}
                error={!!formErrors.fromBranch}
                helperText={formErrors.fromBranch}
                sx={{ ...inputSx, minWidth: 160, flex: 1 }}
              >
                {branches.map((b) => (
                  <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                ))}
              </TextField>

              {/* Product */}
              <Autocomplete
                sx={{ flex: 2, minWidth: 220 }}
                options={branchProducts}
                value={selectedProduct}
                onChange={(_, val) => {
                  setSelectedProduct(val);
                  setFormErrors((p) => ({ ...p, product: undefined }));
                }}
                getOptionLabel={(o) => `${o.name}${o.item_code ? ` · ${o.item_code}` : ''}`}
                noOptionsText={fromBranch ? 'No products in this branch' : 'Select a branch first'}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography sx={{ fontSize: '0.84rem', fontWeight: 700 }}>{option.name}</Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontFamily: 'monospace' }}>
                        {option.item_code} &nbsp;·&nbsp; Stock: {option.current_quantity}
                      </Typography>
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Product *"
                    error={!!formErrors.product}
                    // helperText={formErrors.product ?? (selectedProduct ? `Stock: ${selectedProduct.current_quantity}` : '')}
                    sx={inputSx}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <SearchRoundedIcon sx={{ fontSize: 17, color: 'primary.main' }} />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />

              {/* TO Branch */}
              <TextField
                select
                label="To Branch *"
                value={toBranch?.id ?? ''}
                onChange={(e) => {
                  const br = branches.find((b) => b.id === e.target.value);
                  setToBranch(br ?? null);
                  setFormErrors((p) => ({ ...p, toBranch: undefined }));
                }}
                error={!!formErrors.toBranch}
                helperText={formErrors.toBranch}
                sx={{ ...inputSx, minWidth: 160, flex: 1 }}
              >
                {branches
                  .filter((b) => b.id !== fromBranch?.id)
                  .map((b) => (
                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                  ))}
              </TextField>

              {/* Quantity */}
              <TextField
                label="Quantity *"
                type="number"
                value={qty}
                onChange={(e) => {
                  setQty(e.target.value);
                  setFormErrors((p) => ({ ...p, qty: undefined }));
                }}
                inputProps={{ min: 1 }}
                error={!!formErrors.qty}
                helperText={formErrors.qty}
                sx={{ ...inputSx, width: 120 }}
              />

              {/* Notes */}
              <TextField
                label="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                sx={{ ...inputSx, flex: 2, minWidth: 160 }}
              />

              {/* Submit */}
              <Button
                variant="contained"
                startIcon={<SwapHorizRoundedIcon />}
                onClick={handleSubmit}
                disabled={submitting}
                sx={{
                  alignSelf: 'center',
                  height: 35,
                  px: 3, borderRadius: '10px', fontWeight: 700,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  boxShadow: '0 4px 15px rgba(var(--color-primary-rgb),0.35)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 20px rgba(var(--color-primary-rgb),0.45)',
                  },
                  transition: 'all 0.22s ease',
                }}
              >
                {submitting ? 'Transferring…' : 'Transfer Stock'}
              </Button>
            </Stack>
          </Box>
        </Paper>

        {/* ── Transfer History ── */}
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
          {/* Toolbar */}
          <Box sx={{
            px: { xs: 1.5, sm: 2.5 }, py: 1.8,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 1.5,
            borderBottom: '1.5px solid rgba(var(--color-primary-rgb),0.1)',
            bgcolor: '#fff',
          }}>
            <Stack direction="row" alignItems="center" spacing={1.2}>
              <MoveDownRoundedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#1A1A2E' }}>Transfer History</Typography>
              <Chip
                label={`${filteredRows.length} record${filteredRows.length !== 1 ? 's' : ''}`}
                size="small"
                sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.dark', fontWeight: 700, fontSize: '0.7rem' }}
              />
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <TextField
                size="small"
                placeholder="Search product, branch…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{
                  width: { xs: '100%', sm: 220 },
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
                      <SearchRoundedIcon sx={{ fontSize: 17, color: 'primary.main' }} />
                    </InputAdornment>
                  ),
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearch('')}>
                        <CloseRoundedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
            </Stack>
          </Box>

          {/* DataGrid */}
          <DataGrid
            rows={filteredRows}
            columns={columns}
            loading={loadingHistory}
            autoHeight
            disableRowSelectionOnClick
            getRowHeight={() => 52}
            pageSizeOptions={[25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': {
                background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb),0.08) 0%, rgba(var(--color-secondary-rgb),0.08) 100%)',
                fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em',
                textTransform: 'uppercase', color: 'primary.dark',
              },
              '& .MuiDataGrid-row:hover': {
                background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${alpha(theme.palette.secondary.main, 0.04)} 100%)`,
              },
              '& .MuiDataGrid-cell': { alignItems: 'center', display: 'flex' },
              '& .MuiDataGrid-cell:focus': { outline: 'none' },
              '& .MuiDataGrid-columnHeader:focus': { outline: 'none' },
            }}
          />
        </Paper>

        {/* ── Delete Confirm ── */}
        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete Transfer Record"
          message={`Delete this transfer record? This does NOT restore stock automatically.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          confirmLabel="Delete"
          confirmColor="error"
        />

      </Box>
  );
};

export default StockTransferPage;