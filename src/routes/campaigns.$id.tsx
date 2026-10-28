import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronLeft, Download, Mail, MessageSquare, Monitor, Smartphone, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Metric, StatusLabel } from "@/components/campaign-bits";
import { EmailPreview, TextPreview } from "@/components/message-previews";
import {
  type Campaign, type Channel, type DeliveryState, type Guest, type Step, CHANNEL_LABEL, campaignTotals, fmt, fmtDate, getCampaign, money, pct, sampleGuests, stepTotals,
} from "@/lib/campaigns";
import { cn } from "@/lib/utils";
import { HOME_SEARCH } from "@/routes/index";

export const Route = createFileRoute("/campaigns/$id")({
  loader: ({ params }) => {
    const c = getCampaign(params.id);
    if (!c) throw notFound();
    return { name: c.name };
  },
  head: ({ loaderData }) => {
    const t = loaderData ? `${loaderData.name} results — Directful` : "Campaign unavailable — Directful";
    return {
      meta: [
        { title: t },
        { name: "description", content: "Message performance and guest activity for this drip campaign." },
        { property: "og:title", content: t },
        { property: "og:description", content: "Message performance and guest activity for this drip campaign." },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="p-10">
      <p className="font-medium">Campaign not found.</p>
      <Link to="/" search={HOME_SEARCH} className="mt-2 inline-block text-sm text-primary hover:underline">Back to campaigns</Link>
    </div>
  ),
  component: ResultsPage,
});

function ResultsPage() {
  const { id } = Route.useParams();
  const c = getCampaign(id)!;
  const t = campaignTotals(c);
  const [tab, setTab] = useState<"perf" | "guests">("perf");

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-6 lg:px-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" search={HOME_SEARCH} className="hover:text-primary">Drip Campaigns</Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{c.name}</span>
      </nav>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
            <StatusLabel status={c.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Created by {c.createdBy} on {fmtDate(c.createdAt)} · {CHANNEL_LABEL[c.channel]} · {t.followUps} follow-up{t.followUps === 1 ? "" : "s"} configured
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/" search={HOME_SEARCH}><ChevronLeft /> Back to campaigns</Link>
        </Button>
      </header>

      <dl className="mt-6 grid grid-cols-2 divide-border border-y bg-card sm:grid-cols-4 sm:divide-x">
        <SummaryItem label="Eligible guests" value={fmt(c.eligible)} hint="Unique guests" />
        <SummaryItem label="Reached guests" value={fmt(c.reached)} hint={`${pct(c.reached, c.eligible)} · ≥1 confirmed delivery`} />
        <SummaryItem label="Total messages sent" value={fmt(t.totalSent)} hint={`Across ${c.steps.length} step${c.steps.length > 1 ? "s" : ""}`} />
        <SummaryItem label={c.costIsEstimate ? "Estimated cost" : "Actual cost"} value={money(t.cost)} hint={c.costIsEstimate ? "Estimate" : "Billed"} />
      </dl>

      <div role="tablist" aria-label="Results" className="mt-6 flex gap-6 border-b">
        {([["perf", "Message Performance"], ["guests", "Guest Activity"]] as const).map(([k, l]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn("-mb-px border-b-2 pb-2.5 text-sm font-medium", tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {l}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-6">
        {tab === "perf" ? <MessagePerformance c={c} /> : <GuestActivity c={c} />}
      </div>
    </div>
  );
}

function SummaryItem({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="px-5 py-3.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold tracking-tight num">{value}</dd>
      <dd className="text-xs text-muted-foreground">{hint}</dd>
    </div>
  );
}

/* ---------------- Message performance ---------------- */

function MessagePerformance({ c }: { c: Campaign }) {
  const [stepId, setStepId] = useState(c.steps[0]!.id);
  const step = c.steps.find((s) => s.id === stepId)!;
  const channels = Object.keys(step.channels) as Channel[];
  const [chSel, setCh] = useState<Channel>(channels[0]!);
  const ch = channels.includes(chSel) ? chSel : channels[0]!;
  const stats = step.channels[ch]!;
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const tot = stepTotals(step);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_280px]">
        {/* Sequence nav */}
        <nav aria-label="Message sequence">
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Sequence</h2>
          <ol className="border bg-card">
            {c.steps.map((s, i) => {
              const active = s.id === stepId;
              return (
                <li key={s.id} className={cn(i > 0 && "border-t")}>
                  <button
                    aria-current={active ? "step" : undefined}
                    onClick={() => setStepId(s.id)}
                    className={cn("relative w-full px-4 py-3 text-left", active ? "bg-primary-soft" : "hover:bg-muted/60")}
                  >
                    {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-primary" aria-hidden />}
                    <div className={cn("text-sm font-medium", active && "text-primary")}>{s.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{s.delay}</div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="num">{fmt(s.eligible)} eligible</span>
                      <span className="flex gap-1">
                        {s.channels.text && <MessageSquare className="size-3.5" aria-label="Text" />}
                        {s.channels.email && <Mail className="size-3.5" aria-label="Email" />}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Main */}
        <section aria-label={`${step.name} details`} className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{step.name}</h2>
              <p className="text-xs text-muted-foreground">{step.delay}</p>
            </div>
            <div className="flex items-center gap-2">
              {channels.length > 1 && (
                <Segmented
                  label="Channel"
                  value={ch}
                  onChange={(v) => setCh(v as Channel)}
                  options={channels.map((k) => ({ value: k, label: k === "text" ? "Text" : c.channel === "text_fallback_email" ? "Email (fallback)" : "Email", icon: k === "text" ? MessageSquare : Mail }))}
                />
              )}
              {ch === "email" && step.email && (
                <Segmented
                  label="Preview size"
                  value={device}
                  onChange={(v) => setDevice(v as "desktop" | "mobile")}
                  options={[{ value: "desktop", label: "Desktop", icon: Monitor }, { value: "mobile", label: "Mobile", icon: Smartphone }]}
                />
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-x-6 gap-y-4 border-y bg-card px-5 py-4 sm:grid-cols-4 md:grid-cols-8">
            <Metric label="Eligible guests" value={fmt(step.eligible)} hint="Guests" />
            <Metric label="Sent" value={fmt(stats.sent)} hint="Messages" />
            <Metric label="Delivered" value={fmt(stats.delivered)} />
            <Metric label="Failed" value={fmt(stats.failed)} />
            <Metric label="Delivery rate" value={pct(stats.delivered, stats.sent)} hint="of sent" />
            <Metric label="Clicks" value={stats.clicks === null ? "Not tracked" : fmt(stats.clicks)} className={stats.clicks === null ? "[&>div:nth-child(2)]:text-sm [&>div:nth-child(2)]:font-normal [&>div:nth-child(2)]:text-muted-foreground" : ""} />
            <Metric label="Bookings" value={stats.bookings === null ? "Not tracked" : fmt(stats.bookings)} className={stats.bookings === null ? "[&>div:nth-child(2)]:text-sm [&>div:nth-child(2)]:font-normal [&>div:nth-child(2)]:text-muted-foreground" : ""} />
            <Metric label={c.costIsEstimate ? "Est. cost" : "Cost"} value={money(stats.cost)} />
          </div>

          <div className="mt-4 border bg-canvas">
            <div className="flex items-center justify-between border-b bg-card px-4 py-2 text-xs text-muted-foreground">
              <span>{ch === "email" ? "Campaign email · as sent to guests" : "Text message · as sent to guests"}</span>
              {ch === "email" && step.email && (
                <button className="font-medium text-primary hover:underline" onClick={() => toast("Template editor opens here")}>View template</button>
              )}
            </div>
            <div className="max-h-[720px] overflow-auto p-6">
              {ch === "email" ? (
                step.email ? (
                  <EmailPreview t={step.email} device={device} />
                ) : (
                  <div className="py-16 text-center">
                    <p className="font-medium">Email preview unavailable</p>
                    <p className="mt-1 text-sm text-muted-foreground">The template for this step couldn’t be loaded. Metrics above are unaffected.</p>
                  </div>
                )
              ) : step.text ? (
                <TextPreview m={step.text} />
              ) : null}
            </div>
          </div>
        </section>

        {/* Right summary */}
        <aside className="space-y-6 lg:col-span-2 xl:col-span-1">
          <div>
            <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Step summary · all channels</h2>
            <dl className="divide-y border bg-card text-sm">
              {[
                ["Eligible guests", fmt(step.eligible)],
                ["Messages sent", fmt(tot.sent)],
                ["Delivered", fmt(tot.delivered)],
                ["Failed", fmt(tot.failed)],
                ["Delivery rate", pct(tot.delivered, tot.sent)],
                ["Clicks", tot.clicks === null ? "Not tracked" : fmt(tot.clicks)],
                ["Bookings", tot.bookings === null ? "Not tracked" : fmt(tot.bookings)],
                [c.costIsEstimate ? "Estimated cost" : "Cost", money(tot.cost)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between px-4 py-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="num font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          {channels.length > 1 && <ChannelCompare c={c} step={step} />}
          <Insights c={c} step={step} />
        </aside>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Follow-up sequence breakdown</h2>
        <div className="overflow-x-auto border bg-card">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b bg-muted/60 text-xs text-muted-foreground">
              <tr>
                {["Message step", "Delay", "Eligible guests", "Sent", "Delivered", "Failed", "Clicks", "Bookings", "Cost"].map((h, i) => (
                  <th key={h} scope="col" className={cn("px-3 py-2.5 font-medium", i < 2 ? "text-left" : "text-right")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {c.steps.map((s) => {
                const r = stepTotals(s);
                return (
                  <tr key={s.id} className={cn("cursor-pointer hover:bg-muted/50", s.id === stepId && "bg-primary-soft/60")} onClick={() => setStepId(s.id)}>
                    <th scope="row" className="px-3 py-2.5 text-left font-medium">{s.name}</th>
                    <td className="px-3 py-2.5 text-muted-foreground">{s.delay}</td>
                    <td className="px-3 py-2.5 text-right num">{fmt(s.eligible)}</td>
                    <td className="px-3 py-2.5 text-right num">{fmt(r.sent)}</td>
                    <td className="px-3 py-2.5 text-right num">{fmt(r.delivered)}</td>
                    <td className="px-3 py-2.5 text-right num">{fmt(r.failed)}</td>
                    <td className="px-3 py-2.5 text-right num">{r.clicks === null ? "Not tracked" : fmt(r.clicks)}</td>
                    <td className="px-3 py-2.5 text-right num">{r.bookings === null ? "Not tracked" : fmt(r.bookings)}</td>
                    <td className="px-3 py-2.5 text-right num">{money(r.cost)}</td>
                  </tr>
                );
              })}
              <tr className="bg-muted/40 font-semibold">
                <th scope="row" className="px-3 py-2.5 text-left" colSpan={3}>Total messages</th>
                <td className="px-3 py-2.5 text-right num">{fmt(campaignTotals(c).totalSent)}</td>
                <td colSpan={4} className="px-3 py-2.5 text-right text-xs font-normal text-muted-foreground">Guests can receive more than one message per step on multi-channel strategies.</td>
                <td className="px-3 py-2.5 text-right num">{money(campaignTotals(c).cost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Segmented({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string; icon: typeof Mail }[] }) {
  return (
    <div role="group" aria-label={label} className="flex rounded-sm border bg-card p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs", value === o.value ? "bg-primary-soft font-medium text-primary" : "text-muted-foreground hover:text-foreground")}
        >
          <o.icon className="size-3.5" strokeWidth={1.75} />
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ChannelCompare({ c, step }: { c: Campaign; step: Step }) {
  const rows: [string, keyof NonNullable<Step["channels"]["text"]>][] = [["Sent", "sent"], ["Delivered", "delivered"], ["Failed", "failed"], ["Clicks", "clicks"], ["Bookings", "bookings"], ["Cost", "cost"]];
  const tx = step.channels.text!;
  const em = step.channels.email!;
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Channel performance</h2>
      <table className="w-full border bg-card text-sm">
        <thead className="border-b text-xs text-muted-foreground">
          <tr><th className="px-4 py-2 text-left font-medium" /><th className="px-2 py-2 text-right font-medium">Text</th><th className="px-4 py-2 text-right font-medium">{c.channel === "text_fallback_email" ? "Email fallback" : "Email"}</th></tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(([l, k]) => {
            const f = (v: unknown) => (k === "cost" ? money(v as number) : v === null ? "—" : fmt(v as number));
            return (
              <tr key={k}>
                <th scope="row" className="px-4 py-1.5 text-left font-normal text-muted-foreground">{l}</th>
                <td className="px-2 py-1.5 text-right num">{f(tx[k])}</td>
                <td className="px-4 py-1.5 text-right num">{f(em[k])}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {c.channel === "text_fallback_email" && (
        <p className="mt-2 text-xs text-muted-foreground">Email is sent only when a text can’t be delivered or the guest has no mobile number. Fallback sends are counted separately from primary text attempts.</p>
      )}
    </div>
  );
}

function Insights({ c, step }: { c: Campaign; step: Step }) {
  const items: string[] = [];
  const tx = step.channels.text;
  const em = step.channels.email;
  if (step.eligible) items.push(`${step.name} had ${fmt(step.eligible)} eligible guests.`);
  if (tx && em && tx.sent && em.sent) {
    const a = tx.delivered / tx.sent, b = em.delivered / em.sent;
    items.push(`Text delivery (${pct(tx.delivered, tx.sent)}) was ${a >= b ? "higher" : "lower"} than email delivery (${pct(em.delivered, em.sent)}) for this step.`);
  }
  const tot = stepTotals(step);
  if (tot.clicks !== null) items.push(`This step generated ${fmt(tot.clicks)} tracked clicks across all channels.`);
  if (step.id === "initial" || items.length === 0) return items.length ? <InsightList items={items} /> : null;
  const prev = c.steps[c.steps.indexOf(step) - 1]!;
  items.push(`Eligibility changed from ${fmt(prev.eligible)} (${prev.name}) to ${fmt(step.eligible)} based on stop conditions.`);
  return <InsightList items={items} />;
}

function InsightList({ items }: { items: string[] }) {
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Insights</h2>
      <ul className="space-y-2 border-l-2 border-primary pl-3 text-sm">
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </div>
  );
}

/* ---------------- Guest activity ---------------- */

const stateLabel: Record<DeliveryState, string> = { delivered: "Delivered", failed: "Failed", not_sent: "Not sent" };
const stateCls: Record<DeliveryState, string> = { delivered: "text-success", failed: "text-destructive", not_sent: "text-muted-foreground" };

function GuestActivity({ c }: { c: Campaign }) {
  const guests = useMemo(() => sampleGuests(c), [c]);
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState<Guest | null>(null);
  const tracked = c.steps.some((s) => Object.values(s.channels).some((x) => x?.clicks !== null));

  const filters: { k: string; l: string; fn: (g: Guest) => boolean }[] = [
    { k: "all", l: "All eligible", fn: () => true },
    { k: "reached", l: "Reached", fn: (g) => Object.values(g.stepStatus).includes("delivered") },
    { k: "not", l: "Not reached", fn: (g) => !Object.values(g.stepStatus).includes("delivered") },
    ...c.steps.map((s) => ({ k: s.id, l: s.id === "initial" ? "Initial delivered" : `Received ${s.name}`, fn: (g: Guest) => g.stepStatus[s.id] === "delivered" })),
    ...(tracked ? [{ k: "clicked", l: "Clicked", fn: (g: Guest) => g.clicked }, { k: "booked", l: "Booked", fn: (g: Guest) => g.booked }] : []),
    { k: "failed", l: "Delivery failed", fn: (g) => Object.values(g.stepStatus).includes("failed") },
  ];
  const active = filters.find((f) => f.k === filter) ?? filters[0]!;
  const rows = guests.filter(active.fn);
  const ts = (s?: string) => (s ? new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Guest filter" className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <button
              key={f.k}
              aria-pressed={filter === f.k}
              onClick={() => setFilter(f.k)}
              className={cn("rounded-sm border px-2.5 py-1 text-xs", filter === f.k ? "border-primary bg-primary-soft font-medium text-primary" : "bg-card text-muted-foreground hover:text-foreground")}
            >
              {f.l} <span className="num opacity-70">{guests.filter(f.fn).length}</span>
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => toast.success("CSV export started")}>
          <Download /> Export CSV
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Showing a sample of {guests.length} of {fmt(c.eligible)} eligible guests. Select a guest to see their journey.</p>

      {c.status === "draft" || c.status === "scheduled" ? (
        <div className="mt-3 border border-dashed bg-card px-6 py-14 text-center text-sm text-muted-foreground">No messages have been sent yet, so there’s no guest activity to show.</div>
      ) : (
        <div className="mt-3 overflow-x-auto border bg-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium">Guest</th>
                <th className="px-3 py-2.5 text-left font-medium">Channel</th>
                {c.steps.map((s) => <th key={s.id} className="px-3 py-2.5 text-left font-medium">{s.name}</th>)}
                {tracked && <th className="px-3 py-2.5 text-left font-medium">Clicked</th>}
                {tracked && <th className="px-3 py-2.5 text-left font-medium">Booked</th>}
                <th className="px-3 py-2.5 text-left font-medium">Last activity</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((g) => (
                <tr key={g.id} className={cn("hover:bg-muted/50", sel?.id === g.id && "bg-primary-soft/60")}>
                  <td className="px-3 py-2">
                    <button className="text-left font-medium text-primary hover:underline" onClick={() => setSel(g)}>{g.name}</button>
                    <div className="text-xs text-muted-foreground">{g.contact}</div>
                  </td>
                  <td className="px-3 py-2 capitalize">{g.channel}</td>
                  {c.steps.map((s) => { const st = g.stepStatus[s.id] ?? "not_sent"; return <td key={s.id} className={cn("px-3 py-2", stateCls[st])}>{stateLabel[st]}</td>; })}
                  {tracked && <td className="px-3 py-2">{g.clicked ? "Yes" : "No"}</td>}
                  {tracked && <td className="px-3 py-2">{g.booked ? <span className="font-medium text-success">Booked</span> : "No"}</td>}
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{ts(g.lastActivity)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">No guests match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md [&>button]:hidden">
          {sel && (
            <>
              <SheetHeader className="border-b pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle>{sel.name}</SheetTitle>
                    <SheetDescription>{sel.contact} · {sel.channel === "text" ? "Text" : "Email"}</SheetDescription>
                  </div>
                  <Button variant="ghost" size="icon" aria-label="Close guest details" onClick={() => setSel(null)}><X /></Button>
                </div>
              </SheetHeader>
              <div className="px-4 pb-6">
                <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Campaign journey</h3>
                {sel.events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recorded events.</p>
                ) : (
                  <ol className="relative space-y-5 border-l pl-5">
                    {sel.events.map((e) => (
                      <li key={e.step} className="relative">
                        <span className={cn("absolute top-1 -left-[25px] size-2.5 rounded-[1px]", e.status === "delivered" ? "bg-success" : "bg-destructive")} aria-hidden />
                        <div className="text-sm font-medium">{e.step} <span className="font-normal text-muted-foreground">· {e.channel}</span></div>
                        <dl className="mt-1 grid grid-cols-[90px_1fr] gap-y-0.5 text-xs">
                          <dt className="text-muted-foreground">Sent</dt><dd>{ts(e.sentAt)}</dd>
                          <dt className="text-muted-foreground">Status</dt><dd className={stateCls[e.status]}>{stateLabel[e.status]}</dd>
                          {e.deliveredAt && (<><dt className="text-muted-foreground">Delivered</dt><dd>{ts(e.deliveredAt)}</dd></>)}
                          {e.clickedAt && (<><dt className="text-muted-foreground">Clicked</dt><dd>{ts(e.clickedAt)}</dd></>)}
                          {e.bookedAt && (<><dt className="text-muted-foreground">Booked</dt><dd className="font-medium text-success">{ts(e.bookedAt)}</dd></>)}
                        </dl>
                        {e.note && <p className="mt-1.5 bg-muted px-2 py-1 text-xs">{e.note}</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
