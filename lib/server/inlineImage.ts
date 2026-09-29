// Server-only. The PDF pipeline's headless Chromium only ever loads data:/blob:/same-origin
// resources (see pdfRenderer.ts's route filter — a deliberate SSRF guard: a stored logo/signature
// URL must never make the headless browser fetch an arbitrary address). That means an image stored
// as a real https:// URL (company logo, a document's own captured signature — both go through SSO's
// MinIO upload once saved, see company.service.go / attachment_upload.go) would silently fail to
// load in the PDF while rendering fine on-screen (the browser tab has no such restriction).
//
// The fix is to fetch the image ONCE, here, on the trusted Next.js server — never inside the
// headless page — and hand the renderer an already-embedded data: URI. A failure (unreachable,
// wrong content type, too large) degrades the same way a broken image already does elsewhere in
// these templates: nothing is drawn, never a broken-image icon or a crashed render.

const MAX_INLINE_IMAGE_BYTES = 5_000_000; // 5MB
const INLINE_FETCH_TIMEOUT_MS = 8_000;

/** `url` is already a data:/blob: URI, empty, or a real http(s) URL to fetch and inline. Anything
 *  else (file:, javascript:, a bare path, …) is refused outright. */
export async function inlineRemoteImage(url: string | null | undefined): Promise<string | undefined> {
  const v = (url ?? "").trim();
  if (!v) return undefined;
  if (v.startsWith("data:") || v.startsWith("blob:")) return v;
  if (!/^https?:\/\//i.test(v)) return undefined;

  try {
    const res = await fetch(v, { signal: AbortSignal.timeout(INLINE_FETCH_TIMEOUT_MS) });
    if (!res.ok) return undefined;
    const contentType = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (!contentType.startsWith("image/")) return undefined;
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > MAX_INLINE_IMAGE_BYTES) return undefined;
    return `data:${contentType};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return undefined;
  }
}
