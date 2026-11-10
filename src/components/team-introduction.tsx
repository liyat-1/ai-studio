import { useState } from "react";
import { ArrowRight, ArrowUpRight, Check, Compass, TrendingUp, ScanSearch, Fingerprint, ChartNoAxesCombined, ShieldCheck, MessagesSquare, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { agents } from "@/lib/agents";
import portraits from "@/assets/ai-team-portraits.jpg";
import { cn } from "@/lib/utils";

const icons = { Compass, TrendingUp, ScanSearch, Fingerprint, ChartNoAxesCombined, ShieldCheck, MessagesSquare, Workflow };
const tones = { primary: "bg-primary-soft text-primary", success: "bg-success-soft text-success", warning: "bg-warning-soft text-warning" };
type Agent = (typeof agents)[number];

function Portrait({ agent, large = false }: { agent: Agent; large?: boolean }) {
  return <span className={cn("agent-portrait block shrink-0 overflow-hidden bg-muted", large ? "size-20" : "size-12")}><img src={portraits} alt="" width={1536} height={1024} className={`agent-portrait-image portrait-${agent.portrait}`} /></span>;
}

export function TeamIntroduction({ onContinue }: { onContinue: () => void }) {
  const [selected, setSelected] = useState<Agent | null>(null);
  return (
    <div className="team-introduction min-h-screen bg-card">
      <header className="flex min-h-14 items-center justify-between gap-3 border-b px-6 lg:px-10">
        <div className="flex items-center gap-2 text-sm font-medium"><span className="grid size-6 place-items-center rounded-sm bg-primary text-xs font-bold text-primary-foreground">D</span> AI Studio <span className="ml-2 border-l pl-3 text-xs font-normal text-muted-foreground">The Saltwater Hotel</span></div>
        <Button variant="ghost" size="sm" onClick={onContinue}>Campaigns <ArrowUpRight /></Button>
      </header>
      <div className="mx-auto max-w-[1120px] px-6 pb-10 pt-10 lg:px-10 lg:pt-16">
        <div className="mb-5 flex items-center gap-2 text-xs font-medium text-primary"><span className="size-1.5 rounded-full bg-primary" /> THE DIRECTFUL AI TEAM</div>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[600px]">
            <h1 className="text-4xl font-medium leading-[1.15] sm:text-5xl">Your hotel. <span className="text-muted-foreground">A whole new team.</span></h1>
            <p className="mt-5 max-w-[500px] text-base leading-relaxed text-muted-foreground">Eight specialists. One shared goal: more meaningful guest connections and more direct bookings.</p>
          </div>
          <Button onClick={onContinue} className="h-10">Ask Agent <ArrowRight /></Button>
        </div>
        <div className="mt-10 flex items-center justify-between gap-4 border-b pb-3 text-xs lg:mt-14"><span className="font-medium">Meet your specialists</span><span className="text-muted-foreground">Strategy to the final guest reply</span></div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {agents.map((agent) => {
            const Icon = icons[agent.icon];
            return <Button key={agent.id} variant="ghost" onClick={() => setSelected(agent)} className="group h-auto min-h-[184px] flex-col items-start justify-start whitespace-normal rounded-md border bg-card p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-lift">
              <span className="flex w-full items-center justify-between"><Portrait agent={agent} /><span className={cn("grid size-7 place-items-center rounded-sm", tones[agent.tone])}><Icon /></span></span>
              <span className="mt-3 flex w-full items-center justify-between gap-2 text-sm font-medium">{agent.name}<ArrowUpRight className="text-muted-foreground transition-colors group-hover:text-primary" /></span>
              <span className="text-xs font-normal text-primary">{agent.role}</span>
              <span className="mt-1 text-xs font-normal leading-relaxed text-muted-foreground">{agent.description}</span>
            </Button>;
          })}
        </div>
        <footer className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t pt-5 text-xs text-muted-foreground"><span className="flex items-center gap-2"><Compass className="size-4 text-primary" /> Led by your Marketing Manager. Supported by specialists.</span><span>Directful · AI Studio</span></footer>
      </div>
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-[480px] bg-card p-7">
          {selected && <><Portrait agent={selected} large /><div><p className="mb-2 text-xs font-medium text-primary">{selected.role}</p><DialogTitle className="text-2xl">{selected.name}</DialogTitle><DialogDescription className="mt-3 leading-relaxed">{selected.description}</DialogDescription></div><div className="border-t pt-4"><h2 className="mb-3 text-xs font-medium text-muted-foreground">WHAT I BRING TO YOUR TEAM</h2><ul className="space-y-3">{selected.tasks.map((task) => <li key={task} className="flex items-center gap-3 text-sm"><Check className="size-4 text-primary" />{task}</li>)}</ul></div><Button onClick={() => { setSelected(null); onContinue(); }} className="mt-2">Ask Agent <ArrowRight /></Button></>}
        </DialogContent>
      </Dialog>
    </div>
  );
}