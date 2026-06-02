// Copyright (c) 2026, IDMS and contributors
// For license information, please see license.txt

frappe.query_reports["Kartu Stok"] = {
	filters: [
		// {
		// 	"fieldname": "my_filter",
		// 	"label": __("My Filter"),
		// 	"fieldtype": "Data",
		// 	"reqd": 1,
		// },
		{ fieldname: "item", label: "Item", fieldtype: "Link", options: "Barang", reqd: 1 },
        { fieldname: "dari_tanggal", label: "Dari Tanggal", fieldtype: "Date",
          default: frappe.datetime.get_today().substring(0,7) + "-01" },
        { fieldname: "sampai_tanggal", label: "Sampai Tanggal", fieldtype: "Date",
          default: frappe.datetime.get_today() }
	],
};
