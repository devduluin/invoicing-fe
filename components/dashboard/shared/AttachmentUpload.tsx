"use client";

import { useRef, useState, type DragEvent } from "react";
import { FileText, Paperclip, Trash2, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useTr } from "@/lib/useTr";

const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
const MAX_BYTES = 5 * 1024 * 1024;

export interface AttachmentValue {
  data: string; // data: URI, "" when none
  name: string; // original filename
}

/** Generic per-document attachment box (quote, PO scan, supporting file) —
 *  same drag/drop + `data:` URI convention as `LogoUpload`, generalized to
 *  accept PDFs too and to show a filename chip instead of an image preview
 *  for non-image files. Used in DocumentFormLayout's header-left slot. */
export function AttachmentUpload({
  value,
  onChange,
  disabled,
}: {
  value: AttachmentValue;
  onChange: (value: AttachmentValue) => void;
  disabled?: boolean;
}) {
  const tr = useTr();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const isImage = value.data.startsWith("data:image/");

  const take = (file?: File | null) => {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      toast.error(tr("Lampiran harus berformat PNG, JPG, atau PDF.", "Attachment must be PNG, JPG, or PDF."));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(tr("Ukuran lampiran maksimal 5MB.", "Attachment size must not exceed 5MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange({ data: reader.result as string, name: file.name });
    reader.onerror = () => toast.error(tr("Gagal membaca file.", "Failed to read file."));
    reader.readAsDataURL(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (!disabled) take(e.dataTransfer.files?.[0]);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={tr("Unggah lampiran", "Attach a file")}
      onKeyDown={(e) => {
        if (!disabled && e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={cn(
        "flex size-full min-h-32 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed bg-muted/30 p-4 text-center transition-colors",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted/50",
        drag ? "border-primary" : "border-border",
      )}
    >
      {value.data ? (
        isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.data} alt={value.name} className="max-h-20 max-w-full rounded-lg object-contain" />
        ) : (
          <FileText className="size-8 text-primary-ink" strokeWidth={1.5} />
        )
      ) : (
        <UploadCloud className="size-6 text-slate-400" strokeWidth={1.5} aria-hidden />
      )}

      {value.data ? (
        <p className="flex max-w-full items-center gap-1 truncate text-[13px] font-medium text-slate-700">
          <Paperclip className="size-3 shrink-0" />
          <span className="truncate">{value.name}</span>
        </p>
      ) : (
        <p className="text-[13px] text-slate-600">
          {tr("Klik atau seret file ke sini", "Click or drop a file here")}
          <br />
          <span className="text-xs text-slate-500">{tr("PNG, JPG, atau PDF, maks. 5MB", "PNG, JPG, or PDF, up to 5MB")}</span>
        </p>
      )}

      {value.data && !disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange({ data: "", name: "" });
          }}
          className="mt-0.5 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-3.5" />
          {tr("Hapus", "Remove")}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,application/pdf"
        hidden
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
