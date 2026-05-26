// Copyright (c) 2026, IDMS and contributors
// For license information, please see license.txt

frappe.ui.form.on("Barang", {
// 	refresh(frm) {

// 	},
    harga_beli(frm) { hitung_margin(frm); },
    harga_jual(frm) { hitung_margin(frm); }
});

function hitung_margin(frm) {
    const hpp = flt(frm.doc.harga_beli), jual = flt(frm.doc.harga_jual);
    if (hpp > 0) {
        frm.set_value('margin_nominal', jual - hpp);
        frm.set_value('margin_persen', ((jual - hpp) / hpp) * 100);
    }
}