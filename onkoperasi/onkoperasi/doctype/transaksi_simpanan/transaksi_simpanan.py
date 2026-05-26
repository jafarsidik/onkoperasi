# Copyright (c) 2022, IDMS and contributors
# For license information, please see license.txt
import frappe
from frappe.model.document import Document
from frappe.utils import flt, nowdate
from onkoperasi.onkoperasi.doctype.jurnal_entry.jurnal_entry import buat_jurnal

class TransaksiSimpanan(Document):

    def validate(self):
        if not self.tanggal_transaksi:
            self.tanggal_transaksi = nowdate()

    def on_submit(self):
        self.buat_jurnal_simpanan()

    def on_cancel(self):
        # Cancel jurnal terkait
        jurnal = frappe.db.get_value("Jurnal Entry", {
            "referensi_doctype": "Transaksi Simpanan",
            "referensi_docname": self.name,
            "docstatus": 1
        })
        if jurnal:
            frappe.get_doc("Jurnal Entry", jurnal).cancel()

    def buat_jurnal_simpanan(self):
        settings = frappe.get_single("Koperasi Settings")
        akun_kas = settings.akun_kas
        if not akun_kas:
            frappe.throw("Harap set Akun Kas di Koperasi Settings terlebih dahulu.")

        # Tentukan akun simpanan berdasarkan jenis
        akun_simpanan = self.get_akun_simpanan(settings)

        jumlah = flt(self.jumlah)
        keterangan = f"{self.tipe_transaksi} - {self.anggota} - {self.jenis_simpanan}"

        if self.tipe_transaksi == "Setoran":
            baris = [
                {"akun": akun_kas, "debit": jumlah, "kredit": 0, "keterangan": keterangan},
                {"akun": akun_simpanan, "debit": 0, "kredit": jumlah, "keterangan": keterangan}
            ]
            jenis = "Kas Masuk"
        else:  # Penarikan
            baris = [
                {"akun": akun_simpanan, "debit": jumlah, "kredit": 0, "keterangan": keterangan},
                {"akun": akun_kas, "debit": 0, "kredit": jumlah, "keterangan": keterangan}
            ]
            jenis = "Kas Keluar"

        je_name = buat_jurnal(
            tanggal=self.tanggal_transaksi,
            jenis=jenis,
            keterangan=keterangan,
            baris=baris,
            ref_doctype="Transaksi Simpanan",
            ref_docname=self.name
        )
        frappe.msgprint(f"Jurnal Entry {je_name} berhasil dibuat.", alert=True)

    def get_akun_simpanan(self, settings):
        """Ambil akun berdasarkan jenis simpanan dari settings."""
        jenis = frappe.db.get_value("Jenis Simpanan", self.jenis_simpanan, "nama_simpanan") or ""
        jenis_lower = jenis.lower()
        if "pokok" in jenis_lower:
            return settings.akun_simpanan_pokok or settings.akun_simpanan_wajib
        elif "sukarela" in jenis_lower or "tabungan" in jenis_lower:
            return settings.akun_simpanan_sukarela or settings.akun_simpanan_wajib
        else:
            return settings.akun_simpanan_wajib


@frappe.whitelist()		
def getSaldo(rekening_tabungan):
	datas = frappe.db.sql(
            f"""
            select 
				SUM(CASE WHEN ts.tipe_transaksi = 'Setoran'  THEN ts.jumlah ELSE 0 END) as debit,
				SUM(CASE WHEN ts.tipe_transaksi = 'Penarikan' THEN ts.jumlah ELSE 0 END) as kredit,
				SUM( IF( ts.tipe_transaksi =  'Setoran', ts.jumlah, -ts.jumlah ) ) as saldo
				from `tabTransaksi Simpanan` ts
				WHERE ts.rekening_tabungan = "{rekening_tabungan}"
            """,as_dict=True)
	return datas[0]