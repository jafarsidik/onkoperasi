// Copyright (c) 2022, IDMS and contributors
// For license information, please see license.txt

frappe.ui.form.on('Pembayaran Pinjaman', {

    refresh(frm) {
        if (frm.doc.docstatus === 1) {
            frm.add_custom_button(__('Cetak Kwitansi'), () => {
                frappe.route_options = { name: frm.doc.name };
                window.open(
                    frappe.urllib.get_full_url(
                        `/printview?doctype=Pembayaran Pinjaman&name=${frm.doc.name}&format=Bukti Angsuran`
                    ), '_blank'
                );
            }, __('Cetak'));
        }

        // Warna status
        if (frm.doc.status_angsuran && frm.doc.status_angsuran.includes('Lunas')) {
            frm.get_field('status_angsuran')
               .$wrapper.find('.control-value')
               .css({'color': 'green', 'font-weight': '700'});
        }
    },

    pinjaman(frm) {
        if (!frm.doc.pinjaman) return;

        // Validasi pinjaman aktif
        frappe.db.get_value('Pinjaman', frm.doc.pinjaman,
            ['status', 'status_lunas', 'anggota', 'grand_total', 'plafon'],
            (r) => {
                if (!r) return;
                if (r.status_lunas === 'Lunas') {
                    frappe.msgprint({
                        title: 'Pinjaman Sudah Lunas',
                        message: `Pinjaman <b>${frm.doc.pinjaman}</b> sudah lunas.`,
                        indicator: 'orange'
                    });
                    frm.set_value('pinjaman', '');
                    return;
                }
                // Refresh untuk trigger hitung_komponen dari server
                frm.save();
            }
        );
    },

    denda(frm) {
        // Recalculate nominal jika denda diubah manual
        const nominal = flt(frm.doc.pokok) + flt(frm.doc.bunga) + flt(frm.doc.denda);
        frm.set_value('nominal', nominal);
    }
});

