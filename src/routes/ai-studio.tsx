import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TeamIntroduction } from "@/components/team-introduction";
import { HOME_SEARCH } from "@/routes/index";

export const Route = createFileRoute("/ai-studio")({
  head: () => ({ meta: [
    { title: "Meet Your AI Team — Directful AI Studio" },
    { name: "description", content: "Meet the eight Directful AI specialists supporting hotel campaigns, guest relationships, and direct bookings." },
    { property: "og:title", content: "Meet Your AI Team — Directful AI Studio" },
    { property: "og:description", content: "Discover the responsibilities of your hotel's specialized AI team." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: StudioPage,
});

function StudioPage() {
  const navigate = useNavigate();
  return <TeamIntroduction onContinue={() => navigate({ to: "/", search: HOME_SEARCH })} />;
}