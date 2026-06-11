import frappe
from frappe.model.document import Document
from frappe.utils import flt, nowdate

# TARGET — pakai Journal Entry ERPNext
def buat_journal_entry(self, tanggal):
    settings = frappe.get_single("Koperasi Settings")
    akun_kas = settings.akun_kas
    if not akun_kas:
        frappe.throw("Harap set Akun Kas di Koperasi Settings terlebih dahulu.")

    # Tentukan akun simpanan berdasarkan jenis
    akun_simpanan = get_akun_simpanan(self, settings)

    jumlah = flt(self.jumlah)
    keterangan = f"{self.tipe_transaksi} - {self.anggota} - {self.jenis_simpanan}"

    if self.tipe_transaksi == "Setoran":
        baris = [
            {"akun": akun_kas, "debit": jumlah, "kredit": 0, "keterangan": keterangan},
            {"akun": akun_simpanan, "debit": 0, "kredit": jumlah, "keterangan": keterangan,"party_type": "Customer",}
        ]
   
    else:  # Penarikan
        baris = [
            {"akun": akun_simpanan, "debit": jumlah, "kredit": 0, "keterangan": keterangan},
            {"akun": akun_kas, "debit": 0, "kredit": jumlah, "keterangan": keterangan}
        ]
   
    je = frappe.get_doc({
        "doctype": "Journal Entry",
        "voucher_type": "Journal Entry",
        "posting_date": tanggal,
        "user_remark": keterangan,
        "accounts": [
            {
                "account": b["akun"],
                "debit_in_account_currency": b["debit"],
                "credit_in_account_currency": b["kredit"],
                "user_remark": b.get("keterangan", ""),
                # Penting: link ke anggota sebagai party
                "party_type": "Customer",
                "party": b.get("anggota", ""),
            }
            for b in baris
        ],
    })
    je.flags.ignore_permissions = True
    je.insert()
    je.submit()
    return je.name

# TARGET — pakai Journal Entry ERPNext
def create_pinjaman_journal_entry(self, tanggal):
    settings = frappe.get_single("Koperasi Settings")
    
    keterangan = f"Pinjaman Anggota {self.anggota} dengan Jenis Pinjaman {self.jenis_pinjaman}"
    
    je = frappe.get_doc({
        "doctype": "Journal Entry",
        "voucher_type": "Journal Entry",
        "posting_date": tanggal,
        "user_remark": keterangan,

        # 🔥 TRACEABILITY LAYER
        "custom_anggota": self.anggota,
        "custom_source_doctype": "Pinjaman",
        "custom_source_name": self.name,

        "accounts": [
            {
                "account": settings.akun_piutang_pinjaman,
                "debit_in_account_currency": self.plafon,
                "party_type": "Customer",
                "party": self.anggota
            },
            {
                "account": settings.akun_kas,
                "credit_in_account_currency": self.grand_total
            },
            {
                "account": settings.akun_pendapatan_admin,
                "credit_in_account_currency": self.biaya_administrasi
            },
            {
                "account": settings.akun_pendapatan_provisi,
                "credit_in_account_currency": self.biaya_provisi
            },
            {
                "account": settings.akun_pendapatan_asuransi,
                "credit_in_account_currency": self.biaya_asuransi
            }
        ]
    })
    je.custom_anggota = self.anggota
    je.custom_referensi = self.name
    je.custom_tipe = "PINJAMAN"

    je.flags.ignore_permissions = True
    je.insert()
    je.submit()
    return je.name

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