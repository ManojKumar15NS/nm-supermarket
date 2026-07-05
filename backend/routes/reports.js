const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken, checkPermission } = require('../middleware/auth');

router.get('/sales-summary', authenticateToken, checkPermission('Reports', 'view'), async (req, res) => {
  const { startDate, endDate } = req.query;
  const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0,0,0,0));
  const end = endDate ? new Date(new Date(endDate).setHours(23,59,59,999)) : new Date(new Date().setHours(23,59,59,999));
  
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: 'COMPLETED'
      },
      include: { customer: true, payments: true }
    });
    
    let totalSales = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    
    const records = invoices.map(i => {
      totalSales += i.grandTotal;
      totalDiscount += i.discount;
      totalTax += i.taxAmount;
      
      return {
        invoiceNumber: i.invoiceNumber,
        customer: i.customer.name,
        customerPhone: i.customer.phone,
        subtotal: i.subtotal / 100,
        discount: i.discount / 100,
        tax: i.taxAmount / 100,
        total: i.grandTotal / 100,
        date: i.createdAt.toISOString().split('T')[0],
        payments: i.payments.map(p => p.paymentMode).join(', ')
      };
    });
    
    res.json({
      summary: {
        totalSales: totalSales / 100,
        totalDiscount: totalDiscount / 100,
        totalTax: totalTax / 100,
        count: invoices.length
      },
      records
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/gst-summary', authenticateToken, checkPermission('Reports', 'view'), async (req, res) => {
  const { startDate, endDate } = req.query;
  const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0,0,0,0));
  const end = endDate ? new Date(new Date(endDate).setHours(23,59,59,999)) : new Date(new Date().setHours(23,59,59,999));
  
  try {
    const items = await prisma.invoiceItem.findMany({
      where: {
        invoice: {
          createdAt: { gte: start, lte: end },
          status: 'COMPLETED'
        }
      },
      include: { product: true }
    });
    
    // Group by HSN and Tax Slab
    const summary = {};
    
    items.forEach(item => {
      const hsn = item.product ? item.product.itemCode || 'N/A' : 'N/A';
      const rate = item.taxPct;
      const key = `${hsn}-${rate}`;
      
      if (!summary[key]) {
        summary[key] = {
          hsn,
          taxRate: rate,
          taxableValue: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          cess: 0,
          totalTax: 0
        };
      }
      
      const netVal = item.netAmount - item.taxAmount;
      summary[key].taxableValue += netVal;
      summary[key].totalTax += item.taxAmount;
      
      // Auto splits
      // Intra-state default (CGST 50%, SGST 50%)
      const cgstVal = Math.round(item.taxAmount / 2);
      const sgstVal = item.taxAmount - cgstVal;
      
      summary[key].cgst += cgstVal;
      summary[key].sgst += sgstVal;
    });
    
    const formatted = Object.values(summary).map(x => ({
      hsn: x.hsn,
      taxRate: x.taxRate,
      taxableValue: x.taxableValue / 100,
      cgst: x.cgst / 100,
      sgst: x.sgst / 100,
      igst: x.igst / 100,
      cess: x.cess / 100,
      totalTax: x.totalTax / 100
    }));
    
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/profit-loss', authenticateToken, checkPermission('Reports', 'view'), async (req, res) => {
  const { startDate, endDate } = req.query;
  const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0,0,0,0));
  const end = endDate ? new Date(new Date(endDate).setHours(23,59,59,999)) : new Date(new Date().setHours(23,59,59,999));
  
  try {
    const items = await prisma.invoiceItem.findMany({
      where: {
        invoice: {
          createdAt: { gte: start, lte: end },
          status: 'COMPLETED'
        }
      },
      include: { product: true }
    });
    
    let salesRevenue = 0;
    let totalCostOfGoods = 0;
    let netSalesDiscount = 0;
    
    items.forEach(item => {
      salesRevenue += item.sellingPrice * item.qty;
      const purchase = item.product ? item.product.purchasePrice : 0;
      totalCostOfGoods += purchase * item.qty;
      netSalesDiscount += item.discount;
    });
    
    // Profit snapshot
    const grossProfit = salesRevenue - totalCostOfGoods - netSalesDiscount;
    
    res.json({
      revenue: salesRevenue / 100,
      cogs: totalCostOfGoods / 100,
      discount: netSalesDiscount / 100,
      grossProfit: grossProfit / 100,
      netProfit: grossProfit / 100 // stubbed expense items for now
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
