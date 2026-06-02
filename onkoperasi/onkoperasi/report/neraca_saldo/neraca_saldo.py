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
		 {"label": "Kode Akun", "fieldname": "kode_akun", "fieldtype": "Link", "options": "Akun", "width": 120},
		{"label": "Nama Akun", "fieldname": "nama_akun", "fieldtype": "Data", "width": 220},
		{"label": "Tipe", "fieldname": "tipe_akun", "fieldtype": "Data", "width": 100},
		{"label": "Total Debit", "fieldname": "total_debit", "fieldtype": "Currency", "width": 130},
		{"label": "Total Kredit", "fieldname": "total_kredit", "fieldtype": "Currency", "width": 130},
		{"label": "Saldo Debit", "fieldname": "saldo_debit", "fieldtype": "Currency", "width": 130},
		{"label": "Saldo Kredit", "fieldname": "saldo_kredit", "fieldtype": "Currency", "width": 130},
	]


def get_data(filters) -> list[list]:
	"""Return data for the report.

	The report data is a list of rows, with each row being a list of cell values.
	"""
	cond = "je.docstatus = 1"
	params = {}
	if filters.get("sampai_tanggal"):
		cond += " AND je.tanggal <= %(sampai)s"
		params["sampai"] = filters["sampai_tanggal"]

	rows = frappe.db.sql(f"""
		SELECT a.kode_akun, a.nama_akun, a.tipe_akun, a.normal_balance,
			   COALESCE(SUM(ji.debit), 0) as total_debit,
			   COALESCE(SUM(ji.kredit), 0) as total_kredit
		FROM `tabAkun` a
		LEFT JOIN `tabJurnal Entry Item` ji ON ji.akun = a.name
		LEFT JOIN `tabJurnal Entry` je ON je.name = ji.parent AND {cond}
		WHERE a.is_group = 0
		GROUP BY a.kode_akun, a.nama_akun, a.tipe_akun, a.normal_balance
		ORDER BY a.kode_akun
	""", params, as_dict=True)

	result = []
	for r in rows:
		net = flt(r.total_debit) - flt(r.total_kredit)
		saldo_debit = net if net > 0 else 0
		saldo_kredit = abs(net) if net < 0 else 0
		result.append({
			"kode_akun": r.kode_akun,
			"nama_akun": r.nama_akun,
			"tipe_akun": r.tipe_akun,
			"total_debit": r.total_debit,
			"total_kredit": r.total_kredit,
			"saldo_debit": saldo_debit,
			"saldo_kredit": saldo_kredit
		})
	return result
