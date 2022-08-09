# Copyright (c) 2022, IDMS and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class TransaksiSimpanan(Document):
	pass

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