// Copyright (c) 2026, IDMS and contributors
// For license information, please see license.txt

frappe.query_reports["SHU Anggota"] = {
	filters: [
		// {
		// 	"fieldname": "my_filter",
		// 	"label": __("My Filter"),
		// 	"fieldtype": "Data",
		// 	"reqd": 1,
		// },
		{
			"fieldname": "tahun",
			"label": "Tahun",
			"fieldtype": "Int",
			"reqid": 1,
          	"default": 2026
		},
	],
};
