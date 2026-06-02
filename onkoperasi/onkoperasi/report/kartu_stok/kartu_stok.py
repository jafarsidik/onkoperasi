# Copyright (c) 2026, IDMS and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt


def execute(filters: dict | None = None):
	"""Return columns and data for the report.

	This is the main entry point for the report. It accepts the filters as a
	dictionary and should return columns and data. It is called by the framework
	every time the report is refreshed or a filter is updated.
	"""
	columns = get_columns()
	data = get_data(filters)

	return columns, data


def get_columns() -> list[dict]:
	"""Return columns for the report.

	One field definition per column, just like a DocType field definition.
	"""
	return [
		{"label": "Tanggal", "fieldname": "tanggal", "fieldtype": "Date", "width": 100},
		{"label": "Referensi", "fieldname": "referensi", "fieldtype": "Data", "width": 160},
		{"label": "Keterangan", "fieldname": "keterangan", "fieldtype": "Data", "width": 200},
		{"label": "Masuk", "fieldname": "masuk", "fieldtype": "Float", "width": 90},
		{"label": "Keluar", "fieldname": "keluar", "fieldtype": "Float", "width": 90},
		{"label": "Saldo", "fieldname": "saldo", "fieldtype": "Float", "width": 90},
		{"label": "Harga", "fieldname": "harga", "fieldtype": "Currency", "width": 120},
		{"label": "Nilai", "fieldname": "nilai", "fieldtype": "Currency", "width": 130},
	]


def get_data(filters) -> list[list]:
	"""Return data for the report.

	The report data is a list of rows, with each row being a list of cell values.
	"""
	masuk = frappe.db.sql("""
		SELECT sm.tanggal, sm.name as referensi,
			   CONCAT('Penerimaan - ', sm.jenis_masuk) as keterangan,
			   smi.qty as masuk, 0 as keluar, smi.harga_beli as harga
		FROM `tabStock Masuk Item` smi
		JOIN `tabStock Masuk` sm ON sm.name = smi.parent
		WHERE smi.item = %(item)s AND sm.docstatus = 1
	""", {"item": filters["item"]}, as_dict=True)

	keluar = frappe.db.sql("""
		SELECT DATE(si.tanggal) as tanggal, si.name as referensi,
			   CONCAT('Penjualan - ', COALESCE(si.nama_pelanggan,'')) as keterangan,
			   0 as masuk, sii.qty as keluar, sii.harga_jual as harga
		FROM `tabNota Penjualan Item` sii
		JOIN `tabNota Penjualan` si ON si.name = sii.parent
		WHERE sii.item = %(item)s AND si.docstatus = 1
	""", {"item": filters["item"]}, as_dict=True)

	rows = sorted(masuk + keluar, key=lambda x: str(x.tanggal))
	saldo = 0
	data = []
	for r in rows:
		saldo += flt(r.masuk) - flt(r.keluar)
		data.append({
			"tanggal": r.tanggal, "referensi": r.referensi,
			"keterangan": r.keterangan, "masuk": r.masuk, "keluar": r.keluar,
			"saldo": saldo, "harga": r.harga, "nilai": saldo * flt(r.harga)
		})

	return data
