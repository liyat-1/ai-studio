import hero from "@/assets/email-hero.jpg";
import room from "@/assets/email-room.jpg";
import type { EmailTemplate, TextMessage } from "@/lib/campaigns";
import { cn } from "@/lib/utils";

/* The email canvas intentionally uses the hotel's own email styling (not Directful tokens),
   since it represents the guest-facing template as sent. */
const fill = (s: string) => s.replace(/\{first_name\}/g, "Olivia");

export function EmailPreview({ t, device }: { t: EmailTemplate; device: "desktop" | "mobile" }) {
  return (
    <div className={cn("mx-auto transition-[max-width]", device === "desktop" ? "max-w-[640px]" : "max-w-[375px]")}>
      <div className="mb-3 border bg-card px-4 py-3 text-sm">
        <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Subject</span><span className="font-medium">{fill(t.subject)}</span></div>
        <div className="mt-1 flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Preheader</span><span className="text-muted-foreground">{t.previewText}</span></div>
      </div>

      <article className="email-canvas bg-card text-[15px] leading-relaxed text-foreground" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
        <div className="flex items-center justify-center border-b py-5">
          <span className="text-sm tracking-[0.35em] uppercase">The Saltwater</span>
        </div>
        <img src={hero} alt="Infinity pool overlooking the sea at sunset" width={1200} height={608} className="block h-auto w-full" />
        <div className={cn(device === "desktop" ? "px-12 py-10" : "px-6 py-8")}>
          <h1 className={cn("leading-tight", device === "desktop" ? "text-3xl" : "text-2xl")}>{t.heading}</h1>
          {t.body.map((p) => <p key={p} className="mt-4">{fill(p)}</p>)}
          <div className="mt-7">
            <span className="inline-block rounded-sm bg-sidebar px-7 py-3 font-sans text-sm font-medium tracking-wide text-sidebar-accent-foreground uppercase">{t.cta}</span>
          </div>
        </div>
        {t.secondary && (
          <div className={cn("grid border-t", device === "desktop" ? "grid-cols-2" : "grid-cols-1")}>
            <img src={room} alt="Ocean view suite" loading="lazy" width={944} height={704} className="block h-full w-full object-cover" />
            <div className="px-8 py-8">
              <h2 className="text-xl">{t.secondary.title}</h2>
              <p className="mt-2 text-sm">{t.secondary.text}</p>
              <span className="mt-4 inline-block border-b border-foreground font-sans text-xs tracking-wide uppercase">View suites</span>
            </div>
          </div>
        )}
        <footer className="border-t bg-muted px-8 py-6 text-center font-sans text-xs text-muted-foreground">
          <p>{t.footer}</p>
          <p className="mt-2">You’re receiving this because you stayed with us. <span className="underline">Unsubscribe</span> · <span className="underline">Preferences</span></p>
        </footer>
      </article>
    </div>
  );
}

export function TextPreview({ m }: { m: TextMessage }) {
  const parts = fill(m.body).split(/(saltwtr\.co\/\S+)/);
  return (
    <div className="flex flex-wrap items-start justify-center gap-8">
      <div className="w-[300px] border-[10px] border-sidebar bg-card" style={{ borderRadius: 3 }}>
        <div className="border-b px-4 py-2 text-center text-xs">
          <div className="font-medium">The Saltwater Hotel</div>
          <div className="text-muted-foreground">Text message · Today 10:00 AM</div>
        </div>
        <div className="min-h-[320px] bg-muted px-3 py-4">
          <div className="max-w-[85%] rounded-sm bg-card px-3 py-2 text-sm leading-snug">
            {parts.map((p, i) => (i % 2 ? <span key={i} className="text-primary underline">{p}</span> : <span key={i}>{p}</span>))}
          </div>
        </div>
      </div>
      <dl className="w-56 space-y-3 text-sm">
        <div><dt className="text-xs text-muted-foreground">Length</dt><dd className="num">{m.body.length} characters · {m.segments} segment</dd></div>
        <div><dt className="text-xs text-muted-foreground">Personalization</dt><dd>{"{first_name}"} shown as “Olivia”</dd></div>
        <div><dt className="text-xs text-muted-foreground">Opt-out</dt><dd>Included (Reply STOP)</dd></div>
      </dl>
    </div>
  );
}
