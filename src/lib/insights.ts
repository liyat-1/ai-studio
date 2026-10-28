import { type Campaign, type Channel, type Step, fmt, pct, stepTotals } from "./campaigns";

export interface StepPerf {
  step: Step;
  sent: number;
  delivered: number;
  failed: number;
  clicks: number | null;
  bookings: number | null;
  cost: number | null;
  deliveryRate: number | null;
  clickRate: number | null;
  bookingRate: number | null;
}

const ratio = (a: number | null, b: number) => (a === null || b === 0 ? null : a / b);

export function stepPerf(c: Campaign): StepPerf[] {
  return c.steps.map((step) => {
    const t = stepTotals(step);
    return {
      step,
      ...t,
      deliveryRate: ratio(t.delivered, t.sent),
      clickRate: ratio(t.clicks, t.delivered),
      bookingRate: ratio(t.bookings, t.delivered),
    };
  });
}

/** Best step by booking rate; requires ≥2 tracked steps and a meaningful (≥0.5pt) lead. */
export function bestStepId(perf: StepPerf[]): string | null {
  const tracked = perf.filter((p) => p.bookingRate !== null && p.delivered >= 100);
  if (tracked.length < 2) return null;
  const sorted = [...tracked].sort((a, b) => b.bookingRate! - a.bookingRate!);
  return sorted[0]!.bookingRate! - sorted[1]!.bookingRate! >= 0.005 ? sorted[0]!.step.id : null;
}

/** Which step leads each metric (null if fewer than 2 comparable steps). */
export function leaders(perf: StepPerf[]) {
  const lead = (k: "deliveryRate" | "clickRate" | "bookingRate") => {
    const t = perf.filter((p) => p[k] !== null && p.sent > 0);
    return t.length < 2 ? null : t.reduce((a, b) => (b[k]! > a[k]! ? b : a)).step.id;
  };
  return { deliveryRate: lead("deliveryRate"), clickRate: lead("clickRate"), bookingRate: lead("bookingRate") };
}

export type InsightKind = "result" | "content" | "hypothesis" | "next";
export interface Insight {
  kind: InsightKind;
  title: string;
  detail: string;
}

const hasMedia = (s: Step, channel?: Channel) =>
  channel === "email" ? !!s.emailMedia : channel === "text" ? !!s.text?.media : !!s.text?.media || !!s.emailMedia;
const mediaLabel = (s: Step, channel?: Channel) =>
  channel === "email"
    ? s.emailMedia ? `a ${s.emailMedia.kind} in the email` : ""
    : channel === "text"
      ? s.text?.media ? `a ${s.text.media.kind} in the text` : ""
      : [s.text?.media && `a ${s.text.media.kind} in the text`, s.emailMedia && `a ${s.emailMedia.kind} in the email`].filter(Boolean).join(" and ");
const URGENCY = /(last call|ends|almost gone|final|only \d|today)/i;
const OFFER = /(\d+%|from \$\d+|save|free|rate)/i;
const SEASON: [RegExp, string][] = [
  [/halloween|october|spooky/i, "Halloween"],
  [/holiday|christmas|festive/i, "the holidays"],
  [/summer|august|july/i, "summer"],
  [/autumn|fall|november|september/i, "autumn"],
  [/spring|wedding/i, "the spring season"],
  [/new year|january/i, "the new year"],
];

/** One smart read on the copy of a message, scoped to the channel being viewed. */
function contentInsight(c: Campaign, me: StepPerf, others: StepPerf[], f: (n: number) => string, channel?: Channel): Insight | null {
  const s = me.step;
  const copy = channel === "email" ? [s.email?.subject ?? "", ...(s.email?.body ?? [])].join(" ") : channel === "text" ? s.text?.body ?? "" : [s.text?.body ?? "", s.email?.subject ?? ""].join(" ");
  if (!copy.trim()) return null;

  const bits: string[] = [];
  const season = SEASON.find(([re]) => re.test(copy))?.[1];
  if (season) bits.push(`It was written in a timely ${season} context, which gave guests a reason to pay attention right now.`);
  if (OFFER.test(copy)) bits.push("It carried a concrete offer, so guests knew exactly what they’d get by booking.");
  if (URGENCY.test(copy)) bits.push(`A deadline (“${copy.match(URGENCY)![0].toLowerCase()}”) added urgency.`);

  if (channel !== "email" && s.text?.media) bits.push(`The ${s.text.media.kind} of the actual room gave guests a visual reason to tap.`);
  if (channel !== "text" && s.emailMedia) bits.push(`The ${s.emailMedia.kind} in the email showed the room instead of just describing it.`);
  if (channel === "email" && s.email) bits.push(`The subject line “${s.email.subject}” ${/\d/.test(s.email.subject) ? "states the offer up front" : "sets the scene before the open"}.`);

  const noMedia = others.filter((p) => !hasMedia(p.step, channel) && p.clickRate !== null);
  if (hasMedia(s, channel) && noMedia.length) {
    const nm = noMedia.reduce((a, p) => a + p.clickRate!, 0) / noMedia.length;
    bits.push(`Click rate was ${f(me.clickRate!)} vs ${f(nm)} for the messages without media.`);
  }

  if (!bits.length) return null;
  return { kind: "content", title: "Why the content worked", detail: bits.join(" ") };
}

export function keyInsights(c: Campaign, stepId: string, channel?: Channel): Insight[] {
  const perf = stepPerf(c);
  const me = perf.find((p) => p.step.id === stepId)!;
  const others = perf.filter((p) => p.step.id !== stepId && p.clickRate !== null);
  const out: Insight[] = [];

  if (me.sent === 0) return [{ kind: "result", title: "No sends yet", detail: "This message hasn’t been sent, so there’s no performance to learn from yet." }];
  if (me.clickRate === null || me.bookingRate === null)
    return [{ kind: "result", title: "Not enough data", detail: `Clicks and bookings aren’t tracked for ${me.step.name}, so we can’t say what worked. Delivery rate was ${pct(me.delivered, me.sent)}.` }];
  if (others.length === 0)
    return [
      { kind: "result", title: "Single-message campaign", detail: `${pct(me.clicks!, me.delivered)} click rate and ${pct(me.bookings!, me.delivered)} booking rate from ${me.delivered.toLocaleString()} delivered messages. Add a follow-up next time to have something to compare against.` },
    ];

  const best = bestStepId(perf);
  const avg = (k: "clickRate" | "bookingRate") => others.reduce((a, p) => a + p[k]!, 0) / others.length;
  const f = (n: number) => `${(n * 100).toFixed(1)}%`;

  if (best === stepId) {
    const runner = others.reduce((a, b) => (b.bookingRate! > a.bookingRate! ? b : a));
    out.push({
      kind: "result",
      title: `${me.step.name} drove the most bookings per message`,
      detail: `${f(me.bookingRate)} booking rate (${me.bookings!.toLocaleString()} bookings from ${me.delivered.toLocaleString()} delivered) vs ${f(runner.bookingRate!)} for ${runner.step.name}. Click rate was ${f(me.clickRate)} vs ${f(avg("clickRate"))} average for the other messages.`,
    });
  } else {
    const diff = me.bookingRate - avg("bookingRate");
    out.push({
      kind: "result",
      title: diff >= 0 ? `${me.step.name} performed above the rest of the sequence` : `${me.step.name} trailed the rest of the sequence`,
      detail: `${f(me.bookingRate)} booking rate and ${f(me.clickRate)} click rate, vs ${f(avg("bookingRate"))} and ${f(avg("clickRate"))} on average for the other messages.`,
    });
  }

  const content = contentInsight(c, me, others, f, channel);
  if (content) out.push(content);

  // Recommendation
  if (best === stepId && hasMedia(me.step)) {
    out.push({
      kind: "next",
      title: "Try this in your next campaign",
      detail: "Lead with this message as your initial send next time — the media and copy pairing is the most likely factor behind its lead. One campaign isn’t proof, so test it again to confirm.",
    });
  } else if (best === stepId) {
    out.push({ kind: "next", title: "Try this in your next campaign", detail: "Reuse this copy and timing as the initial message of your next campaign. Change one thing at a time so you can see what moves bookings." });
  } else {
    const b = perf.find((p) => p.step.id === best);
    if (b) out.push({ kind: "next", title: "What to change", detail: `Borrow from ${b.step.name}, the strongest message in this sequence${hasMedia(b.step) ? " — especially its media" : ""}.` });
  }
  return out;
}

/** One plain-language read on the whole campaign: who it targets and how it did. */
export function campaignInsight(c: Campaign): Insight {
  const perf = stepPerf(c);
  const notReached = c.eligible - c.reached;

  if (c.status === "draft" || c.status === "scheduled" || c.reached === 0) {
    return {
      kind: "next",
      title: "Nothing to report yet",
      detail: `“${c.name}” targets ${c.audience.toLowerCase()} (${fmt(c.eligible)} eligible guests) and ${c.status === "draft" ? "is still a draft" : "hasn’t started sending"}. Check back once the first messages go out.`,
    };
  }

  const f = (n: number) => `${(n * 100).toFixed(1)}%`;
  const best = bestStepId(perf);
  const bestPerf = best ? perf.find((p) => p.step.id === best) : null;
  const reachNote = notReached > 0 ? ` ${fmt(notReached)} guests couldn’t be reached (missing or invalid contact details).` : "";

  const body = [
    `“${c.name}” targets ${c.audience.toLowerCase()} (${fmt(c.eligible)} eligible guests) and reached ${fmt(c.reached)} of them — a ${f(c.reached / c.eligible)} reach rate.${reachNote}`,
    c.funnel.delivered > 0
      ? `Of the ${fmt(c.funnel.delivered)} guests who received a message, ${pct(c.funnel.clicked, c.funnel.delivered)} clicked through and ${pct(c.funnel.booked, c.funnel.delivered)} booked (${fmt(c.funnel.booked)} bookings).`
      : null,
    bestPerf
      ? `${bestPerf.step.name} was the strongest message in the sequence — it converted ${f(bestPerf.bookingRate!)} of its delivered guests into bookings. Open it below to see what it did right.`
      : null,
  ].filter(Boolean);

  return { kind: "result", title: "How this campaign is doing", detail: body.join("\n") };
}
