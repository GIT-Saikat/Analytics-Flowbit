'use client';

import * as React from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { AppSidebar } from "./app-sidebar";

type AppShellProps = {
  header?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({ header, children }: AppShellProps) {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset className="flex-1 md:peer-data-[state=expanded]:ml-0 md:peer-data-[state=collapsed]:ml-0">
        {header}
        <main className="flex flex-1 flex-col px-6 py-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

