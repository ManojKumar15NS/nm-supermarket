const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken } = require('../middleware/auth');

router.get('/stats', authenticateToken, async (req, res) => {
  const { startDate, endDate, locationId, channel } = req.query;
  
  // Date filters
  const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0,0,0,0));
  const end = endDate ? new Date(new Date(endDate).setHours(23,59,59,999)) : new Date(new Date().setHours(23,59,59,999));
  
  let dateQuery = {
    createdAt: {
      gte: start,
      lte: end
    }
  };
  
  // Filters
  let invoiceFilter = {
    ...dateQuery,
    status: 'COMPLETED'
  };
  if (locationId) invoiceFilter.locationId = locationId;
  if (channel) invoiceFilter.channel = channel;
  
  try {
    const invoices = await prisma.invoice.findMany({
      where: invoiceFilter,
      include: { invoiceItems: { include: { product: true } }, payments: true }
    });
    
    // KPI calculations
    let totalSales = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let soldQty = 0;
    let grossProfit = 0;
    let cashInHand = 0;
    
    invoices.forEach(inv => {
      totalSales += inv.grandTotal;
      totalDiscount += inv.discount;
      totalTax += inv.taxAmount;
      
      inv.invoiceItems.forEach(item => {
        soldQty += item.qty;
        // profit = (sellingPrice - purchasePrice) * qty
        const purchase = item.product ? item.product.purchasePrice : 0;
        grossProfit += (item.sellingPrice - purchase) * item.qty - item.discount;
      });
      
      inv.payments.forEach(pay => {
        if (pay.paymentMode === 'CASH') {
          cashInHand += pay.amount;
        }
      });
    });
    
    // Add opening balance of customers to "To Receive"
    const customers = await prisma.customer.findMany();
    let toReceive = 0;
    customers.forEach(c => {
      if (c.openingBalance > 0) toReceive += c.openingBalance;
    });
    
    // Calculate total credit sales
    const creditPayments = await prisma.payment.findMany({
      where: { paymentMode: 'CREDIT', status: 'SUCCESS' }
    });
    let creditSales = 0;
    creditPayments.forEach(p => creditSales += p.amount);
    toReceive += creditSales;
    
    const totalCustomers = customers.length;
    const totalProducts = await prisma.product.count({ where: { status: 'ACTIVE' } });
    
    // Stock value and count
    const products = await prisma.product.findMany({ where: { status: 'ACTIVE' } });
    let stockQty = 0;
    let stockValue = 0;
    products.forEach(p => {
      stockQty += p.qtyOnHand;
      stockValue += p.qtyOnHand * p.purchasePrice;
    });
    
    const avgCartValue = invoices.length > 0 ? Math.round(totalSales / invoices.length) : 0;
    
    // Segmentation thresholds from simple editable mock settings
    const vipThreshold = 500000; // 5000 Rs
    const atRiskDays = 60;
    const lostDays = 180;
    
    let vipCount = 0;
    let regularCount = 0;
    let atRiskCount = 0;
    let lostCount = 0;
    
    const now = new Date();
    for (const c of customers) {
      // Find customer lifetime spend
      const custInvoices = await prisma.invoice.findMany({
        where: { customerId: c.id, status: 'COMPLETED' }
      });
      const spend = custInvoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
      
      // Find last visit
      let lastVisit = c.createdAt;
      if (custInvoices.length > 0) {
        lastVisit = new Date(Math.max(...custInvoices.map(i => new Date(i.createdAt))));
      }
      
      const diffTime = Math.abs(now - lastVisit);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= lostDays) {
        lostCount++;
      } else if (diffDays >= atRiskDays) {
        atRiskCount++;
      } else if (spend > vipThreshold) {
        vipCount++;
      } else {
        regularCount++;
      }
    }
    
    // Payment mode bar chart data
    const paymentModes = ['CASH', 'CARD', 'UPI', 'BANK', 'WALLET', 'CHEQUE', 'CREDIT'];
    const modeCounts = {};
    paymentModes.forEach(m => modeCounts[m] = 0);
    
    invoices.forEach(inv => {
      inv.payments.forEach(p => {
        if (modeCounts[p.paymentMode] !== undefined) {
          modeCounts[p.paymentMode] += p.amount;
        }
      });
    });
    
    const paymentModeData = Object.keys(modeCounts).map(mode => ({
      name: mode,
      value: modeCounts[mode] / 100 // in Rs
    }));
    
    // Charts: Sales vs Purchase (daily)
    // Group invoices by day
    const dailyData = {};
    invoices.forEach(inv => {
      const day = inv.createdAt.toISOString().split('T')[0];
      if (!dailyData[day]) {
        dailyData[day] = { name: day, sales: 0, purchase: 0 };
      }
      dailyData[day].sales += inv.grandTotal / 100;
    });
    
    // Fill in daily purchases from StockLedger
    const ledgers = await prisma.stockLedger.findMany({
      where: {
        type: 'PURCHASE',
        timestamp: { gte: start, lte: end }
      },
      include: { product: true }
    });
    
    ledgers.forEach(l => {
      const day = l.timestamp.toISOString().split('T')[0];
      if (!dailyData[day]) {
        dailyData[day] = { name: day, sales: 0, purchase: 0 };
      }
      const cost = l.product ? l.product.purchasePrice : 0;
      dailyData[day].purchase += (l.quantity * cost) / 100;
    });
    
    const salesPurchaseChart = Object.values(dailyData).sort((a,b) => a.name.localeCompare(b.name));
    
    // Top 20 customers
    const customerSales = [];
    for (const c of customers.slice(0, 20)) {
      const cInvs = await prisma.invoice.findMany({ where: { customerId: c.id, status: 'COMPLETED' } });
      const totalSpend = cInvs.reduce((acc, i) => acc + i.grandTotal, 0);
      customerSales.push({
        id: c.id,
        name: c.name,
        bills: cInvs.length,
        amount: totalSpend / 100
      });
    }
    customerSales.sort((a,b) => b.amount - a.amount);
    
    // Category sales
    const categories = await prisma.category.findMany();
    const categorySales = [];
    for (const cat of categories) {
      const catProducts = await prisma.product.findMany({ where: { categoryId: cat.id } });
      const pIds = catProducts.map(p => p.id);
      
      const items = await prisma.invoiceItem.findMany({
        where: {
          productId: { in: pIds },
          invoice: invoiceFilter
        },
        include: { product: true }
      });
      
      let qty = 0;
      let amount = 0;
      let profit = 0;
      
      items.forEach(item => {
        qty += item.qty;
        amount += item.netAmount;
        const purchase = item.product ? item.product.purchasePrice : 0;
        profit += (item.sellingPrice - purchase) * item.qty - item.discount;
      });
      
      categorySales.push({
        category: cat.name,
        qty,
        amount: amount / 100,
        profit: profit / 100
      });
    }
    
    // Staff sales today
    const staffList = await prisma.staff.findMany();
    const today = new Date();
    const todayStart = new Date(today.setHours(0,0,0,0));
    const todayEnd = new Date(today.setHours(23,59,59,999));
    
    const staffSalesToday = [];
    for (const st of staffList) {
      const stInvs = await prisma.invoice.findMany({
        where: {
          staffId: st.id,
          status: 'COMPLETED',
          createdAt: { gte: todayStart, lte: todayEnd }
        }
      });
      const stSales = stInvs.reduce((acc, i) => acc + i.grandTotal, 0);
      staffSalesToday.push({
        id: st.id,
        name: st.name,
        username: st.username,
        bills: stInvs.length,
        sales: stSales / 100
      });
    }
    
    // Best & Least Selling
    const productStats = {};
    const allInvoiceItems = await prisma.invoiceItem.findMany({
      where: { invoice: invoiceFilter },
      include: { product: true }
    });
    
    allInvoiceItems.forEach(item => {
      const pid = item.productId;
      if (!productStats[pid]) {
        productStats[pid] = {
          name: item.product ? item.product.name : 'Unknown Product',
          qty: 0,
          bills: 0,
          amount: 0,
          profit: 0
        };
      }
      productStats[pid].qty += item.qty;
      productStats[pid].bills += 1;
      productStats[pid].amount += item.netAmount;
      const purchase = item.product ? item.product.purchasePrice : 0;
      productStats[pid].profit += (item.sellingPrice - purchase) * item.qty - item.discount;
    });
    
    const sortedProductStats = Object.values(productStats).sort((a,b) => b.qty - a.qty);
    const bestSelling = sortedProductStats.slice(0, 10).map(x => ({ ...x, amount: x.amount / 100, profit: x.profit / 100 }));
    const leastSelling = sortedProductStats.reverse().slice(0, 10).map(x => ({ ...x, amount: x.amount / 100, profit: x.profit / 100 }));
    
    res.json({
      kpis: {
        totalSales: totalSales / 100,
        totalInvoices: invoices.length,
        soldQty,
        totalCustomers,
        toReceive: toReceive / 100,
        salesReturn: 0, // stubbed return values for returns
        totalProducts,
        stockQty,
        stockValue: stockValue / 100,
        cashInHand: cashInHand / 100,
        grossProfit: grossProfit / 100,
        avgProfitMarginPct: totalSales > 0 ? Math.round((grossProfit / totalSales) * 100) : 0,
        avgCartValue: avgCartValue / 100,
        avgBillsPerDay: Math.round(invoices.length / Math.max(1, (end - start) / (1000*60*60*24)))
      },
      customerSegmentation: {
        vip: vipCount,
        regular: regularCount,
        atRisk: atRiskCount,
        lost: lostCount
      },
      paymentModeData,
      salesPurchaseChart,
      topCustomers: customerSales,
      categorySales,
      staffSalesToday,
      bestSelling,
      leastSelling
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
