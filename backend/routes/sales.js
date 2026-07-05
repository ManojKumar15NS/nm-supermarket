const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken, checkPermission, logAudit } = require('../middleware/auth');

// Check active shift
router.get('/shift/status', authenticateToken, async (req, res) => {
  try {
    const shift = await prisma.shift.findFirst({
      where: { staffId: req.staff.id, status: 'OPEN' }
    });
    res.json(shift || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Open Shift
router.post('/shift/open', authenticateToken, async (req, res) => {
  const { openingCash } = req.body;
  try {
    const existing = await prisma.shift.findFirst({
      where: { staffId: req.staff.id, status: 'OPEN' }
    });
    if (existing) return res.status(400).json({ error: 'Shift already open' });
    
    const shift = await prisma.shift.create({
      data: {
        staffId: req.staff.id,
        openingCash: parseInt(openingCash),
        status: 'OPEN'
      }
    });
    
    await logAudit(req.staff.id, req.staff.name, 'POS/Billing', 'Open Shift', null, shift);
    res.json(shift);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Close Shift
router.post('/shift/close', authenticateToken, async (req, res) => {
  const { closingCash } = req.body;
  try {
    const shift = await prisma.shift.findFirst({
      where: { staffId: req.staff.id, status: 'OPEN' }
    });
    if (!shift) return res.status(400).json({ error: 'No open shift found' });
    
    // Calculate expected cash in hand
    // Expected = openingCash + Cash payments in this shift
    const invoices = await prisma.invoice.findMany({
      where: {
        staffId: req.staff.id,
        createdAt: { gte: shift.openedAt },
        status: 'COMPLETED'
      },
      include: { payments: true }
    });
    
    let cashSales = 0;
    invoices.forEach(inv => {
      inv.payments.forEach(p => {
        if (p.paymentMode === 'CASH') cashSales += p.amount;
      });
    });
    
    const expectedCash = shift.openingCash + cashSales;
    const closing = parseInt(closingCash);
    const difference = closing - expectedCash;
    
    const updatedShift = await prisma.shift.update({
      where: { id: shift.id },
      data: {
        closingCash: closing,
        difference,
        status: 'CLOSED',
        closedAt: new Date()
      }
    });
    
    await logAudit(req.staff.id, req.staff.name, 'POS/Billing', 'Close Shift', shift, updatedShift);
    res.json(updatedShift);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POS Billing Checkout
router.post('/checkout', authenticateToken, checkPermission('POS/Billing', 'add'), async (req, res) => {
  const {
    customerId,
    items, // array of { productId, variantId, qty, price, discount, taxPct }
    payments, // array of { mode, amount }
    couponCode,
    loyaltyPointsToRedeem,
    channel, // Walk-In, Delivery
    customerState, // e.g. "TN", "MH"
    shippingCharges
  } = req.body;
  
  try {
    // 1. Verify active shift
    const activeShift = await prisma.shift.findFirst({
      where: { staffId: req.staff.id, status: 'OPEN' }
    });
    if (!activeShift) {
      return res.status(400).json({ error: 'You must open a cash shift before billing' });
    }
    
    // Fetch customer (or fallback to Walk-In)
    let customer = null;
    if (customerId) {
      customer = await prisma.customer.findUnique({ where: { id: parseInt(customerId) } });
    }
    if (!customer) {
      customer = await prisma.customer.findFirst({ where: { name: 'Walk-In' } });
      if (!customer) {
        customer = await prisma.customer.findFirst();
      }
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            name: 'Walk-In',
            phone: '9999999999',
            loyaltyPoints: 0,
            openingBalance: 0
          }
        });
      }
    }
    
    // Fetch settings
    let loyaltySettings = await prisma.loyaltySettings.findFirst();
    if (!loyaltySettings) {
      loyaltySettings = await prisma.loyaltySettings.create({ data: {} });
    }
    
    // 2. Coupon Validation
    let coupon = null;
    let couponDiscount = 0;
    if (couponCode) {
      coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
      if (coupon) {
        // Date check
        const now = new Date();
        if (now >= coupon.startDate && now <= coupon.endDate && coupon.usedCount < coupon.usageLimit) {
          // Valid coupon!
          // We apply the coupon discount below in totals
        } else {
          coupon = null;
        }
      }
    }
    
    // 3. Totals Calculation
    let subtotal = 0;
    let itemDiscount = 0;
    let taxAmount = 0;
    
    const invoiceItemsData = [];
    const stockLedgerActions = [];
    const stockUpdates = [];
    
    for (const item of items) {
      const dbProduct = await prisma.product.findUnique({ where: { id: parseInt(item.productId) } });
      if (!dbProduct || dbProduct.status === 'DELETED') {
        return res.status(400).json({ error: `Product ID ${item.productId} not found or deleted` });
      }
      
      const qty = parseInt(item.qty);
      const mrp = dbProduct.mrp;
      const sellingPrice = parseInt(item.price); // paise
      const itemDisc = parseInt(item.discount || 0); // paise per unit
      const discTotal = itemDisc * qty;
      const taxableVal = (sellingPrice - itemDisc) * qty;
      
      // Tax calculation
      const taxRate = dbProduct.salesTaxPct;
      let itemTax = 0;
      if (dbProduct.isTaxInclusive) {
        // Tax is included: taxableAmount = total / (1 + rate/100)
        const tVal = taxableVal / (1 + taxRate/100);
        itemTax = Math.round(taxableVal - tVal);
      } else {
        // Tax is exclusive
        itemTax = Math.round(taxableVal * (taxRate/100));
      }
      
      subtotal += sellingPrice * qty;
      itemDiscount += discTotal;
      taxAmount += itemTax;
      
      invoiceItemsData.push({
        productId: dbProduct.id,
        variantId: item.variantId ? parseInt(item.variantId) : null,
        qty,
        mrp,
        sellingPrice,
        discount: discTotal,
        taxPct: taxRate,
        taxAmount: itemTax,
        netAmount: taxableVal + (dbProduct.isTaxInclusive ? 0 : itemTax)
      });
      
      // Stock Updates
      stockUpdates.push({
        id: dbProduct.id,
        qty: dbProduct.qtyOnHand - qty
      });
      if (item.batchId) {
        stockUpdates.push({ batchId: parseInt(item.batchId), qty: qty });
      }
      
      stockLedgerActions.push({
        productId: dbProduct.id,
        quantity: -qty,
        type: 'SALE'
      });
    }
    
    // Apply coupon discount if applicable
    if (coupon) {
      const calculatedSub = subtotal - itemDiscount;
      if (calculatedSub >= coupon.minBillValue) {
        if (coupon.discountType === 'PERCENTAGE') {
          couponDiscount = Math.round(calculatedSub * (coupon.discountValue / 100));
        } else {
          couponDiscount = coupon.discountValue; // flat in paise
        }
        await prisma.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: coupon.usedCount + 1 }
        });
      }
    }
    
    // 4. Loyalty points redemption
    let loyaltyDiscountPaise = 0;
    let pointsToRedeem = parseInt(loyaltyPointsToRedeem || 0);
    if (pointsToRedeem > 0) {
      if (customer.loyaltyPoints < pointsToRedeem) {
        return res.status(400).json({ error: 'Insufficient loyalty points' });
      }
      if (pointsToRedeem < loyaltySettings.minPointsToRedeem) {
        return res.status(400).json({ error: `Minimum points to redeem is ${loyaltySettings.minPointsToRedeem}` });
      }
      // Value: points * redemptionRate (paise)
      loyaltyDiscountPaise = pointsToRedeem * loyaltySettings.redemptionRate;
    }
    
    const totalDeductions = itemDiscount + couponDiscount + loyaltyDiscountPaise;
    const finalGrandTotal = Math.max(0, subtotal + parseInt(shippingCharges || 0) - totalDeductions + (items.some(i => !i.isTaxInclusive) ? taxAmount : 0));
    
    // Calculate loyalty points earned
    // Earn rate: points per Rupee spent. e.g. 0.01 = 1 point per 100 Rs
    let pointsEarned = 0;
    const rupeeAmount = finalGrandTotal / 100;
    if (finalGrandTotal >= loyaltySettings.minBillValue) {
      pointsEarned = Math.floor(rupeeAmount * loyaltySettings.earnRate);
    }
    
    // Generate Invoice Number
    const invoiceCount = await prisma.invoice.count();
    const invoiceNumber = `INV-${Date.now()}-${invoiceCount + 1}`;
    
    // 5. Create Invoice in DB
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: customer.id,
        staffId: req.staff.id,
        subtotal,
        discount: totalDeductions,
        taxAmount,
        grandTotal: finalGrandTotal,
        loyaltyPointsEarned: pointsEarned,
        loyaltyPointsRedeemed: pointsToRedeem,
        couponId: coupon ? coupon.id : null,
        status: 'COMPLETED',
        channel: channel || 'COUNTER_1',
        invoiceItems: {
          create: invoiceItemsData
        }
      }
    });
    
    // 6. Record Payments
    let totalPaid = 0;
    for (const p of payments) {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          paymentMode: p.mode,
          amount: parseInt(p.amount),
          status: 'SUCCESS'
        }
      });
      totalPaid += parseInt(p.amount);
    }
    
    // Handle split payment check/credits
    // If client paid less than grandTotal, add remaining to Customer credit balance (CREDIT payment mode)
    if (totalPaid < finalGrandTotal) {
      const creditRemaining = finalGrandTotal - totalPaid;
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          paymentMode: 'CREDIT',
          amount: creditRemaining,
          status: 'SUCCESS'
        }
      });
      // Increase customer openingBalance (which acts as receivable)
      await prisma.customer.update({
        where: { id: customer.id },
        data: { openingBalance: customer.openingBalance + creditRemaining }
      });
    }
    
    // 7. Update Customer Loyalty Balance
    const loyaltyNet = pointsEarned - pointsToRedeem;
    await prisma.customer.update({
      where: { id: customer.id },
      data: { loyaltyPoints: customer.loyaltyPoints + loyaltyNet }
    });
    
    // Record Loyalty Transactions
    if (pointsEarned > 0) {
      await prisma.loyaltyTransaction.create({
        data: {
          customerId: customer.id,
          points: pointsEarned,
          type: 'EARN',
          referenceId: invoiceNumber
        }
      });
    }
    if (pointsToRedeem > 0) {
      await prisma.loyaltyTransaction.create({
        data: {
          customerId: customer.id,
          points: -pointsToRedeem,
          type: 'REDEEM',
          referenceId: invoiceNumber
        }
      });
    }
    
    // 8. Update Stock QtyOnHand & Stock Ledger
    for (const update of stockUpdates) {
      if (update.batchId) {
        await prisma.batch.update({
          where: { id: update.batchId },
          data: { qtyOnHand: { decrement: update.qty } }
        });
      } else {
        await prisma.product.update({
          where: { id: update.id },
          data: { qtyOnHand: update.qty }
        });
      }
    }
    
    for (const action of stockLedgerActions) {
      await prisma.stockLedger.create({
        data: {
          productId: action.productId,
          quantity: action.quantity,
          type: action.type,
          referenceId: invoiceNumber
        }
      });
    }
    
    await logAudit(req.staff.id, req.staff.name, 'POS/Billing', 'Checkout Invoice', null, invoice);
    
    // Return complete invoice details with customer loyalty info
    const fullInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: {
        invoiceItems: { include: { product: true } },
        payments: true,
        customer: true,
        staff: true
      }
    });
    
    res.json(fullInvoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all invoices
router.get('/invoices', authenticateToken, async (req, res) => {
  try {
    const list = await prisma.invoice.findMany({
      include: { customer: true, staff: true, payments: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single invoice by invoice number
router.get('/invoices/:invoiceNumber', authenticateToken, async (req, res) => {
  const { invoiceNumber } = req.params;
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: { customer: true, staff: true, payments: true, items: { include: { product: true } } }
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all cashier shift sessions
router.get('/shifts', authenticateToken, async (req, res) => {
  try {
    const list = await prisma.shift.findMany({
      include: { staff: true },
      orderBy: { openedAt: 'desc' }
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Process Return / Refund from Invoice Barcode scan
router.post('/refund', authenticateToken, checkPermission('POS/Billing', 'add'), async (req, res) => {
  const { invoiceNumber, itemsToReturn } = req.body; // array of { productId, batchId, qty }
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: { items: true }
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    for (const item of itemsToReturn) {
      const pid = parseInt(item.productId);
      const qty = parseInt(item.qty);
      
      // Increment overall product stock
      await prisma.product.update({
        where: { id: pid },
        data: { qtyOnHand: { increment: qty } }
      });
      
      // Increment batch stock if batchId is provided
      if (item.batchId) {
        await prisma.batch.update({
          where: { id: parseInt(item.batchId) },
          data: { qtyOnHand: { increment: qty } }
        });
      }
      
      // Add StockLedger entry
      await prisma.stockLedger.create({
        data: {
          productId: pid,
          quantity: qty,
          type: 'RETURN',
          reason: `Returned from invoice ${invoiceNumber}`
        }
      });
    }
    
    // Log Audit Trail
    await logAudit(req.staff.id, req.staff.name, 'POS/Billing', 'Process Refund Return', null, { invoiceNumber, itemsCount: itemsToReturn.length });
    res.json({ success: true, message: 'Returned items successfully processed, stock levels updated!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
