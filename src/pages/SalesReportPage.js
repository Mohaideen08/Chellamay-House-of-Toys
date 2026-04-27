import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Typography, Paper, Stack, Chip,
  Grid, Card, CardContent,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, TextField, InputAdornment,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import ReceiptRoundedIcon from '@mui/icons-material/ReceiptRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
// import { esc } from '../utils/sanitize';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    <Box sx={{ fontFamily: mono, fontSize: '12px', maxWidth: 320, mx: 'auto', p: 2, bgcolor: '#fff', color: '#000', '& *': { color: '#000 !important' } }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography sx={{ fontFamily: 'inherit', fontWeight: 'bold', fontSize: '14px' }}>CHELLAMAY HOUSE OF TOYS</Typography>
        <Typography sx={{ fontFamily: 'inherit', fontSize: '11px', fontWeight: 'bold' }}>27 AMMAN SANNATHI,</Typography>
        <Typography sx={{ fontFamily: 'inherit', fontSize: '11px', fontWeight: 'bold' }}>TENKASI-627811</Typography>
        <Typography sx={{ fontFamily: 'inherit', fontSize: '11px', fontWeight: 'bold' }}>Ph: 8883509501/8680086899</Typography>
        <Typography sx={{ fontFamily: 'inherit', fontSize: '11px', fontWeight: 'bold' }}>GSTIN: 33BQNPP8756L1ZY</Typography>
      </Box>
      <Dash />
      <Typography sx={{ textAlign: 'center', fontFamily: 'inherit', fontWeight: 'bold' }}>TaxInvoice</Typography>
      <Dash />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: '11px', fontWeight: 'bold' }}>
        <span>BillNo:{billNumber}</span>
        <span>Time:{timePart}</span>
      </Box>
      <Typography sx={{ fontFamily: 'inherit', fontSize: '11px', fontWeight: 'bold' }}>Date:{datePart}</Typography>
      <Dash />
      <Box sx={{ display: 'flex', fontFamily: mono, fontSize: '10px', fontWeight: 'bold', borderBottom: '1px dashed #000', pb: '3px', mb: '2px' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>Item</Box>
        <Box sx={{ width: 20, textAlign: 'right', flexShrink: 0 }}>Qty</Box>
        <Box sx={{ width: 46, textAlign: 'right', flexShrink: 0 }}>MRP</Box>
        <Box sx={{ width: 30, textAlign: 'right', flexShrink: 0 }}>Disc</Box>
        <Box sx={{ width: 58, textAlign: 'right', flexShrink: 0 }}>Amount</Box>
      </Box>
      <Dash />
      {billItems.map((item, i) => (
        <Box key={i} sx={{ display: 'flex', fontFamily: mono, fontSize: '10px', mb: '3px', fontWeight: 'bold' }}>
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: '11px', fontWeight: 'bold' }}>
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
  const theme = useTheme();
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

  // const handlePrint = () => {
  //   if (!reprintSale) return;
  //   const net = reprintSale.net_amount;
  //   const sub = reprintSale.total_amount;
  //   const totalGst = Math.max(0, Number(net) - Number(sub));
  //   const cgstAmt = totalGst / 2;
  //   const sgstAmt = totalGst / 2;
  //   const created = dayjs(reprintSale.created_at);
  //   const snapDate = created.format('DD-MM-YYYY');
  //   const snapTime = created.format('hh:mm:ss A');
  //   const totalItems = reprintItems.length;
  //   const totalQty = reprintItems.reduce((s, i) => s + i.quantity, 0);
  //   const totalDiscount = reprintItems.reduce((s, i) => s + Number(i.discount || 0), 0);
  //   const hr = '<hr style="border:none;border-top:1px dashed #000;margin:3px 0">';
  //   const itemRows = reprintItems.map((item) => {
  //     return '<tr>'
  //       + '<td style="text-align:left;padding:2px 0;overflow:hidden;white-space:nowrap;max-width:100px">' + esc(item.product?.name ?? '') + '</td>'
  //       + '<td style="text-align:right;padding:2px 2px;white-space:nowrap">' + esc(item.quantity) + '</td>'
  //       + '<td style="text-align:right;padding:2px 2px;white-space:nowrap">' + Number(item.mrp).toFixed(0) + '</td>'
  //       + '<td style="text-align:right;padding:2px 2px;white-space:nowrap">' + Number(item.discount || 0).toFixed(0) + '</td>'
  //       + '<td style="text-align:right;padding:2px 0;white-space:nowrap">' + Number(item.total).toFixed(2) + '</td>'
  //       + '</tr>';
  //   }).join('');
  //   const styles = '* { box-sizing: border-box; margin: 0; padding: 0; color: #000 !important; font-weight: 700 !important; }'
  //     + 'body { font-family: "Courier New", Courier, monospace; font-size: 12px; background: #fff; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; line-height: 1.8; }'
  //     + '.receipt { max-width: 320px; margin: auto; padding: 16px 6px; color: #000; }'
  //     + '.c { text-align: center; } .b { font-weight: 900 !important; }'
  //     + 'table { width: 100%; border-collapse: collapse; }'
  //     + 'td, th { padding: 4px 2px !important; }'
  //     + '@page { margin: 0.5cm; size: 80mm auto; }';
  //   const html = '<div class="receipt">'
  //     + '<div class="c b" style="font-size:14px">CHELLAMAY HOUSE OF TOYS</div>'
  //     + '<div class="c">27 AMMAN SANNATHI,</div>'
  //     + '<div class="c">TENKASI - 627811</div>'
  //     + '<div class="c">Ph: 8883509501 / 8680086899</div>'
  //     + '<div class="c">GSTIN: 33BQNPP8756L1ZY</div>'
  //     + hr
  //     + '<div class="c b" style="font-size:13px;letter-spacing:2px">TaxInvoice</div>'
  //     + hr
  //     + '<div style="display:flex;justify-content:space-between"><span>BillNo: ' + esc(reprintSale.bill_number) + '</span><span>Time: ' + esc(snapTime) + '</span></div>'
  //     + '<div>Date: ' + esc(snapDate) + '</div>'
  //     + (reprintSale.customer_name ? '<div>Name: ' + esc(reprintSale.customer_name) + '</div>' : '<div>Name:</div>')
  //     + (reprintSale.customer_phone ? '<div>Ph: ' + esc(reprintSale.customer_phone) + '</div>' : '')
  //     + hr
  //     + '<table style="table-layout:fixed;width:100%">'
  //     + '<colgroup><col><col style="width:18px"><col style="width:48px"><col style="width:32px"><col style="width:58px"></colgroup>'
  //     + '<thead><tr>'
  //     + '<th style="text-align:left;border-bottom:1px dashed #000;padding:2px 0">Item</th>'
  //     + '<th style="text-align:right;border-bottom:1px dashed #000;padding:2px 2px">Q</th>'
  //     + '<th style="text-align:right;border-bottom:1px dashed #000;padding:2px 2px">MRP</th>'
  //     + '<th style="text-align:right;border-bottom:1px dashed #000;padding:2px 2px">Disc</th>'
  //     + '<th style="text-align:right;border-bottom:1px dashed #000;padding:2px 0">Amount</th>'
  //     + '</tr></thead><tbody>' + itemRows + '</tbody></table>'
  //     + hr
  //     + '<div style="display:flex;justify-content:space-between">'
  //     + '<span>Items :' + totalItems + '</span>'
  //     + '<span>Qty :' + totalQty + '</span>'
  //     + '<span>Amt :' + Number(sub).toFixed(2) + '</span></div>'
  //     + hr
  //     + '<table><thead><tr>'
  //     + '<th style="text-align:center;border-bottom:1px dashed #000;padding:2px 0">TaxableAmt</th>'
  //     + '<th style="text-align:center;border-bottom:1px dashed #000;padding:2px 0">CGST</th>'
  //     + '<th style="text-align:center;border-bottom:1px dashed #000;padding:2px 0">SGST</th>'
  //     + '</tr></thead><tbody><tr>'
  //     + '<td style="text-align:center;padding:2px 0">' + Number(sub).toFixed(2) + '</td>'
  //     + '<td style="text-align:center;padding:2px 0">' + cgstAmt.toFixed(2) + '</td>'
  //     + '<td style="text-align:center;padding:2px 0">' + sgstAmt.toFixed(2) + '</td>'
  //     + '</tr></tbody></table>'
  //     + hr
  //     + (totalDiscount > 0 ? '<div style="display:flex;justify-content:space-between"><span>Total Discount :</span><span>-₹' + totalDiscount.toFixed(2) + '</span></div>' + hr : '')
  //     + (totalGst > 0 ? '<div style="display:flex;justify-content:space-between"><span>Total GST :</span><span>₹' + totalGst.toFixed(2) + '</span></div>' + hr : '')
  //     + '<div class="c b" style="font-size:18px">Total :₹' + Number(net).toFixed(2) + '</div>'
  //     + hr
  //     + '<div class="c b">* No Warranty - No Exchange *</div>'
  //     + '</div>';

  //   // Use a hidden iframe so mobile browsers (Android/iOS) don't block it as a popup.
  //   const frameId = '__thermal_print_frame__';
  //   let iframe = document.getElementById(frameId);
  //   if (iframe) iframe.remove();
  //   iframe = document.createElement('iframe');
  //   iframe.id = frameId;
  //   iframe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;border:none;visibility:hidden;';
  //   document.body.appendChild(iframe);
  //   const doc = iframe.contentDocument || iframe.contentWindow.document;
  //   doc.open();
  //   doc.write('<!DOCTYPE html><html><head><title>' + esc(reprintSale.bill_number) + '</title><style>' + styles + '</style></head><body>' + html + '</body></html>');
  //   doc.close();
  //   iframe.contentWindow.onafterprint = () => { iframe.remove(); };
  //   setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); }, 600);
  // };

  /* ── Direct ESC/POS print via RawBT (Android Bluetooth) ── */
  const handlePrintRawBT = () => {
    if (!reprintSale) return;
    const net = Number(reprintSale.net_amount);
    const sub = Number(reprintSale.total_amount);
    const totalGst = Math.max(0, net - sub);
    const cgst = totalGst / 2;
    const sgst = totalGst / 2;
    const created = dayjs(reprintSale.created_at);
    const totalDiscount = reprintItems.reduce((s, i) => s + Number(i.discount || 0), 0);
    const totalQty = reprintItems.reduce((s, i) => s + i.quantity, 0);

    const ESC = 0x1B, GS = 0x1D, LF = 0x0A;
    const b = [];
    const cmd = (...v) => v.forEach(x => b.push(x));
    const txt = (s) => { for (let i = 0; i < s.length; i++) b.push(s.charCodeAt(i) & 0xFF); };
    const nl = () => b.push(LF);
    const dash = () => { txt('------------------------------------------------'); nl(); };
    const center = () => cmd(ESC, 0x61, 1);
    const left = () => cmd(ESC, 0x61, 0);
    const bold = (on) => cmd(ESC, 0x45, on ? 1 : 0);
    const fontB = (on) => cmd(ESC, 0x4D, on ? 0x01 : 0x00);
    const dblSize = (on) => cmd(ESC, 0x21, on ? 0x30 : 0x00);
    const cut = () => cmd(GS, 0x56, 0x42, 0x00);
    const col = (s, n, right = false) => { const t = String(s).substring(0, n); return right ? t.padStart(n) : t.padEnd(n); };

    cmd(ESC, 0x40); // init
    center(); bold(true);
    txt('CHELLAMAY HOUSE OF TOYS'); nl(); // Font A – larger for shop name
    bold(false);
    fontB(true); // Font B for rest – smaller, fills 3-inch paper
    txt('27 AMMAN SANNATHI,'); nl();
    txt('TENKASI-627811'); nl();
    txt('Ph: 8883509501/8680086899'); nl();
    txt('GSTIN: 33BQNPP8756L1ZY'); nl();
    dash();
    bold(true); txt('TaxInvoice'); nl(); bold(false);
    dash();
    left();
    txt('BillNo: ' + reprintSale.bill_number); nl();
    txt('Date  : ' + created.format('DD-MM-YYYY') + '  ' + created.format('hh:mm A')); nl();
    if (reprintSale.customer_name) { txt('Name  : ' + reprintSale.customer_name); nl(); }
    if (reprintSale.customer_phone) { txt('Ph    : ' + reprintSale.customer_phone); nl(); }
    dash();
    center(); bold(true);
    txt(col('Item', 20) + col('Q', 4, true) + col('MRP', 8, true) + col('Disc', 6, true) + col('Amt', 10, true)); nl();
    bold(false);
    dash();
    reprintItems.forEach(item => {
      txt(
        col(item.product?.name ?? '', 20) +
        col(item.quantity, 4, true) +
        col(Number(item.mrp).toFixed(0), 8, true) +
        col(Number(item.discount || 0).toFixed(0), 6, true) +
        col(Number(item.total).toFixed(2), 10, true)
      ); nl();
    });
    dash();
    txt(col('Items:' + reprintItems.length + ' Qty:' + totalQty, 28) + col(sub.toFixed(2), 20, true)); nl();
    dash();
    txt(col('TaxableAmt', 16) + col('CGST', 16, true) + col('SGST', 16, true)); nl();
    txt(col(sub.toFixed(2), 16) + col(cgst.toFixed(2), 16, true) + col(sgst.toFixed(2), 16, true)); nl();
    dash();
    if (totalDiscount > 0) { txt('Discount : -Rs.' + totalDiscount.toFixed(2)); nl(); }
    if (totalGst > 0) { txt('Total GST:  Rs.' + totalGst.toFixed(2)); nl(); dash(); }
    fontB(false); bold(true); dblSize(true);
    txt('Total:Rs.' + net.toFixed(2)); nl();
    dblSize(false); bold(false); fontB(true);
    dash();
    center(); txt('* No Warranty - No Exchange *'); nl();
    nl(); nl(); nl();
    cut();

    const uint8 = new Uint8Array(b);
    let bin = ''; uint8.forEach(x => bin += String.fromCharCode(x));
    window.location.href = 'rawbt:base64,' + btoa(bin);
  };

  const handleDownloadPDF = async (sale) => {
    const { data: items } = await supabase
      .from('sale_items')
      .select('*, product:products(name)')
      .eq('sale_id', sale.id);
    const saleItems = items ?? [];
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 297] });
    const created = dayjs(sale.created_at);
    const totalGst = Math.max(0, Number(sale.net_amount) - Number(sale.total_amount));
    const cgstAmt = totalGst / 2;
    const sgstAmt = totalGst / 2;
    const totalItems = saleItems.length;
    const totalQty = saleItems.reduce((s, i) => s + i.quantity, 0);
    const totalDiscount = saleItems.reduce((s, i) => s + Number(i.discount || 0), 0);
    const pw = doc.internal.pageSize.getWidth();
    let y = 6;
    doc.setTextColor(0);
    const line = (text, size = 8, bold = false, align = 'center') => {
      doc.setFontSize(size);
      doc.setFont('courier', bold ? 'bold' : 'normal');
      doc.setTextColor(0);
      doc.text(text, align === 'center' ? pw / 2 : 2, y, { align });
      y += size * 0.5;
    };
    const dash = () => { doc.setDrawColor(0); doc.setLineDashPattern([1, 1], 0); doc.line(2, y, pw - 2, y); y += 2; };

    line('CHELLAMAY HOUSE OF TOYS', 9, true);
    line('27 AMMAN SANNATHI,', 7);
    line('TENKASI-627811', 7);
    line('Ph: 8883509501/8680086899', 7);
    line('GSTIN: 33BQNPP8756L1ZY', 7);
    dash();
    line('Tax Invoice', 8, true);
    dash();
    doc.setFontSize(7); doc.setFont('courier', 'bold');
    doc.text(`BillNo:${sale.bill_number}`, 2, y);
    doc.text(`Time:${created.format('hh:mm A')}`, pw - 2, y, { align: 'right' });
    y += 3.5;
    line(`Date:${created.format('DD-MM-YYYY')}`, 7, true, 'left');
    if (sale.customer_name) line(`Name:${sale.customer_name}`, 7, true, 'left');
    if (sale.customer_phone) line(`Ph:${sale.customer_phone}`, 7, true, 'left');
    dash();

    autoTable(doc, {
      startY: y,
      head: [['Item', 'Q', 'MRP', 'Disc', 'Amt']],
      body: saleItems.map((it) => [
        it.product?.name ?? '',
        it.quantity,
        Number(it.mrp).toFixed(0),
        Number(it.discount || 0).toFixed(0),
        Number(it.total).toFixed(2),
      ]),
      styles: { fontSize: 6.5, cellPadding: 1, font: 'courier', fontStyle: 'bold', textColor: 0 },
      headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', lineWidth: 0, lineColor: 0 },
      columnStyles: {
        0: { cellWidth: 28, overflow: 'ellipsize' },
        1: { halign: 'right', cellWidth: 8 },
        2: { halign: 'right', cellWidth: 14 },
        3: { halign: 'right', cellWidth: 10 },
        4: { halign: 'right', cellWidth: 14 },
      },
      margin: { left: 2, right: 2 },
      tableLineWidth: 0,
      didDrawPage: (d) => { y = d.cursor.y + 2; },
    });
    y = doc.lastAutoTable.finalY + 2;
    dash();
    doc.setFontSize(7); doc.setFont('courier', 'bold'); doc.setTextColor(0);
    doc.text(`Items:${totalItems}  Qty:${totalQty}`, 2, y);
    doc.text(Number(sale.total_amount).toFixed(2), pw - 2, y, { align: 'right' }); y += 3.5;
    dash();
    doc.text('TaxableAmt', 2, y); doc.text('CGST', pw / 2, y, { align: 'center' }); doc.text('SGST', pw - 2, y, { align: 'right' }); y += 3.5;
    doc.text(Number(sale.total_amount).toFixed(2), 2, y); doc.text(cgstAmt.toFixed(2), pw / 2, y, { align: 'center' }); doc.text(sgstAmt.toFixed(2), pw - 2, y, { align: 'right' }); y += 3.5;
    dash();
    if (totalDiscount > 0) { doc.text('Total Discount:', 2, y); doc.text(`-Rs.${totalDiscount.toFixed(2)}`, pw - 2, y, { align: 'right' }); y += 3.5; }
    if (totalGst > 0) { doc.text('Total GST:', 2, y); doc.text(`Rs.${totalGst.toFixed(2)}`, pw - 2, y, { align: 'right' }); y += 3.5; dash(); }
    doc.setFontSize(10); doc.setFont('courier', 'bold');
    doc.text('Total:', 2, y); doc.text(`Rs.${Number(sale.net_amount).toFixed(2)}`, pw - 2, y, { align: 'right' }); y += 5;
    dash();
    doc.setFontSize(7); doc.text('* No Warranty - No Exchange *', pw / 2, y, { align: 'center' });
    doc.save(`Bill_${sale.bill_number}.pdf`);
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
      renderCell: (p) => <Chip label={p.value?.length ?? 0} size="small" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.dark', fontWeight: 700, border: '1px solid rgba(var(--color-primary-rgb),0.25)' }} />,
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
      field: 'actions', headerName: 'Actions', flex: 0.7, minWidth: 100, sortable: false, align: 'center', headerAlign: 'center',
      renderCell: (p) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Reprint Bill">
            <IconButton size="small" color="primary" onClick={() => handleReprintClick(p.row)}>
              <PrintRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download PDF">
            <IconButton size="small" color="secondary" onClick={() => handleDownloadPDF(p.row)}>
              <DownloadRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
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
            border: '1.5px solid rgba(var(--color-primary-rgb),0.12)',
            bgcolor: alpha(theme.palette.primary.main, 0.02),
            ...fadeInUp(0.08),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterListRoundedIcon sx={{ color: 'primary.main', fontSize: 18 }} />
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'primary.dark' }}>Filters</Typography>
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
                '&:hover .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
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
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  color: '#fff',
                  borderRadius: 2.5,
                  fontSize: '0.77rem',
                  px: 1.8,
                  border: 'none',
                  '&:hover': { background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})` },
                } : {
                  borderColor: alpha(theme.palette.primary.main, 0.45),
                  color: 'primary.dark',
                  borderRadius: 2.5,
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
                      borderRadius: 2.5,
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
                      borderRadius: 2.5,
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
              onClick={fetchSales}
              fullWidth={false}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                borderRadius: 2.5,
                px: 3,
                py: 1,
                fontWeight: 700,
                width: { xs: '100%', sm: 'auto' },
                '&:hover': { background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})` },
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
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
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
              <CircularProgress sx={{ color: 'primary.main' }} />
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
        <DialogActions sx={{ px: 2.5, pb: 2.5, flexDirection: 'column', gap: 1, bgcolor: '#FAFBFF' }}>
          <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
            <Button
              variant="outlined"
              onClick={closeReprint}
              sx={{ flex: 1, borderRadius: 2.5, borderColor: alpha(theme.palette.primary.main, 0.5), color: 'primary.main', '&:hover': { bordercolor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05) } }}
            >
              Close
            </Button>
            <Button
              variant="contained"
              startIcon={<PrintRoundedIcon />}
              onClick={handlePrintRawBT}
              disabled={reprintLoading}
              sx={{ flex: 1, borderRadius: 2.5, background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`, '&:hover': { background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})` } }}
            >
              Print
            </Button>
          </Box>
          {/* <Button
            variant="outlined"
            fullWidth
            startIcon={<PrintRoundedIcon />}
            onClick={handlePrintRawBT}
            disabled={reprintLoading}
            sx={{ borderRadius: 2.5, borderColor: '#22C55E', color: '#16A34A', fontWeight: 700, '&:hover': { bgcolor: 'rgba(34,197,94,0.06)', borderColor: '#16A34A' } }}
          >
            Direct Print (RawBT – Bluetooth)
          </Button> */}
        </DialogActions>
      </Dialog>

      {/* print handled via window.open – no hidden DOM needed */}
    </LocalizationProvider>
  );
};

export default SalesReportPage;
