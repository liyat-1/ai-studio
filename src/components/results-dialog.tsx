import { useState } from "react";
import { ChevronRight, Copy, LayoutList, Lightbulb, Rows3, Trophy } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Metric } from "@/components/campaign-bits";
import { EmailPreview, TextPreview } from "@/components/message-previews";
import { type Campaign, type Channel, campaignTotals, fmt, money, pct } from "@/lib/campaigns";
import { bestStepId, campaignInsight, keyInsights, stepPerf, type StepPerf } from "@/lib/insights";
import { cn } from "@/lib/utils";

const kindTone: Record<string, string> = {
  result: "bg-success-soft text-success",
  content: "bg-primary-soft text-primary",
  next: "bg-warning-soft text-warning",
};
const kindLabel: Record<string, string> = { result: "Result", content: "Content", next: "Next time" };

function Funnel({ c }: { c: Campaign }) {
  const stages = [
    { label: "Reached", n: c.reached as number | null, conv: null as string | null },
    { label: "Delivered", n: c.funnel.delivered, conv: c.reached ? pct(c.funnel.delivered, c.reached) : null },
    { label: "Clicked", n: c.funnel.clicked, conv: c.funnel.delivered ? pct(c.funnel.clicked, c.funnel.delivered) : null },
    { label: "Booked", n: c.funnel.booked, conv: c.funnel.clicked ? pct(c.funnel.booked, c.funnel.clicked) : null },
  ];
  const base = c.reached || 1;
  return (
    <div className="border bg-card p-4">
      <h3 className="text-sm font-semibold">Guest funnel</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">How the campaign moved guests from reach to booking.</p>
      <ol className="mt-4 space-y-2.5">
        {stages.map((s, i) => (
          <li key={s.label}>
            {i > 0 && (
              <div className="mb-1 flex items-center gap-1 pl-1 text-[11px] text-muted-foreground">
                <ChevronRight className="size-3" /> {s.conv ? <><span className="num">{s.conv}</span> of previous step</> : "not tracked"}
              </div>
            )}
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium">{s.label}</span>
              <span className="text-sm font-semibold num">{fmt(s.n)}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-sm bg-track">
              <div
                className={cn("h-full rounded-sm", s.label === "Booked" ? "bg-success" : "bg-primary")}
                style={{ width: `${Math.min(100, ((s.n ?? 0) / base) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Message performance as rows (card form). */
function PerfCards({ perf, best, onSelect }: { perf: StepPerf[]; best: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="space-y-2">
      {perf.map((p) => {
        const tracked = p.clicks !== null;
        const isBest = best === p.step.id;
        return (
          <button
            key={p.step.id}
            type="button"
            onClick={() => onSelect(p.step.id)}
            className={cn(
              "flex w-full flex-wrap items-center gap-x-4 gap-y-1 border bg-card px-3 py-2.5 text-left transition hover:bg-muted/50",
              isBest && "border-success/40 bg-success-soft/40",
            )}
          >
            <div className="min-w-[150px] flex-1">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                {p.step.name}
                {isBest && (
                  <span className="inline-flex items-center gap-1 rounded-sm bg-success px-1.5 py-0.5 text-[11px] font-medium text-success-foreground">
                    <Trophy className="size-3" /> Best
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{p.step.delay}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold num">{fmt(p.sent)}</div>
              <div className="text-xs text-muted-foreground">sent</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold num">{pct(p.delivered, p.sent)}</div>
              <div className="text-xs text-muted-foreground">delivered</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold num">{tracked ? fmt(p.clicks) : "—"}</div>
              <div className="text-xs text-muted-foreground">clicks {tracked && `(${pct(p.clicks ?? 0, p.delivered)})`}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold num">{tracked ? fmt(p.bookings) : "—"}</div>
              <div className="text-xs text-muted-foreground">bookings {tracked && `(${pct(p.bookings ?? 0, p.delivered)})`}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold num">{money(p.cost)}</div>
              <div className="text-xs text-muted-foreground">cost</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** Message performance as a table with Sent / Delivered / Clicks / Bookings / Cost columns. */
function PerfTable({ perf, best, onSelect }: { perf: StepPerf[]; best: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="overflow-x-auto border bg-card">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="border-b bg-muted/60">
          <tr>
            {["Message", "Sent", "Delivered", "Clicks", "Bookings", "Cost"].map((h, i) => (
              <th key={h} scope="col" className={cn("px-3 py-2 text-xs font-medium whitespace-nowrap text-muted-foreground", i === 0 ? "text-left" : "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {perf.map((p) => {
            const tracked = p.clicks !== null;
            const isBest = best === p.step.id;
            return (
              <tr
                key={p.step.id}
                onClick={() => onSelect(p.step.id)}
                className={cn("cursor-pointer transition hover:bg-muted/50", isBest && "bg-success-soft/40 hover:bg-success-soft/60")}
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5 font-medium">
                    {p.step.name}
                    {isBest && (
                      <span className="inline-flex items-center gap-1 rounded-sm bg-success px-1.5 py-0.5 text-[11px] font-medium text-success-foreground">
                        <Trophy className="size-3" /> Best
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{p.step.delay}</div>
                </td>
                <td className="px-3 py-2.5 text-right num">{fmt(p.sent)}</td>
                <td className="px-3 py-2.5 text-right num">
                  {fmt(p.delivered)} <span className="text-xs text-muted-foreground">({pct(p.delivered, p.sent)})</span>
                </td>
                <td className="px-3 py-2.5 text-right num">
                  {tracked ? <>{fmt(p.clicks)} <span className="text-xs text-muted-foreground">({pct(p.clicks ?? 0, p.delivered)})</span></> : "—"}
                </td>
                <td className="px-3 py-2.5 text-right num">
                  {tracked ? <>{fmt(p.bookings)} <span className="text-xs text-muted-foreground">({pct(p.bookings ?? 0, p.delivered)})</span></> : "—"}
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap num">{money(p.cost)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Pop-up for one message: what was sent and why it performed the way it did. */
function MessageDetailDialog({ c, stepId, onClose, onClone }: { c: Campaign; stepId: string | null; onClose: () => void; onClone: (c: Campaign, stepId: string) => void }) {
  const perf = stepPerf(c);
  const p = perf.find((x) => x.step.id === stepId) ?? null;
  const both = p?.step.text && p?.step.email;
  const [channel, setChannel] = useState<Channel>("text");
  const active: Channel = p ? (both ? channel : p.step.text ? "text" : "email") : "text";

  return (
    <Dialog open={!!p} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto" aria-describedby={undefined}>
        {p && (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg">{p.step.name} · {c.name}</DialogTitle>
              <DialogDescription>{p.step.delay} · what was sent and why it performed this way</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 border bg-card p-4 sm:grid-cols-5">
              <Metric label="Sent" value={fmt(p.sent)} />
              <Metric label="Delivered" value={fmt(p.delivered)} hint={pct(p.delivered, p.sent)} />
              <Metric label="Clicks" value={fmt(p.clicks)} hint={p.clicks !== null ? pct(p.clicks, p.delivered) : "not tracked"} />
              <Metric label="Bookings" value={fmt(p.bookings)} hint={p.bookings !== null ? pct(p.bookings, p.delivered) : "not tracked"} />
              <Metric label="Cost" value={money(p.cost)} />
            </div>

            <Tabs value={active} onValueChange={(v) => setChannel(v as Channel)} className="mt-4">
              {both && (
                <TabsList>
                  <TabsTrigger value="text">Text message</TabsTrigger>
                  <TabsTrigger value="email">Email</TabsTrigger>
                </TabsList>
              )}
              <div className="mt-3 grid items-start gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Message mockup</h4>
                  <TabsContent value="text" className="mt-2">{p.step.text && <TextPreview m={p.step.text} />}</TabsContent>
                  <TabsContent value="email" className="mt-2">{p.step.email && <EmailPreview t={p.step.email} device="desktop" />}</TabsContent>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key insights{both ? ` · ${active === "text" ? "text" : "email"}` : ""}</h4>
                  {keyInsights(c, p.step.id, active).map((i, idx) => (
                    <div key={idx} className="border bg-card p-3">
                      <span className={cn("inline-flex rounded-sm px-1.5 py-0.5 text-[11px] font-medium", kindTone[i.kind])}>{kindLabel[i.kind]}</span>
                      <p className="mt-1.5 text-sm font-medium">{i.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{i.detail}</p>
                      {i.kind === "next" && (
                        <Button size="sm" variant="outline" className="mt-2.5" onClick={() => onClone(c, p.step.id)}>
                          <Copy /> Clone into a new campaign
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ResultsDialog({ c, onClose, onClone }: { c: Campaign | null; onClose: () => void; onClone: (c: Campaign, stepId: string) => void }) {
  const perf = c ? stepPerf(c) : [];
  const best = c ? bestStepId(perf) : null;
  const [perfView, setPerfView] = useState<"table" | "cards">("table");
  const [detailId, setDetailId] = useState<string | null>(null);
  const t = c ? campaignTotals(c) : null;
  const general = c ? campaignInsight(c) : null;

  return (
    <Dialog open={!!c} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto" aria-describedby={undefined}>
        {c && t && general && (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg">Results · {c.name}</DialogTitle>
              <DialogDescription>
                {c.audience} · {t.followUps === 0 ? "Initial message only" : `Initial message + ${t.followUps} follow-up${t.followUps > 1 ? "s" : ""}`}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 border bg-card p-4 sm:grid-cols-4">
              <Metric label="Eligible guests" value={fmt(c.eligible)} />
              <Metric label="Messages sent" value={fmt(t.totalSent)} />
              <Metric label="Bookings" value={fmt(t.steps.every((s) => s.bookings === null) ? null : t.steps.reduce<number>((a, s) => a + (s.bookings ?? 0), 0))} />
              <Metric label={c.costIsEstimate ? "Est. cost" : "Cost"} value={money(t.cost)} />
            </div>

            <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1fr_280px]">
              <section aria-label="Message performance">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">Message performance</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">Which message did better. Open one to see what was sent and why it worked.</p>
                  </div>
                  <div className="flex rounded-sm border bg-card p-0.5" role="group" aria-label="Message performance view">
                    {([["table", "Table", Rows3], ["cards", "Cards", LayoutList]] as const).map(([v, label, Icon]) => (
                      <button
                        key={v}
                        aria-pressed={perfView === v}
                        onClick={() => setPerfView(v)}
                        className={cn("flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-sm", perfView === v ? "bg-primary-soft font-medium text-primary" : "text-muted-foreground hover:text-foreground")}
                      >
                        <Icon className="size-4" strokeWidth={1.75} /> {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-3">
                  {perfView === "table" ? (
                    <PerfTable perf={perf} best={best} onSelect={setDetailId} />
                  ) : (
                    <PerfCards perf={perf} best={best} onSelect={setDetailId} />
                  )}
                </div>
              </section>
              <aside><Funnel c={c} /></aside>
            </div>

            <div className="mt-4 border border-primary/25 bg-primary-soft/40 p-4">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <Lightbulb className="size-4 text-primary" strokeWidth={1.75} /> Key insight · {general.title}
              </h3>
              <ul className="mt-2.5 space-y-2">
                {general.detail.split("\n").map((line, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                    <span className="mt-[7px] size-1.5 shrink-0 rounded-[1px] bg-primary" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <MessageDetailDialog c={c} stepId={detailId} onClose={() => setDetailId(null)} onClone={onClone} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
