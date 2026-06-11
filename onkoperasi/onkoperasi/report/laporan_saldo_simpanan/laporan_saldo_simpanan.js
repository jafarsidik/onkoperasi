// Copyright (c) 2026, IDMS and contributors
// For license information, please see license.txt

frappe.query_reports["Laporan Saldo Simpanan"] = {
	filters: [
		{
            fieldname: "from_date",
            label: __("Dari Tanggal"),
            fieldtype: "Date",
            default: frappe.datetime.year_start(),
        },
        {
            fieldname: "to_date",
            label: __("Sampai Tanggal"),
            fieldtype: "Date",
            default: frappe.datetime.nowdate(),
        },
        {
            fieldname: "customer",
            label: __("Anggota"),
            fieldtype: "Link",
            options: "Customer",
        },
        {
            fieldname: "jenis_simpanan",
            label: __("Jenis Simpanan"),
            fieldtype: "Link",
            options: "Jenis Simpanan",
        },
    ],

    formatter: function (value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);
        if (data && data.nama_anggota === "TOTAL") {
            value = `<strong>${value}</strong>`;
        }
        // Warnai saldo minus
        if (column.fieldname === "saldo_akhir" && data && flt(data.saldo_akhir) < 0) {
            value = `<span style="color: red">${value}</span>`;
        }
        return value;
    },
};