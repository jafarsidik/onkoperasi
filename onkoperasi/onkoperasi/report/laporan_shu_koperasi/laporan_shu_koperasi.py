# Copyright (c) 2026, IDMS and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt


def execute(filters: dict | None = None):
	"""Return columns and data for the report."""
	columns = get_columns()
	data, chart = get_data(filters)

	return columns, data, None, chart


def get_columns() -> list[dict]:
	"""Return columns for the report."""
	return [
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
			"label": _("Total Simpanan"),
			"fieldname": "total_simpanan",
			"fieldtype": "Currency",
			"width": 150,
		},
		{
			"label": _("Jasa Pinjaman"),
			"fieldname": "jasa_pinjaman",
			"fieldtype": "Currency",
			"width": 180,
		},
		{
			"label": _("Total Transaksi POS"),
			"fieldname": "total_pos",
			"fieldtype": "Currency",
			"width": 180,
		},
		{
			"label": _("Porsi Jasa Modal (%)"),
			"fieldname": "pct_jasa_modal",
			"fieldtype": "Percent",
			"width": 150,
		},
		{
			"label": _("Porsi Jasa Transaksi (%)"),
			"fieldname": "pct_jasa_transaksi",
			"fieldtype": "Percent",
			"width": 160,
		},
		{
			"label": _("SHU Jasa Modal"),
			"fieldname": "shu_jasa_modal",
			"fieldtype": "Currency",
			"width": 150,
		},
		{
			"label": _("SHU Jasa Transaksi"),
			"fieldname": "shu_jasa_transaksi",
			"fieldtype": "Currency",
			"width": 160,
		},
		{
			"label": _("Total SHU"),
			"fieldname": "total_shu",
			"fieldtype": "Currency",
			"width": 150,
		},
	]


# =========================================================
# MAIN REPORT
# =========================================================
def get_data(filters):

	from_date = filters.get("from_date")
	to_date   = filters.get("to_date")

	settings = frappe.get_single("Koperasi Settings")

	persen_jasa_modal     = flt(settings.persen_jasa_modal) / 100
	persen_jasa_transaksi = flt(settings.persen_jasa_transaksi) / 100


	# =====================================================
	# SHU BERSIH (FULL GL ENTRY BASED)
	# =====================================================
	shu_bersih = get_shu_bersih(from_date, to_date)

	shu_pool_modal     = shu_bersih * persen_jasa_modal
	shu_pool_transaksi = shu_bersih * persen_jasa_transaksi

	# =====================================================
	# DATA PER ANGGOTA
	# =====================================================
	simpanan_map      = get_simpanan_per_anggota(to_date)
	pos_map           = get_pos_per_anggota(from_date, to_date)
	jasa_pinjaman_map = get_jasa_pinjaman_per_anggota(from_date, to_date)

	total_simpanan_semua = sum(flt(v.get("total_simpanan", 0)) for v in simpanan_map.values())
	total_usaha_semua = (
		sum(flt(v.get("total_pos",       0)) for v in pos_map.values())
		+ sum(flt(v.get("jasa_pinjaman", 0)) for v in jasa_pinjaman_map.values())
	)

	# =====================================================
	# COMBINE KE SEMUA CUSTOMER
	# =====================================================
	all_customers = set(
		list(simpanan_map.keys())
		+ list(pos_map.keys())
		+ list(jasa_pinjaman_map.keys())
	)

	rows = []

	for cust in all_customers:
		s = simpanan_map.get(cust, {})
		p = pos_map.get(cust, {})
		j = jasa_pinjaman_map.get(cust, {})

		simpanan      = flt(s.get("total_simpanan", 0))
		total_pos     = flt(p.get("total_pos",      0))
		jasa_pinjaman = flt(j.get("jasa_pinjaman",  0))

		nama = (
			s.get("nama_anggota")
			or p.get("nama_anggota")
			or j.get("nama_anggota")
			or cust
		)

		porsi_modal     = (simpanan / total_simpanan_semua) if total_simpanan_semua else 0
		usaha           = total_pos + jasa_pinjaman
		porsi_transaksi = (usaha / total_usaha_semua) if total_usaha_semua else 0

		shu_modal     = shu_pool_modal * porsi_modal
		shu_transaksi = shu_pool_transaksi * porsi_transaksi

		rows.append({
			"customer":           cust,
			"nama_anggota":       nama,
			"total_simpanan":     simpanan,
			"total_pos":          total_pos,
			"jasa_pinjaman":      jasa_pinjaman,
			"pct_jasa_modal":     porsi_modal * 100,
			"pct_jasa_transaksi": porsi_transaksi * 100,
			"shu_jasa_modal":     shu_modal,
			"shu_jasa_transaksi": shu_transaksi,
			"total_shu":          shu_modal + shu_transaksi,
		})

	rows.sort(key=lambda x: x["total_shu"], reverse=True)

	# =====================================================
	# CHART (sebelum summary row ditambah)
	# =====================================================
	top10 = rows[:10]

	chart = {
		"type": "bar",
		"barOptions": {"stacked": True},
		"data": {
			"labels": [r["nama_anggota"] for r in top10],
			"datasets": [
				{
					"name":   "SHU Modal",
					"values": [flt(r["shu_jasa_modal"])     for r in top10],
				},
				{
					"name":   "SHU Transaksi",
					"values": [flt(r["shu_jasa_transaksi"]) for r in top10],
				},
			],
		},
	}

	# =====================================================
	# TOTAL ROW (setelah chart, sebelum return)
	# =====================================================
	rows.append({
		"customer":           "",
		"nama_anggota":       "TOTAL",
		"total_simpanan":     sum(flt(r.get("total_simpanan",     0)) for r in rows),
		"total_pos":          sum(flt(r.get("total_pos",          0)) for r in rows),
		"jasa_pinjaman":      sum(flt(r.get("jasa_pinjaman",      0)) for r in rows),
		"pct_jasa_modal":     "",
		"pct_jasa_transaksi": "",
		"shu_jasa_modal":     sum(flt(r.get("shu_jasa_modal",     0)) for r in rows),
		"shu_jasa_transaksi": sum(flt(r.get("shu_jasa_transaksi", 0)) for r in rows),
		"total_shu":          sum(flt(r.get("total_shu",          0)) for r in rows),
	})

	return rows, chart


# =========================================================
# SHU BERSIH — SEMUA INCOME - SEMUA EXPENSE (GL BASED)
# =========================================================
def get_shu_bersih(from_date, to_date):
	result = frappe.db.sql("""
		SELECT
			SUM(
				CASE
					WHEN acc.root_type = 'Income'  THEN gle.credit - gle.debit
					WHEN acc.root_type = 'Expense' THEN gle.debit  - gle.credit
					ELSE 0
				END
			) AS shu
		FROM `tabGL Entry` gle
		JOIN `tabAccount` acc ON acc.name = gle.account
		WHERE gle.is_cancelled = 0
		  AND gle.posting_date BETWEEN %s AND %s
	""", (from_date, to_date), as_dict=True)

	return flt(result[0].shu or 0) if result else 0.0


# =========================================================
# SIMPANAN — DOC BASED (hanya pokok + wajib)
# =========================================================
def get_simpanan_per_anggota(to_date):
	rows = frappe.db.sql("""
		SELECT
			ts.anggota AS customer,
			c.customer_name AS nama_anggota,
			SUM(CASE WHEN ts.tipe_transaksi = 'Setoran'   THEN ts.jumlah ELSE 0 END)
			- SUM(CASE WHEN ts.tipe_transaksi = 'Penarikan' THEN ts.jumlah ELSE 0 END)
				AS total_simpanan
		FROM `tabTransaksi Simpanan` ts
		LEFT JOIN `tabCustomer` c ON c.name = ts.anggota
		INNER JOIN `tabJenis Simpanan` js ON js.name = ts.jenis_simpanan
		WHERE ts.docstatus = 1
		  AND ts.tanggal_transaksi <= %s
		  AND (
			  js.nama_simpanan LIKE '%%pokok%%'
			  OR js.nama_simpanan LIKE '%%wajib%%'
		  )
		GROUP BY ts.anggota
		HAVING total_simpanan > 0
	""", (to_date,), as_dict=True)

	return {
		r["customer"]: {
			"total_simpanan": flt(r["total_simpanan"]),
			"nama_anggota":   r["nama_anggota"],
		}
		for r in rows if r.get("customer")
	}


# =========================================================
# POS — dari tabSales Invoice per anggota (customer)
# Asumsi: anggota koperasi adalah Customer di ERPNext,
#         Sales Invoice.customer = Customer.name anggota
# =========================================================
def get_pos_per_anggota(from_date, to_date):
	rows = frappe.db.sql("""
		SELECT
			pi.customer AS customer,
			c.customer_name AS nama_anggota,
			SUM(pi.grand_total) AS total_pos
		FROM `tabSales Invoice` pi
		LEFT JOIN `tabCustomer` c ON c.name = pi.customer
		WHERE pi.docstatus = 1
		  AND pi.posting_date BETWEEN %s AND %s
		GROUP BY pi.customer
		HAVING total_pos > 0
	""", (from_date, to_date), as_dict=True)

	return {
		r["customer"]: {
			"total_pos":    flt(r["total_pos"]),
			"nama_anggota": r["nama_anggota"],
		}
		for r in rows if r.get("customer")
	}


# =========================================================
# JASA PINJAMAN — dari Journal Entry GL Income per anggota
# Asumsi: Journal Entry punya field custom_anggota (Link ke Customer)
#         Pendapatan bunga/jasa pinjaman masuk via Journal Entry
# =========================================================
def get_jasa_pinjaman_per_anggota(from_date, to_date):
	rows = frappe.db.sql("""
		SELECT
			je.custom_anggota AS customer,
			c.customer_name AS nama_anggota,
			SUM(
				CASE
					WHEN acc.root_type = 'Income'
						THEN gle.credit - gle.debit
					ELSE 0
				END
			) AS jasa_pinjaman
		FROM `tabGL Entry` gle
		JOIN `tabJournal Entry` je  ON je.name = gle.voucher_no
		JOIN `tabAccount` acc       ON acc.name = gle.account
		LEFT JOIN `tabCustomer` c   ON c.name = je.custom_anggota
		WHERE gle.is_cancelled = 0
		  AND gle.posting_date BETWEEN %s AND %s
		  AND je.custom_anggota IS NOT NULL
		  AND je.custom_anggota != ''
		GROUP BY je.custom_anggota
		HAVING jasa_pinjaman > 0
	""", (from_date, to_date), as_dict=True)

	return {
		r["customer"]: {
			"jasa_pinjaman": flt(r["jasa_pinjaman"]),
			"nama_anggota":  r["nama_anggota"],
		}
		for r in rows if r.get("customer")
	}