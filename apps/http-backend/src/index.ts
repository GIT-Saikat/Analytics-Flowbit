import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from 'db';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ========================================
// INVOICE ENDPOINTS
// ========================================

// Get all invoices with optional filtering
app.get('/api/invoices', async (req: Request, res: Response) => {
  try {
    const { status, vendorId, customerId, startDate, endDate } = req.query;
    
    const where: any = {};
    
    if (status) where.status = status;
    if (vendorId) where.vendorId = vendorId;
    if (customerId) where.customerId = customerId;
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate as string);
      if (endDate) where.invoiceDate.lte = new Date(endDate as string);
    }
    
    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        vendor: true,
        customer: true,
        lineItems: true,
        payments: true,
      },
      orderBy: {
        invoiceDate: 'desc',
      },
    });
    
    res.json({
      success: true,
      count: invoices.length,
      data: invoices,
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoices',
    });
  }
});

// Get single invoice by ID
app.get('/api/invoices/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        vendor: true,
        customer: true,
        lineItems: true,
        payments: true,
      },
    });
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }
    
    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoice',
    });
  }
});

// Get invoice statistics
app.get('/api/invoices/stats/summary', async (req: Request, res: Response) => {
  try {
    const [
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      totalAmount,
      paidAmount,
    ] = await Promise.all([
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: 'PAID' } }),
      prisma.invoice.count({ where: { status: 'PENDING' } }),
      prisma.invoice.count({ where: { status: 'OVERDUE' } }),
      prisma.invoice.aggregate({
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { status: 'PAID' },
        _sum: { totalAmount: true },
      }),
    ]);
    
    res.json({
      success: true,
      data: {
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        totalAmount: totalAmount._sum.totalAmount || 0,
        paidAmount: paidAmount._sum.totalAmount || 0,
        pendingAmount: (totalAmount._sum.totalAmount || 0) - (paidAmount._sum.totalAmount || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoice statistics',
    });
  }
});

// ========================================
// VENDOR ENDPOINTS
// ========================================

// Get all vendors
app.get('/api/vendors', async (req: Request, res: Response) => {
  try {
    const vendors = await prisma.vendor.findMany({
      include: {
        _count: {
          select: { invoices: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    res.json({
      success: true,
      count: vendors.length,
      data: vendors,
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vendors',
    });
  }
});

// Get single vendor by ID with invoices
app.get('/api/vendors/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        invoices: {
          include: {
            customer: true,
            lineItems: true,
            payments: true,
          },
        },
      },
    });
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found',
      });
    }
    
    res.json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vendor',
    });
  }
});

// ========================================
// CUSTOMER ENDPOINTS
// ========================================

// Get all customers
app.get('/api/customers', async (req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        _count: {
          select: { invoices: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    res.json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customers',
    });
  }
});

// Get single customer by ID with invoices
app.get('/api/customers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        invoices: {
          include: {
            vendor: true,
            lineItems: true,
            payments: true,
          },
        },
      },
    });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
    }
    
    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer',
    });
  }
});

// ========================================
// PAYMENT ENDPOINTS
// ========================================

// Get all payments
app.get('/api/payments', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where: any = {};
    
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate as string);
      if (endDate) where.paymentDate.lte = new Date(endDate as string);
    }
    
    const payments = await prisma.payment.findMany({
      where,
      include: {
        invoice: {
          include: {
            vendor: true,
            customer: true,
          },
        },
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });
    
    res.json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payments',
    });
  }
});

// ========================================
// ANALYTICS ENDPOINTS
// ========================================

// Revenue by month
app.get('/api/analytics/revenue-by-month', async (req: Request, res: Response) => {
  try {
    const invoices = await prisma.invoice.findMany({
      select: {
        invoiceDate: true,
        totalAmount: true,
        status: true,
      },
    });
    
    // Group by month
    const revenueByMonth: { [key: string]: { total: number; paid: number; pending: number } } = {};
    
    invoices.forEach((invoice: { invoiceDate: Date; totalAmount: number; status: string }) => {
      const monthKey = invoice.invoiceDate.toISOString().substring(0, 7); // YYYY-MM
      
      if (!revenueByMonth[monthKey]) {
        revenueByMonth[monthKey] = { total: 0, paid: 0, pending: 0 };
      }
      
      const monthData = revenueByMonth[monthKey];
      if (monthData) {
        monthData.total += invoice.totalAmount;
        if (invoice.status === 'PAID') {
          monthData.paid += invoice.totalAmount;
        } else {
          monthData.pending += invoice.totalAmount;
        }
      }
    });
    
    const result = Object.entries(revenueByMonth)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching revenue by month:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue data',
    });
  }
});

// Top vendors by total amount
app.get('/api/analytics/top-vendors', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    const vendors = await prisma.vendor.findMany({
      include: {
        invoices: {
          select: {
            totalAmount: true,
          },
        },
      },
    });
    
    const vendorsWithTotal = vendors.map((vendor: { id: string; name: string; email: string | null; invoices: { totalAmount: number }[] }) => ({
      id: vendor.id,
      name: vendor.name,
      email: vendor.email,
      totalAmount: vendor.invoices.reduce((sum: number, inv: { totalAmount: number }) => sum + inv.totalAmount, 0),
      invoiceCount: vendor.invoices.length,
    }));
    
    vendorsWithTotal.sort((a: { totalAmount: number }, b: { totalAmount: number }) => b.totalAmount - a.totalAmount);
    
    res.json({
      success: true,
      data: vendorsWithTotal.slice(0, limit),
    });
  } catch (error) {
    console.error('Error fetching top vendors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top vendors',
    });
  }
});

// Top customers by total amount
app.get('/api/analytics/top-customers', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    const customers = await prisma.customer.findMany({
      include: {
        invoices: {
          select: {
            totalAmount: true,
          },
        },
      },
    });
    
    const customersWithTotal = customers.map((customer: { id: string; name: string; email: string | null; invoices: { totalAmount: number }[] }) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      totalAmount: customer.invoices.reduce((sum: number, inv: { totalAmount: number }) => sum + inv.totalAmount, 0),
      invoiceCount: customer.invoices.length,
    }));
    
    customersWithTotal.sort((a: { totalAmount: number }, b: { totalAmount: number }) => b.totalAmount - a.totalAmount);
    
    res.json({
      success: true,
      data: customersWithTotal.slice(0, limit),
    });
  } catch (error) {
    console.error('Error fetching top customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top customers',
    });
  }
});

// ========================================
// VANNA AI ENDPOINT (for natural language queries)
// ========================================

// This endpoint can be used by Vanna AI to get database schema info
app.get('/api/vanna/schema', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        tables: [
          {
            name: 'Vendor',
            fields: ['id', 'name', 'email', 'phone', 'address', 'city', 'state', 'country', 'postalCode', 'taxId'],
          },
          {
            name: 'Customer',
            fields: ['id', 'name', 'email', 'phone', 'address', 'city', 'state', 'country', 'postalCode', 'taxId'],
          },
          {
            name: 'Invoice',
            fields: ['id', 'invoiceNumber', 'invoiceDate', 'dueDate', 'status', 'subtotal', 'taxAmount', 'discountAmount', 'totalAmount', 'currency', 'vendorId', 'customerId'],
          },
          {
            name: 'LineItem',
            fields: ['id', 'description', 'quantity', 'unitPrice', 'amount', 'taxRate', 'invoiceId'],
          },
          {
            name: 'Payment',
            fields: ['id', 'paymentDate', 'amount', 'paymentMethod', 'referenceNumber', 'invoiceId'],
          },
        ],
      },
    });
  } catch (error) {
    console.error('Error fetching schema:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch schema',
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📄 API Base URL: http://localhost:${PORT}/api`);
});

