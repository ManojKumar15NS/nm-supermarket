const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken, checkPermission, logAudit } = require('../middleware/auth');

// Get all customers
router.get('/', authenticateToken, checkPermission('Customers', 'view'), async (req, res) => {
  const { search } = req.query;
  let where = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } }
    ];
  }
  try {
    const list = await prisma.customer.findMany({ where, orderBy: { name: 'asc' } });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get customer order history & loyalty transactions
router.get('/:id', authenticateToken, checkPermission('Customers', 'view'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        invoices: { orderBy: { createdAt: 'desc' } },
        loyaltyTransactions: { orderBy: { timestamp: 'desc' } }
      }
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create customer
router.post('/', authenticateToken, checkPermission('Customers', 'add'), async (req, res) => {
  const data = req.body;
  try {
    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        gstin: data.gstin || null,
        openingBalance: data.openingBalance ? parseInt(data.openingBalance) : 0,
        loyaltyPoints: 0
      }
    });
    await logAudit(req.staff.id, req.staff.name, 'Customers', 'Create Customer', null, customer);
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit customer
router.put('/:id', authenticateToken, checkPermission('Customers', 'edit'), async (req, res) => {
  const id = parseInt(req.params.id);
  const data = req.body;
  try {
    const before = await prisma.customer.findUnique({ where: { id } });
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        gstin: data.gstin,
        openingBalance: data.openingBalance ? parseInt(data.openingBalance) : 0
      }
    });
    await logAudit(req.staff.id, req.staff.name, 'Customers', 'Edit Customer', before, customer);
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Merge duplicate customers
router.post('/merge', authenticateToken, checkPermission('Customers', 'edit'), async (req, res) => {
  const { sourceIds, targetId } = req.body; // sourceIds is array of duplicate IDs
  try {
    const targetCustomer = await prisma.customer.findUnique({ where: { id: parseInt(targetId) } });
    if (!targetCustomer) return res.status(400).json({ error: 'Target customer not found' });
    
    let mergedPoints = 0;
    
    for (const sourceId of sourceIds) {
      const sId = parseInt(sourceId);
      if (sId === targetCustomer.id) continue;
      
      const source = await prisma.customer.findUnique({ where: { id: sId } });
      if (!source) continue;
      
      mergedPoints += source.loyaltyPoints;
      
      // Update invoices to targetCustomer
      await prisma.invoice.updateMany({
        where: { customerId: sId },
        data: { customerId: targetCustomer.id }
      });
      
      // Update loyalty transactions to targetCustomer
      await prisma.loyaltyTransaction.updateMany({
        where: { customerId: sId },
        data: { customerId: targetCustomer.id }
      });
      
      // Delete source customer
      await prisma.customer.delete({ where: { id: sId } });
    }
    
    // Add points to target
    const updatedTarget = await prisma.customer.update({
      where: { id: targetCustomer.id },
      data: { loyaltyPoints: targetCustomer.loyaltyPoints + mergedPoints }
    });
    
    // Log loyalty transaction for merged points
    if (mergedPoints > 0) {
      await prisma.loyaltyTransaction.create({
        data: {
          customerId: targetCustomer.id,
          points: mergedPoints,
          type: 'EARN',
          referenceId: 'MERGED_DUPLICATES'
        }
      });
    }
    
    await logAudit(req.staff.id, req.staff.name, 'Customers', 'Merge Customers', { sourceIds, targetId }, updatedTarget);
    res.json(updatedTarget);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pay off store credit balance
router.post('/:id/pay-credit', authenticateToken, checkPermission('Customers', 'edit'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { amount } = req.body; // paise to pay off
  try {
    const before = await prisma.customer.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ error: 'Customer not found' });
    
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        openingBalance: Math.max(0, before.openingBalance - parseInt(amount))
      }
    });
    
    await logAudit(req.staff.id, req.staff.name, 'Customers', 'Pay Credit Balance', before, customer);
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
