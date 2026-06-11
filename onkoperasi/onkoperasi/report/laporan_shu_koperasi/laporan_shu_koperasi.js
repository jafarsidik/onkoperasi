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
        {
            fieldname: "pct_anggota",
            label: __("% SHU untuk Anggota"),
            fieldtype: "Float",
            default: 40,
            description: "Persentase SHU bersih yang dibagikan ke anggota (misal: 40)"
        },
        {
            fieldname: "pct_jasa_modal",
            label: __("% Porsi Jasa Modal"),
            fieldtype: "Float", 
            default: 30,
            description: "Dari bagian anggota, berapa % untuk jasa modal (simpanan)"
        }
	],
};
