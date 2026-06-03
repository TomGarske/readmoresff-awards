/**
 * Inaugural cycle config — pricing, calendar, prize structure.
 */

export const CHALLENGE = {
  slug: "readmoresff-1500-2026",
  name: "The ReadMoreSFF 1500",
  tagline: "1,500 words. 48 hours. The first ReadMoreSFF speculative-fiction prize.",
  format: "1500-word short story, three-round elimination",

  pricing: {
    listCents: 4500,    // $45
    promoCents: 3500,   // $35
    promoCode: "READMORE10",
    promoNote: "$10 off via launch code · matches NYC Midnight's effective fee",
  },

  wordLimit: 1500,
  wordPenalty: {
    overWordsForPenalty: 50,    // 1-50 over = -10% score
    overWordsForDQ: 51,         // 51+ over = disqualification
    penaltyPercent: 10,
  },

  fileFormats: [".doc", ".docx", ".txt", ".rtf"],
  fonts: ["12pt Courier", "12pt New Courier", "12pt Times New Roman"],

  // Calendar (placeholder — finalize when registration opens)
  calendar: {
    registrationOpens: "2026-08-01",
    registrationCloses: "2026-10-19",
    round1: { start: "2026-10-23T23:59:00-04:00", end: "2026-10-25T23:59:00-04:00" },
    round1Results: "2026-12-11",
    round2: { start: "2027-01-15T23:59:00-05:00", end: "2027-01-17T23:59:00-05:00" },
    round2Results: "2027-03-05",
    finalRound: { start: "2027-03-12T23:59:00-05:00", end: "2027-03-14T23:59:00-04:00" },
    finalResults: "2027-04-23",
  },

  // Three-round advancement (NYC Midnight pattern, ratios same)
  rounds: {
    round1: { groupSize: 40, advancePerGroup: 10 },
    round2: { groupSize: 40, advancePerGroup: 4 },
    final: { advance: 10 },  // top 10 ranked overall
  },

  prizes: {
    baseFloor: 7450,        // $ committed regardless of registration volume
    ladder: [
      { place: 1, cents: 300000 },
      { place: 2, cents: 150000 },
      { place: 3, cents: 80000 },
      { place: 4, cents: 50000 },
      { place: 5, cents: 40000 },
      { place: 6, cents: 25000 },
      { place: 7, cents: 25000 },
      { place: 8, cents: 25000 },
      { place: 9, cents: 25000 },
      { place: 10, cents: 25000 },
    ],
    revenueShareNote:
      "If registration exceeds 500 writers, 50% of net revenue above the $10K budget floor goes back into the prize pool.",
  },
} as const;

export type ChallengeConfig = typeof CHALLENGE;
