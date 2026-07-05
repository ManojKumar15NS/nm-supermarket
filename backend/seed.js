const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding started...');
  
  // 1. Clear database
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.stockLedger.deleteMany();
  await prisma.stockAdjustment.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.loyaltySettings.deleteMany();
  await prisma.coupon.deleteMany();
  
  console.log('Database cleared.');

  // 2. Roles
  const adminRole = await prisma.role.create({
    data: { name: 'Admin', description: 'System Administrator' }
  });
  const managerRole = await prisma.role.create({
    data: { name: 'Manager', description: 'Store Manager' }
  });
  const cashierRole = await prisma.role.create({
    data: { name: 'Cashier', description: 'Billing Cashier' }
  });
  const inventoryRole = await prisma.role.create({
    data: { name: 'Inventory Staff', description: 'Stock & Inventory Operator' }
  });
  
  // 3. Permissions Matrix (as defined in prompt)
  const permissionsData = [
    // Manager
    { roleId: managerRole.id, module: 'POS/Billing', action: 'all' },
    { roleId: managerRole.id, module: 'Inventory/Products', action: 'all' },
    { roleId: managerRole.id, module: 'Customers', action: 'all' },
    { roleId: managerRole.id, module: 'Purchases/Suppliers', action: 'all' },
    { roleId: managerRole.id, module: 'Reports', action: 'all' }, // manager gets reports
    { roleId: managerRole.id, module: 'Coupons/Loyalty', action: 'all' },
    
    // Cashier
    { roleId: cashierRole.id, module: 'POS/Billing', action: 'add' },
    { roleId: cashierRole.id, module: 'POS/Billing', action: 'view' },
    { roleId: cashierRole.id, module: 'Inventory/Products', action: 'view' },
    { roleId: cashierRole.id, module: 'Customers', action: 'add' },
    { roleId: cashierRole.id, module: 'Customers', action: 'view' },
    { roleId: cashierRole.id, module: 'Coupons/Loyalty', action: 'view' }, // for applying coupons
    
    // Inventory Staff
    { roleId: inventoryRole.id, module: 'Inventory/Products', action: 'all' },
    { roleId: inventoryRole.id, module: 'Purchases/Suppliers', action: 'all' },
    { roleId: inventoryRole.id, module: 'Reports', action: 'view' },
  ];
  
  for (const perm of permissionsData) {
    await prisma.permission.create({ data: perm });
  }

  // 4. Staff Accounts
  const rounds = 10;
  const adminPassword = await bcrypt.hash('admin123', rounds);
  const managerPassword = await bcrypt.hash('manager123', rounds);
  const cashierPassword = await bcrypt.hash('cashier123', rounds);
  
  const adminStaff = await prisma.staff.create({
    data: { username: 'admin', passwordHash: adminPassword, name: 'Admin User', phone: '9999999999', roleId: adminRole.id }
  });
  const managerStaff = await prisma.staff.create({
    data: { username: 'manager', passwordHash: managerPassword, name: 'Manager User', phone: '8888888888', roleId: managerRole.id }
  });
  const cashierStaff = await prisma.staff.create({
    data: { username: 'cashier', passwordHash: cashierPassword, name: 'Cashier User', phone: '7777777777', roleId: cashierRole.id }
  });

  // 5. Default Loyalty Settings
  await prisma.loyaltySettings.create({
    data: {
      earnRate: 0.01,         // 1 point per 100 Rs spent
      redemptionRate: 100,    // 1 point = 100 paise (1 Rs)
      minPointsToRedeem: 10,
      enableExpiry: false,
      expiryDays: 365,
      minBillValue: 0
    }
  });

  // 6. Coupons
  await prisma.coupon.create({
    data: {
      code: 'WELCOME10',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minBillValue: 50000, // 500 Rs
      startDate: new Date('2025-01-01'),
      endDate: new Date('2027-12-31')
    }
  });
  await prisma.coupon.create({
    data: {
      code: 'FESTIVE200',
      discountType: 'FLAT',
      discountValue: 20000, // 200 Rs
      minBillValue: 150000, // 1500 Rs
      startDate: new Date('2025-01-01'),
      endDate: new Date('2027-12-31')
    }
  });

  // 7. Categories & Brands
  const categories = ['Grocery', 'Dairy', 'Packaged Foods', 'Beverages', 'Personal Care', 'Household'];
  const catMap = {};
  for (const c of categories) {
    const dbCat = await prisma.category.create({ data: { name: c } });
    catMap[c] = dbCat.id;
  }
  
  const brands = ['Nestle', 'Amul', 'HUL', 'ITC', 'PepsiCo', 'Britannia'];
  const brandMap = {};
  for (const b of brands) {
    const dbBrand = await prisma.brand.create({ data: { name: b } });
    brandMap[b] = dbBrand.id;
  }

  // 8. Suppliers
  const suppliers = [
    { name: 'National Distributors', contactPerson: 'Rajesh Kumar', phone: '9123456789', email: 'rajesh@national.com', gstin: '27AAAAA1111A1Z1', address: 'Mumbai, Maharashtra' },
    { name: 'Apex Groceries Ltd', contactPerson: 'Amit Shah', phone: '9876543210', email: 'amit@apex.com', gstin: '33BBBBB2222B1Z2', address: 'Chennai, Tamil Nadu' }
  ];
  for (const s of suppliers) {
    await prisma.supplier.create({ data: s });
  }

  // 9. Products (at least 30 products)
  const productsData = [
    // Grocery (1-5)
    { name: 'Basmati Rice Premium 5kg', itemCode: '8901058002315', mrp: 75000, sellingPrice: 69900, purchasePrice: 55000, salesTaxPct: 5, category: 'Grocery', brand: 'ITC' },
    { name: 'Toor Dal Premium 1kg', itemCode: '8901058002322', mrp: 18000, sellingPrice: 16500, purchasePrice: 13000, salesTaxPct: 5, category: 'Grocery', brand: 'ITC' },
    { name: 'Refined Sunflower Oil 1L', itemCode: '8901234560012', mrp: 16000, sellingPrice: 14500, purchasePrice: 12000, salesTaxPct: 5, category: 'Grocery', brand: 'HUL' },
    { name: 'Sugar Crystal 1kg', itemCode: '8901234560029', mrp: 5000, sellingPrice: 4600, purchasePrice: 3800, salesTaxPct: 5, category: 'Grocery', brand: 'ITC' },
    { name: 'Wheat Flour / Atta 5kg', itemCode: '8901058002339', mrp: 28000, sellingPrice: 26000, purchasePrice: 21000, salesTaxPct: 5, category: 'Grocery', brand: 'ITC' },
    
    // Dairy (6-10)
    { name: 'Amul Fresh Milk 500ml', itemCode: '8901262010018', mrp: 3000, sellingPrice: 3000, purchasePrice: 2500, salesTaxPct: 0, category: 'Dairy', brand: 'Amul' },
    { name: 'Amul Butter 100g', itemCode: '8901262020017', mrp: 5800, sellingPrice: 5600, purchasePrice: 4800, salesTaxPct: 12, category: 'Dairy', brand: 'Amul' },
    { name: 'Amul Cheese Slices 200g', itemCode: '8901262030016', mrp: 14000, sellingPrice: 13500, purchasePrice: 11000, salesTaxPct: 12, category: 'Dairy', brand: 'Amul' },
    { name: 'Amul Paneer Fresh 200g', itemCode: '8901262040015', mrp: 9500, sellingPrice: 9000, purchasePrice: 7500, salesTaxPct: 5, category: 'Dairy', brand: 'Amul' },
    { name: 'Fresh Curd Cup 200g', itemCode: '8901262050014', mrp: 3500, sellingPrice: 3200, purchasePrice: 2600, salesTaxPct: 5, category: 'Dairy', brand: 'Amul' },
    
    // Packaged Foods (11-15)
    { name: 'Maggie Noodles 4-Pack', itemCode: '8901058895627', mrp: 6000, sellingPrice: 5800, purchasePrice: 4800, salesTaxPct: 18, category: 'Packaged Foods', brand: 'Nestle' },
    { name: 'Britannia Marie Gold 250g', itemCode: '8901063142278', mrp: 4000, sellingPrice: 3800, purchasePrice: 3000, salesTaxPct: 18, category: 'Packaged Foods', brand: 'Britannia' },
    { name: 'Ketchup Sweet & Sour 500g', itemCode: '8901058895634', mrp: 13000, sellingPrice: 12000, purchasePrice: 9500, salesTaxPct: 18, category: 'Packaged Foods', brand: 'Nestle' },
    { name: 'Corn Flakes Original 375g', itemCode: '8901234560111', mrp: 17500, sellingPrice: 16500, purchasePrice: 13500, salesTaxPct: 18, category: 'Packaged Foods', brand: 'HUL' },
    { name: 'Britannia Good Day Cookies', itemCode: '8901063142285', mrp: 3000, sellingPrice: 2800, purchasePrice: 2200, salesTaxPct: 18, category: 'Packaged Foods', brand: 'Britannia' },
    
    // Beverages (16-20)
    { name: 'Coca Cola Pet Bottle 1.25L', itemCode: '8901764012502', mrp: 7000, sellingPrice: 6500, purchasePrice: 5000, salesTaxPct: 28, category: 'Beverages', brand: 'PepsiCo' },
    { name: 'Nescafe Classic Coffee 100g', itemCode: '8901058895641', mrp: 32000, sellingPrice: 29900, purchasePrice: 24000, salesTaxPct: 18, category: 'Beverages', brand: 'Nestle' },
    { name: 'Taj Mahal Tea 250g', itemCode: '8901234560210', mrp: 19500, sellingPrice: 18500, purchasePrice: 15000, salesTaxPct: 5, category: 'Beverages', brand: 'HUL' },
    { name: 'Pepsi Can 300ml', itemCode: '8901764012519', mrp: 4000, sellingPrice: 3800, purchasePrice: 2800, salesTaxPct: 28, category: 'Beverages', brand: 'PepsiCo' },
    { name: 'Real Fruit Juice Mango 1L', itemCode: '8901764012526', mrp: 11000, sellingPrice: 10000, purchasePrice: 8000, salesTaxPct: 12, category: 'Beverages', brand: 'PepsiCo' },
    
    // Personal Care (21-25)
    { name: 'Dove Cream Bar Soap 100g', itemCode: '8901030753006', mrp: 6200, sellingPrice: 5800, purchasePrice: 4500, salesTaxPct: 18, category: 'Personal Care', brand: 'HUL' },
    { name: 'Colgate MaxFresh Gel 150g', itemCode: '8901030753013', mrp: 11500, sellingPrice: 10500, purchasePrice: 8200, salesTaxPct: 18, category: 'Personal Care', brand: 'HUL' },
    { name: 'Clinic Plus Shampoo 650ml', itemCode: '8901030753020', mrp: 32500, sellingPrice: 29900, purchasePrice: 23000, salesTaxPct: 18, category: 'Personal Care', brand: 'HUL' },
    { name: 'Dettol Handwash Refill 175ml', itemCode: '8901030753037', mrp: 9900, sellingPrice: 9500, purchasePrice: 7800, salesTaxPct: 18, category: 'Personal Care', brand: 'HUL' },
    { name: 'Pears Pure Soap 3-Pack', itemCode: '8901030753044', mrp: 18500, sellingPrice: 17500, purchasePrice: 14000, salesTaxPct: 18, category: 'Personal Care', brand: 'HUL' },
    
    // Household (26-30)
    { name: 'Surf Excel Easy Wash 1kg', itemCode: '8901030678002', mrp: 14000, sellingPrice: 13000, purchasePrice: 10200, salesTaxPct: 18, category: 'Household', brand: 'HUL' },
    { name: 'Vim Liquid Gel Dishwash 500ml', itemCode: '8901030678019', mrp: 12000, sellingPrice: 11500, purchasePrice: 9000, salesTaxPct: 18, category: 'Household', brand: 'HUL' },
    { name: 'Harpic Toilet Cleaner 1L', itemCode: '8901030678026', mrp: 21500, sellingPrice: 19900, purchasePrice: 15500, salesTaxPct: 18, category: 'Household', brand: 'HUL' },
    { name: 'Lizol Floor Cleaner 1L', itemCode: '8901030678033', mrp: 20500, sellingPrice: 18900, purchasePrice: 14800, salesTaxPct: 18, category: 'Household', brand: 'HUL' },
    { name: 'Comfort Fabric Conditioner 860ml', itemCode: '8901030678040', mrp: 24000, sellingPrice: 22000, purchasePrice: 17500, salesTaxPct: 18, category: 'Household', brand: 'HUL' }
  ];
  
  const createdProducts = [];
  for (const p of productsData) {
    const product = await prisma.product.create({
      data: {
        itemCode: p.itemCode,
        name: p.name,
        printName: p.name,
        categoryId: catMap[p.category],
        brandId: brandMap[p.brand],
        mrp: p.mrp,
        sellingPrice: p.sellingPrice,
        purchasePrice: p.purchasePrice,
        landingCost: p.purchasePrice,
        purchaseTaxPct: p.salesTaxPct,
        salesTaxPct: p.salesTaxPct,
        qtyOnHand: 100, // Stock seed
        isTaxInclusive: true
      }
    });
    
    createdProducts.push(product);
    
    // Create stock ledger opening stock
    await prisma.stockLedger.create({
      data: {
        productId: product.id,
        quantity: 100,
        type: 'PURCHASE',
        reason: 'Initial Seeding Stock'
      }
    });
  }

  // 10. Customers
  const customersData = [
    { name: 'Rahul Sharma', phone: '9812345678', email: 'rahul@gmail.com', openingBalance: 0, loyaltyPoints: 250 },
    { name: 'Priya Patel', phone: '9823456789', email: 'priya@gmail.com', openingBalance: 120000, loyaltyPoints: 120 }, // 1200 Rs opening balance due (To Receive)
    { name: 'Vijay Kumar', phone: '9834567890', email: 'vijay@gmail.com', openingBalance: 0, loyaltyPoints: 80 },
    { name: 'Sneha Reddy', phone: '9845678901', email: 'sneha@gmail.com', openingBalance: 0, loyaltyPoints: 400 },
    { name: 'Karthik Raja', phone: '9856789012', email: 'karthik@gmail.com', openingBalance: 0, loyaltyPoints: 15 },
    { name: 'Deepika Padukone', phone: '9867890123', email: 'deepika@gmail.com', openingBalance: 0, loyaltyPoints: 95 },
    { name: 'Virat Kohli', phone: '9878901234', email: 'virat@gmail.com', openingBalance: 0, loyaltyPoints: 1200 },
    { name: 'Anushka Sharma', phone: '9889012345', email: 'anushka@gmail.com', openingBalance: 0, loyaltyPoints: 450 },
    { name: 'Dhoni MS', phone: '9890123456', email: 'dhoni@gmail.com', openingBalance: 0, loyaltyPoints: 800 },
    { name: 'Rohit Sharma', phone: '9901234567', email: 'rohit@gmail.com', openingBalance: 50000, loyaltyPoints: 320 }  // 500 Rs due
  ];
  
  const createdCustomers = [];
  for (const c of customersData) {
    const cust = await prisma.customer.create({ data: c });
    createdCustomers.push(cust);
  }

  // 11. 40 Invoices spread over the last 30 days
  console.log('Seeding 40 invoices...');
  const now = new Date();
  
  for (let i = 1; i <= 40; i++) {
    // Generate dates: spread across 30 days
    const invoiceDate = new Date();
    invoiceDate.setDate(now.getDate() - Math.floor((i * 30) / 40));
    
    // Choose customer
    const customer = createdCustomers[i % createdCustomers.length];
    
    // Choose 2 to 4 random products
    const itemQty = 2 + (i % 3); 
    const selectedItems = [];
    let subtotal = 0;
    let taxAmount = 0;
    
    for (let k = 0; k < itemQty; k++) {
      const product = createdProducts[(i + k * 7) % createdProducts.length];
      const qty = 1 + (i % 2);
      const discount = 500 * (i % 3); // 5 Rs discount per unit
      const selling = product.sellingPrice;
      const netSelling = selling - discount;
      const taxable = netSelling * qty;
      
      const taxRate = product.salesTaxPct;
      const itemTax = Math.round(taxable - (taxable / (1 + taxRate/100)));
      
      subtotal += selling * qty;
      taxAmount += itemTax;
      
      selectedItems.push({
        productId: product.id,
        qty,
        mrp: product.mrp,
        sellingPrice: selling,
        discount: discount * qty,
        taxPct: taxRate,
        taxAmount: itemTax,
        netAmount: taxable
      });
      
      // Update stock
      await prisma.product.update({
        where: { id: product.id },
        data: { qtyOnHand: { decrement: qty } }
      });
      
      await prisma.stockLedger.create({
        data: {
          productId: product.id,
          quantity: -qty,
          type: 'SALE',
          timestamp: invoiceDate,
          reason: `Sale INV-${1000 + i}`
        }
      });
    }
    
    const totalDiscount = selectedItems.reduce((acc, item) => acc + item.discount, 0);
    const grandTotal = subtotal - totalDiscount;
    
    // Loyalty earn rate (1 point per 100 Rs = 0.01)
    const pointsEarned = Math.floor((grandTotal / 100) * 0.01);
    
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-SEED-${1000 + i}`,
        customerId: customer.id,
        staffId: cashierStaff.id,
        subtotal,
        discount: totalDiscount,
        taxAmount,
        grandTotal,
        loyaltyPointsEarned: pointsEarned,
        loyaltyPointsRedeemed: 0,
        status: 'COMPLETED',
        createdAt: invoiceDate,
        invoiceItems: {
          create: selectedItems
        }
      }
    });
    
    // Payments: CASH, CARD, UPI
    const paymentModes = ['CASH', 'CARD', 'UPI'];
    const mode = paymentModes[i % paymentModes.length];
    
    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        paymentMode: mode,
        amount: grandTotal,
        status: 'SUCCESS',
        timestamp: invoiceDate
      }
    });
    
    // Add loyalty transaction
    if (pointsEarned > 0) {
      await prisma.loyaltyTransaction.create({
        data: {
          customerId: customer.id,
          points: pointsEarned,
          type: 'EARN',
          referenceId: invoice.invoiceNumber,
          timestamp: invoiceDate
        }
      });
    }
  }
  
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
