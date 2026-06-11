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
		{"label": _("ID Anggota"),       "fieldname": "member_id",          "fieldtype": "Link", "options": "Customer", "width": 120},
		{"label": _("Nama Anggota"),      "fieldname": "nama_anggota",        "fieldtype": "Data",    "width": 180},
		{"label": _("Total Simpanan"),    "fieldname": "total_simpanan",      "fieldtype": "Currency","width": 140},
		{"label": _("Total Pinjaman"),    "fieldname": "total_pinjaman",      "fieldtype": "Currency","width": 140},
		{"label": _("Jasa Pinjaman"),     "fieldname": "jasa_pinjaman",       "fieldtype": "Currency","width": 140},
		{"label": _("% Jasa Modal"),      "fieldname": "pct_jasa_modal",      "fieldtype": "Percent", "width": 110},
		{"label": _("% Jasa Usaha"),      "fieldname": "pct_jasa_usaha",      "fieldtype": "Percent", "width": 110},
		{"label": _("SHU Jasa Modal"),    "fieldname": "shu_jasa_modal",      "fieldtype": "Currency","width": 140},
		{"label": _("SHU Jasa Usaha"),    "fieldname": "shu_jasa_usaha",      "fieldtype": "Currency","width": 140},
		{"label": _("Total SHU Anggota"),"fieldname": "total_shu",           "fieldtype": "Currency","width": 150},
	]


def get_data(filters: dict | None = None) -> list[list]:
	"""Return data for the report.

	The report data is a list of rows, with each row being a list of cell values.
	"""
	  
	from_date = filters.get("from_date")
	to_date   = filters.get("to_date")
	
	# ── 1. Ambil pengaturan alokasi SHU dari filter ──────────────────────
	pct_anggota   = flt(filters.get("pct_anggota", 40)) / 100    # misal 40%
	pct_jasa_modal = flt(filters.get("pct_jasa_modal", 30)) / 100 # dari bagian anggota
	pct_jasa_usaha = 1 - pct_jasa_modal

	# ── 2. Hitung total SHU bersih koperasi ──────────────────────────────
	total_pendapatan = get_total_akun(
		["Pendapatan Jasa Pinjaman", "Pendapatan Unit Usaha"], 
		from_date, to_date, "credit"
	)
	total_beban = get_total_akun(
		["Beban Jasa Simpanan"], 
		from_date, to_date, "debit"
	)
	shu_bersih      = total_pendapatan - total_beban
	shu_bagian_anggota = shu_bersih * pct_anggota

	# ── 3. Data simpanan dan transaksi per anggota ────────────────────────
	simpanan_map   = get_simpanan_per_anggota(to_date)
	pinjaman_map   = get_pinjaman_per_anggota(from_date, to_date)
	total_simpanan_koperasi = sum(v["total_simpanan"] for v in simpanan_map.values())
	total_pinjaman_koperasi = sum(v["total_pinjaman"] for v in pinjaman_map.values())

	# ── 4. Gabungkan semua member ─────────────────────────────────────────
	all_members = set(list(simpanan_map.keys()) + list(pinjaman_map.keys()))
	rows = []

	for member_id in all_members:
		s = simpanan_map.get(member_id, {})
		p = pinjaman_map.get(member_id, {})

		simpanan  = flt(s.get("total_simpanan", 0))
		pinjaman  = flt(p.get("total_pinjaman", 0))
		nama      = s.get("nama_anggota") or p.get("nama_anggota", member_id)

		# Porsi jasa modal = simpanan anggota / total simpanan koperasi
		porsi_modal  = (simpanan / total_simpanan_koperasi) if total_simpanan_koperasi else 0
		# Porsi jasa usaha = pinjaman anggota / total pinjaman koperasi  
		porsi_usaha  = (pinjaman / total_pinjaman_koperasi) if total_pinjaman_koperasi else 0

		shu_modal  = shu_bagian_anggota * pct_jasa_modal * porsi_modal
		shu_usaha  = shu_bagian_anggota * pct_jasa_usaha * porsi_usaha
		total_shu  = shu_modal + shu_usaha

		rows.append({
			"member_id":     member_id,
			"nama_anggota":  nama,
			"total_simpanan": simpanan,
			"total_pinjaman": pinjaman,
			"jasa_pinjaman": flt(p.get("jasa_pinjaman", 0)),
			"pct_jasa_modal": porsi_modal * 100,
			"pct_jasa_usaha": porsi_usaha * 100,
			"shu_jasa_modal": shu_modal,
			"shu_jasa_usaha": shu_usaha,
			"total_shu":     total_shu,
		})

	# Urutkan dari SHU terbesar
	rows.sort(key=lambda x: x["total_shu"], reverse=True)
	
	# Tambah baris total
	rows.append({
		"member_id":     "",
		"nama_anggota":  "TOTAL",
		"total_simpanan": sum(r["total_simpanan"] for r in rows),
		"total_pinjaman": sum(r["total_pinjaman"] for r in rows),
		"shu_jasa_modal": sum(r["shu_jasa_modal"] for r in rows),
		"shu_jasa_usaha": sum(r["shu_jasa_usaha"] for r in rows),
		"total_shu":     sum(r["total_shu"] for r in rows),
	})
	
	return rows


# ── Helper functions ──────────────────────────────────────────────────────────

def get_total_akun(account_names, from_date, to_date, side):
	placeholders = ", ".join(["%s"] * len(account_names))
	result = frappe.db.sql(f"""
		SELECT COALESCE(SUM({side}), 0) AS total
		FROM `tabGL Entry`
		WHERE account IN (
			SELECT name FROM `tabAccount` WHERE account_name IN ({placeholders})
		)
		AND posting_date BETWEEN %s AND %s
		AND docstatus = 1 AND is_cancelled = 0
	""", account_names + [from_date, to_date], as_dict=True)
	return flt(result[0]["total"]) if result else 0

def get_simpanan_per_anggota(to_date):
	rows = frappe.db.sql("""
		SELECT 
			gle.party AS member_id,
			c.customer_name AS nama_anggota,
			SUM(gle.credit - gle.debit) AS total_simpanan
		FROM `tabGL Entry` gle
		LEFT JOIN `tabCustomer` c ON c.name = gle.party
		WHERE gle.account IN (
			SELECT name FROM `tabAccount` 
			WHERE account_name IN ('Simpanan Pokok Anggota','Simpanan Wajib Anggota')
		)
		AND gle.party_type = 'Customer'
		AND gle.posting_date <= %s
		AND gle.docstatus = 1 AND gle.is_cancelled = 0
		GROUP BY gle.party
		HAVING total_simpanan > 0
	""", [to_date], as_dict=True)
	return {r["member_id"]: r for r in rows}

def get_pinjaman_per_anggota(from_date, to_date):
	rows = frappe.db.sql("""
		SELECT 
			pe.party AS member_id,
			c.customer_name AS nama_anggota,
			SUM(pe.paid_amount) AS total_pinjaman,
			SUM(CASE WHEN pe.remarks LIKE '%jasa%' OR pe.remarks LIKE '%bunga%' 
				THEN pe.paid_amount ELSE 0 END) AS jasa_pinjaman
		FROM `tabPayment Entry` pe
		LEFT JOIN `tabCustomer` c ON c.name = pe.party
		WHERE pe.party_type = 'Customer'
		AND pe.payment_type = 'Receive'
		AND pe.posting_date BETWEEN %s AND %s
		AND pe.docstatus = 1
		GROUP BY pe.party
	""", [from_date, to_date], as_dict=True)
	return {r["member_id"]: r for r in rows}
