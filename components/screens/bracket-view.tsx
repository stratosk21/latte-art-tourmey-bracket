"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { cn } from "@/lib/utils";
import { Trophy, Swords } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type MatchStatus = "live" | "upcoming" | "done" | "bye";
type Format = "single" | "double";
type PatternMode = "fixed" | "category" | "wildcard";

interface Participant {
  name: string;
  seed?: number;
  shop?: string;
  pour?: string;
  isBye?: boolean;
}

interface BracketMatch {
  id: string;
  a: Participant;
  b: Participant;
  winner?: "a" | "b";
  status: MatchStatus;
  category?: string;
  patternMode?: PatternMode;
  scoreA?: number;
  scoreB?: number;
}

export interface Round {
  label: string;
  matches: BracketMatch[];
}

// ─── Data: Single Elimination ─────────────────────────────────────────────────

const singleBracket: Round[] = [
  {
    label: "Round of 32",
    matches: [
      {
        id: "R32-1",
        a: { name: "Mara Tanaka", seed: 1, shop: "Third Wave Co." },
        b: { name: "BYE", isBye: true },
        winner: "a",
        status: "bye",
      },
      {
        id: "R32-2",
        a: { name: "Leo Ferreira", seed: 2, shop: "Blue Bottle" },
        b: { name: "BYE", isBye: true },
        winner: "a",
        status: "bye",
      },
      {
        id: "R32-3",
        a: { name: "Soo-Jin Park", seed: 3, shop: "Stumptown" },
        b: { name: "BYE", isBye: true },
        winner: "a",
        status: "bye",
      },
      {
        id: "R32-4",
        a: { name: "Oliver Strauss", seed: 4, shop: "Kestrel Coffee" },
        b: { name: "BYE", isBye: true },
        winner: "a",
        status: "bye",
      },
      {
        id: "R32-5",
        a: { name: "Priya Nair", seed: 5, shop: "Verve Coffee" },
        b: { name: "Cam Delacroix", seed: 24, shop: "Ritual" },
        winner: "a",
        status: "done",
        category: "Rosetta",
        scoreA: 8.2,
        scoreB: 6.9,
      },
      {
        id: "R32-6",
        a: { name: "Hana Wolff", seed: 6, shop: "Coava" },
        b: { name: "Joel Okoro", seed: 23, shop: "Sightglass" },
        winner: "b",
        status: "done",
        category: "Rosetta",
        scoreA: 7.1,
        scoreB: 7.8,
      },
      {
        id: "R32-7",
        a: { name: "Nico Beaumont", seed: 7, shop: "Ember Roasters" },
        b: { name: "Ryu Matsuda", seed: 22, shop: "Onyx Coffee" },
        winner: "a",
        status: "done",
        category: "Tulip",
        scoreA: 8.5,
        scoreB: 7.3,
      },
      {
        id: "R32-8",
        a: { name: "Isla Vance", seed: 8, shop: "Kettle & Co." },
        b: { name: "Tobias Ehn", seed: 21, shop: "Heart Coffee" },
        status: "live",
        category: "Tulip",
        scoreA: 7.6,
        scoreB: 7.2,
      },
      {
        id: "R32-9",
        a: { name: "Marco Lund", seed: 9, shop: "Maritime Roasters" },
        b: { name: "Yuki Sato", seed: 20, shop: "Toby's Estate" },
        status: "live",
        category: "Swan",
      },
      {
        id: "R32-10",
        a: { name: "Asha Diallo", seed: 10, shop: "North Star Coffee" },
        b: { name: "Finn Hofer", seed: 19, shop: "La Marzocco" },
        status: "upcoming",
        category: "Swan",
      },
      {
        id: "R32-11",
        a: { name: "Ezra Bloom", seed: 11, shop: "Sparrow Coffee" },
        b: { name: "Tae-Young Kim", seed: 18, shop: "Chromatic Coffee" },
        status: "upcoming",
        category: "Wing-Tulip",
        patternMode: "category",
      },
      {
        id: "R32-12",
        a: { name: "Luna Castillo", seed: 12, shop: "Folio Espresso" },
        b: { name: "Daria Moren", seed: 17, shop: "George Howell" },
        status: "upcoming",
        category: "Wing-Tulip",
        patternMode: "category",
      },
      {
        id: "R32-13",
        a: { name: "BYE", isBye: true },
        b: { name: "Viktor Helm", seed: 16, shop: "Madal Cafe" },
        winner: "b",
        status: "bye",
      },
      {
        id: "R32-14",
        a: { name: "BYE", isBye: true },
        b: { name: "Noa Stern", seed: 15, shop: "Square Mile" },
        winner: "b",
        status: "bye",
      },
      {
        id: "R32-15",
        a: { name: "BYE", isBye: true },
        b: { name: "Chiara Russo", seed: 14, shop: "Tim Wendelboe" },
        winner: "b",
        status: "bye",
      },
      {
        id: "R32-16",
        a: { name: "BYE", isBye: true },
        b: { name: "Akira Yoshida", seed: 13, shop: "Fuglen Tokyo" },
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
        a: { name: "Mara Tanaka", seed: 1 },
        b: { name: "Leo Ferreira", seed: 2 },
        winner: "a",
        status: "done",
        category: "Rosetta",
        scoreA: 8.4,
        scoreB: 7.1,
      },
      {
        id: "R16-2",
        a: { name: "Soo-Jin Park", seed: 3 },
        b: { name: "Oliver Strauss", seed: 4 },
        winner: "b",
        status: "done",
        category: "Swan",
        scoreA: 7.6,
        scoreB: 8.1,
      },
      {
        id: "R16-3",
        a: { name: "Priya Nair", seed: 5 },
        b: { name: "Joel Okoro", seed: 23 },
        winner: "a",
        status: "done",
        category: "Tulip",
        scoreA: 8.0,
        scoreB: 7.4,
      },
      {
        id: "R16-4",
        a: { name: "Nico Beaumont", seed: 7 },
        b: { name: "Isla Vance", seed: 8 },
        status: "live",
        category: "Wing-Tulip",
        patternMode: "category",
        scoreA: 7.8,
        scoreB: 7.4,
      },
      {
        id: "R16-5",
        a: { name: "Marco Lund", seed: 9 },
        b: { name: "Yuki Sato", seed: 20 },
        status: "upcoming",
        category: "Rosetta",
      },
      {
        id: "R16-6",
        a: { name: "Asha Diallo", seed: 10 },
        b: { name: "TBD" },
        status: "upcoming",
        category: "Swan",
      },
      {
        id: "R16-7",
        a: { name: "TBD" },
        b: { name: "Viktor Helm", seed: 16 },
        status: "upcoming",
        category: "Tulip",
      },
      {
        id: "R16-8",
        a: { name: "TBD" },
        b: { name: "Noa Stern", seed: 15 },
        status: "upcoming",
        category: "Freestyle",
        patternMode: "wildcard",
      },
    ],
  },
  {
    label: "Quarterfinals",
    matches: [
      { id: "QF-1", a: { name: "Mara Tanaka", seed: 1 }, b: { name: "Oliver Strauss", seed: 4 }, status: "upcoming", category: "Freestyle", patternMode: "wildcard" },
      { id: "QF-2", a: { name: "Priya Nair", seed: 5 }, b: { name: "TBD" }, status: "upcoming", category: "Freestyle", patternMode: "wildcard" },
      { id: "QF-3", a: { name: "TBD" }, b: { name: "TBD" }, status: "upcoming" },
      { id: "QF-4", a: { name: "TBD" }, b: { name: "TBD" }, status: "upcoming" },
    ],
  },
  {
    label: "Semifinals",
    matches: [
      { id: "SF-1", a: { name: "TBD" }, b: { name: "TBD" }, status: "upcoming" },
      { id: "SF-2", a: { name: "TBD" }, b: { name: "TBD" }, status: "upcoming" },
    ],
  },
  {
    label: "Grand Final",
    matches: [
      { id: "GF-1", a: { name: "TBD" }, b: { name: "TBD" }, status: "upcoming" },
    ],
  },
];

// ─── Data: Double Elimination ─────────────────────────────────────────────────

const winnersRounds: Round[] = [
  {
    label: "WB Round 1",
    matches: [
      { id: "W1-1", a: { name: "Mara Tanaka", seed: 1 }, b: { name: "Cam Delacroix", seed: 8 }, winner: "a", status: "done", scoreA: 8.6, scoreB: 7.0 },
      { id: "W1-2", a: { name: "Leo Ferreira", seed: 2 }, b: { name: "Hana Wolff", seed: 7 }, winner: "a", status: "done", scoreA: 7.9, scoreB: 7.2 },
      { id: "W1-3", a: { name: "Soo-Jin Park", seed: 3 }, b: { name: "Nico Beaumont", seed: 6 }, winner: "b", status: "done", scoreA: 7.3, scoreB: 8.0 },
      { id: "W1-4", a: { name: "Oliver Strauss", seed: 4 }, b: { name: "Priya Nair", seed: 5 }, status: "live", scoreA: 8.1, scoreB: 7.9 },
    ],
  },
  {
    label: "WB Quarters",
    matches: [
      { id: "WQ-1", a: { name: "Mara Tanaka" }, b: { name: "Leo Ferreira" }, status: "upcoming" },
      { id: "WQ-2", a: { name: "Nico Beaumont" }, b: { name: "TBD" }, status: "upcoming" },
    ],
  },
  {
    label: "WB Final",
    matches: [
      { id: "WBF-1", a: { name: "TBD" }, b: { name: "TBD" }, status: "upcoming" },
    ],
  },
];

const losersRounds: Round[] = [
  {
    label: "LB Round 1",
    matches: [
      { id: "L1-1", a: { name: "Cam Delacroix" }, b: { name: "Hana Wolff" }, winner: "a", status: "done", scoreA: 7.8, scoreB: 6.9 },
      { id: "L1-2", a: { name: "Soo-Jin Park" }, b: { name: "TBD" }, status: "upcoming" },
    ],
  },
  {
    label: "LB Quarters",
    matches: [
      { id: "LQ-1", a: { name: "Cam Delacroix" }, b: { name: "TBD" }, status: "upcoming" },
    ],
  },
  {
    label: "LB Final",
    matches: [
      { id: "LBF-1", a: { name: "TBD" }, b: { name: "TBD" }, status: "upcoming" },
    ],
  },
];

const grandFinal: Round = {
  label: "Grand Final",
  matches: [
    { id: "GF-1", a: { name: "TBD (WB)" }, b: { name: "TBD (LB)" }, status: "upcoming" },
  ],
};

// ─── Layout constants ─────────────────────────────────────────────────────────

const CARD_W = 300;
const CARD_H = 100;
const BYE_H = 36;
const CARD_GAP = 18;
const ROUND_GAP = 48;
const HEADER_H = 60;

function roundTopPad(i: number) {
  return ((Math.pow(2, i) - 1) * (CARD_H + CARD_GAP)) / 2;
}
function roundCardGap(i: number) {
  return Math.pow(2, i) * (CARD_H + CARD_GAP) - CARD_H;
}

// CARD_HEADER_H: height of the hairline top bar in MatchCard
const CARD_HEADER_H = 26;

function measureCenters(colEl: HTMLDivElement): number[] {
  const colRect = colEl.getBoundingClientRect();
  return Array.from(colEl.querySelectorAll<HTMLElement>("[data-card]")).map(
    (el) => {
      const r = el.getBoundingClientRect();
      const topY = r.top - colRect.top;
      if (r.height <= BYE_H + 2) {
        // BYE chip: connect to its vertical center
        return topY + r.height / 2;
      }
      // Match card: connect to the divider between the two player rows
      return topY + CARD_HEADER_H + (r.height - CARD_HEADER_H) / 2;
    }
  );
}

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

export interface BracketViewProps {
  rounds?: Round[];
  throwdownTitle?: string;
}

export function BracketView({ rounds: propRounds, throwdownTitle }: BracketViewProps = {}) {
  const [format, setFormat] = useState<Format>("single");

  const bracketRounds = propRounds ?? singleBracket;

  const liveCount = bracketRounds
    .flatMap((r) => r.matches)
    .filter((m) => m.status === "live").length;

  return (
    <div className="h-full flex flex-col">
      {/* Quiet subheader — no wave canvas on bracket pages */}
      <div className="border-b border-border bg-card px-8 py-5 shrink-0">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              {throwdownTitle ?? "Spring Throwdown 2026"} · 24 baristas
            </p>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Bracket
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {liveCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-live animate-pulse shrink-0" />
                <span className="text-sm font-semibold text-live">
                  {liveCount} {liveCount === 1 ? "match" : "matches"} live now
                </span>
              </div>
            )}
            <div className="flex items-center gap-1 bg-muted/60 border border-border rounded-md p-1">
              <FormatBtn
                active={format === "single"}
                onClick={() => setFormat("single")}
                icon={<Swords size={11} />}
                label="Single Elim"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bracket canvas */}
      <div className="flex-1 overflow-auto p-8">
        {format === "single" ? (
          <SingleElimBracket rounds={bracketRounds} />
        ) : (
          <DoubleElimBracket />
        )}
      </div>
    </div>
  );
}

// ─── Single Elimination Layout ────────────────────────────────────────────────

function SingleElimBracket({ rounds }: { rounds: Round[] }) {
  const { colRefs, centers } = useRoundMeasurements();

  // Extract bye matches from the first round for the bye strip
  const firstRound = rounds[0];
  const byeSeeds = firstRound?.matches
    .filter((m) => m.status === "bye")
    .map((m) => {
      const seed = m.a.isBye ? m.b : m.a;
      return seed;
    }) ?? [];

  return (
    <div>
      {/* Bye strip */}
      {byeSeeds.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-muted-foreground">
              {byeSeeds.length} seed{byeSeeds.length !== 1 ? "s" : ""} advance directly to Round of 16
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="flex flex-wrap gap-2">
            {byeSeeds.map((p) => (
              <ByeSeedChip key={p.name} participant={p} />
            ))}
          </div>
        </div>
      )}

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
            {ri < rounds.length - 1 && centers[ri]?.length > 0 && centers[ri + 1]?.length > 0 && (
              <BracketConnector
                fromCentersY={centers[ri]}
                toCentersY={centers[ri + 1]}
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
      <div>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground tracking-tight">
            Winners Bracket
          </h3>
        </div>
        <div className="flex items-start gap-0 min-w-max">
          {winnersRounds.map((round, ri) => (
            <div key={round.label} className="flex items-start">
              <RoundColumn
                round={round}
                roundIndex={ri}
                totalRounds={winnersRounds.length}
                colRef={(el) => { winners.colRefs.current[ri] = el; }}
              />
              {ri < winnersRounds.length - 1 && winners.centers[ri]?.length > 0 && winners.centers[ri + 1]?.length > 0 && (
                <BracketConnector
                  fromCentersY={winners.centers[ri]}
                  toCentersY={winners.centers[ri + 1]}
                  width={ROUND_GAP}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground/60 px-2 font-mono tracking-wider">
          losers drop to losers bracket
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
          <h3 className="font-display text-sm font-semibold text-muted-foreground tracking-tight">
            Losers Bracket
          </h3>
        </div>
        <div className="flex items-start gap-0 min-w-max">
          {losersRounds.map((round, ri) => {
            let depth = 0;
            for (let i = 1; i <= ri; i++) {
              if (losersRounds[i].matches.length < losersRounds[i - 1].matches.length)
                depth++;
            }
            return (
              <div key={round.label} className="flex items-start">
                <RoundColumn
                  round={round}
                  roundIndex={depth}
                  totalRounds={losersRounds.length}
                  colRef={(el) => { losers.colRefs.current[ri] = el; }}
                />
                {ri < losersRounds.length - 1 && losers.centers[ri]?.length > 0 && losers.centers[ri + 1]?.length > 0 && (
                  <BracketConnector
                    fromCentersY={losers.centers[ri]}
                    toCentersY={losers.centers[ri + 1]}
                    width={ROUND_GAP}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-border" />
          <div className="flex items-center gap-2">
            <Trophy size={12} className="text-primary" />
            <h3 className="font-display text-sm font-semibold text-foreground tracking-tight">
              Grand Final
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
  totalRounds?: number;
  colRef?: (el: HTMLDivElement | null) => void;
}) {
  const topPad = Math.round(roundTopPad(roundIndex));
  const cardGapForRound = Math.round(roundCardGap(roundIndex));

  return (
    <div ref={colRef} style={{ width: CARD_W }}>
      {/* Round header */}
      <div className="px-1 py-3" style={{ height: HEADER_H }}>
        <p className="font-display text-sm font-semibold text-foreground/80 tracking-tight">
          {round.label}
        </p>
        <p className="text-xs text-muted-foreground/50 mt-0.5">
          {round.matches.filter((m) => m.status !== "bye").length}{" "}
          {round.matches.filter((m) => m.status !== "bye").length === 1
            ? "match"
            : "matches"}
        </p>
      </div>
      {/* Cards */}
      <div
        className="flex flex-col"
        style={{ paddingTop: topPad, gap: cardGapForRound }}
      >
        {round.matches.map((match) => (
          <div key={match.id} data-card>
            {match.status === "bye" ? (
              <ByeChipInline match={match} />
            ) : (
              <MatchCard match={match} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Match Card (V2 — Name-first, scorecard hierarchy) ───────────────────────

function MatchCard({ match }: { match: BracketMatch }) {
  const { a, b, status, id, winner, category, patternMode, scoreA, scoreB } = match;
  const isLive = status === "live";
  const isDone = status === "done";

  return (
    <div
      style={{ height: CARD_H, width: CARD_W }}
      className={cn(
        "rounded-md border overflow-hidden flex flex-col bg-card",
        isLive
          ? "border-live/50 shadow-[0_0_0_3px] shadow-live/8"
          : "border-border"
      )}
    >
      {/* Hairline top bar */}
      <div
        className={cn(
          "flex items-center justify-between px-2.5 border-b shrink-0",
          isLive ? "bg-live/6 border-border/60" : "border-border/60"
        )}
        style={{ height: 26 }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[9px] tracking-wider text-muted-foreground shrink-0">
            {id}
          </span>
          {category && (
            <>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30 shrink-0" />
              <span className="text-[10px] text-muted-foreground truncate">
                {category}
              </span>
              {patternMode === "wildcard" && (
                <span className="font-mono text-[8px] tracking-widest text-accent border border-accent/60 rounded px-1 py-px shrink-0">
                  FREE
                </span>
              )}
              {patternMode === "category" && (
                <span className="font-mono text-[8px] tracking-widest text-muted-foreground border border-border rounded px-1 py-px shrink-0">
                  CAT
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isLive && (
            <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
          )}
          <span
            className={cn(
              "font-mono text-[9px] tracking-widest",
              isLive
                ? "text-live font-bold"
                : isDone
                ? "text-muted-foreground"
                : "text-primary/60"
            )}
          >
            {isLive ? "LIVE" : isDone ? "FINAL" : "SOON"}
          </span>
        </div>
      </div>

      {/* Participant rows */}
      <div className="flex-1 flex flex-col">
        <ParticipantRow
          participant={a}
          isWinner={winner === "a"}
          isLoser={winner === "b"}
          score={scoreA}
          isTop
        />
        <ParticipantRow
          participant={b}
          isWinner={winner === "b"}
          isLoser={winner === "a"}
          score={scoreB}
        />
      </div>
    </div>
  );
}

// ─── Participant Row ──────────────────────────────────────────────────────────

function ParticipantRow({
  participant,
  isWinner,
  isLoser,
  score,
  isTop,
}: {
  participant: Participant;
  isWinner: boolean;
  isLoser: boolean;
  score?: number;
  isTop?: boolean;
}) {
  const isTbd =
    participant.name === "TBD" || participant.name.startsWith("TBD");

  return (
    <div
      className={cn(
        "flex-1 flex items-center gap-2 px-0 relative",
        isTop && "border-b border-border/50",
        isWinner ? "bg-primary/5" : "bg-transparent"
      )}
      style={{ opacity: isLoser ? 0.45 : 1 }}
    >
      {/* Winner indicator bar */}
      <div
        className={cn(
          "self-stretch rounded-r-sm",
          isWinner ? "bg-primary" : "bg-transparent"
        )}
        style={{ width: 3, margin: "5px 0" }}
      />
      {/* Seed */}
      <span className="font-mono text-[10px] text-muted-foreground/50 w-5 text-right shrink-0">
        {participant.seed ? `${participant.seed}` : ""}
      </span>
      {/* Name */}
      <span
        className={cn(
          "flex-1 truncate",
          isWinner ? "text-sm font-semibold text-foreground" : "text-sm font-medium",
          isTbd
            ? "text-muted-foreground/40 italic font-mono text-xs"
            : isLoser
            ? "text-foreground/50"
            : "text-foreground"
        )}
      >
        {participant.name}
      </span>
      {/* Score */}
      {score != null && (
        <span
          className={cn(
            "font-mono text-xl tabular-nums shrink-0 pr-2.5",
            isWinner
              ? "font-bold text-primary"
              : "font-normal text-muted-foreground"
          )}
        >
          {score.toFixed(1)}
        </span>
      )}
    </div>
  );
}

// ─── Bye Seed Chip (bye strip above bracket) ──────────────────────────────────

function ByeSeedChip({ participant }: { participant: Participant }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded border border-dashed border-border bg-card/60"
      style={{ height: 32 }}
    >
      <span className="font-mono text-[9px] text-muted-foreground/50 w-4">
        {participant.seed}
      </span>
      <span className="text-xs text-muted-foreground">{participant.name}</span>
      <span className="font-mono text-[8px] tracking-wider text-muted-foreground/40 ml-1">
        → R16
      </span>
    </div>
  );
}

// ─── Bye Chip Inline (inside bracket column) ──────────────────────────────────

function ByeChipInline({ match }: { match: BracketMatch }) {
  const advancer = match.a.isBye ? match.b : match.a;
  return (
    <div
      className="flex items-center gap-2 px-2.5 rounded border border-dashed border-border/40 bg-transparent"
      style={{ height: BYE_H, width: CARD_W }}
    >
      <span className="font-mono text-[9px] text-muted-foreground/40 w-4">
        {advancer.seed ?? ""}
      </span>
      <span className="text-xs text-muted-foreground/50 truncate flex-1">
        {advancer.name}
      </span>
      <span className="font-mono text-[8px] tracking-wider text-muted-foreground/30">
        BYE ↳
      </span>
    </div>
  );
}

// ─── SVG Connector ────────────────────────────────────────────────────────────

function BracketConnector({
  fromCentersY,
  toCentersY,
  width,
}: {
  fromCentersY: number[];
  toCentersY: number[];
  width: number;
}) {
  const fromCount = fromCentersY.length;
  const toCount = toCentersY.length;
  if (fromCount === 0 || toCount === 0) return null;

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

    const mergeY = ys.length === 1 ? ys[0] : (ys[0] + ys[ys.length - 1]) / 2;
    if (ys.length > 1) {
      paths.push(`M ${midX} ${ys[0]} V ${ys[ys.length - 1]}`);
    }

    const targetY = toCentersY[t];
    if (Math.abs(mergeY - targetY) > 0.5) {
      paths.push(`M ${midX} ${mergeY} V ${targetY}`);
    }
    paths.push(`M ${midX} ${targetY} H ${width}`);
  }

  const allYs = [...fromCentersY, ...toCentersY];
  const svgHeight = Math.max(...allYs) + 50;

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
          strokeWidth={1}
          strokeLinecap="round"
        />
      ))}
    </svg>
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
