const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'nm-supermarket-secret-key-12345';

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access token required' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const staff = await prisma.staff.findUnique({
      where: { id: decoded.id },
      include: { role: { include: { permissions: true } } }
    });
    
    if (!staff || staff.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account is suspended or invalid' });
    }
    
    req.staff = staff;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function checkPermission(module, action) {
  return (req, res, next) => {
    // Admin has all permissions
    if (req.staff.role.name === 'Admin') {
      return next();
    }
    
    const hasPerm = req.staff.role.permissions.some(
      p => p.module === module && (p.action === action || p.action === 'all')
    );
    
    if (!hasPerm) {
      return res.status(403).json({ error: `Permission denied: ${action} on ${module}` });
    }
    next();
  };
}

async function logAudit(staffId, staffName, module, action, beforeJson = null, afterJson = null) {
  try {
    await prisma.auditLog.create({
      data: {
        staffId,
        staffName,
        module,
        action,
        beforeJson: beforeJson ? JSON.stringify(beforeJson) : null,
        afterJson: afterJson ? JSON.stringify(afterJson) : null
      }
    });
  } catch (err) {
    console.error('Audit logging failed:', err);
  }
}

module.exports = { authenticateToken, checkPermission, logAudit };
