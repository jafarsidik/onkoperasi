frappe.ui.form.on('Koperasi Settings', {
    refresh(frm) {
        cek_total_persen(frm);
    },
    persen_cadangan(frm) { cek_total_persen(frm); },
    persen_jasa_modal(frm) { cek_total_persen(frm); },
    persen_jasa_transaksi(frm) { cek_total_persen(frm); },
    persen_dana_sosial(frm) { cek_total_persen(frm); },
    persen_pengurus(frm) { cek_total_persen(frm); },
    persen_karyawan(frm) { cek_total_persen(frm); }
});

function cek_total_persen(frm) {
    const total = ['persen_cadangan','persen_jasa_modal','persen_jasa_transaksi',
                   'persen_dana_sosial','persen_pengurus','persen_karyawan']
        .reduce((s, f) => s + flt(frm.doc[f]), 0);
    if (Math.abs(total - 100) > 0.01) {
        frappe.show_alert({message: `Total alokasi SHU: ${total}% (harus 100%)`, indicator: 'orange'});
    }
}
