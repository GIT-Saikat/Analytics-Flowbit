import {
  OverviewCards,
  InvoiceTrendChart,
  VendorSpendChart,
  CategorySpendChart,
  CashOutflowChart,
  InvoicesTable,
} from "@/features/dashboard";

export default function DashboardPage() {
  return (
    <section className="flex flex-1 flex-col gap-4 overflow-auto bg-gray-50 px-6 py-6">
      {/* Overview Cards */}
      <OverviewCards />

      {/* Charts Row 1 - Invoice Trend + Vendor Spend (Equal width) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InvoiceTrendChart />
        <VendorSpendChart />
      </div>

      {/* Charts Row 2 - Category + Cash Outflow + Table */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <CategorySpendChart />
        <CashOutflowChart />
        <InvoicesTable />
      </div>
    </section>
  );
}