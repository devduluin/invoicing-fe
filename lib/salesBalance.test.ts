import { describe, expect, it } from "vitest";
import { salesBalance } from "./salesBalance";

const M = 1_000_000;

describe("salesBalance: Total - Applied DP - Paid", () => {
  it.each([
    ["invoice only (case 1)", 10 * M, 0, 0, 10 * M, "unpaid"],
    ["confirmed DP 3jt (case 4)", 10 * M, 3 * M, 0, 7 * M, "partially_paid"],
    ["DP 3jt + payment 2jt (case 5)", 10 * M, 3 * M, 2 * M, 5 * M, "partially_paid"],
    ["payment 4jt only (case 6)", 10 * M, 0, 4 * M, 6 * M, "partially_paid"],
    ["DP 3jt + payment 7jt (case 7)", 10 * M, 3 * M, 7 * M, 0, "paid"],
    ["never negative", 10 * M, 6 * M, 6 * M, 0, "paid"],
    ["empty invoice", 0, 0, 0, 0, "unpaid"],
  ])("%s", (_n, total, dp, paid, outstanding, status) => {
    expect(salesBalance(total, dp, paid)).toEqual({ outstanding, status });
  });
});
