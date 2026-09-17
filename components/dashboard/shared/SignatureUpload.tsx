"use client";

import { useRef, useState, type DragEvent } from "react";
import { PenLine, Trash2, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const take = (file?: File | null) => {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      toast.error("Signature must be PNG or JPG.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Signature size must not exceed 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onSignatureChange(reader.result as string);
    reader.onerror = () => toast.error("Failed to read file.");
    reader.readAsDataURL(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (!disabled) take(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "grid h-24 w-56 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-dashed bg-muted/30 transition-all",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted/50",
          drag ? "border-primary" : "border-border",
        )}
      >
        {signatureData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={signatureData} alt="Signature" className="max-h-full max-w-full object-contain p-2" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
            <UploadCloud className="size-5" strokeWidth={1.5} />
            <span className="text-[10px]">Upload signature</span>
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

      <div className="space-y-2.5 text-center sm:text-left">
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:justify-start">
          <PenLine className="size-3.5" />
          PNG or JPG, up to <span className="font-semibold text-foreground">2MB</span>.
        </p>
        {signatureData && !disabled && (
          <button
            type="button"
            onClick={() => onSignatureChange("")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-[11px] font-bold text-destructive shadow-sm transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="size-3.5" />
            Remove
          </button>
        )}
        <CheckboxField
          checked={stampDuty}
          onChange={onStampDutyChange}
          disabled={disabled}
          label="Include Stamp Duty (e-Meterai)"
        />
      </div>
    </div>
  );
}
