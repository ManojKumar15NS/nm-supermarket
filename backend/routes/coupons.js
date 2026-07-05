const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken, checkPermission, logAudit } = require('../middleware/auth');

// Get all coupons
router.get('/', authenticateToken, checkPermission('Coupons/Loyalty', 'view'), async (req, res) => {
  try {
    const list = await prisma.coupon.findMany();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create coupon
router.post('/', authenticateToken, checkPermission('Coupons/Loyalty', 'add'), async (req, res) => {
  const data = req.body;
  try {
    const coupon = await prisma.coupon.create({
      data: {
        code: data.code,
        discountType: data.discountType,
        discountValue: parseInt(data.discountValue),
        minBillValue: parseInt(data.minBillValue || 0),
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        usageLimit: parseInt(data.usageLimit || 9999)
      }
    });
    await logAudit(req.staff.id, req.staff.name, 'Coupons/Loyalty', 'Create Coupon', null, coupon);
    res.json(coupon);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Loyalty Settings Get
router.get('/loyalty-settings', authenticateToken, async (req, res) => {
  try {
    let settings = await prisma.loyaltySettings.findFirst();
    if (!settings) {
      settings = await prisma.loyaltySettings.create({
        data: {
          earnRate: 0.01,
          redemptionRate: 100,
          minPointsToRedeem: 10,
          enableExpiry: false,
          expiryDays: 365,
          minBillValue: 0
        }
      });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Loyalty Settings Save
router.put('/loyalty-settings', authenticateToken, checkPermission('Settings/GST config', 'edit'), async (req, res) => {
  const data = req.body;
  try {
    let settings = await prisma.loyaltySettings.findFirst();
    let updated;
    if (settings) {
      updated = await prisma.loyaltySettings.update({
        where: { id: settings.id },
        data: {
          earnRate: parseFloat(data.earnRate),
          redemptionRate: parseInt(data.redemptionRate),
          minPointsToRedeem: parseInt(data.minPointsToRedeem),
          enableExpiry: data.enableExpiry === true,
          expiryDays: parseInt(data.expiryDays),
          minBillValue: parseInt(data.minBillValue)
        }
      });
    } else {
      updated = await prisma.loyaltySettings.create({
        data: {
          earnRate: parseFloat(data.earnRate),
          redemptionRate: parseInt(data.redemptionRate),
          minPointsToRedeem: parseInt(data.minPointsToRedeem),
          enableExpiry: data.enableExpiry === true,
          expiryDays: parseInt(data.expiryDays),
          minBillValue: parseInt(data.minBillValue)
        }
      });
    }
    await logAudit(req.staff.id, req.staff.name, 'Settings/GST config', 'Update Loyalty Settings', settings, updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
