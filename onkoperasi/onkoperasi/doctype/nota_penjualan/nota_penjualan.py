import frappe
from frappe.model.document import Document
from frappe.utils import flt
from onkoperasi.onkoperasi.doctype.jurnal_entry.jurnal_entry import buat_jurnal


class NotaPenjualan(Document):

    def validate(self):
        self.set_nama_pelanggan()
        self.hitung_total()

    def set_nama_pelanggan(self):
        if self.anggota and not self.nama_pelanggan:
            self.nama_pelanggan = frappe.db.get_value(
                "Anggota", self.anggota, "nama_anggota"
            ) or self.anggota
        if not self.nama_pelanggan:
            self.anggota = "AGT00001"
            self.nama_pelanggan = "Walk In Customer"

    def hitung_total(self):
        subtotal = 0
        diskon_total = 0
        subtotal_harga_beli = 0
        for row in self.items:
            harga_asli = flt(row.qty) * flt(row.harga_jual)
            disc_nilai = harga_asli * (flt(row.diskon) / 100)
            row.total  = harga_asli - disc_nilai
            subtotal     += harga_asli
            diskon_total += disc_nilai

            harga_beli_asli = flt(row.qty) * flt(row.harga_beli)
            subtotal_harga_beli += harga_beli_asli 

        self.subtotal               = subtotal
        self.subtotal_harga_beli    = subtotal_harga_beli
        self.diskon_total = diskon_total
        self.total        = subtotal - diskon_total
        self.kembalian    = max(0, flt(self.jumlah_diterima) - self.total)

    # ------------------------------------------------------------------
    def on_submit(self):
        self.validasi_stok()
        self.kurangi_stok()
        self.buat_jurnal_penjualan()

    def on_cancel(self):
        self.kembalikan_stok()
        je = frappe.db.get_value("Jurnal Entry", {
            "referensi_doctype": "Nota Penjualan",
            "referensi_docname": self.name,
            "docstatus": 1
        })
        if je:
            frappe.get_doc("Jurnal Entry", je).cancel()

    def validasi_stok(self):
        for row in self.items:
            stok = flt(frappe.db.get_value("Barang", row.item, "stok_saat_ini"))
            if stok < flt(row.qty):
                frappe.throw(
                    f"Stok <b>{row.nama_item}</b> tidak cukup. "
                    f"Tersedia: <b>{stok}</b>, dibutuhkan: <b>{row.qty}</b>"
                )

    def kurangi_stok(self):
        for row in self.items:
            stok = flt(frappe.db.get_value("Barang", row.item, "stok_saat_ini"))
            frappe.db.set_value("Barang", row.item, "stok_saat_ini",
                                stok - flt(row.qty))

    def kembalikan_stok(self):
        for row in self.items:
            stok = flt(frappe.db.get_value("Barang", row.item, "stok_saat_ini"))
            frappe.db.set_value("Barang", row.item, "stok_saat_ini",
                                stok + flt(row.qty))

    def buat_jurnal_penjualan(self):
        settings = frappe.get_single("Koperasi Settings")
        akun_kas        = settings.akun_kas
        akun_pendapatan = settings.akun_pendapatan_penjualan

        if not akun_kas or not akun_pendapatan:
            frappe.msgprint(
                "Akun Kas / Akun Pendapatan Penjualan belum diset di "
                "Koperasi Settings — jurnal otomatis dilewati.",
                alert=True, indicator="orange"
            )
            return

        keterangan = f"Penjualan {self.name} — {self.nama_pelanggan}"

        buat_jurnal(
            tanggal     = str(self.tanggal)[:10],
            jenis       = "Kas Masuk",
            keterangan  = keterangan,
            baris=[
                {"akun": akun_kas,        "debit": self.total, "kredit": 0},
                {"akun": akun_pendapatan, "debit": 0, "kredit": self.total},
            ],
            ref_doctype = "Nota Penjualan",
            ref_docname = self.name
        )

        buat_jurnal(
            tanggal     = str(self.tanggal)[:10],
            jenis       = "Kas Keluar",
            keterangan  = keterangan,
            baris=[
                {"akun": "5-6000","debit": self.subtotal_harga_beli, "kredit":0 },
                {"akun": "1-1500","debit": 0, "kredit": self.subtotal_harga_beli},
            ],
            ref_doctype = "Nota Penjualan",
            ref_docname = self.name
        )


# -----------------------------------------------------------------------
# Whitelist API — dipanggil dari halaman POS
# -----------------------------------------------------------------------
@frappe.whitelist()
def get_item_untuk_pos(search=None, kategori=None):
    """Kembalikan daftar item aktif dengan stok > 0 untuk POS."""
    cond   = ["aktif = 1"]
    params = {}
    if search:
        cond.append("(nama_item LIKE %(search)s OR kode_barcode LIKE %(search)s OR name LIKE %(search)s)")
        params["search"] = f"%{search}%"
    if kategori:
        cond.append("kategori = %(kategori)s")
        params["kategori"] = kategori

    where = " AND ".join(cond)
    return frappe.db.sql(f"""
        SELECT name, nama_item, kode_barcode, harga_jual,
               satuan, stok_saat_ini, gambar, kategori
        FROM `tabBarang`
        WHERE {where}
        ORDER BY nama_item
        LIMIT 300
    """, params, as_dict=True)


@frappe.whitelist()
def get_detail_item(item_code):
    """Detail satu item — untuk scan barcode di POS."""
    return frappe.db.get_value(
        "Barang", item_code,
        ["name", "nama_item", "harga_jual", "satuan", "stok_saat_ini",
         "gambar", "kode_barcode", "kategori"],
        as_dict=True
    )
