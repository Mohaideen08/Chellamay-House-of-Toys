import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Stack, Button,
  Chip, Grid, Card, CardContent,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
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
  { label: 'Yesterday', getValue: () => [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')] },
  { label: 'This Month', getValue: () => [dayjs().startOf('month'), dayjs().endOf('month')] },
  { label: 'Last Month', getValue: () => [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
];

const ProductReportPage = () => {
  const { profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(dayjs().startOf('month'));
  const [dateTo, setDateTo] = useState(dayjs().endOf('day'));
  const [activeRange, setActiveRange] = useState(2);
  const [filterOpen, setFilterOpen] = useState(false);

  const applyRange = (idx) => {
    const [from, to] = QUICK_RANGES[idx].getValue();
    setDateFrom(from);
    setDateTo(to);
    setActiveRange(idx);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    let saleIds = null;
    if (profile?.branchName) {
      const { data: br } = await supabase.from('branches').select('id').eq('name', profile.branchName).single();
      if (br) {
        const { data: sales } = await supabase
          .from('sales').select('id')
          .or(`branch_id.eq.${br.id},branch_id.is.null`)
          .gte('created_at', dateFrom.toISOString())
          .lte('created_at', dateTo.toISOString());
        saleIds = (sales ?? []).map((s) => s.id);
      }
    }
    let query = supabase
      .from('sale_items')
      .select('quantity, total, discount, products(id, name, item_code, mrp, sales_price, categories(name))');
    if (saleIds !== null) {
      query = saleIds.length > 0
        ? query.in('sale_id', saleIds)
        : query.eq('sale_id', -1);
    } else {
      query = query
        .gte('created_at', dateFrom.toISOString())
        .lte('created_at', dateTo.toISOString());
    }
    const { data, error } = await query;

    if (!error && data) {
      // Aggregate by product
      const map = {};
      data.forEach((item) => {
        const prod = item.products;
        if (!prod) return;
        if (!map[prod.id]) {
          map[prod.id] = {
            id: prod.id,
            name: prod.name,
            item_code: prod.item_code,
            category: prod.categories?.name || '—',
            mrp: prod.mrp,
            total_qty: 0,
            total_revenue: 0,
            total_discount: 0,
          };
        }
        map[prod.id].total_qty += item.quantity;
        map[prod.id].total_revenue += item.total || 0;
        map[prod.id].total_discount += item.discount || 0;
      });
      setRows(Object.values(map).sort((a, b) => b.total_qty - a.total_qty));
    }
    setLoading(false);
  }, [dateFrom, dateTo, profile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalQty = rows.reduce((s, r) => s + r.total_qty, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.total_revenue, 0);
  const topProduct = rows[0];
  const fmtCurrency = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const columns = [
    {
      field: 'name', headerName: 'Product Name', flex: 1, minWidth: 200,
      renderCell: (p) => (
        <Typography variant="body2" fontWeight={600} noWrap title={p.value}>{p.value}</Typography>
      ),
    },
    {
      field: 'item_code', headerName: 'Code', flex: 0.7, minWidth: 110, headerAlign: 'center', align: 'center',
      renderCell: (p) => <Typography variant="caption" fontFamily="monospace">{p.value || '—'}</Typography>,
    },
    {
      field: 'mrp', headerName: 'MRP', flex: 0.7, minWidth: 100, headerAlign: 'center', align: 'center',
      renderCell: (p) => <Typography variant="body2">₹{Number(p.value).toFixed(2)}</Typography>,
    },
    {
      field: 'total_qty', headerName: 'Qty Sold', flex: 0.7, minWidth: 100, type: 'number', headerAlign: 'center', align: 'center',
      renderCell: (p) => <Chip label={p.value} size="small" sx={{ bgcolor: alpha('#E91E8C', 0.1), color: '#AD1457', fontWeight: 700, border: '1px solid rgba(233,30,140,0.25)' }} />,
    },
    {
      field: 'total_discount', headerName: 'Discount', flex: 0.7, minWidth: 120, headerAlign: 'center', align: 'center',
      renderCell: (p) => <Typography variant="body2" color="error.main">- ₹{Number(p.value).toFixed(2)}</Typography>,
    },
    {
      field: 'total_revenue', headerName: 'Revenue', flex: 0.8, minWidth: 120, headerAlign: 'center', align: 'center',
      renderCell: (p) => <Typography variant="body2" fontWeight={700} color="success.main">₹{Number(p.value).toFixed(2)}</Typography>,
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
            <AssessmentRoundedIcon sx={{ color: '#fff', fontSize: 24 }} />
            <Box>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: { xs: '1rem', sm: '1.1rem' }, lineHeight: 1.2 }}>
                Product Report
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.72rem', lineHeight: 1 }}>
                Product-wise sales analysis
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`${rows.length} product${rows.length !== 1 ? 's' : ''}`}
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
        {filterOpen && (<Paper
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
                  borderRadius: 2.5,
                  fontSize: '0.77rem',
                  px: 1.8,
                  border: 'none',
                  '&:hover': { background: 'linear-gradient(135deg,#AD1457,#E91E8C)' },
                } : {
                  borderColor: alpha('#E91E8C', 0.45),
                  color: '#AD1457',
                  borderRadius: 2.5,
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
                      borderRadius: 2.5,
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
                      borderRadius: 2.5,
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
                borderRadius: 2.5,
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
        </Paper>)}

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 2, ...fadeInUp(0.14) }}>
          {[{ label: 'Products Sold', value: rows.length, color: '#E91E8C' },
            { label: 'Total Qty Sold', value: totalQty.toLocaleString(), color: '#9C27B0' },
            { label: 'Total Revenue', value: fmtCurrency(totalRevenue), color: '#22C55E' },
          ].map((s, idx) => (
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

        {/* Top Product Highlight */}
        {topProduct && (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.8, sm: 2 },
              mb: 2,
              borderRadius: '8px',
              background: `linear-gradient(135deg, ${alpha('#E91E8C', 0.06)} 0%, ${alpha('#9C27B0', 0.06)} 100%)`,
              border: `1.5px solid ${alpha('#E91E8C', 0.2)}`,
              ...fadeInUp(0.28),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <EmojiEventsRoundedIcon sx={{ color: '#E91E8C', fontSize: 28, flexShrink: 0 }} />
              <Box>
                <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={1} sx={{ color: '#AD1457', fontSize: '0.67rem' }}>
                  Top Selling Product
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#6A1B9A', lineHeight: 1.3 }}>
                  {topProduct.name}
                </Typography>
                <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap" gap={0.5}>
                  <Chip label={`${topProduct.total_qty} units`} size="small" sx={{ bgcolor: alpha('#E91E8C', 0.1), color: '#AD1457', fontWeight: 600 }} />
                  <Chip label={fmtCurrency(topProduct.total_revenue)} size="small" sx={{ bgcolor: alpha('#22C55E', 0.1), color: '#2E7D32', fontWeight: 600 }} />
                </Stack>
              </Box>
            </Box>
          </Paper>
        )}

        {/* Table */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: '8px',
            border: '1.5px solid rgba(233,30,140,0.1)',
            overflow: 'hidden',
            ...fadeInUp(0.32),
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
      </Box>
    </LocalizationProvider>
  );
};

export default ProductReportPage;
