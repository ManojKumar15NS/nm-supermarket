const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken, checkPermission } = require('../middleware/auth');

router.get('/', authenticateToken, checkPermission('Staff Management', 'view'), async (req, res) => {
  const { module, search } = req.query;
  let where = {};
  if (module) where.module = module;
  if (search) {
    where.OR = [
      { action: { contains: search } },
      { staffName: { contains: search } }
    ];
  }
  try {
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
