# onkoperasi/setup.py
import frappe

# Daftar report ERPNext yang ingin diberi role custom
REPORT_ROLES = {
    "Laporan Saldo Simpanan": ["Ketua", "Bendahara"],
    "Laporan SHU Koperasi": ["Ketua", "Bendahara"],
    "SHU Anggota": ["Ketua", "Bendahara"],
    "General Ledger": ["Ketua", "Bendahara"],
    "Customer Ledger Summary": ["Ketua", "Bendahara"],
    "Supplier Ledger Summary": ["Ketua", "Bendahara"],
    "Gross Profit": ["Ketua", "Bendahara"],
    "Profitability Analysis": ["Ketua", "Bendahara"],
    "Sales Invoice Trends": ["Ketua", "Bendahara"],
    "Purchase Invoice Trends": ["Ketua", "Bendahara"],
    "Balance Sheet": ["Ketua", "Bendahara"],
    "Profit and Loss Statement": ["Ketua", "Bendahara"],
    "Trial Balance": ["Ketua", "Bendahara"],
    "Accounts Payable": ["Bendahara"],
    "Accounts Receivable": ["Bendahara"],
}
DASHBOARD_ROLES = {
    # dashboard bawaan ERPNext yang ingin diberi akses
    "Simpan Pinjam": ["Ketua", "Bendahara"],
}
CHART_ROLES = {
    # chart bawaan ERPNext yang ingin diberi akses 
    "Jumlah Anggota": ["Ketua", "Bendahara"],
    "Total Penjualan": ["Ketua", "Bendahara"],
    "Jumlah Anggota Tidak Aktif": ["Ketua", "Bendahara"],
    "Jumlah Anggota Aktif": ["Ketua", "Bendahara"],
    "Jumlah Anggota": ["Ketua", "Bendahara"],
}
def setup_report_roles():
    _set_roles("Report", "roles", REPORT_ROLES)
    
def setup_dashboard_roles():
    _set_roles("Dashboard", "roles", DASHBOARD_ROLES)

def setup_dashboard_chart_roles():
    _set_roles("Dashboard Chart", "roles", CHART_ROLES)

def _set_roles(parenttype, parentfield, role_map):
    """Helper generik untuk insert Has Role tanpa trigger save()"""
    for parent_name, roles in role_map.items():
        if not frappe.db.exists(parenttype, parent_name):
            continue

        existing_roles = frappe.db.get_all(
            "Has Role",
            filters={
                "parenttype": parenttype,
                "parent": parent_name
            },
            pluck="role"
        )

        for role in roles:
            if role not in existing_roles:
                frappe.get_doc({
                    "doctype": "Has Role",
                    "parenttype": parenttype,
                    "parentfield": parentfield,
                    "parent": parent_name,
                    "role": role,
                }).insert(ignore_permissions=True)

    frappe.db.commit()