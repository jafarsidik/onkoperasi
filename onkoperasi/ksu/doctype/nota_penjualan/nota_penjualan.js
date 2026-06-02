frappe.ui.form.on('Nota Penjualan', {

    refresh(frm) {
        hitung_total(frm);
        if (frm.doc.docstatus === 1) {
            frm.add_custom_button(__('Cetak Struk'), () => {
                window.open(
                    frappe.urllib.get_full_url(
                        `/printview?doctype=Nota Penjualan&name=${frm.doc.name}&format=Struk Penjualan`
                    ), '_blank'
                );
            }, __('Cetak'));
        }
    },

    anggota(frm) {
        if (frm.doc.anggota) {
            frappe.db.get_value('Anggota', frm.doc.anggota, 'nama', (r) => {
                if (r) frm.set_value('nama_pelanggan', r.nama);
            });
        }
    },

    jumlah_diterima(frm) {
        const kembalian = Math.max(0, flt(frm.doc.jumlah_diterima) - flt(frm.doc.total));
        frm.set_value('kembalian', kembalian);
        // Warna merah kalau kurang
        const el = frm.get_field('kembalian').$wrapper.find('.control-value');
        el.css('color', flt(frm.doc.jumlah_diterima) < flt(frm.doc.total) ? 'red' : 'green');
    }
});

frappe.ui.form.on('Nota Penjualan Item', {
    item(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row.item) return;
        frappe.db.get_value('Barang', row.item,
            ['nama_item','harga_jual','satuan','stok_saat_ini'], (r) => {
            if (!r) return;
            frappe.model.set_value(cdt, cdn, 'harga_jual', r.harga_jual);
            frappe.model.set_value(cdt, cdn, 'satuan',     r.satuan);
            // Peringatan stok menipis
            if (r.stok_saat_ini <= 0) {
                frappe.show_alert({message: `Stok ${r.nama_item} habis!`, indicator: 'red'});
            } else if (r.stok_saat_ini < 5) {
                frappe.show_alert({
                    message: `Stok ${r.nama_item} tinggal ${r.stok_saat_ini}`,
                    indicator: 'orange'
                });
            }
            hitung_row(frm, cdt, cdn);
        });
    },
    qty(frm, cdt, cdn)       { hitung_row(frm, cdt, cdn); },
    harga_jual(frm, cdt, cdn){ hitung_row(frm, cdt, cdn); },
    diskon(frm, cdt, cdn)    { hitung_row(frm, cdt, cdn); },
    items_remove(frm)        { hitung_total(frm); }
});

function hitung_row(frm, cdt, cdn) {
    const row   = locals[cdt][cdn];
    const total = flt(row.qty) * flt(row.harga_jual) * (1 - flt(row.diskon) / 100);
    frappe.model.set_value(cdt, cdn, 'total', total);
    hitung_total(frm);
}

function hitung_total(frm) {
    let subtotal = 0, diskon_total = 0;
    (frm.doc.items || []).forEach(r => {
        const asli = flt(r.qty) * flt(r.harga_jual);
        subtotal    += asli;
        diskon_total += asli * (flt(r.diskon) / 100);
    });
    frm.set_value('subtotal',    subtotal);
    frm.set_value('diskon_total', diskon_total);
    frm.set_value('total',        subtotal - diskon_total);
    // Trigger kembalian
    const kembalian = Math.max(0, flt(frm.doc.jumlah_diterima) - (subtotal - diskon_total));
    frm.set_value('kembalian', kembalian);
}
