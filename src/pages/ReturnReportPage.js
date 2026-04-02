import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Stack, Paper, Chip, Grid, Card, CardContent,
  IconButton, Tooltip, Autocomplete, MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AssignmentReturnRoundedIcon from '@mui/icons-material/AssignmentReturnRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import { supabase } from '../services/supabase';
import { useSnackbar } from '../context/SnackbarContext';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import dayjs from 'dayjs';

const fadeInUp = (delay = 0) => ({
  '@keyframes fadeInUp': {
    '0%': { opacity: 0, transform: 'translateY(24px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' },
  },
  animation: `fadeInUp 0.5s ease ${delay}s both`,
});

const QUICK_RANGES = [
  { label: 'Today', getValue: () => [dayjs().startOf('day'), dayjs().endOf('day')] },
  { label: 'This Month', getValue: () => [dayjs().startOf('month'), dayjs().endOf('month')] },
  { label: 'Last Month', getValue: () => [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
];

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#E91E8C' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#E91E8C' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: '#E91E8C' },
  '& .MuiInputBase-input::placeholder': { fontSize: '0.77rem' },
};

const EMPTY_FORM = { product: null, quantity: 1, reason: '' };

const ReturnReportPage = () => {
  const { showSnackbar } = useSnackbar();
  const { user, profile } = useAuth();
  const isAdmin = !!profile?.branchName; // all branch users can delete their returns

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [dateFrom, setDateFrom] = useState(dayjs().startOf('month'));
  const [dateTo, setDateTo] = useState(dayjs().endOf('day'));
  const [activeRange, setActiveRange] = useState(1);
  const [errors, setErrors] = useState({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [branches, setBranches] = useState([]);
  const [repairRestockTarget, setRepairRestockTarget] = useState(null);
  const [repairBranchId, setRepairBranchId] = useState('');
  const [repairQty, setRepairQty] = useState('');
  const [repairSaving, setRepairSaving] = useState(false);
  const [repairError, setRepairError] = useState('');

  const applyRange = (idx) => {
    const [from, to] = QUICK_RANGES[idx].getValue();
    setDateFrom(from);
    setDateTo(to);
    setActiveRange(idx);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('returns')
      .select('*, products(id, name, item_code)')
      .gte('created_at', dateFrom.toISOString())
      .lte('created_at', dateTo.toISOString())
      .order('created_at', { ascending: false });
    if (profile?.branchName) {
      const { data: br } = await supabase.from('branches').select('id').eq('name', profile.branchName).single();
      if (br) query = query.or(`branch_id.eq.${br.id},branch_id.is.null`);
    }
    const { data, error } = await query;
    if (!error) setRows(data ?? []);
    setLoading(false);
  }, [dateFrom, dateTo, profile]);

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('id, name, item_code, current_quantity, branch_quantities').order('name');
    if (!data) { setProducts([]); return; }
    if (profile?.branchName) {
      const { data: br } = await supabase.from('branches').select('id').eq('name', profile.branchName).single();
      if (br) {
        const brKey = br.id.toString();
        setProducts(data.map((p) => ({
          ...p,
          branch_stock: (p.branch_quantities ?? {})[brKey] ?? 0,
        })));
        return;
      }
    }
    setProducts(data.map((p) => ({ ...p, branch_stock: p.current_quantity ?? 0 })));
  }, [profile]);

  const fetchBranches = useCallback(async () => {
    const { data } = await supabase.from('branches').select('id, name').order('name');
    setBranches(data ?? []);
  }, []);

  useEffect(() => { fetchData(); fetchProducts(); fetchBranches(); }, [fetchData, fetchProducts, fetchBranches]);

  const validate = () => {
    const errs = {};
    if (!form.product) errs.product = 'Select a product';
    if (!form.quantity || form.quantity < 1) errs.quantity = 'Quantity must be at least 1';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    let branchId = null;
    if (profile?.branchName) {
      const { data: br } = await supabase.from('branches').select('id').eq('name', profile.branchName).single();
      if (br) branchId = br.id;
    }

    const { error } = await supabase.from('returns').insert({
      product_id: form.product.id,
      quantity: Number(form.quantity),
      reason: form.reason.trim() || null,
      return_date: dayjs().format('YYYY-MM-DD'),
      created_by: user?.id,
      branch_id: branchId,
    });

    if (error) {
      showSnackbar(error.message, 'error');
    } else {
      showSnackbar('Return logged — restock manually when repaired', 'info');
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setErrors({});
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('returns').delete().eq('id', deleteTarget.id);
    if (error) showSnackbar(error.message, 'error');
    else { showSnackbar('Return entry deleted'); fetchData(); }
    setDeleteTarget(null);
  };

  const handleRepairRestock = async () => {
    if (!repairBranchId) { setRepairError('Select a branch'); return; }
    setRepairSaving(true);
    setRepairError('');

    const qty = repairRestockTarget.quantity ?? 1;

    const { data: prod, error: fetchErr } = await supabase
      .from('products')
      .select('branch_quantities')
      .eq('id', repairRestockTarget.product_id)
      .single();

    if (fetchErr) { setRepairError(fetchErr.message); setRepairSaving(false); return; }

    const bq = { ...(prod.branch_quantities ?? {}) };
    const key = repairBranchId.toString();
    bq[key] = (Number(bq[key] ?? 0)) + qty;
    const newTotal = Object.values(bq).reduce((s, v) => s + Number(v), 0);

    const { error: updateErr } = await supabase
      .from('products')
      .update({ branch_quantities: bq, current_quantity: newTotal })
      .eq('id', repairRestockTarget.product_id);

    if (updateErr) { setRepairError(updateErr.message); setRepairSaving(false); return; }

    await supabase
      .from('returns')
      .update({ restocked: true, restocked_at: new Date().toISOString() })
      .eq('id', repairRestockTarget.id);

    showSnackbar('Stock restored for repaired product');
    setRepairRestockTarget(null);
    setRepairBranchId('');
    fetchData();
    setRepairSaving(false);
  };

  const totalReturned = rows.reduce((s, r) => s + r.quantity, 0);
  const uniqueProducts = new Set(rows.map((r) => r.product_id)).size;

  const SUMMARY = [
    { label: 'Return Entries', value: rows.length, color: '#E91E8C' },
    { label: 'Total Qty Returned', value: totalReturned, color: '#9C27B0' },
    { label: 'Unique Products', value: uniqueProducts, color: '#22C55E' },
  ];

  const columns = [
    {
      field: 'products', headerName: 'Product', flex: 1, minWidth: 200,
      renderCell: (p) => (
        <Typography variant="body2" fontWeight={600} noWrap title={p.row.products?.name}>
          {p.row.products?.name || '—'}{p.row.products?.item_code ? ` · ${p.row.products.item_code}` : ''}
        </Typography>
      ),
    },
    {
      field: 'quantity', headerName: 'Qty Returned', flex: 0.7, minWidth: 110, align: 'center', headerAlign: 'center',
      renderCell: (p) => <Chip label={p.value} size="small" sx={{ bgcolor: alpha('#E91E8C', 0.1), color: '#AD1457', fontWeight: 700, border: '1px solid rgba(233,30,140,0.25)' }} />,
    },
    {
      field: 'reason', headerName: 'Reason', flex: 1, minWidth: 180,
      renderCell: (p) => <Typography variant="body2" color="text.secondary">{p.value || '—'}</Typography>,
    },
    {
      field: 'return_date', headerName: 'Returned Date & Time', flex: 1, minWidth: 190, headerAlign: 'center', align: 'center',
      renderCell: (p) => (
        <Typography variant="body2" fontWeight={600} noWrap>
          {dayjs(p.row.created_at).format('DD MMM YYYY, hh:mm A')}
        </Typography>
      ),
    },
    {
      field: 'restocked', headerName: 'Status', flex: 0.7, minWidth: 140, headerAlign: 'center', align: 'center',
      renderCell: (p) => p.value
        ? <Chip label="Restocked ✓" size="small" sx={{ bgcolor: alpha('#22C55E', 0.12), color: '#15803D', fontWeight: 700, border: '1px solid rgba(34,197,94,0.3)' }} />
        : <Chip label="Pending Repair" size="small" sx={{ bgcolor: alpha('#F59E0B', 0.12), color: '#B45309', fontWeight: 700, border: '1px solid rgba(245,158,11,0.3)' }} />,
    },
    {
      field: 'actions', headerName: '', flex: 0.5, minWidth: 90, sortable: false, headerAlign: 'center', align: 'center',
      renderHeader: () => <BuildRoundedIcon sx={{ fontSize: 18, color: '#AD1457' }} />,
      renderCell: (p) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title={p.row.restocked ? 'Already restocked' : 'Restock (Repaired)'}>
            <span>
              <IconButton
                size="small"
                disabled={!!p.row.restocked}
                sx={{ color: p.row.restocked ? 'text.disabled' : '#22C55E' }}
                onClick={() => {
                  setRepairRestockTarget(p.row);
                  const defaultBranch = branches.find((b) => b.name === profile?.branchName);
                  setRepairBranchId(defaultBranch ? defaultBranch.id : '');
                  setRepairError('');
                }}
              >
                <BuildRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          {isAdmin && (
            <Tooltip title="Delete">
              <IconButton size="small" sx={{ color: '#E91E8C' }} onClick={() => setDeleteTarget(p.row)}>
                <DeleteRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {/* Compact Gradient Header */}
        <Paper
          elevation={0}
          sx={{
            mb: 2,
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #E91E8C 0%, #9C27B0 60%, #6A1B9A 100%)',
            px: { xs: 2, sm: 2.5 },
            py: 1.4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
            ...fadeInUp(0),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AssignmentReturnRoundedIcon sx={{ color: '#fff', fontSize: 24 }} />
            <Box>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: { xs: '1rem', sm: '1.1rem' }, lineHeight: 1.2 }}>
                Return Report
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.72rem', lineHeight: 1 }}>
                Manage product returns &amp; stock restoration
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`${rows.length} entr${rows.length !== 1 ? 'ies' : 'y'}`}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, border: '1px solid rgba(255,255,255,0.35)', fontSize: '0.78rem' }}
            />
            <Button
              size="small"
              startIcon={<FilterListRoundedIcon />}
              onClick={() => setFilterOpen((o) => !o)}
              sx={{
                bgcolor: filterOpen ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.14)',
                color: '#fff',
                borderRadius: 2.5,
                fontWeight: 700,
                fontSize: '0.78rem',
                px: 1.8,
                border: '1px solid rgba(255,255,255,0.35)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' },
              }}
            >
              {filterOpen ? 'Hide Filters' : 'Filters'}
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddRoundedIcon />}
              onClick={() => { setForm(EMPTY_FORM); setErrors({}); setDialogOpen(true); }}
              sx={{
                bgcolor: 'rgba(255,255,255,0.22)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.8rem',
                borderRadius: '10px',
                border: '1.5px solid rgba(255,255,255,0.45)',
                backdropFilter: 'blur(8px)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.32)' },
                boxShadow: 'none',
              }}
            >
              Add Return
            </Button>
          </Box>
        </Paper>

        {/* Filters */}
        {filterOpen && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.8, sm: 2.5 },
            mb: 2,
            borderRadius: '8px',
            border: '1.5px solid rgba(233,30,140,0.12)',
            bgcolor: alpha('#E91E8C', 0.02),
            ...fadeInUp(0.08),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterListRoundedIcon sx={{ color: '#E91E8C', fontSize: 18 }} />
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#AD1457' }}>Filters</Typography>
          </Box>

          {/* Quick range buttons */}
          <Stack direction="row" flexWrap="wrap" gap={0.8} mb={2}>
            {QUICK_RANGES.map((r, i) => (
              <Button
                key={i}
                size="small"
                onClick={() => applyRange(i)}
                variant={activeRange === i ? 'contained' : 'outlined'}
                sx={activeRange === i ? {
                  background: 'linear-gradient(135deg,#E91E8C,#9C27B0)',
                  color: '#fff',
                  borderRadius: '10px',
                  fontSize: '0.77rem',
                  px: 1.8,
                  border: 'none',
                  '&:hover': { background: 'linear-gradient(135deg,#AD1457,#E91E8C)' },
                } : {
                  borderColor: alpha('#E91E8C', 0.45),
                  color: '#AD1457',
                  borderRadius: '10px',
                  fontSize: '0.77rem',
                  px: 1.8,
                  '&:hover': { borderColor: '#E91E8C', bgcolor: alpha('#E91E8C', 0.05) },
                }}
              >
                {r.label}
              </Button>
            ))}
          </Stack>

          {/* Date range row */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ sm: 'center' }}
            flexWrap="wrap"
            gap={{ xs: 1.5, sm: 0 }}
          >
            <DatePicker
              label="From"
              value={dateFrom}
              onChange={(v) => { setDateFrom(v ?? dayjs()); setActiveRange(-1); }}
              slotProps={{
                textField: {
                  size: 'small',
                  fullWidth: true,
                  sx: {
                    maxWidth: { sm: 200 },
                    '& .MuiInputBase-input': { fontSize: '0.85rem' },
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#E91E8C' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#E91E8C' },
                    },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#E91E8C' },
                  },
                },
              }}
            />
            <Typography
              color={alpha('#6A1B9A', 0.6)}
              fontWeight={700}
              sx={{ display: { xs: 'none', sm: 'block' }, flexShrink: 0 }}
            >–</Typography>
            <DatePicker
              label="To"
              value={dateTo}
              onChange={(v) => { setDateTo(v?.endOf('day') ?? dayjs()); setActiveRange(-1); }}
              slotProps={{
                textField: {
                  size: 'small',
                  fullWidth: true,
                  sx: {
                    maxWidth: { sm: 200 },
                    '& .MuiInputBase-input': { fontSize: '0.85rem' },
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#E91E8C' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#E91E8C' },
                    },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#E91E8C' },
                  },
                },
              }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={fetchData}
              sx={{
                background: 'linear-gradient(135deg,#E91E8C,#9C27B0)',
                borderRadius: '10px',
                px: 3,
                py: 1,
                fontWeight: 700,
                width: { xs: '100%', sm: 'auto' },
                '&:hover': { background: 'linear-gradient(135deg,#AD1457,#E91E8C)' },
              }}
            >
              Apply
            </Button>
          </Stack>
        </Paper>
        )}
        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 2, ...fadeInUp(0.14) }}>
          {SUMMARY.map((s, idx) => (
            <Grid item xs={12} sm={4} key={s.label}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: '8px',
                  border: `1.5px solid ${alpha(s.color, 0.18)}`,
                  bgcolor: alpha(s.color, 0.04),
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 8px 24px ${alpha(s.color, 0.18)}` },
                  ...fadeInUp(0.14 + idx * 0.06),
                }}
              >
                <CardContent sx={{ p: 2.2, '&:last-child': { pb: 2.2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8 }}>
                    <TrendingUpRoundedIcon sx={{ color: s.color, fontSize: 18 }} />
                    <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={1} fontSize="0.67rem" sx={{ color: alpha(s.color, 0.85) }}>
                      {s.label}
                    </Typography>
                  </Box>
                  <Typography variant="h5" fontWeight={800} sx={{ color: s.color, lineHeight: 1.1 }}>
                    {s.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Table */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: '8px',
            border: '1.5px solid rgba(233,30,140,0.1)',
            overflow: 'hidden',
            ...fadeInUp(0.22),
          }}
        >
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            autoHeight
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-main': { overflow: 'auto' },
              '& .MuiDataGrid-columnHeaders': {
                background: 'linear-gradient(90deg, rgba(233,30,140,0.08) 0%, rgba(156,39,176,0.08) 100%)',
                borderRadius: '8px 8px 0 0',
                borderBottom: '2px solid rgba(233,30,140,0.2)',
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                color: '#AD1457 !important',
                fontWeight: 700,
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
              },
              '& .MuiDataGrid-columnSeparator': { color: 'rgba(173,20,87,0.25)' },
              '& .MuiDataGrid-sortIcon': { color: '#AD1457 !important' },
              '& .MuiDataGrid-menuIconButton': { color: '#AD1457 !important' },
              '& .MuiDataGrid-row:hover': { bgcolor: alpha('#E91E8C', 0.04) },
              '& .MuiDataGrid-cell': { borderColor: 'rgba(233,30,140,0.08)' },
              '& .MuiDataGrid-footerContainer': { borderTop: '1.5px solid rgba(233,30,140,0.12)' },
            }}
          />
        </Paper>

        {/* Add Return Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: '10px', overflow: 'hidden' } }}
        >
          <DialogTitle
            sx={{
              background: 'linear-gradient(135deg,#E91E8C,#9C27B0)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1.8,
              px: 2.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssignmentReturnRoundedIcon sx={{ fontSize: 20 }} />
              <Typography fontWeight={700} fontSize="1rem">Add Return Entry</Typography>
            </Box>
            <IconButton
              onClick={() => setDialogOpen(false)}
              size="small"
              sx={{
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.15)',
                transition: 'transform 0.3s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)', transform: 'rotate(90deg)' },
              }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 2.5, bgcolor: '#FAFBFF' }}>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <Autocomplete
                options={products}
                getOptionLabel={(p) => `${p.name}${p.item_code ? ` (${p.item_code})` : ''}`}
                value={form.product}
                onChange={(_, v) => setForm((f) => ({ ...f, product: v }))}
                renderInput={(params) => (
                  <TextField {...params} label="Product *" error={!!errors.product} helperText={errors.product} sx={fieldSx} />
                )}
                renderOption={(props, p) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Code: {p.item_code || '—'} · Stock: {p.branch_stock ?? 0}
                      </Typography>
                    </Box>
                  </Box>
                )}
              />
              <TextField
                label="Return Quantity *"
                type="number"
                fullWidth
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                error={!!errors.quantity}
                helperText={errors.quantity}
                inputProps={{ min: 1 }}
                sx={fieldSx}
              />
              <TextField
                label="Reason (Optional)"
                fullWidth
                multiline
                minRows={2}
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="e.g. Defective item, Wrong product, Customer changed mind…"
                sx={{ ...fieldSx, '& .MuiInputBase-input::placeholder': { fontSize: '0.77rem' } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1.5, bgcolor: '#FAFBFF' }}>
            <Button
              variant="outlined"
              onClick={() => setDialogOpen(false)}
              sx={{
                flex: 1,
                borderRadius: '10px',
                borderColor: alpha('#E91E8C', 0.5),
                color: '#E91E8C',
                '&:hover': { borderColor: '#E91E8C', bgcolor: alpha('#E91E8C', 0.05) },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              sx={{
                flex: 1,
                borderRadius: '10px',
                background: 'linear-gradient(135deg,#E91E8C,#9C27B0)',
                fontWeight: 700,
                '&:hover': { background: 'linear-gradient(135deg,#AD1457,#E91E8C)' },
              }}
            >
              {saving ? 'Saving…' : 'Submit Return'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Repair Restock Dialog */}
        <Dialog
          open={!!repairRestockTarget}
          onClose={() => { setRepairRestockTarget(null); setRepairError(''); }}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: '10px', overflow: 'hidden' } }}
        >
          <DialogTitle
            sx={{
              background: 'linear-gradient(135deg,#22C55E,#15803D)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1.8,
              px: 2.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BuildRoundedIcon sx={{ fontSize: 20 }} />
              <Typography fontWeight={700} fontSize="1rem">Restock Repaired Item</Typography>
            </Box>
            <IconButton
              onClick={() => { setRepairRestockTarget(null); setRepairError(''); }}
              size="small"
              sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 2.5, bgcolor: '#FAFBFF' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 0.5 }}>
              Product: <strong>{repairRestockTarget?.products?.name || '—'}</strong>
            </Typography>
            <Stack spacing={2}>
              <FormControl fullWidth size="small" sx={fieldSx}>
                <InputLabel>Branch *</InputLabel>
                <Select
                  value={repairBranchId}
                  label="Branch *"
                  onChange={(e) => setRepairBranchId(e.target.value)}
                >
                  {branches.map((b) => (
                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {repairError && (
                <Typography color="error" variant="caption">{repairError}</Typography>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1.5, bgcolor: '#FAFBFF' }}>
            <Button
              variant="outlined"
              onClick={() => { setRepairRestockTarget(null); setRepairError(''); }}
              sx={{ flex: 1, borderRadius: '10px', borderColor: alpha('#22C55E', 0.5), color: '#22C55E', '&:hover': { borderColor: '#22C55E', bgcolor: alpha('#22C55E', 0.05) } }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleRepairRestock}
              disabled={repairSaving}
              sx={{ flex: 1, borderRadius: '10px', background: 'linear-gradient(135deg,#22C55E,#15803D)', fontWeight: 700, '&:hover': { background: 'linear-gradient(135deg,#16A34A,#14532D)' } }}
            >
              {repairSaving ? 'Saving…' : 'Restock'}
            </Button>
          </DialogActions>
        </Dialog>

        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete Return Entry"
          message="Delete this return entry? Note: Stock will NOT be readjusted automatically."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      </Box>
    </LocalizationProvider>
  );
};

export default ReturnReportPage;
