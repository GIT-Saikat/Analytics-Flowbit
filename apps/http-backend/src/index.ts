import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

const pendingLikeStatuses: Prisma.InvoiceStatus[] = [
  Prisma.InvoiceStatus.PENDING,
  Prisma.InvoiceStatus.SENT,
  Prisma.InvoiceStatus.OVERDUE,
  Prisma.InvoiceStatus.PARTIALLY_PAID,
];
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 3005;
const isServerless = Boolean(process.env.VERCEL);

// Function to check and kill process on port (Windows-compatible)
async function ensurePortIsFree(port: number): Promise<void> {
  try {
    const { stdout } = await execAsync(
      `powershell -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"`,
      { windowsHide: true }
    );

    const pid = stdout.trim();
    if (pid && pid !== '') {
      console.log(`Port ${port} is in use by process ${pid}. Attempting to free it...`);
      await execAsync(`powershell -Command "Stop-Process -Id ${pid} -Force"`, { windowsHide: true });
      console.log(`Successfully freed port ${port}`);

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    // Port is likely free or command failed (non-Windows), continue anyway
    if (error instanceof Error && !error.message.includes('no matches')) {
      console.log(`Could not check port status (this is normal on non-Windows systems)`);
    }
  }
}

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());

app.get('/stats', async (req: Request, res: Response) => {
  try {
    const [
      totalInvoices,
      totalVendors,
      totalCustomers,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      totalAmount,
      paidAmount,
      totalPayments,
    ] = await Promise.all([
      prisma.invoice.count(),
      prisma.vendor.count(),
      prisma.customer.count(),
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
      prisma.payment.count(),
    ]);

    const pendingAmount = (totalAmount._sum.totalAmount || 0) - (paidAmount._sum.totalAmount || 0);
    
    res.json({
      success: true,
      data: {
        totalInvoices,
        totalVendors,
        totalCustomers,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        totalAmount: totalAmount._sum.totalAmount || 0,
        paidAmount: paidAmount._sum.totalAmount || 0,
        pendingAmount,
        totalPayments,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    });
  }
});

app.get('/invoice-trends', async (req: Request, res: Response) => {
  try {
    const invoices = await prisma.invoice.findMany({
      select: {
        invoiceDate: true,
        totalAmount: true,
        status: true,
      },
      orderBy: {
        invoiceDate: 'asc',
      },
    });
    
    const trendsByMonth: { 
      [key: string]: { 
        month: string;
        count: number;
        totalSpend: number;
        paidSpend: number;
        pendingSpend: number;
      } 
    } = {};
    
    invoices.forEach((invoice:{ invoiceDate: Date; totalAmount: number; status: string }) => {
      const date = new Date(invoice.invoiceDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!trendsByMonth[monthKey]) {
        trendsByMonth[monthKey] = { 
          month: monthKey,
          count: 0, 
          totalSpend: 0, 
          paidSpend: 0, 
          pendingSpend: 0 
        };
      }
      
      const monthData = trendsByMonth[monthKey];
      if (monthData) {
        monthData.count += 1;
        monthData.totalSpend += invoice.totalAmount;
        
        if (invoice.status === 'PAID') {
          monthData.paidSpend += invoice.totalAmount;
        } else if (invoice.status === 'PENDING' || invoice.status === 'OVERDUE' || invoice.status === 'SENT' || invoice.status === 'PARTIALLY_PAID') {
          monthData.pendingSpend += invoice.totalAmount;
        }
      }
    });
    
    const result = Object.values(trendsByMonth).sort((a, b) => a.month.localeCompare(b.month));
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching invoice trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoice trends',
    });
  }
});


app.get('/vendors/top10', async (req: Request, res: Response) => {
  try {
    const vendors = await prisma.vendor.findMany({
      include: {
        invoices: {
          select: {
            totalAmount: true,
            status: true,
          },
        },
      },
    });
    
    const vendorsWithSpend = vendors.map((vendor: (typeof vendors)[0]) => ({
      id: vendor.id,
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      totalSpend: vendor.invoices.reduce(
        (sum: number, inv: { totalAmount: number; status: string }) => sum + inv.totalAmount,
        0
      ),
      paidSpend: vendor.invoices
        .filter((inv: { totalAmount: number; status: string }) => inv.status === "PAID")
        .reduce(
          (sum: number, inv: { totalAmount: number; status: string }) => sum + inv.totalAmount,
          0
        ),
      invoiceCount: vendor.invoices.length,
    }));
    

    vendorsWithSpend.sort(
      (a: (typeof vendorsWithSpend)[0], b: (typeof vendorsWithSpend)[0]) =>
        b.totalSpend - a.totalSpend
    );
    
    res.json({
      success: true,
      data: vendorsWithSpend.slice(0, 10),
    });
  } catch (error) {
    console.error('Error fetching top vendors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top vendors',
    });
  }
});


app.get('/category-spend', async (req: Request, res: Response) => {
  try {
    const lineItems = await prisma.lineItem.findMany({
      select: {
        sachkonto: true,
        amount: true,
        description: true,
      },
    });
    
    const categoryMap: { 
      [key: string]: { 
        category: string;
        totalSpend: number;
        itemCount: number;
        description: string;
      } 
    } = {};
    
    lineItems.forEach((item: { sachkonto: string | null; amount: number; description: string }) => {
      const category = item.sachkonto || 'Uncategorized';
      
      if (!categoryMap[category]) {
        categoryMap[category] = {
          category,
          totalSpend: 0,
          itemCount: 0,
          description: item.description,
        };
      }
      
      const categoryData = categoryMap[category];
      if (categoryData) {
        categoryData.totalSpend += item.amount;
        categoryData.itemCount += 1;
      }
    });
    
    const result = Object.values(categoryMap).sort((a, b) => b.totalSpend - a.totalSpend);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching category spend:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category spend',
    });
  }
});

app.get('/cash-outflow', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: Prisma.InvoiceWhereInput = {
      status: {
        in: pendingLikeStatuses,
      },
    };

    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) where.dueDate.gte = new Date(startDate as string);
      if (endDate) where.dueDate.lte = new Date(endDate as string);
    }

    const unpaidInvoices = await prisma.invoice.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
        payments: {
          select: {
            amount: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });
    
    const outflowData = unpaidInvoices.map((invoice: (typeof unpaidInvoices)[0]) => {
      const paidAmount = invoice.payments.reduce((sum: number, payment: { amount: number }) => sum + payment.amount, 0);
      const remainingAmount = invoice.totalAmount - paidAmount;
      
      return {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        vendor: invoice.vendor.name,
        vendorId: invoice.vendor.id,
        dueDate: invoice.dueDate,
        totalAmount: invoice.totalAmount,
        paidAmount,
        remainingAmount,
        status: invoice.status,
        currency: invoice.currency,
      };
    });
    
    
    const outflowByDate: { [key: string]: number } = {};
    outflowData.forEach((item: (typeof outflowData)[0]) => {
      if (item.dueDate) {
        const dateKey = item.dueDate.toISOString().split('T')[0];
        if (dateKey) {
          outflowByDate[dateKey] = (outflowByDate[dateKey] || 0) + item.remainingAmount;
        }
      }
    });
    
    const totalExpectedOutflow = outflowData.reduce((sum: number, item: (typeof outflowData)[0]) => sum + item.remainingAmount, 0);
    
    res.json({
      success: true,
      data: {
        totalExpectedOutflow,
        invoiceCount: outflowData.length,
        outflowByDate,
        invoices: outflowData,
      },
    });
  } catch (error) {
    console.error('Error fetching cash outflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cash outflow data',
    });
  }
});

app.get('/invoices', async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      vendorId, 
      customerId, 
      startDate, 
      endDate, 
      search,
      minAmount,
      maxAmount,
      currency,
      page,
      limit,
    } = req.query;
    
    const where: Prisma.InvoiceWhereInput = {};

    if (status && typeof status === 'string') {
      where.status = status as Prisma.InvoiceStatus;
    }
    
    if (vendorId && typeof vendorId === 'string') where.vendorId = vendorId;
    if (customerId && typeof customerId === 'string') where.customerId = customerId;
    
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate as string);
      if (endDate) where.invoiceDate.lte = new Date(endDate as string);
    }
    
    if (minAmount || maxAmount) {
      where.totalAmount = {};
      if (minAmount && typeof minAmount === 'string') where.totalAmount.gte = parseFloat(minAmount);
      if (maxAmount && typeof maxAmount === 'string') where.totalAmount.lte = parseFloat(maxAmount);
    }
    
    if (currency && typeof currency === 'string') where.currency = currency;
    
    
    if (search && typeof search === 'string') {
      where.OR = [
        { invoiceNumber: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { vendor: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        { customer: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        { notes: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }
    

    const pageNum = page ? parseInt(page as string) : 1;
    const limitNum = limit ? parseInt(limit as string) : 50;
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await prisma.invoice.count({ where });
    
    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        lineItems: true,
        payments: true,
      },
      orderBy: {
        invoiceDate: 'desc',
      },
      skip,
      take: limitNum,
    });
    
    res.json({
      success: true,
      count: invoices.length,
      totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
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

app.post("/chat-with-data", async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Query is required",
      });
    }

    // Use Vanna AI for SQL generation
    const vannaServerUrl = process.env.VANNA_SERVER_URL || "http://localhost:8000";
    let generatedSQL: string | null = null;
    
    try {
      const vannaResponse = await fetch(`${vannaServerUrl}/generate-sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
          query: query,
      }),
    });

    if (!vannaResponse.ok) {
      const errorText = await vannaResponse.text();
        return res.status(500).json({
        success: false,
          error: `Vanna AI error: ${errorText}`,
      });
    }

      const vannaData = (await vannaResponse.json()) as { sql?: string; success?: boolean; error?: string };

      if (!vannaData.success || !vannaData.sql) {
      return res.status(400).json({
          success: false,
          error: vannaData.error || "Vanna AI could not generate SQL from your question",
        });
      }
      
      generatedSQL = vannaData.sql;
      
    } catch (vannaError) {
      const errorMessage = vannaError instanceof Error ? vannaError.message : "Unknown error";
      return res.status(500).json({
        success: false,
        error: `Could not connect to Vanna AI server: ${errorMessage}. Make sure Vanna AI service is running on ${vannaServerUrl}`,
      });
    }

    const sqlTrimmed = generatedSQL.trim().toLowerCase();
    const dangerousKeywords = [
      "insert",
      "update",
      "delete",
      "drop",
      "create",
      "alter",
      "truncate",
      "grant",
      "revoke",
    ];

    if (!sqlTrimmed.startsWith("select")) {
      return res.status(403).json({
        success: false,
        error: "Only SELECT queries are allowed for security reasons",
        sql: generatedSQL,
      });
    }

    for (const keyword of dangerousKeywords) {
      if (sqlTrimmed.includes(keyword)) {
        return res.status(403).json({
          success: false,
          error: `Query contains forbidden keyword: ${keyword.toUpperCase()}`,
          sql: generatedSQL,
        });
      }
    }

    let data;
    try {
      data = await prisma.$queryRawUnsafe(generatedSQL);
    } catch (sqlError) {
      const errorMessage = sqlError instanceof Error ? sqlError.message : "Unknown SQL error";
      return res.status(500).json({
        success: false,
        error: "SQL execution error",
        sql: generatedSQL,
        sqlError: errorMessage,
      });
    }

    res.json({
      success: true,
      data: {
        query,
        sql: generatedSQL,
        results: data,
        rowCount: Array.isArray(data) ? data.length : 0,
      },
    });
  } catch (error) {
    console.error("Error processing chat-with-data:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process natural language query";
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});


app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});
async function startServer() {
  await ensurePortIsFree(PORT as number);

  const server = app.listen(PORT, () => {
    console.log(`\nServer is running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`\nAvailable API Endpoints:`);
    console.log(`   GET  /stats              - Returns totals for overview cards`);
    console.log(`   GET  /invoice-trends     - Returns monthly invoice count and spend`);
    console.log(`   GET  /vendors/top10      - Returns top 10 vendors by spend`);
    console.log(`   GET  /category-spend     - Returns spend grouped by category`);
    console.log(`   GET  /cash-outflow       - Returns expected cash outflow by date range`);
    console.log(`   GET  /invoices           - Returns list of invoices with filters/search`);
    console.log(`   POST /chat-with-data     - Forwards NL queries to Vanna AI and returns SQL + data`);
  });

  return server;
}

if (!isServerless) {
  let server: ReturnType<typeof app.listen>;
  const serverPromise = startServer();

  serverPromise
    .then((srv: ReturnType<typeof app.listen>) => {
      server = srv;

      // Handle server errors (e.g., port already in use - should be rare now)
      server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`\nERROR: Port ${PORT} is already in use!`);
          console.error(`\nTo fix this issue, you can:`);
          console.error(`  1. Stop the process using port ${PORT}`);
          console.error(`  2. Use a different port by setting PORT environment variable`);
          console.error(`  3. On Windows, run: Get-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess | Stop-Process`);
          console.error(`  4. Or run: npm run kill-port\n`);
          process.exit(1);
        } else {
          console.error('Server error:', error);
          process.exit(1);
        }
      });
    })
    .catch((error: Error) => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });

  const gracefulShutdown = async (signal: string) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    const srv = await serverPromise;

    srv.close(async () => {
      console.log('HTTP server closed');

      try {
        await prisma.$disconnect();
        console.log('Database connections closed');
      } catch (error) {
        console.error('Error closing database connections:', error);
      }

      console.log('Graceful shutdown completed');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('Forceful shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    void gracefulShutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    void gracefulShutdown('unhandledRejection');
  });
}

export default app;
