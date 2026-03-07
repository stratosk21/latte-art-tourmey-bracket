"use client";

import { useState, useEffect } from "react";
import { LoginPage } from "@/components/screens/login-page";
import { DashboardLayout } from "@/components/screens/dashboard-layout";

export type Screen =
  | "login"
  | "dashboard"
  | "bracket"
  | "past-matches"
  | "admin"
  | "admin-users";

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [isDark, setIsDark] = useState(true);

  // Apply dark class on mount and keep in sync
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((v) => !v);

  if (screen === "login") {
    return (
      <LoginPage
        onLogin={() => setScreen("dashboard")}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <DashboardLayout
      screen={screen}
      setScreen={setScreen}
      isDark={isDark}
      onToggleTheme={toggleTheme}
    />
  );
}
