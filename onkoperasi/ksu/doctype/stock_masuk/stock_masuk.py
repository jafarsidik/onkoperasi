import frappe
from frappe.model.document import Document
from frappe.utils import flt
from onkoperasi.onkoperasi.doctype.jurnal_entry.jurnal_entry import buat_jurnal

class StockMasuk(Document):
    def validate(self):
        self.hitung_total()
        for row in self.items:
            row.total = flt(row.qty) * flt(row.harga_beli)

    def hitung_total(self):
        self.total_nilai = sum(flt(r.qty) * flt(r.harga_beli) for r in self.items)

    def on_submit(self):
        self.update_stok(1)
        self.update_harga_beli()
        if self.jenis_masuk == "Pembelian":
            self.buat_jurnal_pembelian()

    def on_cancel(self):
        self.update_stok(-1)
        je = frappe.db.get_value("Jurnal Entry", {
            "referensi_doctype": "Stock Masuk",
            "referensi_docname": self.name, "docstatus": 1
        })
        if je:
            frappe.get_doc("Jurnal Entry", je).cancel()

    def update_stok(self, faktor):
        for row in self.items:
            stok_lama = frappe.db.get_value("Barang", row.item, "stok_saat_ini") or 0
            frappe.db.set_value("Barang", row.item, "stok_saat_ini",
                                flt(stok_lama) + (flt(row.qty) * faktor))

    def update_harga_beli(self):
        """Update harga beli (HPP) di master item."""
        for row in self.items:
            frappe.db.set_value("Barang", row.item, "harga_beli", row.harga_beli)

    def buat_jurnal_pembelian(self):
        settings = frappe.get_single("Koperasi Settings")
        akun_kas = settings.akun_kas
        if not akun_kas:
            return
        keterangan = f"Pembelian barang - {self.name}"
        for row in self.items:
            akun_persediaan = frappe.db.get_value("Barang", row.item, "akun_persediaan")
            if not akun_persediaan:
                akun_persediaan = "1-1500"
            total = flt(row.qty) * flt(row.harga_beli)
            buat_jurnal(
                tanggal=self.tanggal,
                jenis="Kas Keluar",
                keterangan=f"{keterangan} - {row.nama_item}",
                baris=[
                    {"akun": akun_persediaan, "debit": total, "kredit": 0},
                    {"akun": akun_kas, "debit": 0, "kredit": total}
                ],
                ref_doctype="Stock Masuk",
                ref_docname=self.name
            )
