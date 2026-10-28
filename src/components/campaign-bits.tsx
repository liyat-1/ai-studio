import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { type Campaign, type CampaignStatus, STATUS_LABEL, campaignTotals, fmt } from "@/lib/campaigns";

const statusTone: Record<CampaignStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-primary-soft text-primary",
  in_progress: "bg-primary-soft text-primary",
  completed: "bg-success-soft text-success",
  paused: "bg-warning-soft text-warning",
  failed: "bg-destructive-soft text-destructive",
};

export function StatusLabel({ status }: { status: CampaignStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", statusTone[status])}>
      <span className="size-1.5 rounded-[1px] bg-current" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ReachBar({ c }: { c: Campaign }) {
  const { notReached } = campaignTotals(c);
  const p = c.eligible ? (c.reached / c.eligible) * 100 : 0;
  return (
    <div>
      <div
        className="flex h-2 overflow-hidden rounded-sm bg-track"
        role="img"
        aria-label={`${fmt(c.reached)} of ${fmt(c.eligible)} eligible guests reached, ${fmt(notReached)} not reached`}
      >
        <div className="h-full bg-primary" style={{ width: `${p}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted-foreground num">
        <span>
          <span className="font-medium text-foreground">{fmt(c.reached)}</span> reached
        </span>
        <span>{fmt(notReached)} not reached</span>
      </div>
    </div>
  );
}

export function VolumeInfo({ c }: { c: Campaign }) {
  const t = campaignTotals(c);
  return (
    <Popover>
      <PopoverTrigger
        className="inline-grid size-5 place-items-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`Message volume breakdown for ${c.name}`}
      >
        <Info className="size-3.5" strokeWidth={1.75} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0 text-sm">
        <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Message volume</div>
        <dl className="px-3 py-2">
          {t.steps.map((s) => (
            <div key={s.step.id} className="flex justify-between py-1">
              <dt className="text-muted-foreground">{s.step.name}</dt>
              <dd className="num">{fmt(s.sent)} sent</dd>
            </div>
          ))}
          <div className="mt-1 flex justify-between border-t pt-2 font-medium">
            <dt>Total messages sent</dt>
            <dd className="num">{fmt(t.totalSent)}</dd>
          </div>
        </dl>
      </PopoverContent>
    </Popover>
  );
}

export function Metric({ label, value, hint, className }: { label: string; value: string; hint?: string; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tracking-tight num">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
