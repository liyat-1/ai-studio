import { describe, expect, it } from "vitest";
import { campaigns, campaignTotals, getCampaign } from "./campaigns";

describe("campaign reporting integrity", () => {
  it("reached + not reached equals eligible guests", () => {
    for (const c of campaigns) {
      const t = campaignTotals(c);
      expect(c.reached + t.notReached).toBe(c.eligible);
    }
  });

  it("total messages sent is the sum of every step's sends", () => {
    const t = campaignTotals(getCampaign("august-campaign")!);
    expect(t.totalSent).toBe(t.steps.reduce((a, s) => a + s.sent, 0));
    // text: 1850+1850+1000, email: 1620+1500+860
    expect(t.totalSent).toBe(4700 + 3980);
  });

  it("untracked clicks stay null instead of zero", () => {
    const t = campaignTotals(getCampaign("fall-returning")!);
    expect(t.steps[1]!.clicks).toBeNull();
  });
});
