const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken, checkPermission, logAudit } = require('../middleware/auth');

router.get('/', authenticateToken, checkPermission('Staff Management', 'view'), async (req, res) => {
  try {
    const list = await prisma.staff.findMany({
      include: { role: { include: { permissions: true } } }
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, checkPermission('Staff Management', 'add'), async (req, res) => {
  const data = req.body;
  try {
    const rounds = 10;
    const passwordHash = await bcrypt.hash(data.password, rounds);
    
    const user = await prisma.staff.create({
      data: {
        username: data.username,
        passwordHash,
        name: data.name,
        phone: data.phone,
        assignedLocationId: data.assignedLocationId || 'L001',
        roleId: parseInt(data.roleId),
        status: 'ACTIVE'
      }
    });
    
    await logAudit(req.staff.id, req.staff.name, 'Staff Management', 'Add Staff', null, user);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, checkPermission('Staff Management', 'edit'), async (req, res) => {
  const id = parseInt(req.params.id);
  const data = req.body;
  try {
    const before = await prisma.staff.findUnique({ where: { id } });
    
    let updateData = {
      name: data.name,
      phone: data.phone,
      assignedLocationId: data.assignedLocationId,
      roleId: parseInt(data.roleId),
      status: data.status
    };
    
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }
    
    const user = await prisma.staff.update({
      where: { id },
      data: updateData
    });
    
    await logAudit(req.staff.id, req.staff.name, 'Staff Management', 'Edit Staff', before, user);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Roles with Permissions endpoints
router.get('/roles', authenticateToken, async (req, res) => {
  try {
    const roles = await prisma.role.findMany({ include: { permissions: true } });
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/roles/:roleId/permissions', authenticateToken, checkPermission('Settings/GST config', 'edit'), async (req, res) => {
  const roleId = parseInt(req.params.roleId);
  const { permissions } = req.body; // Array of { module, action }
  try {
    // Delete existing permissions for role
    await prisma.permission.deleteMany({ where: { roleId } });
    
    // Add new permissions
    for (const p of permissions) {
      await prisma.permission.create({
        data: {
          roleId,
          module: p.module,
          action: p.action
        }
      });
    }
    
    await logAudit(req.staff.id, req.staff.name, 'Staff Management', 'Update Role Permissions', { roleId }, permissions);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
