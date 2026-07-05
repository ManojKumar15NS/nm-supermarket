const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken, checkPermission, logAudit } = require('../middleware/auth');

// Get all suppliers
router.get('/suppliers', authenticateToken, checkPermission('Inventory', 'view'), async (req, res) => {
  try {
    const list = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new supplier
router.post('/suppliers', authenticateToken, checkPermission('Inventory', 'add'), async (req, res) => {
  const data = req.body;
  try {
    const supplier = await prisma.supplier.create({
      data: {
        name: data.name,
        contactPerson: data.contactPerson || null,
        phone: data.phone || null,
        email: data.email || null,
        gstin: data.gstin || null,
        address: data.address || null,
        openingBalance: data.openingBalance ? parseInt(data.openingBalance) : 0
      }
    });
    await logAudit(req.staff.id, req.staff.name, 'Inventory', 'Create Supplier', null, supplier);
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all purchase invoices (reconstructed from StockLedger type=PURCHASE)
router.get('/', authenticateToken, checkPermission('Inventory', 'view'), async (req, res) => {
  try {
    const entries = await prisma.stockLedger.findMany({
      where: { type: 'PURCHASE' },
      include: { product: true },
      orderBy: { timestamp: 'desc' }
    });
    
    // Group items by referenceId (which represents the Purchase Bill Number)
    const purchases = {};
    for (const entry of entries) {
      const ref = entry.referenceId || 'PO-DEFAULT';
      if (!purchases[ref]) {
        let supplierName = 'General Supplier';
        let supplierId = null;
        if (entry.reason && entry.reason.startsWith('Supplier:')) {
          const match = entry.reason.match(/Supplier:\\s*(.*?)\\s*\\(ID:\\s*(\\d+)\\)/);
          if (match) {
            supplierName = match[1];
            supplierId = parseInt(match[2]);
          } else {
            supplierName = entry.reason.replace('Supplier:', '').trim();
          }
        }
        purchases[ref] = {
          billNumber: ref,
          date: entry.timestamp,
          supplierName,
          supplierId,
          items: [],
          totalQty: 0,
          totalAmount: 0
        };
      }
      purchases[ref].items.push({
        productId: entry.productId,
        productName: entry.product.name,
        qty: entry.quantity,
        purchasePrice: entry.product.purchasePrice
      });
      purchases[ref].totalQty += entry.quantity;
      purchases[ref].totalAmount += entry.quantity * entry.product.purchasePrice;
    }
    res.json(Object.values(purchases));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a purchase invoice (updates inventory stock + adds StockLedger entries)
router.post('/', authenticateToken, checkPermission('Inventory', 'add'), async (req, res) => {
  const { billNumber, supplierId, items } = req.body; // items: [{ productId, qty }]
  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: parseInt(supplierId) } });
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    
    const logs = [];
    for (const item of items) {
      const prodId = parseInt(item.productId);
      const qtyVal = parseInt(item.qty);
      
      const product = await prisma.product.findUnique({ where: { id: prodId } });
      if (!product) continue;
      
      // 1. Update product's quantity on hand
      await prisma.product.update({
        where: { id: prodId },
        data: { qtyOnHand: { increment: qtyVal } }
      });
      
      // 2. Add entry to StockLedger
      const log = await prisma.stockLedger.create({
        data: {
          productId: prodId,
          quantity: qtyVal,
          type: 'PURCHASE',
          referenceId: billNumber,
          reason: `Supplier: ${supplier.name} (ID: ${supplier.id})`
        }
      });
      logs.push(log);
    }
    
    await logAudit(req.staff.id, req.staff.name, 'Inventory', 'Add Purchase Invoice', { billNumber, supplierId }, logs);
    res.json({ message: 'Purchase logged successfully!', count: logs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
