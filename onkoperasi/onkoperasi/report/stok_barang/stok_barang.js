// Copyright (c) 2026, IDMS and contributors
// For license information, please see license.txt

frappe.query_reports["Stok Barang"] = {
	filters: [
		// {
		// 	"fieldname": "my_filter",
		// 	"label": __("My Filter"),
		// 	"fieldtype": "Data",
		// 	"reqd": 1,
		// },
		{ fieldname: "kategori", label: "Kategori", fieldtype: "Link", options: "Kategori Barang" },
        { fieldname: "stok_menipis", label: "Hanya Stok Menipis", fieldtype: "Check" }
	],
};
