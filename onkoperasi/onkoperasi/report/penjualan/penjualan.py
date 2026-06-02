# Copyright (c) 2026, IDMS and contributors
# For license information, please see license.txt

# import frappe
from frappe import _


def execute(filters: dict | None = None):
	"""Return columns and data for the report.

	This is the main entry point for the report. It accepts the filters as a
	dictionary and should return columns and data. It is called by the framework
	every time the report is refreshed or a filter is updated.
	"""
	columns = get_columns()
	data = get_data()

	return columns, data


def get_columns() -> list[dict]:
	"""Return columns for the report.

	One field definition per column, just like a DocType field definition.
	"""
	return [
		{
			"label": _("Tanggal"),
			"fieldname": "tanggal",
			"fieldtype": "Datetime",
		},
		{
			"label": _("Nomor Nota"),
			"fieldname": "name",
			"fieldtype": "Link",
			"options" : "Nota Penjualan"
		},
		{
			"label": _("Pelanggan"),
			"fieldname": "nama_pelanggan",
			"fieldtype": "Data",
		},
		{
			"label": _("Total"),
			"fieldname": "total",
			"fieldtype": "Currency",
		},
	]


def get_data() -> list[list]:
	"""Return data for the report.

	The report data is a list of rows, with each row being a list of cell values.
	"""
	return [
		["Row 1", 1,"s",234],
		["Row 2", 2,"s",11111],
	]
