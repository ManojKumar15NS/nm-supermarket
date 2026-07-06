const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();

// Auto-run schema push and seed if database is empty (Self-healing cloud deployment)
async function initializeDatabase() {
  try {
    console.log('Database status check in progress...');
    
    // Automatically run db push on startup (creates tables in Supabase/Neon/Render without local command line)
    console.log('Synchronizing database schema (npx prisma db push)...');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    
    const staffCount = await prisma.staff.count();
    if (staffCount === 0) {
      console.log('Zero staff accounts found. Bootstrapping initial seed data...');
      execSync('node seed.js', { stdio: 'inherit' });
      console.log('Database seeded successfully with default credentials!');
    } else {
      console.log('Database is already synchronized and contains staff records.');
    }
  } catch (err) {
    console.error('Database initialization / self-healing failed:', err.message);
  }
}

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const productsRoutes = require('./routes/products');
const customersRoutes = require('./routes/customers');
const staffRoutes = require('./routes/staff');
const salesRoutes = require('./routes/sales');
const couponsRoutes = require('./routes/coupons');
const reportsRoutes = require('./routes/reports');
const purchasesRoutes = require('./routes/purchases');
const auditRoutes = require('./routes/audit');

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/audit', auditRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeDatabase();
});
