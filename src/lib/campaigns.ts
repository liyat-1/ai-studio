export type CampaignStatus = "draft" | "scheduled" | "in_progress" | "completed" | "paused" | "failed";
export type ChannelStrategy = "text" | "email" | "text_email" | "text_fallback_email";
export type Channel = "text" | "email";

export const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  paused: "Paused",
  failed: "Failed",
};

export const CHANNEL_LABEL: Record<ChannelStrategy, string> = {
  text: "Text only",
  email: "Email only",
  text_email: "Text + Email Together",
  text_fallback_email: "Text with Email Fallback",
};

export interface ChannelStats {
  sent: number;
  delivered: number;
  failed: number;
  /** null = not tracked; never render as 0 */
  clicks: number | null;
  bookings: number | null;
  cost: number | null;
  /** fallback sends (email only, for fallback strategy) */
  fallback?: boolean;
}

export interface EmailTemplate {
  senderName: string;
  senderAddress: string;
  subject: string;
  previewText: string;
  heading: string;
  body: string[];
  cta: string;
  secondary?: { title: string; text: string };
  footer: string;
  /** media block in the email body */
  media?: { kind: "image" | "video"; caption: string };
}

export interface TextMessage {
  body: string;
  segments: number;
  /** MMS attachment */
  media?: { kind: "image" | "video"; alt: string };
}

export interface Step {
  id: string;
  name: string;
  delay: string;
  eligible: number;
  channels: Partial<Record<Channel, ChannelStats>>;
  text?: TextMessage;
  email?: EmailTemplate | null;
  emailMedia?: EmailTemplate["media"];
}

export interface Campaign {
  id: string;
  name: string;
  /** Emoji shown as the campaign's icon. */
  icon: string;
  createdBy: string;
  audience: string;
  createdAt: string;
  status: CampaignStatus;
  channel: ChannelStrategy;
  eligible: number;
  reached: number;
  /** Guest-level funnel (each guest counted once, across all messages). */
  funnel: { delivered: number; clicked: number; booked: number };
  costIsEstimate: boolean;
  steps: Step[];
}

export const TEXT_PRICE = 0.06;

const sms = (sent: number, delivered: number, clicks: number | null, bookings: number | null): ChannelStats => ({
  sent,
  delivered,
  failed: sent - delivered,
  clicks,
  bookings,
  cost: +(sent * TEXT_PRICE).toFixed(2),
});
const mail = (sent: number, delivered: number, clicks: number | null, bookings: number | null, fallback = false): ChannelStats => ({
  sent,
  delivered,
  failed: sent - delivered,
  clicks,
  bookings,
  cost: +(sent * 0.002).toFixed(2),
  fallback,
});

const augustEmail = (subject: string, preview: string, heading: string, body: string[], cta: string): EmailTemplate => ({
  senderName: "The Saltwater Hotel",
  senderAddress: "stay@saltwaterhotel.com",
  subject,
  previewText: preview,
  heading,
  body,
  cta,
  secondary: {
    title: "Ocean View Suites",
    text: "Floor-to-ceiling windows, a private terrace and breakfast for two, every morning of your stay.",
  },
  footer: "The Saltwater Hotel · 12 Harbour Road, Monterey, CA 93940",
});

export const campaigns: Campaign[] = [
  {
    id: "august-campaign",
    name: "August Campaign",
    icon: "🌅",
    audience: "Past guests · Summer 2025",
    createdBy: "Maya Chen",
    createdAt: "2026-08-02",
    status: "completed",
    channel: "text_email",
    eligible: 2000,
    reached: 1850,
    funnel: { delivered: 1790, clicked: 980, booked: 369 },
    costIsEstimate: false,
    steps: [
      {
        id: "initial",
        name: "Initial message",
        delay: "Aug 4, 10:00 AM",
        eligible: 1850,
        channels: { text: sms(1850, 1780, 420, 98), email: mail(1620, 1540, 310, 41) },
        text: {
          body: "Hi {first_name}, late summer at The Saltwater is calling. Save 20% on 2+ nights through Sept 15: saltwtr.co/aug20 Reply STOP to opt out.",
          segments: 1,
        },
        email: augustEmail(
          "{first_name}, your late-summer escape is 20% off",
          "Two nights or more by the sea — through September 15.",
          "Late summer, saved for you.",
          [
            "Hi {first_name},",
            "The water is warm, the evenings are long, and our terrace is ready. As a returning guest, enjoy 20% off any stay of two nights or more booked by September 15.",
          ],
          "Book your stay",
        ),
      },
      {
        id: "fu1",
        name: "Follow-up 1",
        delay: "2 days after initial message",
        eligible: 1850,
        channels: { text: sms(1850, 1760, 540, 138), email: mail(1500, 1450, 320, 52) },
        text: {
          body: "{first_name}, this is the view from Suite 12 right now 🌅 Your 20% rate is still waiting: saltwtr.co/aug20 Reply STOP to opt out.",
          segments: 1,
          media: { kind: "image", alt: "Ocean view suite at sunset" },
        },
        email: augustEmail(
          "Still dreaming of the coast?",
          "Your 20% returning-guest rate is still available.",
          "The terrace is still yours.",
          ["Hi {first_name},", "Just a gentle reminder that your returning-guest rate is still open. Rooms with an ocean view tend to go first in late August."],
          "See available dates",
        ),
        emailMedia: { kind: "image", caption: "Suite 12 at golden hour" },
      },
      {
        id: "fu2",
        name: "Follow-up 2",
        delay: "3 days after Follow-up 1",
        eligible: 1000,
        channels: { text: sms(1000, 920, 120, 31), email: mail(860, 810, 88, 9) },
        text: {
          body: "Last call, {first_name}: 20% off ends Sept 15. Ocean-view rooms are almost gone: saltwtr.co/aug20 Reply STOP to opt out.",
          segments: 1,
        },
        email: null,
      },
    ],
  },
  {
    id: "fall-returning",
    name: "Fall Returning Guests",
    icon: "🍂",
    audience: "Loyalty members",
    createdBy: "Daniel Ortiz",
    createdAt: "2026-09-18",
    status: "in_progress",
    channel: "text_fallback_email",
    eligible: 3400,
    reached: 2910,
    funnel: { delivered: 2810, clicked: 610, booked: 123 },
    costIsEstimate: true,
    steps: [
      {
        id: "initial",
        name: "Initial message",
        delay: "Sep 20, 9:00 AM",
        eligible: 3400,
        channels: { text: sms(3100, 2760, 510, 112), email: mail(640, 590, 72, 11, true) },
        text: { body: "Hi {first_name}, autumn rates are here at The Saltwater. Members save 15%: saltwtr.co/fall Reply STOP to opt out.", segments: 1 },
        email: augustEmail(
          "Autumn by the sea — members save 15%",
          "Crisp mornings, warm fires, quieter beaches.",
          "Autumn, slowed down.",
          ["Hi {first_name},", "Crisp mornings, fireside evenings and beaches all to yourself. Members save 15% on stays through November."],
          "Explore autumn rates",
        ),
      },
      {
        id: "fu1",
        name: "Follow-up 1",
        delay: "4 days after initial message",
        eligible: 2400,
        channels: { text: sms(2200, 1960, null, null), email: mail(410, 380, null, null, true) },
        text: { body: "{first_name}, autumn at The Saltwater fills fast. Your 15% member rate: saltwtr.co/fall Reply STOP to opt out.", segments: 1 },
        email: null,
      },
    ],
  },
  {
    id: "spring-weddings",
    name: "Spring Wedding Inquiries",
    icon: "💍",
    audience: "Wedding inquiries 2026",
    createdBy: "Maya Chen",
    createdAt: "2026-03-04",
    status: "completed",
    channel: "email",
    eligible: 820,
    reached: 774,
    funnel: { delivered: 774, clicked: 188, booked: 14 },
    costIsEstimate: false,
    steps: [
      {
        id: "initial",
        name: "Initial message",
        delay: "Mar 6, 11:00 AM",
        eligible: 820,
        channels: { email: mail(820, 774, 188, 14) },
        email: augustEmail(
          "Say “I do” on the terrace",
          "Spring and summer wedding dates are now open.",
          "Your day, by the water.",
          ["Hi {first_name},", "Our 2027 wedding calendar is open. Ceremonies on the cliffside terrace, dinners under the pergola, and a team that handles every detail."],
          "Request a proposal",
        ),
      },
    ],
  },
  {
    id: "holiday-preview",
    name: "Holiday Preview",
    icon: "🎄",
    audience: "Past guests · Holiday 2025",
    createdBy: "Priya Nair",
    createdAt: "2026-10-21",
    status: "scheduled",
    channel: "text",
    eligible: 1500,
    reached: 0,
    funnel: { delivered: 0, clicked: 0, booked: 0 },
    costIsEstimate: true,
    steps: [
      { id: "initial", name: "Initial message", delay: "Nov 10, 10:00 AM", eligible: 1500, channels: { text: sms(0, 0, null, null) }, text: { body: "Hi {first_name}, holiday dates at The Saltwater open Nov 12. Get first pick: saltwtr.co/hol Reply STOP to opt out.", segments: 1 } },
      { id: "fu1", name: "Follow-up 1", delay: "3 days after initial message", eligible: 1500, channels: { text: sms(0, 0, null, null) }, text: { body: "{first_name}, holiday dates are now open. Book first pick: saltwtr.co/hol Reply STOP to opt out.", segments: 1 } },
    ],
  },
  {
    id: "midweek-flash",
    name: "Midweek Flash Sale",
    icon: "⚡",
    audience: "Local drive-market guests",
    createdBy: "Daniel Ortiz",
    createdAt: "2026-07-11",
    status: "paused",
    channel: "text",
    eligible: 960,
    reached: 612,
    funnel: { delivered: 601, clicked: 140, booked: 27 },
    costIsEstimate: false,
    steps: [
      { id: "initial", name: "Initial message", delay: "Jul 14, 12:00 PM", eligible: 960, channels: { text: sms(640, 612, 140, 27) }, text: { body: "Midweek flash: Tue–Thu stays from $189 this month only. saltwtr.co/mid Reply STOP to opt out.", segments: 1 } },
    ],
  },
  {
    id: "loyalty-draft",
    name: "Loyalty Anniversary",
    icon: "🎂",
    audience: "Loyalty members",
    createdBy: "Priya Nair",
    createdAt: "2026-10-25",
    status: "draft",
    channel: "text_email",
    eligible: 0,
    reached: 0,
    funnel: { delivered: 0, clicked: 0, booked: 0 },
    costIsEstimate: true,
    steps: [{ id: "initial", name: "Initial message", delay: "Not scheduled", eligible: 0, channels: { text: sms(0, 0, null, null), email: mail(0, 0, null, null) }, text: { body: "Happy anniversary, {first_name}! A thank-you from The Saltwater: saltwtr.co/thanks Reply STOP to opt out.", segments: 1 }, email: null }],
  },
];

export interface Audience { id: string; name: string; description: string; source: string; guests: number; createdAt: string; updatedAt: string; criteria: string[] }
export const audiences: Audience[] = [
  { id: "a1", name: "Past guests · Summer 2025", description: "Stayed June–August 2025, any room type", source: "PMS stay history", guests: 2140, createdAt: "2026-07-28", updatedAt: "2026-08-01", criteria: ["Stay dates: Jun 1 – Aug 31, 2025", "Has text or email consent"] },
  { id: "a2", name: "Loyalty members", description: "Active Saltwater Circle members", source: "Loyalty program", guests: 3520, createdAt: "2026-02-10", updatedAt: "2026-10-20", criteria: ["Loyalty status: Active", "Has text or email consent"] },
  { id: "a3", name: "Wedding inquiries 2026", description: "Submitted the weddings form in 2026", source: "Website form", guests: 860, createdAt: "2026-03-01", updatedAt: "2026-03-01", criteria: ["Form: Weddings", "Submitted: 2026"] },
  { id: "a4", name: "Past guests · Holiday 2025", description: "Stayed Nov 20 – Jan 5 last season", source: "PMS stay history", guests: 1580, createdAt: "2026-10-18", updatedAt: "2026-10-21", criteria: ["Stay dates: Nov 20, 2025 – Jan 5, 2026"] },
  { id: "a5", name: "Local drive-market guests", description: "Home address within 150 miles", source: "PMS profile", guests: 1010, createdAt: "2026-07-01", updatedAt: "2026-07-09", criteria: ["Distance from hotel: ≤ 150 mi", "Has mobile number"] },
];
export const AUDIENCE_FILTERS = ["Stay dates", "Loyalty status", "Distance from hotel", "Room type", "Booking source", "Number of past stays", "Has text consent", "Has email consent"];

export const initials = (n: string) => n.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

/** Booking rate per reached guest; null when bookings aren't tracked or nothing sent. */
export function bookingRate(c: Campaign) {
  const b = campaignTotals(c).steps.map((s) => s.bookings);
  if (!c.reached || b.every((x) => x === null)) return null;
  return b.reduce<number>((a, v) => a + (v ?? 0), 0) / c.reached;
}
/** Id of the campaign with the highest booking rate (min 500 reached guests). */
export function topCampaignId(list: Campaign[]) {
  let best: { id: string; r: number } | null = null;
  for (const c of list) { const r = bookingRate(c); if (r !== null && c.reached >= 500 && (!best || r > best.r)) best = { id: c.id, r }; }
  return best?.id ?? null;
}

export function getCampaign(id: string) {
  return campaigns.find((c) => c.id === id);
}

const sumNullable = (vals: (number | null)[]) => (vals.every((v) => v === null) ? null : vals.reduce<number>((a, v) => a + (v ?? 0), 0));

export function stepTotals(step: Step) {
  const ch = Object.values(step.channels).filter(Boolean) as ChannelStats[];
  return {
    sent: ch.reduce((a, c) => a + c.sent, 0),
    delivered: ch.reduce((a, c) => a + c.delivered, 0),
    failed: ch.reduce((a, c) => a + c.failed, 0),
    clicks: sumNullable(ch.map((c) => c.clicks)),
    bookings: sumNullable(ch.map((c) => c.bookings)),
    cost: sumNullable(ch.map((c) => c.cost)),
  };
}

export function campaignTotals(c: Campaign) {
  const steps = c.steps.map((s) => ({ step: s, ...stepTotals(s) }));
  return {
    steps,
    totalSent: steps.reduce((a, s) => a + s.sent, 0),
    cost: sumNullable(steps.map((s) => s.cost)),
    notReached: c.eligible - c.reached,
    followUps: c.steps.length - 1,
  };
}

export const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString("en-US"));
export const money = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD" });
export const pct = (num: number, den: number) => (den === 0 ? "—" : `${((num / den) * 100).toFixed(1)}%`);
export const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/* ---------- Guest activity (sample of recorded events) ---------- */
export type DeliveryState = "delivered" | "failed" | "not_sent";
export interface GuestEvent {
  step: string;
  channel: Channel;
  sentAt: string;
  deliveredAt?: string;
  status: "delivered" | "failed";
  clickedAt?: string;
  bookedAt?: string;
  note?: string;
}
export interface Guest {
  id: string;
  name: string;
  contact: string;
  channel: Channel;
  stepStatus: Record<string, DeliveryState>;
  clicked: boolean;
  booked: boolean;
  lastActivity: string;
  events: GuestEvent[];
}

const FIRST = ["Olivia", "James", "Sofia", "Liam", "Ava", "Noah", "Mia", "Ethan", "Isla", "Lucas", "Grace", "Leo", "Chloe", "Henry", "Zoe", "Mateo", "Ella", "Jack", "Aria", "Owen"];
const LAST = ["Bennett", "Kim", "Alvarez", "Walsh", "Patel", "Moreau", "Nguyen", "Fischer", "Rossi", "Okafor"];

function rng(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

export function sampleGuests(c: Campaign, count = 36): Guest[] {
  const r = rng(c.id.length * 97 + c.eligible);
  const base = new Date(c.createdAt + "T10:00:00");
  return Array.from({ length: count }, (_, i) => {
    const channel: Channel = c.channel === "email" ? "email" : c.channel === "text" ? "text" : r() > 0.7 ? "email" : "text";
    const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`;
    const events: GuestEvent[] = [];
    const stepStatus: Record<string, DeliveryState> = {};
    let stopped = false;
    let clicked = false;
    let booked = false;
    c.steps.forEach((s, si) => {
      if (stopped || c.status === "draft" || c.status === "scheduled" || si > 0 && r() > s.eligible / c.steps[0]!.eligible) {
        stepStatus[s.id] = "not_sent";
        return;
      }
      const t = new Date(base.getTime() + (2 + si * 2.5) * 86400000 + i * 61000);
      const ok = r() > 0.06;
      const ev: GuestEvent = { step: s.name, channel, sentAt: t.toISOString(), status: ok ? "delivered" : "failed" };
      if (ok) ev.deliveredAt = new Date(t.getTime() + 4000).toISOString();
      if (ok && r() > 0.78 && s.channels[channel]?.clicks !== null) {
        clicked = true;
        ev.clickedAt = new Date(t.getTime() + 3600000).toISOString();
        if (r() > 0.55 && s.channels[channel]?.bookings !== null) {
          booked = true;
          ev.bookedAt = new Date(t.getTime() + 7200000).toISOString();
          ev.note = "Sequence stopped: booking recorded";
          stopped = true;
        }
      }
      stepStatus[s.id] = ok ? "delivered" : "failed";
      events.push(ev);
    });
    return {
      id: `g${i}`,
      name,
      contact: channel === "text" ? `(•••) •••-${String(1000 + Math.floor(r() * 8999))}` : `${name.split(" ")[0]!.toLowerCase()}@•••.com`,
      channel,
      stepStatus,
      clicked,
      booked,
      lastActivity: events.at(-1)?.bookedAt ?? events.at(-1)?.clickedAt ?? events.at(-1)?.sentAt ?? "",
      events,
    };
  });
}
