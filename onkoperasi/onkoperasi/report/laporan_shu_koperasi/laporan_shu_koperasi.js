// Copyright (c) 2026, IDMS and contributors
// For license information, please see license.txt

frappe.query_reports["Laporan SHU Koperasi"] = {
	filters: [
		{
            fieldname: "from_date",
            label: __("Dari Tanggal"),
            fieldtype: "Date",
            default: frappe.datetime.year_start(),
            reqd: 1
        },
        {
            fieldname: "to_date", 
            label: __("Sampai Tanggal"),
            fieldtype: "Date",
            default: frappe.datetime.year_end(),
            reqd: 1
        },
        
	],
};
