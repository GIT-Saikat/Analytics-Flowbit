"use client";

import { LayoutDashboard, MoreVertical } from "lucide-react";
import avatarImg from "@/app/assest/avatar.jpg";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { currentUser } from "@/config/app";

type DashboardHeaderProps = {
  title?: string;
};

export function DashboardHeader({ title = "Dashboard" }: DashboardHeaderProps) {
  const fallbackInitials =
    currentUser.initials ?? currentUser.name.slice(0, 2).toUpperCase();

  return (
    <header className="flex h-[64px] w-full items-center border border-black bg-card shadow-[0_6px_12px_rgba(0,0,0,0.12)] box-border">
      <div className="flex h-[64px] w-full items-center justify-between">
        <div className="flex items-center gap-3">
          <SidebarTrigger
            aria-label="Toggle sidebar"
            icon={<LayoutDashboard className="h-5 w-5" />}
            className="h-10 w-10 rounded-lg bg-transparent text-muted-foreground transition hover:text-foreground"
          />
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage
              src={avatarImg.src}
              alt={currentUser.name}
            />
            <AvatarFallback>{fallbackInitials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col leading-none">
            <p className="text-base font-semibold text-foreground">
              {currentUser.name}
            </p>
            <p className="text-sm text-muted-foreground">{currentUser.role}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-16 w-16 rounded-lg text-muted-foreground hover:text-foreground"
            aria-label="Open user menu"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}


