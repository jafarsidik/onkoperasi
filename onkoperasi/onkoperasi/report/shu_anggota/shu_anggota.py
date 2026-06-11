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
	data,summary = get_data(filters)

	return columns, data,None,None,summary


def get_columns() -> list[dict]:
	"""Return columns for the report.

	One field definition per column, just like a DocType field definition.
	"""
	return [
		{
			"label": _("Anggota"),
			"fieldname": "anggota",
			"fieldtype": "Link",
			"options": "Anggota",
			"width": 250
		},
		{
			"label": _("Total Transaksi"),
			"fieldname": "total_transaksi",
			"fieldtype": "Currency",
			"width": 180
		},
		{
			"label": _("Persentase"),
			"fieldname": "persentase",
			"fieldtype": "Percent",
			"width": 120
		},
		{
			"label": _("SHU Diterima"),
			"fieldname": "shu",
			"fieldtype": "Currency",
			"width": 180
		},
	]


def get_data(filters) -> list[list]:
	"""Return data for the report.

	The report data is a list of rows, with each row being a list of cell values.
	"""
	tahun = filters.get("tahun")

	get_setting = frappe.get_doc("Koperasi Settings")

	persen_karyawan = get_setting.persen_karyawan

	shu_total = get_shu_tahun(tahun)

	shu_anggota_total = shu_total * persen_karyawan / 100
	
	total_transaksi = frappe.db.sql(f"""
		SELECT
			COALESCE(SUM(je.grand_total), 0)
		FROM `tabSales Invoice` je
		WHERE docstatus=1 AND status='Paid' AND YEAR(je.posting_date) = %s
		""",tahun)[0][0]
	
	transaksi_anggota = frappe.db.sql(f"""
		SELECT
			je.customer,
			COALESCE(SUM(je.grand_total), 0) as total_transaksi
		FROM `tabSales Invoice` je
		WHERE
			docstatus=1 AND status='Paid' AND YEAR(je.posting_date) = %s
		GROUP BY
			je.customer
		""",tahun,as_dict=True)
	data = []
	for d in transaksi_anggota:
		persentase = 0
		shu = 0
		if total_transaksi:
			persentase =  (d.total_transaksi / total_transaksi)* 100
			shu =  (d.total_transaksi / total_transaksi)* shu_anggota_total
		nama = frappe.db.get_value("Customer",d.customer,"customer_name")
		nama_anggota=None
		if nama:
			nama_anggota = nama
		else:
			nama_anggota = "Umum"
		
		data.append({
			"label": "Anggota",
			"anggota": nama_anggota,
			"total_transaksi":d.total_transaksi,
			"persentase":persentase,
			"shu":shu,
			"bold": 1
		})
	
	summary = [
		{
			"label": "SHU Total",
			"value": shu_total,
			"datatype": "Currency"
		},
		{
			"label": "SHU Anggota",
			"value": shu_anggota_total,
			"datatype": "Currency"
		},
	]
	
	
	return data, summary
def get_shu_tahun(tahun):
    result = frappe.db.sql("""
        SELECT
            COALESCE(
                SUM(
                    CASE
                        WHEN acc.root_type = 'Income'
                        THEN gle.credit - gle.debit
                        ELSE 0
                    END
                ),
                0
            ) AS pendapatan,

            COALESCE(
                SUM(
                    CASE
                        WHEN acc.root_type = 'Expense'
                        THEN gle.debit - gle.credit
                        ELSE 0
                    END
                ),
                0
            ) AS beban

        FROM `tabGL Entry` gle
        INNER JOIN `tabAccount` acc
            ON acc.name = gle.account

        WHERE
            YEAR(gle.posting_date) = %s
            AND gle.is_cancelled = 0
    """, (tahun,), as_dict=True)[0]

    pendapatan = result.pendapatan or 0
    beban = result.beban or 0

    return pendapatan - beban