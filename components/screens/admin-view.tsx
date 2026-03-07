"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, CheckCircle2, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { WavePattern } from "@/components/wave-pattern";

const managedMatches = [
  { id: "M-044", teamA: "Cerulean Cup", teamB: "TBD", stage: "Quarterfinal", date: "2026-03-03", time: "18:00", status: "scheduled" },
  { id: "M-045", teamA: "Vertex Brew", teamB: "Hollow Bloom", stage: "Quarterfinal", date: "2026-03-03", time: "20:00", status: "scheduled" },
  { id: "M-046", teamA: "Drift Milk", teamB: "Null Rosette", stage: "Quarterfinal", date: "2026-03-04", time: "14:00", status: "scheduled" },
  { id: "M-041", teamA: "Phantom Edge", teamB: "Iron Circuit", stage: "Quarterfinal", date: "2026-03-01", time: "16:00", status: "completed" },
  { id: "M-042", teamA: "Neon Pour", teamB: "Static Bloom", stage: "Quarterfinal", date: "2026-03-03", time: "12:00", status: "live" },
];

const stages = ["Qualifying", "Top 16", "Quarterfinal", "Semifinal", "Grand Final"];
const teams = ["Phantom Edge", "Iron Circuit", "Neon Pour", "Static Bloom", "Zero Kelvin", "Apex Roast", "Cerulean Cup", "Vertex Brew", "Hollow Bloom", "Drift Milk", "Null Rosette", "TBD"];

export function AdminView() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    teamA: "",
    teamB: "",
    stage: "Quarterfinal",
    date: "",
    time: "",
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
            <p className="label-mono mb-1">Admin / Match Control</p>
            <h2 className="text-xl font-bold text-foreground">Match Management</h2>
          </div>
          <p className="label-mono text-muted-foreground">
            Create and manage throwdown matchups
          </p>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* Action bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-card border border-border rounded-md px-3 py-2">
              <Zap size={12} className="text-live" />
              <span className="font-mono text-xs text-live">1 LIVE</span>
            </div>
            <div className="flex items-center gap-2 bg-card border border-border rounded-md px-3 py-2">
              <Clock size={12} className="text-upcoming" />
              <span className="font-mono text-xs text-upcoming">3 SCHEDULED</span>
            </div>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            New Match
          </button>
        </div>

        {/* Create match form */}
        {showForm && (
          <div className="bg-card border border-primary/30 rounded-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-sm font-bold tracking-wider text-foreground">
                CREATE NEW MATCH
              </h3>
              <span className="label-mono">FORM / DRAFT</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Team A">
                <select
                  value={form.teamA}
                  onChange={(e) => setForm((f) => ({ ...f, teamA: e.target.value }))}
                  className="w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select team...</option>
                  {teams.map((t) => <option key={t}>{t}</option>)}
                </select>
              </FormField>

              <FormField label="Team B">
                <select
                  value={form.teamB}
                  onChange={(e) => setForm((f) => ({ ...f, teamB: e.target.value }))}
                  className="w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select team...</option>
                  {teams.map((t) => <option key={t}>{t}</option>)}
                </select>
              </FormField>

              <FormField label="Stage">
                <select
                  value={form.stage}
                  onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
                  className="w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {stages.map((s) => <option key={s}>{s}</option>)}
                </select>
              </FormField>

              <FormField label="Date">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </FormField>

              <FormField label="Start Time">
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  className="w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </FormField>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                Create Match
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-card border border-border text-foreground py-2.5 rounded-md text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Match list */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
            <h3 className="font-mono text-xs font-bold tracking-widest text-muted-foreground">
              ALL MANAGED MATCHES
            </h3>
            <span className="label-mono">{managedMatches.length} records</span>
          </div>

          <div className="divide-y divide-border">
            {managedMatches.map((match) => (
              <div key={match.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/10 transition-colors">
                <span className="font-mono text-xs text-muted-foreground w-14 shrink-0">{match.id}</span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {match.teamA} <span className="text-muted-foreground font-normal">vs</span> {match.teamB}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                    {match.stage} · {match.date} at {match.time}
                  </p>
                </div>

                <StatusChip status={match.status} />

                <div className="flex items-center gap-1 shrink-0">
                  <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <Edit2 size={13} />
                  </button>
                  <button className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="label-mono">{label}</label>
      {children}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "font-mono text-[9px] tracking-widest px-2 py-1 rounded shrink-0",
        status === "live"
          ? "bg-live/15 text-live"
          : status === "completed"
          ? "bg-muted text-muted-foreground"
          : "bg-upcoming/15 text-upcoming"
      )}
    >
      {status.toUpperCase()}
    </span>
  );
}
