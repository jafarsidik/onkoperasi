// Copyright (c) 2026, IDMS and contributors
// For license information, please see license.txt

frappe.query_reports["Neraca Saldo"] = {
	filters: [
		// {
		// 	"fieldname": "my_filter",
		// 	"label": __("My Filter"),
		// 	"fieldtype": "Data",
		// 	"reqd": 1,
		// },
		{ fieldname: "sampai_tanggal", label: "Per Tanggal", fieldtype: "Date",
          default: frappe.datetime.get_today(), reqd: 1 }
	],
};
