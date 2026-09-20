import { renderRichText } from "@/lib/richText";
import { cn } from "@/lib/utils";

/** Read-only render of a Notes / Terms value (TipTap HTML or legacy plain text).
 *  Always goes through renderRichText: HTML is sanitized, plain text is escaped. */
export default function RichTextView({ value, className }: { value?: string | null; className?: string }) {
  const html = renderRichText(value);
  if (!html) return null;
  return <div className={cn("rich-text", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
