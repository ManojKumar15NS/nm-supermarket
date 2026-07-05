const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken, checkPermission, logAudit } = require('../middleware/auth');

// Get all products
router.get('/', authenticateToken, checkPermission('Inventory/Products', 'view'), async (req, res) => {
  const { search, categoryId, status } = req.query;
  let where = {};
  if (status) {
    where.status = status;
  } else {
    where.status = 'ACTIVE';
  }
  if (categoryId) {
    where.categoryId = parseInt(categoryId);
  }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { itemCode: { contains: search } },
      { variants: { some: { barcode: { contains: search } } } }
    ];
  }
  
  try {
    const products = await prisma.product.findMany({
      where,
      include: { category: true, brand: true, variants: true, batches: true }
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get masters (Categories, Brands)
router.get('/masters', authenticateToken, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ include: { subCategories: true } });
    const brands = await prisma.brand.findMany({ include: { subBrands: true } });
    const suppliers = await prisma.supplier.findMany();
    res.json({ categories, brands, suppliers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create product
router.post('/', authenticateToken, checkPermission('Inventory/Products', 'add'), async (req, res) => {
  const data = req.body;
  try {
    // Dynamic Find or Create for Category and Brand
    let catId = parseInt(data.categoryId);
    if (isNaN(catId)) {
      let category = await prisma.category.findUnique({ where: { name: data.categoryId } });
      if (!category) {
        category = await prisma.category.create({ data: { name: data.categoryId } });
      }
      catId = category.id;
    }
    
    let brId = parseInt(data.brandId);
    if (isNaN(brId)) {
      let brand = await prisma.brand.findUnique({ where: { name: data.brandId } });
      if (!brand) {
        brand = await prisma.brand.create({ data: { name: data.brandId } });
      }
      brId = brand.id;
    }
    
    // Auto-generate barcode if empty
    const itemCode = data.itemCode || `BC-${Date.now()}`;
    
    const product = await prisma.product.create({
      data: {
        itemCode,
        name: data.name,
        printName: data.printName || data.name,
        description: data.description,
        ingredients: data.ingredients,
        nutritionInfo: data.nutritionInfo,
        netWeight: data.netWeight ? parseFloat(data.netWeight) : null,
        netWeightUnit: data.netWeightUnit || 'g',
        categoryId: catId,
        brandId: brId,
        mrp: parseInt(data.mrp),
        sellingPrice: parseInt(data.sellingPrice),
        purchasePrice: parseInt(data.purchasePrice),
        landingCost: parseInt(data.landingCost || data.purchasePrice),
        purchaseTaxPct: parseFloat(data.purchaseTaxPct || 0),
        salesTaxPct: parseFloat(data.salesTaxPct || 0),
        isTaxInclusive: data.isTaxInclusive !== false,
        cessPct: parseFloat(data.cessPct || 0),
        minOrderQty: parseInt(data.minOrderQty || 1),
        qtyOnHand: parseInt(data.openingQty || 0),
        manageBatch: data.manageBatch === true,
        status: 'ACTIVE'
      }
    });
    
    // Create stock ledger for opening stock & create default Batch
    if (data.openingQty && parseInt(data.openingQty) > 0) {
      await prisma.stockLedger.create({
        data: {
          productId: product.id,
          quantity: parseInt(data.openingQty),
          type: 'PURCHASE',
          reason: 'Opening stock setup'
        }
      });
      await prisma.batch.create({
        data: {
          productId: product.id,
          batchNumber: 'B-001',
          purchasePrice: parseInt(data.purchasePrice),
          mrp: parseInt(data.mrp),
          sellingPrice: parseInt(data.sellingPrice),
          qtyOnHand: parseInt(data.openingQty)
        }
      });
    }
    
    // Create variants if any
    if (data.variants && Array.isArray(data.variants)) {
      for (const v of data.variants) {
        await prisma.variant.create({
          data: {
            productId: product.id,
            barcode: v.barcode || `${itemCode}-v`,
            name: v.name,
            price: parseInt(v.price),
            qtyOnHand: parseInt(v.qtyOnHand || 0)
          }
        });
      }
    }
    
    await logAudit(req.staff.id, req.staff.name, 'Inventory', 'Add Product', null, product);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit product
router.put('/:id', authenticateToken, checkPermission('Inventory/Products', 'edit'), async (req, res) => {
  const id = parseInt(req.params.id);
  const data = req.body;
  try {
    const before = await prisma.product.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ error: 'Product not found' });
    
    let catId = parseInt(data.categoryId);
    if (isNaN(catId)) {
      let category = await prisma.category.findUnique({ where: { name: data.categoryId } });
      if (!category) {
        category = await prisma.category.create({ data: { name: data.categoryId } });
      }
      catId = category.id;
    }
    
    let brId = parseInt(data.brandId);
    if (isNaN(brId)) {
      let brand = await prisma.brand.findUnique({ where: { name: data.brandId } });
      if (!brand) {
        brand = await prisma.brand.create({ data: { name: data.brandId } });
      }
      brId = brand.id;
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        printName: data.printName,
        description: data.description,
        ingredients: data.ingredients,
        nutritionInfo: data.nutritionInfo,
        netWeight: data.netWeight ? parseFloat(data.netWeight) : null,
        netWeightUnit: data.netWeightUnit,
        categoryId: catId,
        brandId: brId,
        mrp: parseInt(data.mrp),
        sellingPrice: parseInt(data.sellingPrice),
        purchasePrice: parseInt(data.purchasePrice),
        landingCost: parseInt(data.landingCost),
        purchaseTaxPct: parseFloat(data.purchaseTaxPct || 0),
        salesTaxPct: parseFloat(data.salesTaxPct || 0),
        isTaxInclusive: data.isTaxInclusive,
        cessPct: parseFloat(data.cessPct || 0),
        minOrderQty: parseInt(data.minOrderQty || 1),
        manageBatch: data.manageBatch
      }
    });
    
    await logAudit(req.staff.id, req.staff.name, 'Inventory', 'Edit Product', before, product);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Soft Delete Product
router.delete('/:id', authenticateToken, checkPermission('Inventory/Products', 'edit'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const before = await prisma.product.findUnique({ where: { id } });
    const product = await prisma.product.update({
      where: { id },
      data: { status: 'DELETED' }
    });
    await logAudit(req.staff.id, req.staff.name, 'Inventory', 'Soft Delete Product', before, product);
    res.json({ message: 'Product soft deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restore product
router.post('/:id/restore', authenticateToken, checkPermission('Inventory/Products', 'edit'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const before = await prisma.product.findUnique({ where: { id } });
    const product = await prisma.product.update({
      where: { id },
      data: { status: 'ACTIVE' }
    });
    await logAudit(req.staff.id, req.staff.name, 'Inventory', 'Restore Product', before, product);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk setup opening stock
router.post('/opening-stock', authenticateToken, checkPermission('Inventory/Products', 'edit'), async (req, res) => {
  const { stockUpdates } = req.body; // array of { productId, qtyOnHand }
  try {
    for (const update of stockUpdates) {
      const pid = parseInt(update.productId);
      const qty = parseInt(update.qtyOnHand);
      
      const before = await prisma.product.findUnique({ where: { id: pid } });
      if (before) {
        await prisma.product.update({
          where: { id: pid },
          data: { qtyOnHand: qty }
        });
        
        await prisma.stockLedger.create({
          data: {
            productId: pid,
            quantity: qty - before.qtyOnHand,
            type: 'ADJUSTMENT',
            reason: 'Opening stock bulk recheck'
          }
        });
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stock Adjustments
router.post('/adjust', authenticateToken, checkPermission('Inventory/Products', 'edit'), async (req, res) => {
  const { productId, qty, reasonCode } = req.body;
  try {
    const before = await prisma.product.findUnique({ where: { id: parseInt(productId) } });
    if (!before) return res.status(404).json({ error: 'Product not found' });
    
    await prisma.product.update({
      where: { id: parseInt(productId) },
      data: { qtyOnHand: before.qtyOnHand + parseInt(qty) }
    });
    
    await prisma.stockAdjustment.create({
      data: {
        productId: parseInt(productId),
        quantity: parseInt(qty),
        reasonCode
      }
    });
    
    await prisma.stockLedger.create({
      data: {
        productId: parseInt(productId),
        quantity: parseInt(qty),
        type: 'ADJUSTMENT',
        reason: `Adjustment: ${reasonCode}`
      }
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Categories master CRUD
router.post('/categories', authenticateToken, checkPermission('Inventory/Products', 'edit'), async (req, res) => {
  const { name } = req.body;
  try {
    const cat = await prisma.category.create({ data: { name } });
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Brands master CRUD
router.post('/brands', authenticateToken, checkPermission('Inventory/Products', 'edit'), async (req, res) => {
  const { name } = req.body;
  try {
    const brand = await prisma.brand.create({ data: { name } });
    res.json(brand);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Suppliers master CRUD
router.post('/suppliers', authenticateToken, checkPermission('Inventory/Products', 'edit'), async (req, res) => {
  const data = req.body;
  try {
    const supplier = await prisma.supplier.create({
      data: {
        name: data.name,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email,
        gstin: data.gstin,
        address: data.address,
        openingBalance: data.openingBalance ? parseInt(data.openingBalance) : 0
      }
    });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk product import
router.post('/bulk', authenticateToken, checkPermission('Inventory/Products', 'add'), async (req, res) => {
  const { products } = req.body; // array of products
  try {
    const created = [];
    for (const data of products) {
      // Resolve category & brand
      let catId = parseInt(data.categoryId);
      if (isNaN(catId) && data.categoryId) {
        let category = await prisma.category.findUnique({ where: { name: data.categoryId } });
        if (!category) category = await prisma.category.create({ data: { name: data.categoryId } });
        catId = category.id;
      }
      
      let brId = parseInt(data.brandId);
      if (isNaN(brId) && data.brandId) {
        let brand = await prisma.brand.findUnique({ where: { name: data.brandId } });
        if (!brand) brand = await prisma.brand.create({ data: { name: data.brandId } });
        brId = brand.id;
      }
      
      const itemCode = data.itemCode || `BC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const product = await prisma.product.create({
        data: {
          itemCode,
          name: data.name,
          printName: data.printName || data.name,
          categoryId: catId || 1,
          brandId: brId || 1,
          mrp: Math.round(parseFloat(data.mrp || 0) * 100),
          sellingPrice: Math.round(parseFloat(data.sellingPrice || 0) * 100),
          purchasePrice: Math.round(parseFloat(data.purchasePrice || 0) * 100),
          landingCost: Math.round(parseFloat(data.purchasePrice || 0) * 100),
          salesTaxPct: parseFloat(data.salesTaxPct || 18),
          qtyOnHand: parseInt(data.openingQty || 0),
          status: 'ACTIVE'
        }
      });
      
      if (parseInt(data.openingQty || 0) > 0) {
        await prisma.stockLedger.create({
          data: {
            productId: product.id,
            quantity: parseInt(data.openingQty),
            type: 'PURCHASE',
            reason: 'Bulk import opening stock'
          }
        });
        await prisma.batch.create({
          data: {
            productId: product.id,
            batchNumber: 'B-001',
            purchasePrice: Math.round(parseFloat(data.purchasePrice || 0) * 100),
            mrp: Math.round(parseFloat(data.mrp || 0) * 100),
            sellingPrice: Math.round(parseFloat(data.sellingPrice || 0) * 100),
            qtyOnHand: parseInt(data.openingQty)
          }
        });
      }
      created.push(product);
    }
    await logAudit(req.staff.id, req.staff.name, 'Inventory', 'Bulk Import Products', null, { count: created.length });
    res.json({ success: true, count: created.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get batches of a product
router.get('/:id/batches', authenticateToken, checkPermission('Inventory/Products', 'view'), async (req, res) => {
  const productId = parseInt(req.params.id);
  try {
    const list = await prisma.batch.findMany({ where: { productId }, orderBy: { batchNumber: 'asc' } });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new batch for a product
router.post('/:id/batches', authenticateToken, checkPermission('Inventory/Products', 'edit'), async (req, res) => {
  const productId = parseInt(req.params.id);
  const data = req.body;
  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    const batch = await prisma.batch.create({
      data: {
        productId,
        batchNumber: data.batchNumber,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        purchasePrice: parseInt(data.purchasePrice),
        mrp: parseInt(data.mrp),
        sellingPrice: parseInt(data.sellingPrice),
        qtyOnHand: parseInt(data.qtyOnHand || 0)
      }
    });
    
    // Increment product overall qtyOnHand
    await prisma.product.update({
      where: { id: productId },
      data: { qtyOnHand: { increment: parseInt(data.qtyOnHand || 0) } }
    });
    
    await prisma.stockLedger.create({
      data: {
        productId,
        quantity: parseInt(data.qtyOnHand || 0),
        type: 'PURCHASE',
        reason: `New batch ${data.batchNumber} added`
      }
    });
    
    await logAudit(req.staff.id, req.staff.name, 'Inventory', 'Create Product Batch', null, batch);
    res.json(batch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit an existing batch
router.put('/:id/batches/:batchId', authenticateToken, checkPermission('Inventory/Products', 'edit'), async (req, res) => {
  const productId = parseInt(req.params.id);
  const batchId = parseInt(req.params.batchId);
  const data = req.body;
  try {
    const before = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!before) return res.status(404).json({ error: 'Batch not found' });
    
    const qtyDiff = parseInt(data.qtyOnHand) - before.qtyOnHand;
    
    const batch = await prisma.batch.update({
      where: { id: batchId },
      data: {
        batchNumber: data.batchNumber,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        purchasePrice: parseInt(data.purchasePrice),
        mrp: parseInt(data.mrp),
        sellingPrice: parseInt(data.sellingPrice),
        qtyOnHand: parseInt(data.qtyOnHand)
      }
    });
    
    // Adjust product overall qtyOnHand
    if (qtyDiff !== 0) {
      await prisma.product.update({
        where: { id: productId },
        data: { qtyOnHand: { increment: qtyDiff } }
      });
      await prisma.stockLedger.create({
        data: {
          productId,
          quantity: qtyDiff,
          type: 'ADJUSTMENT',
          reason: `Batch ${data.batchNumber} stock adjustment`
        }
      });
    }
    
    await logAudit(req.staff.id, req.staff.name, 'Inventory', 'Update Product Batch', before, batch);
    res.json(batch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add secondary barcode (Variant)
router.post('/:id/variants', authenticateToken, checkPermission('Inventory/Products', 'edit'), async (req, res) => {
  const productId = parseInt(req.params.id);
  const { barcode, name } = req.body;
  try {
    const existing = await prisma.variant.findUnique({ where: { barcode } });
    if (existing) return res.status(400).json({ error: 'Barcode already registered to a product or variant' });
    
    const variant = await prisma.variant.create({
      data: {
        productId,
        barcode,
        name: name || 'Barcode Variant'
      }
    });
    
    await logAudit(req.staff.id, req.staff.name, 'Inventory', 'Add Product Variant Barcode', null, variant);
    res.json(variant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove secondary barcode
router.delete('/:id/variants/:variantId', authenticateToken, checkPermission('Inventory/Products', 'edit'), async (req, res) => {
  const variantId = parseInt(req.params.variantId);
  try {
    await prisma.variant.delete({ where: { id: variantId } });
    res.json({ success: true, message: 'Variant barcode removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
