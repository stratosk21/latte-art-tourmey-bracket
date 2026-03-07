"use client";

import { type Screen } from "@/app/page";
import { WavePattern } from "@/components/wave-pattern";
import { ArrowRight, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardHomeProps {
  setScreen: (s: Screen) => void;
}

const liveMatches = [
  { id: "M-041", title: "Phantom Edge vs Iron Circuit", stage: "Quarterfinal", elapsed: "38:22" },
  { id: "M-042", title: "Neon Pour vs Static Bloom", stage: "Quarterfinal", elapsed: "12:05" },
  { id: "M-043", title: "Zero Kelvin vs Apex Roast", stage: "Quarterfinal", elapsed: "55:40" },
];

const upcomingMatches = [
  { id: "M-044", title: "Cerulean Cup vs TBD", stage: "Quarterfinal", time: "Today, 18:00" },
  { id: "M-045", title: "Vertex Brew vs Hollow Pour", stage: "Quarterfinal", time: "Today, 20:00" },
  { id: "M-046", title: "Drift Milk vs Null Rosette", stage: "Quarterfinal", time: "Tomorrow, 14:00" },
];

const stats = [
  { label: "Baristas", value: "24", sub: "Registered" },
  { label: "Matches", value: "31", sub: "Total" },
  { label: "Live Now", value: "3", sub: "In progress" },
  { label: "Stage", value: "R32", sub: "Round of 32" },
];

export function DashboardHome({ setScreen }: DashboardHomeProps) {
  return (
    <div className="min-h-screen">
      {/* Hero banner with wave */}
      <div className="relative h-44 overflow-hidden border-b border-border bg-primary/5">
        <div className="absolute inset-0">
          <WavePattern opacity={0.4} density={48} animated />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-between p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="label-mono mb-1">Spring Throwdown 2026</p>
              <h2 className="text-2xl font-bold text-foreground text-balance">
                Tournament Overview
              </h2>
            </div>
            <div className="text-right">
              <p className="label-mono">BRACKET-REF</p>
              <p className="font-mono text-xs text-muted-foreground">ST-2026-QF</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-live animate-pulse" />
            <span className="font-mono text-xs text-live tracking-widest">3 MATCHES LIVE</span>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-lg p-5">
              <p className="label-mono mb-2">{stat.label}</p>
              <p className="text-3xl font-mono font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Live matches */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-live animate-pulse" />
                <h3 className="font-mono text-sm font-bold tracking-wider text-foreground">LIVE MATCHES</h3>
              </div>
              <button
                onClick={() => setScreen("bracket")}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-mono"
              >
                View Bracket <ArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-3">
              {liveMatches.map((match) => (
                <LiveMatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>

          {/* Upcoming matches */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-upcoming" />
                <h3 className="font-mono text-sm font-bold tracking-wider text-foreground">UPCOMING</h3>
              </div>
              <button
                onClick={() => setScreen("past-matches")}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-mono"
              >
                All Matches <ArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-3">
              {upcomingMatches.map((match) => (
                <UpcomingCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        </div>

        {/* Bracket progress visual */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Zap size={12} className="text-primary" />
            <h3 className="font-mono text-sm font-bold tracking-wider text-foreground">TOURNAMENT PROGRESS</h3>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-0 overflow-x-auto">
              {[
                { label: "Qualifying", matches: 48, done: 48 },
                { label: "Top 16", matches: 16, done: 16 },
                { label: "Quarterfinals", matches: 8, done: 3, active: true },
                { label: "Semifinals", matches: 4, done: 0 },
                { label: "Grand Final", matches: 2, done: 0 },
              ].map((stage, i, arr) => (
                <div key={stage.label} className="flex items-center shrink-0">
                  <div
                    className={cn(
                      "flex flex-col items-center p-4 rounded-md border min-w-[120px]",
                      stage.active
                        ? "border-primary bg-primary/10"
                        : stage.done === stage.matches
                        ? "border-border bg-muted/30"
                        : "border-border bg-card"
                    )}
                  >
                    <p className={cn(
                      "font-mono text-[10px] tracking-wider mb-2",
                      stage.active ? "text-primary" : "text-muted-foreground"
                    )}>
                      {stage.done === stage.matches && !stage.active ? "COMPLETE" : stage.active ? "IN PROGRESS" : "PENDING"}
                    </p>
                    <p className="text-xs font-semibold text-foreground text-center text-balance">{stage.label}</p>
                    <p className="font-mono text-xs text-muted-foreground mt-1">{stage.done}/{stage.matches}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="w-8 h-px bg-border mx-1 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function LiveMatchCard({ match }: { match: typeof liveMatches[0] }) {
  return (
    <div className="bg-card border border-live/30 rounded-lg p-4 hover:border-live/50 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
          <span className="font-mono text-[10px] text-live tracking-wider">LIVE</span>
          <span className="label-mono">{match.id}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={10} className="text-muted-foreground" />
          <span className="font-mono text-[10px] text-muted-foreground">{match.elapsed}</span>
        </div>
      </div>
      <p className="font-semibold text-sm text-foreground">{match.title}</p>
      <p className="label-mono mt-1">{match.stage}</p>
    </div>
  );
}

function UpcomingCard({ match }: { match: typeof upcomingMatches[0] }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="label-mono">{match.id}</span>
        <span className="font-mono text-[10px] text-upcoming tracking-wider">{match.time}</span>
      </div>
      <p className="font-semibold text-sm text-foreground">{match.title}</p>
      <p className="label-mono mt-1">{match.stage}</p>
    </div>
  );
}
