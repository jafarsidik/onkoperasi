# Copyright (c) 2022, IDMS and contributors
# For license information, please see license.txt
import frappe
from frappe.model.document import Document
from frappe.utils import flt, nowdate
from onkoperasi.onkoperasi.api import buat_journal_entry

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
        
        #je_name = frappe.get_doc("Journal Entry")
        je_name = buat_journal_entry(self,
            tanggal=self.tanggal_transaksi,

        )
        frappe.msgprint(f"Jurnal Entry {je_name} berhasil dibuat.", alert=True)

   
       

