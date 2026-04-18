"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { cn } from "@/lib/utils";
import { WavePattern } from "@/components/wave-pattern";
import { Trophy, GitBranch, Swords } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type MatchStatus = "live" | "upcoming" | "done" | "bye";
type Format = "single" | "double";

interface Participant {
  name: string;
  seed?: number;
  isBye?: boolean;
}

interface BracketMatch {
  id: string;
  a: Participant;
  b: Participant;
  winner?: "a" | "b";
  status: MatchStatus;
}

export interface Round {
  label: string;
  matches: BracketMatch[];
}

// ─── Data: Single Elimination (24 entrants → pad to 32 with 8 byes) ──────────
//     Round of 32 has 16 matches (8 real 1v1, 8 byes that auto-advance)
//     Round of 16, QF, SF, Final

const singleBracket: Round[] = [
  {
    label: "Round of 32",
    matches: [
      {
        id: "R32-1",
        a: { name: "Mara Tanaka", seed: 1 },
        b: { name: "BYE", isBye: true },
        winner: "a",
        status: "bye",
      },
      {
        id: "R32-2",
        a: { name: "Leo Ferreira", seed: 2 },
        b: { name: "BYE", isBye: true },
        winner: "a",
        status: "bye",
      },
      {
        id: "R32-3",
        a: { name: "Soo-Jin Park", seed: 3 },
        b: { name: "BYE", isBye: true },
        winner: "a",
        status: "bye",
      },
      {
        id: "R32-4",
        a: { name: "Oliver Strauss", seed: 4 },
        b: { name: "BYE", isBye: true },
        winner: "a",
        status: "bye",
      },
      {
        id: "R32-5",
        a: { name: "Priya Nair", seed: 5 },
        b: { name: "Cam Delacroix", seed: 24 },
        winner: "a",
        status: "done",
      },
      {
        id: "R32-6",
        a: { name: "Hana Wolff", seed: 6 },
        b: { name: "Joel Okoro", seed: 23 },
        winner: "b",
        status: "done",
      },
      {
        id: "R32-7",
        a: { name: "Nico Beaumont", seed: 7 },
        b: { name: "Ryu Matsuda", seed: 22 },
        winner: "a",
        status: "done",
      },
      {
        id: "R32-8",
        a: { name: "Isla Vance", seed: 8 },
        b: { name: "Tobias Ehn", seed: 21 },
        status: "live",
      },
      {
        id: "R32-9",
        a: { name: "Marco Lund", seed: 9 },
        b: { name: "Yuki Sato", seed: 20 },
        status: "live",
      },
      {
        id: "R32-10",
        a: { name: "Asha Diallo", seed: 10 },
        b: { name: "Finn Hofer", seed: 19 },
        status: "upcoming",
      },
      {
        id: "R32-11",
        a: { name: "Ezra Bloom", seed: 11 },
        b: { name: "Tae-Young Kim", seed: 18 },
        status: "upcoming",
      },
      {
        id: "R32-12",
        a: { name: "Luna Castillo", seed: 12 },
        b: { name: "Daria Moren", seed: 17 },
        status: "upcoming",
      },
      {
        id: "R32-13",
        a: { name: "BYE", isBye: true },
        b: { name: "Viktor Helm", seed: 16 },
        winner: "b",
        status: "bye",
      },
      {
        id: "R32-14",
        a: { name: "BYE", isBye: true },
        b: { name: "Noa Stern", seed: 15 },
        winner: "b",
        status: "bye",
      },
      {
        id: "R32-15",
        a: { name: "BYE", isBye: true },
        b: { name: "Chiara Russo", seed: 14 },
        winner: "b",
        status: "bye",
      },
      {
        id: "R32-16",
        a: { name: "BYE", isBye: true },
        b: { name: "Akira Yoshida", seed: 13 },
        winner: "b",
        status: "bye",
      },
    ],
  },
  {
    label: "Round of 16",
    matches: [
      {
        id: "R16-1",
        a: { name: "Mara Tanaka" },
        b: { name: "Leo Ferreira" },
        winner: "a",
        status: "done",
      },
      {
        id: "R16-2",
        a: { name: "Soo-Jin Park" },
        b: { name: "Oliver Strauss" },
        winner: "b",
        status: "done",
      },
      {
        id: "R16-3",
        a: { name: "Priya Nair" },
        b: { name: "Joel Okoro" },
        winner: "a",
        status: "done",
      },
      {
        id: "R16-4",
        a: { name: "Nico Beaumont" },
        b: { name: "Isla Vance" },
        status: "live",
      },
      {
        id: "R16-5",
        a: { name: "Marco Lund" },
        b: { name: "Yuki Sato" },
        status: "upcoming",
      },
      {
        id: "R16-6",
        a: { name: "Asha Diallo" },
        b: { name: "TBD" },
        status: "upcoming",
      },
      {
        id: "R16-7",
        a: { name: "TBD" },
        b: { name: "Viktor Helm" },
        status: "upcoming",
      },
      {
        id: "R16-8",
        a: { name: "TBD" },
        b: { name: "Noa Stern" },
        status: "upcoming",
      },
    ],
  },
  {
    label: "Quarterfinals",
    matches: [
      {
        id: "QF-1",
        a: { name: "Mara Tanaka" },
        b: { name: "Oliver Strauss" },
        status: "upcoming",
      },
      {
        id: "QF-2",
        a: { name: "Priya Nair" },
        b: { name: "TBD" },
        status: "upcoming",
      },
      {
        id: "QF-3",
        a: { name: "TBD" },
        b: { name: "TBD" },
        status: "upcoming",
      },
      {
        id: "QF-4",
        a: { name: "TBD" },
        b: { name: "TBD" },
        status: "upcoming",
      },
    ],
  },
  {
    label: "Semifinals",
    matches: [
      {
        id: "SF-1",
        a: { name: "TBD" },
        b: { name: "TBD" },
        status: "upcoming",
      },
      {
        id: "SF-2",
        a: { name: "TBD" },
        b: { name: "TBD" },
        status: "upcoming",
      },
    ],
  },
  {
    label: "Grand Final",
    matches: [
      {
        id: "GF-1",
        a: { name: "TBD" },
        b: { name: "TBD" },
        status: "upcoming",
      },
    ],
  },
];

// ─── Data: Double Elimination ─────────────────────────────────────────────────
//     Winners bracket (R1 → R2 → WBF) + Losers bracket (LR1 → LR2 → LBF) + Grand Final

const winnersRounds: Round[] = [
  {
    label: "WB Round 1",
    matches: [
      {
        id: "W1-1",
        a: { name: "Mara Tanaka", seed: 1 },
        b: { name: "Cam Delacroix", seed: 8 },
        winner: "a",
        status: "done",
      },
      {
        id: "W1-2",
        a: { name: "Leo Ferreira", seed: 2 },
        b: { name: "Hana Wolff", seed: 7 },
        winner: "a",
        status: "done",
      },
      {
        id: "W1-3",
        a: { name: "Soo-Jin Park", seed: 3 },
        b: { name: "Nico Beaumont", seed: 6 },
        winner: "b",
        status: "done",
      },
      {
        id: "W1-4",
        a: { name: "Oliver Strauss", seed: 4 },
        b: { name: "Priya Nair", seed: 5 },
        status: "live",
      },
    ],
  },
  {
    label: "WB Quarters",
    matches: [
      {
        id: "WQ-1",
        a: { name: "Mara Tanaka" },
        b: { name: "Leo Ferreira" },
        status: "upcoming",
      },
      {
        id: "WQ-2",
        a: { name: "Nico Beaumont" },
        b: { name: "TBD" },
        status: "upcoming",
      },
    ],
  },
  {
    label: "WB Final",
    matches: [
      {
        id: "WBF-1",
        a: { name: "TBD" },
        b: { name: "TBD" },
        status: "upcoming",
      },
    ],
  },
];

const losersRounds: Round[] = [
  {
    label: "LB Round 1",
    matches: [
      {
        id: "L1-1",
        a: { name: "Cam Delacroix" },
        b: { name: "Hana Wolff" },
        winner: "a",
        status: "done",
      },
      {
        id: "L1-2",
        a: { name: "Soo-Jin Park" },
        b: { name: "TBD" },
        status: "upcoming",
      },
    ],
  },
  {
    label: "LB Quarters",
    matches: [
      {
        id: "LQ-1",
        a: { name: "Cam Delacroix" },
        b: { name: "TBD" },
        status: "upcoming",
      },
    ],
  },
  {
    label: "LB Final",
    matches: [
      {
        id: "LBF-1",
        a: { name: "TBD" },
        b: { name: "TBD" },
        status: "upcoming",
      },
    ],
  },
];

const grandFinal: Round = {
  label: "Grand Final",
  matches: [
    {
      id: "GF-1",
      a: { name: "TBD (WB)" },
      b: { name: "TBD (LB)" },
      status: "upcoming",
    },
  ],
};

// ─── Layout constants ─────────────────────────────────────────────────────────
const CARD_W = 200;
const CARD_H = 92;
const CARD_GAP = 16;
const ROUND_GAP = 48;
const HEADER_H = 68; // py-4 + label text + subtext

// Cards in round i are centered between their 2 parents from round i-1.
// top padding before first card: (2^i - 1) * (CARD_H + CARD_GAP) / 2
// gap between cards:             2^i * (CARD_H + CARD_GAP) - CARD_H
function roundTopPad(i: number) {
  return ((Math.pow(2, i) - 1) * (CARD_H + CARD_GAP)) / 2;
}
function roundCardGap(i: number) {
  return Math.pow(2, i) * (CARD_H + CARD_GAP) - CARD_H;
}

// Measure the vertical center of every [data-card] element relative to a column container.
function measureCenters(colEl: HTMLDivElement): number[] {
  const colRect = colEl.getBoundingClientRect();
  return Array.from(colEl.querySelectorAll<HTMLElement>("[data-card]")).map(
    (el) => {
      const r = el.getBoundingClientRect();
      return r.top - colRect.top + r.height / 2;
    }
  );
}

// Stable hook: re-measures on every layout pass, only commits state when values change.
function useRoundMeasurements() {
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevRef = useRef<number[][]>([]);
  const [centers, setCenters] = useState<number[][]>([]);

  useLayoutEffect(() => {
    const next = colRefs.current.map((el) => (el ? measureCenters(el) : []));
    const prev = prevRef.current;
    const changed =
      next.length !== prev.length ||
      next.some(
        (ys, ri) =>
          ys.length !== prev[ri]?.length ||
          ys.some((y, ci) => Math.abs(y - (prev[ri]?.[ci] ?? -1)) > 0.5)
      );
    if (changed) {
      prevRef.current = next;
      setCenters(next);
    }
  });

  return { colRefs, centers };
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface BracketViewProps {
  rounds?: Round[]
  throwdownTitle?: string
}

export function BracketView({ rounds: propRounds, throwdownTitle }: BracketViewProps = {}) {
  const [format, setFormat] = useState<Format>("single");

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="relative h-36 overflow-hidden border-b border-border bg-primary/5 shrink-0">
        <div className="absolute inset-0">
          <WavePattern opacity={0.3} density={44} animated />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-between p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="label-mono mb-1">Spring Throwdown 2026</p>
              <h2 className="text-xl font-bold text-foreground">
                Live Bracket
              </h2>
            </div>
            {/* Format toggle */}
            <div className="flex items-center gap-1 bg-muted/60 border border-border rounded-md p-1">
              <FormatBtn
                active={format === "single"}
                onClick={() => setFormat("single")}
                icon={<Swords size={11} />}
                label="Single Elim"
              />
              <FormatBtn
                active={format === "double"}
                onClick={() => setFormat("double")}
                icon={<GitBranch size={11} />}
                label="Double Elim"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Legend color="bg-live" label="Live" />
            <Legend color="bg-primary/50" label="Upcoming" />
            <Legend color="bg-muted-foreground/30" label="Done" />
            <Legend color="bg-border" label="Bye" />
          </div>
        </div>
      </div>

      {/* Bracket canvas */}
      <div className="flex-1 overflow-auto p-8">
        {format === "single" ? <SingleElimBracket rounds={propRounds ?? singleBracket} /> : <DoubleElimBracket />}
      </div>
    </div>
  );
}

// ─── Single Elimination Layout ────────────────────────────────────────────────

function SingleElimBracket({ rounds }: { rounds: Round[] }) {
  const { colRefs, centers } = useRoundMeasurements();
  return (
    <div>
      <div className="flex items-start gap-0 min-w-max">
        {rounds.map((round, ri) => (
          <div key={round.label} className="flex items-start">
            <RoundColumn
              round={round}
              roundIndex={ri}
              totalRounds={rounds.length}
              colRef={(el) => {
                colRefs.current[ri] = el;
              }}
            />
            {ri < rounds.length - 1 && centers[ri]?.length > 0 && (
              <BracketConnector
                fromCentersY={centers[ri]}
                toCount={rounds[ri + 1].matches.length}
                width={ROUND_GAP}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Double Elimination Layout ────────────────────────────────────────────────

function DoubleElimBracket() {
  const winners = useRoundMeasurements();
  const losers = useRoundMeasurements();
  return (
    <div className="space-y-10">
      {/* Winners bracket */}
      <div>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <h3 className="font-mono text-xs font-bold tracking-widest text-foreground">
            WINNERS BRACKET
          </h3>
        </div>
        <div className="flex items-start gap-0 min-w-max">
          {winnersRounds.map((round, ri) => (
            <div key={round.label} className="flex items-start">
              <RoundColumn
                round={round}
                roundIndex={ri}
                totalRounds={winnersRounds.length}
                colRef={(el) => {
                  winners.colRefs.current[ri] = el;
                }}
              />
              {ri < winnersRounds.length - 1 &&
                winners.centers[ri]?.length > 0 && (
                  <BracketConnector
                    fromCentersY={winners.centers[ri]}
                    toCount={winnersRounds[ri + 1].matches.length}
                    width={ROUND_GAP}
                  />
                )}
            </div>
          ))}
        </div>
      </div>

      {/* Separator with losers note */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-border" />
        <span className="label-mono text-muted-foreground/60 px-2">
          losers drop to losers bracket
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Losers bracket */}
      <div>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
          <h3 className="font-mono text-xs font-bold tracking-widest text-muted-foreground">
            LOSERS BRACKET
          </h3>
        </div>
        <div className="flex items-start gap-0 min-w-max">
          {losersRounds.map((round, ri) => {
            let depth = 0;
            for (let i = 1; i <= ri; i++) {
              if (
                losersRounds[i].matches.length <
                losersRounds[i - 1].matches.length
              )
                depth++;
            }
            return (
              <div key={round.label} className="flex items-start">
                <RoundColumn
                  round={round}
                  roundIndex={depth}
                  totalRounds={losersRounds.length}
                  colRef={(el) => {
                    losers.colRefs.current[ri] = el;
                  }}
                />
                {ri < losersRounds.length - 1 &&
                  losers.centers[ri]?.length > 0 && (
                    <BracketConnector
                      fromCentersY={losers.centers[ri]}
                      toCount={losersRounds[ri + 1].matches.length}
                      width={ROUND_GAP}
                    />
                  )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Grand Final */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-border" />
          <div className="flex items-center gap-2">
            <Trophy size={12} className="text-primary" />
            <h3 className="font-mono text-xs font-bold tracking-widest text-foreground">
              GRAND FINAL
            </h3>
          </div>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="flex justify-center">
          <RoundColumn round={grandFinal} roundIndex={0} totalRounds={1} />
        </div>
      </div>
    </div>
  );
}

// ─── Round Column ─────────────────────────────────────────────────────────────

function RoundColumn({
  round,
  roundIndex,
  totalRounds,
  colRef,
}: {
  round: Round;
  roundIndex: number;
  totalRounds: number;
  colRef?: (el: HTMLDivElement | null) => void;
}) {
  const topPad = Math.round(roundTopPad(roundIndex));
  const cardGapForRound = Math.round(roundCardGap(roundIndex));
  return (
    <div ref={colRef} style={{ width: CARD_W }}>
      {/* Round header */}
      <div className="px-1 py-4" style={{ height: HEADER_H }}>
        <p className="label-mono text-foreground/80">{round.label}</p>
        <p className="font-mono text-[9px] text-muted-foreground/40 mt-0.5">
          {round.matches.length} MATCH{round.matches.length !== 1 ? "ES" : ""}
        </p>
      </div>
      {/* Match cards — offset so each card centers between its two parents */}
      <div
        className="flex flex-col"
        style={{ paddingTop: topPad, gap: cardGapForRound }}
      >
        {round.matches.map((match) => (
          <div key={match.id} data-card>
            <MatchCard match={match} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Match Card ───────────────────────────────────────────────────────────────

function MatchCard({ match }: { match: BracketMatch }) {
  const isBye = match.status === "bye";
  const winnerName =
    match.winner === "a"
      ? match.a.name
      : match.winner === "b"
      ? match.b.name
      : null;

  return (
    <div
      style={{ height: CARD_H }}
      className={cn(
        "rounded-lg border overflow-hidden flex flex-col",
        isBye
          ? "border-dashed border-border/40 opacity-50"
          : match.status === "live"
          ? "border-live/60 shadow-[0_0_12px_-4px] shadow-live/20"
          : match.status === "done"
          ? "border-border"
          : "border-dashed border-border"
      )}
    >
      {/* Top strip */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-1.5 border-b shrink-0",
          match.status === "live"
            ? "bg-live/10 border-live/20"
            : isBye
            ? "bg-muted/20 border-border/30"
            : match.status === "done"
            ? "bg-muted/20 border-border"
            : "bg-muted/10 border-border"
        )}
      >
        <div className="flex items-center gap-1.5">
          {match.status === "live" && (
            <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
          )}
          <span className="font-mono text-[9px] tracking-wider text-muted-foreground">
            {match.id}
          </span>
        </div>
        <StatusPill status={match.status} />
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col justify-around px-3 py-2 bg-card">
        {isBye ? (
          <p className="font-mono text-[9px] text-muted-foreground/40 tracking-wider text-center">
            AUTO ADVANCE
          </p>
        ) : (
          <>
            <ParticipantRow
              participant={match.a}
              isWinner={match.winner === "a"}
              isLoser={match.winner !== undefined && match.winner !== "a"}
            />
            <div className="flex items-center gap-2 py-0.5">
              <div className="flex-1 h-px bg-border/40" />
              <span className="font-mono text-[9px] text-muted-foreground/40">
                VS
              </span>
              <div className="flex-1 h-px bg-border/40" />
            </div>
            <ParticipantRow
              participant={match.b}
              isWinner={match.winner === "b"}
              isLoser={match.winner !== undefined && match.winner !== "b"}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Participant Row ──────────────────────────────────────────────────────────

function ParticipantRow({
  participant,
  isWinner,
  isLoser,
}: {
  participant: Participant;
  isWinner: boolean;
  isLoser: boolean;
}) {
  const isTbd =
    participant.name === "TBD" || participant.name.startsWith("TBD");
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {isWinner && <Trophy size={9} className="text-primary shrink-0" />}
      {participant.seed && !isWinner && !isLoser && (
        <span className="font-mono text-[9px] text-muted-foreground/50 shrink-0 w-4">
          {participant.seed}
        </span>
      )}
      {!isWinner && !isLoser && !participant.seed && (
        <span className="w-4 shrink-0" />
      )}
      <span
        className={cn(
          "text-xs truncate",
          isWinner
            ? "font-bold text-foreground"
            : isLoser
            ? "text-muted-foreground/50 line-through"
            : isTbd
            ? "text-muted-foreground/40 italic font-mono text-[10px]"
            : "text-foreground font-medium"
        )}
      >
        {participant.name}
      </span>
    </div>
  );
}

// ─── SVG Connector ────────────────────────────────────────────────────────────

function BracketConnector({
  fromCentersY,
  toCount,
  width,
}: {
  fromCentersY: number[];
  toCount: number;
  width: number;
}) {
  const fromCount = fromCentersY.length;
  if (fromCount === 0) return null;

  const pairsPerTarget = Math.ceil(fromCount / toCount);
  const midX = width / 2;
  const paths: string[] = [];

  for (let t = 0; t < toCount; t++) {
    const firstFrom = t * pairsPerTarget;
    const lastFrom = Math.min(firstFrom + pairsPerTarget - 1, fromCount - 1);
    const ys: number[] = [];

    for (let f = firstFrom; f <= lastFrom; f++) {
      const y = fromCentersY[f];
      ys.push(y);
      paths.push(`M 0 ${y} H ${midX}`);
    }

    if (ys.length > 1) {
      paths.push(`M ${midX} ${ys[0]} V ${ys[ys.length - 1]}`);
    }

    const targetY = ys.length === 1 ? ys[0] : (ys[0] + ys[ys.length - 1]) / 2;
    paths.push(`M ${midX} ${targetY} H ${width}`);
  }

  const svgHeight = fromCentersY[fromCentersY.length - 1] + 50;

  return (
    <svg
      width={width}
      height={svgHeight}
      style={{ flexShrink: 0, overflow: "visible" }}
      aria-hidden="true"
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

// ─── Status Pill ──────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: MatchStatus }) {
  if (status === "live")
    return (
      <span className="font-mono text-[9px] text-live tracking-widest">
        LIVE
      </span>
    );
  if (status === "done")
    return (
      <span className="font-mono text-[9px] text-muted-foreground tracking-widest">
        DONE
      </span>
    );
  if (status === "bye")
    return (
      <span className="font-mono text-[9px] text-border tracking-widest">
        BYE
      </span>
    );
  return (
    <span className="font-mono text-[9px] text-primary/60 tracking-widest">
      SOON
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FormatBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono tracking-wide transition-all",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="label-mono">{label}</span>
    </div>
  );
}
