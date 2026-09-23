"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Copy, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { DeleteDocumentModal } from "./DeleteDocumentModal";
import PageHeader from "@/components/layouts/page/PageHeader";
import DocumentHeaderActions, { type HeaderAction } from "./DocumentHeaderActions";
import ConnectedDocuments from "./ConnectedDocuments";
import type { ConnectedDocType } from "@/services/connectedDocumentService";
import type { PdfDocKind } from "@/services/pdfService";
import { extractApiError } from "@/lib/apiError";
import { useTr } from "@/lib/useTr";
import { usePageBreadcrumb } from "@/store/useBreadcrumbStore";

export interface DetailFact {
  label: string;
  value: ReactNode;
}

/** One read-only detail layout for documents that have no template (receipts, delivery notes, goods
 *  receipts): header with the number, a facts band, the page-specific sections, and the actions.
 *  Edit is the primary action; Delete lives in the More menu behind a confirmation. */
export default function DocumentDetailShell({
  loading,
  failed,
  onRetry,
  number,
  subtitle,
  meta,
  facts,
  highlight,
  canEdit,
  editHref,
  canDelete,
  onDelete,
  listHref,
  listLabel,
  deleteTitle,
  connected,
  pdfKind,
  duplicateHref,
  children,
}: {
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  number?: string;
  subtitle?: string;
  meta?: ReactNode;
  facts: DetailFact[];
  /** the one number that matters, shown tinted on the right */
  highlight?: DetailFact;
  canEdit: boolean;
  editHref: string;
  canDelete: boolean;
  onDelete: () => Promise<void>;
  listHref: string;
  listLabel: string;
  deleteTitle: string;
  /** Which document this is, for the "Dokumen Terhubung" panel every detail page carries. */
  connected: { type: ConnectedDocType; id: string };
  /** Only documents that can be printed (a receipt has a fixed layout; DN/GR do not print). */
  pdfKind?: PdfDocKind;
  /** Where "Duplicate" goes, when the document supports it and the viewer may create. */
  duplicateHref?: string;
  children: ReactNode;
}) {
  const tr = useTr();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  usePageBreadcrumb([{ label: listLabel, href: listHref }, { label: number ?? "…" }]);

  if (failed) return <ErrorState onRetry={onRetry} />;
  if (loading || !number) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  const remove = async () => {
    try {
      await onDelete();
      toast.success(tr("Dokumen dihapus", "Document deleted"));
      router.replace(listHref);
    } catch (err) {
      toast.error(extractApiError(err, tr("Gagal menghapus dokumen", "Failed to delete the document")));
      setConfirm(false);
    }
  };

  const headerActions: HeaderAction[] = [
    ...(canEdit ? [{ key: "edit", label: tr("Ubah", "Edit"), icon: <Pencil aria-hidden />, onSelect: () => router.push(editHref) }] : []),
    ...(duplicateHref ? [{ key: "duplicate", label: tr("Duplikat", "Duplicate"), icon: <Copy aria-hidden />, onSelect: () => router.push(duplicateHref) }] : []),
    ...(canDelete ? [{ key: "delete", label: tr("Hapus", "Delete"), icon: <Trash2 aria-hidden />, onSelect: () => setConfirm(true), destructive: true }] : []),
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title={number}
        description={subtitle}
        meta={meta}
        actions={<DocumentHeaderActions mode="detail" pdfKind={pdfKind} documentId={connected.id} actions={headerActions} />}
      />

      <div className={`grid overflow-hidden rounded-xl border border-border bg-card shadow-card ${highlight ? "lg:grid-cols-[minmax(0,1fr)_260px]" : ""}`}>
        <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 px-4 py-3 sm:grid-cols-3 xl:grid-cols-4">
          {facts.map((f) => (
            <div key={f.label} className="min-w-0">
              <div className="text-xs font-medium text-slate-500">{f.label}</div>
              <div className="mt-0.5 truncate text-sm font-semibold text-slate-900">{f.value}</div>
            </div>
          ))}
        </div>
        {highlight && (
          <div className="overview-gradient border-t border-[var(--tint-border)] px-4 py-3 lg:border-t-0 lg:border-l">
            <div className="text-xs font-semibold tracking-wide text-primary-ink uppercase">{highlight.label}</div>
            <div className="mt-0.5 font-display text-2xl leading-8 font-semibold tabular-nums text-slate-900">{highlight.value}</div>
          </div>
        )}
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-3">{children}</div>
        <ConnectedDocuments type={connected.type} id={connected.id} />
      </div>

      <DeleteDocumentModal open={confirm} title={deleteTitle} number={number} onConfirm={remove} onClose={() => setConfirm(false)} />
    </div>
  );
}

/** A titled panel used inside detail pages. */
export function DetailPanel({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border bg-[var(--surface-2)] px-4 py-2">
        <h2 className="font-display text-[13px] font-semibold text-slate-900">{title}</h2>
        {count !== undefined && <span className="rounded-full bg-primary/10 px-2 text-xs font-semibold tabular-nums text-primary-ink">{count}</span>}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
