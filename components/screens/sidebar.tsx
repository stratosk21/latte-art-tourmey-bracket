"use client";

import { type Screen } from "@/app/page";
import {
  LayoutGrid,
  GitBranch,
  History,
  ShieldCheck,
  Users,
  LogOut,
  Sun,
  Moon,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  screen: Screen;
  setScreen: (s: Screen) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

const navItems = [
  { id: "dashboard" as Screen, label: "Overview", icon: LayoutGrid, mono: "01" },
  { id: "bracket" as Screen, label: "Live Bracket", icon: GitBranch, mono: "02" },
  { id: "past-matches" as Screen, label: "Match Archive", icon: History, mono: "03" },
];

const adminItems = [
  { id: "admin" as Screen, label: "Match Control", icon: ShieldCheck, mono: "04" },
  { id: "admin-users" as Screen, label: "User Roles", icon: Users, mono: "05" },
];

export function Sidebar({ screen, setScreen, isDark, onToggleTheme }: SidebarProps) {
  return (
    <aside className="w-56 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col py-5 shrink-0">
      {/* Brand */}
      <div className="px-5 mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Activity size={14} className="text-sidebar-primary" />
          <span className="font-mono text-[10px] tracking-widest uppercase text-sidebar-foreground/50">
            System
          </span>
        </div>
        <h1 className="font-mono text-base font-bold tracking-widest text-sidebar-foreground">
          THROWDOWN
        </h1>
        <p className="label-mono text-sidebar-foreground/40 mt-0.5">Spring 2026</p>
      </div>

      {/* Live indicator */}
      <div className="px-5 mb-6">
        <div className="flex items-center gap-2 bg-live/10 border border-live/20 rounded-md px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
          <span className="font-mono text-[10px] text-live tracking-wider">3 LIVE</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        <p className="label-mono px-2 mb-2 text-sidebar-foreground/30">Navigation</p>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setScreen(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors text-left",
              screen === item.id
                ? "bg-sidebar-accent text-sidebar-primary font-medium"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <span className="font-mono text-[9px] text-sidebar-foreground/30 w-5 shrink-0">
              {item.mono}
            </span>
            <item.icon size={14} className="shrink-0" />
            <span>{item.label}</span>
          </button>
        ))}

        <div className="pt-4">
          <p className="label-mono px-2 mb-2 text-sidebar-foreground/30">Admin</p>
          {adminItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors text-left",
                screen === item.id
                  ? "bg-sidebar-accent text-sidebar-primary font-medium"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <span className="font-mono text-[9px] text-sidebar-foreground/30 w-5 shrink-0">
                {item.mono}
              </span>
              <item.icon size={14} className="shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Bottom actions */}
      <div className="px-3 space-y-1 pt-4 border-t border-sidebar-border mt-4">
        <button
          onClick={onToggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
          <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Version tag */}
      <div className="px-5 mt-4">
        <p className="font-mono text-[9px] text-sidebar-foreground/20 tracking-wider">
          THROWDOWN-SYS-V1
        </p>
      </div>
    </aside>
  );
}
