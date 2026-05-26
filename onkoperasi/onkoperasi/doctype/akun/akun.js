frappe.ui.form.on('Akun', {
    tipe_akun(frm) {
        const debit_types = ['Aktiva', 'Beban'];
        frm.set_value('normal_balance', debit_types.includes(frm.doc.tipe_akun) ? 'Debit' : 'Kredit');
    }
});
