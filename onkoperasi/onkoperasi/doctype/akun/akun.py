import frappe
from frappe.model.document import Document

class Akun(Document):
    def validate(self):
        if self.is_group and not self.kode_akun.endswith("000"):
            frappe.msgprint("Akun Grup biasanya berakhiran 000, pastikan kode sudah benar.", alert=True)
        # Set normal balance otomatis berdasarkan tipe
        if not self.normal_balance:
            self.normal_balance = "Debit" if self.tipe_akun in ["Aktiva", "Beban"] else "Kredit"
