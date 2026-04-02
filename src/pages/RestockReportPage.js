import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Button, Typography, Paper, Stack, Chip,
  Grid, Card, CardContent, TextField, InputAdornment,
  Dialog, DialogContent, DialogActions,
  IconButton, Tooltip,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import SystemUpdateAltRoundedIcon from '@mui/icons-material/SystemUpdateAltRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import AddBoxRoundedIcon from '@mui/icons-material/AddBoxRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from '../context/SnackbarContext';
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
  { label: 'Today',      getValue: () => [dayjs().startOf('day'), dayjs().endOf('day')] },
  { label: 'This Week',  getValue: () => [dayjs().startOf('week'), dayjs().endOf('week')] },
  { label: 'This Month', getValue: () => [dayjs().startOf('month'), dayjs().endOf('month')] },
  { label: 'Last Month', getValue: () => [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
];

const RestockReportPage = () => {
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const { profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(dayjs().startOf('month'));
  const [dateTo, setDateTo] = useState(dayjs().endOf('day'));
  const [activeRange, setActiveRange] = useState(2);
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  // Edit state
  const [editTarget, setEditTarget] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null);

  const openEdit = (row) => {
    setEditTarget(row);
    setEditQty(String(row.qty_added));
    setEditNotes(row.notes || '');
    setEditError('');
  };

  const handleEditSave = async () => {
    const qty = parseInt(editQty);
    if (!qty || qty < 1) { setEditError('Enter a valid quantity (min 1)'); return; }
    setSaving(true);
    // Recalculate qty_after based on original qty_before + new qty
    const newQtyAfter = editTarget.qty_before + qty;
    const { error } = await supabase
      .from('restock_logs')
      .update({ qty_added: qty, qty_after: newQtyAfter, notes: editNotes.trim() || null })
      .eq('id', editTarget.id);
    if (error) {
      showSnackbar(error.message, 'error');
    } else {
      // Also update the product's current_quantity to reflect the correction
      await supabase
        .from('products')
        .update({ current_quantity: newQtyAfter })
        .eq('id', editTarget.product_id);
      showSnackbar('Restock entry updated');
      setEditTarget(null);
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('restock_logs').delete().eq('id', deleteTarget.id);
    if (error) showSnackbar(error.message, 'error');
    else { showSnackbar('Restock entry deleted'); fetchData(); }
    setDeleteTarget(null);
  };

  const applyRange = (idx) => {
    const [from, to] = QUICK_RANGES[idx].getValue();
    setDateFrom(from);
    setDateTo(to);
    setActiveRange(idx);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('restock_logs')
      .select('*, products(id, name, item_code), branches(name)')
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

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.products?.name?.toLowerCase().includes(q) ||
      r.products?.item_code?.toLowerCase().includes(q) ||
      (r.notes || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalQtyRestocked = filteredRows.reduce((s, r) => s + (r.qty_added || 0), 0);
  const uniqueProducts = new Set(filteredRows.map((r) => r.product_id).filter(Boolean)).size;

  const SUMMARY = [
    { label: 'Restock Events',  value: filteredRows.length, color: theme.palette.secondary.main, icon: SystemUpdateAltRoundedIcon },
    { label: 'Total Qty Added', value: totalQtyRestocked,   color: '#22C55E', icon: AddBoxRoundedIcon },
    { label: 'Unique Products', value: uniqueProducts,      color: '#3B82F6', icon: Inventory2RoundedIcon },
  ];

  const columns = [
    {
      field: 'products', headerName: 'Product', flex: 1, minWidth: 180,
      renderCell: (p) => (
        <Typography variant="body2" fontWeight={700} noWrap>{p.row.products?.name || '—'}</Typography>
      ),
    },
    {
      field: 'item_code', headerName: 'Item Code', flex: 0.7, minWidth: 120, headerAlign: 'center', align: 'center',
      valueGetter: (_, row) => row.products?.item_code || '—',
      renderCell: (p) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'secondary.dark', fontWeight: 600 }}>
          {p.row.products?.item_code || '—'}
        </Typography>
      ),
    },
    {
      field: 'qty_added', headerName: 'Qty Added', flex: 0.55, minWidth: 105, align: 'center', headerAlign: 'center',
      renderCell: (p) => (
        <Chip
          label={`+${p.value}`}
          size="small"
          sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.dark', border: '1px solid rgba(var(--color-primary-rgb),0.25)' }}
        />
      ),
    },
    {
      field: 'qty_before', headerName: 'Stock Before', flex: 0.55, minWidth: 105, align: 'center', headerAlign: 'center',
      renderCell: (p) => <Typography variant="body2" color="text.secondary">{p.value ?? '—'}</Typography>,
    },
    {
      field: 'qty_after', headerName: 'Stock After', flex: 0.55, minWidth: 105, align: 'center', headerAlign: 'center',
      renderCell: (p) => (
        <Typography variant="body2" fontWeight={700} sx={{ color: '#22C55E' }}>{p.value ?? '—'}</Typography>
      ),
    },
    {
      field: 'notes', headerName: 'Notes', flex: 1, minWidth: 150,
      renderCell: (p) => <Typography variant="body2" color="text.secondary">{p.value || '—'}</Typography>,
    },
    {
      field: 'branch', headerName: 'Branch', flex: 0.7, minWidth: 120, headerAlign: 'center', align: 'center',
      renderCell: (p) => (
        <Chip
          label={p.row.branches?.name || '—'}
          size="small"
          sx={{ fontWeight: 600, fontSize: '0.75rem', bgcolor: alpha(theme.palette.secondary.main, 0.1), color: 'secondary.dark', border: '1px solid rgba(var(--color-secondary-rgb),0.2)' }}
        />
      ),
    },
    {
      field: 'created_at', headerName: 'Date & Time', flex: 0.9, minWidth: 170,
      renderCell: (p) => (
        <Typography variant="body2" fontWeight={600} noWrap>{dayjs(p.value).format('DD MMM YYYY, hh:mm A')}</Typography>
      ),
    },
    {
      field: 'actions', headerName: 'Actions', flex: 0.5, minWidth: 90, sortable: false, align: 'center', headerAlign: 'center',
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Edit" arrow>
            <IconButton
              size="small"
              onClick={() => openEdit(p.row)}
              sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.18), transform: 'scale(1.12)' }, transition: 'all 0.2s' }}
            >
              <EditRoundedIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete" arrow>
            <IconButton
              size="small"
              onClick={() => setDeleteTarget(p.row)}
              sx={{ bgcolor: alpha('#EF4444', 0.08), color: '#EF4444', '&:hover': { bgcolor: alpha('#EF4444', 0.18), transform: 'scale(1.12)' }, transition: 'all 0.2s' }}
            >
              <DeleteRoundedIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Stack>
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
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 60%, ${theme.palette.secondary.dark} 100%)`,
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
            <SystemUpdateAltRoundedIcon sx={{ color: '#fff', fontSize: 24 }} />
            <Box>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: { xs: '1rem', sm: '1.1rem' }, lineHeight: 1.2 }}>
                Restock Report
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.72rem', lineHeight: 1 }}>
                Track all product restocking history
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`${filteredRows.length} event${filteredRows.length !== 1 ? 's' : ''}`}
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
            border: '1.5px solid rgba(var(--color-primary-rgb),0.12)',
            bgcolor: alpha(theme.palette.primary.main, 0.02),
            ...fadeInUp(0.08),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterListRoundedIcon sx={{ color: 'primary.main', fontSize: 18 }} />
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'primary.dark' }}>Filters</Typography>
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
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  color: '#fff',
                  borderRadius: '10px',
                  fontSize: '0.77rem',
                  px: 1.8,
                  border: 'none',
                  '&:hover': { background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})` },
                } : {
                  borderColor: alpha(theme.palette.primary.main, 0.45),
                  color: 'primary.dark',
                  borderRadius: '10px',
                  fontSize: '0.77rem',
                  px: 1.8,
                  '&:hover': { bordercolor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05) },
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
                      '&:hover .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' },
                    },
                    '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' },
                  },
                },
              }}
            />
            <Typography
              color={alpha(theme.palette.secondary.dark, 0.6)}
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
                      '&:hover .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' },
                    },
                    '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' },
                  },
                },
              }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={fetchData}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                borderRadius: '10px',
                px: 3,
                py: 1,
                fontWeight: 700,
                width: { xs: '100%', sm: 'auto' },
                '&:hover': { background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})` },
              }}
            >
              Apply
            </Button>
            <TextField
              size="small"
              placeholder="Search product, code, notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                flex: 1,
                minWidth: { xs: '100%', sm: 180 },
                maxWidth: { sm: 260 },
                '& .MuiInputBase-input': { fontSize: '0.82rem' },
                '& .MuiInputBase-input::placeholder': { fontSize: '0.77rem' },
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  '&:hover .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' },
                },
              }}
            />
          </Stack>
        </Paper>
        )}

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {SUMMARY.map((s, idx) => {
            const Icon = s.icon;
            return (
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
                      <Icon sx={{ color: s.color, fontSize: 18 }} />
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
            );
          })}
        </Grid>

        {/* Table */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: '8px',
            border: '1.5px solid rgba(var(--color-primary-rgb),0.1)',
            overflow: 'hidden',
            ...fadeInUp(0.22),
          }}
        >
          <DataGrid
            rows={filteredRows}
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
                background: 'linear-gradient(90deg, rgba(var(--color-primary-rgb),0.08) 0%, rgba(var(--color-secondary-rgb),0.08) 100%)',
                borderRadius: '8px 8px 0 0',
                borderBottom: '2px solid rgba(var(--color-primary-rgb),0.2)',
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
              '& .MuiDataGrid-row:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
              '& .MuiDataGrid-cell': { borderColor: 'rgba(var(--color-primary-rgb),0.08)' },
              '& .MuiDataGrid-footerContainer': { borderTop: '1.5px solid rgba(var(--color-primary-rgb),0.12)' },
            }}
          />
        </Paper>

        {/* Edit Restock Dialog */}
        <Dialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: '10px', overflow: 'hidden' } }}
        >
          <Box sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            px: 2.5, py: 1.8,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EditRoundedIcon sx={{ color: '#fff', fontSize: 20 }} />
              <Typography fontWeight={700} fontSize="1rem" color="#fff">Edit Restock Entry</Typography>
            </Box>
            <IconButton
              onClick={() => setEditTarget(null)}
              size="small"
              sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', transition: 'transform 0.3s', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)', transform: 'rotate(90deg)' } }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Box>
          <DialogContent sx={{ p: 2.5, bgcolor: '#FAFBFF' }}>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 0.4, color: 'primary.dark' }}>
              {editTarget?.products?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Item Code: <strong>{editTarget?.products?.item_code || '—'}</strong> · Stock Before: <strong>{editTarget?.qty_before ?? 0}</strong>
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Qty Added *"
                type="number"
                size="small"
                fullWidth
                value={editQty}
                onChange={(e) => { setEditQty(e.target.value); setEditError(''); }}
                error={!!editError}
                helperText={editError || `New stock after: ${(editTarget?.qty_before ?? 0) + (parseInt(editQty) || 0)}`}
                inputProps={{ min: 1 }}
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: '10px', '&:hover .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' } },
                  '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' },
                }}
              />
              <TextField
                label="Notes (Optional)"
                size="small"
                fullWidth
                multiline
                minRows={2}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="e.g. Restocked from dealer…"
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: '10px', '&:hover .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' } },
                  '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' },
                  '& .MuiInputBase-input::placeholder': { fontSize: '0.77rem' },
                }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1.5, bgcolor: '#FAFBFF' }}>
            <Button
              variant="outlined"
              onClick={() => setEditTarget(null)}
              sx={{ flex: 1, borderRadius: '10px', borderColor: alpha(theme.palette.primary.main, 0.5), color: 'primary.main', '&:hover': { bordercolor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05) } }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleEditSave}
              disabled={saving}
              startIcon={<EditRoundedIcon />}
              sx={{ flex: 1, borderRadius: '10px', background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`, fontWeight: 700, '&:hover': { background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})` } }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogActions>
        </Dialog>

        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete Restock Entry"
          message={`Delete this restock entry for "${deleteTarget?.products?.name}"? This will not adjust the current stock automatically.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      </Box>
    </LocalizationProvider>
  );
};

export default RestockReportPage;
