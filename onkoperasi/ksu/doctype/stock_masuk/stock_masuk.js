frappe.ui.form.on('Stock Masuk', {
    refresh(frm) { hitung_total(frm); }
});
frappe.ui.form.on('Stock Masuk Item', {
    qty(frm, cdt, cdn) { hitung_row(frm, cdt, cdn); },
    harga_beli(frm, cdt, cdn) { hitung_row(frm, cdt, cdn); },
    item(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.item) {
            frappe.db.get_value('Barang', row.item, ['harga_beli','satuan'], (r) => {
                if (r) {
                    frappe.model.set_value(cdt, cdn, 'harga_beli', r.harga_beli);
                    frappe.model.set_value(cdt, cdn, 'satuan', r.satuan);
                    hitung_row(frm, cdt, cdn);
                }
            });
        }
    },
    items_remove(frm) { hitung_total(frm); }
});
function hitung_row(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    frappe.model.set_value(cdt, cdn, 'total', flt(row.qty) * flt(row.harga_beli));
    hitung_total(frm);
}
function hitung_total(frm) {
    let total = (frm.doc.items || []).reduce((s, r) => s + flt(r.total), 0);
    frm.set_value('total_nilai', total);
}
