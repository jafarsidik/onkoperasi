// Copyright (c) 2022, IDMS and contributors
// For license information, please see license.txt

frappe.ui.form.on('Tabungan', {
	refresh: function(frm) {
		if(!frm.is_new()){
			frappe.call('onkoperasi.onkoperasi.doctype.transaksi_simpanan.transaksi_simpanan.getSaldo', {rekening_tabungan: frm.doc.name}).then(r => {
				
				frm.set_value('total_simpanan', r.message.debit);
				frm.set_value('total_penarikan', r.message.kredit);
				frm.set_value('total_saldo', r.message.saldo);
			
					
			});
		}
	}
});
