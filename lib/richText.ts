import DOMPurify from "dompurify";

/**
 * Notes / Terms & Conditions are TipTap HTML going forward; older rows are plain
 * text with newlines. Same rule as the backend (utils/richtext.go): content that
 * starts with a TipTap block tag is rich text, anything else is plain text and is
 * always escaped on render. Keep the two in sync.
 */
const RICH_START = /^\s*<(p|ul|ol|br)[\s/>]/i;

export function looksLikeRichText(value: string | null | undefined): boolean {
  return !!value && RICH_START.test(value);
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Legacy plain text → editor/display HTML: one paragraph per line, escaped. */
export function plainTextToHtml(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

/** Tag-free text, for table cells / previews. Legacy plain text passes through. */
export function htmlToPlainText(value: string | null | undefined): string {
  const v = value ?? "";
  if (!looksLikeRichText(v)) return v;
  return v
    .replace(/<\/(p|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function isRichTextEmpty(value: string | null | undefined): boolean {
  return htmlToPlainText(value).trim() === "";
}

const ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "a"];
const ALIGN = /^\s*text-align\s*:\s*(left|center|right|justify)\s*;?\s*$/i;

let hooked = false;
function installHooks() {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    // Only `text-align` survives from inline styles.
    if (node.hasAttribute?.("style")) {
      const m = ALIGN.exec(node.getAttribute("style") ?? "");
      if (m) node.setAttribute("style", `text-align: ${m[1].toLowerCase()}`);
      else node.removeAttribute("style");
    }
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow");
    }
  });
}

/** Sanitize TipTap-style HTML down to what the editor can produce. */
export function sanitizeRichHtml(html: string): string {
  if (typeof window === "undefined" || !DOMPurify.isSupported) {
    // No DOM (SSR): degrade to escaped text rather than trusting a regex sanitizer.
    return plainTextToHtml(htmlToPlainText(html));
  }
  installHooks();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "style", "target", "rel"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
  });
}

/** What to put in `dangerouslySetInnerHTML` (or the editor) for a stored value. */
export function renderRichText(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  if (!v) return "";
  return looksLikeRichText(v) ? sanitizeRichHtml(v) : plainTextToHtml(v);
}
