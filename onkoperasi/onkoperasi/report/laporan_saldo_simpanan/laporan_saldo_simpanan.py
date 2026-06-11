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
	columns = get_columns(filters)
	data = get_data(filters)

	return columns, data


def get_columns(filters: dict | None = None) -> list[dict]:
	"""Return columns for the report.

	One field definition per column, just like a DocType field definition.
	"""
	return [
		{
			"label": _("No. Rekening"),
			"fieldname": "name",
			"fieldtype": "Link",
			"options": "Tabungan",
			"width": 160,
		},
		{
			"label": _("Anggota"),
			"fieldname": "customer",
			"fieldtype": "Link",
			"options": "Customer",
			"width": 130,
		},
		{
			"label": _("Nama Anggota"),
			"fieldname": "nama_anggota",
			"fieldtype": "Data",
			"width": 180,
		},
		{
			"label": _("Jenis Simpanan"),
			"fieldname": "jenis_simpanan",
			"fieldtype": "Link",
			"options": "Jenis Simpanan",
			"width": 150,
		},
		{
			"label": _("Total Setoran"),
			"fieldname": "total_setoran",
			"fieldtype": "Currency",
			"width": 150,
		},
		{
			"label": _("Total Penarikan"),
			"fieldname": "total_penarikan",
			"fieldtype": "Currency",
			"width": 150,
		},
		{
			"label": _("Saldo Akhir"),
			"fieldname": "saldo_akhir",
			"fieldtype": "Currency",
			"width": 150,
		},
		{
			"label": _("Status"),
			"fieldname": "status_simpanan",
			"fieldtype": "Data",
			"width": 100,
		},
	]


def get_data(filters: dict | None = None) -> list[list]:
	"""Return data for the report.

	The report data is a list of rows, with each row being a list of cell values.
	"""
	from_date = filters.get("from_date")
	to_date   = filters.get("to_date")
	customer  = filters.get("customer")
	jenis     = filters.get("jenis_simpanan")

	# Kondisi filter opsional
	conditions = ["t.docstatus = 1"]
	values = {}

	if customer:
		conditions.append("t.nama_penabung = %(customer)s")
		values["customer"] = customer

	if jenis:
		conditions.append("t.jenis_simpanan = %(jenis_simpanan)s")
		values["jenis_simpanan"] = jenis

	where_tabungan = " AND ".join(conditions)

	# Kondisi tanggal untuk transaksi
	trx_conditions = ["ts.docstatus = 1"]
	if from_date:
		trx_conditions.append("ts.tanggal_transaksi >= %(from_date)s")
		values["from_date"] = from_date
	if to_date:
		trx_conditions.append("ts.tanggal_transaksi <= %(to_date)s")
		values["to_date"] = to_date

	where_trx = " AND ".join(trx_conditions)

	rows = frappe.db.sql(
		f"""
		SELECT
			t.name,
			t.nama_penabung AS customer,
			c.customer_name AS nama_anggota,
			t.jenis_simpanan,
			t.status_simpanan,
			COALESCE(SUM(
				CASE WHEN ts.tipe_transaksi = 'Setoran' THEN ts.jumlah ELSE 0 END
			), 0) AS total_setoran,
			COALESCE(SUM(
				CASE WHEN ts.tipe_transaksi = 'Penarikan' THEN ts.jumlah ELSE 0 END
			), 0) AS total_penarikan,
			COALESCE(SUM(
				CASE WHEN ts.tipe_transaksi = 'Setoran' THEN ts.jumlah
					 WHEN ts.tipe_transaksi = 'Penarikan' THEN -ts.jumlah
					 ELSE 0 END
			), 0) AS saldo_akhir
		FROM `tabTabungan` t
		LEFT JOIN `tabCustomer` c ON c.name = t.nama_penabung
		LEFT JOIN `tabTransaksi Simpanan` ts ON (
			ts.rekening_tabungan = t.name
			AND {where_trx}
		)
		WHERE {where_tabungan}
		GROUP BY t.name
		ORDER BY c.customer_name, t.jenis_simpanan
		""",
		values,
		as_dict=True,
	)

	# Tambah baris total
	if rows:
		rows.append({
			"name": "",
			"customer": "",
			"nama_anggota": "TOTAL",
			"jenis_simpanan": "",
			"status_simpanan": "",
			"total_setoran":  sum(flt(r["total_setoran"])  for r in rows),
			"total_penarikan": sum(flt(r["total_penarikan"]) for r in rows),
			"saldo_akhir":    sum(flt(r["saldo_akhir"])    for r in rows),
		})

	return rows