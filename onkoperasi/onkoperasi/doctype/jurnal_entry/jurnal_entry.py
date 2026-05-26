import frappe
from frappe.model.document import Document
from frappe.utils import flt

class JurnalEntry(Document):

    def validate(self):
        self.hitung_total()
        self.validasi_balance()

    def hitung_total(self):
        total_debit = sum(flt(row.debit) for row in self.items)
        total_kredit = sum(flt(row.kredit) for row in self.items)
        self.total_debit = total_debit
        self.total_kredit = total_kredit
        self.selisih = flt(total_debit - total_kredit)
        self.is_balanced = 1 if abs(self.selisih) < 0.01 else 0

    def validasi_balance(self):
        if not self.is_balanced:
            frappe.throw(f"Jurnal tidak balance! Selisih: {self.selisih:,.0f}. "
                         f"Total Debit: {self.total_debit:,.0f} | Total Kredit: {self.total_kredit:,.0f}")

    def on_submit(self):
        self.validasi_balance()

    def on_cancel(self):
        frappe.msgprint("Jurnal Entry dibatalkan.")


def buat_jurnal(tanggal, jenis, keterangan, baris, ref_doctype=None, ref_docname=None):
    """Helper untuk membuat Jurnal Entry dari DocType lain."""
    je = frappe.new_doc("Jurnal Entry")
    je.tanggal = tanggal
    je.jenis_jurnal = jenis
    je.keterangan = keterangan
    je.referensi_doctype = ref_doctype
    je.referensi_docname = ref_docname
    for b in baris:
        je.append("items", {
            "akun": b["akun"],
            "keterangan": b.get("keterangan", keterangan),
            "debit": b.get("debit", 0),
            "kredit": b.get("kredit", 0)
        })
    je.insert(ignore_permissions=True)
    je.submit()
    return je.name
