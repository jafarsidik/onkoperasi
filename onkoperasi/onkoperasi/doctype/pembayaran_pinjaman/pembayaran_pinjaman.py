# Copyright (c) 2022, IDMS and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import flt, date_diff, nowdate
from onkoperasi.onkoperasi.doctype.jurnal_entry.jurnal_entry import buat_jurnal


class PembayaranPinjaman(Document):

    def validate(self):
        if not self.pinjaman:
            return
        self.isi_angsuran_berikutnya()
        self.hitung_denda()
        self.hitung_nominal()
        self.hitung_sisa_pinjaman()

    def isi_angsuran_berikutnya(self):
        """
        Cari nomor angsuran berikutnya yang belum dibayar
        dengan cara menghitung berapa pembayaran yg sudah disubmit.
        """
        sudah_bayar = frappe.db.count("Pembayaran Pinjaman", {
            "pinjaman": self.pinjaman,
            "docstatus": 1  # hanya yang sudah disubmit
        })
        # Angsuran berikutnya = jumlah yg sudah bayar + 1
        ke = int(sudah_bayar) + 1

        pinjaman = frappe.get_doc("Pinjaman", self.pinjaman)
        jadwal = pinjaman.list_angsuran_pinjaman

        if not jadwal:
            frappe.throw(f"Pinjaman {self.pinjaman} belum memiliki jadwal angsuran.")

        total_angsuran = len(jadwal)
        if ke > total_angsuran:
            frappe.throw(
                f"Semua {total_angsuran} angsuran sudah lunas untuk pinjaman ini."
            )

        # Index list dimulai dari 0, angsuran ke-N ada di index N-1
        baris = jadwal[ke - 1]

        self.pembayaran_ke  = ke
        self.pokok          = flt(baris.pokok)
        self.bunga          = flt(baris.bunga)
        self.tgl_tempo      = baris.tanggal_tempo
        self.jumlah_pinjaman = flt(pinjaman.grand_total)

    def hitung_denda(self):
        """Hitung denda jika bayar melebihi tanggal jatuh tempo."""
        if not self.tgl_tempo or not self.tgl_bayar:
            return
        terlambat = date_diff(self.tgl_bayar, self.tgl_tempo)
        if terlambat > 0:
            # Ambil % denda dari Jenis Pinjaman
            persen_denda = frappe.db.get_value(
                "Pinjaman", self.pinjaman, "persen_denda"
            ) or 0
            if flt(persen_denda) > 0:
                self.denda = flt(self.pokok) * flt(persen_denda) / 100 * terlambat
            # Kalau field denda tidak diset manual, biarkan 0
        else:
            if not self.denda:   # jangan timpa kalau diisi manual
                self.denda = 0

    def hitung_nominal(self):
        self.nominal = flt(self.pokok) + flt(self.bunga) + flt(self.denda)

    def hitung_sisa_pinjaman(self):
        """Kalkulasi sisa setelah pembayaran ini."""
        total_sudah_bayar = frappe.db.sql("""
            SELECT COALESCE(SUM(pokok), 0)
            FROM `tabPembayaran Pinjaman`
            WHERE pinjaman=%s AND docstatus=1
        """, self.pinjaman)[0][0] or 0

        plafon = flt(frappe.db.get_value("Pinjaman", self.pinjaman, "plafon"))
        self.sisa_pinjaman  = plafon - flt(total_sudah_bayar) - flt(self.pokok)

        pinjaman        = frappe.get_doc("Pinjaman", self.pinjaman)
        total_angsuran  = len(pinjaman.list_angsuran_pinjaman)
        self.status_angsuran = (
            "✅ Angsuran Terakhir — Pinjaman akan Lunas"
            if self.pembayaran_ke == total_angsuran
            else f"Angsuran {self.pembayaran_ke} dari {total_angsuran}"
        )

    # ------------------------------------------------------------------
    # Submit
    # ------------------------------------------------------------------
    def on_submit(self):
        self.buat_jurnal_angsuran()
        self.cek_dan_tandai_lunas()

    def on_cancel(self):
        # Batalkan jurnal terkait
        jurnal = frappe.db.get_value("Jurnal Entry", {
            "referensi_doctype": "Pembayaran Pinjaman",
            "referensi_docname": self.name,
            "docstatus": 1
        })
        if jurnal:
            frappe.get_doc("Jurnal Entry", jurnal).cancel()

        # Kembalikan status pinjaman jika sempat ditandai lunas
        frappe.db.set_value("Pinjaman", self.pinjaman, "status_lunas", "")
        frappe.db.set_value("Pinjaman", self.pinjaman, "status", "Aktif")

    def buat_jurnal_angsuran(self):
        settings = frappe.get_single("Koperasi Settings")
        akun_kas      = settings.akun_kas
        akun_piutang  = settings.akun_piutang_pinjaman
        akun_bunga    = settings.akun_pendapatan_bunga
        akun_denda    = settings.akun_pendapatan_denda

        if not akun_kas:
            frappe.throw("Harap set Akun Kas di Koperasi Settings.")
        if not akun_piutang:
            frappe.throw("Harap set Akun Piutang Pinjaman di Koperasi Settings.")

        keterangan = (
            f"Angsuran ke-{self.pembayaran_ke} | "
            f"Pinjaman {self.pinjaman} | {self.anggota_nama or ''}"
        )

        baris = [
            # Kas masuk sebesar total bayar
            {"akun": akun_kas, "debit": flt(self.nominal), "kredit": 0,
             "keterangan": keterangan},
            # Kurangi piutang sebesar pokok
            {"akun": akun_piutang, "debit": 0, "kredit": flt(self.pokok),
             "keterangan": keterangan},
        ]

        # Kredit pendapatan bunga
        if flt(self.bunga) and akun_bunga:
            baris.append({"akun": akun_bunga, "debit": 0,
                          "kredit": flt(self.bunga), "keterangan": keterangan})
        elif flt(self.bunga):
            # fallback: masuk ke piutang (kurang ideal, tapi tidak error)
            baris[1]["kredit"] += flt(self.bunga)

        # Kredit pendapatan denda
        if flt(self.denda) > 0:
            if akun_denda:
                baris.append({"akun": akun_denda, "debit": 0,
                              "kredit": flt(self.denda), "keterangan": keterangan})
            elif akun_bunga:
                # fallback ke akun bunga kalau denda belum diset
                baris.append({"akun": akun_bunga, "debit": 0,
                              "kredit": flt(self.denda), "keterangan": keterangan})

        je_name = buat_jurnal(
            tanggal      = self.tgl_bayar or nowdate(),
            jenis        = "Kas Masuk",
            keterangan   = keterangan,
            baris        = baris,
            ref_doctype  = "Pembayaran Pinjaman",
            ref_docname  = self.name
        )
        frappe.msgprint(f"Jurnal {je_name} berhasil dibuat.", alert=True)

    def cek_dan_tandai_lunas(self):
        pinjaman       = frappe.get_doc("Pinjaman", self.pinjaman)
        total_angsuran = len(pinjaman.list_angsuran_pinjaman)

        sudah_bayar = frappe.db.count("Pembayaran Pinjaman", {
            "pinjaman": self.pinjaman,
            "docstatus": 1
        })

        if int(sudah_bayar) >= total_angsuran:
            frappe.db.set_value("Pinjaman", self.pinjaman, "status_lunas", "Lunas")
            frappe.db.set_value("Pinjaman", self.pinjaman, "status", "Lunas")
            frappe.msgprint(
                f"🎉 Pinjaman <b>{self.pinjaman}</b> telah <b>LUNAS</b>!",
                title="Pinjaman Lunas",
                indicator="green"
            )


@frappe.whitelist()		
def angsuranke(pinjaman):
	
	datas = frappe.db.sql(
            f"""
			select
				count(*) as pembayaran_ke
				from `tabPembayaran Pinjaman` a
				where pinjaman='{pinjaman}'
            """,as_dict=True)
	return datas[0].pembayaran_ke

