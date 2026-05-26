frappe.ui.form.on('Jurnal Entry', {
    refresh(frm) {
        frm.trigger('hitung_total');
        if (frm.doc.docstatus === 1) {
            frm.add_custom_button(__('Cetak Jurnal'), () => {
                frappe.route_options = { name: frm.doc.name };
                frappe.set_route('print', 'Jurnal Entry', frm.doc.name);
            }, __('Cetak'));
        }
    }
});

frappe.ui.form.on('Jurnal Entry Item', {
    debit(frm) { hitung_total(frm); },
    kredit(frm) { hitung_total(frm); },
    items_remove(frm) { hitung_total(frm); }
});

function hitung_total(frm) {
    let total_debit = 0, total_kredit = 0;
    (frm.doc.items || []).forEach(row => {
        total_debit += flt(row.debit);
        total_kredit += flt(row.kredit);
    });
    frm.set_value('total_debit', total_debit);
    frm.set_value('total_kredit', total_kredit);
    let selisih = total_debit - total_kredit;
    frm.set_value('selisih', selisih);
    frm.set_value('is_balanced', Math.abs(selisih) < 0.01 ? 1 : 0);

    if (Math.abs(selisih) > 0.01) {
        frm.get_field('selisih').$wrapper.find('.control-value').css('color', 'red');
    } else {
        frm.get_field('selisih').$wrapper.find('.control-value').css('color', 'green');
    }
}
