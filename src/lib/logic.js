// Free-tier plan generation. Pure functions — the NUMBERS live here, never in the AI.
import { PLATFORMS, OBJECTIVES, FIT, AUDIENCE, COMPLIANCE, COMPLIANCE_DEFAULT } from "./data.js";

export const fmt = (n) => Math.round(n).toLocaleString("en-US");

export function budgetSplit({ platforms, objective, budget, period, weeks }) {
  const monthly = period === "total" ? (budget / Math.max(1, weeks)) * 4.345 : budget;
  const fit = FIT[objective] || FIT.leads;
  const total = platforms.reduce((s, p) => s + (fit[p] || 1), 0) || 1;
  const rows = platforms.map((p) => ({ p, short: PLATFORMS[p].short, pct: Math.round(((fit[p] || 1) / total) * 100) }));
  const drift = 100 - rows.reduce((s, r) => s + r.pct, 0);
  if (rows.length) rows[0].pct += drift;
  rows.forEach((r) => { r.monthly = monthly * (r.pct / 100); r.periodAmt = budget * (r.pct / 100); r.daily = r.monthly / 30.4; });
  return { rows, monthly, totalBudget: budget };
}

export function structure({ objective, platforms }) {
  const obj = OBJECTIVES[objective];
  return platforms.map((p) => ({
    p, short: PLATFORMS[p].short,
    lines: [
      `Campaign: 1 objective-led campaign (${obj.meta}).`,
      `Ad sets: 2–3 to start — split by audience angle, not tiny interests.`,
      `Ads: 3–5 creatives per ad set so the algorithm has variety.`,
      `Naming: {Platform}_{Objective}_{Audience}_{Creative} — e.g. ${PLATFORMS[p].short}_${objective}_LAL_ReelA.`
    ]
  }));
}

export const audiencePerPlatform = ({ platforms, audience }) =>
  platforms.map((p) => ({ p, short: PLATFORMS[p].short, text: AUDIENCE[p](audience || "your core customer") }));

export const creativePerPlatform = ({ platforms }) =>
  platforms.map((p) => ({ p, short: PLATFORMS[p].short, formats: PLATFORMS[p].formats }));

export function tracking({ objective }) {
  const ev = { leads:"Lead / CompleteRegistration + qualified-lead value", sales:"Purchase (value + currency), AddToCart, InitiateCheckout",
    visits:"LandingPageView + direction clicks", awareness:"Reach & frequency (no conversion event needed)",
    engagement:"Post engagement, video-views, saves", installs:"App install + one key in-app event" }[objective];
  return [
    `Install Meta Pixel + Conversions API (server-side) and the Google tag / GA4 before spending.`,
    `Primary event to optimise: ${ev}.`,
    `UTM every link: utm_source={platform}&utm_medium=paid&utm_campaign={campaign}&utm_content={creative}.`,
    `Route conversions into your CRM / WhatsApp so you measure closed business, not just platform-reported results.`,
    `Agree the attribution window (e.g. 7-day click / 1-day view) before launch, not after.`
  ];
}

export const landing = ({ language }) => [
  "One page, one goal — match the ad's offer and headline exactly (message match).",
  "Above the fold: the offer, one clear CTA, and a trust signal (rating / logo / guarantee).",
  "Mobile-first and fast — under ~3s load; most UAE traffic is on a phone.",
  language !== "en" ? "Provide the page in Arabic with proper RTL layout." : "Keep copy tight and skimmable; lead with benefits.",
  "Make contact frictionless: WhatsApp button, short form (name + phone), or one-tap call.",
  "Add a thank-you page that fires the conversion event and sets follow-up expectations."
];

export function compliance({ business, brief }) {
  const t = ((business || "") + " " + (brief || "")).toLowerCase();
  let flags = [];
  COMPLIANCE.forEach((c) => { if (c.match.some((m) => t.includes(m))) flags = flags.concat(c.flags); });
  return flags.length ? flags.concat(COMPLIANCE_DEFAULT.slice(0, 1)) : COMPLIANCE_DEFAULT;
}

export const qa = () => [
  "Tracking verified — fire a test conversion and confirm it lands in Events Manager + CRM.",
  "Every link works and carries the right UTMs.",
  "Copy proofread in each language; Arabic checked by a native speaker.",
  "Creatives meet each platform's spec and safe-zone (no cut-off text).",
  "Billing active with enough limit for the first week.",
  "Budgets, schedule and geo double-checked; compliance items cleared.",
  "Approvals signed off by the decision-maker before you publish."
];

const PHASES = [
  {phase:"Launch & learn",focus:"Go live with all ad sets and creatives. Do NOT edit — let each exit the learning phase.",watch:"Delivery, CTR, CPM, early cost-per-result.",expect:"Metrics are unstable — this is data-gathering, not judgement time.",why:"Editing during learning resets it and burns budget."},
  {phase:"Read & cut",focus:"Pause the bottom 20–30% by cost-per-result. Shift budget to the top ad sets.",watch:"Cost-per-result stabilising, frequency, CTR.",expect:"Cost-per-result should trend down.",why:"You now have enough data to trust winners over losers."},
  {phase:"Scale winners",focus:"Raise winning budgets 20–30% every 2–3 days. Turn on retargeting.",watch:"Does efficiency hold as spend rises? Frequency creep.",expect:"More volume inside your target cost band.",why:"Gradual scaling keeps the algorithm stable; big jumps reset learning."},
  {phase:"Refresh creative",focus:"Fatigue is setting in — launch new hooks and refresh top performers.",watch:"Frequency (>2.5–3), CTR decline, CPM rising.",expect:"New creative resets CTR and pulls CPM down.",why:"Same audience + same creative = costs climb."},
  {phase:"Expand & optimise",focus:"Broaden winning audiences, test a new geo or angle, tighten bids.",watch:"Incremental cost-per-result of new segments vs core.",expect:"Steady scale without efficiency collapsing.",why:"Controlled expansion finds fresh demand once the core is proven."},
  {phase:"Review & report",focus:"Full readout: cost-per-result vs target, what to keep and cut next flight.",watch:"Blended CPL/CPA/ROAS and closed business from the CRM.",expect:"A clear verdict and a sharper next cycle.",why:"Platform numbers only matter if they map to real revenue."}
];
const PNOTE = {
  meta:"Meta's learning phase ≈ 50 conversions/ad set/week — keep budgets high enough to reach it.",
  google:"Let Smart Bidding gather conversions before judging; add negative keywords weekly.",
  tiktok:"Refresh creative fastest here — TikTok fatigues in days, not weeks.",
  snapchat:"Front-load the hook; Snap viewers decide in the first 2 seconds.",
  linkedin:"Higher CPMs mean slower data — give it time and use lead-gen forms to lift conversion.",
  x:"Lean into timely, event-led angles; evergreen creative underperforms."
};
export function weeklyPlan({ platforms, weeks }) {
  const w = Math.max(1, Math.min(12, weeks));
  return platforms.map((p) => {
    const list = [];
    for (let i = 0; i < w; i++) {
      let ph;
      if (i === 0) ph = PHASES[0];
      else if (i === w - 1 && w >= 3) ph = PHASES[5];
      else if (i === 1) ph = PHASES[1];
      else if (i === 2) ph = PHASES[2];
      else ph = PHASES[3 + ((i - 3) % 2)];
      list.push({ n: i + 1, ...ph });
    }
    return { p, short: PLATFORMS[p].short, note: PNOTE[p], weeks: list };
  });
}

export const optimisation = ({ objective }) => {
  const k = OBJECTIVES[objective].kpi;
  return [
    `Scale rule: if an ad set beats target ${k} for 3+ days, raise budget 20–30% every 2–3 days.`,
    `Kill rule: pause any ad that spends ~2× your target cost-per-result with zero results.`,
    `Creative rule: refresh when frequency passes ~2.5–3 or CTR drops 20%+ from peak.`,
    `Always-on retargeting: visitors, engagers and cart/lead-starters get their own campaign.`,
    `Retention layer: pipe buyers into email + WhatsApp flows so you stop renting customers.`
  ];
};

export const nextSteps = () => [
  { action: "Verify Pixel + Conversions API firing correctly", owner: "You", when: "Day 1" },
  { action: "Confirm stock / service capacity for the campaign period", owner: "Ops", when: "Day 2" },
  { action: "Produce the creative library in every required language", owner: "Creative", when: "Day 3–7" },
  { action: "Apply the landing-page fixes above", owner: "Web", when: "Day 5" },
  { action: "Build campaigns, run QA, soft-launch at 30% budget", owner: "Media", when: "Day 8" }
];

export function assumptions(inputs, split) {
  const rows = [
    { a: "Monthly media budget", s: "Your input", v: `AED ${fmt(split.monthly)}` },
    { a: "Objective", s: "Your input", v: OBJECTIVES[inputs.objective].label },
    { a: "Blended CPM range", s: "Benchmark (src/lib/data.js)", v: `AED ${PLATFORMS[inputs.platforms[0]].cpm.join(" – ")}` },
    { a: "Blended CPC range", s: "Benchmark (src/lib/data.js)", v: `AED ${PLATFORMS[inputs.platforms[0]].cpc.join(" – ")}` }
  ];
  const e = inputs.extra || {};
  if (e.aov) rows.push({ a: "Average order value", s: "Your input", v: `AED ${e.aov}` });
  if (e.margin) rows.push({ a: "Gross margin", s: "Your input", v: `${e.margin}%` });
  if (e.targetKPI) rows.push({ a: "Success target", s: "Your input", v: e.targetKPI });
  if (e.aov && e.margin && e.targetKPI && /^[\d.]+x?$/i.test(String(e.targetKPI))) {
    const roas = parseFloat(e.targetKPI);
    if (roas > 0) rows.push({ a: "Implied max CPA", s: "Calculated", v: `AED ${fmt((e.aov * (e.margin / 100)) / roas * roas / roas || e.aov / roas)}` });
  }
  return rows;
}

// Fallback strategy text when there's no AI key.
export function fallbackStrategy(inputs) {
  const a = inputs.audience || "your core customer";
  return {
    exec: { paragraph: `${inputs.business} running ${OBJECTIVES[inputs.objective].label.toLowerCase()} in ${inputs.location} over ${inputs.weeks} weeks on AED ${fmt(inputs.budget)} ${inputs.period === "total" ? "total" : "per month"}. Budget is allocated by objective-fit across ${inputs.platforms.length} channel${inputs.platforms.length>1?"s":""}, prospecting-led with retargeting layered from week 3.`,
      bet: inputs.offer ? `Lead with the offer — "${inputs.offer}" — and let proof carry the click.` : `Lead with the single sharpest benefit for ${a}, backed by proof.`,
      outcome: `A disciplined test-and-scale cycle: learn in weeks 1–2, cut and scale from week 3.` },
    situation: { standing: "Add your current performance baseline in the optional fields for a sharper read.", market: "UAE paid media is creative-led: costs are set by how well the creative performs, not by targeting alone.", gap: "Most competitors sell outcomes. The opportunity is usually to show the mechanism." },
    kpis: { primary: { metric: OBJECTIVES[inputs.objective].kpi, target: (inputs.extra||{}).targetKPI || "set a target in the optional fields", how: "Platform-reported, reconciled against CRM/store data" },
      secondary: { metric: "CTR", target: "above account average", how: "Weekly review" },
      diagnostic: { metric: "CPM · Frequency", why: "Early warning for creative fatigue" },
      notOptimising: "Reach and engagement. They rise as a by-product — treating them as goals pulls budget from the real objective." },
    audiences: [
      { name: "Cold prospecting", insight: `${a} doesn't know you yet.`, message: "Lead with the problem, not the brand.", channel: inputs.platforms[0] },
      { name: "Warm engagers", insight: "They engaged but didn't convert.", message: "Handle the objection; add a reason to act now.", channel: inputs.platforms[0] },
      { name: "Retargeting", insight: "They visited and hesitated.", message: "Proof plus the offer.", channel: inputs.platforms[0] }
    ],
    positioning: { proposition: `The clearest reason ${a} should choose ${inputs.business}.`, supporting: ["Benefit for the cold audience","Objection-handler for the warm audience"], rtb: ["Proof point 1","Proof point 2"] },
    channelRationale: inputs.platforms.map((p) => ({ platform: p, why: PLATFORMS[p].label + " — allocated by objective fit." })),
    notDoing: `Channels not selected were excluded to concentrate budget. Fewer channels run well beats more run badly.`,
    creative: { concept: "Show the mechanism, not the logo.", matrix: [], assetCount: `${inputs.platforms.length * 5}–${inputs.platforms.length * 6} assets` },
    testing: [
      { priority: "P1", name: "Hook test", varies: "First 3 seconds only", rule: "Kill the loser after 3 days at 20% lower 3-sec view rate." },
      { priority: "P2", name: "Offer test", varies: "Offer card only", rule: "Scale the winner at 30 conversions at target cost." },
      { priority: "P3", name: "Audience test", varies: "Broad vs lookalike", rule: "Reallocate after 50 conversions per arm." }
    ],
    risks: [
      { severity: "High", risk: "Creative fatigue", mitigation: "Build a deep asset library before launch.", fallback: "Broaden the audience before cutting spend." },
      { severity: "Medium", risk: "Ad account verification", mitigation: "Have trade licence documents ready.", fallback: "Use a verified partner account." },
      { severity: "Medium", risk: "Tracking gaps", mitigation: "Server-side events before spend.", fallback: "Use UTM + CRM as source of truth." }
    ]
  };
}

export function generatePlan(inputs) {
  const split = budgetSplit(inputs);
  return {
    inputs, split,
    structure: structure(inputs),
    audiences: audiencePerPlatform(inputs),
    creatives: creativePerPlatform(inputs),
    tracking: tracking(inputs),
    landing: landing(inputs),
    compliance: compliance(inputs),
    qa: qa(),
    weekly: weeklyPlan(inputs),
    optimisation: optimisation(inputs),
    nextSteps: nextSteps(),
    assumptions: assumptions(inputs, split),
    fallback: fallbackStrategy(inputs)
  };
}
