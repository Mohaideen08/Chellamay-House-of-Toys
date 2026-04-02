import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Typography, Paper, Stack, Chip,
  Grid, Card, CardContent,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, TextField, InputAdornment,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import ReceiptRoundedIcon from '@mui/icons-material/ReceiptRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
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

/* ── Reusable printable bill layout (same design as BillingPage) ── */
const ThermalBillPreview = ({ billItems, billNumber, billDate, discount, total, netAmount }) => {
  const [datePart, timePart] = (billDate || '').split(', ');
  const totalItems = billItems.length;
  const totalQty = billItems.reduce((s, i) => s + i.quantity, 0);
  const totalDiscount = billItems.reduce((s, i) => s + Number(i.discount || 0), 0);
  const totalGst = Math.max(0, Number(netAmount) - Number(total));
  const cgstAmt = totalGst / 2;
  const sgstAmt = totalGst / 2;
  const mono = '"Courier New", Courier, monospace';
  const Dash = () => <Box sx={{ borderTop: '1px dashed #000', my: '4px' }} />;
  return (
    <Box sx={{ fontFamily: mono, fontSize: '12px', maxWidth: 320, mx: 'auto', p: 2, bgcolor: '#fff', color: '#000' }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography sx={{ fontFamily: 'inherit', fontWeight: 'bold', fontSize: '14px' }}>CHELLAMAY HOUSE OF TOYS</Typography>
        <Typography sx={{ fontFamily: 'inherit', fontSize: '11px' }}>27 AMMAN SANNATHI,</Typography>
        <Typography sx={{ fontFamily: 'inherit', fontSize: '11px' }}>PAVOORCHATHRAM, TENKASI-627811</Typography>
        <Typography sx={{ fontFamily: 'inherit', fontSize: '11px' }}>Ph: 8883509501/8680086899</Typography>
        <Typography sx={{ fontFamily: 'inherit', fontSize: '11px' }}>GSTIN: 33BQNPP8756L1ZY</Typography>
      </Box>
      <Dash />
      <Typography sx={{ textAlign: 'center', fontFamily: 'inherit', fontWeight: 'bold' }}>TaxInvoice</Typography>
      <Dash />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: '11px' }}>
        <span>BillNo:{billNumber}</span>
        <span>Time:{timePart}</span>
      </Box>
      <Typography sx={{ fontFamily: 'inherit', fontSize: '11px' }}>Date:{datePart}</Typography>
      <Dash />
      <Box sx={{ display: 'flex', fontFamily: mono, fontSize: '10px', fontWeight: 'bold', borderBottom: '1px dashed #000', pb: '3px', mb: '2px' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>Item</Box>
        <Box sx={{ width: 20, textAlign: 'right', flexShrink: 0 }}>Q</Box>
        <Box sx={{ width: 46, textAlign: 'right', flexShrink: 0 }}>MRP</Box>
        <Box sx={{ width: 30, textAlign: 'right', flexShrink: 0 }}>Disc</Box>
        <Box sx={{ width: 58, textAlign: 'right', flexShrink: 0 }}>Amount</Box>
      </Box>
      <Dash />
      {billItems.map((item, i) => (
        <Box key={i} sx={{ display: 'flex', fontFamily: mono, fontSize: '10px', mb: '3px' }}>
          <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product?.name || item.name}</Box>
          <Box sx={{ width: 20, textAlign: 'right', flexShrink: 0 }}>{item.quantity}</Box>
          <Box sx={{ width: 46, textAlign: 'right', flexShrink: 0 }}>{Number(item.mrp).toFixed(0)}</Box>
          <Box sx={{ width: 30, textAlign: 'right', flexShrink: 0 }}>{Number(item.discount || 0).toFixed(0)}</Box>
          <Box sx={{ width: 58, textAlign: 'right', flexShrink: 0 }}>{Number(item.total).toFixed(2)}</Box>
        </Box>
      ))}
      <Dash />
      <Box sx={{ display: 'flex', fontFamily: mono, fontSize: '10px', fontWeight: 'bold' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>Items:{totalItems} Qty:{totalQty}</Box>
        <Box sx={{ width: 46, textAlign: 'right', flexShrink: 0 }}></Box>
        <Box sx={{ width: 30, textAlign: 'right', flexShrink: 0 }}></Box>
        <Box sx={{ width: 58, textAlign: 'right', flexShrink: 0 }}>{Number(total).toFixed(2)}</Box>
      </Box>
      <Dash />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: '11px' }}>
        <span>TaxableAmt</span><span>CGST</span><span>SGST</span>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: '11px' }}>
        <span>{Number(total).toFixed(2)}</span>
        <span>{cgstAmt.toFixed(2)}</span>
        <span>{sgstAmt.toFixed(2)}</span>
      </Box>
      <Dash />
      {totalDiscount > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: '11px' }}>
          <span>Total Discount :</span><span>-₹{totalDiscount.toFixed(2)}</span>
        </Box>
      )}
      {totalGst > 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: '11px' }}>
            <span>Total GST :</span><span>₹{totalGst.toFixed(2)}</span>
          </Box>
          <Dash />
        </>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontWeight: 'bold', fontSize: '16px', my: 1 }}>
        <span>Total :</span>
        <span>₹{Number(netAmount).toFixed(2)}</span>
      </Box>
      <Dash />
      <Typography sx={{ textAlign: 'center', fontFamily: 'inherit', fontSize: '11px', fontWeight: 'bold' }}>* No Warranty - No Exchange *</Typography>
    </Box>
  );
};

const QUICK_RANGES = [
  { label: 'Today', getValue: () => [dayjs().startOf('day'), dayjs().endOf('day')] },
  { label: 'Yesterday', getValue: () => [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')] },
  { label: 'This Month', getValue: () => [dayjs().startOf('month'), dayjs().endOf('month')] },
  { label: 'Last Month', getValue: () => [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
];

const SalesReportPage = () => {
  const { profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(dayjs().startOf('day'));
  const [dateTo, setDateTo] = useState(dayjs().endOf('day'));
  const [activeRange, setActiveRange] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  /* ── Reprint state ── */
  const [reprintSale, setReprintSale] = useState(null);
  const [reprintItems, setReprintItems] = useState([]);
  const [reprintLoading, setReprintLoading] = useState(false);
  const [reprintOpen, setReprintOpen] = useState(false);

  const handlePrint = () => {
    if (!reprintSale) return;
    const win = window.open('', '_blank', 'width=420,height=700');
    if (!win) return;
    const net = reprintSale.net_amount;
    const sub = reprintSale.total_amount;
    const totalGst = Math.max(0, Number(net) - Number(sub));
    const cgstAmt = totalGst / 2;
    const sgstAmt = totalGst / 2;
    const created = dayjs(reprintSale.created_at);
    const snapDate = created.format('DD-MM-YYYY');
    const snapTime = created.format('hh:mm:ss A');
    const totalItems = reprintItems.length;
    const totalQty = reprintItems.reduce((s, i) => s + i.quantity, 0);
    const totalDiscount = reprintItems.reduce((s, i) => s + Number(i.discount || 0), 0);
    const hr = '<hr style="border:none;border-top:1px dashed #000;margin:3px 0">';
    const itemRows = reprintItems.map((item) => {
      return '<tr>'
        + '<td style="text-align:left;padding:2px 0;overflow:hidden;white-space:nowrap;max-width:100px">' + (item.product?.name ?? '') + '</td>'
        + '<td style="text-align:right;padding:2px 2px;white-space:nowrap">' + item.quantity + '</td>'
        + '<td style="text-align:right;padding:2px 2px;white-space:nowrap">' + Number(item.mrp).toFixed(0) + '</td>'
        + '<td style="text-align:right;padding:2px 2px;white-space:nowrap">' + Number(item.discount || 0).toFixed(0) + '</td>'
        + '<td style="text-align:right;padding:2px 0;white-space:nowrap">' + Number(item.total).toFixed(2) + '</td>'
        + '</tr>';
    }).join('');
    const styles = '* { box-sizing: border-box; margin: 0; padding: 0; }'
      + 'body { font-family: "Courier New", Courier, monospace; font-size: 11px; background: #fff; color: #000; }'
      + '.receipt { max-width: 320px; margin: auto; padding: 8px 4px; }'
      + '.c { text-align: center; } .b { font-weight: bold; }'
      + 'table { width: 100%; border-collapse: collapse; }'
      + '@page { margin: 0.3cm; size: 80mm auto; }';
    const html = '<div class="receipt">'
      + '<div class="c b" style="font-size:14px">CHELLAMAY HOUSE OF TOYS</div>'
      + '<div class="c">27 AMMAN SANNATHI, PAVOORCHATHRAM</div>'
      + '<div class="c">TENKASI - 627811</div>'
      + '<div class="c">Ph: 8883509501 / 8680086899</div>'
      + '<div class="c">GSTIN: 33BQNPP8756L1ZY</div>'
      + hr
      + '<div class="c b" style="font-size:13px;letter-spacing:2px">TaxInvoice</div>'
      + hr
      + '<div style="display:flex;justify-content:space-between"><span>BillNo: ' + reprintSale.bill_number + '</span><span>Time: ' + snapTime + '</span></div>'
      + '<div>Date: ' + snapDate + '</div>'
      + (reprintSale.customer_name ? '<div>Name: ' + reprintSale.customer_name + '</div>' : '<div>Name:</div>')
      + (reprintSale.customer_phone ? '<div>Ph: ' + reprintSale.customer_phone + '</div>' : '')
      + hr
      + '<table style="table-layout:fixed;width:100%">'
      + '<colgroup><col><col style="width:18px"><col style="width:48px"><col style="width:32px"><col style="width:58px"></colgroup>'
      + '<thead><tr>'
      + '<th style="text-align:left;border-bottom:1px dashed #000;padding:2px 0">Item</th>'
      + '<th style="text-align:right;border-bottom:1px dashed #000;padding:2px 2px">Q</th>'
      + '<th style="text-align:right;border-bottom:1px dashed #000;padding:2px 2px">MRP</th>'
      + '<th style="text-align:right;border-bottom:1px dashed #000;padding:2px 2px">Disc</th>'
      + '<th style="text-align:right;border-bottom:1px dashed #000;padding:2px 0">Amount</th>'
      + '</tr></thead><tbody>' + itemRows + '</tbody></table>'
      + hr
      + '<div style="display:flex;justify-content:space-between">'
      + '<span>Items :' + totalItems + '</span>'
      + '<span>Qty :' + totalQty + '</span>'
      + '<span>Amt :' + Number(sub).toFixed(2) + '</span></div>'
      + hr
      + '<table><thead><tr>'
      + '<th style="text-align:center;border-bottom:1px dashed #000;padding:2px 0">TaxableAmt</th>'
      + '<th style="text-align:center;border-bottom:1px dashed #000;padding:2px 0">CGST</th>'
      + '<th style="text-align:center;border-bottom:1px dashed #000;padding:2px 0">SGST</th>'
      + '</tr></thead><tbody><tr>'
      + '<td style="text-align:center;padding:2px 0">' + Number(sub).toFixed(2) + '</td>'
      + '<td style="text-align:center;padding:2px 0">' + cgstAmt.toFixed(2) + '</td>'
      + '<td style="text-align:center;padding:2px 0">' + sgstAmt.toFixed(2) + '</td>'
      + '</tr></tbody></table>'
      + hr
      + (totalDiscount > 0 ? '<div style="display:flex;justify-content:space-between"><span>Total Discount :</span><span>-₹' + totalDiscount.toFixed(2) + '</span></div>' + hr : '')
      + (totalGst > 0 ? '<div style="display:flex;justify-content:space-between"><span>Total GST :</span><span>₹' + totalGst.toFixed(2) + '</span></div>' + hr : '')
      + '<div class="c b" style="font-size:18px">Total :₹' + Number(net).toFixed(2) + '</div>'
      + hr
      + '<div class="c b">* No Warranty - No Exchange *</div>'
      + '</div>';
    win.document.write('<!DOCTYPE html><html><head><title>' + reprintSale.bill_number + '</title><style>' + styles + '</style></head><body>' + html + '</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
  };

  const handleReprintClick = async (sale) => {
    setReprintLoading(true);
    setReprintSale(sale);
    setReprintOpen(true);
    const { data } = await supabase
      .from('sale_items')
      .select('*, product:products(name)')
      .eq('sale_id', sale.id);
    setReprintItems(data ?? []);
    setReprintLoading(false);
  };

  const closeReprint = () => {
    setReprintOpen(false);
    setReprintSale(null);
    setReprintItems([]);
  };

  const applyRange = (idx) => {
    const [from, to] = QUICK_RANGES[idx].getValue();
    setDateFrom(from);
    setDateTo(to);
    setActiveRange(idx);
  };

  const fetchSales = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('sales')
      .select('*, sale_items(id), customer_name, customer_phone')
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

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const totalRevenue = rows.reduce((s, r) => s + Number(r.net_amount || 0), 0);
  const totalDiscount = rows.reduce((s, r) => s + Number(r.discount || 0), 0);
  const fmtCurrency = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const filteredRows = searchText.trim()
    ? rows.filter((r) => {
        const q = searchText.trim().toLowerCase();
        return (
          (r.customer_name ?? '').toLowerCase().includes(q) ||
          (r.customer_phone ?? '').toLowerCase().includes(q) ||
          (r.bill_number ?? '').toLowerCase().includes(q)
        );
      })
    : rows;

  const SUMMARY = [
    { label: 'Total Bills', value: rows.length, color: '#3B82F6' },
    { label: 'Total Revenue', value: fmtCurrency(totalRevenue), color: '#22C55E' },
    { label: 'Total Discount', value: fmtCurrency(totalDiscount), color: '#F59E0B' },
  ];

  const columns = [
    { field: 'bill_number', headerName: 'Bill #', flex: 1, minWidth: 160, renderCell: (p) => <Typography variant="body2" fontWeight={600} fontFamily="monospace">{p.value}</Typography> },
    {
      field: 'customer_name', headerName: 'Customer Name', flex: 1, minWidth: 150,
      renderCell: (p) => <Typography variant="body2" fontWeight={600} noWrap>{p.value || '—'}</Typography>,
    },
    {
      field: 'customer_phone', headerName: 'Phone', flex: 0.8, minWidth: 130, headerAlign: 'center', align: 'center',
      renderCell: (p) => <Typography variant="body2" color="text.secondary" noWrap>{p.value || '—'}</Typography>,
    },
    {
      field: 'created_at', headerName: 'Date & Time', flex: 1, minWidth: 190,
      renderCell: (p) => (
        <Typography variant="body2" fontWeight={600} noWrap>{dayjs(p.value).format('DD MMM YYYY, hh:mm A')}</Typography>
      ),
    },
    {
      field: 'sale_items', headerName: 'Items', flex: 0.5, minWidth: 80, align: 'center', headerAlign: 'center',
      renderCell: (p) => <Chip label={p.value?.length ?? 0} size="small" sx={{ bgcolor: alpha('#E91E8C', 0.1), color: '#AD1457', fontWeight: 700, border: '1px solid rgba(233,30,140,0.25)' }} />,
    },
    {
      field: 'mrp', headerName: 'MRP', flex: 0.8, minWidth: 120, headerAlign: 'center', align: 'center',
      renderCell: (p) => <Typography variant="body2">₹{Number(p.row.total_amount || 0).toFixed(2)}</Typography>,
    },
    {
      field: 'discount', headerName: 'Discount', flex: 0.8, minWidth: 120, headerAlign: 'center', align: 'center',
      renderCell: (p) => (
        <Typography variant="body2" color="error.main">- ₹{Number(p.value || 0).toFixed(2)}</Typography>
      ),
    },
    {
      field: 'net_amount', headerName: 'Net Amount', flex: 0.8, minWidth: 130, headerAlign: 'center', align: 'center',
      renderCell: (p) => <Typography variant="body2" fontWeight={700} color="success.main">₹{Number(p.value).toFixed(2)}</Typography>,
    },
    {
      field: 'actions', headerName: '', flex: 0.5, minWidth: 90, sortable: false, align: 'center', headerAlign: 'center',
      renderHeader: () => <PrintRoundedIcon sx={{ fontSize: 18, color: '#AD1457' }} />,
      renderCell: (p) => (
        <Tooltip title="Reprint Bill">
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleReprintClick(p.row)}
          >
            <PrintRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
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
            <BarChartRoundedIcon sx={{ color: '#fff', fontSize: 24 }} />
            <Box>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: { xs: '1rem', sm: '1.1rem' }, lineHeight: 1.2 }}>
                Sales Report
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.72rem', lineHeight: 1 }}>
                Track your daily and monthly sales
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`${rows.length} bill${rows.length !== 1 ? 's' : ''}`}
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
            border: '1.5px solid rgba(233,30,140,0.12)',
            bgcolor: alpha('#E91E8C', 0.02),
            ...fadeInUp(0.08),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterListRoundedIcon sx={{ color: '#E91E8C', fontSize: 18 }} />
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#AD1457' }}>Filters</Typography>
          </Box>

          {/* Search */}
          <TextField
            size="small"
            placeholder="Search by customer name, phone or bill #"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{
              mb: 2,
              maxWidth: { sm: 360 },
              '& .MuiInputBase-input::placeholder': { fontSize: '0.77rem' },
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#E91E8C' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#E91E8C' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#E91E8C' },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ fontSize: 18, color: '#E91E8C' }} />
                </InputAdornment>
              ),
            }}
          />

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
              onClick={fetchSales}
              fullWidth={false}
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

      {/* Reprint Dialog */}
      <Dialog
        open={reprintOpen}
        onClose={closeReprint}
        maxWidth="sm"
        fullWidth
        scroll="paper"
        PaperProps={{ sx: { borderRadius: '12px', overflow: 'hidden' } }}
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
            <ReceiptRoundedIcon sx={{ fontSize: 20 }} />
            <Typography fontWeight={700} fontSize="1rem" noWrap>
              Reprint — {reprintSale?.bill_number}
            </Typography>
          </Box>
          <IconButton
            onClick={closeReprint}
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
        <DialogContent dividers sx={{ p: 0, bgcolor: '#FAFBFF' }}>
          {reprintLoading ? (
            <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress sx={{ color: '#E91E8C' }} />
            </Box>
          ) : (
            <ThermalBillPreview
              billItems={reprintItems}
              billNumber={reprintSale?.bill_number}
              billDate={reprintSale ? dayjs(reprintSale.created_at).format('DD MMM YYYY, hh:mm A') : ''}
              discount={reprintSale?.discount}
              total={reprintSale?.total_amount}
              netAmount={reprintSale?.net_amount}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1.5, bgcolor: '#FAFBFF' }}>
          <Button
            variant="outlined"
            onClick={closeReprint}
            sx={{ flex: 1, borderRadius: 2.5, borderColor: alpha('#E91E8C', 0.5), color: '#E91E8C', '&:hover': { borderColor: '#E91E8C', bgcolor: alpha('#E91E8C', 0.05) } }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintRoundedIcon />}
            onClick={handlePrint}
            disabled={reprintLoading}
            sx={{ flex: 1, borderRadius: 2.5, background: 'linear-gradient(135deg,#E91E8C,#9C27B0)', '&:hover': { background: 'linear-gradient(135deg,#AD1457,#E91E8C)' } }}
          >
            Print
          </Button>
        </DialogActions>
      </Dialog>

      {/* print handled via window.open – no hidden DOM needed */}
    </LocalizationProvider>
  );
};

export default SalesReportPage;
