// ============================================================
// POS OnKoperasi — Frappe 16
// Fitur: Grid produk, Barcode, Keranjang, Multi Payment,
//        Hold/Recall/Split Bill, Discount, Voucher, Loyalty Point,
//        Customer Info, Print Receipt, WhatsApp Receipt,
//        Shift Kasir (Open/Close/Opname/Approval/History),
//        Refund & Return (Return/Refund/Approval/History/Alasan)
// ============================================================

frappe.pages['pos-onkoperasi'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'POS OnKoperasi',
        single_column: true,
		hide_sidebar: true,
    });
    new POSKoperasi(page, wrapper);
};

// ─────────────────────────────────────────────────────────────
// UTILITY HELPERS
// ─────────────────────────────────────────────────────────────
function fmt_rp(val) {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
}
function now_dt() { return frappe.datetime.now_datetime(); }
function gen_id() { return 'HOLD-' + Date.now(); }

// ─────────────────────────────────────────────────────────────
// MAIN CLASS
// ─────────────────────────────────────────────────────────────
class POSKoperasi {
    constructor(page, wrapper) {
        this.page = page;
        this.wrapper = wrapper;
        this.cart = [];
        this.session = null;
        this.items_cache = [];
        this.held_bills = [];          // Hold bill storage
        this.customer = null;          // Selected customer doc
        this.voucher = null;           // Active voucher
        this.voucher_discount = 0;
        this.global_discount = 0;      // % discount on whole bill
        this.loyalty_redeem = 0;       // Rp loyalty redeemed
        this.active_tab = 'pos';       // pos | shift | refund
        this.scanner_active = false;

        this.render_shell();
        this.switch_mobile_panel();
        this.bind_tab_nav();
        this.render_pos_tab();
        this.render_shift_tab();
        this.render_refund_tab();
        this.show_tab('pos');
        this.load_items();
        this.check_or_open_session();
    }

    // ── SHELL ─────────────────────────────────────────────────
    render_shell() {
        $(this.wrapper).find('.page-content').html(`
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
            #pos-shell * { box-sizing: border-box; }
            #pos-shell { font-family: 'Plus Jakarta Sans', sans-serif; background: #f0f2f7; min-height: 100vh; }

            /* ── NAV ── */
            .pos-nav {
                display:flex; gap:4px; background:#1e2235; padding:10px 16px;
                border-radius:10px; margin-bottom:12px; align-items:center;
            }
            .pos-nav-btn { padding:7px 20px; border-radius:7px; border:none; cursor:pointer; font-size:13px; font-weight:600; font-family:inherit; transition:all .18s; color:#9aa3b8; background:transparent; }
            .pos-nav-btn.active { background:#4f63d2; color:#fff; }
            .pos-nav-btn:hover:not(.active) { background:#2a2f4a; color:#fff; }
            .pos-tab { display:none; }
            .pos-tab.active { display:block; }
            .card { background:#fff; border-radius:12px; box-shadow:0 1px 6px rgba(0,0,0,.07); }
            .btn-primary { background:#4f63d2; color:#fff; border:none; border-radius:8px; padding:10px 18px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; transition:background .15s; }
            .btn-primary:hover { background:#3a4fbe; }
            .btn-danger { background:#e74c3c; color:#fff; border:none; border-radius:8px; padding:8px 14px; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; }
            .btn-ghost { background:transparent; border:1px solid #dde1ec; border-radius:8px; padding:8px 14px; font-size:12px; font-weight:600; cursor:pointer; color:#4a5568; font-family:inherit; transition:all .15s; }
            .btn-ghost:hover { background:#f0f2f7; }
            .btn-sm { padding:5px 12px; font-size:12px; }
            input[type=text], input[type=number], input[type=tel], select, textarea {
                width:100%; padding:9px 12px; border:1px solid #dde1ec; border-radius:8px;
                font-size:13px; font-family:inherit; outline:none; color:#2d3748; transition:border .15s;
            }
            input:focus, select:focus { border-color:#4f63d2; }
            label { font-size:12px; color:#6b7280; font-weight:500; display:block; margin-bottom:4px; }
            .badge { display:inline-block; padding:2px 8px; border-radius:99px; font-size:11px; font-weight:700; }
            .badge-green { background:#d1fae5; color:#065f46; }
            .badge-red { background:#fee2e2; color:#991b1b; }
            .badge-blue { background:#dbeafe; color:#1e40af; }
            .badge-yellow { background:#fef3c7; color:#92400e; }
            .section-title { font-size:14px; font-weight:700; color:#1e2235; margin-bottom:12px; display:flex; align-items:center; gap:6px; }
            table.data-table { width:100%; border-collapse:collapse; font-size:13px; }
            table.data-table th { background:#f8f9fb; padding:10px 12px; text-align:left; font-size:12px; color:#6b7280; border-bottom:1px solid #edf0f7; }
            table.data-table td { padding:10px 12px; border-bottom:1px solid #f3f4f8; color:#374151; }
            table.data-table tr:hover td { background:#fafbff; }
            .qty-ctrl { display:flex; align-items:center; gap:4px; }
            .qty-btn { width:24px; height:24px; border:1px solid #dde1ec; background:#f8f9fb; border-radius:5px; cursor:pointer; font-size:14px; line-height:1; display:flex; align-items:center; justify-content:center; font-weight:700; color:#4a5568; }
            .qty-btn:hover { background:#e8eaf2; }
            .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:9999; display:flex; align-items:center; justify-content:center; }
            .modal-box { background:#fff; border-radius:14px; padding:24px; min-width:380px; max-width:92vw; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.18); }
            .modal-title { font-size:16px; font-weight:800; color:#1e2235; margin-bottom:16px; }
            .divider { border:none; border-top:1px solid #edf0f7; margin:12px 0; }

            /* ── MOBILE SWITCHER: tersembunyi by default (PC) ── */
            #mobile-panel-switcher { display: none; }

            /* ── RESPONSIVE ── */
            @media (max-width: 768px) {
                #pos-shell { padding-bottom: 70px; }

                /* Sembunyikan top nav di mobile, ganti dengan bottom nav */
                .pos-nav {
                    position: fixed; bottom: 0; left: 0; right: 0; top: auto;
                    border-radius: 0; margin-bottom: 0; z-index: 1000;
                    padding: 6px 8px; justify-content: space-around;
                    border-top: 1px solid #2a2f4a;
                }
                .pos-nav-brand { display: none !important; }
                .pos-nav-info { display: none !important; }
                .pos-nav-btn {
                    flex: 1; padding: 5px 4px; font-size: 10px;
                    display: flex; flex-direction: column; align-items: center; gap: 2px;
                }

                /* Mobile panel switcher tampil */
                #mobile-panel-switcher {
                    display: flex !important;
                    position: sticky; top: 0; z-index: 100;
                    background: #fff; border-bottom: 2px solid #edf0f7;
                    padding: 8px 10px; gap: 6px; margin-bottom: 10px;
                    border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,.07);
                }
                .mpanel-btn {
                    flex: 1; padding: 8px 4px; border-radius: 8px;
                    border: 1px solid #dde1ec; font-size: 12px; font-weight: 700;
                    cursor: pointer; text-align: center; background: #f8f9fb;
                    color: #6b7280; font-family: inherit; transition: all .15s;
                }
                .mpanel-btn.active { background: #4f63d2; color: #fff; border-color: #4f63d2; }

                /* POS layout: stack vertikal */
                #pos-layout {
                    flex-direction: column !important;
                    height: auto !important;
                    gap: 10px;
                }
                #panel-catalog {
                    width: 100% !important;
                    flex: none !important;
                    height: auto !important;
                    max-height: 75vh;
                    overflow: hidden;
                }
                #panel-cart {
                    width: 100% !important;
                    min-height: 60vh;
                }
                #panel-payment {
                    width: 100% !important;
                }

                /* Panel switching di mobile */
                #panel-catalog.m-hidden,
                #panel-cart.m-hidden,
                #panel-payment.m-hidden { display: none !important; }

                /* Item grid mobile */
                #item-grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)) !important; }

                /* Qty button lebih besar */
                .qty-btn { width: 30px !important; height: 30px !important; font-size: 15px !important; }

                /* Shift & Refund: 1 kolom */
                .responsive-grid-2 { grid-template-columns: 1fr !important; }

                /* Tab POS tidak perlu height penuh */
                #tab-pos { height: auto !important; }
            }
        </style>

        <div id="pos-shell">
            <!-- Mobile panel switcher (hanya tampil di mobile via CSS) -->
            <div id="mobile-panel-switcher">
                <button class="mpanel-btn active" onclick="window.posApp.switch_mobile_panel('catalog')">🛍 Katalog</button>
                <button class="mpanel-btn" onclick="window.posApp.switch_mobile_panel('cart')">
                    🛒 Keranjang&nbsp;<span id="cart-badge" style="background:#e74c3c;color:#fff;border-radius:99px;padding:1px 6px;font-size:10px;">0</span>
                </button>
                <button class="mpanel-btn" onclick="window.posApp.switch_mobile_panel('payment')">💳 Bayar</button>
            </div>

            <!-- Top nav (PC) / Bottom nav (Mobile via CSS) -->
            <div class="pos-nav">
                <div class="pos-nav-brand" style="color:#fff; font-weight:800; font-size:15px; margin-right:16px; letter-spacing:.5px;">⚡ POS<span style="color:#818cf8">Koperasi</span></div>
                <button class="pos-nav-btn active" data-tab="pos">🛒 Kasir</button>
                <button class="pos-nav-btn" data-tab="shift">🔄 Shift</button>
                <button class="pos-nav-btn" data-tab="refund">↩ Refund</button>
                <div class="pos-nav-brand" style="flex:1"></div>
                <div class="pos-nav-info" style="display:flex; align-items:center; gap:12px;">
                    <span style="color:#9aa3b8; font-size:12px;">Kasir: <strong style="color:#fff">${frappe.session.user_fullname||frappe.session.user}</strong></span>
                    <span style="color:#9aa3b8; font-size:12px;">Sesi: <strong id="session-name" style="color:#818cf8">-</strong></span>
                    <button onclick="window.posApp.tutup_sesi()" class="btn-danger btn-sm">Tutup Sesi</button>
                </div>
            </div>

            <div id="tab-pos" class="pos-tab"></div>
            <div id="tab-shift" class="pos-tab"></div>
            <div id="tab-refund" class="pos-tab"></div>
        </div>`);
        window.posApp = this;
    }
    switch_mobile_panel(panel) {
        // Hanya aktif di mobile
        if (window.innerWidth > 768) return;

        const panels = {
            catalog: document.getElementById('panel-catalog'),
            cart:    document.getElementById('panel-cart'),
            payment: document.getElementById('panel-payment')
        };

        // Sembunyikan semua, tampilkan yang dipilih
        Object.entries(panels).forEach(([key, el]) => {
            if (!el) return;
            if (key === panel) {
                el.classList.remove('m-hidden');
            } else {
                el.classList.add('m-hidden');
            }
        });

        // Update tombol aktif
        document.querySelectorAll('.mpanel-btn').forEach((btn, i) => {
            btn.classList.toggle('active', ['catalog','cart','payment'][i] === panel);
        });
    }
    bind_tab_nav() {
        $(this.wrapper).find('.pos-nav-btn').on('click', (e) => {
            const tab = $(e.currentTarget).data('tab');
            this.show_tab(tab);
        });
    }

    show_tab(tab) {
        this.active_tab = tab;
        $(this.wrapper).find('.pos-nav-btn').removeClass('active');
        $(this.wrapper).find(`.pos-nav-btn[data-tab="${tab}"]`).addClass('active');
        $(this.wrapper).find('.pos-tab').removeClass('active');
        $(`#tab-${tab}`).addClass('active');

        // Tampilkan/sembunyikan mobile switcher
        const switcher = document.getElementById('mobile-panel-switcher');
        if (switcher) {
            switcher.style.display = (tab === 'pos') ? '' : 'none';
            // CSS tetap mengontrol display:none di PC
        }

        if (tab === 'shift')  this.load_shift_history();
        if (tab === 'refund') this.load_refund_history();
    }

    // ══════════════════════════════════════════════════════════
    // TAB 1 — POS KASIR
    // ══════════════════════════════════════════════════════════
    render_pos_tab() {
        $('#tab-pos').html(`
        <div id="pos-layout" style="display:flex; gap:12px; height:calc(100vh - 110px);">
        
            <!-- LEFT: Catalog -->
            <div id="panel-catalog" style="flex:1.5; display:flex; flex-direction:column; gap:10px; overflow:hidden;">
            
                <!-- Search + barcode -->
                <div style="display:flex; gap:8px;">
                    <div style="position:relative; flex:1;">
                        <input id="pos-search" type="text" placeholder="🔍 Cari nama produk atau barcode…"
                            style="width:100%; padding:10px 14px; padding-right:44px;"
                            oninput="window.posApp.filter_items(this.value)">
                        <button id="scan-btn" onclick="window.posApp.toggle_scanner()"
                            title="Toggle barcode scanner"
                            style="position:absolute;right:8px;top:50%;transform:translateY(-50%);
                            border:none;background:none;cursor:pointer;font-size:20px;opacity:.7;">📷</button>
                    </div>
                    <select id="pos-kategori" onchange="window.posApp.filter_items(document.getElementById('pos-search').value)"
                        style="width:160px;">
                        <option value="">Semua Kategori</option>
                    </select>
                </div>

                <!-- Barcode scanner area -->
                <div id="scanner-area" style="display:none; position:relative; width:100%; height:180px;
                    border-radius:10px; overflow:hidden; background:#000;">
                    <video id="scanner-video" style="width:100%;height:100%;object-fit:cover;"></video>
                    <div style="position:absolute;inset:0;border:3px solid #4f63d2;border-radius:10px;pointer-events:none;"></div>
                    <div style="position:absolute;top:50%;left:15%;right:15%;height:2px;background:#4f63d2;opacity:.7;"></div>
                    <button onclick="window.posApp.toggle_scanner()"
                        style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.5);border:none;
                        color:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px;">✕ Tutup</button>
                    <div id="scan-status" style="position:absolute;bottom:8px;left:0;right:0;text-align:center;color:#fff;font-size:12px;font-weight:600;text-shadow:0 1px 3px #000;">Arahkan kamera ke barcode</div>
                </div>

                <!-- Item grid -->
                <div id="item-grid" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr));
                    gap:10px; overflow-y:auto; flex:1; padding-right:4px; padding-bottom:8px;"></div>
            </div>
            
            <!-- RIGHT: Cart -->
             <div id="panel-cart" style="width:310px; display:flex; flex-direction:column; border-radius:12px; overflow:hidden;
                box-shadow:0 2px 14px rgba(0,0,0,.08); background:#fff;">
                  <!-- Cart list -->
                <div id="cart-list" style="flex:1; overflow-y:auto; padding:8px 12px; min-height:0;"></div>
            </div>
            <div id="panel-payment" style="width:380px; display:flex; flex-direction:column; border-radius:12px; overflow:hidden;
                box-shadow:0 2px 14px rgba(0,0,0,.08); background:#fff;">

                <!-- Customer -->
                <div style="background:#1e2235; padding:12px 14px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div id="customer-avatar" style="width:34px;height:34px;border-radius:50%;background:#4f63d2;
                            display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700;cursor:pointer;"
                            onclick="window.posApp.open_customer_modal()">👤</div>
                        <div style="flex:1; cursor:pointer;" onclick="window.posApp.open_customer_modal()">
                            <div id="customer-name" style="color:#fff;font-weight:700;font-size:13px;">Pelanggan Umum</div>
                            <div id="customer-loyalty" style="color:#818cf8;font-size:11px;">Poin Loyalitas: <span id="loyalty-pts">0</span></div>
                        </div>
                        <button onclick="window.posApp.clear_customer()"
                            style="border:none;background:rgba(255,255,255,.1);color:#fff;border-radius:6px;
                            padding:4px 8px;cursor:pointer;font-size:11px;">✕</button>
                    </div>
                </div>

              

                <!-- Totals & Actions -->
                <div style="padding:12px 14px; border-top:1px solid #f0f2f7; background:#fafbff;">
                    <!-- Discount row -->
                    <div style="display:flex; gap:6px; margin-bottom:8px;">
                        <div style="flex:1;">
                            <label>Diskon Global (%)</label>
                            <input type="number" id="global-discount" min="0" max="100" placeholder="0"
                                oninput="window.posApp.apply_global_discount(this.value)" style="font-size:12px; padding:6px 10px;">
                        </div>
                        <div style="flex:1;">
                            <label>Kode Voucher</label>
                            <div style="display:flex; gap:4px;">
                                <input type="text" id="voucher-code" placeholder="Masukkan kode" style="font-size:12px; padding:6px 10px; flex:1;">
                                <button class="btn-primary btn-sm" onclick="window.posApp.apply_voucher()">OK</button>
                            </div>
                        </div>
                    </div>

                    <!-- Loyalty redeem -->
                    <div id="loyalty-redeem-row" style="display:none; margin-bottom:8px;">
                        <div style="display:flex; align-items:center; justify-content:space-between; background:#f0f4ff; border-radius:8px; padding:8px 10px;">
                            <span style="font-size:12px; color:#4f63d2; font-weight:600;">🎁 Tukar Poin Loyalitas</span>
                            <div style="display:flex; gap:6px; align-items:center;">
                                <input type="number" id="loyalty-input" placeholder="Rp" min="0"
                                    style="width:90px; font-size:12px; padding:4px 8px;" oninput="window.posApp.update_totals()">
                                <span style="font-size:11px; color:#6b7280;">Maks: <span id="max-loyalty">0</span></span>
                            </div>
                        </div>
                    </div>

                    <!-- Total table -->
                    <table style="width:100%; font-size:13px; border-collapse:collapse; margin-bottom:10px;">
                        <tr><td style="padding:3px 0; color:#6b7280;">Subtotal</td>
                            <td style="text-align:right; font-weight:500;" id="pos-subtotal">Rp 0</td></tr>
                        <tr><td style="padding:3px 0; color:#e74c3c;">Diskon</td>
                            <td style="text-align:right; color:#e74c3c;" id="pos-diskon">Rp 0</td></tr>
                        <tr id="voucher-row" style="display:none;">
                            <td style="padding:3px 0; color:#059669;">Voucher</td>
                            <td style="text-align:right; color:#059669;" id="pos-voucher">Rp 0</td></tr>
                        <tr id="loyalty-row" style="display:none;">
                            <td style="padding:3px 0; color:#7c3aed;">Poin Loyalty</td>
                            <td style="text-align:right; color:#7c3aed;" id="pos-loyalty">Rp 0</td></tr>
                        <tr style="border-top:2px solid #edf0f7;">
                            <td style="padding:8px 0 0; font-weight:800; font-size:16px; color:#1e2235;">TOTAL</td>
                            <td style="text-align:right; font-weight:800; font-size:17px; color:#4f63d2; padding-top:8px;" id="pos-total">Rp 0</td></tr>
                    </table>

                    <!-- Payment method -->
                    <label>Metode Bayar</label>
                    <select id="pos-metode" style="margin-bottom:8px;" onchange="window.posApp.on_metode_change()">
                        <option value="Tunai">💵 Tunai</option>
                        <option value="Transfer Bank">🏦 Transfer Bank</option>
                        <option value="Debit">💳 Debit / Kredit</option>
                        <option value="QRIS">📱 QRIS</option>
                        <option value="Multi">🔀 Multi Payment</option>
                    </select>

                    <div id="tunai-section">
                        <label>Jumlah Diterima</label>
                        <input id="pos-bayar" type="number" placeholder="0" style="margin-bottom:6px;"
                            oninput="window.posApp.hitung_kembalian()">
                        
                        <!-- Shortcut nominal -->
                        <div id="nominal-shortcuts" style="display:grid; grid-template-columns:repeat(3,1fr); gap:5px; margin-bottom:8px;"></div>

                        <div style="font-size:13px; display:flex; justify-content:space-between;">
                            <span>Kembalian:</span>
                            <strong id="pos-kembalian" style="color:#059669;">Rp 0</strong>
                        </div>
                    </div>

                    <div id="multi-section" style="display:none; border:1px solid #edf0f7; border-radius:8px; padding:10px; margin-bottom:4px;">
                        <div class="section-title" style="font-size:12px; margin-bottom:8px;">💰 Split Pembayaran</div>
                        <div id="multi-splits"></div>
                        <button class="btn-ghost btn-sm" style="margin-top:6px; width:100%;" onclick="window.posApp.add_split()">+ Tambah Metode</button>
                    </div>

                    <!-- Action buttons -->
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:10px;">
                        <button onclick="window.posApp.hold_bill()"
                            style="background:#fef3c7;color:#92400e;border:none;border-radius:8px;
                            padding:9px;font-size:12px;font-weight:700;cursor:pointer;">⏸ Hold</button>
                        <button onclick="window.posApp.show_held_bills()"
                            style="background:#ede9fe;color:#5b21b6;border:none;border-radius:8px;
                            padding:9px;font-size:12px;font-weight:700;cursor:pointer;">📋 Recall</button>
                        <button onclick="window.posApp.split_bill_modal()"
                            style="background:#dbeafe;color:#1e40af;border:none;border-radius:8px;
                            padding:9px;font-size:12px;font-weight:700;cursor:pointer;">✂️ Split Bill</button>
                        <button onclick="window.posApp.clear_cart()"
                            style="background:#fee2e2;color:#991b1b;border:none;border-radius:8px;
                            padding:9px;font-size:12px;font-weight:700;cursor:pointer;">🗑 Kosongkan</button>
                    </div>
                    <button onclick="window.posApp.proses_bayar()"
                        style="width:100%; margin-top:8px; padding:14px;
                        background:linear-gradient(135deg,#4f63d2,#6366f1); color:#fff; border:none;
                        border-radius:10px; font-size:15px; font-weight:800; cursor:pointer; letter-spacing:.5px;
                        box-shadow:0 4px 14px rgba(79,99,210,.35);">
                        ✅ BAYAR SEKARANG
                    </button>
                </div>
            </div>
        </div>`);
    }

    // ── Items ─────────────────────────────────────────────────
    async load_items() {
        try {
            const result = await frappe.db.get_list('Barang', {
                filters: { aktif: 1,is_selling:1 },
                fields: ['name','nama_item','harga_jual','satuan','stok_saat_ini','gambar','kategori'],
                limit: 300,
                order_by: 'nama_item asc'
            });
            this.items_cache = result;
            const kategoris = [...new Set(result.map(i => i.kategori).filter(Boolean))];
            const sel = document.getElementById('pos-kategori');
            kategoris.forEach(k => {
                sel.insertAdjacentHTML('beforeend', `<option value="${k}">${k}</option>`);
            });
            this.render_items(result);
        } catch(e) { console.error('load_items', e); }
    }

    filter_items(q) {
        const kategori = (document.getElementById('pos-kategori')||{}).value || '';
        let f = this.items_cache;
        if (kategori) f = f.filter(i => i.kategori === kategori);
        if (q) {
            const ql = q.toLowerCase();
            f = f.filter(i =>
                (i.nama_item||'').toLowerCase().includes(ql) ||
                (i.name||'').toLowerCase().includes(ql)
            );
        }
        this.render_items(f);
    }

    render_items(items) {
        const grid = document.getElementById('item-grid');
        if (!grid) return;
        if (!items.length) {
            grid.innerHTML = `<div style="color:#aaa;padding:20px;grid-column:1/-1;text-align:center;">Tidak ada produk</div>`;
            return;
        }
        grid.innerHTML = items.map(item => {
            const habis = item.stok_saat_ini <= 0;
            return `<div onclick="${habis?'':` window.posApp.add_to_cart('${item.name}','${(item.nama_item||'').replace(/'/g,"\\'")}',${item.harga_jual},'${item.satuan||'pcs'}',${item.stok_saat_ini||0})`}"
                style="background:#fff; border:1.5px solid ${habis?'#fee2e2':'#edf0f7'}; border-radius:12px;
                padding:12px 10px; cursor:${habis?'not-allowed':'pointer'}; text-align:center;
                transition:all .15s; ${habis?'opacity:.55;':''}"
                onmouseover="if(!${habis})this.style.boxShadow='0 4px 14px rgba(79,99,210,.16)';this.style.borderColor='#4f63d2'"
                onmouseout="this.style.boxShadow='none';this.style.borderColor='${habis?'#fee2e2':'#edf0f7'}'">
                <div style="font-size:30px; margin-bottom:6px;">
                    ${item.gambar ? `<img src="${item.gambar}" style="width:52px;height:52px;object-fit:cover;border-radius:8px;">` : '📦'}
                </div>
                <div style="font-size:12px;font-weight:700;color:#1e2235;margin-bottom:2px;
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.nama_item}</div>
                <div style="font-size:12px;color:#4f63d2;font-weight:700;">${fmt_rp(item.harga_jual)}</div>
                <div style="font-size:10px;color:${habis?'#e74c3c':'#6b7280'};margin-top:2px;">
                    ${habis ? '❌ Habis' : `Stok: ${item.stok_saat_ini} ${item.satuan||'pcs'}`}</div>
            </div>`;
        }).join('');
    }

    // ── Barcode Scanner ───────────────────────────────────────
    toggle_scanner() {
        this.scanner_active = !this.scanner_active;
        const area = document.getElementById('scanner-area');
        if (this.scanner_active) {
            area.style.display = 'block';
            this.start_scanner();
        } else {
            area.style.display = 'none';
            this.stop_scanner();
        }
    }

    async start_scanner() {
        try {
            const video = document.getElementById('scanner-video');
            this.scanner_stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            video.srcObject = this.scanner_stream;
            video.play();
            // Use BarcodeDetector if available
            if ('BarcodeDetector' in window) {
                this.barcode_detector = new BarcodeDetector({ formats: ['code_128','ean_13','ean_8','qr_code','code_39'] });
                this.scan_loop();
            } else {
                document.getElementById('scan-status').textContent = 'BarcodeDetector tidak didukung browser ini. Gunakan input manual.';
            }
        } catch(e) {
            frappe.show_alert({ message: 'Kamera tidak dapat diakses: ' + e.message, indicator: 'red' });
            this.toggle_scanner();
        }
    }

    async scan_loop() {
        if (!this.scanner_active) return;
        const video = document.getElementById('scanner-video');
        if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
            try {
                const barcodes = await this.barcode_detector.detect(video);
                if (barcodes.length) {
                    const code = barcodes[0].rawValue;
                    document.getElementById('scan-status').textContent = '✅ Terdeteksi: ' + code;
                    document.getElementById('pos-search').value = code;
                    this.filter_items(code);
                    // Auto-add if exactly one match
                    const matches = this.items_cache.filter(i =>
                        i.name === code || (i.barcode||'') === code
                    );
                    if (matches.length === 1) {
                        const it = matches[0];
                        this.add_to_cart(it.name, it.nama_item, it.harga_jual, it.satuan||'pcs', it.stok_saat_ini||0);
                    }
                }
            } catch(e) {}
        }
        if (this.scanner_active) requestAnimationFrame(() => this.scan_loop());
    }

    stop_scanner() {
        if (this.scanner_stream) {
            this.scanner_stream.getTracks().forEach(t => t.stop());
            this.scanner_stream = null;
        }
        this.barcode_detector = null;
    }

    // ── Customer ──────────────────────────────────────────────
    open_customer_modal() {
        const d = new frappe.ui.Dialog({
            title: '👤 Pilih Pelanggan / Anggota',
            fields: [
                { label: 'Cari Anggota', fieldname: 'q', fieldtype: 'Link', options: 'Anggota', description: 'Nama atau nomor anggota' }
            ],
            primary_action_label: 'Cari',
            primary_action: async (v) => {
                const res = await frappe.db.get_list('Anggota', {
                    filters: [['name', 'like', `%${v.q}%`]],
                    fields: ['name','nama',],
                    limit: 20
                });
                if (!res.length) { frappe.show_alert({message:'Tidak ditemukan', indicator:'orange'}); return; }
                const rows = res.map(c => `
                    <div onclick="window.posApp._select_customer('${c.name}','${(c.customer_name||c.name).replace(/'/g,"\\'")}',${0}); window._tmp_dlg.hide();"
                        style="padding:10px 12px; border-radius:8px; cursor:pointer; display:flex; justify-content:space-between; align-items:center;"
                        onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background=''">
                        <div>
                            <div style="font-weight:700; font-size:13px;">${c.customer_name||c.name}</div>
                            <div style="font-size:11px; color:#6b7280;">${c.name}</div>
                        </div>
                        <span class="badge badge-blue">Poin: ${0}</span>
                    </div>`).join('<hr class="divider">');
                d.fields_dict.q.$wrapper.after(`<div style="margin-top:12px;">${rows}</div>`);
                window._tmp_dlg = d;
            }
        });
        d.show();
        window._tmp_dlg = d;
    }

    _select_customer(name, display_name, loyalty_points) {
        this.customer = { name, display_name, loyalty_points };
        document.getElementById('customer-name').textContent = display_name;
        //document.getElementById('loyalty-pts').textContent = loyalty_points;
        document.getElementById('loyalty-redeem-row').style.display = 'block';
       // document.getElementById('max-loyalty').textContent = fmt_rp(loyalty_points);
        this.update_totals();
    }

    clear_customer() {
        this.customer = null;
        this.loyalty_redeem = 0;
        document.getElementById('customer-name').textContent = 'Pelanggan Umum';
        document.getElementById('loyalty-pts').textContent = '0';
        document.getElementById('loyalty-redeem-row').style.display = 'none';
        document.getElementById('loyalty-row').style.display = 'none';
        this.update_totals();
    }

    // ── Voucher ───────────────────────────────────────────────
    async apply_voucher() {
        const code = (document.getElementById('voucher-code').value||'').trim().toUpperCase();
        if (!code) return;
        try {
            const v = await frappe.db.get_doc('Voucher', code);
            if (!v || v.status !== 'Aktif') {
                frappe.show_alert({ message: 'Voucher tidak valid atau sudah digunakan', indicator: 'red' });
                return;
            }
            this.voucher = v;
            this.voucher_discount = v.tipe === 'Persen' ? 0 : v.nilai;
            if (v.tipe === 'Persen') this.voucher_persen = v.nilai;
            else this.voucher_persen = 0;
            document.getElementById('voucher-row').style.display = '';
            frappe.show_alert({ message: `Voucher ${code} diterapkan!`, indicator: 'green' });
            this.update_totals();
        } catch(e) {
            frappe.show_alert({ message: 'Voucher tidak ditemukan', indicator: 'red' });
        }
    }

    apply_global_discount(val) {
        this.global_discount = parseFloat(val) || 0;
        this.update_totals();
    }

    // ── Cart ──────────────────────────────────────────────────
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

    set_item_discount(kode, val) {
        const item = this.cart.find(c => c.kode === kode);
        if (!item) return;
        item.diskon = Math.max(0, Math.min(100, parseFloat(val)||0));
        this.render_cart();
    }

    render_cart() {
        const list = document.getElementById('cart-list');
        if (!list) return;
        if (!this.cart.length) {
            list.innerHTML = `<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">Belum ada item di keranjang</div>`;
            this.update_totals();
            return;
        }
        list.innerHTML = this.cart.map(item => {
            const subtotal = item.qty * item.harga * (1 - item.diskon/100);
            return `<div style="padding:8px 0; border-bottom:1px solid #f3f4f8;">
                <div style="display:flex; align-items:flex-start; gap:6px;">
                    <div style="flex:1;">
                        <div style="font-weight:700; font-size:12px; color:#1e2235;">${item.nama}</div>
                        <div style="font-size:11px; color:#6b7280;">${fmt_rp(item.harga)} / ${item.satuan}</div>
                    </div>
                    <div class="qty-ctrl">
                        <button class="qty-btn" onclick="window.posApp.update_qty('${item.kode}',-1)">−</button>
                        <span style="min-width:26px;text-align:center;font-weight:800;font-size:13px;">${item.qty}</span>
                        <button class="qty-btn" onclick="window.posApp.update_qty('${item.kode}',1)">+</button>
                    </div>
                    <div style="min-width:72px;text-align:right;font-weight:700;font-size:13px;color:#4f63d2;">
                        ${fmt_rp(subtotal)}</div>
                    <button onclick="window.posApp.remove_from_cart('${item.kode}')"
                        style="border:none;background:none;color:#e74c3c;cursor:pointer;font-size:18px;line-height:1;padding:0;">×</button>
                </div>
                <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
                    <span style="font-size:11px; color:#6b7280;">Diskon item (%)</span>
                    <input type="number" min="0" max="100" value="${item.diskon||''}" placeholder="0"
                        onchange="window.posApp.set_item_discount('${item.kode}',this.value)"
                        style="width:60px; padding:3px 6px; font-size:11px; border-radius:5px; border:1px solid #dde1ec;">
                </div>
            </div>`;
        }).join('');
        this.update_totals();
        // Update cart badge di mobile switcher
        // Update badge mobile
        const badge = document.getElementById('cart-badge');
        const total_qty = this.cart.reduce((s, i) => s + i.qty, 0);
        if (badge) badge.textContent = total_qty;
    }
    render_nominal_shortcuts() {
        const container = document.getElementById('nominal-shortcuts');
        if (!container) return;

        const total = this.get_total();

        // Hitung nominal pas + pecahan di atasnya
        const pecahan = [1000, 2000, 5000, 10000, 20000, 50000, 100000];

        // Cari pecahan terdekat >= total untuk "Uang Pas"
        const uang_pas = pecahan.find(p => p >= total) || Math.ceil(total / 1000) * 1000;

        // Buat set shortcut: uang pas, lalu beberapa kelipatan di atasnya
        const shortcuts = new Set();
        shortcuts.add(total);                          // Uang pas exact
        shortcuts.add(uang_pas);                       // Pecahan terdekat

        // Tambah 2 nominal di atas uang_pas
        let idx = pecahan.indexOf(uang_pas);
        if (idx === -1) idx = pecahan.length - 1;
        for (let i = 1; i <= 2; i++) {
            if (pecahan[idx + i]) shortcuts.add(pecahan[idx + i]);
        }

        // Jika total > 100.000, tambah kelipatan 50rb / 100rb
        if (total > 100000) {
            const mult50  = Math.ceil(total / 50000)  * 50000;
            const mult100 = Math.ceil(total / 100000) * 100000;
            shortcuts.add(mult50);
            shortcuts.add(mult100);
        }

        // Selalu sertakan 50.000 dan 100.000 sebagai shortcut umum
        shortcuts.add(50000);
        shortcuts.add(100000);

        // Ambil 6 nominal unik terdekat >= total, urutkan
        const sorted = [...shortcuts]
            .filter(n => n >= total)
            .sort((a, b) => a - b)
            .slice(0, 6);

        // Render tombol
        container.innerHTML = sorted.map(nominal => {
            const isExact = nominal === total;
            return `
            <button onclick="window.posApp.set_bayar(${nominal})"
                style="padding:7px 4px; border-radius:8px; font-size:11px; font-weight:700;
                font-family:inherit; cursor:pointer; transition:all .15s; line-height:1.3;
                border: 1.5px solid ${isExact ? '#059669' : '#dde1ec'};
                background: ${isExact ? '#d1fae5' : '#f8f9fb'};
                color: ${isExact ? '#065f46' : '#374151'};"
                onmouseover="this.style.background='${isExact ? '#a7f3d0' : '#e8eaf2'}'"
                onmouseout="this.style.background='${isExact ? '#d1fae5' : '#f8f9fb'}'">
                ${isExact ? '✓ Pas' : ''} ${this.fmt_nominal(nominal)}
            </button>`;
        }).join('');
    }

    set_bayar(nominal) {
        const input = document.getElementById('pos-bayar');
        if (input) {
            input.value = nominal;
            this.hitung_kembalian();

            // Visual feedback: flash input
            input.style.borderColor = '#4f63d2';
            input.style.background = '#f0f4ff';
            setTimeout(() => {
                input.style.borderColor = '';
                input.style.background = '';
            }, 400);
        }
    }

    fmt_nominal(val) {
        if (val >= 1000000) return (val / 1000000) + ' Jt';
        if (val >= 1000)    return (val / 1000) + ' Rb';
        return 'Rp ' + val;
    }
    update_totals() {
        let subtotal = 0;
        this.cart.forEach(i => { subtotal += i.qty * i.harga * (1 - i.diskon/100); });
        const disc_global = subtotal * (this.global_discount/100);
        let after_disc = subtotal - disc_global;

        let voucher_amt = 0;
        if (this.voucher) {
            voucher_amt = this.voucher.tipe === 'Persen'
                ? after_disc * (this.voucher_persen/100)
                : Math.min(after_disc, this.voucher_discount);
        }

        const loyalty_val = Math.min(
            parseFloat((document.getElementById('loyalty-input')||{}).value)||0,
            this.customer ? this.customer.loyalty_points : 0
        );

        const total = Math.max(0, after_disc - voucher_amt - loyalty_val);

        document.getElementById('pos-subtotal').textContent = fmt_rp(subtotal);
        document.getElementById('pos-diskon').textContent = fmt_rp(disc_global);
        document.getElementById('pos-total').textContent = fmt_rp(total);

        if (voucher_amt > 0) {
            document.getElementById('voucher-row').style.display = '';
            document.getElementById('pos-voucher').textContent = fmt_rp(voucher_amt);
        }
        if (loyalty_val > 0) {
            document.getElementById('loyalty-row').style.display = '';
            document.getElementById('pos-loyalty').textContent = fmt_rp(loyalty_val);
        }

        this.hitung_kembalian();
        this.render_nominal_shortcuts(); // ← tambahkan ini
    }

    get_total() {
        let subtotal = 0;
        this.cart.forEach(i => { subtotal += i.qty * i.harga * (1 - i.diskon/100); });
        const disc_global = subtotal * (this.global_discount/100);
        let after_disc = subtotal - disc_global;
        let voucher_amt = 0;
        if (this.voucher) {
            voucher_amt = this.voucher.tipe === 'Persen'
                ? after_disc * (this.voucher_persen/100)
                : Math.min(after_disc, this.voucher_discount);
        }
        const loyalty_val = Math.min(
            parseFloat((document.getElementById('loyalty-input')||{}).value)||0,
            this.customer ? this.customer.loyalty_points : 0
        );
        return Math.max(0, after_disc - voucher_amt - loyalty_val);
    }

    hitung_kembalian() {
        const total = this.get_total();
        const bayar = parseFloat((document.getElementById('pos-bayar')||{}).value)||0;
        const kembalian = Math.max(0, bayar - total);
        const el = document.getElementById('pos-kembalian');
        if (el) {
            el.textContent = fmt_rp(kembalian);
            el.style.color = bayar < total ? '#e74c3c' : '#059669';
        }
    }

    on_metode_change() {
        const val = document.getElementById('pos-metode').value;
        document.getElementById('tunai-section').style.display  = val === 'Tunai' ? 'block' : 'none';
        document.getElementById('multi-section').style.display  = val === 'Multi' ? 'block' : 'none';
        if (val === 'Multi') this.init_multi_splits();
        if (val === 'Tunai') this.render_nominal_shortcuts(); // ← tambahkan ini
    }

    // ── Multi Payment ─────────────────────────────────────────
    init_multi_splits() {
        this.splits = [{ method: 'Tunai', amount: this.get_total() }];
        this.render_splits();
    }

    add_split() {
        if (!this.splits) this.splits = [];
        this.splits.push({ method: 'Transfer Bank', amount: 0 });
        this.render_splits();
    }

    render_splits() {
        const c = document.getElementById('multi-splits');
        c.innerHTML = (this.splits||[]).map((s, i) => `
            <div style="display:flex; gap:6px; margin-bottom:6px; align-items:center;">
                <select onchange="window.posApp.splits[${i}].method=this.value" style="flex:1;padding:6px 8px;font-size:12px;">
                    ${['Tunai','Transfer Bank','Debit','QRIS'].map(m =>
                        `<option ${s.method===m?'selected':''}>${m}</option>`).join('')}
                </select>
                <input type="number" value="${s.amount}" style="width:100px;padding:6px 8px;font-size:12px;"
                    oninput="window.posApp.splits[${i}].amount=parseFloat(this.value)||0">
                <button onclick="window.posApp.splits.splice(${i},1);window.posApp.render_splits()"
                    style="border:none;background:none;color:#e74c3c;cursor:pointer;font-size:16px;">×</button>
            </div>`).join('');
    }

    // ── Hold / Recall ─────────────────────────────────────────
    hold_bill() {
        if (!this.cart.length) { frappe.show_alert({message:'Keranjang kosong', indicator:'orange'}); return; }
        const id = gen_id();
        this.held_bills.push({
            id,
            cart: JSON.parse(JSON.stringify(this.cart)),
            customer: this.customer,
            time: now_dt()
        });
        this.clear_cart();
        frappe.show_alert({ message: `Bill di-hold: ${id}`, indicator: 'blue' });
    }

    show_held_bills() {
        if (!this.held_bills.length) {
            frappe.show_alert({message:'Tidak ada bill yang di-hold', indicator:'orange'});
            return;
        }
        const rows = this.held_bills.map(b => `
            <div style="padding:10px 12px; border-radius:8px; border:1px solid #edf0f7; margin-bottom:8px;
                display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-weight:700; font-size:13px;">${b.id}</div>
                    <div style="font-size:11px; color:#6b7280;">${b.time} | ${b.cart.length} item | ${b.customer?b.customer.display_name:'Umum'}</div>
                </div>
                <button class="btn-primary btn-sm" onclick="window.posApp.recall_bill('${b.id}'); window._held_dlg.hide();">Recall</button>
            </div>`).join('');
        const d = new frappe.ui.Dialog({
            title: '📋 Recall Bill',
            fields: [{ fieldtype: 'HTML', options: `<div>${rows}</div>` }]
        });
        window._held_dlg = d;
        d.show();
    }

    recall_bill(id) {
        const idx = this.held_bills.findIndex(b => b.id === id);
        if (idx === -1) return;
        const bill = this.held_bills.splice(idx, 1)[0];
        this.cart = bill.cart;
        if (bill.customer) this._select_customer(bill.customer.name, bill.customer.display_name, bill.customer.loyalty_points);
        this.render_cart();
        frappe.show_alert({ message: `Bill ${id} di-recall`, indicator: 'green' });
    }

    // ── Split Bill ────────────────────────────────────────────
    split_bill_modal() {
        if (!this.cart.length) { frappe.show_alert({message:'Keranjang kosong', indicator:'orange'}); return; }
        const total = this.get_total();
        const d = new frappe.ui.Dialog({
            title: '✂️ Split Bill',
            fields: [
                { label: 'Jumlah Split', fieldname: 'n', fieldtype: 'Int', default: 2,
                  description: 'Tagihan akan dibagi rata sejumlah ini' }
            ],
            primary_action_label: 'Split',
            primary_action: (v) => {
                const n = Math.max(2, parseInt(v.n)||2);
                const per = total / n;
                let html = `<div style="font-family:monospace; text-align:center; font-size:13px;">`;
                html += `<div style="font-size:15px;font-weight:800;margin-bottom:10px;">Total: ${fmt_rp(total)}</div>`;
                for (let i = 1; i <= n; i++) {
                    html += `<div style="padding:6px; background:#f0f4ff; border-radius:6px; margin-bottom:4px;">
                        Tagihan ${i}: <strong>${fmt_rp(per)}</strong></div>`;
                }
                html += `</div>`;
                frappe.msgprint({ title: `Split menjadi ${n} bagian`, message: html });
                d.hide();
            }
        });
        d.show();
    }

    clear_cart() {
        this.cart = [];
        this.voucher = null;
        this.voucher_discount = 0;
        this.global_discount = 0;
        const gd = document.getElementById('global-discount');
        if (gd) gd.value = '';
        const vc = document.getElementById('voucher-code');
        if (vc) vc.value = '';
        const pb = document.getElementById('pos-bayar');
        if (pb) pb.value = '';
        const li = document.getElementById('loyalty-input');
        if (li) li.value = '';
        document.getElementById('voucher-row').style.display = 'none';
        document.getElementById('loyalty-row').style.display = 'none';
        this.render_cart();
    }

    // ── Payment ───────────────────────────────────────────────
    async proses_bayar() {
        if (!this.cart.length) {
            frappe.show_alert({ message: 'Keranjang kosong!', indicator: 'orange' }); return;
        }
        if (!this.session) {
            frappe.show_alert({ message: 'Tidak ada sesi aktif', indicator: 'red' }); return;
        }
        const metode = document.getElementById('pos-metode').value;
        const total = this.get_total();

        let bayar = total;
        if (metode === 'Tunai') {
            bayar = parseFloat(document.getElementById('pos-bayar').value)||0;
            if (bayar < total) {
                frappe.show_alert({ message: 'Jumlah diterima kurang!', indicator: 'red' }); return;
            }
        } else if (metode === 'Multi') {
            const sum = (this.splits||[]).reduce((s,x)=>s+x.amount, 0);
            if (sum < total) {
                frappe.show_alert({ message: `Total split (${fmt_rp(sum)}) kurang dari total (${fmt_rp(total)})`, indicator: 'red' }); return;
            }
            bayar = sum;
        }

        const loyalty_val = Math.min(
            parseFloat((document.getElementById('loyalty-input')||{}).value)||0,
            this.customer ? this.customer.loyalty_points : 0
        );

        // ── Hitung field-field yang disimpan ke doctype ──────
        let subtotal_field = 0;
        let diskon_total_field = 0;
        this.cart.forEach(i => {
            const gross = i.qty * i.harga;
            subtotal_field     += gross;
            diskon_total_field += gross * ((i.diskon || 0) / 100);
        });
        // tambah diskon global ke diskon_total
        diskon_total_field += subtotal_field * (this.global_discount / 100);
        const kembalian_field = Math.max(0, bayar - total);

        const invoice = {
            doctype        : 'Nota Penjualan',
            tanggal        : now_dt(),                                                // Datetime [REQD]
            pos_session    : this.session,                                            // Link
            anggota        : this.customer ? this.customer.name : 'AGT00001',               // Link
            nama_pelanggan : this.customer ? this.customer.display_name : 'Walk In Customer',    // Data
            kasir          : frappe.session.user,                                     // Link
            metode_bayar   : metode,                                                  // Select [REQD]
            jumlah_diterima: bayar,                                                   // Currency
            kembalian      : kembalian_field,                                         // Currency
            subtotal       : subtotal_field,                                          // Currency
            diskon_total   : diskon_total_field,                                      // Currency
            total          : total,                                                   // Currency
            keterangan     : this.voucher ? ('Voucher: ' + this.voucher.name) : null,
            items          : this.cart.map(i => ({
                doctype   : 'Nota Penjualan Item',
                item      : i.kode,                                                   // Link [REQD]
                nama_item : i.nama,                                                   // Data
                satuan    : i.satuan,                                                 // Data
                qty       : i.qty,                                                    // Float [REQD]
                harga_jual: i.harga,                                                  // Currency [REQD]
                diskon    : i.diskon || 0,                                            // Percent
                total     : i.qty * i.harga * (1 - (i.diskon || 0) / 100)            // Currency
            }))
        };
        console.log('Invoice to save:', invoice);
        try {
            frappe.show_progress('Memproses transaksi…', 40, 100);
            const cart_snapshot = JSON.parse(JSON.stringify(this.cart));

            // ── STEP 1: insert as Draft (docstatus 0) ──────────
            const inserted = await frappe.call({
                method: 'frappe.client.insert',
                args: { doc: { ...invoice, docstatus: 0 } }
            });

            if (inserted.exc) throw new Error(inserted.exc);
            const saved_doc = inserted.message;

            frappe.show_progress('Memproses transaksi…', 75, 100);

            // ── STEP 2: submit using the EXACT modified timestamp
            //    returned from insert, eliminating the race condition ──
            const submitted = await frappe.call({
                method: 'frappe.client.submit',
                args: {
                    doc: saved_doc
                }
            });

            if (submitted.exc) throw new Error(submitted.exc);

            frappe.show_progress('Memproses transaksi…', 100, 100);
            
            frappe.hide_progress('Memproses transaksi…');
            this.clear_cart();
            this.show_struk(saved_doc.name, total, bayar, metode, cart_snapshot);
            frappe.show_alert({ message: `✅ Transaksi berhasil! ${saved_doc.name}`, indicator: 'green' });

        } catch(e) {
            frappe.hide_progress('Memproses transaksi…');
            // Tampilkan pesan error yang lebih bersih
            const msg = (e.message || String(e))
                .replace(/^.*?Error:\s*/i, '')   // strip leading "Error:"
                .split('\n')[0];                  // ambil baris pertama saja
            frappe.show_alert({ message: '❌ Gagal: ' + msg, indicator: 'red' });
            console.error('[POS] proses_bayar error:', e);
        }
    }

    // ── Receipt ───────────────────────────────────────────────
    show_struk(nota, total, bayar, metode, cart) {
        const kembalian = Math.max(0, bayar - total);
        const rows = cart.map(i => {
            const line_total = i.qty * i.harga * (1 - i.diskon/100);
            return `<tr>
                <td style="padding:3px 0;">${i.nama}</td>
                <td style="text-align:right;">${i.qty}</td>
                <td style="text-align:right;">${fmt_rp(i.harga)}</td>
                <td style="text-align:right;">${fmt_rp(line_total)}</td>
            </tr>`;
        }).join('');

        const struk_html = `
        <div id="struk-print" style="font-family:'JetBrains Mono',monospace;font-size:12px;
            max-width:300px;margin:0 auto;padding:16px;">
            <div style="text-align:center;margin-bottom:12px;">
                <div style="font-size:16px;font-weight:800;letter-spacing:2px;">KOPERASI</div>
                <div style="font-size:10px;color:#6b7280;">${now_dt()}</div>
                <div style="font-size:11px;font-weight:700;margin-top:4px;">${nota}</div>
            </div>
            <hr style="border:none;border-top:1px dashed #ccc;margin:8px 0;">
            <table style="width:100%;border-collapse:collapse;font-size:11px;">
                <thead><tr>
                    <th style="text-align:left;padding:3px 0;color:#6b7280;font-weight:600;">Item</th>
                    <th style="text-align:right;color:#6b7280;font-weight:600;">Qty</th>
                    <th style="text-align:right;color:#6b7280;font-weight:600;">Harga</th>
                    <th style="text-align:right;color:#6b7280;font-weight:600;">Total</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <hr style="border:none;border-top:1px dashed #ccc;margin:8px 0;">
            <table style="width:100%;font-size:12px;border-collapse:collapse;">
                <tr><td>Total</td><td style="text-align:right;font-weight:800;">${fmt_rp(total)}</td></tr>
                <tr><td>Bayar (${metode})</td><td style="text-align:right;">${fmt_rp(bayar)}</td></tr>
                ${kembalian > 0 ? `<tr><td>Kembalian</td><td style="text-align:right;color:#059669;font-weight:800;">${fmt_rp(kembalian)}</td></tr>` : ''}
            </table>
            <hr style="border:none;border-top:1px dashed #ccc;margin:8px 0;">
            <div style="text-align:center;font-size:11px;color:#6b7280;">Terima kasih atas kunjungan Anda!<br>Barang yang sudah dibeli tidak dapat dikembalikan kecuali cacat produksi.</div>
        </div>`;

        const d = new frappe.ui.Dialog({
            title: `🧾 Struk — ${nota}`,
            fields: [{ fieldtype: 'HTML', options: struk_html }],
            primary_action_label: '🖨 Cetak Struk',
            primary_action: () => {
                window.open(`/printview?doctype=Nota+Penjualan&name=${encodeURIComponent(nota)}&format=Struk+Penjualan`, '_blank');
                d.hide();
            },
            secondary_action_label: '💬 WhatsApp',
            secondary_action: () => {
                this.send_whatsapp_receipt(nota, total, cart);
                d.hide();
            }
        });
        d.show();
    }

    send_whatsapp_receipt(nota, total, cart) {
        const lines = cart.map(i => `• ${i.nama} x${i.qty} = ${fmt_rp(i.qty*i.harga*(1-i.diskon/100))}`).join('\n');
        const msg = `*KOPERASI — STRUK PENJUALAN*\nNo: ${nota}\n${now_dt()}\n\n${lines}\n\n*Total: ${fmt_rp(total)}*\n\nTerima kasih!`;
        const d = new frappe.ui.Dialog({
            title: '💬 Kirim WhatsApp',
            fields: [
                { label: 'No HP (contoh: 628xxx)', fieldname: 'hp', fieldtype: 'Data', reqd: 1 }
            ],
            primary_action_label: 'Kirim',
            primary_action: (v) => {
                const url = `https://wa.me/${v.hp.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(msg)}`;
                window.open(url, '_blank');
                d.hide();
            }
        });
        d.show();
    }

    // ══════════════════════════════════════════════════════════
    // TAB 2 — SHIFT KASIR
    // ══════════════════════════════════════════════════════════
    render_shift_tab() {
        $('#tab-shift').html(`
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;" class="responsive-grid-2">
            <!-- Left: Shift controls -->
            <div style="display:flex; flex-direction:column; gap:14px;">
                <!-- Current session info -->
                <div class="card" style="padding:20px;">
                    <div class="section-title">🖥️ Sesi Aktif</div>
                    <table style="width:100%;font-size:13px;border-collapse:collapse;">
                        <tr><td style="color:#6b7280;padding:4px 0;">ID Sesi</td>
                            <td style="font-weight:700;" id="shift-session-id">-</td></tr>
                        <tr><td style="color:#6b7280;padding:4px 0;">Kasir</td>
                            <td style="font-weight:700;">${frappe.session.user_fullname||frappe.session.user}</td></tr>
                        <tr><td style="color:#6b7280;padding:4px 0;">Saldo Awal</td>
                            <td style="font-weight:700;" id="shift-saldo-awal">-</td></tr>
                        <tr><td style="color:#6b7280;padding:4px 0;">Status</td>
                            <td id="shift-status"><span class="badge badge-red">Tutup</span></td></tr>
                    </table>
                    <div style="display:flex; gap:8px; margin-top:14px;">
                        <button class="btn-primary" style="flex:1;" onclick="window.posApp.buka_sesi_dialog()">▶ Buka Sesi</button>
                        <button class="btn-danger" style="flex:1;" onclick="window.posApp.close_shift_flow()">⏹ Tutup Sesi</button>
                    </div>
                </div>

                <!-- Cash opname -->
                <div class="card" style="padding:20px;">
                    <div class="section-title">💰 Cash Opname</div>
                    <div style="margin-bottom:10px;">
                        <label>Jumlah Kas Fisik di Laci (Rp)</label>
                        <input type="number" id="opname-kas" placeholder="Masukkan jumlah kas">
                    </div>
                    <div style="margin-bottom:10px;">
                        <label>Catatan</label>
                        <textarea id="opname-catatan" rows="2" style="resize:none;"></textarea>
                    </div>
                    <div id="opname-result" style="display:none; margin-bottom:10px; padding:10px; border-radius:8px; font-size:13px;"></div>
                    <button class="btn-primary" style="width:100%;" onclick="window.posApp.do_cash_opname()">Hitung Selisih</button>
                </div>
            </div>

            <!-- Right: History -->
            <div class="card" style="padding:20px; overflow-y:auto; max-height:calc(100vh - 130px);">
                <div class="section-title">📜 Riwayat Shift</div>
                <div id="shift-history-list">
                    <div style="text-align:center;color:#aaa;padding:30px;">Memuat data…</div>
                </div>
            </div>
        </div>`);
    }

    async load_shift_history() {
        this.update_shift_ui();
        try {
            const rows = await frappe.db.get_list('POS Session', {
                fields: ['name','kasir','saldo_awal_kas','status','creation'],
                order_by: 'creation desc',
                limit: 50
            });
            const html = rows.length ? `
                <table class="data-table">
                    <thead><tr>
                        <th>ID</th><th>Kasir</th><th>Saldo Awal</th><th>Status</th><th>Waktu</th>
                    </tr></thead>
                    <tbody>${rows.map(r => `
                        <tr>
                            <td><a href="/app/pos-session/${r.name}" target="_blank" style="color:#4f63d2;">${r.name}</a></td>
                            <td>${r.kasir}</td>
                            <td>${fmt_rp(r.saldo_awal_kas)}</td>
                            <td><span class="badge ${r.status==='Buka'?'badge-green':'badge-red'}">${r.status}</span></td>
                            <td style="font-size:11px;">${r.creation}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>` : `<div style="text-align:center;color:#aaa;padding:30px;">Belum ada riwayat shift</div>`;
            document.getElementById('shift-history-list').innerHTML = html;
        } catch(e) { console.error(e); }
    }

    update_shift_ui() {
        const el_id = document.getElementById('shift-session-id');
        const el_st = document.getElementById('shift-status');
        if (el_id) el_id.textContent = this.session || '-';
        if (el_st) el_st.innerHTML = this.session
            ? '<span class="badge badge-green">Aktif</span>'
            : '<span class="badge badge-red">Tidak Ada Sesi</span>';
    }

    async do_cash_opname() {
        if (!this.session) { frappe.show_alert({message:'Tidak ada sesi aktif', indicator:'red'}); return; }
        const fisik = parseFloat(document.getElementById('opname-kas').value)||0;
        // Calculate expected cash: saldo_awal + tunai masuk
        let saldo_awal = 0;
        try {
            const s = await frappe.db.get_doc('POS Session', this.session);
            saldo_awal = s.saldo_awal_kas || 0;
        } catch(e) {}
        // Sum tunai transactions this session
        let tunai_total = 0;
        try {
            const invoices = await frappe.db.get_list('Nota Penjualan', {
                filters: { pos_session: this.session, metode_bayar: 'Tunai', docstatus: 1 },
                fields: ['jumlah_diterima'],
                limit: 1000
            });
            tunai_total = invoices.reduce((s,i) => s + (i.jumlah_diterima||0), 0);
        } catch(e) {}
        const expected = saldo_awal + tunai_total;
        const selisih = fisik - expected;
        const col = selisih >= 0 ? '#059669' : '#e74c3c';
        const label = selisih >= 0 ? 'Lebih' : 'Kurang';
        const res = document.getElementById('opname-result');
        res.style.display = 'block';
        res.style.background = selisih >= 0 ? '#d1fae5' : '#fee2e2';
        res.innerHTML = `
            <table style="width:100%;font-size:13px;border-collapse:collapse;">
                <tr><td style="color:#6b7280;padding:3px 0;">Saldo Awal</td><td style="text-align:right;">${fmt_rp(saldo_awal)}</td></tr>
                <tr><td style="color:#6b7280;padding:3px 0;">Penjualan Tunai</td><td style="text-align:right;">${fmt_rp(tunai_total)}</td></tr>
                <tr><td style="color:#6b7280;padding:3px 0;">Diharapkan</td><td style="text-align:right;font-weight:700;">${fmt_rp(expected)}</td></tr>
                <tr><td style="color:#6b7280;padding:3px 0;">Kas Fisik</td><td style="text-align:right;font-weight:700;">${fmt_rp(fisik)}</td></tr>
                <tr style="border-top:1px solid rgba(0,0,0,.1);"><td style="font-weight:800;padding:4px 0;">Selisih</td>
                    <td style="text-align:right;font-weight:800;color:${col};">${label}: ${fmt_rp(Math.abs(selisih))}</td></tr>
            </table>`;

        // Save opname to session
        try {
            await frappe.db.set_value('POS Session', this.session, {
                kas_fisik: fisik,
                selisih_kas: selisih
            });
        } catch(e) {}
    }

    async close_shift_flow() {
        if (!this.session) { frappe.show_alert({message:'Tidak ada sesi aktif', indicator:'orange'}); return; }
        const s = await frappe.db.get_doc('POS Session', this.session);
        const saldo_awal = s.saldo_awal_kas || 0;
        const invoices = await frappe.db.get_list('Nota Penjualan', {
            filters: { pos_session: this.session, metode_bayar: 'Tunai', docstatus: 1 },
            fields: ['total'],
            limit: 1000
        });
        const tunai_total = invoices.reduce((s,i) => s + (i.total||0), 0);
        const expected = saldo_awal + tunai_total;
               
        const d = new frappe.ui.Dialog({
            title: '⏹ Tutup Sesi Kasir',
            
            fields: [
                { label: 'Saldo Awal (Rp)', fieldname: 'saldo_awal_kas', fieldtype: 'Currency', read_only: 1, default:saldo_awal },
                { label: 'Penjualan Tunai (Rp)', fieldname: 'total_penjualan', fieldtype: 'Currency', read_only: 1, default:tunai_total },
                { label: 'Kas Seharusnya (Rp)', fieldname: 'expected', fieldtype: 'Currency', read_only: 1, default:expected },
                { label: 'Kas Fisik Akhir (Rp)', fieldname: 'kas_akhir', fieldtype: 'Currency', reqd: 1,
                    onchange:()=>{
                        const kas_akhir = flt(d.get_value('kas_akhir'));
                        const selisih = kas_akhir-expected;
                        d.set_value('selisih',selisih);
                      
                        if(selisih >0){
                            frappe.show_alert({ message: "Lebih Rp. "+fmt_rp(Math.abs(selisih)), indicator: 'yellow' });
                        }else if(selisih < 0){
                            frappe.show_alert({ message: 'Kurang Rp. ' + fmt_rp(Math.abs(selisih)), indicator: 'red' });
                        }else{
                            frappe.show_alert({ message: 'Balance', indicator: 'green' });
                           
                        }
                    }
                },
                { label: 'Selisih (Rp)', fieldname: 'selisih', fieldtype: 'Currency', read_only: 1},
                { label: 'Alasan Selisih', fieldname: 'alasan_selisih', fieldtype: 'Small Text' },
                { label: 'Catatan Penutupan', fieldname: 'catatan', fieldtype: 'Small Text' }
            ],
            primary_action_label: 'Ajukan Penutupan',
            primary_action: async (v) => {
                try {
                    const kas_akhir = flt(v.kas_akhir);
                    const selisih =  kas_akhir - expected
                    d.set_value('selisih',selisih)
                    if(selisih >0){
                        frappe.show_alert({ message: "Lebih Rp. "+fmt_rp(Math.abs(selisih)), indicator: 'yellow' });
                    }else if(selisih < 0){
                        frappe.show_alert({ message: 'Kurang Rp. ' + fmt_rp(Math.abs(selisih)), indicator: 'red' });
                    }else{
                        frappe.show_alert({ message: 'Balance', indicator: 'green' });
                    }

                    if( selisih !== 0 && !v.alasan_selisih){
                        frappe.show_alert({ message: 'Alasan Selisih Harus di isi', indicator: 'blue' });
                        return;
                    }
                    await frappe.db.set_value('POS Session', this.session, {
                        kas_fisik: v.kas_akhir,
                        alasan_selisih: v.alasan_selisih,
                        selisih_kas: v.selisih,
                        catatan_tutup: v.catatan,
                        status: 'Pending Approval'
                    });
                    frappe.show_alert({ message: 'Penutupan diajukan, menunggu approval manajer', indicator: 'blue' });
                    d.hide();
                    this.load_shift_history();
                    window.location.reload();
                } catch(e) {
                    frappe.show_alert({ message: 'Error: ' + e.message, indicator: 'red' });
                }
            }
        });
        
        d.show();
    }

    // ══════════════════════════════════════════════════════════
    // TAB 3 — REFUND & RETURN
    // ══════════════════════════════════════════════════════════
    render_refund_tab() {
        $('#tab-refund').html(`
        <div style="display:grid; grid-template-columns:1.1fr 1fr; gap:14px;" class="responsive-grid-2">
            <!-- Left: New refund -->
            <div class="card" style="padding:20px;">
                <div class="section-title">↩ Proses Return / Refund</div>

                <div style="margin-bottom:12px;">
                    <label>No. Nota Penjualan</label>
                    <div style="display:flex; gap:8px;">
                        <input type="text" id="refund-nota" placeholder="Cari no. nota…">
                        <button class="btn-primary btn-sm" onclick="window.posApp.load_refund_nota()">Cari</button>
                    </div>
                </div>

                <div id="refund-nota-detail" style="display:none;">
                    <div style="background:#f8f9fb; border-radius:10px; padding:14px; margin-bottom:12px;">
                        <div id="refund-nota-info" style="font-size:13px; margin-bottom:10px;"></div>
                        <div id="refund-items-list"></div>
                    </div>

                    <div style="margin-bottom:10px;">
                        <label>Alasan Return</label>
                        <select id="refund-alasan">
                            <option value="">-- Pilih Alasan --</option>
                            <option>Produk cacat / rusak</option>
                            <option>Produk salah / tidak sesuai pesanan</option>
                            <option>Kelebihan pengiriman</option>
                            <option>Produk kadaluarsa</option>
                            <option>Permintaan pelanggan</option>
                            <option>Lainnya</option>
                        </select>
                    </div>
                    <div id="alasan-lain-div" style="display:none; margin-bottom:10px;">
                        <label>Keterangan Alasan</label>
                        <textarea id="refund-alasan-lain" rows="2" placeholder="Jelaskan alasan…" style="resize:none;"></textarea>
                    </div>

                    <div style="margin-bottom:10px;">
                        <label>Metode Refund</label>
                        <select id="refund-metode">
                            <option>Tunai</option>
                            <option>Transfer Bank</option>
                            <option>Kredit Akun</option>
                        </select>
                    </div>

                    <div id="refund-total-row" style="background:#fff0f0; border-radius:8px; padding:12px; margin-bottom:12px; font-size:13px;">
                        <div style="display:flex; justify-content:space-between;">
                            <span>Total Refund:</span>
                            <strong id="refund-total" style="color:#e74c3c;">Rp 0</strong>
                        </div>
                    </div>

                    <button class="btn-primary" style="width:100%; background:#e74c3c;"
                        onclick="window.posApp.submit_refund()">↩ Proses Refund & Ajukan Approval</button>
                </div>
            </div>

            <!-- Right: History -->
            <div class="card" style="padding:20px; overflow-y:auto; max-height:calc(100vh - 130px);">
                <div class="section-title">📜 Riwayat Refund</div>
                <div id="refund-history-list">
                    <div style="text-align:center;color:#aaa;padding:30px;">Memuat data…</div>
                </div>
            </div>
        </div>`);

        // Bind alasan change
        setTimeout(() => {
            const alasanSel = document.getElementById('refund-alasan');
            if (alasanSel) {
                alasanSel.addEventListener('change', (e) => {
                    document.getElementById('alasan-lain-div').style.display =
                        e.target.value === 'Lainnya' ? 'block' : 'none';
                });
            }
        }, 300);
    }

    async load_refund_nota() {
        const nota = (document.getElementById('refund-nota').value||'').trim();
        if (!nota) return;
        try {
            const doc = await frappe.db.get_doc('Nota Penjualan', nota);
            if (doc.docstatus !== 1) {
                frappe.show_alert({message:'Nota belum di-submit atau sudah diproses', indicator:'orange'}); return;
            }
            this._refund_doc = doc;
            document.getElementById('refund-nota-info').innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <strong>${doc.name}</strong>
                    <span class="badge badge-blue">${doc.metode_bayar}</span>
                </div>
                <div style="color:#6b7280; font-size:12px;">${doc.tanggal} | ${doc.nama_pelanggan}</div>`;

            const items_html = (doc.items||[]).map((i, idx) => `
                <div style="display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid #edf0f7;">
                    <input type="checkbox" id="ri-${idx}" data-idx="${idx}" data-total="${i.total}"
                        onchange="window.posApp.update_refund_total()"
                        style="width:16px;height:16px;cursor:pointer;">
                    <div style="flex:1;">
                        <div style="font-size:13px;font-weight:600;">${i.nama_item}</div>
                        <div style="font-size:11px;color:#6b7280;">${i.qty} x ${fmt_rp(i.harga_jual)} = ${fmt_rp(i.total)}</div>
                    </div>
                    <div style="font-size:12px;color:#4f63d2;font-weight:700;">${fmt_rp(i.total)}</div>
                </div>`).join('');
            document.getElementById('refund-items-list').innerHTML = items_html;
            document.getElementById('refund-nota-detail').style.display = 'block';
            this.update_refund_total();
        } catch(e) {
            frappe.show_alert({ message: 'Nota tidak ditemukan: ' + (e.message||e), indicator: 'red' });
        }
    }

    update_refund_total() {
        let total = 0;
        document.querySelectorAll('[id^="ri-"]').forEach(cb => {
            if (cb.checked) total += parseFloat(cb.dataset.total)||0;
        });
        const el = document.getElementById('refund-total');
        if (el) el.textContent = fmt_rp(total);
        this._refund_amount = total;
    }

    async submit_refund() {
        if (!this._refund_doc) return;
        const alasan = document.getElementById('refund-alasan').value;
        if (!alasan) { frappe.show_alert({message:'Pilih alasan refund', indicator:'orange'}); return; }
        const alasan_detail = alasan === 'Lainnya'
            ? (document.getElementById('refund-alasan-lain').value||'').trim()
            : alasan;
        if (!this._refund_amount) { frappe.show_alert({message:'Pilih minimal satu item untuk di-return', indicator:'orange'}); return; }

        const metode = document.getElementById('refund-metode').value;
        const selected_items = [];
        document.querySelectorAll('[id^="ri-"]').forEach((cb, idx) => {
            if (cb.checked && this._refund_doc.items[idx]) {
                selected_items.push(this._refund_doc.items[idx]);
            }
        });

        try {
            const refund_doc = {
                doctype: 'Refund Penjualan',
                nota_asal: this._refund_doc.name,
                tanggal: now_dt(),
                pelanggan: this._refund_doc.nama_pelanggan,
                alasan: alasan_detail,
                metode_refund: metode,
                total_refund: this._refund_amount,
                status: 'Pending Approval',
                items: selected_items.map(i => ({
                    item: i.item,
                    nama_item: i.nama_item,
                    qty: i.qty,
                    harga: i.harga_jual,
                    total: i.total
                }))
            };
            await frappe.db.insert(refund_doc);
            frappe.show_alert({ message: 'Refund diajukan, menunggu approval manajer', indicator: 'blue' });
            document.getElementById('refund-nota-detail').style.display = 'none';
            document.getElementById('refund-nota').value = '';
            this._refund_doc = null;
            this.load_refund_history();
        } catch(e) {
            frappe.show_alert({ message: 'Gagal submit refund: ' + (e.message||e), indicator: 'red' });
        }
    }

    async load_refund_history() {
        try {
            const rows = await frappe.db.get_list('Refund Penjualan', {
                fields: ['name','nota_asal','pelanggan','total_refund','metode_refund','alasan','status','creation'],
                order_by: 'creation desc',
                limit: 100
            });
            const badge = s => {
                if (s === 'Approved') return 'badge-green';
                if (s === 'Rejected') return 'badge-red';
                return 'badge-yellow';
            };
            const html = rows.length ? `
                <table class="data-table">
                    <thead><tr>
                        <th>No Refund</th><th>Nota Asal</th><th>Pelanggan</th>
                        <th>Total</th><th>Metode</th><th>Status</th>
                    </tr></thead>
                    <tbody>${rows.map(r => `
                        <tr>
                            <td><a href="/app/refund-penjualan/${r.name}" target="_blank" style="color:#4f63d2;">${r.name}</a></td>
                            <td>${r.nota_asal||'-'}</td>
                            <td>${r.pelanggan||'-'}</td>
                            <td style="font-weight:700;color:#e74c3c;">${fmt_rp(r.total_refund)}</td>
                            <td>${r.metode_refund||'-'}</td>
                            <td><span class="badge ${badge(r.status)}">${r.status}</span></td>
                        </tr>`).join('')}
                    </tbody>
                </table>` : `<div style="text-align:center;color:#aaa;padding:30px;">Belum ada riwayat refund</div>`;
            document.getElementById('refund-history-list').innerHTML = html;
        } catch(e) { console.error(e); }
    }

    // ══════════════════════════════════════════════════════════
    // SESSION MANAGEMENT
    // ══════════════════════════════════════════════════════════
    async check_or_open_session() {
        try {
            const existing = await frappe.db.get_list('POS Session', {
                filters: { kasir: frappe.session.user, status: 'Buka' },
                limit: 1
            });
            if (existing.length) {
                this.session = existing[0].name;
                this._on_session_opened(existing[0]);
            } else {
                this.buka_sesi_dialog();
            }
        } catch(e) { this.buka_sesi_dialog(); }
    }

    _on_session_opened(sess) {
        document.getElementById('session-name').textContent = this.session;
        const el = document.getElementById('shift-session-id');
        if (el) el.textContent = this.session;
        const el2 = document.getElementById('shift-saldo-awal');
        if (el2) el2.textContent = fmt_rp(sess.saldo_awal_kas);
        const el3 = document.getElementById('shift-status');
        if (el3) el3.innerHTML = '<span class="badge badge-green">Aktif</span>';
    }

    buka_sesi_dialog() {
        const d = new frappe.ui.Dialog({
            title: '▶ Buka Sesi Kasir',
            static: true,
            fields: [
                {
                    label:"POS Outlet",
                    fieldname:'pos_outlet',
                    fieldtype:'Link',
                    options:"POS Outlet",
                    reqd:1,
                    description:'Outlate'
                },
                {
                    label:"POS Name",
                    fieldname:'pos_name',
                    fieldtype:'Data',
                    reqd:1,
                    placheholder:'Kasir 1',
                    description:'Workstation / Device Name / PC Name'
                },
                { 
                    label: 'Saldo Awal Kas (Rp)',
                    fieldname: 'saldo_awal',
                    fieldtype: 'Currency',
                    reqd: 1,
                    description: 'Jumlah uang tunai di laci kasir saat ini'
                }
            ],
            primary_action_label: 'Mulai Sesi',
            primary_action: async (values) => {
                try {
                    const session = frappe.model.get_new_doc('POS Session');
                    session.pos_outlet = values.pos_outlet;
                    session.pos_name = values.pos_name;
                    session.kasir = frappe.session.user;
                    session.saldo_awal_kas = values.saldo_awal;
                    session.status = 'Buka';
                    const doc = await frappe.db.insert(session);
                    this.session = doc.name;
                    this._on_session_opened(doc);
                    frappe.show_alert({ message: `✅ Sesi ${doc.name} dibuka`, indicator: 'green' });
                    d.hide();
                } catch(e) {
                    frappe.show_alert({ message: 'Gagal buka sesi: ' + (e.message||e), indicator: 'red' });
                }
            }
        });
        d.show();
        d.$wrapper.find('.btn-modal-close').hide();
    }

    tutup_sesi() {
        if (!this.session) { frappe.show_alert({message:'Tidak ada sesi aktif', indicator:'orange'}); return; }
        this.show_tab('shift');
        this.close_shift_flow();
    }
}