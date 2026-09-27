import { describe, expect, it } from "vitest";
import { addDays, dueDateFor, paymentTermDays } from "./paymentTerms";

describe("payment terms", () => {
  it("adds calendar days without timezone drift, across month and year ends", () => {
    expect(addDays("2026-09-24", 30)).toBe("2026-10-24");
    expect(addDays("2026-12-20", 14)).toBe("2027-01-03");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
  it("derives the due date from a fixed term, and nothing for custom / none", () => {
    expect(dueDateFor("net_30", "2026-09-24")).toBe("2026-10-24");
    expect(dueDateFor("cod", "2026-09-24")).toBe("2026-09-24");
    expect(dueDateFor("custom", "2026-09-24")).toBeUndefined();
    expect(dueDateFor("", "2026-09-24")).toBeUndefined();
    expect(paymentTermDays("net_60")).toBe(60);
  });
});
