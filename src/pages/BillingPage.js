import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Box, Button, Typography, Paper, Stack, TextField, InputAdornment,
  IconButton, Tooltip, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Autocomplete, Alert,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import ReceiptRoundedIcon from '@mui/icons-material/ReceiptRounded';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import RemoveCircleOutlineRoundedIcon from '@mui/icons-material/RemoveCircleOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { supabase } from '../services/supabase';
import { useSnackbar } from '../context/SnackbarContext';
import { useAuth } from '../context/AuthContext';
import { esc } from '../utils/sanitize';
import dayjs from 'dayjs';

const fadeInUp = (delay = 0) => ({
  '@keyframes fadeInUp': {
    '0%': { opacity: 0, transform: 'translateY(24px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' },
  },
  animation: `fadeInUp 0.5s ease ${delay}s both`,
});

const BRANCH_PREFIX = { tenkasi: 'Ten', alangulam: 'Ala' };

const generateBillNumber = async (extraOffset = 0, branchName = '', branchId = null) => {
  const today = dayjs();
  let query = supabase
    .from('sales')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.startOf('day').toISOString())
    .lte('created_at', today.endOf('day').toISOString());
  if (branchId) query = query.eq('branch_id', branchId);
  const { count } = await query;
  const seq = String((count ?? 0) + 1 + extraOffset).padStart(4, '0');
  const prefix = BRANCH_PREFIX[branchName.trim().toLowerCase()] ?? 'BILL';
  return `${prefix}-${today.format('YYYYMMDD')}-${seq}`;
};

const ThermalBillPreview = ({ billItems, billNumber, billDate, discount, total, netAmount, cgstAmt, sgstAmt, halfGst, gstRate, branchName, customerName, customerPhone }) => {
  const [datePart, timePart] = (billDate || '').split(', ');
  const totalItems = billItems.length;
  const totalQty = billItems.reduce((s, i) => s + i.quantity, 0);
  const totalDiscount = billItems.reduce((s, i) => s + Number(i.discount || 0), 0);
  const mono = '"Courier New", Courier, monospace';
  const Dash = () => <Box sx={{ borderTop: '1px dashed #000', my: '4px' }} />;
  return (
    <Box sx={{ fontFamily: mono, fontSize: '12px', maxWidth: 320, mx: 'auto', p: 2, bgcolor: '#fff', color: '#000', '& *': { color: '#000 !important' } }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography sx={{ fontFamily: 'inherit', fontWeight: 'bold', fontSize: '14px' }}>CHELLAMAY HOUSE OF TOYS</Typography>
        <Typography sx={{ fontFamily: 'inherit', fontSize: '11px' }}>27 AMMAN SANNATHI,</Typography>
        <Typography sx={{ fontFamily: 'inherit', fontSize: '11px' }}>TENKASI-627811</Typography>
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
      {customerName && <Typography sx={{ fontFamily: 'inherit', fontSize: '11px' }}>Name:{customerName}</Typography>}
      {customerPhone && <Typography sx={{ fontFamily: 'inherit', fontSize: '11px' }}>Phone:{customerPhone}</Typography>}
      {branchName && <Typography sx={{ fontFamily: 'inherit', fontSize: '11px' }}>Branch:{branchName}</Typography>}
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
        <span>TaxableAmt</span>
        <span>CGST{gstRate > 0 ? ` (${halfGst}%)` : ''}</span>
        <span>SGST{gstRate > 0 ? ` (${halfGst}%)` : ''}</span>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: '11px' }}>
        <span>{Number(total).toFixed(2)}</span>
        <span>{(cgstAmt || 0).toFixed(2)}</span>
        <span>{(sgstAmt || 0).toFixed(2)}</span>
      </Box>
      <Dash />
      {totalDiscount > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: '11px' }}>
          <span>Total Discount :</span><span>-₹{totalDiscount.toFixed(2)}</span>
        </Box>
      )}
      {gstRate > 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: '11px' }}>
            <span>Total GST ({gstRate}%) :</span><span>₹{((cgstAmt || 0) + (sgstAmt || 0)).toFixed(2)}</span>
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

const EMPTY_BILL = (label, billNumber = '') => ({
  id: Date.now() + Math.random(),
  label,
  billItems: [],
  billNumber,
  customerName: '',
  customerPhone: '',
  billDiscount: 0,
  gstPercent: '',
  saved: false,
});

const BillingPage = () => {
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const { user, profile } = useAuth();

  const [products, setProducts] = useState([]);
  const [userBranchId, setUserBranchId] = useState(null);
  const [userBranchName, setUserBranchName] = useState('');

  // ── Multi-bill tabs persisted in localStorage ────────────────────
  const [bills, setBills] = useState(() => {
    try {
      const raw = localStorage.getItem('billing_tabs');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [EMPTY_BILL('Bill 1')];
  });
  const [activeTab, setActiveTab] = useState(() => {
    try { const v = Number(localStorage.getItem('billing_active_tab')); return isNaN(v) ? 0 : v; } catch { return 0; }
  });

  useEffect(() => { try { localStorage.setItem('billing_tabs', JSON.stringify(bills)); } catch {} }, [bills]);
  useEffect(() => { try { localStorage.setItem('billing_active_tab', String(activeTab)); } catch {} }, [activeTab]);

  const safeTab = Math.min(Math.max(0, activeTab), bills.length - 1);
  const activeBill = bills[safeTab] ?? bills[0];
  const { billItems, billNumber, customerName, customerPhone, billDiscount, gstPercent, saved } = activeBill;

  const updateBill = useCallback((patch) => {
    setBills(prev => prev.map((b, i) => i === safeTab ? { ...b, ...patch } : b));
  }, [safeTab]);

  const updateBillItems = useCallback((updater) => {
    setBills(prev => prev.map((b, i) =>
      i === safeTab ? { ...b, billItems: typeof updater === 'function' ? updater(b.billItems) : updater } : b
    ));
  }, [safeTab]);

  const addTab = () => {
    // count unsaved tabs to avoid duplicate bill numbers
    const unsavedCount = bills.filter(b => !b.saved).length;
    generateBillNumber(unsavedCount, userBranchName, userBranchId).then(bn => {
      setBills(prev => {
        const newBill = EMPTY_BILL(`Bill ${prev.length + 1}`, bn);
        setActiveTab(prev.length);
        return [...prev, newBill];
      });
    });
  };

  const closeTab = (idx, e) => {
    e.stopPropagation();
    if (bills.length === 1) return;
    setBills(prev => {
      const next = prev.filter((_, i) => i !== idx);
      try { localStorage.setItem('billing_tabs', JSON.stringify(next)); } catch {}
      return next;
    });
    setActiveTab(prev => {
      const next = prev > idx ? prev - 1 : prev === idx ? Math.max(0, idx - 1) : prev;
      try { localStorage.setItem('billing_active_tab', String(next)); } catch {}
      return next;
    });
  };
  // ─────────────────────────────────────────────────────────────────

  // Transient UI state (not persisted)
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [itemQty, setItemQty] = useState(1);
  const [itemDiscount, setItemDiscount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState(null); // { type: 'success'|'error', message }
  const [editingTotalIdx, setEditingTotalIdx] = useState(null);
  const [editingTotalVal, setEditingTotalVal] = useState('');
  const [editingQtyIdx, setEditingQtyIdx] = useState(null);
  const [editingQtyVal, setEditingQtyVal] = useState('');
  const scanInputRef = useRef(null);
  const barcodeBuffer = useRef('');
  const barcodeTimeout = useRef(null);

  // Reset transient editing state when switching tabs
  useEffect(() => {
    setEditingTotalIdx(null);
    setEditingQtyIdx(null);
    setScanInput('');
    setScanResult(null);
    if (!activeBill.billNumber) {
      generateBillNumber(0, userBranchName, userBranchId).then(bn => updateBill({ billNumber: bn }));
    }
  }, [safeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrint = useCallback(() => {
    const win = window.open('', '_blank', 'width=420,height=700');
    if (!win) { showSnackbar('Pop-up blocked \u2013 allow pop-ups and try again', 'warning'); return; }
    const snapSubtotal = billItems.reduce((s, i) => s + i.total, 0);
    const totalDiscount = billItems.reduce((s, i) => s + Number(i.discount || 0), 0);
    const gstRate = Number(gstPercent) || 0;
    const halfGst = gstRate / 2;
    const cgstAmt = snapSubtotal * halfGst / 100;
    const sgstAmt = cgstAmt;
    const totalGst = cgstAmt + sgstAmt;
    const snapNet = snapSubtotal + totalGst;
    const now = dayjs();
    const snapDate = now.format('DD-MM-YYYY');
    const snapTime = now.format('hh:mm:ss A');
    const totalItems = billItems.length;
    const totalQty = billItems.reduce((s, i) => s + i.quantity, 0);
    const hr = '<hr style="border:none;border-top:1px dashed #000;margin:3px 0">';
    const itemRows = billItems.map((item) => {
      return '<tr>'
        + '<td style="text-align:left;padding:2px 0;overflow:hidden;white-space:nowrap;max-width:100px">' + esc(item.product?.name ?? '') + '</td>'
        + '<td style="text-align:right;padding:2px 2px;white-space:nowrap">' + esc(item.quantity) + '</td>'
        + '<td style="text-align:right;padding:2px 2px;white-space:nowrap">' + Number(item.mrp).toFixed(0) + '</td>'
        + '<td style="text-align:right;padding:2px 2px;white-space:nowrap">' + Number(item.discount || 0).toFixed(0) + '</td>'
        + '<td style="text-align:right;padding:2px 0;white-space:nowrap">' + Number(item.total).toFixed(2) + '</td>'
        + '</tr>';
    }).join('');
    const styles = '* { box-sizing: border-box; margin: 0; padding: 0; color: #000 !important; font-weight: 700 !important; }'
      + 'body { font-family: "Courier New", Courier, monospace; font-size: 12px; background: #fff; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; line-height: 1.8; }'
      + '.receipt { max-width: 320px; margin: auto; padding: 16px 6px; color: #000; }'
      + '.c { text-align: center; } .b { font-weight: 900 !important; }'
      + 'table { width: 100%; border-collapse: collapse; }'
      + 'td, th { padding: 4px 2px !important; }'
      + '@page { margin: 0.5cm; size: 80mm auto; }';
    const html = '<div class="receipt">'
      + '<div class="c b" style="font-size:14px">CHELLAMAY HOUSE OF TOYS</div>'
      + '<div class="c">27 AMMAN SANNATHI,</div>'
      + '<div class="c">TENKASI - 627811</div>'
      + '<div class="c">Ph: 8883509501 / 8680086899</div>'
      + '<div class="c">GSTIN: 33BQNPP8756L1ZY</div>'
      + hr
      + '<div class="c b" style="font-size:13px;letter-spacing:2px">TaxInvoice</div>'
      + hr
      + '<div style="display:flex;justify-content:space-between"><span>BillNo: ' + billNumber + '</span><span>Time: ' + snapTime + '</span></div>'
      + '<div>Date: ' + snapDate + '</div>'
      + '<div>Name: ' + esc(customerName) + '</div>'
      + (customerPhone ? '<div>Ph: ' + esc(customerPhone) + '</div>' : '')
      + (userBranchName ? '<div>Branch: ' + userBranchName + '</div>' : '')
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
      + '<span>Amt :' + snapSubtotal.toFixed(2) + '</span></div>'
      + hr
      + '<table><thead><tr>'
      + '<th style="text-align:center;border-bottom:1px dashed #000;padding:2px 0">TaxableAmt</th>'
      + '<th style="text-align:center;border-bottom:1px dashed #000;padding:2px 0">CGST</th>'
      + '<th style="text-align:center;border-bottom:1px dashed #000;padding:2px 0">SGST</th>'
      + '</tr></thead><tbody><tr>'
      + '<td style="text-align:center;padding:2px 0">' + snapSubtotal.toFixed(2) + '</td>'
        + '<td style="text-align:center;padding:2px 0">' + cgstAmt.toFixed(2) + (gstRate > 0 ? ' (' + halfGst + '%)' : '') + '</td>'
        + '<td style="text-align:center;padding:2px 0">' + sgstAmt.toFixed(2) + (gstRate > 0 ? ' (' + halfGst + '%)' : '') + '</td>'
      + '</tr></tbody></table>'
      + hr
      + (totalDiscount > 0 ? '<div style="display:flex;justify-content:space-between"><span>Total Discount :</span><span>-₹' + totalDiscount.toFixed(2) + '</span></div>' + hr : '')
      + (gstRate > 0 ? '<div style="display:flex;justify-content:space-between"><span>Total GST (' + gstRate + '%):</span><span>₹' + totalGst.toFixed(2) + '</span></div>' + hr : '')
      + '<div class="c b" style="font-size:18px">Total :₹' + snapNet.toFixed(2) + '</div>'
      + hr
      + '<div class="c b">* No Warranty - No Exchange *</div>'
      + '</div>';
    win.document.write('<!DOCTYPE html><html><head><title>' + esc(billNumber) + '</title><style>' + styles + '</style></head><body>' + html + '</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
    showSnackbar('Bill printed successfully');
  }, [billItems, billNumber, gstPercent, userBranchName, customerName, customerPhone, showSnackbar]);

  const fetchProducts = useCallback(async (branchId) => {
    const { data: prods } = await supabase
      .from('products')
      .select('id, name, item_code, barcode, mrp, sales_price, current_quantity, branch_quantities, gst_enabled, sgst_percent, cgst_percent, final_price')
      .order('name');
    setProducts((prods ?? []).map((p) => ({
      ...p,
      branch_quantity: branchId
        ? ((p.branch_quantities ?? {})[branchId.toString()] ?? 0)
        : (p.current_quantity ?? 0),
    })));
  }, []);

  useEffect(() => {
    if (!profile) return;
    const init = async () => {
      let branchId = null;
      if (profile.branchName) {
        const { data: br } = await supabase
          .from('branches')
          .select('id, name')
          .eq('name', profile.branchName)
          .single();
        if (br) { branchId = br.id; setUserBranchId(br.id); setUserBranchName(br.name); }
      }
      await fetchProducts(branchId);
    };
    init();
  }, [profile, fetchProducts]);

  const subtotal = billItems.reduce((s, i) => s + i.total, 0);
  const gstRate = Number(gstPercent) || 0;
  const halfGst = gstRate / 2;
  const cgstAmt = subtotal * halfGst / 100;
  const sgstAmt = cgstAmt;
  const totalGst = cgstAmt + sgstAmt;
  const netAmount = subtotal + totalGst;
  const billDate = dayjs().format('DD MMM YYYY, hh:mm A');

  // --- Barcode scan logic ---
  const addProductByCode = useCallback((code) => {
    const found = products.find(
      (p) =>
        (p.barcode && p.barcode.trim() === code.trim()) ||
        (p.item_code && p.item_code.trim().toLowerCase() === code.trim().toLowerCase())
    );
    if (!found) {
      setScanResult({ type: 'error', message: `No product found for barcode: ${code}` });
      setTimeout(() => setScanResult(null), 3000);
      return;
    }
    if ((found.branch_quantity ?? 0) < 1) {
      setScanResult({ type: 'error', message: `"${found.name}" is out of stock` });
      setTimeout(() => setScanResult(null), 3000);
      return;
    }
    updateBillItems((prev) => {
      const idx = prev.findIndex((i) => i.product.id === found.id);
      if (idx >= 0) {
        const updated = [...prev];
        const newQty = updated[idx].quantity + 1;
        updated[idx] = {
          ...updated[idx],
          quantity: newQty,
          total: found.mrp * newQty - updated[idx].discount,
        };
        return updated;
      }
      return [
        ...prev,
        {
          product: found,
          quantity: 1,
          mrp: found.mrp,
          sales_price: found.sales_price,
          discount: 0,
          total: found.mrp,
        },
      ];
    });
    setScanResult({ type: 'success', message: `Added: ${found.name}` });
    setTimeout(() => setScanResult(null), 2000);
  }, [products, updateBillItems]);

  const handleScanSubmit = (e) => {
    if (e) e.preventDefault();
    if (!scanInput.trim()) return;
    addProductByCode(scanInput.trim());
    setScanInput('');
    setTimeout(() => scanInputRef.current?.focus(), 50);
  };

  // Global keydown listener for USB barcode scanners (rapid typing + Enter)
  useEffect(() => {
    if (saved) return;
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
        barcodeTimeout.current = setTimeout(() => { barcodeBuffer.current = ''; }, 150);
      } else if (e.key === 'Enter') {
        const code = barcodeBuffer.current.trim();
        barcodeBuffer.current = '';
        if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
        if (code.length >= 2) addProductByCode(code);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saved, addProductByCode]);

  // Re-focus scan input on any click outside inputs/dialogs
  useEffect(() => {
    if (saved || addItemOpen || previewOpen) return;
    const handleClick = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      setTimeout(() => scanInputRef.current?.focus(), 50);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [saved, addItemOpen, previewOpen]);

  // --- Qty change in bill ---
  const changeQty = (idx, delta) => {
    updateBillItems((prev) => {
      const updated = [...prev];
      const item = updated[idx];
      const newQty = item.quantity + delta;
      if (newQty < 1) return prev;
      if (delta > 0 && newQty > item.product.branch_quantity) {
        showSnackbar(`Only ${item.product.branch_quantity} in stock`, 'warning');
        return prev;
      }
      updated[idx] = { ...item, quantity: newQty, total: item.mrp * newQty - item.discount };
      return updated;
    });
  };

  const handleAddItem = () => {
    if (!selectedProduct) { showSnackbar('Select a product', 'warning'); return; }
    if (itemQty < 1) { showSnackbar('Quantity must be at least 1', 'warning'); return; }
    if (selectedProduct.branch_quantity < itemQty) {
      showSnackbar(`Only ${selectedProduct.branch_quantity} in stock`, 'warning');
      return;
    }

    const existing = billItems.findIndex((i) => i.product.id === selectedProduct.id);
    if (existing >= 0) {
      showSnackbar(`"${selectedProduct.name}" is already added. Use +/– to change quantity.`, 'warning');
      return;
    }

    const itemTotal = (selectedProduct.mrp * itemQty) - Number(itemDiscount || 0);
    updateBillItems((prev) => [
      ...prev,
      {
        product: selectedProduct,
        quantity: itemQty,
        mrp: selectedProduct.mrp,
        sales_price: selectedProduct.sales_price,
        discount: Number(itemDiscount || 0),
        total: itemTotal,
      },
    ]);

    setSelectedProduct(null);
    setItemQty(1);
    setItemDiscount(0);
    setAddItemOpen(false);
  };

  const removeItem = (idx) => {
    updateBillItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const changeTotal = (idx, newTotal) => {
    const tot = Math.max(0, Number(newTotal) || 0);
    updateBillItems((prev) => {
      const updated = [...prev];
      const item = updated[idx];
      const fullMrp = item.mrp * item.quantity;
      const disc = Math.max(0, fullMrp - tot);
      updated[idx] = { ...item, total: tot, discount: disc };
      return updated;
    });
  };

  const changeQtyDirect = (idx, newQty) => {
    const q = Math.max(1, parseInt(newQty) || 1);
    updateBillItems((prev) => {
      const updated = [...prev];
      const item = updated[idx];
      if (q > item.product.branch_quantity) {
        showSnackbar(`Only ${item.product.branch_quantity} in stock`, 'warning');
        return prev;
      }
      updated[idx] = { ...item, quantity: q, total: item.mrp * q - item.discount };
      return updated;
    });
  };

  // "Save Bill" now just validates and opens the preview popup
  const handleSaveBill = async () => {
    if (billItems.length === 0) { showSnackbar('Add at least one item', 'warning'); return; }
    // Fetch fresh bill number based on latest sales table count before showing preview
    const freshBn = await generateBillNumber(0, userBranchName, userBranchId);
    updateBill({ billNumber: freshBn });
    setPreviewOpen(true);
  };

  // Called when user clicks "Print Bill" inside the preview dialog
  const handleSaveAndPrint = async () => {
    // If bill was already saved (e.g. user reopened preview), just print
    if (saved) {
      setPreviewOpen(false);
      setTimeout(handlePrint, 100);
      return;
    }
    setSaving(true);

    // Resolve a unique bill number — retry on duplicate constraint violation
    let resolvedBillNumber = billNumber;
    let sale = null;
    let saleError = null;
    let attempts = 0;
    while (attempts < 10) {
      const result = await supabase
        .from('sales')
        .insert({
          bill_number: resolvedBillNumber,
          customer_name: customerName.trim() || null,
          customer_phone: customerPhone.trim() || null,
          branch_id: userBranchId ?? null,
          total_amount: subtotal,
          discount: billItems.reduce((s, i) => s + Number(i.discount || 0), 0),
          net_amount: netAmount,
          created_by: user?.id,
        })
        .select()
        .single();
      saleError = result.error;
      sale = result.data;
      if (!saleError) break; // success
      // If it's a unique constraint violation on bill_number, generate a new one and retry
      if (saleError.code === '23505' && saleError.message?.includes('bill_number')) {
        resolvedBillNumber = await generateBillNumber(attempts + 1, userBranchName, userBranchId);
        updateBill({ billNumber: resolvedBillNumber });
        attempts++;
        continue;
      }
      break; // other error — stop retrying
    }

    if (saleError) {
      showSnackbar(saleError.message, 'error');
      setSaving(false);
      return;
    }

    // 2. Save sale items
    const saleItemsPayload = billItems.map((item) => ({
      sale_id: sale.id,
      product_id: item.product.id,
      quantity: item.quantity,
      mrp: item.mrp,
      sales_price: item.sales_price,
      discount: item.discount,
      total: item.total,
    }));

    const { error: itemsError } = await supabase.from('sale_items').insert(saleItemsPayload);
    if (itemsError) { showSnackbar(itemsError.message, 'error'); setSaving(false); return; }

    // 3. Update stock
    if (userBranchId) {
      for (const item of billItems) {
        const branchKey = userBranchId.toString();
        const currentBranchQtys = item.product.branch_quantities ?? {};
        const newBranchQty = Math.max(0, (currentBranchQtys[branchKey] ?? 0) - item.quantity);
        const updatedBranchQtys = { ...currentBranchQtys, [branchKey]: newBranchQty };
        const newTotal = Object.values(updatedBranchQtys).reduce((s, v) => s + (v ?? 0), 0);
        await supabase
          .from('products')
          .update({ branch_quantities: updatedBranchQtys, current_quantity: newTotal })
          .eq('id', item.product.id);
      }
    } else {
      for (const item of billItems) {
        await supabase
          .from('products')
          .update({ current_quantity: Math.max(0, (item.product.current_quantity ?? 0) - item.quantity) })
          .eq('id', item.product.id);
      }
    }

    setSaving(false);
    fetchProducts(userBranchId);
    setPreviewOpen(false);
    showSnackbar('Bill saved successfully!');

    // Print, then close this tab (or reset if it's the only one)
    setTimeout(() => {
      handlePrint();
      setBills(prev => {
        if (prev.length === 1) {
          // only tab — reset to empty, generate a fresh bill number
          generateBillNumber(0, userBranchName, userBranchId).then(bn => {
            const reset = [EMPTY_BILL('Bill 1', bn)];
            try { localStorage.setItem('billing_tabs', JSON.stringify(reset)); } catch {}
            setBills(reset);
            setActiveTab(0);
          });
          return prev; // will be replaced by the async call above
        }
        const next = prev.filter((_, i) => i !== safeTab);
        const nextTab = Math.min(safeTab, next.length - 1);
        try { localStorage.setItem('billing_tabs', JSON.stringify(next)); } catch {}
        try { localStorage.setItem('billing_active_tab', String(nextTab)); } catch {}
        setActiveTab(nextTab);
        return next;
      });
    }, 100);
  };

  const columns = [
    {
      field: 'name', headerName: 'Product', flex: 1, minWidth: 180,
      renderCell: (p) => <Typography variant="body2" fontWeight={600}>{p.row.product?.name}</Typography>,
    },
    {
      field: 'mrp', headerName: 'MRP', flex:1, headerAlign: 'center', align: 'center',
      renderCell: (p) => <Typography variant="body2">₹{Number(p.row.mrp).toFixed(2)}</Typography>,
    },
    {
      field: 'final_price', headerName: 'Final Price', flex: 1, headerAlign: 'center', align: 'center',
      renderCell: (p) => (
        <Typography variant="body2" fontWeight={600} sx={{ color: 'secondary.main' }}>
          {p.row.product?.final_price != null ? `₹${Number(p.row.product.final_price).toFixed(2)}` : '—'}
        </Typography>
      ),
    },
    {
      field: 'quantity', headerName: 'Qty', flex: 1, headerAlign: 'center', align: 'center',
      renderCell: (p) => {
        const idx = p.row.id;
        if (!saved && editingQtyIdx === idx) {
          return (
            <input
              autoFocus
              type="number"
              min="1"
              value={editingQtyVal}
              onChange={(e) => setEditingQtyVal(e.target.value)}
              onBlur={() => { changeQtyDirect(idx, editingQtyVal); setEditingQtyIdx(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { changeQtyDirect(idx, editingQtyVal); setEditingQtyIdx(null); }
                if (e.key === 'Escape') setEditingQtyIdx(null);
              }}
              style={{ width: '52px', textAlign: 'center', border: `1.5px solid ${theme.palette.primary.main}`, borderRadius: '6px', padding: '4px 6px', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit' }}
            />
          );
        }
        return (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            {!saved && (
              <IconButton size="small" onClick={() => changeQty(p.row.id, -1)} disabled={p.row.quantity <= 1}>
                <RemoveCircleOutlineRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </IconButton>
            )}
            <Typography
              variant="body2" fontWeight={700}
              sx={{ minWidth: 20, textAlign: 'center', cursor: saved ? 'default' : 'pointer', px: 0.5, borderRadius: 1, '&:hover': saved ? {} : { bgcolor: alpha(theme.palette.primary.main, 0.08) } }}
              onDoubleClick={() => { if (saved) return; setEditingQtyIdx(idx); setEditingQtyVal(String(p.row.quantity)); }}
            >
              {p.row.quantity}
            </Typography>
            {!saved && (
              <IconButton size="small" onClick={() => changeQty(p.row.id, 1)}>
                <AddCircleOutlineRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              </IconButton>
            )}
          </Stack>
        );
      },
    },
    {
      field: 'total', headerName: 'Total', flex:1, headerAlign: 'center', align: 'center',
      renderCell: (p) => {
        const idx = p.row.id;
        if (!saved && editingTotalIdx === idx) {
          return (
            <input
              autoFocus
              type="text"
              inputMode="decimal"
              value={editingTotalVal}
              onChange={(e) => setEditingTotalVal(e.target.value)}
              onBlur={() => { changeTotal(idx, editingTotalVal); setEditingTotalIdx(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { changeTotal(idx, editingTotalVal); setEditingTotalIdx(null); }
                if (e.key === 'Escape') setEditingTotalIdx(null);
              }}
              style={{ width: '80px', textAlign: 'center', border: `1.5px solid ${theme.palette.primary.main}`, borderRadius: '6px', padding: '4px 6px', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit' }}
            />
          );
        }
        return (
          <Typography
            variant="body2" fontWeight={700} color="success.main"
            onDoubleClick={() => { if (saved) return; setEditingTotalIdx(idx); setEditingTotalVal(String(Math.round(p.row.total))); }}
            sx={{ cursor: saved ? 'default' : 'pointer', px: 1, borderRadius: 1, '&:hover': saved ? {} : { bgcolor: 'rgba(34,197,94,0.08)' } }}
          >
            ₹{Number(p.row.total).toFixed(2)}
          </Typography>
        );
      },
    },
    {
      field: 'discount', headerName: 'Discount', flex: 1, headerAlign: 'center', align: 'center',
      renderCell: (p) => (
        <Typography variant="body2" color="error.main" sx={{ px: 1 }}>
          {Number(p.row.discount || 0) > 0 ? `- ₹${Number(p.row.discount).toFixed(2)}` : '—'}
        </Typography>
      ),
    },
    {
      field: 'actions', headerName: 'Action', flex: 0.8, sortable: false,headerAlign: 'center', align: 'center',
      renderCell: (p) => (
        !saved && <Tooltip title="Remove"><IconButton size="small" color="error" onClick={() => removeItem(p.api.getRowIndexRelativeToVisibleRows(p.id))}><DeleteRoundedIcon fontSize="small" /></IconButton></Tooltip>
      ),
    },
  ];

  return (
    <Box>
      {/* ── Bill Tabs ────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          mb: 1.5,
          overflowX: 'auto',
          pb: 0.5,
          '&::-webkit-scrollbar': { height: 4 },
          '&::-webkit-scrollbar-thumb': { borderRadius: 2, bgcolor: 'rgba(var(--color-primary-rgb),0.3)' },
        }}
      >
        {bills.map((bill, idx) => (
          <Box
            key={bill.id}
            onClick={() => setActiveTab(idx)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.5,
              py: 0.7,
              borderRadius: '20px',
              cursor: 'pointer',
              flexShrink: 0,
              border: '1.5px solid',
              transition: 'all 0.18s',
              bgcolor: safeTab === idx ? theme.palette.primary.main : 'transparent',
              borderColor: safeTab === idx ? theme.palette.primary.main : 'rgba(var(--color-primary-rgb),0.3)',
              '&:hover': {
                borderColor: theme.palette.primary.main,
                bgcolor: safeTab === idx ? theme.palette.primary.dark : alpha(theme.palette.primary.main, 0.08),
              },
            }}
          >
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{ color: safeTab === idx ? '#fff' : 'primary.main', fontSize: '0.78rem', lineHeight: 1, whiteSpace: 'nowrap' }}
            >
              {`Bill ${idx + 1}`}{bill.saved ? ' ✓' : bill.billItems.length > 0 ? ` (${bill.billItems.length})` : ''}
            </Typography>
            {bills.length > 1 && (
              <IconButton
                size="small"
                onClick={(e) => closeTab(idx, e)}
                sx={{
                  p: 0.1,
                  ml: 0.3,
                  color: safeTab === idx ? 'rgba(255,255,255,0.8)' : 'text.secondary',
                  '&:hover': { color: safeTab === idx ? '#fff' : 'error.main', bgcolor: 'transparent' },
                }}
              >
                <CloseRoundedIcon sx={{ fontSize: 13 }} />
              </IconButton>
            )}
          </Box>
        ))}
        <Tooltip title="New bill in new tab">
          <IconButton
            size="small"
            onClick={addTab}
            sx={{
              flexShrink: 0,
              border: '1.5px dashed rgba(var(--color-primary-rgb),0.4)',
              borderRadius: '50%',
              color: 'primary.main',
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1), borderStyle: 'solid' },
            }}
          >
            <AddRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

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
          <ReceiptRoundedIcon sx={{ color: '#fff', fontSize: 24 }} />
          <Box>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: { xs: '1rem', sm: '1.1rem' }, lineHeight: 1.2 }}>
              Billing
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.72rem', lineHeight: 1 }}>
              New bill • {billDate}{userBranchName ? ` • ${userBranchName}` : ''}{customerName ? ` • ${customerName}` : ''}
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end" gap={1}>
          {!saved && (
            <Button
              variant="outlined"
              startIcon={<AddRoundedIcon />}
              onClick={() => setAddItemOpen(true)}
              sx={{
                borderColor: 'rgba(255,255,255,0.6)',
                color: '#fff',
                fontSize: '0.8rem',
                py: 0.7,
                borderRadius: 2.5,
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.15)' },
              }}
            >
              Add Item
            </Button>
          )}
          {!saved && billItems.length > 0 && (
            <Button
              variant="contained"
              onClick={handleSaveBill}
              disabled={saving}
              sx={{
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                fontWeight: 700,
                borderRadius: 2.5,
                py: 0.7,
                fontSize: '0.8rem',
                border: '1.5px solid rgba(255,255,255,0.5)',
                backdropFilter: 'blur(4px)',
                '&:hover': { background: 'rgba(255,255,255,0.3)' },
                '&.Mui-disabled': { color: 'rgba(255,255,255,0.5)' },
              }}
            >
              {saving ? 'Saving…' : 'Save Bill'}
            </Button>
          )}
          {saved && (
            <>
              <Button
                variant="outlined"
                startIcon={<AddRoundedIcon />}
                onClick={addTab}
                sx={{
                  borderColor: 'rgba(255,255,255,0.6)',
                  color: '#fff',
                  fontSize: '0.8rem',
                  py: 0.7,
                  borderRadius: 2.5,
                  '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.15)' },
                }}
              >
                New Bill
              </Button>
              <Button
                variant="outlined"
                startIcon={<ReceiptRoundedIcon />}
                onClick={() => setPreviewOpen(true)}
                sx={{
                  borderColor: 'rgba(255,255,255,0.6)',
                  color: '#fff',
                  fontSize: '0.8rem',
                  py: 0.7,
                  borderRadius: 2.5,
                  '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.15)' },
                }}
              >
                Preview Bill
              </Button>
              <Button
                variant="contained"
                startIcon={<PrintRoundedIcon />}
                onClick={handlePrint}
                sx={{
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  fontWeight: 700,
                  borderRadius: 2.5,
                  py: 0.7,
                  fontSize: '0.8rem',
                  border: '1.5px solid rgba(255,255,255,0.5)',
                  backdropFilter: 'blur(4px)',
                  '&:hover': { background: 'rgba(255,255,255,0.3)' },
                }}
              >
                Print Bill
              </Button>
            </>
          )}
        </Stack>
      </Paper>

      {/* Customer Info */}
      {!saved && (
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mb: 2,
            px: 2,
            py: 1.5,
            borderRadius: '8px',
            border: '1.5px solid rgba(var(--color-primary-rgb),0.18)',
            bgcolor: alpha(theme.palette.primary.main, 0.02),
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            ...fadeInUp(0.06),
          }}
        >
          <TextField
            size="small"
            label="Customer Name"
            placeholder="Optional"
            value={customerName}
            onChange={(e) => updateBill({ customerName: e.target.value })}
            inputProps={{ maxLength: 100 }}
            sx={{
              flex: 1,
              minWidth: { xs: '100%', sm: 180 },
              '& .MuiInputBase-input::placeholder': { fontSize: '0.77rem' },
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                '&:hover .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' },
            }}
          />
          <TextField
            size="small"
            label="Customer Phone"
            placeholder="Optional"
            value={customerPhone}
            onChange={(e) => updateBill({ customerPhone: e.target.value })}
            inputProps={{ maxLength: 15 }}
            sx={{
              flex: 1,
              minWidth: { xs: '100%', sm: 160 },
              '& .MuiInputBase-input::placeholder': { fontSize: '0.77rem' },
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                '&:hover .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' },
            }}
          />
        </Paper>
      )}

      {/* Barcode Scanner */}
      {!saved && (
        <Paper
          elevation={0}
          component="form"
          onSubmit={handleScanSubmit}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mb: 2,
            px: 2,
            py: 1.2,
            borderRadius: '8px',
            border: '1.5px solid rgba(var(--color-primary-rgb),0.18)',
            bgcolor: alpha(theme.palette.primary.main, 0.03),
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            ...fadeInUp(0.08),
          }}
        >
          <QrCodeScannerRoundedIcon sx={{ color: 'primary.main', fontSize: 26, flexShrink: 0 }} />
          <TextField
            inputRef={scanInputRef}
            size="small"
            placeholder="Scan barcode or type item code + Enter"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            autoFocus
            sx={{
              flex: 1,
              minWidth: { xs: '100%', sm: 'auto' },
              '& .MuiInputBase-input::placeholder': { fontSize: '0.77rem' },
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                '&:hover .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' },
              },
            }}
          />
          <Button
            type="submit"
            size="small"
            variant="contained"
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              minWidth: 72,
              borderRadius: 2.5,
              fontSize: '0.82rem',
              fontWeight: 700,
              px: 2,
              flexShrink: 0,
              '&:hover': { background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})` },
            }}
          >
            Add
          </Button>
          {scanResult && (
            <Alert
              severity={scanResult.type}
              sx={{ py: 0, flex: 1, maxWidth: { xs: '100%', sm: 280 }, borderRadius: 2 }}
              onClose={() => setScanResult(null)}
            >
              {scanResult.message}
            </Alert>
          )}
        </Paper>
      )}

      {/* Bill Summary Bar */}
      {billItems.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            gap: 2,
            mb: 2,
            px: 2,
            py: 1.2,
            borderRadius: '8px',
            border: '1.5px solid rgba(var(--color-primary-rgb),0.15)',
            bgcolor: alpha(theme.palette.primary.main, 0.03),
            flexWrap: 'wrap',
            alignItems: 'center',
            ...fadeInUp(0.12),
          }}
        >
          <Chip
            label={`${billItems.length} item${billItems.length !== 1 ? 's' : ''}`}
            size="small"
            sx={{ bgcolor: alpha(theme.palette.primary.main, 0.12), color: 'primary.dark', fontWeight: 700, border: '1px solid rgba(var(--color-primary-rgb),0.25)' }}
          />
          <Chip
            label={`Subtotal: ₹${subtotal.toFixed(2)}`}
            size="small"
            sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), color: 'secondary.dark', fontWeight: 600, border: '1px solid rgba(var(--color-secondary-rgb),0.2)' }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" fontWeight={600} sx={{ color: 'primary.dark', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
              GST %:
            </Typography>
            <TextField
              type="number"
              size="small"
              placeholder="e.g. 12"
              value={gstPercent}
              onChange={(e) => updateBill({ gstPercent: e.target.value })}
              sx={{
                width: 90,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  '&:hover .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' },
                },
              }}
              InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
              inputProps={{ min: 0, max: 28, step: '0.5' }}
              disabled={saved}
            />
          </Box>
          {gstRate > 0 && (
            <Chip
              label={`CGST ${halfGst}%: ₹${cgstAmt.toFixed(2)} | SGST ${halfGst}%: ₹${sgstAmt.toFixed(2)}`}
              size="small"
              sx={{ bgcolor: alpha('#22C55E', 0.1), color: '#16A34A', fontWeight: 600, border: '1px solid rgba(34,197,94,0.25)', fontSize: '0.75rem' }}
            />
          )}
          {gstRate > 0 && (
            <Chip
              label={`GST (${gstRate}%): ₹${totalGst.toFixed(2)}`}
              size="small"
              sx={{ bgcolor: alpha('#F59E0B', 0.1), color: '#B45309', fontWeight: 700, border: '1px solid rgba(245,158,11,0.3)', fontSize: '0.78rem' }}
            />
          )}
          <Chip
            label={`Total: ₹${netAmount.toFixed(2)}`}
            sx={{ background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`, color: '#fff', fontWeight: 700, fontSize: '0.88rem', border: 'none' }}
          />
        </Paper>
      )}

      {/* Items Table */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: '8px',
          border: '1.5px solid rgba(var(--color-primary-rgb),0.1)',
          overflow: 'hidden',
          ...fadeInUp(0.18),
        }}
      >
        {billItems.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography fontSize="3rem" mb={1.5}>🧾</Typography>
            <Typography variant="h6" color="text.secondary" fontWeight={600} mb={0.5}>
              No items added yet
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Scan a barcode or click "Add Item" to start creating your bill
            </Typography>
            {!saved && (
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={() => setAddItemOpen(true)}
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  borderRadius: 2.5,
                  '&:hover': { background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})` },
                }}
              >
                Add First Item
              </Button>
            )}
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto', width: '100%' }}>
          <DataGrid
            rows={billItems.map((item, i) => ({ ...item, id: i }))}
            columns={columns}
            autoHeight
            hideFooter={billItems.length <= 10}
            disableRowSelectionOnClick
            sx={{
              border: 'none',
              minWidth: 650,
              '& .MuiDataGrid-columnHeaders': {
                background: 'linear-gradient(90deg, rgba(var(--color-primary-rgb),0.08) 0%, rgba(var(--color-secondary-rgb),0.08) 100%)',
                borderRadius: '8px 8px 0 0',
                borderBottom: '2px solid rgba(var(--color-primary-rgb),0.2)',
              },
              '& .MuiDataGrid-columnHeader': {
                color: '#fff',
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                color: '#AD1457 !important',
                fontWeight: 700,
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
              },
              '& .MuiDataGrid-columnSeparator': { color: 'rgba(173,20,87,0.3)' },
              '& .MuiDataGrid-sortIcon': { color: '#AD1457 !important' },
              '& .MuiDataGrid-menuIconButton': { color: '#AD1457 !important' },
              '& .MuiDataGrid-row:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
              '& .MuiDataGrid-cell': { borderColor: 'rgba(var(--color-primary-rgb),0.08)' },
            }}
          />
          </Box>
        )}
      </Paper>

      {/* Hidden print area – kept for preview only */}

      {/* Bill Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
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
            <Typography fontWeight={700} fontSize="1rem">Bill Preview</Typography>
          </Box>
          <IconButton
            onClick={() => setPreviewOpen(false)}
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
          <ThermalBillPreview
            billItems={billItems}
            billNumber={billNumber}
            billDate={billDate}
            discount={billDiscount}
            total={subtotal}
            netAmount={netAmount}
            cgstAmt={cgstAmt}
            sgstAmt={sgstAmt}
            halfGst={halfGst}
            gstRate={gstRate}
            branchName={userBranchName}
            customerName={customerName}
            customerPhone={customerPhone}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1.5, bgcolor: '#FAFBFF' }}>
          <Button
            variant="outlined"
            onClick={() => setPreviewOpen(false)}
            sx={{ flex: 1, borderRadius: 2.5, borderColor: alpha(theme.palette.primary.main, 0.5), color: 'primary.main', '&:hover': { bordercolor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05) } }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintRoundedIcon />}
            onClick={handleSaveAndPrint}
            disabled={saving}
            sx={{ flex: 1, borderRadius: 2.5, background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`, '&:hover': { background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})` } }}
          >
            {saving ? 'Saving…' : 'Print Bill'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog
        open={addItemOpen}
        onClose={() => setAddItemOpen(false)}
        maxWidth="sm"
        fullWidth
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
            <AddRoundedIcon sx={{ fontSize: 20 }} />
            <Typography fontWeight={700} fontSize="1rem">Add Item to Bill</Typography>
          </Box>
          <IconButton
            onClick={() => setAddItemOpen(false)}
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
        <DialogContent sx={{ bgcolor: '#FAFBFF', pt: '20px !important' }}>
          <Stack spacing={2.5}>
            <Autocomplete
              options={products}
              getOptionLabel={(p) => `${p.name}${p.item_code ? ` (${p.item_code})` : ''}`}
              value={selectedProduct}
              onChange={(_, v) => { setSelectedProduct(v); setItemQty(1); setItemDiscount(0); }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Product *"
                  placeholder="Search by name or item code"
                  sx={{
                    '& .MuiInputBase-input::placeholder': { fontSize: '0.77rem' },
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      '&:hover .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' },
                    },
                    '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' },
                  }}
                />
              )}
              renderOption={(props, p) => (
                <Box component="li" {...props}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Code: {p.item_code || '—'} · MRP: ₹{Number(p.mrp).toFixed(2)} · Stock: {p.branch_quantity ?? 0}
                    </Typography>
                  </Box>
                </Box>
              )}
            />

            {selectedProduct && (
              <Box sx={{ p: 2, borderRadius: '8px', bgcolor: alpha(theme.palette.primary.main, 0.05), border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}` }}>
                <Typography variant="body2" fontWeight={600} color="#AD1457">{selectedProduct.name}</Typography>
                <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap" gap={0.5}>
                  <Chip label={`MRP: ₹${Number(selectedProduct.mrp).toFixed(2)}`} size="small" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.dark' }} />
                  <Chip label={`Sale: ₹${Number(selectedProduct.sales_price).toFixed(2)}`} size="small" sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), color: 'secondary.dark' }} />
                  <Chip label={`Stock: ${selectedProduct.branch_quantity ?? 0}`} size="small" sx={{ bgcolor: alpha('#4CAF50', 0.1), color: '#2E7D32' }} />
                </Stack>
              </Box>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Quantity *" type="number" fullWidth
                value={itemQty}
                onChange={(e) => setItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                inputProps={{ min: 1, max: selectedProduct?.branch_quantity || 9999 }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    '&:hover .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' },
                }}
              />
              <TextField
                label="Discount (₹)" type="number" fullWidth
                value={itemDiscount}
                onChange={(e) => setItemDiscount(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                inputProps={{ min: 0 }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    '&:hover .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { bordercolor: 'primary.main' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' },
                }}
              />
            </Stack>

            {selectedProduct && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, borderRadius: '8px', background: 'linear-gradient(135deg,rgba(var(--color-primary-rgb),0.08),rgba(var(--color-secondary-rgb),0.08))' }}>
                <Typography variant="body2" fontWeight={600} color="#AD1457">Item Total</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  ₹{Math.max(0, selectedProduct.mrp * itemQty - Number(itemDiscount || 0)).toFixed(2)}
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1.5, bgcolor: '#FAFBFF' }}>
          <Button
            variant="outlined"
            onClick={() => setAddItemOpen(false)}
            sx={{ flex: 1, borderRadius: 2.5, borderColor: alpha(theme.palette.primary.main, 0.5), color: 'primary.main', '&:hover': { bordercolor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05) } }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddItem}
            sx={{ flex: 1, borderRadius: 2.5, background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`, '&:hover': { background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})` } }}
          >
            Add to Bill
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BillingPage;
