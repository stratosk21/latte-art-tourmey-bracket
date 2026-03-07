"use client";

import { useState } from "react";
import { Search, Shield, ShieldOff, Crown, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WavePattern } from "@/components/wave-pattern";

type Role = "owner" | "admin" | "user";

interface UserRecord {
  id: string;
  username: string;
  discriminator: string;
  role: Role;
  joined: string;
  lastSeen: string;
  avatar: string;
}

const users: UserRecord[] = [
  { id: "U-001", username: "ArchonX", discriminator: "#0042", role: "owner", joined: "2025-09-01", lastSeen: "Today", avatar: "AX" },
  { id: "U-002", username: "Sienna", discriminator: "#1337", role: "admin", joined: "2025-10-12", lastSeen: "Today", avatar: "SI" },
  { id: "U-003", username: "kratos99", discriminator: "#8821", role: "admin", joined: "2025-11-05", lastSeen: "Yesterday", avatar: "KR" },
  { id: "U-004", username: "luminary", discriminator: "#4455", role: "user", joined: "2025-12-01", lastSeen: "2 days ago", avatar: "LU" },
  { id: "U-005", username: "phantomx", discriminator: "#7700", role: "user", joined: "2026-01-10", lastSeen: "Today", avatar: "PH" },
  { id: "U-006", username: "vortex22", discriminator: "#2200", role: "user", joined: "2026-02-14", lastSeen: "3 days ago", avatar: "VO" },
  { id: "U-007", username: "neonwolf", discriminator: "#9911", role: "user", joined: "2026-02-20", lastSeen: "Today", avatar: "NW" },
];

const roleColors: Record<Role, string> = {
  owner: "text-yellow-500 bg-yellow-500/10",
  admin: "text-primary bg-primary/10",
  user: "text-muted-foreground bg-muted",
};

const roleIcons: Record<Role, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  user: UserCircle2,
};

export function AdminUsersView() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");

  const filtered = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.discriminator.includes(search);
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative h-36 overflow-hidden border-b border-border bg-primary/5">
        <div className="absolute inset-0">
          <WavePattern opacity={0.3} density={40} animated />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-between p-8">
          <div>
            <p className="label-mono mb-1">Admin / Access Control</p>
            <h2 className="text-xl font-bold text-foreground">User Roles</h2>
          </div>
          <p className="label-mono text-muted-foreground">
            Manage admin permissions and user access
          </p>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* Role stats */}
        <div className="grid grid-cols-3 gap-4">
          {(["owner", "admin", "user"] as Role[]).map((role) => {
            const count = users.filter((u) => u.role === role).length;
            const Icon = roleIcons[role];
            return (
              <div key={role} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
                <div className={cn("p-2 rounded-md", roleColors[role])}>
                  <Icon size={14} />
                </div>
                <div>
                  <p className="font-mono text-lg font-bold text-foreground">{count}</p>
                  <p className="label-mono capitalize">{role}s</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by username or discriminator..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-1 bg-card border border-border rounded-md p-1">
            {(["all", "owner", "admin", "user"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-mono tracking-wider transition-colors capitalize",
                  roleFilter === r
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* User list */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
            <h3 className="font-mono text-xs font-bold tracking-widest text-muted-foreground">
              REGISTERED USERS
            </h3>
            <span className="label-mono">{filtered.length} shown</span>
          </div>

          <div className="divide-y divide-border">
            {filtered.map((user) => {
              const RoleIcon = roleIcons[user.role];
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/10 transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                    <span className="font-mono text-xs font-bold text-primary">{user.avatar}</span>
                  </div>

                  {/* Name + discriminator */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{user.username}</p>
                      <span className="font-mono text-[10px] text-muted-foreground">{user.discriminator}</span>
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                      Joined {user.joined} · Last seen {user.lastSeen}
                    </p>
                  </div>

                  {/* Role badge */}
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[10px] tracking-widest capitalize shrink-0",
                      roleColors[user.role]
                    )}
                  >
                    <RoleIcon size={10} />
                    {user.role}
                  </div>

                  {/* Actions (only for non-owners) */}
                  {user.role !== "owner" && (
                    <div className="flex items-center gap-1 shrink-0">
                      {user.role === "user" ? (
                        <button
                          title="Promote to Admin"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Shield size={11} />
                          Promote
                        </button>
                      ) : (
                        <button
                          title="Revoke Admin"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <ShieldOff size={11} />
                          Revoke
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Owner note */}
        <div className="flex items-start gap-3 bg-card border border-border rounded-lg p-4">
          <Crown size={14} className="text-yellow-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-foreground">Owner Privileges</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Only the website owner can promote users to admin or revoke admin privileges. Admin users can create and manage throwdown matchups but cannot modify user roles.
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}
