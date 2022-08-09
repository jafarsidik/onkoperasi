# Copyright (c) 2022, IDMS and contributors
# For license information, please see license.txt

import frappe 
from frappe.utils import add_months, add_days,flt, get_last_day, getdate, now_datetime,add_to_date

from frappe.model.document import Document

class Pinjaman(Document):
	pass
	# def validate(self):
	# 	if self.status == 'Approved':
	# 		self.make_repayment_schedule()

@frappe.whitelist()	
def simulasi_pinjaman(fieldname):
	doc = frappe.get_doc('Pinjaman',fieldname)
	print(fieldname)
	doc.list_angsuran_pinjaman = []
	payment_date = doc.tanggal_di_setujui
	plafon = doc.plafon
	if doc.tipe_pembayaran_pinjaman == 'Flat':
		i = 0
		while  i < int(self.tenor):
			
			pokok_angsuran = doc.pokok
			bunga_angsuran = doc.bunga
			angsuran = doc.angsuran
			plafon = flt(plafon - angsuran)
			if plafon < 0:
				plafon = 0.0

			if doc.tipe_angsuran == 'Bulanan':
				doc.append(
					"list_angsuran_pinjaman",
					{
						"tanggal_tempo": add_single_month(payment_date),
						"pokok": pokok_angsuran,
						"bunga": bunga_angsuran,
						"angsuran": angsuran,
						"saldo": plafon,
					},
				)
				next_payment_date = add_single_month(payment_date)
				payment_date = next_payment_date
				
			if self.tipe_angsuran == 'Mingguan':
				self.append(
					"list_angsuran_pinjaman",
					{
						"tanggal_tempo": add_single_week(payment_date),
						"pokok": pokok_angsuran,
						"bunga": bunga_angsuran,
						"angsuran": angsuran,
						"saldo": plafon,
					},
				)
				next_payment_date = add_single_week(payment_date)
				payment_date = next_payment_date
			
			if self.tipe_angsuran == 'Harian':
				self.append(
					"list_angsuran_pinjaman",
					{
						"tanggal_tempo": add_single_days(payment_date),
						"pokok": pokok_angsuran,
						"bunga": bunga_angsuran,
						"angsuran": angsuran,
						"saldo": plafon,
					},
				)
				next_date = add_single_days(payment_date)
				payment_date = next_date
			i += 1
	
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
