import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Plus, Trash2, Wifi, WifiOff, FileText, ShoppingCart, UserPlus, CreditCard, ChevronRight, Lock, Printer, X, RotateCcw } from 'lucide-react';
import { getProductsLocal, saveProductsLocal, queueSaleLocal, getQueuedSales, removeQueuedSale } from './utils/db';
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (err) => Promise.reject(err));
function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddBarcode, setQuickAddBarcode] = useState('');
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddCategory, setQuickAddCategory] = useState('');
  const [quickAddBrand, setQuickAddBrand] = useState('');
  const [quickAddUnit, setQuickAddUnit] = useState('PCS');
  const [quickAddMrp, setQuickAddMrp] = useState('');
  const [quickAddPurchase, setQuickAddPurchase] = useState('');
  const [quickAddSelling, setQuickAddSelling] = useState('');
  const [quickAddQty, setQuickAddQty] = useState('100');
  const [operator, setOperator] = useState(null);
  // Auth
  const [username, setUsername] = useState('cashier');
  const [password, setPassword] = useState('cashier123');
  const [authError, setAuthError] = useState('');
  // Shift
  const [shift, setShift] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [openingCash, setOpeningCash] = useState('1000');
  const [closingCash, setClosingCash] = useState('0');
  // Core state
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  // Top bar fields
  const [deliveryType, setDeliveryType] = useState('Walk In');
  const [salesman, setSalesman] = useState('Default Salesman');
  // Smart input search row
  const [smartProductInput, setSmartProductInput] = useState('');
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [scanInvoiceInput, setScanInvoiceInput] = useState('');
  // Recent and Suspend panels
  const [rightPanelTab, setRightPanelTab] = useState('billing'); // 'billing', 'history'
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundInvoice, setRefundInvoice] = useState(null);
  const [refundQuantities, setRefundQuantities] = useState({});
  const fetchRecentInvoices = async () => {
    try {
      const res = await axios.get('/api/sales/invoices');
      setRecentInvoices(res.data);
    } catch (e) {
      console.error(e);
    }
  };
  useEffect(() => {
    if (token) {
      fetchRecentInvoices();
    }
  }, [token]);
  // Selected Customer details
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [inlineCustName, setInlineCustName] = useState('');
  // Coupons & Loyalty
  const [couponCode, setCouponCode] = useState('');
  const [couponInfo, setCouponInfo] = useState(null);
  const [loyaltyPointsRedeem, setLoyaltyPointsRedeem] = useState('0');
  const [loyaltySettings, setLoyaltySettings] = useState({ earnRate: 0.01, redemptionRate: 100, minPointsToRedeem: 10 });
  const [earnLoyaltyToggle, setEarnLoyaltyToggle] = useState(true);
  // Bottom summary fields
  const [remarks, setRemarks] = useState('');
  const [additionalCharges, setDeliveryCharges] = useState('0'); // acts as additional charges
  // Checkout & Receipts
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [payments, setPayments] = useState([{ mode: 'CASH', amount: 0 }]);
  const [cashTendered, setCashTendered] = useState('');
  const [invoiceResponse, setInvoiceResponse] = useState(null);
  // Hold bills
  const [heldBills, setHeldBills] = useState([]);
  // Checkout Confirmation & Printing States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState(null);
  const [showPrintPromptModal, setShowPrintPromptModal] = useState(false);
  const [lastBilledInvoice, setLastBilledInvoice] = useState(null);
  // Batches Selection State
  const [showBatchSelector, setShowBatchSelector] = useState(false);
  const [batchSelectorProduct, setBatchSelectorProduct] = useState(null);
  const productInputRef = useRef(null);
  // Monitor network connection
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  // Initial sync & data load
  useEffect(() => {
    if (online) {
      triggerSync();
      fetchProducts();
    } else {
      loadProductsOffline();
    }
    updateOfflineCount();
  }, [online]);
  // Cross-domain Single Sign-On (SSO) query token check
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryToken = urlParams.get('token');
    if (queryToken) {
      localStorage.setItem('token', queryToken);
      setToken(queryToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  useEffect(() => {
    if (token) {
      axios.get('/api/auth/me')
        .then(res => {
          setOperator(res.data);
          checkShiftStatus();
        })
        .catch(() => handleLogout());
    }
  }, [token]);
  // Keyboard F-Key Shortcuts F3-F12
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F12') { e.preventDefault(); triggerMultiplePay(); }
      else if (e.key === 'F11') { e.preventDefault(); triggerPayLater(); }
      else if (e.key === 'F10') { e.preventDefault(); triggerUpiPrint(); }
      else if (e.key === 'F9') { e.preventDefault(); triggerCardPrint(); }
      else if (e.key === 'F8') { e.preventDefault(); triggerCashPrint(); }
      else if (e.key === 'F7') { e.preventDefault(); triggerHoldPrint(); }
      else if (e.key === 'F6') { e.preventDefault(); handleHoldBill(); }
      else if (e.key === 'F5') { e.preventDefault(); triggerUpiQuick(); }
      else if (e.key === 'F4') { e.preventDefault(); triggerCashQuick(); }
      else if (e.key === 'F3') { e.preventDefault(); triggerCardQuick(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, selectedCustomer]);
  // Auth/Shift controls
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await axios.post('/api/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Invalid credentials');
    }
  };
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setOperator(null);
  };
  const checkShiftStatus = async () => {
    try {
      const res = await axios.get('/api/sales/shift/status');
      setShift(res.data);
      if (!res.data) setShowShiftModal(true);
    } catch (err) {
      console.error(err);
    }
  };
  const handleOpenShift = async (e) => {
    e.preventDefault();
    try {
      const paise = Math.round(parseFloat(openingCash) * 100);
      const res = await axios.post('/api/sales/shift/open', { openingCash: paise });
      setShift(res.data);
      setShowShiftModal(false);
      fetchProducts();
    } catch (err) {
      alert('Failed to open shift');
    }
  };
  const handleProcessRefund = async () => {
    const itemsToReturn = [];
    Object.keys(refundQuantities).forEach(pid => {
      const qty = parseInt(refundQuantities[pid] || 0);
      if (qty > 0) {
        const invItem = refundInvoice.items.find(i => i.product.id === parseInt(pid));
        itemsToReturn.push({
          productId: parseInt(pid),
          batchId: invItem?.batchId || null,
          qty
        });
      }
    });
    if (itemsToReturn.length === 0) {
      return alert('Enter a return quantity for at least 1 item!');
    }
    try {
      await axios.post('/api/sales/refund', {
        invoiceNumber: refundInvoice.invoiceNumber,
        itemsToReturn
      });
      alert('Items returned successfully! Inventory updated.');
      setShowRefundModal(false);
      setRefundInvoice(null);
      fetchProducts();
      fetchRecentInvoices();
    } catch (err) {
      alert('Return failed: ' + (err.response?.data?.error || err.message));
    }
  };
  const handleProductInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      const val = smartProductInput.trim();
      if (!val) return;
      const match = products.find(p => p.itemCode === val || (p.variants && p.variants.some(v => v.barcode === val)));
      if (match) {
        addToCart(match);
        setSmartProductInput('');
        setProductSuggestions([]);
      } else {
        setQuickAddBarcode(val);
        setQuickAddName('');
        setQuickAddCategory('');
        setQuickAddBrand('');
        setQuickAddMrp('');
        setQuickAddPurchase('');
        setQuickAddSelling('');
        setQuickAddQty('100');
        setShowQuickAddModal(true);
        setProductSuggestions([]);
      }
    }
  };

  const handleSaveQuickProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: quickAddName,
        printName: quickAddName,
        itemCode: quickAddBarcode,
        categoryId: quickAddCategory || 'General',
        brandId: quickAddBrand || 'General',
        unit: quickAddUnit,
        hsnCode: '',
        purchaseTaxPct: 18,
        purchaseTaxInclusive: true,
        salesTaxPct: 18,
        isTaxInclusive: true,
        cessPct: 0,
        manageBatch: false,
        purchasePrice: Math.round(parseFloat(quickAddPurchase) * 100),
        landingCost: Math.round(parseFloat(quickAddPurchase) * 100),
        mrp: Math.round(parseFloat(quickAddMrp) * 100),
        sellingPrice: Math.round(parseFloat(quickAddSelling) * 100),
        minOrderQty: 1,
        openingQty: parseInt(quickAddQty || 0)
      };
      const res = await axios.post('/api/products', payload);
      alert('Product created and added to cart!');
      setShowQuickAddModal(false);
      setSmartProductInput('');
      await fetchProducts();
      addToCart(res.data);
    } catch (err) {
      alert('Failed to add product: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleScanInvoiceKeyDown = async (e) => {
    if (e.key === 'Enter' && scanInvoiceInput) {
      try {
        const res = await axios.get(`/api/sales/invoices/${scanInvoiceInput}`);
        setRefundInvoice(res.data);
        const qtys = {};
        res.data.items.forEach(item => {
          qtys[item.product.id] = 0;
        });
        setRefundQuantities(qtys);
        setShowRefundModal(true);
        setScanInvoiceInput('');
      } catch (err) {
        alert('Invoice not found or invalid barcode!');
      }
    }
  };
  const handleCloseShift = async () => {
    if (!confirm('Reconcile and close this cash shift register?')) return;
    try {
      const paise = Math.round(parseFloat(closingCash) * 100); 
      const res = await axios.post('/api/sales/shift/close', { closingCash: paise });
      alert(`Shift closed successfully! Difference: ₹${res.data.difference / 100}`);
      setShift(null);
      setShowShiftModal(true);
    } catch (err) {
      alert('Failed to close shift');
    }
  };
  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/products');
      setProducts(res.data);
      await saveProductsLocal(res.data);
      const lRes = await axios.get('/api/coupons/loyalty-settings');
      setLoyaltySettings(lRes.data);
      // Customer left blank by default per user request. Resolved to Walk-In by backend on checkout if empty.
      setSelectedCustomer(null);
      setCustomerSearchInput('');
    } catch (err) {
      loadProductsOffline();
    }
  };
  const loadProductsOffline = async () => {
    const list = await getProductsLocal();
    setProducts(list);
  };
  const updateOfflineCount = async () => {
    const list = await getQueuedSales();
    setOfflineCount(list.length);
  };
  const triggerSync = async () => {
    const queued = await getQueuedSales();
    if (queued.length === 0) return;
    setSyncing(true);
    try {
      for (const sale of queued) {
        await axios.post('/api/sales/checkout', sale);
        await removeQueuedSale(sale.id);
      }
      alert('Synced offline invoices successfully!');
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
      updateOfflineCount();
    }
  };
  // Smart Search POS Handler
  const handleProductInputChange = (val) => {
    setSmartProductInput(val);
    if (!val) {
      setProductSuggestions([]);
      return;
    }
    // Barcode exact match check
    const match = products.find(p => p.itemCode === val || (p.variants && p.variants.some(v => v.barcode === val)));
    if (match) {
      addToCart(match);
      setSmartProductInput('');
      setProductSuggestions([]);
      return;
    }
    // Suggest product names flat-listing batches
    const filtered = [];
    products.forEach(p => {
      if (p.name.toLowerCase().includes(val.toLowerCase()) || p.itemCode.includes(val)) {
        if (p.batches && p.batches.length > 1) {
          p.batches.forEach(b => {
            filtered.push({
              ...p,
              selectedBatch: b,
              displayName: `${p.name} [Batch: ${b.batchNumber} | MRP: ₹${(b.mrp/100).toFixed(2)} | Sale: ₹${(b.sellingPrice/100).toFixed(2)}]`,
              displayQty: b.qtyOnHand
            });
          });
        } else {
          filtered.push({
            ...p,
            selectedBatch: null,
            displayName: `${p.name} [MRP: ₹${(p.mrp/100).toFixed(2)} | Sale: ₹${(p.sellingPrice/100).toFixed(2)}]`,
            displayQty: p.qtyOnHand
          });
        }
      }
    });
    const exactMatch = products.find(p => p.itemCode === val || (p.variants && p.variants.some(v => v.barcode === val)));
    if (!exactMatch && val.length >= 2) {
      filtered.push({
        id: 'QUICK_ADD_SPECIAL',
        name: `+ Barcode "${val}" not found. Click to Quick Add`,
        itemCode: val,
        isSpecialQuickAdd: true
      });
    }
    setProductSuggestions(filtered.slice(0, 8));
  };
  const addToCart = (product) => {
    // If multiple batches exist, show modal selector
    if (product.batches && product.batches.length > 1) {
      setBatchSelectorProduct(product);
      setShowBatchSelector(true);
      return;
    }
    const batch = (product.batches && product.batches.length === 1) ? product.batches[0] : null;
    const priceVal = batch ? batch.sellingPrice : product.sellingPrice;
    const mrpVal = batch ? batch.mrp : product.mrp;
    const batchId = batch ? batch.id : null;
    const batchNumber = batch ? batch.batchNumber : null;
    const existingIdx = cart.findIndex(item => item.id === product.id && item.batchId === batchId);
    if (existingIdx !== -1) {
      const updated = [...cart];
      updated[existingIdx].qty += 1;
      setCart(updated);
    } else {
      setCart([...cart, {
        id: product.id,
        name: product.name,
        itemCode: product.itemCode,
        qty: 1,
        price: priceVal,
        mrp: mrpVal,
        unit: product.netWeightUnit || 'Pcs',
        discount: 0,
        addDisc: 0,
        purchasePrice: batch ? batch.purchasePrice : product.purchasePrice,
        salesTaxPct: product.salesTaxPct,
        batchId,
        batchNumber
      }]);
    }
    setSmartProductInput('');
    setProductSuggestions([]);
    productInputRef.current?.focus();
  };
  // Customer Search & Inline add
  const handleCustomerSearchChange = async (val) => {
    setCustomerSearchInput(val);
    if (selectedCustomer) {
      setSelectedCustomer(null);
    }
    if (!val) {
      setCustomerSuggestions([]);
      return;
    }
    try {
      const res = await axios.get('/api/customers', { params: { search: val } });
      setCustomerSuggestions(res.data);
    } catch (err) {
      console.error(err);
    }
  };
  const handleSelectCustomer = (cust) => {
    setSelectedCustomer(cust);
    setCustomerSearchInput(`${cust.name} (${cust.phone})`);
    setCustomerSuggestions([]);
  };
  const handleInlineCustomerAdd = async () => {
    if (!customerSearchInput) return;
    try {
      // customerSearchInput holds phone or name. Let's assume numeric as phone
      const phoneNum = /^\d+$/.test(customerSearchInput) ? customerSearchInput : `90${Date.now().toString().slice(-8)}`;
      const nameVal = inlineCustName || `Customer-${phoneNum.slice(-4)}`;
      const res = await axios.post('/api/customers', { name: nameVal, phone: phoneNum });
      setSelectedCustomer(res.data);
      setCustomerSearchInput(res.data.name);
      setCustomerSuggestions([]);
      setInlineCustName('');
      alert('Profile registered & attached inline!');
    } catch (err) {
      alert('Failed to register customer inline');
    }
  };
  // Cart Actions
  const updateQty = (idx, val) => {
    const updated = [...cart];
    updated[idx].qty = Math.max(1, parseInt(val || 1));
    setCart(updated);
  };
  const updateDiscount = (idx, val) => {
    const updated = [...cart];
    updated[idx].discount = Math.round(parseFloat(val || 0) * 100);
    setCart(updated);
  };
  const updateAddDisc = (idx, val) => {
    const updated = [...cart];
    updated[idx].addDisc = Math.round(parseFloat(val || 0) * 100);
    setCart(updated);
  };
  const removeItem = (idx) => {
    setCart(cart.filter((_, i) => i !== idx));
  };
  // Calculations
  let totalQty = 0;
  let totalMrp = 0;
  let subtotal = 0;
  let totalDiscount = 0;
  let taxAmount = 0;
  cart.forEach(item => {
    totalQty += item.qty;
    totalMrp += item.mrp * item.qty;
    subtotal += item.price * item.qty;
    const discTotal = (item.discount + item.addDisc) * item.qty;
    totalDiscount += discTotal;
    // Tax calculation
    const taxable = (item.price * item.qty) - discTotal;
    taxAmount += Math.round(taxable - (taxable / (1 + item.salesTaxPct/100)));
  });
  let addChargesPaise = Math.round(parseFloat(additionalCharges || 0) * 100);
  let couponDiscountPaise = 0;
  if (couponInfo && subtotal - totalDiscount >= couponInfo.minBillValue) {
    if (couponInfo.discountType === 'PERCENTAGE') {
      couponDiscountPaise = Math.round((subtotal - totalDiscount) * (couponInfo.discountValue / 100));
    } else {
      couponDiscountPaise = couponInfo.discountValue;
    }
  }
  let pointsToRedeem = parseInt(loyaltyPointsRedeem || 0);
  let loyaltyDiscountPaise = pointsToRedeem * loyaltySettings.redemptionRate;
  const grandTotal = Math.max(0, subtotal + addChargesPaise - (totalDiscount + couponDiscountPaise + loyaltyDiscountPaise));
  // Checkout Submit with Confirmation Prompt & Print Options
  const executeCheckout = (checkoutPayload) => {
    setConfirmPayload(checkoutPayload);
    setShowConfirmModal(true);
  };
  const handleConfirmedCheckout = async () => {
    setShowConfirmModal(false);
    if (!confirmPayload) return;
    if (online) {
      try {
        const res = await axios.post('/api/sales/checkout', confirmPayload);
        setInvoiceResponse(res.data);
        setLastBilledInvoice(res.data);
        setCart([]); 
        setSelectedCustomer(null); 
        setCustomerSearchInput(''); 
        setCouponInfo(null); 
        setCouponCode(''); 
        setLoyaltyPointsRedeem('0'); 
        setRemarks('');
        setCheckoutModal(false);
        setConfirmPayload(null);
        fetchRecentInvoices();
        // Open print prompt dialog
        setShowPrintPromptModal(true);
      } catch (err) {
        alert(err.response?.data?.error || 'Checkout failed');
      }
    } else {
      try {
        await queueSaleLocal(confirmPayload);
        alert('Checkout saved offline! Sync when reconnected.');
        updateOfflineCount();
        setCart([]); 
        setSelectedCustomer(null); 
        setCustomerSearchInput(''); 
        setCouponInfo(null); 
        setCouponCode(''); 
        setLoyaltyPointsRedeem('0'); 
        setRemarks('');
        setCheckoutModal(false);
        setConfirmPayload(null);
      } catch (err) {
        alert('Failed to cache checkout');
      }
    }
  };
  // F-Key actions mapping
  const triggerCashQuick = () => {
    if (cart.length === 0) return alert('Add products to the cart first');
    const pay = { customerId: selectedCustomer ? selectedCustomer.id : null, items: cart.map(i => ({ productId: i.id, qty: i.qty, price: i.price, discount: (i.discount + i.addDisc)/i.qty, batchId: i.batchId })), payments: [{ mode: 'CASH', amount: grandTotal }], shippingCharges: addChargesPaise, loyaltyPointsToRedeem: pointsToRedeem, couponCode: couponInfo?.code || null };
    executeCheckout(pay);
  };
  const triggerUpiQuick = () => {
    if (cart.length === 0) return alert('Add products to the cart first');
    const pay = { customerId: selectedCustomer ? selectedCustomer.id : null, items: cart.map(i => ({ productId: i.id, qty: i.qty, price: i.price, discount: (i.discount + i.addDisc)/i.qty, batchId: i.batchId })), payments: [{ mode: 'UPI', amount: grandTotal }], shippingCharges: addChargesPaise, loyaltyPointsToRedeem: pointsToRedeem, couponCode: couponInfo?.code || null };
    executeCheckout(pay);
  };
  const triggerCardQuick = () => {
    if (cart.length === 0) return alert('Add products to the cart first');
    const pay = { customerId: selectedCustomer ? selectedCustomer.id : null, items: cart.map(i => ({ productId: i.id, qty: i.qty, price: i.price, discount: (i.discount + i.addDisc)/i.qty, batchId: i.batchId })), payments: [{ mode: 'CARD', amount: grandTotal }], shippingCharges: addChargesPaise, loyaltyPointsToRedeem: pointsToRedeem, couponCode: couponInfo?.code || null };
    executeCheckout(pay);
  };
  const triggerPayLater = () => {
    if (cart.length === 0) return alert('Add products to the cart first');
    if (!selectedCustomer) return alert('Select customer profile to record outstanding credit debt');
    const pay = { customerId: selectedCustomer.id, items: cart.map(i => ({ productId: i.id, qty: i.qty, price: i.price, discount: (i.discount + i.addDisc)/i.qty, batchId: i.batchId })), payments: [{ mode: 'CREDIT', amount: grandTotal }], shippingCharges: addChargesPaise, loyaltyPointsToRedeem: pointsToRedeem, couponCode: couponInfo?.code || null };
    executeCheckout(pay);
  };
  const triggerCashPrint = () => { triggerCashQuick(); setTimeout(() => window.print(), 1000); };
  const triggerCardPrint = () => { triggerCardQuick(); setTimeout(() => window.print(), 1000); };
  const triggerUpiPrint = () => { triggerUpiQuick(); setTimeout(() => window.print(), 1000); };
  const triggerHoldPrint = () => { handleHoldBill(); };
  const triggerMultiplePay = () => { setPayments([{ mode: 'CASH', amount: grandTotal }]); setCheckoutModal(true); };
  const handleValidateCoupon = async () => {
    if (!couponCode) return;
    try {
      const res = await axios.get('/api/coupons');
      const coupon = res.data.find(c => c.code.toUpperCase() === couponCode.toUpperCase());
      if (coupon) {
        setCouponInfo(coupon);
        alert('Coupon applied!');
      } else {
        alert('Invalid or expired coupon');
        setCouponInfo(null);
      }
    } catch (err) {
      alert('Failed to validate coupon');
    }
  };
  const addBatchToCart = (product, batch) => {
    const existingIdx = cart.findIndex(item => item.id === product.id && item.batchId === batch.id);
    if (existingIdx !== -1) {
      const updated = [...cart];
      updated[existingIdx].qty += 1;
      setCart(updated);
    } else {
      setCart([...cart, {
        id: product.id,
        name: product.name,
        itemCode: product.itemCode,
        qty: 1,
        price: batch.sellingPrice,
        mrp: batch.mrp,
        unit: product.netWeightUnit || 'Pcs',
        discount: 0,
        addDisc: 0,
        purchasePrice: batch.purchasePrice,
        salesTaxPct: product.salesTaxPct,
        batchId: batch.id,
        batchNumber: batch.batchNumber
      }]);
    }
    setShowBatchSelector(false);
    setBatchSelectorProduct(null);
    setSmartProductInput('');
    setProductSuggestions([]);
    productInputRef.current?.focus();
  };
  const handleHoldBill = () => {
    if (cart.length === 0) return;
    setHeldBills([...heldBills, { id: Date.now(), cart, customer: selectedCustomer, searchVal: customerSearchInput }]);
    setCart([]); setSelectedCustomer(null); setCustomerSearchInput('');
    alert('Bill parked successfully!');
  };
  const handleResumeBill = (hb) => {
    setCart(hb.cart);
    setSelectedCustomer(hb.customer);
    setCustomerSearchInput(hb.searchVal);
    setHeldBills(heldBills.filter(b => b.id !== hb.id));
  };
  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
          <h2 className="text-3xl font-black text-indigo-400 font-sans text-center">POS Terminal</h2>
          {authError && <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 rounded text-xs">{authError}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Cashier Username</label>
              <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-lg text-slate-100 placeholder-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-lg text-slate-100 placeholder-slate-500" />
            </div>
            <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors">Start Terminal</button>
          </form>
        </div>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 text-slate-800 h-full overflow-hidden font-sans">
      {/* POS Top Bar */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <span
            className={`font-extrabold text-indigo-600 ${operator && operator.role === 'ADMIN' ? 'cursor-pointer hover:underline' : ''}`}
            onClick={() => {
              if (operator && operator.role === 'ADMIN') {
                const adminUrl = window.location.origin.replace('-pos', '-admin').replace('3001', '3000');
                window.location.href = adminUrl;
              }
            }}
            title={operator && operator.role === 'ADMIN' ? "Go to Admin Dashboard" : ""}
          >
            NM POS DESK
          </span>
          {/* Radio toggle walkin vs delivery */}
          <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" checked={deliveryType === 'Walk In'} onChange={() => setDeliveryType('Walk In')} className="text-indigo-600 focus:ring-0" />
              <span>Walk In</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" checked={deliveryType === 'Delivery'} onChange={() => setDeliveryType('Delivery')} className="text-indigo-600 focus:ring-0" />
              <span>Delivery</span>
            </label>
          </div>
          {/* Salesman Dropdown */}
          <select
            value={salesman}
            onChange={e => setSalesman(e.target.value)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-600 focus:outline-none"
          >
            <option value="Default Salesman">Default Salesman</option>
            <option value="John Doe">John Doe</option>
            <option value="Jane Smith">Jane Smith</option>
          </select>
        </div>
        <div className="flex items-center gap-4">
          <a href="#" className="text-xs text-indigo-600 hover:underline">Support Desk</a>
          <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${online ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
            {online ? <Wifi size={10} /> : <WifiOff size={10} />}
            {online ? 'Online' : 'Offline'}
          </div>
          {offlineCount > 0 && <span className="px-2 py-0.5 bg-amber-600 text-white rounded text-[10px] font-black">{offlineCount} Sync Queued</span>}
          {shift && <button onClick={handleCloseShift} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded border border-slate-200">Reconcile Cash</button>}
        </div>
      </header>
      {/* Row 2: Search inputs & Customer selectors */}
      <div className="p-4 bg-white border-b border-slate-200 grid grid-cols-3 gap-4 shrink-0 shadow-sm">
        {/* Field 1: Single Smart Search / Barcode Input */}
        <div className="relative">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Scan Barcode / Enter Product Name</label>
          <input
            ref={productInputRef}
            type="text"
            value={smartProductInput}
            onChange={e => handleProductInputChange(e.target.value)}
            onKeyDown={handleProductInputKeyDown}
            placeholder="Scan barcode or type name..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-500"
          />
          {productSuggestions.length > 0 && (
            <div className="absolute top-14 left-0 right-0 z-20 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
              {productSuggestions.map(p => (
                <div
                  key={p.id}
                  onClick={() => {
                    if (p.isSpecialQuickAdd) {
                      setQuickAddBarcode(p.itemCode);
                      setQuickAddName('');
                      setQuickAddCategory('');
                      setQuickAddBrand('');
                      setQuickAddMrp('');
                      setQuickAddPurchase('');
                      setQuickAddSelling('');
                      setQuickAddQty('100');
                      setShowQuickAddModal(true);
                      setProductSuggestions([]);
                    } else if (p.selectedBatch) {
                      addBatchToCart(p, p.selectedBatch);
                    } else {
                      addToCart(p);
                    }
                  }}
                  className={`p-2.5 border-b border-slate-100 cursor-pointer flex justify-between text-xs animate-fade-in ${p.isSpecialQuickAdd ? 'bg-indigo-50 hover:bg-indigo-100' : 'hover:bg-slate-50'}`}
                >
                  {p.isSpecialQuickAdd ? (
                    <div className="flex-1 flex items-center justify-between py-1">
                      <span className="font-extrabold text-indigo-700 text-xs">{p.name}</span>
                      <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[9px] font-black uppercase">Quick Add</span>
                    </div>
                  ) : (
                    <>
                      <span className="font-semibold text-slate-700">{p.displayName}</span>
                      <span className="text-slate-400 font-bold">Stock: {p.displayQty}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Field 2: Customer Selector with Inline Quick-Add */}
        <div className="relative">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Customer Selector</label>
          <div className="relative flex items-center w-full">
            <input
              type="text"
              value={customerSearchInput}
              onChange={e => handleCustomerSearchChange(e.target.value)}
              onFocus={() => setShowCustomerDropdown(true)}
              onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
              placeholder="Search phone number..."
              className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-500 font-semibold"
            />
            {selectedCustomer && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerSearchInput("");
                  setCustomerSuggestions([]);
                }}
                className="absolute right-2.5 text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ×
              </button>
            )}
          </div>
          {showCustomerDropdown && customerSuggestions.length > 0 && (
            <div className="absolute top-14 left-0 right-0 z-20 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden text-xs">
              {customerSuggestions.map(c => (
                <div
                  key={c.id}
                  onClick={() => handleSelectCustomer(c)}
                  className="p-2.5 hover:bg-slate-50 border-b border-slate-100 cursor-pointer flex justify-between"
                >
                  <span className="font-semibold text-slate-700">{c.name}</span>
                  <span className="text-slate-400 font-mono">{c.phone}</span>
                </div>
              ))}
              {/* Inline Quick Add block */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase">No Profile Found. Quick Register inline:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter customer name..."
                    value={inlineCustName}
                    onChange={e => setInlineCustName(e.target.value)}
                    className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleInlineCustomerAdd}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold shrink-0 shadow-sm"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Field 3: Scan Sales Invoice */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Scan Sales Invoice</label>
          <input
            type="text"
            value={scanInvoiceInput}
            onChange={e => setScanInvoiceInput(e.target.value)}
            onKeyDown={handleScanInvoiceKeyDown}
            placeholder="Scan invoice number & Enter..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-750 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>
      {/* Cart & Panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Cart Table */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 bg-slate-50/50 sticky top-0 font-bold">
                    <th className="p-3 text-center w-12">#</th>
                    <th className="p-3 w-32">Itemcode</th>
                    <th className="p-3">Product</th>
                    <th className="p-3 text-center w-20">Qty</th>
                    <th className="p-3 text-right w-24">MRP</th>
                    <th className="p-3 text-center w-16">Unit</th>
                    <th className="p-3 text-center w-20">Discount (₹)</th>
                    <th className="p-3 text-center w-20">Add Disc (₹)</th>
                    <th className="p-3 text-right w-24">Unit Cost</th>
                    <th className="p-3 text-right w-28">Net Amount</th>
                    <th className="p-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center p-12 text-slate-400">Cart is empty. Scan an item or search above.</td>
                    </tr>
                  ) : (
                    cart.map((item, idx) => {
                      const netVal = (item.price - item.discount - item.addDisc) * item.qty;
                      return (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/20 text-xs">
                          <td className="p-3 text-center text-slate-400 font-semibold">{idx + 1}</td>
                          <td className="p-3 font-mono text-slate-500">{item.itemCode}</td>
                          <td className="p-3 font-semibold text-slate-700">{item.name}</td>
                          <td className="p-3">
                            <input
                              type="number"
                              value={item.qty}
                              onChange={e => updateQty(idx, e.target.value)}
                              className="w-14 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-center text-slate-700 text-xs font-semibold"
                            />
                          </td>
                          <td className="p-3 text-right text-slate-500">₹{(item.mrp / 100).toFixed(2)}</td>
                          <td className="p-3 text-center text-slate-500">{item.unit}</td>
                          <td className="p-3">
                            <input
                              type="number"
                              step="0.01"
                              value={item.discount / 100}
                              onChange={e => updateDiscount(idx, e.target.value)}
                              className="w-16 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-center text-rose-500 text-xs font-semibold"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              step="0.01"
                              value={item.addDisc / 100}
                              onChange={e => updateAddDisc(idx, e.target.value)}
                              className="w-16 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-center text-rose-500 text-xs font-semibold"
                            />
                          </td>
                          <td className="p-3 text-right text-slate-400">₹{(item.purchasePrice / 100).toFixed(2)}</td>
                          <td className="p-3 text-right font-bold text-indigo-600">₹{(netVal / 100).toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <button onClick={() => removeItem(idx)} className="text-rose-500 hover:text-rose-600"><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* Right Side Action Panel & Customer Profile Card */}
        <div className="w-80 bg-white border-l border-slate-200 p-4 flex flex-col justify-between shrink-0 shadow-sm space-y-4 font-sans">
          <div className="space-y-4">
            {/* Highlight Last Billed Bill */}
            {lastBilledInvoice && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex justify-between items-center text-xs">
                <div
                  className="cursor-pointer hover:underline flex-1"
                  onClick={() => {
                    setRefundInvoice(lastBilledInvoice);
                    const qtys = {};
                    lastBilledInvoice.items.forEach(item => {
                      qtys[item.product.id] = 0;
                    });
                    setRefundQuantities(qtys);
                    setShowRefundModal(true);
                  }}
                >
                  <span className="text-[9px] uppercase tracking-wider text-indigo-500 font-black block">Last Billed (Click to Refund)</span>
                  <strong className="text-slate-800 text-xs font-mono">{lastBilledInvoice.invoiceNumber}</strong>
                </div>
                <button
                  onClick={() => setInvoiceResponse(lastBilledInvoice)}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded-lg shadow-sm shrink-0"
                >
                  Print Last
                </button>
              </div>
            )}
            {/* Tab selector */}
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setRightPanelTab('billing')}
                className={`py-1.5 text-xs font-black rounded-lg transition-all ${rightPanelTab === 'billing' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
              >
                Billing Desk
              </button>
              <button
                type="button"
                onClick={() => setRightPanelTab('history')}
                className={`py-1.5 text-xs font-black rounded-lg transition-all ${rightPanelTab === 'history' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
              >
                Holds & History
              </button>
            </div>
            {rightPanelTab === 'billing' ? (
              <div className="space-y-4">
                {/* Customer Details Card */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Customer Details</span>
                  {selectedCustomer ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-650 text-sm">
                          C
                        </div>
                        <div className="flex-1">
                          <strong className="text-xs text-slate-700 block">{selectedCustomer.name}</strong>
                          <span className="text-[10px] text-slate-450 font-mono block">{selectedCustomer.phone}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-semibold border-t border-slate-200 pt-2">
                        <div>
                          <span>Points:</span>
                          <strong className="text-slate-800 ml-1">{selectedCustomer.loyaltyPoints}</strong>
                        </div>
                        <div>
                          <span>Credit Due:</span>
                          <strong className="text-rose-600 ml-1">₹{(selectedCustomer.openingBalance / 100).toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 text-center py-2">No customer profile linked. Proceeding as Walk-In customer checkout.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <button onClick={handleHoldBill} className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 text-xs font-bold text-slate-750 transition-colors">Hold Bill</button>
                  <button onClick={triggerMultiplePay} className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 text-xs font-bold text-indigo-750 transition-colors">Payments</button>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                    <span className="text-[10px] font-bold text-slate-400">Redeem Loyalty Pts</span>
                    <input
                      type="number"
                      value={loyaltyPointsRedeem}
                      onChange={e => setLoyaltyPointsRedeem(e.target.value)}
                      className="w-20 px-2 py-0.5 bg-white border border-slate-200 rounded text-center text-slate-700 text-xs font-bold"
                    />
                  </div>
                  <button onClick={() => setCheckoutModal(true)} className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 text-xs font-bold text-slate-700 transition-colors">Add Payment</button>
                  <button onClick={() => setShowShiftModal(true)} className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 text-xs font-bold text-slate-700 transition-colors">Cash Control</button>
                </div>
              </div>
            ) : (
              /* Recent Orders & Suspended Bills */
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 block">Suspended / Held Bills</span>
                  {heldBills.length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-2 bg-slate-50 border border-dashed rounded-lg">No suspended bills</p>
                  ) : (
                    <div className="space-y-1.5">
                      {heldBills.map((hb, idx) => (
                        <div key={idx} className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-xs">
                          <div>
                            <strong className="text-[10px] block text-slate-655">Suspended #{idx+1}</strong>
                            <span className="text-[9px] text-slate-400">{hb.cart.length} items | ₹{(hb.grandTotal/100).toFixed(2)}</span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setCart(hb.cart);
                                setSelectedCustomer(hb.customer);
                                setHeldBills(heldBills.filter((_, i) => i !== idx));
                              }}
                              className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded text-[9px] text-indigo-700 font-bold"
                            >
                              Load
                            </button>
                            <button
                              type="button"
                              onClick={() => setHeldBills(heldBills.filter((_, i) => i !== idx))}
                              className="px-2 py-0.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded text-[9px] text-rose-650"
                            >
                              X
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 block">Recent Orders (Print Last Bill)</span>
                  {recentInvoices.length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-2 bg-slate-50 border border-dashed rounded-lg">No recent sales</p>
                  ) : (
                    <div className="space-y-2">
                      {recentInvoices.map(inv => (
                        <div key={inv.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-xs">
                          <div
                            className="flex-1 cursor-pointer hover:underline"
                            onClick={() => {
                              setRefundInvoice(inv);
                              const qtys = {};
                              inv.items.forEach(item => {
                                qtys[item.product.id] = 0;
                              });
                              setRefundQuantities(qtys);
                              setShowRefundModal(true);
                            }}
                          >
                            <strong className="text-[10px] font-mono text-slate-700 block">{inv.invoiceNumber}</strong>
                            <span className="text-[9px] text-indigo-650 font-bold block">Total: ₹{(inv.grandTotal / 100).toFixed(2)} (Refund)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setInvoiceResponse(inv)}
                            className="p-1 hover:bg-slate-200 border border-slate-355 rounded text-slate-650 shrink-0"
                            title="Reprint Receipt"
                          >
                            <Printer size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Bottom Remarks Input & Summary Totals Panel */}
      <div className="bg-white border-t border-slate-350 p-6 shrink-0 shadow-lg space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Remarks input */}
          <div className="flex-1 min-w-[250px] flex flex-col justify-center">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wide mb-1.5">Remarks / Billing Notes</label>
            <textarea
              rows={2}
              placeholder="Enter special invoice instructions or customer remarks..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>
          {/* Summary Totals Grid (Big Font, High Visibility) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-4 bg-slate-50 border border-slate-200 p-5 rounded-2xl shrink-0 shadow-sm items-center flex-1">
            <div className="flex flex-col p-2 bg-white rounded-lg border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quantity</span>
              <strong className="text-lg font-black text-slate-800 mt-1">{totalQty} units</strong>
            </div>
            <div className="flex flex-col p-2 bg-white rounded-lg border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MRP Total</span>
              <strong className="text-lg font-black text-slate-800 mt-1">₹{(totalMrp / 100).toFixed(2)}</strong>
            </div>
            <div className="flex flex-col p-2 bg-white rounded-lg border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tax Amount</span>
              <strong className="text-lg font-black text-slate-800 mt-1">₹{(taxAmount / 100).toFixed(2)}</strong>
            </div>
            <div className="flex flex-col p-2 bg-white rounded-lg border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Add Charges</span>
              <input
                type="number"
                value={additionalCharges}
                onChange={e => setDeliveryCharges(e.target.value)}
                className="w-full mt-1 px-2 py-0.5 bg-slate-50 border border-slate-300 rounded text-center text-sm font-black text-slate-700 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex flex-col p-2 bg-white rounded-lg border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Discount</span>
              <strong className="text-lg font-black text-rose-500 mt-1">-₹{(totalDiscount / 100).toFixed(2)}</strong>
            </div>
            <div className="flex flex-col p-2 bg-white rounded-lg border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Flat Disc %</span>
              <strong className="text-lg font-black text-rose-500 mt-1">{couponInfo ? `${couponInfo.discountValue}%` : '0%'}</strong>
            </div>
            <div className="flex flex-col p-2 bg-white rounded-lg border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Round Off</span>
              <strong className="text-lg font-black text-slate-850 mt-1">₹0.00</strong>
            </div>
            {/* Earn Loyalty Toggle */}
            <div className="flex flex-col items-center justify-center p-1 bg-white rounded-lg border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Earn Loyalty</span>
              <label className="flex items-center mt-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={earnLoyaltyToggle}
                  onChange={e => setEarnLoyaltyToggle(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0 h-4 w-4"
                />
              </label>
            </div>
          </div>
          {/* Giant Payable Amount Card */}
          <div className="bg-indigo-600 border-2 border-indigo-400 px-6 py-5 rounded-2xl flex flex-col justify-center items-center text-white shadow-md shrink-0 w-64 text-center">
            <span className="text-xs uppercase tracking-widest font-black text-indigo-200">Payable Amount</span>
            <strong className="text-3xl font-black mt-1">₹{(grandTotal / 100).toFixed(2)}</strong>
          </div>
        </div>
      </div>
      {/* Bottom Payment Button Grid - 3 Rows x 4 Columns (Large hardware style) */}
      <div className="p-4 bg-slate-200 border-t border-slate-300 shrink-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-bold text-center">
        {/* Row 1 */}
        <button
          onClick={triggerMultiplePay}
          className="py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all flex flex-col justify-center items-center gap-0.5"
        >
          <span className="text-sm font-black">Multiple Pay (F12)</span>
          <span className="text-[9px] text-indigo-200 font-medium">Split cash/card/UPI</span>
        </button>
        <button
          onClick={triggerPayLater}
          className="py-4 bg-slate-700 hover:bg-slate-800 text-white rounded-xl shadow-md transition-all flex flex-col justify-center items-center gap-0.5"
        >
          <span className="text-sm font-black">Redeem Credit</span>
          <span className="text-[9px] text-slate-300 font-medium">Deduct ledger limit</span>
        </button>
        <button
          onClick={handleHoldBill}
          className="py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md transition-all flex flex-col justify-center items-center gap-0.5"
        >
          <span className="text-sm font-black">Hold Bill (F6)</span>
          <span className="text-[9px] text-amber-100 font-medium">Park invoice active state</span>
        </button>
        {/* Coupon Input Block in Grid */}
        <div className="flex border border-slate-300 rounded-xl bg-white overflow-hidden shadow-md">
          <div className="flex-1 flex flex-col justify-center px-3">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-left">Coupon Discount Code</span>
            <input
              type="text"
              placeholder="ENTER CODE"
              value={couponCode}
              onChange={e => setCouponCode(e.target.value)}
              className="w-full text-sm uppercase border-0 focus:ring-0 bg-transparent text-left font-black text-slate-850 p-0"
            />
          </div>
          <button
            onClick={handleValidateCoupon}
            className="px-4 bg-slate-100 border-l border-slate-200 hover:bg-slate-200 text-xs font-black text-slate-700 uppercase"
          >
            Apply
          </button>
        </div>
        {/* Row 2 */}
        <button
          onClick={triggerUpiQuick}
          className="py-4 bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-md transition-all flex flex-col justify-center items-center gap-0.5"
        >
          <span className="text-sm font-black">UPI (F5)</span>
          <span className="text-[9px] text-sky-100 font-medium">GooglePay, PhonePe, Paytm</span>
        </button>
        <button
          onClick={triggerCardQuick}
          className="py-4 bg-sky-550 hover:bg-sky-600 bg-sky-600 text-white rounded-xl shadow-md transition-all flex flex-col justify-center items-center gap-0.5"
        >
          <span className="text-sm font-black">Card (F3)</span>
          <span className="text-[9px] text-sky-100 font-medium">Visa, Mastercard terminal</span>
        </button>
        <button
          onClick={triggerCashQuick}
          className="py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all flex flex-col justify-center items-center gap-0.5"
        >
          <span className="text-sm font-black">Cash (F4)</span>
          <span className="text-[9px] text-emerald-100 font-medium">Fast cash register checkout</span>
        </button>
        <button
          onClick={triggerPayLater}
          className="py-4 bg-slate-700 hover:bg-slate-800 text-white rounded-xl shadow-md transition-all flex flex-col justify-center items-center gap-0.5"
        >
          <span className="text-sm font-black">Pay Later (F11)</span>
          <span className="text-[9px] text-slate-300 font-medium">Book as store credit account</span>
        </button>
        {/* Row 3 */}
        <button
          onClick={triggerHoldPrint}
          className="py-4 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl shadow-md transition-all flex flex-col justify-center items-center gap-0.5"
        >
          <span className="text-sm font-black">Hold & Print (F7)</span>
          <span className="text-[9px] text-amber-600 font-medium">Park invoice and print receipt</span>
        </button>
        <button
          onClick={triggerUpiPrint}
          className="py-4 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-xl shadow-md transition-all flex flex-col justify-center items-center gap-0.5"
        >
          <span className="text-sm font-black">UPI & Print (F10)</span>
          <span className="text-[9px] text-sky-600 font-medium">UPI QR scan + printed receipt</span>
        </button>
        <button
          onClick={triggerCardPrint}
          className="py-4 bg-sky-50 hover:bg-sky-100 text-sky-850 border border-sky-300 rounded-xl shadow-md transition-all flex flex-col justify-center items-center gap-0.5"
        >
          <span className="text-sm font-black">Card & Print (F9)</span>
          <span className="text-[9px] text-sky-600 font-medium">Swipe card + print POS receipt</span>
        </button>
        <button
          onClick={triggerCashPrint}
          className="py-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl shadow-md transition-all flex flex-col justify-center items-center gap-0.5"
        >
          <span className="text-sm font-black">Cash & Print (F8)</span>
          <span className="text-[9px] text-emerald-600 font-medium">Drawer open + print POS receipt</span>
        </button>
      </div>
      {/* Return / Refund Modal */}
      {showRefundModal && refundInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-slate-700">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-rose-50">
              <h3 className="font-extrabold text-rose-800 text-sm">Return Items: {refundInvoice.invoiceNumber}</h3>
              <button onClick={() => { setShowRefundModal(false); setRefundInvoice(null); }} className="text-slate-450 hover:text-slate-650"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="flex justify-between text-xs text-slate-500 font-semibold">
                <span>Customer: <strong className="text-slate-800">{refundInvoice.customer?.name}</strong></span>
                <span>Date: <strong className="text-slate-800">{new Date(refundInvoice.createdAt).toLocaleString()}</strong></span>
              </div>
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 bg-slate-50/50 font-bold">
                    <th className="p-3">Product Name</th>
                    <th className="p-3 text-center">Billed Qty</th>
                    <th className="p-3 text-right">Sale Price</th>
                    <th className="p-3 text-center w-28">Return Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {refundInvoice.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-700">{item.product?.name}</td>
                      <td className="p-3 text-center font-bold">{item.quantity}</td>
                      <td className="p-3 text-right">₹{(item.price / 100).toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={refundQuantities[item.product?.id] || 0}
                          onChange={e => {
                            const val = Math.min(item.quantity, Math.max(0, parseInt(e.target.value || 0)));
                            setRefundQuantities({ ...refundQuantities, [item.product.id]: val });
                          }}
                          className="w-16 px-2 py-0.5 bg-slate-50 border border-slate-350 rounded text-center font-bold text-rose-600 focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <button
                type="button"
                onClick={() => { setShowRefundModal(false); setRefundInvoice(null); }}
                className="px-4 py-2 bg-slate-100 text-slate-500 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessRefund}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-black shadow-md"
              >
                Process Refund & Return
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 1. Confirm Checkout Modal */}
      {showConfirmModal && confirmPayload && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur flex items-center justify-center p-4 font-sans text-slate-700">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl p-6 text-center space-y-4">
            <h3 className="text-lg font-black text-slate-800">Confirm Order Checkout?</h3>
            <p className="text-xs text-slate-450">Are you sure you want to finalize this transaction receipt billing?</p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowConfirmModal(false); setConfirmPayload(null); }}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-xs font-bold"
              >
                No, Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmedCheckout}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-600 text-white rounded-xl text-xs font-black shadow-md"
              >
                Yes, Checkout
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 2. Post-Checkout Print Receipt Prompt Modal */}
      {showPrintPromptModal && lastBilledInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur flex items-center justify-center p-4 font-sans text-slate-700">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl p-6 text-center space-y-4">
            <h3 className="text-lg font-black text-slate-800">Checkout Complete!</h3>
            <p className="text-xs text-slate-450">Invoice {lastBilledInvoice.invoiceNumber} billed successfully. Would you like to print the receipt now?</p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPrintPromptModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-xs font-bold"
              >
                No, Skip Print
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPrintPromptModal(false);
                  setInvoiceResponse(lastBilledInvoice);
                  setTimeout(() => window.print(), 100);
                }}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md"
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Quick Add Product Modal */}
      {showQuickAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-slate-700">
          <form onSubmit={handleSaveQuickProduct} className="w-full max-w-md bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-indigo-50">
              <h3 className="font-extrabold text-indigo-800 text-sm">Quick Add Product to Inventory</h3>
              <button type="button" onClick={() => setShowQuickAddModal(false)} className="text-slate-450 hover:text-slate-655"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Product Barcode</label>
                <input
                  type="text"
                  disabled
                  value={quickAddBarcode}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-mono text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Coca Cola 500ml"
                  value={quickAddName}
                  onChange={e => setQuickAddName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Beverages"
                    value={quickAddCategory}
                    onChange={e => setQuickAddCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Coca-Cola"
                    value={quickAddBrand}
                    onChange={e => setQuickAddBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">MRP (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={quickAddMrp}
                    onChange={e => setQuickAddMrp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Purchase (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={quickAddPurchase}
                    onChange={e => setQuickAddPurchase(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Selling (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={quickAddSelling}
                    onChange={e => setQuickAddSelling(e.target.value)}
                    className="w-full px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-center font-bold text-indigo-700"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Initial Stock Quantity</label>
                <input
                  type="number"
                  value={quickAddQty}
                  onChange={e => setQuickAddQty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center font-bold"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowQuickAddModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-500 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black shadow-md"
              >
                Save & Add to Cart
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Batch Selector Modal */}
      {showBatchSelector && batchSelectorProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800">Select Batch Price: {batchSelectorProduct.name}</h3>
              <button onClick={() => { setShowBatchSelector(false); setBatchSelectorProduct(null); }} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-slate-450">Select the batch corresponding to the price printed on the pack:</p>
              <div className="space-y-3">
                {batchSelectorProduct.batches.map(b => (
                  <div
                    key={b.id}
                    onClick={() => addBatchToCart(batchSelectorProduct, b)}
                    className="p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl cursor-pointer flex justify-between items-center transition-all shadow-sm"
                  >
                    <div>
                      <strong className="text-sm font-bold font-mono text-slate-800">{b.batchNumber}</strong>
                      <span className="text-[10px] text-slate-400 block">Exp: {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : 'No expiry'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">MRP: ₹{(b.mrp / 100).toFixed(2)}</span>
                      <strong className="text-base font-black text-indigo-700">₹{(b.sellingPrice / 100).toFixed(2)}</strong>
                      <span className="text-[10px] text-slate-450 block font-bold">Stock: {b.qtyOnHand} units</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 1. Add Cash Opening Shift Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-extrabold text-slate-800 text-lg">Cash Register: Open Shift</h3>
            <p className="text-xs text-slate-500">Input starting drawer float amount.</p>
            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Opening Cash Float (₹)</label>
                <input type="number" required value={openingCash} onChange={e => setOpeningCash(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-lg font-bold text-center" />
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors">Start Cash Session</button>
            </form>
          </div>
        </div>
      )}
      {/* 2. Split Payments Modal */}
      {checkoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800">Terminal Checkout Payment</h3>
              <button onClick={() => setCheckoutModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="text-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Total Payable</span>
                <p className="text-3xl font-black text-indigo-600 mt-1">₹{(grandTotal / 100).toFixed(2)}</p>
              </div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  {['CASH', 'CARD', 'UPI', 'CREDIT'].map(m => (
                    <button
                      key={m}
                      onClick={() => setPayments([{ mode: m, amount: grandTotal }])}
                      className={`flex-1 py-2 text-xs font-bold rounded border transition-colors ${payments[0]?.mode === m ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                {payments[0]?.mode === 'CASH' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Cash Tendered (₹)</label>
                      <input
                        type="number"
                        value={cashTendered}
                        onChange={e => setCashTendered(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-lg font-bold text-center focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    {parseFloat(cashTendered) > grandTotal/100 && (
                      <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-250 rounded-lg text-sm text-slate-700">
                        <span>Change Return:</span>
                        <span className="font-extrabold text-emerald-600 text-lg">₹{(parseFloat(cashTendered) - grandTotal/100).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  const pay = { customerId: selectedCustomer?.id, items: cart.map(i => ({ productId: i.id, qty: i.qty, price: i.price, discount: (i.discount + i.addDisc)/i.qty, batchId: i.batchId })), payments: payments.map(p => ({ mode: p.mode, amount: p.amount })), shippingCharges: addChargesPaise, loyaltyPointsToRedeem: pointsToRedeem, couponCode: couponInfo?.code || null };
                  executeCheckout(pay);
                }}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 font-extrabold text-white text-center rounded-xl transition-all shadow-sm"
              >
                Checkout & Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 3. Invoice receipt modal (HTML printable view) */}
      {invoiceResponse && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-sm bg-white text-slate-900 p-6 rounded-2xl shadow-2xl relative">
            <button
              onClick={() => setInvoiceResponse(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-750 font-bold print:hidden"
            >
              <X size={20} />
            </button>
            <div id="receipt-print-area" className="space-y-4 font-mono text-xs">
              <div className="text-center">
                <h3 className="font-black text-sm uppercase">NM Supermarket</h3>
                <p>123 Main Bazaar Road</p>
                <p>GSTIN: 33AAAAA1111A1Z1</p>
                <p>Ph: 9999999999</p>
              </div>
              <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1 text-[10px] text-slate-700">
                <p>Invoice: {invoiceResponse.invoiceNumber}</p>
                <p>Date: {new Date(invoiceResponse.createdAt).toLocaleString()}</p>
                <p>Customer: {invoiceResponse.customer ? `${invoiceResponse.customer.name} (${invoiceResponse.customer.phone})` : "Walk-In Customer"}</p>
                <p>Cashier: {invoiceResponse.staff?.name}</p>
              </div>
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-dashed border-slate-300 text-left text-slate-650">
                    <th className="pb-1">Item</th>
                    <th className="pb-1 text-center">Qty</th>
                    <th className="pb-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoiceResponse.items || invoiceResponse.invoiceItems)?.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-1">{it.product?.name || `Product ID: ${it.productId}`}</td>
                      <td className="py-1 text-center">{it.qty}</td>
                      <td className="py-1 text-right">₹{(it.netAmount / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-[10px] text-right">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{(invoiceResponse.subtotal / 100).toFixed(2)}</span>
                </div>
                {invoiceResponse.discount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount Deducted</span>
                    <span>-₹{(invoiceResponse.discount / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs border-t border-dashed border-slate-300 pt-1">
                  <span>Grand Total</span>
                  <span>₹{(invoiceResponse.grandTotal / 100).toFixed(2)}</span>
                </div>
              </div>
              {/* GST Tax splits */}
              <div className="border-t border-dashed border-slate-300 pt-2 text-[8px] space-y-1">
                <p className="font-bold">GST Tax Summary:</p>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-dashed border-slate-200">
                      <th>Slab</th>
                      <th>Taxable</th>
                      <th>CGST</th>
                      <th>SGST</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Intra-GST</td>
                      <td>₹{((invoiceResponse.grandTotal - invoiceResponse.taxAmount) / 100).toFixed(2)}</td>
                      <td>₹{((invoiceResponse.taxAmount / 2) / 100).toFixed(2)}</td>
                      <td>₹{((invoiceResponse.taxAmount / 2) / 100).toFixed(2)}</td>
                      <td>₹{(invoiceResponse.taxAmount / 100).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* Loyalty summary */}
              <div className="border border-slate-250 pt-2 text-[9px] space-y-1 text-center bg-slate-50 p-2 rounded">
                <p className="font-bold text-amber-800">LOYALTY SUMMARY</p>
                <p>Earned: +{invoiceResponse.loyaltyPointsEarned} pts | Redeemed: -{invoiceResponse.loyaltyPointsRedeemed} pts</p>
                <p>Current Loyalty Balance: {invoiceResponse.customer ? invoiceResponse.customer.loyaltyPoints : 0} points</p>
              </div>
              <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[9px] space-y-1 text-slate-500">
                <p className="font-bold">Thank You for Shopping!</p>
                <p>T&C: Goods once sold cannot be returned.</p>
                <p>Delivery Desk: Ph 9999999999</p>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="mt-6 w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 print:hidden"
            >
              <Printer size={14} />
              Print Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
