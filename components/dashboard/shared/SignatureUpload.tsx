"use client";

import { useRef, useState, type DragEvent } from "react";
import { PenLine, Trash2, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useTr } from "@/lib/useTr";
import { CheckboxField } from "@/components/form";

const ALLOWED = ["image/png", "image/jpeg", "image/jpg"];
const MAX_BYTES = 2 * 1024 * 1024;

/** Signature image upload + "Include Stamp Duty (e-Meterai)" toggle, same
 *  `data:` URI drag/drop convention as `LogoUpload`. Captured on every
 *  document for layout consistency; only actually rendered on a print
 *  template where one exists (Sales Invoice today). */
export function SignatureUpload({
  signatureData,
  onSignatureChange,
  stampDuty,
  onStampDutyChange,
  disabled,
}: {
  signatureData: string;
  onSignatureChange: (data: string) => void;
  stampDuty: boolean;
  onStampDutyChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const tr = useTr();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const take = (file?: File | null) => {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      toast.error(tr("Tanda tangan harus berformat PNG atau JPG.", "Signature must be PNG or JPG."));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(tr("Ukuran tanda tangan maksimal 2MB.", "Signature size must not exceed 2MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onSignatureChange(reader.result as string);
    reader.onerror = () => toast.error(tr("Gagal membaca file.", "Failed to read file."));
    reader.readAsDataURL(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (!disabled) take(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="flex flex-col items-start gap-3">
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
        aria-label={tr("Unggah tanda tangan", "Upload signature")}
        onKeyDown={(e) => {
          if (!disabled && e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          "grid h-24 w-56 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-dashed bg-muted/30 transition-colors",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted/50",
          drag ? "border-primary" : "border-border",
        )}
      >
        {signatureData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={signatureData} alt={tr("Tanda tangan", "Signature")} className="max-h-full max-w-full object-contain p-2" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-500">
            <UploadCloud className="size-5" strokeWidth={1.5} aria-hidden />
            <span className="text-xs">{tr("Unggah tanda tangan", "Upload signature")}</span>
          </div>
        )}
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

      <div className="space-y-2 text-left">
        <p className="flex items-center gap-1.5 text-[13px] text-slate-600">
          <PenLine className="size-3.5" aria-hidden />
          {tr("PNG atau JPG, maks.", "PNG or JPG, up to")} <span className="font-semibold text-foreground">2MB</span>.
        </p>
        {signatureData && !disabled && (
          <button
            type="button"
            onClick={() => onSignatureChange("")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="size-3.5" />
            {tr("Hapus", "Remove")}
          </button>
        )}
        <CheckboxField
          checked={stampDuty}
          onChange={onStampDutyChange}
          disabled={disabled}
          label={tr("Sertakan meterai (e-Meterai)", "Include Stamp Duty (e-Meterai)")}
        />
      </div>
    </div>
  );
}
