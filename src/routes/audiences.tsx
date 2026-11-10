import { createFileRoute } from "@tanstack/react-router";
import { audiences, fmt, fmtDate } from "@/lib/campaigns";

export const Route = createFileRoute("/audiences")({
  head: () => ({
    meta: [
      { title: "Audiences — Directful" },
      { name: "description", content: "Guest audiences used by your drip campaigns." },
      { property: "og:title", content: "Audiences — Directful" },
      { property: "og:description", content: "Guest audiences used by your drip campaigns." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AudiencesPage,
});

function AudiencesPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-6 py-8 lg:px-10">
      <h1 className="text-2xl font-semibold tracking-tight">Audiences</h1>
      <p className="mt-1 text-sm text-muted-foreground">Guest groups you can target with drip campaigns.</p>
      <div className="mt-6 overflow-x-auto border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/60 text-xs text-muted-foreground">
            <tr>{["Audience", "Source", "Unique guests", "Created", "Updated"].map((h) => <th key={h} className="px-3 py-2.5 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {audiences.map((a) => (
              <tr key={a.id}>
                <td className="px-3 py-2.5"><div className="font-medium">{a.name}</div><div className="text-xs text-muted-foreground">{a.description}</div></td>
                <td className="px-3 py-2.5 text-muted-foreground">{a.source}</td>
                <td className="px-3 py-2.5 num">{fmt(a.guests)}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{fmtDate(a.createdAt)}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{fmtDate(a.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
