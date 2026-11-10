import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, Compass, Inbox, LayoutGrid, Megaphone, PanelLeftClose, PanelLeftOpen, Settings, UsersRound, Users } from "lucide-react";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { TeamIntroduction } from "@/components/team-introduction";
import { HOME_SEARCH } from "@/routes/index";

const nav = [
  { label: "AI Studio", icon: Compass, to: "/ai-studio" as const },
  { label: "Dashboard", icon: LayoutGrid },
  { label: "Drip Campaigns", icon: Megaphone, to: "/" as const },
  { label: "Audiences", icon: UsersRound, to: "/audiences" as const },
  { label: "Inbox", icon: Inbox },
  { label: "Guests", icon: Users },
  { label: "Reports", icon: BarChart3 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [introductionOpen, setIntroductionOpen] = useState(true);
  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
          collapsed ? "w-14" : "w-56",
        )}
      >
        <div className={cn("flex h-14 items-center gap-2 border-b border-sidebar-border", collapsed ? "justify-center px-2" : "px-5")}>
          <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">D</span>
          {!collapsed && <span className="text-[15px] font-semibold tracking-tight text-sidebar-accent-foreground">Directful</span>}
        </div>
        <nav className="flex flex-col gap-0.5 p-2" aria-label="Main">
          {nav.map((n) => {
            const cls = cn("flex items-center gap-2.5 rounded-sm py-2 text-sm", collapsed ? "justify-center px-0" : "px-3");
            const inner = (
              <>
                <n.icon className="size-4 shrink-0" strokeWidth={1.75} />
                {!collapsed && n.label}
              </>
            );
            if (!n.to) return <span key={n.label} title={collapsed ? n.label : undefined} className={cn(cls, "cursor-default opacity-60")}>{inner}</span>;
            const active = n.to === "/ai-studio" ? path === "/ai-studio" || (path === "/" && introductionOpen) : path === n.to && !introductionOpen;
            return (
                <Link
                key={n.label}
                to={n.to}
                 search={HOME_SEARCH}
                 onClick={() => { if (n.to === "/") setIntroductionOpen(false); }}
                title={collapsed ? n.label : undefined}
                className={cn(cls, active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60")}
              >
                {inner}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-sidebar-border">
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-5 pt-4 text-sm opacity-80">
              <Settings className="size-4" strokeWidth={1.75} /> The Saltwater Hotel
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn("flex w-full items-center gap-2.5 py-3 text-sm opacity-80 hover:opacity-100", collapsed ? "justify-center" : "px-5")}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <><PanelLeftClose className="size-4" /> Collapse</>}
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{path === "/" && introductionOpen ? <TeamIntroduction onContinue={() => setIntroductionOpen(false)} /> : children}</main>
    </div>
  );
}
