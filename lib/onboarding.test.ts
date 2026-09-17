import { describe, expect, it } from "vitest";
import { roleLabel, EMPLOYEE_COUNT_OPTIONS, WIZARD_STEPS } from "./onboarding";

describe("roleLabel", () => {
  it("strips the SSO company-hex prefix and the Invoice word", () => {
    expect(roleLabel("a1b2c3d4-Invoice Admin")).toBe("Admin");
    expect(roleLabel("Invoice Owner")).toBe("Owner");
    expect(roleLabel("Kasir")).toBe("Kasir");
  });
  it("handles empty", () => {
    expect(roleLabel("")).toBe("—");
  });
});

describe("wizard config", () => {
  it("has 4 steps", () => {
    expect(WIZARD_STEPS).toHaveLength(4);
  });
  it("employee buckets match the backend values", () => {
    expect(EMPLOYEE_COUNT_OPTIONS.map((o) => o.value)).toEqual([
      "1-5",
      "6-10",
      "11-25",
      "26-50",
      "51-100",
      "100+",
    ]);
  });
});
