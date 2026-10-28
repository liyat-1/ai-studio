import { useState } from "react";
import { ChevronRight, Trophy } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Metric } from "@/components/campaign-bits";
import { EmailPreview, TextPreview } from "@/components/message-previews";
import { type Campaign, campaignTotals, fmt, money, pct } from "@/lib/campaigns";
import { bestStepId, keyInsights, stepPerf, type StepPerf } from "@/lib/insights";
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

function PerfRow({ p, selected, best, onSelect }: { p: StepPerf; selected: boolean; best: boolean; onSelect: () => void }) {
  const tracked = p.clicks !== null;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full flex-wrap items-center gap-x-4 gap-y-1 border bg-card px-3 py-2.5 text-left transition hover:bg-muted/50",
        selected && "border-primary ring-1 ring-primary",
        best && !selected && "border-success/40 bg-success-soft/40",
      )}
    >
      <div className="min-w-[150px] flex-1">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          {p.step.name}
          {best && (
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
}

export function ResultsDialog({ c, onClose }: { c: Campaign | null; onClose: () => void }) {
  const perf = c ? stepPerf(c) : [];
  const best = c ? bestStepId(perf) : null;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = perf.find((p) => p.step.id === (selectedId ?? best)) ?? perf[0];
  const t = c ? campaignTotals(c) : null;

  return (
    <Dialog open={!!c} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto" aria-describedby={undefined}>
        {c && t && selected && (
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

            <section aria-label="Message performance" className="mt-2">
              <h3 className="text-sm font-semibold">Message performance</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Which message did better. Select one to see what was sent and why it worked.</p>
              <div className="mt-3 space-y-2">
                {perf.map((p) => (
                  <PerfRow key={p.step.id} p={p} selected={selected.step.id === p.step.id} best={best === p.step.id} onSelect={() => setSelectedId(p.step.id)} />
                ))}
              </div>
            </section>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_260px]">
              <section aria-label="Selected message detail">
                <h3 className="text-sm font-semibold">{selected.step.name} — what was sent & why it worked</h3>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key insights</h4>
                    {keyInsights(c, selected.step.id).map((i, idx) => (
                      <div key={idx} className="border bg-card p-3">
                        <span className={cn("inline-flex rounded-sm px-1.5 py-0.5 text-[11px] font-medium", kindTone[i.kind])}>{kindLabel[i.kind]}</span>
                        <p className="mt-1.5 text-sm font-medium">{i.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{i.detail}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Message mockups</h4>
                    <Tabs defaultValue={selected.step.text ? "text" : "email"} className="mt-2">
                      {selected.step.text && selected.step.email && (
                        <TabsList>
                          <TabsTrigger value="text">Text</TabsTrigger>
                          <TabsTrigger value="email">Email</TabsTrigger>
                        </TabsList>
                      )}
                      {selected.step.text && (
                        <TabsContent value="text" className="mt-3"><TextPreview m={selected.step.text} /></TabsContent>
                      )}
                      {selected.step.email && (
                        <TabsContent value="email" className="mt-3"><EmailPreview t={selected.step.email} device="desktop" /></TabsContent>
                      )}
                    </Tabs>
                  </div>
                </div>
              </section>
              <aside><Funnel c={c} /></aside>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
