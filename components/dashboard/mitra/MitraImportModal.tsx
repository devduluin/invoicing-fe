"use client";

import ImportModal, { ImportPreviewTable } from "@/components/dashboard/shared/ImportModal";
import { importResultText } from "@/lib/importResult";
import { useTr } from "@/lib/useTr";
import { useLanguageStore } from "@/store/useLanguageStore";
import { buildPartnerTemplate, parsePartnerFile, type ImportPartner } from "@/lib/partnerImport";
import { importMitra } from "@/services/mitraService";

const contactsOf = (items: ImportPartner[]) => items.reduce((n, p) => n + p.input.contact_persons.length, 0);

/** Import partners (with their contact persons) from the Excel template. */
export default function MitraImportModal({
  canAddContact,
  onClose,
  onImported,
}: {
  canAddContact: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const tr = useTr();
  const lang = useLanguageStore((s) => s.language) === "id" ? "id" : "en";

  return (
    <ImportModal<ImportPartner>
      title={tr("Import Mitra", "Import Partners")}
      description={tr("Tambahkan banyak mitra sekaligus dari file Excel.", "Add many partners at once from an Excel file.")}
      templateHint={tr(
        'Isi data mitra di sheet "Data". Petunjuk dan contoh ada di sheet "Petunjuk".',
        'Fill in your partners on the "Data" sheet. Instructions (in Indonesian) and an example are on the "Petunjuk" sheet.',
      )}
      templateFileName={tr("template-import-mitra.xlsx", "partner-import-template.xlsx")}
      buildTemplate={() => buildPartnerTemplate(lang)}
      parse={async (file) => {
        const r = await parsePartnerFile(file, lang);
        return { items: r.partners, errors: r.errors, fatal: r.fatal };
      }}
      blockers={(items) =>
        contactsOf(items) && !canAddContact
          ? [tr("Anda tidak punya izin menambah kontak. Kosongkan kolom kontak di file.", "You don't have permission to add contact persons. Clear the contact person columns in the file.")]
          : []
      }
      summary={(items) =>
        tr(`${items.length} mitra dan ${contactsOf(items)} kontak siap diimpor`, `${items.length} partners and ${contactsOf(items)} contact persons ready to import`)
      }
      preview={(items) => (
        <ImportPreviewTable
          head={[{ label: tr("Baris", "Row") }, { label: tr("Kode", "Code") }, { label: tr("Nama Mitra", "Partner Name") }, { label: "PIC" }, { label: tr("Kontak", "Contacts"), align: "right" }]}
          rows={items.map((p) => ({ key: p.row, cells: [p.row, p.input.code || tr("(otomatis)", "(auto)"), p.input.name, p.input.contact_name, p.input.contact_persons.length] }))}
        />
      )}
      submitLabel={(n) => tr(`Import ${n} Mitra`, `Import ${n} Partners`)}
      submit={async (items) => {
        const res = await importMitra(items.map((p) => ({ ...p.input, row: p.row })));
        return importResultText(tr, res, tr("mitra", "partners"));
      }}
      onClose={onClose}
      onImported={onImported}
    />
  );
}
