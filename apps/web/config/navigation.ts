import {
  FileText,
  Layers3,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  Settings,
  Users,
} from "lucide-react";

import type { NavigationItem } from "@/types/navigation";

export const generalNavigation: NavigationItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    label: "Chat with Data",
    icon: MessageSquare,
    href: "/chat",
  },
  {
    label: "Invoice",
    icon: Receipt,
    href: "/invoice",
  },
  {
    label: "Other files",
    icon: FileText,
    href: "/files",
  },
  {
    label: "Departments",
    icon: Layers3,
    href: "/departments",
  },
  {
    label: "Users",
    icon: Users,
    href: "/users",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/settings",
  },
];