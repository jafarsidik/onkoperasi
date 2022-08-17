# Copyright (c) 2022, IDMS and contributors
# For license information, please see license.txt

import frappe 
from frappe.utils import add_months, add_days,flt, get_last_day, getdate, now_datetime,add_to_date

from frappe.model.document import Document

class Pinjaman(Document):
	#pass
	def validate(self):
		if self.status_realisasi == 'Already Realized':
		#if self.status == 'Approved':
			self.pembayaran_pinjaman()
	def pembayaran_pinjaman(self):
		tempo	= self.tanggal_realisasi
		plafon	= self.plafon
		tenor	= self.tenor
		sukubunga = (self.jasa_bunga /100)
		sistem_bunga = self.sistem_bunga
		satuan_jangka_waktu = self.satuan_jangka_waktu

		if sistem_bunga == 'Bunga Flat' and satuan_jangka_waktu == 'Bulanan':
			i = 0
			pokok = (plafon / tenor)
			bunga = ( (plafon * sukubunga) / tenor )
			sisa_pinjaman = plafon
			jumlah_angsuran	= (pokok + bunga)
			while  i < int(tenor):
				self.append('list_angsuran_pinjaman',{
					"tanggal_tempo": add_single_month(tempo),
					"pokok": pokok,
					"bunga": bunga,
					"angsuran": jumlah_angsuran,
					"saldo": sisa_pinjaman,
				})
				next_payment_date = add_single_month(tempo)
				tempo = next_payment_date
				sisa_pinjaman -= pokok
				i += 1
		if sistem_bunga == 'Bunga Flat' and satuan_jangka_waktu == 'Harian':
			i = 0
			pokok = (plafon / tenor)
			bunga = ( (plafon * sukubunga) / 12 / 30)
			sisa_pinjaman = plafon
			jumlah_angsuran	= (pokok + bunga)
			while  i < int(tenor):
				self.append('list_angsuran_pinjaman',{
					"tanggal_tempo": add_single_days(tempo),
					"pokok": pokok,
					"bunga": bunga,
					"angsuran": jumlah_angsuran,
					"saldo": sisa_pinjaman,
				})
				next_payment_date = add_single_days(tempo)
				tempo = next_payment_date
				sisa_pinjaman -= pokok
				i += 1


@frappe.whitelist()	
def simulasi_pinjaman(fieldname):
	doc = frappe.get_doc('Pinjaman',fieldname)
	list_angsuran_pinjaman = []
	tempo	= doc.tanggal_di_setujui
	plafon	= doc.plafon
	tenor	= doc.tenor
	sukubunga = (doc.jasa_bunga /100)
	sistem_bunga = doc.sistem_bunga
	satuan_jangka_waktu = doc.satuan_jangka_waktu

	if sistem_bunga == 'Bunga Flat' and satuan_jangka_waktu == 'Bulanan':
		i = 0
		pokok = (plafon / tenor)
		bunga = ( (plafon * sukubunga) / tenor )
		sisa_pinjaman = plafon
		jumlah_angsuran	= (pokok + bunga)
		
		for i in range(int(tenor)):
			
			
			plafon = flt(plafon - jumlah_angsuran)
			if plafon < 0:
				plafon = 0.0

			list_angsuran_pinjaman.append({
				'no':i+1,
				"tanggal_tempo": tempo,
				"pokok": pokok,
				"bunga": bunga,
				"angsuran": jumlah_angsuran,
				"saldo": sisa_pinjaman,
			})
			next_payment_date = add_single_month(tempo)
			tempo = next_payment_date
			#i += 1
		return list_angsuran_pinjaman
	
def add_single_month(date):
	if getdate(date) == get_last_day(date):
		return get_last_day(add_months(date, 1))
	else:
		return add_months(date, 1)

def add_single_week(date):
	if getdate(date) == get_last_day(date):
		return add_days(date, 7)
	else:
		return add_days(date, 7)

def add_single_days(date):
	if getdate(date) == get_last_day(date):
		return add_days(date, 1)
	else:
		return add_days(date, 1)
