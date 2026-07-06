import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { Search, Plus, Trash2, RotateCcw, Edit, X, Save, Settings, FileSpreadsheet, Download, Upload, ArrowLeft, PlusCircle } from 'lucide-react';

function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [masters, setMasters] = useState(null);
  
  // View states: 'list', 'details' (tabbed view)
  const [viewMode, setViewMode] = useState('list'); 
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'pricing', 'barcodes', 'ledger'
  
  // General Details Form
  const [autoBarcode, setAutoBarcode] = useState(true);
  const [itemCode, setItemCode] = useState('');
  const [name, setName] = useState('');
  const [printName, setPrintName] = useState('');
  const [isPrintNameCustom, setIsPrintNameCustom] = useState(false);
  
  // Creatable Masters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [newSubCategoryName, setNewSubCategoryName] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [selectedSubBrand, setSelectedSubBrand] = useState('');
  const [newSubBrandName, setNewSubBrandName] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [subBrand, setSubBrand] = useState('');
  const [unit, setUnit] = useState('PCS');
  const [hsnCode, setHsnCode] = useState('');
  const [purchaseTaxPct, setPurchaseTaxPct] = useState('18');
  const [purchaseTaxInclusive, setPurchaseTaxInclusive] = useState(true);
  const [salesTaxPct, setSalesTaxPct] = useState('18');
  const [salesTaxInclusive, setSalesTaxInclusive] = useState(true);
  const [cessPct, setCessPct] = useState('0');
  const [manageBatch, setManageBatch] = useState(false);
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [nutritionInfo, setNutritionInfo] = useState('');
  const [netWeightUnit, setNetWeightUnit] = useState('g');
  const [netWeight, setNetWeight] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  // Main Pricing & Stock Fields (for product creation)
  const [purchasePrice, setPurchasePrice] = useState('0.00');
  const [landingCost, setLandingCost] = useState('0.00');
  const [mrp, setMrp] = useState('0.00');
  const [sellingDiscount, setSellingDiscount] = useState('0.00');
  const [sellingPrice, setSellingPrice] = useState('0.00');
  const [sellingMargin, setSellingMargin] = useState('0.00');
  const [minOrderQty, setMinOrderQty] = useState('1');
  const [openingQty, setOpeningQty] = useState('0');

  // Multi Barcode Tab State
  const [newSecondaryBarcode, setNewSecondaryBarcode] = useState('');
  const [productVariants, setProductVariants] = useState([]);

  // Batch Details Tab State
  const [productBatches, setProductBatches] = useState([]);
  const [selectedBatchForEdit, setSelectedBatchForEdit] = useState(null);
  
  // New Batch Form State
  const [newBatchNumber, setNewBatchNumber] = useState('');
  const [newBatchExpiry, setNewBatchExpiry] = useState('');
  const [newBatchPurchase, setNewBatchPurchase] = useState('');
  const [newBatchMrp, setNewBatchMrp] = useState('');
  const [newBatchSelling, setNewBatchSelling] = useState('');
  const [newBatchQty, setNewBatchQty] = useState('');

  // Ledger Tab State
  const [stockLedgers, setStockLedgers] = useState([]);

  // Modals
  const [showOpeningStock, setShowOpeningStock] = useState(false);
  const [openingStockUpdates, setOpeningStockUpdates] = useState({});
  const fileInputRef = useRef(null);

  // Auto calculate margins and selling prices
  useEffect(() => {
    const mrpNum = parseFloat(mrp || 0);
    const discNum = parseFloat(sellingDiscount || 0);
    const purchaseNum = parseFloat(purchasePrice || 0);
    
    const calculatedSelling = mrpNum - discNum;
    setSellingPrice(calculatedSelling.toFixed(2));
    
    const calculatedMargin = calculatedSelling - purchaseNum;
    setSellingMargin(calculatedMargin.toFixed(2));
    
    if (parseFloat(landingCost || 0) === 0) {
      setLandingCost(purchaseNum.toFixed(2));
    }
  }, [mrp, sellingDiscount, purchasePrice]);
  
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/products', {
        params: { search, categoryId: categoryFilter, status: statusFilter }
      });
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchMasters = async () => {
    try {
      const res = await axios.get('/api/products/masters');
      setMasters(res.data);
    } catch (err) {
      console.error(err);
    }
  };
  
  useEffect(() => {
    fetchProducts();
    fetchMasters();
  }, [search, categoryFilter, statusFilter]);

  const handleProductNameChange = (val) => {
    setName(val);
    if (!isPrintNameCustom) {
      setPrintName(val);
    }
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setAutoBarcode(false);
    setItemCode(product.itemCode);
    setName(product.name);
    setPrintName(product.printName || product.name);
    setIsPrintNameCustom(true);
    setSelectedCategory(product.category?.name || '');
    setSelectedBrand(product.brand?.name || '');
    setUnit(product.unit || 'PCS');
    setHsnCode(product.hsnCode || '');
    setPurchaseTaxPct(product.purchaseTaxPct?.toString() || '18');
    setPurchaseTaxInclusive(product.purchaseTaxInclusive !== false);
    setSalesTaxPct(product.salesTaxPct?.toString() || '18');
    setSalesTaxInclusive(product.isTaxInclusive !== false);
    setCessPct(product.cessPct?.toString() || '0');
    setManageBatch(product.manageBatch === true);
    setShortDescription(product.shortDescription || '');
    setDescription(product.description || '');
    setIngredients(product.ingredients || '');
    setNutritionInfo(product.nutritionInfo || '');
    setNetWeightUnit(product.netWeightUnit || 'g');
    setNetWeight(product.netWeight?.toString() || '');
    setAdditionalInfo(product.additionalInfo || '');
    
    // Pricing
    setPurchasePrice((product.purchasePrice / 100).toFixed(2));
    setLandingCost((product.landingCost / 100).toFixed(2));
    setMrp((product.mrp / 100).toFixed(2));
    setSellingDiscount(((product.mrp - product.sellingPrice) / 100).toFixed(2));
    setSellingPrice((product.sellingPrice / 100).toFixed(2));
    setMinOrderQty(product.minOrderQty?.toString() || '1');
    setOpeningQty(product.qtyOnHand?.toString() || '0');

    // Variants / Multi Barcodes
    setProductVariants(product.variants || []);
    
    // Batches
    setProductBatches(product.batches || []);
    setSelectedBatchForEdit(null);

    // Ledger
    setStockLedgers(product.stockLedger || []);

    setActiveTab('details');
    setViewMode('details');
  };

  const handleAddNewClick = () => {
    setSelectedProduct(null);
    clearForm();
    setActiveTab('details');
    setViewMode('form');
  };

  const clearForm = () => {
    setAutoBarcode(true);
    setItemCode('');
    setName('');
    setPrintName('');
    setIsPrintNameCustom(false);
    setSelectedCategory('');
    setNewCategoryName('');
    setSelectedSubCategory('');
    setNewSubCategoryName('');
    setSelectedBrand('');
    setNewBrandName('');
    setSelectedSubBrand('');
    setNewSubBrandName('');
    setUnit('PCS');
    setHsnCode('');
    setPurchaseTaxPct('18');
    setPurchaseTaxInclusive(true);
    setSalesTaxPct('18');
    setSalesTaxInclusive(true);
    setCessPct('0');
    setManageBatch(false);
    setShortDescription('');
    setDescription('');
    setIngredients('');
    setNutritionInfo('');
    setNetWeightUnit('g');
    setNetWeight('');
    setAdditionalInfo('');
    setPurchasePrice('0.00');
    setLandingCost('0.00');
    setMrp('0.00');
    setSellingDiscount('0.00');
    setSellingPrice('0.00');
    setSellingMargin('0.00');
    setMinOrderQty('1');
    setOpeningQty('0');
  };

  const handleSaveProduct = async (e, keepOpen = false) => {
    if (e) e.preventDefault();
    try {
      const finalCat = selectedCategory === 'ADD_NEW' ? newCategoryName : selectedCategory;
      const finalBrand = selectedBrand === 'ADD_NEW' ? newBrandName : selectedBrand;
      
      if (!finalCat || !finalBrand) {
        return alert('Category and Brand are required!');
      }

      const payload = {
        name,
        printName: printName || name,
        itemCode: autoBarcode ? `BC-${Date.now()}` : itemCode,
        categoryId: finalCat,
        brandId: finalBrand,
        unit,
        hsnCode,
        purchaseTaxPct: parseFloat(purchaseTaxPct),
        purchaseTaxInclusive,
        salesTaxPct: parseFloat(salesTaxPct),
        isTaxInclusive: salesTaxInclusive,
        cessPct: parseFloat(cessPct),
        manageBatch,
        shortDescription,
        description,
        ingredients,
        nutritionInfo,
        netWeightUnit,
        netWeight: netWeight ? parseFloat(netWeight) : null,
        additionalInfo,
        purchasePrice: Math.round(parseFloat(purchasePrice) * 100),
        landingCost: Math.round(parseFloat(landingCost) * 100),
        mrp: Math.round(parseFloat(mrp) * 100),
        sellingPrice: Math.round(parseFloat(sellingPrice) * 100),
        minOrderQty: parseInt(minOrderQty),
        openingQty: parseInt(openingQty)
      };
      
      if (selectedProduct) {
        await axios.put(`/api/products/${selectedProduct.id}`, payload);
        alert('Product details updated successfully!');
      } else {
        await axios.post('/api/products', payload);
        alert('Product registered successfully!');
      }
      
      if (keepOpen) {
        clearForm();
      } else {
        setViewMode('list');
      }
      fetchProducts();
      fetchMasters();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save product');
    }
  };

  // Add Variant / Multi Barcode
  const handleAddSecondaryBarcode = async (e) => {
    e.preventDefault();
    if (!newSecondaryBarcode) return;
    try {
      const res = await axios.post(`/api/products/${selectedProduct.id}/variants`, {
        barcode: newSecondaryBarcode,
        name: `${selectedProduct.name} - Variant`
      });
      setProductVariants([...productVariants, res.data]);
      setNewSecondaryBarcode('');
      alert('Secondary barcode registered successfully!');
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to register barcode');
    }
  };

  // Delete Variant Barcode
  const handleDeleteVariantBarcode = async (vid) => {
    if (!confirm('Remove this barcode link?')) return;
    try {
      await axios.delete(`/api/products/${selectedProduct.id}/variants/${vid}`);
      setProductVariants(productVariants.filter(v => v.id !== vid));
      fetchProducts();
    } catch (err) {
      alert('Failed to remove barcode');
    }
  };

  // Pricing & Batches Actions in tabbed view
  const handleAddBatch = async (e) => {
    e.preventDefault();
    if (!newBatchNumber || !newBatchPurchase || !newBatchMrp || !newBatchSelling) return;
    try {
      const purchasePaise = Math.round(parseFloat(newBatchPurchase) * 100);
      const mrpPaise = Math.round(parseFloat(newBatchMrp) * 100);
      const sellingPaise = Math.round(parseFloat(newBatchSelling) * 100);
      
      const res = await axios.post(`/api/products/${selectedProduct.id}/batches`, {
        batchNumber: newBatchNumber,
        expiryDate: newBatchExpiry || null,
        purchasePrice: purchasePaise,
        mrp: mrpPaise,
        sellingPrice: sellingPaise,
        qtyOnHand: parseInt(newBatchQty || 0)
      });
      
      alert('New batch price registered successfully!');
      setNewBatchExpiry('');
      setProductBatches([...productBatches, res.data]);
      fetchProducts();
    } catch (err) {
      alert('Failed to register batch');
    }
  };

  const handleUpdateBatchQty = async (bId, bNo, bPurchase, bMrp, bSelling, bQty) => {
    try {
      const purchasePaise = Math.round(parseFloat(bPurchase) * 100);
      const mrpPaise = Math.round(parseFloat(bMrp) * 100);
      const sellingPaise = Math.round(parseFloat(bSelling) * 100);
      
      await axios.put(`/api/products/${selectedProduct.id}/batches/${bId}`, {
        batchNumber: bNo,
        purchasePrice: purchasePaise,
        mrp: mrpPaise,
        sellingPrice: sellingPaise,
        qtyOnHand: parseInt(bQty)
      });
      alert('Batch pricing updated!');
      // Refresh batches
      const res = await axios.get(`/api/products/${selectedProduct.id}/batches`);
      setProductBatches(res.data);
      setSelectedBatchForEdit(null);
      fetchProducts();
    } catch (err) {
      alert('Failed to update batch prices');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Are you sure you want to soft delete this product?')) return;
    try {
      await axios.delete(`/api/products/${id}`);
      fetchProducts();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const handleExportExcel = () => {
    const data = products.map(p => ({
      'Item Code': p.itemCode,
      'Product Name': p.name,
      'Print Name': p.printName,
      'Category': p.category?.name || '',
      'Brand': p.brand?.name || '',
      'MRP (Rs)': (p.mrp / 100).toFixed(2),
      'Selling Price (Rs)': (p.sellingPrice / 100).toFixed(2),
      'Purchase Price (Rs)': (p.purchasePrice / 100).toFixed(2),
      'GST (%)': p.salesTaxPct,
      'Quantity': p.qtyOnHand
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "product_catalog_export.xlsx");
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        
        const parsedProducts = json.map(row => ({
          itemCode: row['Item Code']?.toString() || row['item code']?.toString() || '',
          name: row['Product Name'] || row['product name'] || '',
          printName: row['Print Name'] || row['print name'] || '',
          categoryId: row['Category'] || row['category'] || '',
          brandId: row['Brand'] || row['brand'] || '',
          mrp: parseFloat(row['MRP (Rs)'] || row['mrp'] || 0),
          sellingPrice: parseFloat(row['Selling Price (Rs)'] || row['selling price'] || 0),
          purchasePrice: parseFloat(row['Purchase Price (Rs)'] || row['purchase price'] || 0),
          salesTaxPct: parseFloat(row['GST (%)'] || row['gst'] || 18),
          openingQty: parseInt(row['Quantity'] || row['quantity'] || 0)
        }));
        
        const res = await axios.post('/api/products/bulk', { products: parsedProducts });
        alert(`Successfully imported ${res.data.count} products from spreadsheet!`);
        fetchProducts();
        fetchMasters();
      } catch (err) {
        alert('Failed to process spreadsheet import.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen text-slate-700 font-sans p-2">
      
      {viewMode === 'list' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-800">Inventory Ledger</h2>
              <p className="text-sm text-slate-500">Configure catalog, manage barcodes, batches, and opening stock</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-semibold text-slate-700 shadow-sm transition-colors"
              >
                <Download size={16} />
                Export Excel
              </button>
              
              <div className="relative">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  ref={fileInputRef}
                  onChange={handleImportExcel}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-semibold text-slate-700 shadow-sm transition-colors"
                >
                  <Upload size={16} />
                  Import Excel/CSV
                </button>
              </div>

              <button
                onClick={() => setShowOpeningStock(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-semibold text-slate-700 shadow-sm transition-colors"
              >
                <Settings size={16} />
                Setup Opening Stock
              </button>
              
              <button
                onClick={handleAddNewClick}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold text-white shadow-sm transition-colors"
              >
                <Plus size={16} />
                Create New
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="md:col-span-2 flex items-center gap-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <Search className="text-slate-400" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, barcode, or secondary barcode..."
                className="w-full bg-transparent text-slate-700 focus:outline-none placeholder-slate-400 text-sm"
              />
            </div>
            
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-650 focus:outline-none text-sm font-semibold"
              >
                <option value="">All Categories</option>
                {masters?.categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-650 focus:outline-none text-sm font-semibold"
              >
                <option value="ACTIVE">Active Inventory</option>
                <option value="DELETED">Trash / Soft-Deleted</option>
              </select>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                    <th className="p-4">Item Code</th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">MRP (₹)</th>
                    <th className="p-4">Sale Price (₹)</th>
                    <th className="p-4">GST</th>
                    <th className="p-4 text-center">Batches</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="p-8 text-center text-slate-400">Loading catalog...</td></tr>
                  ) : products.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-slate-400">No products found.</td></tr>
                  ) : (
                    products.map(p => (
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-4 font-mono text-slate-500">{p.itemCode}</td>
                        <td
                          className="p-4 font-bold text-indigo-650 hover:underline cursor-pointer"
                          onClick={() => handleProductClick(p)}
                        >
                          {p.name}
                        </td>
                        <td className="p-4 text-slate-500">{p.category?.name}</td>
                        <td className="p-4">₹{(p.mrp / 100).toFixed(2)}</td>
                        <td className="p-4 text-indigo-600 font-bold">₹{(p.sellingPrice / 100).toFixed(2)}</td>
                        <td className="p-4 text-slate-500">{p.salesTaxPct}%</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleProductClick(p)}
                            className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-black rounded-lg transition-colors"
                          >
                            {p.batches?.length || 0} Batches
                          </button>
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          <button
                            onClick={() => handleProductClick(p)}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                            title="Open Product File"
                          >
                            <Edit size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ViewMode FORM (Simple creation of a new product) */}
      {viewMode === 'form' && (
        <form onSubmit={e => handleSaveProduct(e, false)} className="space-y-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <button type="button" onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500"><ArrowLeft size={20} /></button>
            <h2 className="text-xl font-black text-slate-800">Add New Product Catalog Record</h2>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Item Code/Barcode *</label>
                <input type="text" value={itemCode} onChange={e => setItemCode(e.target.value)} placeholder="Auto generated if empty" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Product Name *</label>
                <input type="text" required value={name} onChange={e => handleProductNameChange(e.target.value)} placeholder="Enter product name" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Print Name *</label>
                <input type="text" required value={printName} onChange={e => setPrintName(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Category *</label>
                <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <option value="">Select Category...</option>
                  {masters?.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  <option value="ADD_NEW">+ Add New Category...</option>
                </select>
                {selectedCategory === 'ADD_NEW' && <input type="text" required placeholder="New Category Name" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="mt-2 w-full px-2.5 py-1 bg-white border border-indigo-300 rounded text-xs" />}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Brand *</label>
                <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <option value="">Select Brand...</option>
                  {masters?.brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  <option value="ADD_NEW">+ Add New Brand...</option>
                </select>
                {selectedBrand === 'ADD_NEW' && <input type="text" required placeholder="New Brand Name" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} className="mt-2 w-full px-2.5 py-1 bg-white border border-indigo-300 rounded text-xs" />}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Unit *</label>
                <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <option value="PCS">PCS</option>
                  <option value="KG">KG</option>
                  <option value="GM">GM</option>
                  <option value="BOX">BOX</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Purchase Price *</label>
                <input type="number" step="0.01" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Selling Price *</label>
                <input type="number" step="0.01" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} className="w-full px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-750" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-650 uppercase mb-2">MRP *</label>
                <input type="number" step="0.01" value={mrp} onChange={e => setMrp(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Opening Stock Qty</label>
                <input type="number" value={openingQty} onChange={e => setOpeningQty(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setViewMode('list')} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-sm">Cancel</button>
            <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm shadow-md">Register Product</button>
          </div>
        </form>
      )}

      {/* ViewMode DETAILS (Redesigned Tabbed Detail View - Matches Screenshots Exactly) */}
      {viewMode === 'details' && selectedProduct && (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl font-black text-slate-800">{selectedProduct.name}</h2>
                <p className="text-xs text-slate-450 font-mono">Barcode: {selectedProduct.itemCode}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleDeleteProduct(selectedProduct.id)}
                className="px-3.5 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg text-rose-700 text-xs font-black transition-colors"
              >
                Soft Delete Product
              </button>
            </div>
          </div>

          {/* Navigation Tabs bar */}
          <div className="flex border-b border-slate-200 text-xs font-bold text-slate-450 uppercase">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 border-b-2 transition-all ${activeTab === 'details' ? 'border-indigo-600 text-indigo-700 font-extrabold' : 'border-transparent hover:text-slate-600'}`}
            >
              Product Details
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`px-4 py-2 border-b-2 transition-all ${activeTab === 'pricing' ? 'border-indigo-600 text-indigo-700 font-extrabold' : 'border-transparent hover:text-slate-600'}`}
            >
              Pricing Details
            </button>
            <button
              onClick={() => setActiveTab('barcodes')}
              className={`px-4 py-2 border-b-2 transition-all ${activeTab === 'barcodes' ? 'border-indigo-600 text-indigo-700 font-extrabold' : 'border-transparent hover:text-slate-600'}`}
            >
              Multi Barcode
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-4 py-2 border-b-2 transition-all ${activeTab === 'ledger' ? 'border-indigo-600 text-indigo-700 font-extrabold' : 'border-transparent hover:text-slate-600'}`}
            >
              Product Ledger / History
            </button>
          </div>

          {/* Tab 1: Product Details */}
          {activeTab === 'details' && (
            <form onSubmit={handleSaveProduct} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <span className="text-xs font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                General Product Details
              </span>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Item Code / Barcode *</label>
                  <input
                    type="text"
                    disabled
                    value={itemCode}
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold font-mono text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => handleProductNameChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Print Name *</label>
                  <input
                    type="text"
                    required
                    value={printName}
                    onChange={e => { setPrintName(e.target.value); setIsPrintNameCustom(true); }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Category *</label>
                  <select
                    required
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none font-semibold text-slate-600"
                  >
                    {masters?.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    <option value="ADD_NEW" className="font-bold text-indigo-650">+ Add New Category...</option>
                  </select>
                  {selectedCategory === 'ADD_NEW' && (
                    <input
                      type="text"
                      required
                      placeholder="New Category Name"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      className="mt-2 w-full px-2.5 py-1 bg-white border border-indigo-300 rounded text-xs"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Sub Category</label>
                  <input
                    type="text"
                    value={subCategory}
                    onChange={e => setSubCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Brand *</label>
                  <select
                    required
                    value={selectedBrand}
                    onChange={e => setSelectedBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none font-semibold text-slate-600"
                  >
                    {masters?.brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    <option value="ADD_NEW" className="font-bold text-indigo-655">+ Add New Brand...</option>
                  </select>
                  {selectedBrand === 'ADD_NEW' && (
                    <input
                      type="text"
                      required
                      placeholder="New Brand Name"
                      value={newBrandName}
                      onChange={e => setNewBrandName(e.target.value)}
                      className="mt-2 w-full px-2.5 py-1 bg-white border border-indigo-300 rounded text-xs"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Sub Brand</label>
                  <input
                    type="text"
                    value={subBrand}
                    onChange={e => setSubBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Unit *</label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none"
                  >
                    <option value="PCS">PCS</option>
                    <option value="KG">KG</option>
                    <option value="GM">GM</option>
                    <option value="BOX">BOX</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-650 uppercase mb-2">HSN Code</label>
                  <input type="text" value={hsnCode} onChange={e => setHsnCode(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Sales Tax (GST %)</label>
                  <select value={salesTaxPct} onChange={e => setSalesTaxPct(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600">
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                  <span className="text-[10px] font-black text-slate-400 mt-1 block">CGST = {(parseFloat(salesTaxPct)/2).toFixed(1)}% | SGST = {(parseFloat(salesTaxPct)/2).toFixed(1)}%</span>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Short Description</label>
                  <input type="text" value={shortDescription} onChange={e => setShortDescription(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-lg shadow-sm">Save Changes</button>
              </div>
            </form>
          )}

          {/* Tab 2: Pricing Details & Batches Price Master */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              
              {/* Product General Pricing overview */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <span className="text-xs font-black uppercase text-indigo-650 tracking-wider block border-b border-slate-100 pb-2">Pricing Master Matrix</span>
                
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-xs font-semibold">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Purchase Price</span>
                    <strong className="text-slate-800 text-sm font-extrabold">₹{purchasePrice}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Landing Cost</span>
                    <strong className="text-slate-800 text-sm font-extrabold">₹{landingCost}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">MRP</span>
                    <strong className="text-slate-800 text-sm font-extrabold">₹{mrp}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Discount (₹)</span>
                    <strong className="text-rose-500 text-sm font-extrabold">-₹{sellingDiscount}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Selling Price</span>
                    <strong className="text-indigo-700 text-sm font-extrabold">₹{sellingPrice}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Gross Margin</span>
                    <strong className="text-emerald-600 text-sm font-extrabold">₹{sellingMargin}</strong>
                  </div>
                </div>
              </div>

              {/* Batches list & batch-wise pricing editor (Screenshot 2 reference) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <span className="text-xs font-black uppercase text-indigo-650 tracking-wider block border-b border-slate-100 pb-2">Batch Wise Pricing</span>
                
                {productBatches.length === 0 ? (
                  <p className="text-center text-slate-450 py-6">No pricing batches created. Register a new batch pricing slot below!</p>
                ) : (
                  <div className="space-y-4">
                    {productBatches.map(b => (
                      <BatchPricingRow
                        key={b.id}
                        batch={b}
                        onUpdate={(bQty, bPurch, bMrpVal, bSell) => handleUpdateBatchQty(b.id, b.batchNumber, bPurch, bMrpVal, bSell, bQty)}
                      />
                    ))}
                  </div>
                )}

                {/* Add Batch Inline form */}
                <form onSubmit={handleAddBatch} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <span className="text-xs font-black uppercase text-slate-500 tracking-wider">+ Create Batch pricing Slot</span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Batch Code</label>
                      <input type="text" required value={newBatchNumber} onChange={e => setNewBatchNumber(e.target.value)} className="w-full px-2.5 py-1 bg-white border border-slate-350 rounded text-xs focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Expiry Date</label>
                      <input type="date" value={newBatchExpiry} onChange={e => setNewBatchExpiry(e.target.value)} className="w-full px-2.5 py-1 bg-white border border-slate-350 rounded text-xs focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Purchase (₹)</label>
                      <input type="number" step="0.01" required value={newBatchPurchase} onChange={e => setNewBatchPurchase(e.target.value)} className="w-full px-2.5 py-1 bg-white border border-slate-355 rounded text-xs text-center focus:outline-none font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">MRP (₹)</label>
                      <input type="number" step="0.01" required value={newBatchMrp} onChange={e => setNewBatchMrp(e.target.value)} className="w-full px-2.5 py-1 bg-white border border-slate-355 rounded text-xs text-center focus:outline-none font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Selling Price (₹)</label>
                      <input type="number" step="0.01" required value={newBatchSelling} onChange={e => setNewBatchSelling(e.target.value)} className="w-full px-2.5 py-1 bg-white border border-slate-355 rounded text-xs text-center focus:outline-none font-bold text-indigo-650" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold text-slate-450 uppercase">Initial Quantity:</label>
                      <input type="number" required value={newBatchQty} onChange={e => setNewBatchQty(e.target.value)} className="w-20 px-2 py-0.5 bg-white border border-slate-300 rounded text-center text-xs font-bold" />
                    </div>
                    <button type="submit" className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded text-xs font-black shadow-sm">Save Batch Prices</button>
                  </div>
                </form>
              </div>

            </div>
          )}

          {/* Tab 3: Multi Barcode (Screenshot 1 reference) */}
          {activeTab === 'barcodes' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <span className="text-xs font-black uppercase text-indigo-650 tracking-wider block">Variant / Secondary Barcodes</span>
                <p className="text-xs text-slate-400 mt-1">Add multiple barcode mappings for this product so scanning any of them maps back to this item</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* List barcodes */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Registered Barcodes</span>
                  
                  {/* Parent default Barcode */}
                  <div className="p-3 bg-slate-50 border border-slate-250 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <strong className="text-slate-800 text-sm font-mono block">{selectedProduct.itemCode}</strong>
                      <span className="text-[9px] text-slate-400 block uppercase">Default Parent Barcode</span>
                    </div>
                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black rounded-lg">Default</span>
                  </div>

                  {productVariants.length === 0 ? (
                    <p className="text-center text-slate-400 py-6 text-xs border border-dashed rounded-xl bg-slate-50/50">No secondary barcodes registered.</p>
                  ) : (
                    productVariants.map(v => (
                      <div key={v.id} className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-xs shadow-sm">
                        <div>
                          <strong className="text-slate-800 text-sm font-mono block">{v.barcode}</strong>
                          <span className="text-[9px] text-slate-400 block uppercase">Secondary Mapping Barcode</span>
                        </div>
                        <button
                          onClick={() => handleDeleteVariantBarcode(v.id)}
                          className="p-1.5 hover:bg-rose-50 text-rose-500 rounded border border-slate-200 hover:border-rose-200 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add barcode form (Screenshot 1 layout) */}
                <form onSubmit={handleAddSecondaryBarcode} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl h-fit space-y-4">
                  <span className="text-[10px] font-black uppercase text-slate-550 tracking-wider block">Add Secondary Barcode</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Scan or enter secondary barcode..."
                      value={newSecondaryBarcode}
                      onChange={e => setNewSecondaryBarcode(e.target.value)}
                      className="w-full px-3.5 py-1.5 bg-white border border-slate-350 rounded-xl text-xs focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-black rounded-xl shadow-sm shrink-0"
                    >
                      Add Barcode
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

          {/* Tab 4: Product Ledger */}
          {activeTab === 'ledger' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <span className="text-xs font-black uppercase text-indigo-650 tracking-wider block border-b border-slate-100 pb-2">Stock Ledger & Adjustments History</span>
              
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50 font-bold">
                    <th className="p-3">Date</th>
                    <th className="p-3">Reference / Reason</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Qty Change</th>
                  </tr>
                </thead>
                <tbody>
                  {stockLedgers.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">No stock ledger transactions logged for this product.</td></tr>
                  ) : (
                    stockLedgers.map((sl, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-3 text-slate-400">{new Date(sl.createdAt).toLocaleString()}</td>
                        <td className="p-3 font-semibold text-slate-700">{sl.reason || 'Procurement stock setup'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${sl.type === 'PURCHASE' ? 'bg-emerald-50 text-emerald-700' : sl.type === 'SALE' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                            {sl.type}
                          </span>
                        </td>
                        <td className={`p-3 font-black text-right ${sl.quantity > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {sl.quantity > 0 ? `+${sl.quantity}` : sl.quantity}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}
      
      {/* Setup Opening Stock Modal */}
      {showOpeningStock && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Recheck Opening Stock (Bulk Entry)</h3>
              <button onClick={() => setShowOpeningStock(false)} className="text-slate-400 hover:text-slate-650"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                {products.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                    <span className="font-semibold text-slate-700">{p.name} ({p.itemCode})</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">Current: {p.qtyOnHand}</span>
                      <input
                        type="number"
                        placeholder="New Qty"
                        value={openingStockUpdates[p.id] !== undefined ? openingStockUpdates[p.id] : p.qtyOnHand}
                        onChange={e => setOpeningStockUpdates({ ...openingStockUpdates, [p.id]: e.target.value })}
                        className="w-24 px-3 py-1 bg-white border border-slate-200 rounded text-center text-slate-700 text-xs focus:outline-none focus:border-indigo-500 font-bold"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <button type="button" onClick={() => { setShowOpeningStock(false); setOpeningStockUpdates({}); }} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-lg text-sm font-semibold">Cancel</button>
              <button type="button" onClick={saveOpeningStock} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm text-white font-semibold shadow-sm">
                <Save size={16} />
                Save Stock Recounts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Batch Row rendering & pricing updates matching Screenshot 2 inline table layout
function BatchPricingRow({ batch, onUpdate }) {
  const [qty, setQty] = useState(batch.qtyOnHand);
  const [purchase, setPurchase] = useState((batch.purchasePrice / 100).toString());
  const [mrpVal, setMrpVal] = useState((batch.mrp / 100).toString());
  const [selling, setSelling] = useState((batch.sellingPrice / 100).toString());
  const [discount, setDiscount] = useState(((batch.mrp - batch.sellingPrice) / 100).toString());
  
  // Calculate margin in state
  const margin = parseFloat(selling || 0) - parseFloat(purchase || 0);

  // Auto calculate discount
  useEffect(() => {
    const calculatedDiscount = parseFloat(mrpVal || 0) - parseFloat(selling || 0);
    setDiscount(calculatedDiscount.toFixed(2));
  }, [mrpVal, selling]);

  return (
    <div className="p-5 border border-slate-250 rounded-2xl bg-slate-50/50 space-y-4">
      <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
        <div>
          <strong className="text-slate-800 text-sm font-mono">Batch Code: {batch.batchNumber}</strong>
          <span className="text-[9px] text-slate-400 block uppercase">Created: {new Date(batch.createdAt).toLocaleString()}</span>
        </div>
        <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black rounded-lg">Qty: {qty} units</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-center text-xs font-semibold">
        <div>
          <span className="text-[10px] text-slate-400 block uppercase mb-1">Purchase Price</span>
          <input type="number" step="0.01" value={purchase} onChange={e => setPurchase(e.target.value)} className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-center focus:outline-none font-bold" />
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block uppercase mb-1">Landing Cost</span>
          <input type="number" step="0.01" value={purchase} disabled className="w-full px-2 py-1 bg-slate-100 border border-slate-200 rounded text-center font-bold text-slate-500 cursor-not-allowed" />
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block uppercase mb-1">MRP</span>
          <input type="number" step="0.01" value={mrpVal} onChange={e => setMrpVal(e.target.value)} className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-center focus:outline-none font-bold" />
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block uppercase mb-1">Discount (₹)</span>
          <input type="number" step="0.01" disabled value={discount} className="w-full px-2 py-1 bg-slate-100 border border-slate-200 rounded text-center font-bold text-rose-500 cursor-not-allowed" />
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block uppercase mb-1">Selling Price</span>
          <input type="number" step="0.01" value={selling} onChange={e => setSelling(e.target.value)} className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-center focus:outline-none font-bold text-indigo-700" />
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block uppercase mb-1">Margin (₹)</span>
          <div className="flex gap-1.5 items-center">
            <input type="number" step="0.01" disabled value={margin.toFixed(2)} className="w-full px-2 py-1 bg-slate-100 border border-slate-200 rounded text-center font-bold text-emerald-600 cursor-not-allowed" />
            <button
              type="button"
              onClick={() => onUpdate(qty, purchase, mrpVal, selling)}
              className="p-1.5 hover:bg-indigo-650 bg-indigo-600 text-white rounded shadow-sm transition-colors"
              title="Save batch pricing changes"
            >
              <Save size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Products;
