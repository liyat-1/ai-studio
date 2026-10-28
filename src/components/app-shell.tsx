import { Link } from "@tanstack/react-router";
import { BarChart3, Inbox, LayoutGrid, Megaphone, Settings, Users } from "lucide-react";
import type { ReactNode } from "react";
import { HOME_SEARCH } from "@/routes/index";

const nav = [
  { label: "Dashboard", icon: LayoutGrid },
  { label: "Drip Campaigns", icon: Megaphone, to: "/" as const },
  { label: "Inbox", icon: Inbox },
  { label: "Guests", icon: Users },
  { label: "Reports", icon: BarChart3 },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-5">
          <span className="grid size-6 place-items-center rounded-sm bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">D</span>
          <span className="text-[15px] font-semibold tracking-tight text-sidebar-accent-foreground">Directful</span>
        </div>
        <nav className="flex flex-col gap-0.5 p-3" aria-label="Main">
          {nav.map((n) =>
            n.to ? (
              <Link
                key={n.label}
                to={n.to}
                className="flex items-center gap-2.5 rounded-sm bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-accent-foreground"
              >
                <n.icon className="size-4" strokeWidth={1.75} />
                {n.label}
              </Link>
            ) : (
              <span key={n.label} className="flex cursor-default items-center gap-2.5 px-3 py-2 text-sm opacity-70">
                <n.icon className="size-4" strokeWidth={1.75} />
                {n.label}
              </span>
            ),
          )}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 border-t border-sidebar-border px-5 py-4 text-sm opacity-80">
          <Settings className="size-4" strokeWidth={1.75} />
          The Saltwater Hotel
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
