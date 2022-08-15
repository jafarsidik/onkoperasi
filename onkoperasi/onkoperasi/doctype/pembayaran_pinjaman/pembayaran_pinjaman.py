# Copyright (c) 2022, IDMS and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class PembayaranPinjaman(Document):
	pass


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

