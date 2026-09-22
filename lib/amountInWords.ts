/** Whole-rupiah amount in words, for the "Terbilang" line of a receipt. Pure; used by the preview
 *  and the PDF so both print the same words. Fractions are dropped (rupiah amounts are whole). */

const ID_UNITS = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

function idBelowThousand(n: number): string {
  if (n < 12) return ID_UNITS[n];
  if (n < 20) return `${ID_UNITS[n - 10]} belas`;
  if (n < 100) return `${ID_UNITS[Math.floor(n / 10)]} puluh${n % 10 ? ` ${ID_UNITS[n % 10]}` : ""}`;
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return `${hundreds === 1 ? "seratus" : `${ID_UNITS[hundreds]} ratus`}${rest ? ` ${idBelowThousand(rest)}` : ""}`;
}

function idWords(n: number): string {
  if (n === 0) return "nol";
  const scales: [number, string][] = [
    [1e12, "triliun"],
    [1e9, "miliar"],
    [1e6, "juta"],
    [1e3, "ribu"],
  ];
  const parts: string[] = [];
  let rest = n;
  for (const [size, name] of scales) {
    const q = Math.floor(rest / size);
    if (q > 0) {
      parts.push(size === 1e3 && q === 1 ? "seribu" : `${idWords(q)} ${name}`);
      rest %= size;
    }
  }
  if (rest > 0) parts.push(idBelowThousand(rest));
  return parts.join(" ");
}

const EN_UNITS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function enBelowThousand(n: number): string {
  if (n < 20) return EN_UNITS[n];
  if (n < 100) return `${EN_TENS[Math.floor(n / 10)]}${n % 10 ? `-${EN_UNITS[n % 10]}` : ""}`;
  return `${EN_UNITS[Math.floor(n / 100)]} hundred${n % 100 ? ` ${enBelowThousand(n % 100)}` : ""}`;
}

function enWords(n: number): string {
  if (n === 0) return "zero";
  const scales: [number, string][] = [
    [1e12, "trillion"],
    [1e9, "billion"],
    [1e6, "million"],
    [1e3, "thousand"],
  ];
  const parts: string[] = [];
  let rest = n;
  for (const [size, name] of scales) {
    const q = Math.floor(rest / size);
    if (q > 0) {
      parts.push(`${enWords(q)} ${name}`);
      rest %= size;
    }
  }
  if (rest > 0) parts.push(enBelowThousand(rest));
  return parts.join(" ");
}

const capitalize = (s: string) => s.replace(/(^|[\s-])(\p{L})/gu, (_m, sep: string, c: string) => sep + c.toUpperCase());

export function amountInWords(amount: number, lang: "id" | "en"): string {
  const n = Math.max(0, Math.round(Number.isFinite(amount) ? amount : 0));
  return capitalize(`${lang === "id" ? idWords(n) : enWords(n)} rupiah`);
}
