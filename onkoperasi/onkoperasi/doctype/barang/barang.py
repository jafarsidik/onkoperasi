# Copyright (c) 2026, IDMS and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import flt


class Barang(Document):
	def validate(self):
		self.hitung_margin()
		if flt(self.harga_jual) < flt(self.harga_beli):
			frappe.msgprint("Peringatan: Harga jual lebih rendah dari harga beli (HPP)!", alert=True, indicator="orange")

	def hitung_margin(self):
		if self.harga_beli and self.harga_jual:
			self.margin_nominal = flt(self.harga_jual) - flt(self.harga_beli)
			self.margin_persen = (self.margin_nominal / flt(self.harga_beli)) * 100 if self.harga_beli else 0

	def get_stok(self, gudang=None):
		filters = {"item": self.name, "docstatus": 1}
		if gudang:
			filters["gudang_tujuan"] = gudang
		masuk = frappe.db.sql("""
			SELECT COALESCE(SUM(si.qty),0)
			FROM `tabStock Masuk Item` si
			JOIN `tabStock Masuk` s ON s.name=si.parent
			WHERE si.item=%s AND s.docstatus=1
		""", self.name)[0][0] or 0
		keluar = frappe.db.sql("""
			SELECT COALESCE(SUM(si.qty),0)
			FROM `tabNota Penjualan Item` si
			JOIN `tabNota Penjualan` s ON s.name=si.parent
			WHERE si.item=%s AND s.docstatus=1
		""", self.name)[0][0] or 0
		return flt(masuk) - flt(keluar)

	def on_update(self):
		stok = self.get_stok()
		frappe.db.set_value("Item", self.name, "stok_saat_ini", stok)
