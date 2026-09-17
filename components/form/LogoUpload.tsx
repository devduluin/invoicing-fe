"use client";

import { useRef, useState, type DragEvent } from "react";
import { Building2, Trash2, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const ALLOWED = ["image/png", "image/jpeg", "image/jpg"];
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Company logo picker. Emits a `data:` URI (new file), keeps an existing URL, or
 * "" (removed) — the backend (CompanyService.processLogo) handles the rest,
 * exactly like acc-master.
 */
export function LogoUpload({
  value,
  onChange,
  disabled,
}: {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const take = (file?: File | null) => {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      toast.error("Logo must be PNG or JPG.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Logo size must not exceed 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.onerror = () => toast.error("Failed to read file.");
    reader.readAsDataURL(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (!disabled) take(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-muted/30 p-5 sm:flex-row sm:items-center">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={cn(
          "grid size-28 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 bg-card transition-all",
          drag ? "border-primary" : "border-border",
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Company logo" className="size-full object-contain p-2" />
        ) : (
          <Building2 className="size-10 text-muted-foreground/40" strokeWidth={1.5} />
        )}
      </div>

      <div className="flex-1 space-y-3 text-center sm:text-left">
        <p className="text-xs text-muted-foreground">
          PNG or JPG, up to <span className="font-semibold text-foreground">2MB</span>. Appears on
          invoices and documents you issue.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground shadow-sm transition-colors hover:border-input hover:bg-muted disabled:opacity-50"
          >
            <UploadCloud className="size-4" />
            {value ? "Change logo" : "Upload logo"}
          </button>
          {value && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange("")}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-destructive shadow-sm transition-colors hover:bg-destructive/10 disabled:opacity-50"
            >
              <Trash2 className="size-4" />
              Remove
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        hidden
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
