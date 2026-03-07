"use client";

import { type Screen } from "@/app/page";
import { Sidebar } from "@/components/screens/sidebar";
import { DashboardHome } from "@/components/screens/dashboard-home";
import { BracketView } from "@/components/screens/bracket-view";
import { PastMatchesView } from "@/components/screens/past-matches-view";
import { AdminView } from "@/components/screens/admin-view";
import { AdminUsersView } from "@/components/screens/admin-users-view";

interface DashboardLayoutProps {
  screen: Screen;
  setScreen: (s: Screen) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function DashboardLayout({
  screen,
  setScreen,
  isDark,
  onToggleTheme,
}: DashboardLayoutProps) {
  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      <Sidebar
        screen={screen}
        setScreen={setScreen}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
      />
      <main className="flex-1 min-w-0 overflow-auto">
        {screen === "dashboard" && <DashboardHome setScreen={setScreen} />}
        {screen === "bracket" && <BracketView />}
        {screen === "past-matches" && <PastMatchesView />}
        {screen === "admin" && <AdminView />}
        {screen === "admin-users" && <AdminUsersView />}
      </main>
    </div>
  );
}
