"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { getInvoices, type Invoice } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

export function InvoicesTable() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchInvoices() {
      try {
        setLoading(true);
        const data = await getInvoices({
          search: search || undefined,
          page,
          limit: 10,
        });
        setInvoices(data.data);
        setTotalPages(data.totalPages);
      } catch (error) {
        console.error("Error fetching invoices:", error);
      } finally {
        setLoading(false);
      }
    }

    // Debounce search
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 300);

    return () => clearTimeout(timer);
  }, [search, page]);

  // Group invoices by vendor
  const groupedInvoices = invoices.reduce(
    (acc, invoice) => {
      const vendorName = invoice.vendor?.name ?? "Unknown Vendor";
      const vendorInvoices = acc[vendorName] ?? [];
      vendorInvoices.push(invoice);
      acc[vendorName] = vendorInvoices;
      return acc;
    },
    {} as Record<string, Invoice[]>
  );

  // Calculate vendor totals
  const vendorStats = Object.entries(groupedInvoices).map(([vendor, invoices]) => ({
    vendor,
    invoiceCount: invoices.length,
    netValue: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
    invoices,
  }));

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "overdue":
        return "bg-red-100 text-red-800 border-red-200";
      case "sent":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading && invoices.length === 0) {
    return (
      <Card className="col-span-1 rounded-2xl border bg-white shadow-sm lg:col-span-3">
        <CardHeader className="p-4">
          <CardTitle className="text-base font-semibold">Invoices by Vendor</CardTitle>
          <CardDescription className="text-xs">
            Top vendors by invoice count and net value.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full rounded-2xl border bg-white shadow-sm">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold">Invoices by Vendor</CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Top vendors by invoice count and net value.
            </CardDescription>
          </div>
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  # Invoices
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">
                  Net Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vendorStats.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                    No invoices found
                  </td>
                </tr>
              ) : (
                vendorStats.map((stat, index) => (
                  <tr
                    key={`${stat.vendor}-${index}`}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-sm text-gray-900">{stat.vendor}</div>
                        <div className="text-xs text-gray-500">
                          {stat.invoices[0]?.invoiceDate &&
                            new Date(stat.invoices[0].invoiceDate).toLocaleDateString("en-GB")}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {stat.invoices.slice(0, 3).map((invoice) => (
                          <span
                            key={invoice.id}
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(invoice.status)}`}
                          >
                            {invoice.status}
                          </span>
                        ))}
                        {stat.invoiceCount > 3 && (
                          <span className="inline-flex items-center text-xs text-gray-500">
                            +{stat.invoiceCount - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-semibold text-sm text-gray-900">
                        € {stat.netValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
