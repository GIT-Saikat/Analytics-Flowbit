import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { DashboardHeader } from "@/features/dashboard";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AppShell header={<DashboardHeader />}>{children}</AppShell>;
}


