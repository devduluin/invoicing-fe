"use client";

import { ConfirmDeleteModal } from "@/components/modal/ConfirmDeleteModal";
import { useTr } from "@/lib/useTr";

/** The one delete confirmation every transaction document uses. Delete is a soft delete: the
 *  record is kept (deleted_at) but leaves the active lists, summaries and outstanding figures. */
export function DeleteDocumentModal({
  open,
  title,
  number,
  note,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  number?: string;
  /** Extra consequence specific to the document (e.g. a receipt taking its payment back). */
  note?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const tr = useTr();
  return (
    <ConfirmDeleteModal
      open={open}
      title={title}
      description={[
        number ? `"${number}"` : "",
        tr(
          "Dokumen ini akan dipindahkan ke tempat sampah dan tidak lagi muncul di daftar transaksi aktif.",
          "This document will be moved to trash and will no longer appear in the active transaction list.",
        ),
        note ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
