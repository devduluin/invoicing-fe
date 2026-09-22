"use client";

import { useState } from "react";
import { Download, Printer } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/Button";
import { extractApiError } from "@/lib/apiError";
import { useTr } from "@/lib/useTr";
import { downloadDocumentPdf, printDocumentPdf, type PdfDocKind } from "@/services/pdfService";

/** The one Print + Download PDF pair every templated document's detail header uses. Both use the
 *  document's saved template; there is no separate print page. */
export default function PrintPdfActions({ kind, id }: { kind: PdfDocKind; id: string }) {
  const tr = useTr();
  const [busy, setBusy] = useState<"print" | "pdf" | null>(null);
  const run = (which: "print" | "pdf") => async () => {
    setBusy(which);
    try {
      await (which === "print" ? printDocumentPdf : downloadDocumentPdf)(kind, id);
    } catch (err) {
      toast.error(extractApiError(err, tr("Gagal membuat PDF", "Failed to generate the PDF")));
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      <Button variant="outline" leftIcon={<Printer className="size-4" />} onClick={run("print")} loading={busy === "print"} disabled={busy !== null}>
        {tr("Cetak", "Print")}
      </Button>
      <Button variant="outline" leftIcon={<Download className="size-4" />} onClick={run("pdf")} loading={busy === "pdf"} disabled={busy !== null}>
        PDF
      </Button>
    </>
  );
}
