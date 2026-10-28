import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Copy, FlaskConical, LayoutList, MoreHorizontal, Plus, Rows3, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ReachBar, StatusLabel, VolumeInfo } from "@/components/campaign-bits";
import {
  type Campaign, type CampaignStatus, type ChannelStrategy, CHANNEL_LABEL, STATUS_LABEL, campaignTotals, campaigns as seed, fmt, fmtDate, money,
} from "@/lib/campaigns";
import { cn } from "@/lib/utils";

type Search = { q: string; status: CampaignStatus | "all"; channel: ChannelStrategy | "all"; view: "card" | "table" };
/** Defaults for links pointing back at the campaigns list. */
export const HOME_SEARCH: Search = { q: "", status: "all", channel: "all", view: "card" };

export const Route = createFileRoute("/")({
  validateSearch: ({ q, status, channel, view }: Record<string, unknown>): Search => ({
    q: typeof q === "string" ? q : "",
    status: (status as Search["status"]) || "all",
    channel: (channel as Search["channel"]) || "all",
    view: view === "table" ? "table" : "card",
  }),
  head: () => ({
    meta: [
      { title: "Drip Campaigns — Directful" },
      { name: "description", content: "Manage and track your hotel guest outreach campaigns across text and email." },
      { property: "og:title", content: "Drip Campaigns — Directful" },
      { property: "og:description", content: "Manage and track your hotel guest outreach campaigns across text and email." },
    ],
  }),
  component: CampaignsPage,
});

function CampaignsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const [list, setList] = useState<Campaign[]>(seed);
  const [toDelete, setToDelete] = useState<Campaign | null>(null);
  const view = search.view ?? "card";
  const set = (p: Partial<Search>) => navigate({ search: (prev) => ({ ...prev, ...p }), replace: true });

  const filtered = useMemo(
    () =>
      list.filter(
        (c) =>
          (!search.q || c.name.toLowerCase().includes(search.q.toLowerCase())) &&
          (!search.status || search.status === "all" || c.status === search.status) &&
          (!search.channel || search.channel === "all" || c.channel === search.channel),
      ),
    [list, search],
  );

  const actions = {
    test: (c: Campaign) => toast.success(`Test message for “${c.name}” sent to your phone`),
    clone: (c: Campaign) => {
      setList((l) => [{ ...c, id: c.id + "-copy-" + l.length, name: c.name + " (copy)", status: "draft", reached: 0, createdAt: "2026-10-28" }, ...l]);
      toast.success(`Cloned “${c.name}” as a draft`);
    },
    del: (c: Campaign) => setToDelete(c),
  };

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-8 lg:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Drip Campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage and track your guest outreach campaigns.</p>
        </div>
        <Button onClick={() => toast("Campaign builder opens here")}>
          <Plus /> Create drip campaign
        </Button>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-b pb-4">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search campaigns"
            placeholder="Search campaigns"
            className="bg-card pl-8"
            value={search.q}
            onChange={(e) => set({ q: e.target.value })}
          />
        </div>
        <Select value={search.status} onValueChange={(v) => set({ status: v as Search["status"] })}>
          <SelectTrigger className="w-40 bg-card" aria-label="Status filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={search.channel} onValueChange={(v) => set({ channel: v as Search["channel"] })}>
          <SelectTrigger className="w-52 bg-card" aria-label="Channel filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            {Object.entries(CHANNEL_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex rounded-sm border bg-card p-0.5" role="group" aria-label="View mode">
          {([["card", "Card view", LayoutList], ["table", "Table view", Rows3]] as const).map(([v, label, Icon]) => (
            <button
              key={v}
              aria-pressed={view === v}
              onClick={() => set({ view: v })}
              className={cn("flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-sm", view === v ? "bg-primary-soft font-medium text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <Icon className="size-4" strokeWidth={1.75} /> {label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">{filtered.length} of {list.length} campaigns</p>

      {filtered.length === 0 ? (
        <div className="mt-3 border border-dashed bg-card px-6 py-16 text-center">
          <p className="font-medium">No campaigns match these filters</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate({ search: { q: "", status: "all", channel: "all", view: search.view }, replace: true })}>Clear filters</Button>
        </div>
      ) : view === "card" ? (
        <ul className="mt-3 flex flex-col gap-3">
          {filtered.map((c) => <CampaignCard key={c.id} c={c} actions={actions} />)}
        </ul>
      ) : (
        <CampaignTable rows={filtered} actions={actions} />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>This removes the campaign and its schedule. Messages already sent are not affected. This can’t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setList((l) => l.filter((x) => x.id !== toDelete?.id));
                toast.success("Campaign deleted");
              }}
            >
              Delete campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type Actions = { test: (c: Campaign) => void; clone: (c: Campaign) => void; del: (c: Campaign) => void };

function MoreMenu({ c, actions }: { c: Campaign; actions: Actions }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`More actions for ${c.name}`}><MoreHorizontal /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => actions.test(c)}><FlaskConical /> Send test</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.clone(c)}><Copy /> Clone</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => actions.del(c)}><Trash2 /> Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CampaignCard({ c, actions }: { c: Campaign; actions: Actions }) {
  const t = campaignTotals(c);
  return (
    <li className="grid grid-cols-1 gap-5 border bg-card px-5 py-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-8">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h2 className="truncate text-[15px] font-semibold">{c.name}</h2>
          <StatusLabel status={c.status} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {c.createdBy} · {fmtDate(c.createdAt)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {CHANNEL_LABEL[c.channel]} · {t.followUps === 0 ? "No follow-ups" : `${t.followUps} follow-up${t.followUps > 1 ? "s" : ""}`}
        </p>
      </div>

      <div className="lg:border-l lg:pl-8">
        <div className="mb-2 text-xs text-muted-foreground">
          Eligible guests <span className="ml-1 text-sm font-semibold text-foreground num">{fmt(c.eligible)}</span>
        </div>
        <ReachBar c={c} />
      </div>

      <div className="flex items-center justify-between gap-4 lg:border-l lg:pl-8">
        <dl className="flex gap-6">
          <div>
            <dt className="flex items-center gap-1 text-xs text-muted-foreground">Total messages sent <VolumeInfo c={c} /></dt>
            <dd className="text-sm font-semibold num">{fmt(t.totalSent)}</dd>
          </div>
          <div>
            <dt className="text-xs leading-5 text-muted-foreground">{c.costIsEstimate ? "Est. cost" : "Cost"}</dt>
            <dd className="text-sm font-semibold num">{money(t.cost)}</dd>
          </div>
        </dl>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" asChild>
            <Link to="/campaigns/$id" params={{ id: c.id }}>See results</Link>
          </Button>
          <MoreMenu c={c} actions={actions} />
        </div>
      </div>
    </li>
  );
}

type SortKey = "name" | "eligible" | "reached" | "sent" | "cost" | "createdAt";

function CampaignTable({ rows, actions }: { rows: Campaign[]; actions: Actions }) {
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "createdAt", dir: -1 });
  const data = rows.map((c) => ({ c, t: campaignTotals(c) }));
  const val = (r: (typeof data)[number]): string | number =>
    sort.k === "name" ? r.c.name : sort.k === "eligible" ? r.c.eligible : sort.k === "reached" ? r.c.reached : sort.k === "sent" ? r.t.totalSent : sort.k === "cost" ? r.t.cost ?? -1 : r.c.createdAt;
  data.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);

  const H = ({ k, children, right }: { k?: SortKey; children: React.ReactNode; right?: boolean }) => (
    <th scope="col" aria-sort={k && sort.k === k ? (sort.dir === 1 ? "ascending" : "descending") : undefined} className={cn("px-3 py-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground", right ? "text-right" : "text-left")}>
      {k ? (
        <button className={cn("inline-flex items-center gap-1 hover:text-foreground", sort.k === k && "text-foreground")} onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : -1 }))}>
          {children}
          {sort.k === k && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
        </button>
      ) : children}
    </th>
  );

  return (
    <div className="mt-3 overflow-x-auto border bg-card">
      <table className="w-full min-w-[1080px] text-sm">
        <thead className="border-b bg-muted/60">
          <tr>
            <H k="name">Campaign</H>
            <H>Created by</H>
            <H k="createdAt">Created</H>
            <H>Status</H>
            <H>Channel</H>
            <H k="eligible" right>Eligible</H>
            <H k="reached" right>Reached</H>
            <H k="sent" right>Messages sent</H>
            <H k="cost" right>Cost</H>
            <H right><span className="sr-only">Actions</span></H>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map(({ c, t }) => (
            <tr key={c.id} className="hover:bg-muted/50 focus-within:bg-primary-soft/60">
              <td className="px-3 py-2.5">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">{t.followUps} follow-up{t.followUps === 1 ? "" : "s"}</div>
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap">{c.createdBy}</td>
              <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{fmtDate(c.createdAt)}</td>
              <td className="px-3 py-2.5"><StatusLabel status={c.status} /></td>
              <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{CHANNEL_LABEL[c.channel]}</td>
              <td className="px-3 py-2.5 text-right num">{fmt(c.eligible)}</td>
              <td className="px-3 py-2.5 text-right num">{fmt(c.reached)}</td>
              <td className="px-3 py-2.5 text-right num">
                <span className="inline-flex items-center gap-1">{fmt(t.totalSent)} <VolumeInfo c={c} /></span>
              </td>
              <td className="px-3 py-2.5 text-right whitespace-nowrap num">
                {money(t.cost)}
                {c.costIsEstimate && <span className="ml-1 text-xs text-muted-foreground">est.</span>}
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/campaigns/$id" params={{ id: c.id }}>See results</Link>
                </Button>
                <MoreMenu c={c} actions={actions} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
