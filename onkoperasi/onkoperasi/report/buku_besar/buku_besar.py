# Copyright (c) 2026, IDMS and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt, getdate



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
	return [
		{"label": "Tanggal", "fieldname": "tanggal", "fieldtype": "Date", "width": 100},
		{"label": "No. Jurnal", "fieldname": "jurnal", "fieldtype": "Link", "options": "Jurnal Entry", "width": 140},
		{"label": "Keterangan", "fieldname": "keterangan", "fieldtype": "Data", "width": 250},
		{"label": "Debit", "fieldname": "debit", "fieldtype": "Currency", "width": 120},
		{"label": "Kredit", "fieldname": "kredit", "fieldtype": "Currency", "width": 120},
		{"label": "Saldo", "fieldname": "saldo", "fieldtype": "Currency", "width": 130},
	]


def get_data(filters) -> list[list]:
	"""Return data for the report.

	The report data is a list of rows, with each row being a list of cell values.
	"""
	cond = "je.docstatus = 1"
	params = {}
	if filters.get("akun"):
		cond += " AND ji.akun = %(akun)s"
		params["akun"] = filters["akun"]
	if filters.get("dari_tanggal"):
		cond += " AND je.tanggal >= %(dari)s"
		params["dari"] = filters["dari_tanggal"]
	if filters.get("sampai_tanggal"):
		cond += " AND je.tanggal <= %(sampai)s"
		params["sampai"] = filters["sampai_tanggal"]

	rows = frappe.db.sql(f"""
		SELECT je.tanggal, je.name as jurnal,
			   COALESCE(ji.keterangan, je.keterangan) as keterangan,
			   ji.debit, ji.kredit
		FROM `tabJurnal Entry Item` ji
		JOIN `tabJurnal Entry` je ON je.name = ji.parent
		WHERE {cond}
		ORDER BY je.tanggal, je.creation
	""", params, as_dict=True)

	saldo = 0
	result = []
	for r in rows:
		saldo += flt(r.debit) - flt(r.kredit)
		result.append({
			"tanggal": r.tanggal,
			"jurnal": r.jurnal,
			"keterangan": r.keterangan,
			"debit": r.debit,
			"kredit": r.kredit,
			"saldo": saldo
		})
	return result
