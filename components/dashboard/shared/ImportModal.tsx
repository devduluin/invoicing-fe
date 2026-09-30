"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, UploadCloud, X } from "lucide-react";
import { AxiosError } from "axios";
import toast from "@/lib/toast";

import { Button } from "@/components/ui";
import { Modal } from "@/components/modal/Modal";
import { cn } from "@/lib/utils";
import { useTr } from "@/lib/useTr";
import { extractApiError } from "@/lib/apiError";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** What a parser returns for an uploaded file. */
export interface ImportParseResult<T> {
  items: T[];
  errors: { row: number; message: string }[];
  /** the file itself is unusable (wrong sheet / header): nothing else is reported */
  fatal?: string;
}

/** Excel import dialog shared by the import features: download the template, upload it, check the
 *  rows here (every problem listed with its row), then save them all at once — all or nothing. */
export default function ImportModal<T>({
  title,
  description,
  templateHint,
  templateFileName,
  loading,
  buildTemplate,
  parse,
  blockers,
  summary,
  preview,
  submitLabel,
  submit,
  onClose,
  onImported,
}: {
  title: string;
  description: string;
  templateHint: string;
  templateFileName: string;
  /** reference data (partners, taxes…) still loading: download and upload wait for it */
  loading?: boolean;
  buildTemplate: () => Promise<Blob>;
  parse: (file: File) => Promise<ImportParseResult<T>>;
  /** problems that stop the import beyond the rows' own (e.g. a missing permission) */
  blockers?: (items: T[]) => string[];
  summary: (items: T[]) => string;
  preview: (items: T[]) => ReactNode;
  submitLabel: (count: number) => string;
  /** saves the items; resolves to the success message */
  submit: (items: T[]) => Promise<string>;
  onClose: () => void;
  onImported: () => void;
}) {
  const tr = useTr();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ImportParseResult<T> | null>(null);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const downloadTemplate = async () => {
    try {
      const url = URL.createObjectURL(await buildTemplate());
      const a = document.createElement("a");
      a.href = url;
      a.download = templateFileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(tr("Gagal membuat template", "Couldn't create the template"));
    }
  };

  const take = async (f?: File) => {
    if (!f) return;
    setServerErrors([]);
    setFile(f);
    if (!/\.xlsx$/i.test(f.name)) {
      setParsed({ items: [], errors: [], fatal: tr("Unggah file Excel (.xlsx) dari template.", "Upload the template as an Excel (.xlsx) file.") });
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setParsed({ items: [], errors: [], fatal: tr("Ukuran file maksimal 5MB.", "The file must be 5MB or smaller.") });
      return;
    }
    setReading(true);
    try {
      setParsed(await parse(f));
    } finally {
      setReading(false);
    }
  };

  const pickFile = () => !busy && !loading && inputRef.current?.click();
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (!loading) void take(e.dataTransfer.files?.[0]);
  };
  const reset = () => {
    setFile(null);
    setParsed(null);
    setServerErrors([]);
  };

  const items = parsed?.items ?? [];
  const blocked = parsed && !parsed.fatal ? (blockers?.(items) ?? []) : [];
  const ready = !!parsed && !parsed.fatal && !parsed.errors.length && items.length > 0 && !blocked.length;

  const save = async () => {
    if (!ready) return;
    setBusy(true);
    setServerErrors([]);
    try {
      toast.success(await submit(items));
      onImported();
    } catch (err) {
      const list = err instanceof AxiosError ? (err.response?.data as { errors?: string[] } | undefined)?.errors : undefined;
      setServerErrors(list && list.length > 1 ? list : [extractApiError(err, tr("Gagal mengimpor data", "Import failed"))]);
    } finally {
      setBusy(false);
    }
  };

  const problems: string[] = parsed?.fatal
    ? [parsed.fatal]
    : [...(parsed?.errors ?? []).map((e) => tr(`Baris ${e.row}: ${e.message}`, `Row ${e.row}: ${e.message}`)), ...blocked, ...serverErrors];

  return (
    <Modal className="flex max-h-[calc(100dvh-2rem)] max-w-2xl flex-col" labelledBy="import-modal-title" onClose={busy ? undefined : onClose}>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-3.5">
        <div>
          <h2 id="import-modal-title" className="font-display text-base font-semibold text-slate-800">
            {title}
          </h2>
          <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label={tr("Tutup", "Close")}
          className="-mr-1 grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-slate-700">{tr("1. Unduh template", "1. Download the template")}</p>
            <p className="text-xs text-slate-500">{templateHint}</p>
          </div>
          <Button variant="outline" size="sm" leftIcon={<Download className="size-4" />} onClick={() => void downloadTemplate()} loading={loading} disabled={loading}>
            {tr("Unduh Template", "Download Template")}
          </Button>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-slate-700">{tr("2. Unggah file", "2. Upload the file")}</p>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={pickFile}
            role="button"
            tabIndex={0}
            aria-disabled={loading}
            aria-label={tr("Unggah file import", "Upload the import file")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                pickFile();
              }
            }}
            className={cn(
              "flex min-h-28 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed bg-muted/30 p-4 text-center transition-colors",
              loading ? "cursor-wait opacity-60" : "cursor-pointer hover:bg-muted/50",
              drag ? "border-primary" : "border-border",
            )}
          >
            {file ? (
              <>
                <FileSpreadsheet className="size-7 text-primary-ink" strokeWidth={1.5} />
                <p className="max-w-full truncate text-[13px] font-medium text-slate-700">{file.name}</p>
                <p className="text-xs text-slate-500">{reading ? tr("Membaca file…", "Reading the file…") : tr("Klik untuk mengganti file", "Click to choose another file")}</p>
              </>
            ) : (
              <>
                <UploadCloud className="size-6 text-slate-400" strokeWidth={1.5} aria-hidden />
                <p className="text-[13px] text-slate-600">{tr("Klik atau seret file ke sini", "Click or drop a file here")}</p>
                <p className="text-xs text-slate-500">{tr("Excel (.xlsx), maks. 5MB", "Excel (.xlsx), up to 5MB")}</p>
              </>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            hidden
            onChange={(e) => {
              void take(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        {parsed && !reading &&
          (problems.length ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {parsed.errors.length && !parsed.fatal
                  ? tr(`${parsed.errors.length} masalah ditemukan — perbaiki di file lalu unggah ulang`, `${parsed.errors.length} problems found — fix them in the file and upload it again`)
                  : tr("File belum bisa diimpor", "The file can't be imported yet")}
              </p>
              <ul className="mt-2 max-h-56 list-disc space-y-1 overflow-y-auto pl-5 text-[13px] text-slate-700">
                {problems.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700">
                <CheckCircle2 className="size-4 shrink-0" />
                {summary(items)}
              </p>
              <div className="max-h-56 overflow-auto rounded-xl border border-border">{preview(items)}</div>
            </div>
          ))}
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-slate-50/60 px-5 py-3">
        {file && (
          <Button variant="ghost" onClick={reset} disabled={busy} className="mr-auto">
            {tr("Hapus File", "Remove File")}
          </Button>
        )}
        <Button variant="outline" onClick={onClose} disabled={busy}>
          {tr("Batal", "Cancel")}
        </Button>
        <Button variant="primary" onClick={() => void save()} loading={busy} disabled={!ready || reading}>
          {ready ? submitLabel(items.length) : tr("Import", "Import")}
        </Button>
      </div>
    </Modal>
  );
}

/** The compact preview table the import dialogs show once a file checks out. */
export function ImportPreviewTable({ head, rows }: { head: { label: string; align?: "right" }[]; rows: { key: string | number; cells: ReactNode[] }[] }) {
  return (
    <table className="w-full text-left text-[13px]">
      <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
        <tr>
          {head.map((h, i) => (
            <th key={i} className={cn("px-3 py-2 font-semibold", h.align === "right" && "text-right")}>
              {h.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((r) => (
          <tr key={r.key}>
            {r.cells.map((c, i) => (
              <td key={i} className={cn("px-3 py-1.5 text-slate-700", i === 0 && "text-slate-500", head[i]?.align === "right" && "text-right")}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
