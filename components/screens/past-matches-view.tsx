"use client";

import { useState, useMemo } from "react";
import { Search, ChevronUp, ChevronDown, ArrowUpDown, Filter, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { WavePattern } from "@/components/wave-pattern";

type SortKey = "date" | "stage" | "participantA" | "winner";
type SortDir = "asc" | "desc";

interface HistoricalMatch {
  id: string;
  participantA: string;
  participantB: string;
  winner: string;
  stage: string;
  date: string;
}

const allMatches: HistoricalMatch[] = [
  { id: "M-001", participantA: "Phantom Edge", participantB: "Iron Circuit", winner: "Phantom Edge", stage: "Qualifying", date: "2026-02-10" },
  { id: "M-002", participantA: "Neon Pour", participantB: "Hollow Bloom", winner: "Neon Pour", stage: "Qualifying", date: "2026-02-10" },
  { id: "M-003", participantA: "Zero Kelvin", participantB: "Drift Milk", winner: "Drift Milk", stage: "Qualifying", date: "2026-02-11" },
  { id: "M-004", participantA: "Cerulean Cup", participantB: "Apex Roast", winner: "Cerulean Cup", stage: "Qualifying", date: "2026-02-11" },
  { id: "M-005", participantA: "Vertex Brew", participantB: "Static Bloom", winner: "Vertex Brew", stage: "Qualifying", date: "2026-02-12" },
  { id: "M-006", participantA: "Null Rosette", participantB: "Iron Circuit", winner: "Iron Circuit", stage: "Qualifying", date: "2026-02-12" },
  { id: "M-007", participantA: "Phantom Edge", participantB: "Drift Milk", winner: "Phantom Edge", stage: "Top 16", date: "2026-02-18" },
  { id: "M-008", participantA: "Cerulean Cup", participantB: "Vertex Brew", winner: "Vertex Brew", stage: "Top 16", date: "2026-02-18" },
  { id: "M-009", participantA: "Neon Pour", participantB: "Iron Circuit", winner: "Neon Pour", stage: "Top 16", date: "2026-02-19" },
  { id: "M-010", participantA: "Zero Kelvin", participantB: "Static Bloom", winner: "Zero Kelvin", stage: "Top 16", date: "2026-02-19" },
  { id: "M-011", participantA: "Apex Roast", participantB: "Null Rosette", winner: "Apex Roast", stage: "Top 16", date: "2026-02-20" },
  { id: "M-012", participantA: "Hollow Bloom", participantB: "Drift Milk", winner: "Drift Milk", stage: "Top 16", date: "2026-02-20" },
  { id: "M-041", participantA: "Phantom Edge", participantB: "Iron Circuit", winner: "Phantom Edge", stage: "Quarterfinal", date: "2026-03-01" },
];

const stages = ["All Stages", "Qualifying", "Top 16", "Quarterfinal", "Semifinal", "Grand Final"];

export function PastMatchesView() {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [stageFilter, setStageFilter] = useState("All Stages");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    let list = [...allMatches];
    if (stageFilter !== "All Stages") {
      list = list.filter((m) => m.stage === stageFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.participantA.toLowerCase().includes(q) ||
          m.participantB.toLowerCase().includes(q) ||
          m.winner.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          m.stage.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const valA = sortKey === "participantA" ? a.participantA : a[sortKey];
      const valB = sortKey === "participantA" ? b.participantA : b[sortKey];
      if (typeof valA === "string" && typeof valB === "string") {
        return sortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return 0;
    });
    return list;
  }, [search, sortKey, sortDir, stageFilter]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative h-36 overflow-hidden border-b border-border bg-primary/5">
        <div className="absolute inset-0">
          <WavePattern opacity={0.3} density={40} animated={false} />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-between p-8">
          <div>
            <p className="label-mono mb-1">Spring Throwdown 2026</p>
            <h2 className="text-xl font-bold text-foreground">Match Archive</h2>
          </div>
          <p className="label-mono">{allMatches.length} records / {filtered.length} shown</p>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search baristas, match ID, stage..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-sans"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={12} className="text-muted-foreground shrink-0" />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="bg-card border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-sans"
            >
              {stages.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3">
                  <span className="label-mono">ID</span>
                </th>
                <SortHeader label="Participant A" sortKey="participantA" active={sortKey === "participantA"} dir={sortDir} onClick={() => handleSort("participantA")} />
                <th className="text-center px-4 py-3">
                  <span className="label-mono">vs</span>
                </th>
                <th className="text-left px-4 py-3">
                  <span className="label-mono">Participant B</span>
                </th>
                <SortHeader label="Winner" sortKey="winner" active={sortKey === "winner"} dir={sortDir} onClick={() => handleSort("winner")} />
                <SortHeader label="Stage" sortKey="stage" active={sortKey === "stage"} dir={sortDir} onClick={() => handleSort("stage")} />
                <SortHeader label="Date" sortKey="date" active={sortKey === "date"} dir={sortDir} onClick={() => handleSort("date")} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                    No matches found
                  </td>
                </tr>
              ) : (
                filtered.map((match, i) => (
                  <tr
                    key={match.id}
                    className={cn(
                      "border-b border-border last:border-0 hover:bg-muted/20 transition-colors",
                      i % 2 === 0 ? "bg-card" : "bg-muted/10"
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground">{match.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-sm", match.winner === match.participantA ? "font-semibold text-foreground" : "text-muted-foreground")}>
                        {match.participantA}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-xs text-muted-foreground">—</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-sm", match.winner === match.participantB ? "font-semibold text-foreground" : "text-muted-foreground")}>
                        {match.participantB}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Trophy size={10} className="text-primary shrink-0" />
                        <span className="text-sm font-semibold text-foreground">{match.winner}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                        {match.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground">{match.date}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination mock */}
        <div className="flex items-center justify-between">
          <p className="label-mono">Showing {filtered.length} of {allMatches.length} records</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, "...", 9].map((p, i) => (
              <button
                key={i}
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded font-mono text-xs transition-colors",
                  p === 1 ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SortHeader({ label, sortKey, active, dir, onClick }: {
  label: string; sortKey: SortKey; active: boolean; dir: SortDir; onClick: () => void;
}) {
  return (
    <th className="text-left px-4 py-3">
      <button onClick={onClick} className="flex items-center gap-1 group">
        <span className={cn("font-mono text-[10px] tracking-widest uppercase transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}>
          {label}
        </span>
        <span className="text-muted-foreground">
          {active ? (dir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : <ArrowUpDown size={10} />}
        </span>
      </button>
    </th>
  );
}
