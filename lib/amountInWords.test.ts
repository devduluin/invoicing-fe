import { describe, expect, it } from "vitest";

import { amountInWords } from "./amountInWords";

describe("amountInWords", () => {
  it("Indonesian", () => {
    expect(amountInWords(0, "id")).toBe("Nol Rupiah");
    expect(amountInWords(1000, "id")).toBe("Seribu Rupiah");
    expect(amountInWords(14100, "id")).toBe("Empat Belas Ribu Seratus Rupiah");
    expect(amountInWords(2_500_000, "id")).toBe("Dua Juta Lima Ratus Ribu Rupiah");
    expect(amountInWords(111_111, "id")).toBe("Seratus Sebelas Ribu Seratus Sebelas Rupiah");
    expect(amountInWords(1_000_000_000, "id")).toBe("Satu Miliar Rupiah");
  });
  it("English", () => {
    expect(amountInWords(14100, "en")).toBe("Fourteen Thousand One Hundred Rupiah");
    expect(amountInWords(21, "en")).toBe("Twenty-One Rupiah");
    expect(amountInWords(2_500_000, "en")).toBe("Two Million Five Hundred Thousand Rupiah");
  });
  it("rounds and never goes negative", () => {
    expect(amountInWords(-5, "id")).toBe("Nol Rupiah");
    expect(amountInWords(99.6, "id")).toBe("Seratus Rupiah");
  });
});
