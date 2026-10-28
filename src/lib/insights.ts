import { type Campaign, type Step, pct, stepTotals } from "./campaigns";

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

const hasMedia = (s: Step) => !!s.text?.media || !!s.emailMedia;
const mediaLabel = (s: Step) =>
  [s.text?.media && `a ${s.text.media.kind} in the text`, s.emailMedia && `a ${s.emailMedia.kind} in the email`].filter(Boolean).join(" and ");
const URGENCY = /(last call|ends|almost gone|final|only \d|today)/i;

export function keyInsights(c: Campaign, stepId: string): Insight[] {
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

  // Media
  const noMedia = others.filter((p) => !hasMedia(p.step));
  if (hasMedia(me.step) && noMedia.length) {
    const nm = noMedia.reduce((a, p) => a + p.clickRate!, 0) / noMedia.length;
    out.push({
      kind: "content",
      title: "This was the only message with media",
      detail: `You added ${mediaLabel(me.step)}. Click rate was ${f(me.clickRate)} vs ${f(nm)} for the text-only messages. A visual of the actual room gives guests a reason to tap.`,
    });
  } else if (!hasMedia(me.step) && others.some((p) => hasMedia(p.step))) {
    const m = others.find((p) => hasMedia(p.step))!;
    out.push({ kind: "content", title: "No media in this message", detail: `${m.step.name} included ${mediaLabel(m.step)} and reached a ${f(m.clickRate!)} click rate vs ${f(me.clickRate)} here.` });
  }

  // Text length & urgency
  if (me.step.text) {
    const len = me.step.text.body.length;
    const urgent = URGENCY.test(me.step.text.body);
    out.push({
      kind: "content",
      title: urgent ? "Urgency-led copy" : "Offer-led copy",
      detail: `${len} characters, 1 link${urgent ? ", with a deadline (“" + me.step.text.body.match(URGENCY)![0] + "”)" : ""}. ${me.step.text.body.includes("{first_name}") ? "Opens with the guest’s first name." : ""}`.trim(),
    });
  }

  // Subject line
  if (me.step.email) {
    const s = me.step.email.subject;
    out.push({
      kind: "content",
      title: "Email subject line",
      detail: `“${s}” — ${s.includes("{first_name}") ? "personalised with the guest’s name" : "not personalised"}, ${/\d/.test(s) ? "states a concrete offer" : "no number or offer in the subject"}.`,
    });
  }

  // Timing
  out.push({ kind: "content", title: "Timing", detail: `Sent ${me.step.delay.toLowerCase()} to ${me.step.eligible.toLocaleString()} eligible guests.` });

  // Recommendation
  if (best === stepId && hasMedia(me.step)) {
    out.push({
      kind: "next",
      title: "Try this in your next campaign",
      detail: "Move the photo + video pairing into your initial message, and keep this copy style for follow-ups. One campaign isn’t proof — media is the most likely factor here, so test it again to confirm.",
    });
  } else if (best === stepId) {
    out.push({ kind: "next", title: "Try this in your next campaign", detail: "Reuse this copy and timing as a starting point. Change one thing at a time so you can see what moves bookings." });
  } else {
    const b = perf.find((p) => p.step.id === best);
    if (b) out.push({ kind: "next", title: "What to change", detail: `Borrow from ${b.step.name}, the strongest message in this sequence${hasMedia(b.step) ? " — especially its media" : ""}.` });
  }
  return out;
}
