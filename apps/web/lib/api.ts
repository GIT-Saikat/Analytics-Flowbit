// API service for backend communication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3005";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Stats API
export interface StatsData {
  totalInvoices: number;
  totalVendors: number;
  totalCustomers: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  totalPayments: number;
}

export async function getStats(): Promise<StatsData> {
  const response = await fetch(`${API_BASE_URL}/stats`);
  const result: ApiResponse<StatsData> = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch stats");
  }
  return result.data;
}

// Invoice Trends API
export interface InvoiceTrend {
  month: string;
  count: number;
  totalSpend: number;
  paidSpend: number;
  pendingSpend: number;
}

export async function getInvoiceTrends(): Promise<InvoiceTrend[]> {
  const response = await fetch(`${API_BASE_URL}/invoice-trends`);
  const result: ApiResponse<InvoiceTrend[]> = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch invoice trends");
  }
  return result.data;
}

// Top Vendors API
export interface VendorSpend {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  totalSpend: number;
  paidSpend: number;
  invoiceCount: number;
}

export async function getTopVendors(): Promise<VendorSpend[]> {
  const response = await fetch(`${API_BASE_URL}/vendors/top10`);
  const result: ApiResponse<VendorSpend[]> = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch top vendors");
  }
  return result.data;
}

// Category Spend API
export interface CategorySpend {
  category: string;
  totalSpend: number;
  itemCount: number;
  description: string;
}

export async function getCategorySpend(): Promise<CategorySpend[]> {
  const response = await fetch(`${API_BASE_URL}/category-spend`);
  const result: ApiResponse<CategorySpend[]> = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch category spend");
  }
  return result.data;
}

// Cash Outflow API
export interface CashOutflowInvoice {
  invoiceId: string;
  invoiceNumber: string;
  vendor: string;
  vendorId: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  currency: string;
}

export interface CashOutflowData {
  totalExpectedOutflow: number;
  invoiceCount: number;
  outflowByDate: { [key: string]: number };
  invoices: CashOutflowInvoice[];
}

export async function getCashOutflow(
  startDate?: string,
  endDate?: string
): Promise<CashOutflowData> {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);

  const url = `${API_BASE_URL}/cash-outflow${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url);
  const result: ApiResponse<CashOutflowData> = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch cash outflow");
  }
  return result.data;
}

// Invoices API
export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  status: string;
  currency: string;
  vendor: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  lineItems: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    sachkonto: string | null;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    method: string;
  }>;
}

export interface InvoicesResponse {
  success: boolean;
  count: number;
  totalCount: number;
  page: number;
  totalPages: number;
  data: Invoice[];
}

export async function getInvoices(params?: {
  status?: string;
  vendorId?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  currency?: string;
  page?: number;
  limit?: number;
}): Promise<InvoicesResponse> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
  }

  const url = `${API_BASE_URL}/invoices${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const response = await fetch(url);
  const result: InvoicesResponse = await response.json();
  if (!result.success) {
    throw new Error("Failed to fetch invoices");
  }
  return result;
}

// Chat with Data API
export interface ChatRequest {
  query: string;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    query: string;
    sql: string;
    results: Record<string, unknown>[];
    rowCount: number;
  };
  error?: string;
  sql?: string;
  sqlError?: string;
}

export async function chatWithData(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat-with-data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  const result: ChatResponse = await response.json();
  return result;
}