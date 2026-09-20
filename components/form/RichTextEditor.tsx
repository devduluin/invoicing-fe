"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extensions";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Underline as UnderlineIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { renderRichText } from "@/lib/richText";
import { useLanguageStore } from "@/store/useLanguageStore";

const NO_ACTIVE = {
  bold: false,
  italic: false,
  underline: false,
  bullet: false,
  ordered: false,
  link: false,
  left: false,
  center: false,
  right: false,
};

interface RichTextEditorProps {
  /** Stored value: TipTap HTML, or legacy plain text (converted on load). */
  value: string;
  /** Emits sanitized-on-save HTML, or "" when the editor is empty. */
  onChange: (html: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  error?: boolean;
  minHeightClass?: string;
}

/**
 * Reusable rich-text field for Notes and Terms & Conditions. Only the formatting
 * the invoice (and its PDF) renders is enabled: bold, italic, underline, bullet /
 * numbered lists, paragraph alignment and links. The backend re-sanitizes on save.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  id,
  disabled,
  error,
  minHeightClass = "min-h-24",
}: RichTextEditorProps) {
  const isIndonesian = useLanguageStore((s) => s.language === "id");
  const lastEmitted = useRef(value);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    // Required for Next.js SSR — render on the client only.
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      TextAlign.configure({ types: ["paragraph"] }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: renderRichText(value),
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class: cn("rich-text px-3 py-2.5 text-[13px] text-slate-800 outline-none", minHeightClass),
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.isEmpty ? "" : ed.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });

  // External value changes (e.g. the record finishing loading) → push into the editor.
  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(renderRichText(value), { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const active = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed?.isActive("bold") ?? false,
      italic: ed?.isActive("italic") ?? false,
      underline: ed?.isActive("underline") ?? false,
      bullet: ed?.isActive("bulletList") ?? false,
      ordered: ed?.isActive("orderedList") ?? false,
      link: ed?.isActive("link") ?? false,
      left: ed?.isActive({ textAlign: "left" }) ?? false,
      center: ed?.isActive({ textAlign: "center" }) ?? false,
      right: ed?.isActive({ textAlign: "right" }) ?? false,
    }),
  });

  if (!editor) {
    return <div className={cn("rounded-xl border border-border-strong bg-white", minHeightClass)} />;
  }

  const a = active ?? NO_ACTIVE;

  const openLink = () => {
    setLinkUrl(editor.getAttributes("link").href ?? "");
    setLinkOpen(true);
  };
  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else if (/^(https?:\/\/|mailto:)/i.test(url)) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    setLinkOpen(false);
  };

  const Btn = ({
    label,
    on,
    isActive,
    children,
  }: {
    label: string;
    on: () => void;
    isActive: boolean;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={isActive}
      disabled={disabled}
      // Keep the selection in the editor when a toolbar button is pressed.
      onMouseDown={(e) => e.preventDefault()}
      onClick={on}
      className={cn(
        "grid size-7 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-40",
        isActive && "bg-secondary text-primary-ink",
      )}
    >
      {children}
    </button>
  );

  const chain = () => editor.chain().focus();

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-white transition-all",
        "focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/15",
        error ? "border-rose-400" : "border-border-strong",
        disabled && "bg-slate-50",
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-slate-50/70 px-1.5 py-1">
        <Btn label={isIndonesian ? "Tebal" : "Bold"} on={() => chain().toggleBold().run()} isActive={a.bold}>
          <Bold className="size-3.5" />
        </Btn>
        <Btn label={isIndonesian ? "Miring" : "Italic"} on={() => chain().toggleItalic().run()} isActive={a.italic}>
          <Italic className="size-3.5" />
        </Btn>
        <Btn
          label={isIndonesian ? "Garis bawah" : "Underline"}
          on={() => chain().toggleUnderline().run()}
          isActive={a.underline}
        >
          <UnderlineIcon className="size-3.5" />
        </Btn>
        <span className="mx-1 h-4 w-px bg-border-strong" />
        <Btn
          label={isIndonesian ? "Daftar poin" : "Bullet list"}
          on={() => chain().toggleBulletList().run()}
          isActive={a.bullet}
        >
          <List className="size-3.5" />
        </Btn>
        <Btn
          label={isIndonesian ? "Daftar nomor" : "Numbered list"}
          on={() => chain().toggleOrderedList().run()}
          isActive={a.ordered}
        >
          <ListOrdered className="size-3.5" />
        </Btn>
        <span className="mx-1 h-4 w-px bg-border-strong" />
        <Btn label={isIndonesian ? "Rata kiri" : "Align left"} on={() => chain().setTextAlign("left").run()} isActive={a.left}>
          <AlignLeft className="size-3.5" />
        </Btn>
        <Btn
          label={isIndonesian ? "Rata tengah" : "Align center"}
          on={() => chain().setTextAlign("center").run()}
          isActive={a.center}
        >
          <AlignCenter className="size-3.5" />
        </Btn>
        <Btn
          label={isIndonesian ? "Rata kanan" : "Align right"}
          on={() => chain().setTextAlign("right").run()}
          isActive={a.right}
        >
          <AlignRight className="size-3.5" />
        </Btn>
        <span className="mx-1 h-4 w-px bg-border-strong" />
        <Btn label={isIndonesian ? "Tautan" : "Link"} on={openLink} isActive={a.link}>
          <Link2 className="size-3.5" />
        </Btn>
      </div>

      {linkOpen && (
        <div className="flex items-center gap-2 border-b border-border bg-slate-50/40 px-2 py-1.5">
          <input
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
              if (e.key === "Escape") setLinkOpen(false);
            }}
            placeholder="https://…"
            className="h-7 flex-1 rounded-lg border border-border-strong bg-white px-2 text-xs outline-none focus:border-primary"
          />
          <button type="button" onClick={applyLink} className="text-xs font-semibold text-primary-ink hover:underline">
            {linkUrl.trim() ? (isIndonesian ? "Terapkan" : "Apply") : isIndonesian ? "Hapus tautan" : "Remove link"}
          </button>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
