import { describe, expect, it } from "vitest";
import toast from "./toast";

describe("toast", () => {
  it("shows the same message once, however often it is raised", () => {
    const a = toast.success("Duplicated from DP/2026/0001");
    const b = toast.success("Duplicated from DP/2026/0001");
    expect(a).toBe(b);
    expect(toast.success("Another message")).not.toBe(a);
  });

  it("keeps an id the caller gave", () => {
    expect(toast.error("Failed", { id: "save" })).toBe("save");
  });
});
