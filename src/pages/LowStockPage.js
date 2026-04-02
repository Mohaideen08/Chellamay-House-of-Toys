import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Chip, Grid, Card, CardContent,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const fadeInUp = (delay = 0) => ({
  '@keyframes fadeInUp': {
    '0%': { opacity: 0, transform: 'translateY(24px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' },
  },
  animation: `fadeInUp 0.5s ease ${delay}s both`,
});

const LowStockPage = () => {
  const { profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [branchName, setBranchName] = useState(null);

  const fetchLowStock = useCallback(async () => {
    setLoading(true);

    const { data: prods } = await supabase
      .from('products')
      .select('id, name, item_code, barcode, mrp, current_quantity, branch_quantities, categories(name)')
      .order('name');

    if (!prods) { setLoading(false); return; }

    let branchId = null;

    if (profile?.branchName) {
      const { data: br } = await supabase
        .from('branches')
        .select('id, name')
        .eq('name', profile.branchName)
        .single();
      if (br) {
        branchId = br.id;
        setBranchName(br.name);
      }
    }

    const mapped = prods.map((p) => {
      const qty = branchId
        ? ((p.branch_quantities ?? {})[branchId.toString()] ?? 0)
        : (p.current_quantity ?? 0);
      return {
        id: p.id,
        name: p.name,
        item_code: p.item_code,
        barcode: p.barcode,
        mrp: p.mrp,
        category: p.categories?.name || '—',
        qty,
      };
    }).filter((p) => p.qty <= 1);

    setRows(mapped.sort((a, b) => a.qty - b.qty));
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchLowStock(); }, [fetchLowStock]);

  const outOfStock = rows.filter((r) => r.qty === 0).length;
  const oneLeft = rows.filter((r) => r.qty === 1).length;

  const columns = [
    {
      field: 'name', headerName: 'Product Name', flex: 1, minWidth: 200,
      renderCell: (p) => (
        <Typography variant="body2" fontWeight={600} noWrap title={p.value}>{p.value}</Typography>
      ),
    },
    {
      field: 'item_code', headerName: 'Code', flex: 0.7, minWidth: 110, headerAlign: 'center', align: 'center',
      renderCell: (p) => (
        <Typography variant="caption" fontFamily="monospace">{p.value || '—'}</Typography>
      ),
    },
    {
      field: 'category', headerName: 'Category', flex: 0.8, minWidth: 130,
      renderCell: (p) => (
        <Chip label={p.value} size="small" sx={{ bgcolor: alpha('#9C27B0', 0.1), color: '#6A1B9A', fontWeight: 600, fontSize: '0.72rem', border: '1px solid rgba(156,39,176,0.2)' }} />
      ),
    },
    {
      field: 'mrp', headerName: 'MRP', flex: 0.6, minWidth: 100, headerAlign: 'center', align: 'center',
      renderCell: (p) => <Typography variant="body2">₹{Number(p.value).toFixed(2)}</Typography>,
    },
    {
      field: 'qty', headerName: 'Stock Qty', flex: 0.6, minWidth: 110, headerAlign: 'center', align: 'center',
      renderCell: (p) => (
        <Chip
          label={p.value === 0 ? 'Out of Stock' : `${p.value} left`}
          size="small"
          sx={{
            fontWeight: 700,
            fontSize: '0.74rem',
            bgcolor: p.value === 0 ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
            color: p.value === 0 ? '#DC2626' : '#D97706',
            border: `1px solid ${p.value === 0 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
          }}
        />
      ),
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 60%, #DC2626 100%)',
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
          <WarningAmberRoundedIcon sx={{ color: '#fff', fontSize: 24 }} />
          <Box>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: { xs: '1rem', sm: '1.1rem' }, lineHeight: 1.2 }}>
              Low Stock
              {branchName && (
                <Typography component="span" sx={{ fontWeight: 400, fontSize: '0.85rem', ml: 1, opacity: 0.85 }}>
                  — {branchName} Branch
                </Typography>
              )}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.72rem', lineHeight: 1 }}>
              Products with 0 or 1 quantity remaining
            </Typography>
          </Box>
        </Box>
        <Chip
          label={`${rows.length} product${rows.length !== 1 ? 's' : ''}`}
          size="small"
          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, border: '1px solid rgba(255,255,255,0.35)', fontSize: '0.78rem' }}
        />
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 2, ...fadeInUp(0.08) }}>
        {[
          { label: 'Out of Stock', value: outOfStock, color: '#EF4444', icon: TrendingDownRoundedIcon },
          { label: 'Only 1 Left', value: oneLeft, color: '#F59E0B', icon: Inventory2RoundedIcon },
          { label: 'Total Low Stock', value: rows.length, color: '#9C27B0', icon: WarningAmberRoundedIcon },
        ].map((s, idx) => {
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
                  ...fadeInUp(0.08 + idx * 0.06),
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
          border: '1.5px solid rgba(245,158,11,0.15)',
          overflow: 'hidden',
          ...fadeInUp(0.16),
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          autoHeight
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              background: 'linear-gradient(90deg, rgba(245,158,11,0.1) 0%, rgba(239,68,68,0.08) 100%)',
              borderRadius: '8px 8px 0 0',
              borderBottom: '2px solid rgba(245,158,11,0.25)',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              color: '#B45309 !important',
              fontWeight: 700,
              fontSize: '0.78rem',
              textTransform: 'uppercase',
              letterSpacing: 0.6,
            },
            '& .MuiDataGrid-columnSeparator': { color: 'rgba(180,83,9,0.2)' },
            '& .MuiDataGrid-sortIcon': { color: '#B45309 !important' },
            '& .MuiDataGrid-menuIconButton': { color: '#B45309 !important' },
            '& .MuiDataGrid-row:hover': { bgcolor: alpha('#F59E0B', 0.04) },
            '& .MuiDataGrid-cell': { borderColor: 'rgba(245,158,11,0.08)' },
            '& .MuiDataGrid-footerContainer': { borderTop: '1.5px solid rgba(245,158,11,0.15)' },
          }}
        />
      </Paper>
    </Box>
  );
};

export default LowStockPage;
