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
		{"label": "Kode Item", "fieldname": "name", "fieldtype": "Link", "options": "Barang", "width": 130},
		{"label": "Nama Item", "fieldname": "nama_item", "fieldtype": "Data", "width": 200},
		{"label": "Kategori", "fieldname": "kategori", "fieldtype": "Link", "options": "Kategori Barang", "width": 120},
		{"label": "Satuan", "fieldname": "satuan", "fieldtype": "Data", "width": 70},
		{"label": "Stok Saat Ini", "fieldname": "stok_saat_ini", "fieldtype": "Float", "width": 110},
		{"label": "Stok Minimum", "fieldname": "stok_minimum", "fieldtype": "Float", "width": 110},
		{"label": "Harga Beli", "fieldname": "harga_beli", "fieldtype": "Currency", "width": 120},
		{"label": "Harga Jual", "fieldname": "harga_jual", "fieldtype": "Currency", "width": 120},
		{"label": "Nilai Stok", "fieldname": "nilai_stok", "fieldtype": "Currency", "width": 130},
		{"label": "Status", "fieldname": "status_stok", "fieldtype": "Data", "width": 100},
	]


def get_data(filters) -> list[list]:
	"""Return data for the report.

	The report data is a list of rows, with each row being a list of cell values.
	"""
	cond = "aktif = 1"
	params = {}
	if filters.get("kategori"):
		cond += " AND kategori = %(kategori)s"
		params["kategori"] = filters["kategori"]

	items = frappe.db.sql(f"""
		SELECT name, nama_item, kategori, satuan,
			   stok_saat_ini, stok_minimum, harga_beli, harga_jual
		FROM `tabBarang`
		WHERE {cond}
		ORDER BY nama_item
	""", params, as_dict=True)

	data = []
	for item in items:
		stok = flt(item.stok_saat_ini)
		min_stok = flt(item.stok_minimum)
		nilai = stok * flt(item.harga_beli)
		if filters.get("stok_menipis") and stok > min_stok:
			continue
		status = "⚠️ Habis" if stok <= 0 else ("🔴 Menipis" if stok <= min_stok else "✅ Aman")
		data.append({**item, "nilai_stok": nilai, "status_stok": status})
	return data
