# Copyright (c) 2022, IDMS and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class Tabungan(Document):
	def after_insert(self):
		doc = frappe.new_doc('Transaksi Simpanan')
		doc.rekening_tabungan = self.name
		doc.tanggal_transaksi = self.tanggal_registrasi
		doc.jumlah = self.saldo_awal
		doc.tipe_transaksi = 'Setoran'
		doc.insert()

