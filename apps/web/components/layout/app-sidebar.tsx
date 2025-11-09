'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { workspace } from "@/config/app";
import { generalNavigation } from "@/config/navigation";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="offcanvas"
      className="hidden border-r border-sidebar-border bg-sidebar md:flex"
    >
      <SidebarHeader>
        <div className="flex items-center justify-between rounded-xl border border-sidebar-border bg-sidebar-accent/60 px-3 py-2 text-sidebar-foreground">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-500 text-sm font-semibold text-white shadow-sm">
              {workspace.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="grid gap-0.5">
              <span className="text-sm font-semibold leading-none">
                {workspace.name}
              </span>
              <span className="text-xs text-sidebar-foreground/60">
                {workspace.memberCount} members
              </span>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            <ChevronDown className="h-4 w-4" />
            <span className="sr-only">Switch workspace</span>
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
            General
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {generalNavigation.map(({ label, icon: Icon, href }) => {
                const isActive = pathname === href;

                return (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton
                      isActive={isActive}
                      className="justify-start gap-2 px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors data-[active=true]:text-primary data-[state=open]:bg-sidebar-accent/60 data-[state=open]:text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      asChild
                    >
                      <Link
                        href={href}
                        className="flex w-full items-center gap-2 text-sm leading-[22px]"
                      >
                        <Icon className="h-[22px] w-[22px]" />
                        <span className="leading-[22px]">{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

