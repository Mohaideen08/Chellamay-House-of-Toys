import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Typography, Dialog, DialogContent, DialogActions,
  TextField, IconButton, Tooltip, Chip, Stack, Paper, InputAdornment,
  useMediaQuery, useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import { supabase } from '../services/supabase';
import ConfirmDialog from '../components/ConfirmDialog';
import { useSnackbar } from '../context/SnackbarContext';
import dayjs from 'dayjs';

const EMPTY_FORM = { name: '', phone: '', address: '' };

/* ── animation helpers ──────────────────────────────────── */
const fadeInUp = (delay = 0) => ({
  '@keyframes fadeInUp': {
    from: { opacity: 0, transform: 'translateY(30px)' },
    to:   { opacity: 1, transform: 'translateY(0)' },
  },
  animation: `fadeInUp 0.55s cubic-bezier(.22,.68,0,1.2) ${delay}s forwards`,
  opacity: 0,
});



const DealersPage = () => {
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  useMediaQuery(theme.breakpoints.down('sm')); // keeps responsive recalcs
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [errors, setErrors] = useState({});

  const fetchDealers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('dealers')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setRows(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDealers(); }, [fetchDealers]);

  const openAdd = () => {
    setEditRow(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditRow(row);
    setForm({ name: row.name, phone: row.phone ?? '', address: row.address ?? '' });
    setErrors({});
    setDialogOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Dealer name is required';
    if (form.phone && !/^\d{10}$/.test(form.phone.trim())) errs.phone = 'Enter a valid 10-digit number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
    };
    if (editRow) {
      const { error } = await supabase.from('dealers').update(payload).eq('id', editRow.id);
      if (error) { showSnackbar(error.message, 'error'); }
      else { showSnackbar('Dealer updated successfully'); fetchDealers(); setDialogOpen(false); }
    } else {
      const { error } = await supabase.from('dealers').insert(payload);
      if (error) { showSnackbar(error.message, 'error'); }
      else { showSnackbar('Dealer added successfully'); fetchDealers(); setDialogOpen(false); }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('dealers').delete().eq('id', deleteTarget.id);
    if (error) showSnackbar(error.message, 'error');
    else { showSnackbar('Dealer deleted'); fetchDealers(); }
    setDeleteTarget(null);
  };

  const filtered = rows.filter((r) =>
    r.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    r.phone?.includes(searchText) ||
    r.address?.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      field: 'serial',
      headerName: '#',
      flex: 0.3,
      minWidth: 50,
      sortable: false,
      renderCell: (p) => (
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'text.secondary' }}>
          {p.api.getRowIndexRelativeToVisibleRows(p.id) + 1}
        </Typography>
      ),
    },
    {
      field: 'name',
      headerName: 'Dealer Name',
      flex: 1.5,
      minWidth: 200,
      renderCell: (p) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box
            sx={{
              width: 24, height: 24, borderRadius: '10px',
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '0.82rem', fontWeight: 800, flexShrink: 0,
              boxShadow: '0 3px 10px rgba(var(--color-primary-rgb),0.35)',
            }}
          >
            {p.value?.charAt(0)?.toUpperCase()}
          </Box>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.3 }}>{p.value}</Typography>
        </Box>
      ),
    },
    {
      field: 'phone',
      headerName: 'Phone',
      flex: 0.8,
      minWidth: 130,
      headerAlign: 'center',
      align: 'center',
      renderCell: (p) => p.value
        ? (
          <Chip
            label={p.value}
            size="small"
            sx={{
              fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem',
              bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.dark',
              border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.25),
            }}
          />
        )
        : <Typography variant="caption" color="text.disabled">—</Typography>,
    },
    {
      field: 'address',
      headerName: 'Address',
      flex: 1.2,
      minWidth: 160,
      renderCell: (p) => (
        <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }} noWrap title={p.value}>
          {p.value || '—'}
        </Typography>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Added On',
      flex: 1,
      minWidth: 160,
      renderCell: (p) => (
        <Chip
          label={dayjs(p.value).format('DD MMM YY  hh:mm A')}
          size="small"
          sx={{
            fontSize: '0.72rem', fontWeight: 600,
            bgcolor: alpha(theme.palette.secondary.main, 0.08), color: 'secondary.dark',
          }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.6,
      minWidth: 90,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Edit Dealer" arrow>
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
          <Tooltip title="Delete Dealer" arrow>
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
          <Box
            sx={{
              width: 38, height: 38, borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1.5px solid rgba(255,255,255,0.3)',
            }}
          >
            <PeopleAltRoundedIcon sx={{ color: '#fff', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.2 }}>
              Dealers
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.72rem' }}>
              {rows.length} dealer{rows.length !== 1 ? 's' : ''} registered
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
          placeholder="Search by name, phone or address…"
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
            px: { xs: 2, sm: 2.5 },
            py: 1,
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
          Add Dealer
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
          overflow: 'hidden',
        }}
      >
        <DataGrid
          rows={filtered}
          columns={columns}
          loading={loading}
          autoHeight
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          sx={{
            border: 'none',
            fontFamily: '"Poppins", sans-serif',
            '& .MuiDataGrid-columnHeaders': {
              background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb),0.09) 0%, rgba(var(--color-secondary-rgb),0.09) 100%)',
              borderBottom: '2px solid rgba(var(--color-primary-rgb),0.15)',
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: 700,
                fontSize: '0.78rem',
                color: 'primary.dark',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
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
        maxWidth="sm"
        fullWidth
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
        <Box
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            px: { xs: 2, sm: 3 }, py: 2.5,
            display: 'flex', alignItems: 'center', gap: 2,
            position: 'relative', overflow: 'hidden',
          }}
        >
          <Box sx={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
          <Box
            sx={{
              width: 46, height: 46, borderRadius: 2.5,
              bgcolor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1.5px solid rgba(255,255,255,0.3)',
            }}
          >
            <PeopleAltRoundedIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box sx={{ flex: 1, zIndex: 1 }}>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.08rem', lineHeight: 1.2 }}>
              {editRow ? 'Edit Dealer' : 'Add New Dealer'}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.74rem', mt: 0.2 }}>
              {editRow ? 'Update dealer information' : 'Register a new dealer partner'}
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

        <DialogContent sx={{ p: { xs: 2.5, sm: 3 }, bgcolor: '#FAFBFF' }}>
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            <TextField
              label="Dealer Name *"
              fullWidth
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              error={!!errors.name}
              helperText={errors.name}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  '&.Mui-focused fieldset': { bordercolor: 'primary.main' },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' },
              }}
            />
            <TextField
              label="Phone Number"
              fullWidth
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              error={!!errors.phone}
              helperText={errors.phone || 'Optional · 10 digits'}
              inputProps={{ maxLength: 10 }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  '&.Mui-focused fieldset': { bordercolor: 'primary.main' },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' },
              }}
            />
            <TextField
              label="Address"
              fullWidth
              multiline
              minRows={2}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  '&.Mui-focused fieldset': { bordercolor: 'primary.main' },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' },
              }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2.5, sm: 3 }, py: 2.5, gap: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: '#fff' }}>
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
            variant="contained"
            onClick={handleSave}
            disabled={saving}
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
            {saving ? 'Saving…' : editRow ? 'Update Dealer' : 'Add Dealer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm ──────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Dealer"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
};

export default DealersPage;
