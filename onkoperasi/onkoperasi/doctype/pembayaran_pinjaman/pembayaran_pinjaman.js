// Copyright (c) 2022, IDMS and contributors
// For license information, please see license.txt

frappe.ui.form.on('Pembayaran Pinjaman', {
	// refresh: function(frm) {

	// }
	pinjaman:function(frm){
		if(frm.is_new()){
			
			frappe.call('onkoperasi.onkoperasi.doctype.pembayaran_pinjaman.pembayaran_pinjaman.angsuranke', {pinjaman: frm.doc.pinjaman}).then(res => {
				let pembayaran_ke = res.message+1;
				// frappe.call('danamas.danamas.doctype.pembayaran_angsuran.pembayaran_angsuran.tanggalcicilan', {
				// 	aplikasi: frm.doc.aplikasi_number+"|"+angsuran_ke
				// }).then(r => {
					
					//frm.set_value('tanggal_tempo', r.message.tanggal_tagihan);
					//frm.set_value('tanggal_pembayaran',frappe.datetime.nowdate());
					frm.set_value('pembayaran_ke', pembayaran_ke);
					// let time_diff_in_days = moment(frm.doc.tanggal_pembayaran).diff(frm.doc.tanggal_tempo, 'days');
					// if(time_diff_in_days > 0){
					// 	let denda = (frm.doc.angsuran*1)/100;
					// 	frm.set_value('denda', denda);
					// }
					
				//});
			});
			
		}
	}
});
