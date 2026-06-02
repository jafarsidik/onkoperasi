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
	data,chart,summary = get_data(filters)
	return columns, data, None, chart, summary


def get_columns() -> list[dict]:
	"""Return columns for the report.

	One field definition per column, just like a DocType field definition.
	"""
	return [
		{"label": "Keterangan", "fieldname": "label", "fieldtype": "Data", "width": 300},
		{"label": "Jumlah", "fieldname": "jumlah", "fieldtype": "Currency", "width": 160},
	]

def get_data(filters) -> list[list]:
	"""Return data for the report.

	The report data is a list of rows, with each row being a list of cell values.
	"""
	cond = "je.docstatus = 1"
	params = {}
	if filters.get("dari_tanggal"):
		cond += " AND je.tanggal >= %(dari)s"
		params["dari"] = filters["dari_tanggal"]
	if filters.get("sampai_tanggal"):
		cond += " AND je.tanggal <= %(sampai)s"
		params["sampai"] = filters["sampai_tanggal"]

	def get_total(tipe_akun):
		rows = frappe.db.sql(f"""
			SELECT COALESCE(SUM(ji.kredit - ji.debit), 0) as total
			FROM `tabJurnal Entry Item` ji
			JOIN `tabJurnal Entry` je ON je.name = ji.parent
			JOIN `tabAkun` a ON a.name = ji.akun
			WHERE a.tipe_akun = %(tipe)s AND {cond}
		""", {**params, "tipe": tipe_akun})
		return flt(rows[0][0]) if rows else 0

	def get_by_akun(tipe_akun):
		return frappe.db.sql(f"""
			SELECT a.kode_akun, a.nama_akun,
				   COALESCE(SUM(ji.kredit - ji.debit), 0) as total
			FROM `tabJurnal Entry Item` ji
			JOIN `tabJurnal Entry` je ON je.name = ji.parent
			JOIN `tabAkun` a ON a.name = ji.akun
			WHERE a.tipe_akun = %(tipe)s AND a.is_group = 0 AND {cond}
			GROUP BY a.kode_akun, a.nama_akun
			ORDER BY a.kode_akun
		""", {**params, "tipe": tipe_akun}, as_dict=True)

	result = []

	# Pendapatan
	result.append({"label": "PENDAPATAN", "jumlah": None, "bold": 1})
	total_pendapatan = 0
	for r in get_by_akun("Pendapatan"):
		result.append({"label": f"    {r.kode_akun} - {r.nama_akun}", "jumlah": r.total})
		total_pendapatan += flt(r.total)
	result.append({"label": "Total Pendapatan", "jumlah": total_pendapatan, "bold": 1})

	result.append({"label": "", "jumlah": None})

	# Beban
	result.append({"label": "BEBAN", "jumlah": None, "bold": 1})
	total_beban = 0
	for r in get_by_akun("Beban"):
		result.append({"label": f"    {r.kode_akun} - {r.nama_akun}", "jumlah": flt(r.total) * -1})
		total_beban += flt(r.total) * -1
	result.append({"label": "Total Beban", "jumlah": total_beban, "bold": 1})

	result.append({"label": "", "jumlah": None})

	shu = (abs(total_pendapatan) - abs(total_beban))
	result.append({"label": "═══ SISA HASIL USAHA (SHU) ═══", "jumlah": shu, "bold": 1})

	#Pembagian SHU
	get_setting = frappe.get_doc("Koperasi Settings")
	
	dana_cadangan = ((get_setting.persen_cadangan * shu) / 100)
	result.append({"label": "Dana Cadangan", "jumlah": dana_cadangan, "bold": 1})

	jasa_modal = ((get_setting.persen_jasa_modal * shu) / 100)
	result.append({"label": "Jasa Modal", "jumlah": jasa_modal, "bold": 1})

	jasa_transaksi = ((get_setting.persen_jasa_transaksi * shu) / 100)
	result.append({"label": "Jasa Transaksi", "jumlah": jasa_transaksi, "bold": 1})

	dana_sosial = ((get_setting.persen_dana_sosial * shu) / 100)
	result.append({"label": "Dana Sosial", "jumlah": dana_sosial, "bold": 1})

	untuk_pengurus = ((get_setting.persen_pengurus * shu) / 100)
	result.append({"label": "Untuk Pengurus", "jumlah": untuk_pengurus, "bold": 1})

	untuk_karyawan = ((get_setting.persen_karyawan * shu) / 100)
	result.append({"label": "Untuk Karyawan", "jumlah": untuk_karyawan, "bold": 1})

	chart_data = {
		"data":{
			"labels":["Pendapatan", "Beban","SHU"],
			"datasets":[
				{
					"values":[total_pendapatan,total_beban,shu]
				}
			]
		},
		"type":"bar"
	}
	summary = [
		{
			"label": "Pendapatan",
			"value":total_pendapatan,
			"datatype":"Currency"
		},
		{
			"label": "Beban",
			"value":total_beban,
			"datatype":"Currency"
		},
		{
			"label": "SHU",
			"value":shu,
			"datatype":"Currency",
			"indicator": "Green" if shu > 0 else "Red"
		}
	]
	return result,chart_data,summary
