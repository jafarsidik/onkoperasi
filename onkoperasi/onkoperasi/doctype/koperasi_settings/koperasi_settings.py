import frappe
from frappe.model.document import Document

class KoperasiSettings(Document):
    def validate(self):
        total_persen = (
            (self.persen_cadangan or 0) +
            (self.persen_jasa_modal or 0) +
            (self.persen_jasa_transaksi or 0) +
            (self.persen_dana_sosial or 0) +
            (self.persen_pengurus or 0) +
            (self.persen_karyawan or 0)
        )
        if abs(total_persen - 100) > 0.01:
            frappe.throw(f"Total persentase alokasi SHU harus 100%. Saat ini: {total_persen}%")
