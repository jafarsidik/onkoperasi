frappe.pages['pos-onkoperasi'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'POS-OnKoperasi',
		single_column: true
	});
	new POSKoperasi(page, wrapper);
}

class POSKoperasi {
    constructor(page, wrapper) {
        this.page = page;
        this.wrapper = wrapper;
        this.cart = [];
        this.session = null;
        this.items_cache = [];
        this.render();
        this.load_items();
        this.check_or_open_session();
    }

    render() {
        $(this.wrapper).find('.page-content').html(`
        <div id="pos-app" style="font-family: 'Inter', sans-serif;">
            <div id="pos-session-bar" style="
                background:#1a1a2e; color:#eee; padding:8px 16px;
                display:flex; justify-content:space-between; align-items:center;
                border-radius:6px; margin-bottom:12px; font-size:13px;">
                <span>🖥️ Sesi: <strong id="session-name">-</strong></span>
                <span>Kasir: <strong id="kasir-name">${frappe.session.user_fullname||frappe.session.user}</strong></span>
                <button onclick="window.posApp.tutup_sesi()" 
                    style="background:#e74c3c;border:none;color:#fff;padding:4px 12px;
                    border-radius:4px;cursor:pointer;font-size:12px;">Tutup Sesi</button>
            </div>

            <div style="display:flex; gap:12px; height:calc(100vh - 160px);">
                <!-- Kiri: Katalog Produk -->
                <div style="flex:1.4; display:flex; flex-direction:column; gap:10px;">
                    <div style="display:flex; gap:8px;">
                        <input id="pos-search" type="text" placeholder="🔍 Cari nama / barcode..."
                            style="flex:1; padding:10px 14px; border:1px solid #ddd; border-radius:8px;
                            font-size:14px; outline:none;"
                            oninput="window.posApp.filter_items(this.value)">
                        <select id="pos-kategori" onchange="window.posApp.filter_items(document.getElementById('pos-search').value)"
                            style="padding:10px; border:1px solid #ddd; border-radius:8px; font-size:13px;">
                            <option value="">Semua Kategori</option>
                        </select>
                    </div>
                    <div id="item-grid" style="
                        display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr));
                        gap:10px; overflow-y:auto; padding-right:4px;">
                    </div>
                </div>

                <!-- Kanan: Keranjang -->
                <div style="width:360px; display:flex; flex-direction:column;
                    background:#fff; border:1px solid #eee; border-radius:12px; overflow:hidden;
                    box-shadow:0 2px 12px rgba(0,0,0,0.07);">

                    <div style="background:#1a1a2e; color:#fff; padding:14px 16px; font-weight:600;">
                        🛒 Keranjang Belanja
                    </div>

                    <div style="padding:10px 12px; border-bottom:1px solid #eee;">
                        <input id="pos-anggota" type="text" placeholder="Anggota (opsional)"
                            style="width:100%; padding:8px 10px; border:1px solid #ddd; 
                            border-radius:6px; font-size:13px; box-sizing:border-box;">
                    </div>

                    <div id="cart-list" style="flex:1; overflow-y:auto; padding:8px 12px;">
                        <div id="cart-empty" style="text-align:center; color:#aaa; padding:40px 0; font-size:13px;">
                            Belum ada item
                        </div>
                    </div>

                    <div style="padding:12px 16px; border-top:1px solid #eee; background:#f9f9f9;">
                        <table style="width:100%; font-size:13px; border-collapse:collapse;">
                            <tr>
                                <td style="padding:3px 0; color:#555;">Subtotal</td>
                                <td style="text-align:right; font-weight:500;" id="pos-subtotal">Rp 0</td>
                            </tr>
                            <tr>
                                <td style="padding:3px 0; color:#e74c3c;">Diskon</td>
                                <td style="text-align:right; color:#e74c3c;" id="pos-diskon">Rp 0</td>
                            </tr>
                            <tr style="border-top:1px solid #ddd;">
                                <td style="padding:6px 0; font-weight:700; font-size:15px;">TOTAL</td>
                                <td style="text-align:right; font-weight:700; font-size:16px; color:#1a1a2e;" id="pos-total">Rp 0</td>
                            </tr>
                        </table>

                        <div style="margin-top:10px;">
                            <label style="font-size:12px; color:#555;">Metode Bayar</label>
                            <select id="pos-metode" style="width:100%;padding:8px;border:1px solid #ddd;
                                border-radius:6px;font-size:13px;margin-top:4px;">
                                <option>Tunai</option>
                                <option>Transfer Bank</option>
                                <option>Debit/Kredit</option>
                            </select>
                        </div>
                        <div style="margin-top:8px;" id="bayar-section">
                            <label style="font-size:12px; color:#555;">Jumlah Diterima</label>
                            <input id="pos-bayar" type="number" placeholder="0"
                                style="width:100%;padding:8px 10px;border:1px solid #ddd;
                                border-radius:6px;font-size:14px;margin-top:4px;box-sizing:border-box;"
                                oninput="window.posApp.hitung_kembalian()">
                            <div style="margin-top:6px; font-size:13px;">
                                Kembalian: <strong id="pos-kembalian" style="color:green;">Rp 0</strong>
                            </div>
                        </div>

                        <button onclick="window.posApp.proses_bayar()"
                            style="width:100%; margin-top:12px; padding:13px;
                            background:#27ae60; color:#fff; border:none; border-radius:8px;
                            font-size:15px; font-weight:700; cursor:pointer; letter-spacing:0.5px;">
                            ✅ BAYAR
                        </button>
                        <button onclick="window.posApp.clear_cart()"
                            style="width:100%; margin-top:6px; padding:8px;
                            background:#fff; color:#e74c3c; border:1px solid #e74c3c;
                            border-radius:8px; font-size:13px; cursor:pointer;">
                            🗑 Kosongkan
                        </button>
                    </div>
                </div>
            </div>
        </div>`);

        window.posApp = this;
        document.getElementById('pos-metode').addEventListener('change', (e) => {
            document.getElementById('bayar-section').style.display =
                e.target.value === 'Tunai' ? 'block' : 'none';
        });
    }

    async load_items() {
        const result = await frappe.db.get_list('Barang', {
            filters: { aktif: 1 },
            fields: ['name','nama_item','harga_jual','satuan','stok_saat_ini','gambar','kategori'],
            limit: 200,
            order_by: 'nama_item asc'
        });
        this.items_cache = result;

        // Isi kategori dropdown
        const kategoris = [...new Set(result.map(i => i.kategori).filter(Boolean))];
        const sel = document.getElementById('pos-kategori');
        kategoris.forEach(k => {
            const opt = document.createElement('option');
            opt.value = k; opt.textContent = k;
            sel.appendChild(opt);
        });

        this.render_items(result);
    }

    filter_items(q) {
        const kategori = document.getElementById('pos-kategori').value;
        let filtered = this.items_cache;
        if (kategori) filtered = filtered.filter(i => i.kategori === kategori);
        if (q) {
            const ql = q.toLowerCase();
            filtered = filtered.filter(i =>
                i.nama_item.toLowerCase().includes(ql) ||
                (i.name || '').toLowerCase().includes(ql)
            );
        }
        this.render_items(filtered);
    }

    render_items(items) {
        const grid = document.getElementById('item-grid');
        if (!items.length) {
            grid.innerHTML = `<div style="color:#aaa;padding:20px;grid-column:1/-1;">Tidak ada produk</div>`;
            return;
        }
        grid.innerHTML = items.map(item => `
            <div onclick="window.posApp.add_to_cart('${item.name}','${item.nama_item}',${item.harga_jual},'${item.satuan||'pcs'}',${item.stok_saat_ini||0})"
                style="background:#fff; border:1px solid #e8e8e8; border-radius:10px;
                padding:12px 10px; cursor:pointer; transition:all .15s; text-align:center;
                ${item.stok_saat_ini <= 0 ? 'opacity:0.5;pointer-events:none;' : ''}"
                onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.12)';this.style.borderColor='#1a1a2e'"
                onmouseout="this.style.boxShadow='none';this.style.borderColor='#e8e8e8'">
                <div style="font-size:28px; margin-bottom:4px;">
                    ${item.gambar ? `<img src="${item.gambar}" style="width:50px;height:50px;object-fit:cover;border-radius:6px;">` : '📦'}
                </div>
                <div style="font-size:12px; font-weight:600; color:#333; margin-bottom:2px;
                    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.nama_item}</div>
                <div style="font-size:11px; color:#27ae60; font-weight:700;">
                    ${frappe.format(item.harga_jual, {fieldtype:'Currency'})}</div>
                <div style="font-size:10px; color:${item.stok_saat_ini <= 0 ? '#e74c3c' : '#888'};">
                    Stok: ${item.stok_saat_ini||0} ${item.satuan||'pcs'}</div>
            </div>
        `).join('');
    }

    add_to_cart(kode, nama, harga, satuan, stok) {
        if (stok <= 0) { frappe.show_alert({message:'Stok habis!', indicator:'red'}); return; }
        const existing = this.cart.find(c => c.kode === kode);
        if (existing) {
            if (existing.qty >= stok) { frappe.show_alert({message:'Melebihi stok tersedia', indicator:'orange'}); return; }
            existing.qty += 1;
        } else {
            this.cart.push({ kode, nama, harga, satuan, stok, qty: 1, diskon: 0 });
        }
        this.render_cart();
    }

    remove_from_cart(kode) {
        this.cart = this.cart.filter(c => c.kode !== kode);
        this.render_cart();
    }

    update_qty(kode, delta) {
        const item = this.cart.find(c => c.kode === kode);
        if (!item) return;
        item.qty = Math.max(1, Math.min(item.stok, item.qty + delta));
        this.render_cart();
    }

    render_cart() {
        const list = document.getElementById('cart-list');
        document.getElementById('cart-empty').style.display = this.cart.length ? 'none' : 'block';
        const rows = this.cart.map(item => {
            const total = item.qty * item.harga * (1 - item.diskon/100);
            return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;
                        border-bottom:1px solid #f0f0f0;font-size:12px;">
                <div style="flex:1;">
                    <div style="font-weight:600;color:#333;">${item.nama}</div>
                    <div style="color:#888;">${frappe.format(item.harga,{fieldtype:'Currency'})} x</div>
                </div>
                <div style="display:flex;align-items:center;gap:4px;">
                    <button onclick="window.posApp.update_qty('${item.kode}',-1)"
                        style="width:22px;height:22px;border:1px solid #ddd;background:#f8f8f8;
                        border-radius:4px;cursor:pointer;font-size:14px;line-height:1;">−</button>
                    <span style="min-width:24px;text-align:center;font-weight:700;">${item.qty}</span>
                    <button onclick="window.posApp.update_qty('${item.kode}',1)"
                        style="width:22px;height:22px;border:1px solid #ddd;background:#f8f8f8;
                        border-radius:4px;cursor:pointer;font-size:14px;line-height:1;">+</button>
                </div>
                <div style="min-width:70px;text-align:right;font-weight:600;color:#1a1a2e;">
                    ${frappe.format(total,{fieldtype:'Currency'})}</div>
                <button onclick="window.posApp.remove_from_cart('${item.kode}')"
                    style="border:none;background:none;color:#e74c3c;cursor:pointer;font-size:16px;">×</button>
            </div>`;
        }).join('');
        list.innerHTML = `<div id="cart-empty" style="display:${this.cart.length?'none':'block'};text-align:center;color:#aaa;padding:40px 0;font-size:13px;">Belum ada item</div>${rows}`;
        this.update_totals();
    }

    update_totals() {
        let subtotal = 0, diskon = 0;
        this.cart.forEach(i => {
            subtotal += i.qty * i.harga;
            diskon += i.qty * i.harga * (i.diskon / 100);
        });
        const total = subtotal - diskon;
        document.getElementById('pos-subtotal').textContent = frappe.format(subtotal, {fieldtype:'Currency'});
        document.getElementById('pos-diskon').textContent = frappe.format(diskon, {fieldtype:'Currency'});
        document.getElementById('pos-total').textContent = frappe.format(total, {fieldtype:'Currency'});
        this.hitung_kembalian();
    }

    hitung_kembalian() {
        const total = this.cart.reduce((s,i) => s + i.qty*i.harga*(1-i.diskon/100), 0);
        const bayar = parseFloat(document.getElementById('pos-bayar').value) || 0;
        const kembalian = Math.max(0, bayar - total);
        document.getElementById('pos-kembalian').textContent = frappe.format(kembalian, {fieldtype:'Currency'});
        document.getElementById('pos-kembalian').style.color = bayar < total ? '#e74c3c' : '#27ae60';
    }

    clear_cart() {
        this.cart = [];
        this.render_cart();
        document.getElementById('pos-bayar').value = '';
    }

    async check_or_open_session() {
        const existing = await frappe.db.get_list('POS Session', {
            filters: { kasir: frappe.session.user, status: 'Buka' },
            limit: 1
        });
        if (existing.length) {
            this.session = existing[0].name;
            document.getElementById('session-name').textContent = this.session;
        } else {
            this.buka_sesi_dialog();
        }
    }

    buka_sesi_dialog() {
        const d = new frappe.ui.Dialog({
            title: 'Buka Sesi Kasir',
            fields: [
                { label: 'Saldo Awal Kas (Rp)', fieldname: 'saldo_awal', fieldtype: 'Currency', reqd: 1 }
            ],
            primary_action_label: 'Mulai',
            primary_action: async (values) => {
                const session = frappe.model.get_new_doc('POS Session');
                session.kasir = frappe.session.user;
                session.saldo_awal_kas = values.saldo_awal;
                session.status = 'Buka';
                const doc = await frappe.db.insert(session);
                this.session = doc.name;
                document.getElementById('session-name').textContent = doc.name;
                frappe.show_alert({ message: `Sesi ${doc.name} dibuka`, indicator: 'green' });
                d.hide();
            }
        });
        d.show();
        // Prevent closing without opening
        d.$wrapper.find('.btn-modal-close').hide();
    }

    tutup_sesi() {
        if (!this.session) return;
        frappe.confirm('Tutup sesi kasir sekarang?', async () => {
            await frappe.db.set_value('POS Session', this.session, 'status', 'Tutup');
            frappe.show_alert({ message: 'Sesi ditutup', indicator: 'blue' });
            this.session = null;
            document.getElementById('session-name').textContent = '-';
            this.buka_sesi_dialog();
        });
    }

    async proses_bayar() {
        if (!this.cart.length) {
            frappe.show_alert({ message: 'Keranjang kosong!', indicator: 'orange' });
            return;
        }
        if (!this.session) {
            frappe.show_alert({ message: 'Tidak ada sesi aktif', indicator: 'red' });
            return;
        }
        const metode = document.getElementById('pos-metode').value;
        const total = this.cart.reduce((s,i) => s + i.qty*i.harga*(1-i.diskon/100), 0);
        const bayar = metode === 'Tunai' ? parseFloat(document.getElementById('pos-bayar').value)||0 : total;
        if (metode === 'Tunai' && bayar < total) {
            frappe.show_alert({ message: 'Jumlah diterima kurang!', indicator: 'red' });
            return;
        }

        const anggota_input = document.getElementById('pos-anggota').value.trim();
        const invoice = {
            doctype: 'Nota Penjualan',
            tanggal: frappe.datetime.now_datetime(),
            pos_session: this.session,
            nama_pelanggan: anggota_input || 'Umum',
            metode_bayar: metode,
            jumlah_diterima: bayar,
            items: this.cart.map(i => ({
                item: i.kode,
                nama_item: i.nama,
                qty: i.qty,
                harga_jual: i.harga,
                diskon: i.diskon,
                total: i.qty * i.harga * (1 - i.diskon/100)
            }))
        };

        try {
            frappe.show_progress('Memproses...', 50, 100);
            const doc = await frappe.db.insert(invoice);
            await frappe.call({ method: 'frappe.client.submit', args: { doc: { doctype: 'Nota Penjualan', name: doc.name } } });
            frappe.hide_progress();
            this.show_struk(doc.name, total, bayar, metode);
            this.clear_cart();
            frappe.show_alert({ message: `✅ Transaksi berhasil! ${doc.name}`, indicator: 'green' });
        } catch(e) {
            frappe.hide_progress();
            frappe.show_alert({ message: 'Gagal: ' + e.message, indicator: 'red' });
        }
    }

    show_struk(nota, total, bayar, metode) {
        const kembalian = Math.max(0, bayar - total);
        const rows = this.cart.map(i =>
            `<tr><td>${i.nama}</td><td style="text-align:right">${i.qty}</td>
             <td style="text-align:right">${frappe.format(i.harga,{fieldtype:'Currency'})}</td>
             <td style="text-align:right">${frappe.format(i.qty*i.harga*(1-i.diskon/100),{fieldtype:'Currency'})}</td></tr>`
        ).join('');
        const d = new frappe.ui.Dialog({
            title: `Struk — ${nota}`,
            fields: [{ fieldtype: 'HTML', options: `
                <div style="font-family:monospace;font-size:12px;text-align:center;">
                <div style="font-weight:700;font-size:14px;">KOPERASI</div>
                <div>${frappe.datetime.now_datetime()}</div>
                <div>No: ${nota}</div>
                <hr>
                <table style="width:100%;border-collapse:collapse;font-size:11px;">
                    <tr style="border-bottom:1px solid #ccc;">
                        <th style="text-align:left">Item</th><th>Qty</th><th>Harga</th><th>Total</th>
                    </tr>
                    ${rows}
                </table>
                <hr>
                <table style="width:100%;font-size:12px;">
                    <tr><td>Total</td><td style="text-align:right;font-weight:700">${frappe.format(total,{fieldtype:'Currency'})}</td></tr>
                    <tr><td>Bayar (${metode})</td><td style="text-align:right">${frappe.format(bayar,{fieldtype:'Currency'})}</td></tr>
                    <tr><td>Kembali</td><td style="text-align:right;color:green;font-weight:700">${frappe.format(kembalian,{fieldtype:'Currency'})}</td></tr>
                </table>
                <hr>
                <div style="font-size:11px;margin-top:8px;">Terima kasih atas kunjungan Anda!</div>
                </div>` }],
            primary_action_label: '🖨 Cetak',
            primary_action: () => {
                window.open(`/printview?doctype=Nota Penjualan&name=${nota}&format=Struk Penjualan`, '_blank');
                d.hide();
            },
            secondary_action_label: 'Tutup',
            secondary_action: () => d.hide()
        });
        d.show();
    }
}
