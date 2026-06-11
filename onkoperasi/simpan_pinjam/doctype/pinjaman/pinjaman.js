// Copyright (c) 2022, IDMS and contributors
// For license information, please see license.txt

frappe.ui.form.on('Pinjaman', {
	
	refresh: function(frm) {
		
		// if(!frm.is_new()){
		// 	frm.toggle_reqd(['disetujui_oleh','tanggal_di_setujui','tanggal_realisasi','catatan'], frm.doc.status === 'Requested');
		// 	frm.toggle_reqd(['tanggal_realisasi'], frm.doc.status === 'Approved');

		// 	frm.toggle_display([
		// 		'disetujui_oleh',
		// 		'tanggal_di_setujui',
		// 		'catatan',
		// 		'tanggal_realisasi',
		// 		'administrasi_',
		// 		'provisi_',
		// 		'asuransi_',
		// 		'biaya_lain_lain',
		// 		'grand_total'
		// 	], frm.doc.status === 'Requested' || frm.doc.status === 'Approved');
		// 	if( parseFloat(frm.doc.grand_total) <= 0 ){
				
		// 		frm.set_value('grand_total', frm.doc.plafon);
		// 	}
		// }
		

	},
	setup: function (frm) {
		frm.set_query('Customer', function () {
			return {
				filters: {
					status: 1,
				}
			}
		});
	},
	
	jenis_pinjaman:function(frm){
		frappe.db.get_doc('Jenis Pinjaman',frm.doc.jenis_pinjaman).then(result => {
			frm.set_value('sistem_bunga', result.sistem_bunga);
			frm.set_value('jasa_bunga', result.jasa_bunga);
			frm.set_value('satuan_jangka_waktu', result.tenor);
			
		})
	},
	tenor:function(frm){
		
		let plafon	= frm.doc.plafon;
		let tenor	= frm.doc.tenor;
		let bunga	= (frm.doc.jasa_bunga / 100);
		
		//jumlah angsuran
		if(frm.doc.sistem_bunga == 'Bunga Flat' && frm.doc.satuan_jangka_waktu == 'Bulanan'){
			let pokok 			= plafon / tenor;
			let bunga_perbulan 	= ( (plafon * bunga) / 12 );
			let jumlah_angsuran =  (pokok + bunga_perbulan);
			frm.set_value('jumlah_angsuran', jumlah_angsuran);
		}
		if(frm.doc.sistem_bunga == 'Bunga Flat' && frm.doc.satuan_jangka_waktu == 'Harian'){
			let pokok 			= plafon / tenor;
			let bunga_perbulan 	= ( plafon * bunga / 12 / 30 );
			let jumlah_angsuran =  ( parseFloat(pokok) + parseFloat(bunga_perbulan));
			frm.set_value('jumlah_angsuran', jumlah_angsuran);
		}
		if(frm.doc.sistem_bunga == 'Bunga Efektif/Sliding Rate' && frm.doc.satuan_jangka_waktu == 'Bulanan'){
			let angsuran_perbulan = plafon / tenor;
			frm.set_value('jumlah_angsuran', angsuran_perbulan);
		}
		if(frm.doc.sistem_bunga == 'Bunga Efektif/Sliding Rate' && frm.doc.satuan_jangka_waktu == 'Harian'){
			let angsuran_perbulan = plafon / tenor;
			frm.set_value('jumlah_angsuran', angsuran_perbulan);
		}
	},
	plafon:function(frm){
		
		let plafon	= frm.doc.plafon;
		let tenor	= frm.doc.tenor;
		let bunga	= (frm.doc.jasa_bunga / 100);
		
		//jumlah angsuran
		if(frm.doc.sistem_bunga == 'Bunga Flat' && frm.doc.satuan_jangka_waktu == 'Bulanan'){
			let pokok 			= plafon / tenor;
			let bunga_perbulan 	= ( (plafon * bunga) / 12 );
			let jumlah_angsuran =  (pokok + bunga_perbulan);
			frm.set_value('jumlah_angsuran', jumlah_angsuran);
		}
		if(frm.doc.sistem_bunga == 'Bunga Flat' && frm.doc.satuan_jangka_waktu == 'Harian'){
			let pokok 			= plafon / tenor;
			let bunga_perbulan 	= ( plafon * bunga / 12 / 30 );
			let jumlah_angsuran =  (pokok + bunga_perbulan);
			frm.set_value('jumlah_angsuran', jumlah_angsuran);
		}
		if(frm.doc.sistem_bunga == 'Bunga Efektif/Sliding Rate' && frm.doc.satuan_jangka_waktu == 'Bulanan'){
			let angsuran_perbulan = plafon / tenor;
			frm.set_value('jumlah_angsuran', angsuran_perbulan);
		}
		if(frm.doc.sistem_bunga == 'Bunga Efektif/Sliding Rate' && frm.doc.satuan_jangka_waktu == 'Harian'){
			let angsuran_perbulan = plafon / tenor;
			frm.set_value('jumlah_angsuran', angsuran_perbulan);
		}
		hitung_pencairan(frm);
	},
	jasa_bunga:function(frm){

		let plafon	= frm.doc.plafon;
		let tenor	= frm.doc.tenor;
		let bunga	= (frm.doc.jasa_bunga / 100);
		//jumlah angsuran
		if(frm.doc.sistem_bunga == 'Bunga Flat' && frm.doc.satuan_jangka_waktu == 'Bulanan'){
			let pokok 			= plafon / tenor;
			let bunga_perbulan 	= ( (plafon * bunga) / 12 );
			let jumlah_angsuran =  (pokok + bunga_perbulan);
			frm.set_value('jumlah_angsuran', jumlah_angsuran);
		}
		if(frm.doc.sistem_bunga == 'Bunga Flat' && frm.doc.satuan_jangka_waktu == 'Harian'){
			let pokok 			= plafon / tenor;
			let bunga_perbulan 	= ( plafon * bunga / 12 / 30 );
			let jumlah_angsuran =  (pokok + bunga_perbulan);
			frm.set_value('jumlah_angsuran', jumlah_angsuran);
		}
		if(frm.doc.sistem_bunga == 'Bunga Efektif/Sliding Rate' && frm.doc.satuan_jangka_waktu == 'Bulanan'){
			let angsuran_perbulan = plafon / tenor;
			frm.set_value('jumlah_angsuran', angsuran_perbulan);
		}
		if(frm.doc.sistem_bunga == 'Bunga Efektif/Sliding Rate' && frm.doc.satuan_jangka_waktu == 'Harian'){
			let angsuran_perbulan = plafon / tenor;
			frm.set_value('jumlah_angsuran', angsuran_perbulan);
		}
	},
	biaya_lain_lain:function(frm){
		hitung_pencairan(frm);
	},
	administrasi_:function(frm){
		hitung_pencairan(frm);
	},
	provisi_:function(frm){
		hitung_pencairan(frm);
	},
	asuransi_:function(frm){
		//biaya pencairan
		hitung_pencairan(frm);
	}
	
	// simulasi_pinjaman:function(frm){
		
	// 	frappe.call('onkoperasi.onkoperasi.doctype.pinjaman.pinjaman.simulasi_pinjaman', {fieldname: frm.doc.name}).then(r => {
	// 		let res = r.message;
	// 		frm.clear_table("list_angsuran_pinjaman")
	// 		frm.refresh_fields();
	// 		console.log(res);
	// 		res.forEach((val,index,array) => {
	// 			frm.refresh_field('list_angsuran_pinjaman');
	// 			frm.add_child('list_angsuran_pinjaman', {
	// 				tanggal_tempo:val.tanggal_tempo,
	// 				pokok: val.pokok,
	// 				bunga: val.bunga,
	// 				angsuran: val.angsuran,
	// 				saldo: val.saldo
	// 			});
	// 			//frm.refresh_field('list_angsuran_pinjaman');
	// 		})
			
	// 	});

	// }
	
});
function hitung_pencairan(frm) {
	let plafon = flt(frm.doc.plafon);
	let administrasi = flt(frm.doc.administrasi_);
	let provisi = flt(frm.doc.provisi_);
	let asuransi = flt(frm.doc.asuransi_);
	let biaya_lain = flt(frm.doc.biaya_lain_lain);

	biaya_administrasi = (administrasi / 100) * plafon;
	biaya_provisi = (provisi / 100) * plafon;
	biaya_asuransi = (asuransi / 100) * plafon;		
	// total diterima anggota
	let grand_total = plafon - biaya_administrasi - biaya_provisi - biaya_asuransi - biaya_lain;

	frm.set_value("biaya_administrasi", biaya_administrasi);
	frm.set_value("biaya_provisi", biaya_provisi);
	frm.set_value("biaya_asuransi", biaya_asuransi);
	frm.set_value("grand_total", grand_total);
}