// ================================================================
// NOTA DINAS — Javascript/notadinas.js
// Alur: pilih tipe (DD/LD) → pilih kategori → isi form →
//       pilih pemimpin & petugas (Sosper=dropdown AnggotaDPRD;
//       lainnya=teks) + lokasi dari api_tujuan → simpan → cetak.
// ================================================================

// ---------- STATE ----------
var ndTipe      = null;  // 'DD' | 'LD'
var ndKategori  = null;  // key kategori
var ndPegawai   = [];    // semua petugas (flatten dari grup)
var ndMaster    = [];    // semua pegawai
var ndDewanList = [];    // filter: status === 'Anggota DPRD'
var ndPetugasList = [];  // filter: status !== 'Anggota DPRD'
var ndTujuanDinas = [];  // dari api_tujuan.php

var ndTomSelectPemimpin = null;  // TomSelect dropdown pemimpin (sosper)
var ndTomSelectPetugas  = {};    // map: selectorEl → TomSelect instance

// ---------- KONSTANTA ----------
var KATEGORI_SOSPER = ['sosper', 'sosrev'];

function sanitasiKategori(v) {
    if (v == null) return '';
    return String(v).toLowerCase().replace(/[^a-z0-9_]/g, '');
}
function ndIsAnggota(p) {
    return (p.status || '').trim().toLowerCase() === 'anggota dprd';
}

// ---------- UTIL ----------
function ndEsc(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
}
function ndCsrf() { return sessionStorage.getItem('csrf_token') || ''; }

// ==================================================================
// INIT — dipanggil oleh navigasiSPA() di gembok.js
// ==================================================================
function initNotaDinasSPA() {
    ndTipe     = null;
    ndKategori = null;
    ndPegawai  = [];
    ndMaster   = [];
    ndDewanList    = [];
    ndPetugasList  = [];
    ndTujuanDinas  = [];

    var hide = function(id){ var e=document.getElementById(id); if(e) e.style.display='none'; };
    hide('kategoriDD'); hide('kategoriLD'); hide('labelTerpilih');
    hide('formSection'); hide('pegawaiSection'); hide('aksiSection');
    ['btnCetakSosper','btnCetakSosrev','btnCetakKomisi','btnCetakKetua',
     'btnCetakUndangan','btnCetakKomparasi','btnCetakPansus'].forEach(hide);

    var cd = document.getElementById('cardDD');
    var cl = document.getElementById('cardLD');
    if (cd) cd.classList.remove('active');
    if (cl) cl.classList.remove('active');

    var tglEl = document.getElementById('tanggalND');
    if (tglEl && !tglEl.value) tglEl.value = new Date().toISOString().slice(0,10);

    loadRiwayatNotaDinas();
}
window.initNotaDinasSPA = initNotaDinasSPA;

// ==================================================================
// AMBIL DATA MASTER: pegawai + tujuan
// ==================================================================
function loadMasterNd() {
    return Promise.all([
        // pegawai — SEMUA, tanpa limit paginasi, supaya TomSelect dropdown lengkap
        fetch('PHP/api_pegawai.php?limit=all', {
            headers: { 'X-CSRF-Token': ndCsrf() },
            credentials: 'same-origin'
        }).then(function(r){ return r.json(); }),

        // tujuan
        fetch('PHP/api_tujuan.php', {
            cache: 'no-store',
            headers: { 'Accept': 'application/json' }
        }).then(function(r){ return r.json(); })
    ])
    .then(function(results) {
        var jsonPeg = Array.isArray(results[0]) ? results[0] : (results[0].data || []);
        var jsonTuj = Array.isArray(results[1]) ? results[1] : (results[1].data || []);

        ndMaster = jsonPeg.map(function(p){
            return {
                id:       String(p.id || p.pegawai_id),
                nama:     p.nama || p.nama_pegawai || '',
                nip:      p.nip || '',
                jabatan:  p.jabatan || p.nama_jabatan || '',
                status:   p.status || '',
                foto:     p.foto || p.foto_url || 'Image/default.jpg'
            };
        });

        ndDewanList   = ndMaster.filter(ndIsAnggota);
        ndPetugasList = ndMaster.filter(function(p){ return !ndIsAnggota(p); });

        ndTujuanDinas = jsonTuj;

        // Init TomSelect pada semua select petugas yang sudah ada di DOM
        document.querySelectorAll('.petugas-select').forEach(function(sel){
            initTomSelectPetugas(sel);
        });

        renderRingkasan();
    })
    .catch(function(e){
        console.error('Gagal memuat data master nota dinas:', e);
    });
}

// ==================================================================
// LOKASI: DIPILAH BERDASARKAN DD/LD
// ==================================================================
function ndJenisTujuan() {
    return ndTipe === 'DD' ? 'Dalam Daerah' : 'Luar Daerah';
}

function ndLokasiUntukTipe() {
    var j = ndJenisTujuan();
    return ndTujuanDinas.filter(function(t){
        return (t.jenis || '').trim().toLowerCase() === j.toLowerCase();
    });
}

// ==================================================================
// MODE PEMIMPIN: Sosper/Sosrev = dropdown Anggota DPRD; lain = teks
// ==================================================================
function ndModePemimpin() {
    if (!ndKategori) return 'teks';
    return KATEGORI_SOSPER.indexOf(sanitasiKategori(ndKategori)) >= 0 ? 'dropdown' : 'teks';
}

// ==================================================================
// INIT TOMSELECT — pilih PEMIMPIN (dropdown Anggota DPRD)
// ==================================================================
function initTomSelectPemimpin(sel) {
    if (typeof TomSelect === 'undefined') { setTimeout(function(){ initTomSelectPemimpin(sel); }, 300); return; }
    if (sel._ts) { try { sel._ts.destroy(); } catch(e){} }
    sel.innerHTML = '<option value="">-- Pilih Dewan yang Diikuti --</option>';
    ndDewanList.forEach(function(p){
        sel.innerHTML += '<option value="' + ndEsc(p.id) + '">'
            + ndEsc(p.nama + (p.jabatan ? ' — ' + p.jabatan : '') + (p.nip ? ' (' + p.nip + ')' : ''))
            + '</option>';
    });
    sel._ts = new TomSelect(sel, {
        plugins: ['remove_button'],
        create: false,
        sortField: { field: 'text', direction: 'asc' },
        placeholder: '-- Ketik Nama atau NIP Dewan --',
        onChange: function(val){
            if (val) {
                var p = ndDewanList.find(function(x){ return x.id === String(val); });
                var tx = sel.closest('.grup-pemimpin').querySelector('.input-pemimpin-teks');
                if (tx && p) tx.value = p.nama;
            }
            renderRingkasan();
        }
    });
}

// ==================================================================
// INIT TOMSELECT — pilih PETUGAS (non-Anggota DPRD)
// ==================================================================
function initTomSelectPetugas(sel) {
    if (typeof TomSelect === 'undefined') { setTimeout(function(){ initTomSelectPetugas(sel); }, 300); return; }
    var key = sel.dataset.tsKey || sel.id || Math.random();
    if (ndTomSelectPetugas[key]) {
        try { ndTomSelectPetugas[key].destroy(); } catch(e){}
    }
    sel.innerHTML = '';
    ndPetugasList.forEach(function(p){
        sel.innerHTML += '<option value="' + ndEsc(p.id) + '">'
            + ndEsc(p.nama + (p.jabatan ? ' — ' + p.jabatan : '') + (p.nip ? ' (' + p.nip + ')' : ''))
            + '</option>';
    });
    ndTomSelectPetugas[key] = new TomSelect(sel, {
        plugins: ['remove_button'],
        create: false,
        maxItems: null,
        sortField: { field: 'text', direction: 'asc' },
        placeholder: '-- Ketik Nama atau NIP Petugas --',
        onChange: function(){ renderRingkasan(); }
    });
}

// ==================================================================
// GRUP PEMIMPIN — UI builder
// ==================================================================
function tambahGrupPemimpin() {
    var wrap = document.getElementById('grupPemimpinWrap');
    if (!wrap) return;
    var no = wrap.querySelectorAll('.grup-pemimpin').length + 1;
    var mode = ndModePemimpin();
    var loc = ndLokasiUntukTipe();

    // pilih lokasi
    var optLokasi = '<option value="">-- Pilih Lokasi --</option>' +
        loc.map(function(t){ return '<option value="'+ndEsc(t.id+'|'+t.nama)+'">'+ndEsc(t.nama)+'</option>'; }).join('');

    var blokPemimpin = '';
    if (mode === 'dropdown') {
        blokPemimpin =
            '<div class="form-group">' +
                '<label>Yang Diikuti / Diliput <span style="color:red">*</span></label>' +
                '<select class="pemimpin-select" onchange="onPemimpinSelect(this)">' +
                    '<option value="">-- Pilih Dewan yang Diikuti --</option>' +
                '</select>' +
                '<input type="hidden" class="input-pemimpin-teks">' +
            '</div>';
    } else {
        blokPemimpin =
            '<div class="form-group">' +
                '<label>Yang Diikuti / Diliput</label>' +
                '<input type="text" class="input-pemimpin-teks" placeholder="Contoh: Kegiatan Ketua DPRD ke Kabupaten Tanah Bumbu" oninput="renderRingkasan()">' +
            '</div>';
    }

    var div = document.createElement('div');
    div.className = 'grup-pemimpin';
    div.innerHTML =
        '<div class="grup-pemimpin-head">' +
            '<div class="grup-pemimpin-title">' +
                '<span class="grup-pemimpin-no">' + no + '</span>' +
                'Kegiatan / Pemimpin yang Diikuti' +
            '</div>' +
            '<button type="button" class="btn-hapus-grup" onclick="hapusGrupPemimpin(this)">&#10005; Hapus</button>' +
        '</div>' +
        blokPemimpin +
        '<div class="form-group">' +
            '<label>Tujuan / Lokasi Kegiatan</label>' +
            '<select class="tujuan-select" onchange="onTujuanSelect(this)">' +
                optLokasi +
            '</select>' +
            '<input type="hidden" class="input-tujuan-teks">' +
        '</div>' +
        '<div class="petugas-wrap">' +
            '<span class="petugas-label">Petugas yang Meliput / Ditugaskan:</span>' +
            '<div class="petugas-list"></div>' +
            '<button type="button" class="btn-tambah-petugas" onclick="tambahPetugas(this)">' +
                '&#10133; Tambahkan Petugas' +
            '</button>' +
        '</div>';
    wrap.appendChild(div);

    // Inisialisasi TomSelect setelah elemen masuk DOM
    var selPemimpin = div.querySelector('.pemimpin-select');
    if (mode === 'dropdown' && selPemimpin) initTomSelectPemimpin(selPemimpin);

    // TomSelect petugas pertama
    if (ndMaster.length > 0) {
        var petWrap = div.querySelector('.petugas-list');
        if (petWrap) {
            var blok = document.createElement('div');
            blok.style.marginBottom = '8px';
            blok.innerHTML = '<select class="petugas-select" multiple></select>';
            petWrap.appendChild(blok);
            initTomSelectPetugas(blok.querySelector('select'));
        }
    }

    renderRingkasan();
}
window.tambahGrupPemimpin = tambahGrupPemimpin;

// Pemimpin dropdown dipilih → sinkron ke hidden input
window.onPemimpinSelect = function(sel) {
    var grup = sel.closest('.grup-pemimpin');
    var tx = grup ? grup.querySelector('.input-pemimpin-teks') : null;
    if (tx) {
        if (sel.value) {
            var p = ndDewanList.find(function(x){ return x.id === String(sel.value); });
            tx.value = p ? p.nama : '';
        } else {
            tx.value = '';
        }
    }
    renderRingkasan();
};

// Lokasi dropdown dipilih → sinkron ke hidden input
window.onTujuanSelect = function(sel) {
    var grup = sel.closest('.grup-pemimpin');
    var tx = grup ? grup.querySelector('.input-tujuan-teks') : null;
    if (tx) {
        tx.value = sel.value ? sel.value.split('|')[1] || '' : '';
    }
    renderRingkasan();
};

function hapusGrupPemimpin(btn) {
    var grup = btn.closest('.grup-pemimpin');
    if (grup) grup.remove();
    var wrap = document.getElementById('grupPemimpinWrap');
    if (wrap) {
        wrap.querySelectorAll('.grup-pemimpin').forEach(function(g, i){
            var n = g.querySelector('.grup-pemimpin-no');
            if (n) n.textContent = i + 1;
        });
    }
    renderRingkasan();
}
window.hapusGrupPemimpin = hapusGrupPemimpin;

// ==================================================================
// PETUGAS — TomSelect multi-select
// ==================================================================
function tambahPetugas(btn) {
    var wrapEl = btn.closest('.petugas-wrap');
    var listEl = wrapEl ? wrapEl.querySelector('.petugas-list') : null;
    if (!listEl) return;

    var blok = document.createElement('div');
    blok.style.marginBottom = '8px';
    blok.innerHTML = '<select class="petugas-select" multiple></select>';
    listEl.appendChild(blok);

    var sel = blok.querySelector('select');
    if (ndMaster.length > 0) {
        initTomSelectPetugas(sel);
    } else {
        // master belum loaded: coba lagi nanti
        sel._pendingInit = true;
    }
}
window.tambahPetugas = tambahPetugas;

// ==================================================================
// AMBIL DATA GRUP
// ==================================================================
function ndAmbilGrup() {
    var wrap = document.getElementById('grupPemimpinWrap');
    if (!wrap) return [];
    var hasil = [];
    wrap.querySelectorAll('.grup-pemimpin').forEach(function(g){
        var pemimpin   = (g.querySelector('.input-pemimpin-teks') || {}).value || '';
        var tujuanTeks  = (g.querySelector('.input-tujuan-teks') || {}).value || '';
        var tujuanId    = '';
        var tujuanSel   = g.querySelector('.tujuan-select');
        if (tujuanSel && tujuanSel.value) {
            var p = tujuanSel.value.split('|');
            tujuanId   = p[0] || '';
            tujuanTeks = p[1] || tujuanTeks;
        }
        var petugas = [];
        g.querySelectorAll('.petugas-select').forEach(function(sel){
            if (sel._ts) {
                sel._ts.items.forEach(function(v){
                    var p = ndMaster.find(function(x){ return x.id === String(v); });
                    if (p) petugas.push({ id: p.id, nama: p.nama, jabatan: p.jabatan, nip: p.nip });
                });
            }
        });
        if (pemimpin.trim() || petugas.length || tujuanTeks) {
            hasil.push({
                pemimpin: pemimpin.trim(),
                tujuan:   tujuanTeks.trim(),
                tujuanId: tujuanId,
                petugas:  petugas
            });
        }
    });
    return hasil;
}

// ==================================================================
// RINGKASAN
// ==================================================================
function renderRingkasan() {
    var grup = ndAmbilGrup();
    var section = document.getElementById('terpilihSection');
    var list = document.getElementById('terpilihList');
    if (!section || !list) return;

    ndPegawai = [];
    grup.forEach(function(g){
        g.petugas.forEach(function(p){
            if (!ndPegawai.some(function(x){ return x.id === p.id; })) ndPegawai.push(p);
        });
    });

    if (grup.length === 0) { section.style.display = 'none'; list.innerHTML = ''; return; }
    section.style.display = '';
    list.innerHTML = grup.map(function(g, i){
        var namaPetugas = g.petugas.length
            ? g.petugas.map(function(p){ return p.nama; }).join(', ')
            : '<i style="color:#dc2626">Belum ada petugas</i>';
        return '<div class="ringkas-item">' +
               '<div class="judul">' + (i+1) + '. ' + ndEsc(g.pemimpin || '(belum diisi)') +
                 (g.tujuan ? ' &rarr; ' + ndEsc(g.tujuan) : '') + '</div>' +
               '<div class="petugas-teks">Petugas: ' + ndEsc(namaPetugas) + '</div>' +
               '</div>';
    }).join('');
}
window.renderRingkasan = renderRingkasan;

// ==================================================================
// LANGKAH 1: PILIH TIPE (DD / LD)
// ==================================================================
function pilihJenis(tipe) {
    ndTipe     = tipe;
    ndKategori = null;
    ndPegawai  = [];

    ['formSection','pegawaiSection','aksiSection','labelTerpilih'].forEach(function(id){
        var e = document.getElementById(id); if(e) e.style.display = 'none';
    });
    var badge = document.getElementById('badgeJenis');
    if (badge) { badge.textContent = ''; badge.className = 'kategori-badge'; }
    var lbl = document.getElementById('labelKategori');
    if (lbl) lbl.textContent = '';

    // Load master data (kecuali sebelumnya sudah loaded)
    if (ndMaster.length === 0) {
        loadMasterNd();
    }

    var wrap  = document.getElementById('kategoriWrapper');
    var sel   = document.getElementById('selectKategori');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Pilih Jenis Nota Dinas --</option>';

    var options = {
        DD: [
            {value:'sosper',        label:'&#127891; Sosper DD'},
            {value:'komisi_dd',      label:'&#128101; Komisi DD'},
            {value:'keg_ketua_dd',   label:'&#127968; Keg. Ketua DD'},
            {value:'undangan_dd',    label:'&#128236; Undangan DD'},
            {value:'komparasi_dd',   label:'&#128202; Komparasi DD'},
        ],
        LD: [
            {value:'sosrev',         label:'&#128227; SOSREV LD'},
            {value:'komisi_ld',      label:'&#128101; Komisi LD'},
            {value:'keg_ketua_ld',  label:'&#127968; Keg. Ketua LD'},
            {value:'undangan_ld',   label:'&#128236; Undangan LD'},
            {value:'komparasi_ld',  label:'&#128202; Komparasi LD'},
            {value:'pansus_ld',     label:'&#128209; Pansus LD'},
        ]
    };

    var opts = options[tipe] || [];
    opts.forEach(function(o){
        sel.innerHTML += '<option value="'+ o.value +'|'+ tipe +'">'+ o.label +'</option>';
    });

    if (wrap) wrap.style.display = '';
    sel.value = '';
}
window.pilihJenis = pilihJenis;

// ==================================================================
// LANGKAH 2: PILIH KATEGORI
// ==================================================================
var ND_LABEL = {
    sosper:'Sosper DD', sosrev:'SOSREV LD', komisi_dd:'Komisi DD', komisi_ld:'Komisi LD',
    keg_ketua_dd:'Keg. Ketua DD', keg_ketua_ld:'Keg. Ketua LD',
    undangan_dd:'Undangan DD', undangan_ld:'Undangan LD',
    komparasi_dd:'Komparasi DD', komparasi_ld:'Komparasi LD', pansus_ld:'Pansus LD'
};

function pilihKategori(val) {
    if (!val) return;
    var parts = val.split('|');
    var key   = parts[0];
    var tipe  = parts[1];
    ndKategori = key;
    ndPegawai  = [];

    var badge = document.getElementById('badgeJenis');
    if (badge) { badge.textContent = tipe; badge.className = 'kategori-badge ' + tipe; }
    var lbl = document.getElementById('labelKategori');
    if (lbl) lbl.textContent = '— ' + (ND_LABEL[key] || key);
    var lt = document.getElementById('labelTerpilih');
    if (lt) lt.style.display = '';

    ['formSection','pegawaiSection','aksiSection'].forEach(function(id){
        var e = document.getElementById(id); if(e) e.style.display = '';
    });

    // Pastikan data master sudah loaded
    if (ndMaster.length === 0) {
        loadMasterNd().then(function(){
            bangunUlangGrupPemilih();
        });
    } else {
        bangunUlangGrupPemilih();
    }

    var map = {
        sosper:'btnCetakSosper', sosrev:'btnCetakSosrev',
        komisi_dd:'btnCetakKomisi', komisi_ld:'btnCetakKomisi',
        keg_ketua_dd:'btnCetakKetua', keg_ketua_ld:'btnCetakKetua',
        undangan_dd:'btnCetakUndangan', undangan_ld:'btnCetakUndangan',
        komparasi_dd:'btnCetakKomparasi', komparasi_ld:'btnCetakKomparasi',
        pansus_ld:'btnCetakPansus'
    };
    var showId = map[key] || null;
    ['btnCetakSosper','btnCetakSosrev','btnCetakKomisi','btnCetakKetua',
     'btnCetakUndangan','btnCetakKomparasi','btnCetakPansus'].forEach(function(id){
        var b = document.getElementById(id);
        if (b) b.style.display = (id === showId) ? '' : 'none';
    });
}

// Bangun ulang grup: hapus semua, tambah baru dengan mode+data terkini
function bangunUlangGrupPemilih() {
    var wrap = document.getElementById('grupPemimpinWrap');
    if (wrap) wrap.innerHTML = '';
    tambahGrupPemimpin();
    renderRingkasan();
}
window.pilihKategori = pilihKategori;

// ==================================================================
// AMBIL DATA FORM
// ==================================================================
function ndAmbilForm() {
    var g = function(id){ var e=document.getElementById(id); return e ? e.value.trim() : ''; };
    var grup = ndAmbilGrup();
    return {
        tipe: ndTipe,
        kategori: ndKategori,
        nomor:      g('nomorND'),
        tanggal:     g('tanggalND'),
        dasar:      g('dasarKeputusan'),
        lokasi:     g('lokasiKeg'),
        tgl_mulai:  g('tglMulai'),
        tgl_selesai: g('tglSelesai'),
        maksud:     g('maksudKeg'),
        pembebanan: g('pembebanan'),
        pegawai:    ndPegawai.map(function(p){ return { id:p.id, nama:p.nama, jabatan:p.jabatan }; }),
        grup:      grup
    };
}

// ==================================================================
// SIMPAN
// ==================================================================
function simpanNotaDinas() {
    if (!ndTipe)      { showAlert('Pilih jenis nota dinas terlebih dahulu (DD/LD).','error'); return; }
    if (!ndKategori)  { showAlert('Pilih kategori nota dinas terlebih dahulu.','error'); return; }

    var grup = ndAmbilGrup();
    if (grup.length === 0) { showAlert('Tambahkan minimal satu pemimpin/kegiatan yang diikuti.','error'); return; }
    if (!grup.some(function(g){ return g.petugas.length > 0; })) {
        showAlert('Tambahkan minimal satu petugas yang meliput.','error'); return;
    }
    // Validasi Sosper: pemimpin wajib dipilih dari dropdown
    if (ndModePemimpin() === 'dropdown' && grup.some(function(g){ return !g.pemimpin; })) {
        showAlert('Pilih Anggota DPRD yang diikuti (dropdown) untuk nota dinas Sosper/SOSREV.','error'); return;
    }

    var btn = document.getElementById('btnSimpan');
    if (btn) btn.disabled = true;
    var st = document.getElementById('simpanStatus');
    if (st) st.textContent = 'Menyimpan...';

    fetch('PHP/api_notadinas.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': ndCsrf()
        },
        credentials: 'same-origin',
        body: JSON.stringify(ndAmbilForm())
    })
    .then(function(r){ return r.json(); })
    .then(function(json){
        if (btn) btn.disabled = false;
        if (st) st.textContent = '';
        if (json.status === 'success') {
            showAlert('Nota Dinas berhasil disimpan.','success');
            addRiwayat(ndAmbilForm());
        } else {
            showAlert('Gagal menyimpan: ' + (json.message || 'kesalahan tidak diketahui'),'error');
        }
    })
    .catch(function(e){
        if (btn) btn.disabled = false;
        if (st) st.textContent = '';
        showAlert('Gagal menyimpan: ' + (e.message || 'kesalahan jaringan'),'error');
    });
}
window.simpanNotaDinas = simpanNotaDinas;

function showAlert(msg, tipe) {
    var box = document.getElementById('alertBox');
    if (!box) { alert(msg); return; }
    box.textContent = msg;
    box.className   = 'alert-box ' + tipe;
    box.style.display = '';
    if (tipe === 'success') setTimeout(function(){ box.style.display='none'; }, 3500);
}

// ==================================================================
// RIWAYAT (localStorage)
// ==================================================================
function addRiwayat(data) {
    var rows = JSON.parse(localStorage.getItem('nd_riwayat') || '[]');
    rows.unshift({
        tipe: data.tipe, kategori: data.kategori,
        nomor: data.nomor, tanggal: data.tanggal,
        pegawai: data.pegawai || []
    });
    if (rows.length > 50) rows = rows.slice(0, 50);
    localStorage.setItem('nd_riwayat', JSON.stringify(rows));
    loadRiwayatNotaDinas();
}

function loadRiwayatNotaDinas() {
    var rows = JSON.parse(localStorage.getItem('nd_riwayat') || '[]');
    var body = document.getElementById('notaDinasBody');
    if (!body) return;
    if (rows.length === 0) {
        body.innerHTML = '<tr><td colspan="7" style="padding:20px; text-align:center; color:#94a3b8;">Belum ada nota dinas tersimpan.</td></tr>';
        return;
    }
    body.innerHTML = rows.map(function(r, i){
        var nama = (r.pegawai || []).map(function(p){ return p.nama; }).join(', ');
        if (nama.length > 40) nama = nama.substring(0,40) + '…';
        return '<tr style="border-bottom:1px solid #f1f5f9;">' +
               '<td style="padding:10px 12px;">' + (i+1) + '</td>' +
               '<td style="padding:10px 12px;"><span class="kategori-badge ' + ndEsc(r.tipe) + '">' + ndEsc(r.tipe) + '</span></td>' +
               '<td style="padding:10px 12px;">' + ndEsc(ND_LABEL[r.kategori] || r.kategori || '-') + '</td>' +
               '<td style="padding:10px 12px;">' + ndEsc(r.nomor || '-') + '</td>' +
               '<td style="padding:10px 12px;">' + ndEsc(r.tanggal || '-') + '</td>' +
               '<td style="padding:10px 12px;">' + ndEsc(nama || '-') + '</td>' +
               '<td style="padding:10px 12px;">' +
               '<button onclick="hapusRiwayat(' + i + ')" style="background:#ef4444; color:#fff; border:none; border-radius:6px; padding:4px 10px; font-size:12px; cursor:pointer;">&#128465;</button>' +
               '</td></tr>';
    }).join('');
}

function hapusRiwayat(idx) {
    var rows = JSON.parse(localStorage.getItem('nd_riwayat') || '[]');
    rows.splice(idx, 1);
    localStorage.setItem('nd_riwayat', JSON.stringify(rows));
    loadRiwayatNotaDinas();
}
window.hapusRiwayat = hapusRiwayat;

// ==================================================================
// CETAK — tombol TERPISAH per kategori
// ==================================================================
function ndCetak(fnName) {
    if (!ndKategori) { showAlert('Pilih kategori nota dinas terlebih dahulu.','error'); return; }
    if (ndPegawai.length === 0) { showAlert('Pilih minimal satu pegawai.','error'); return; }

    var fn = window[fnName];
    if (typeof fn !== 'function') { alert('Fungsi cetak "' + fnName + '" belum tersedia.'); return; }

    addRiwayat(ndAmbilForm());

    var template = document.getElementById('printTemplate');
    if (!template) { alert('Template cetak tidak ditemukan.'); return; }
    template.innerHTML = '';
    fn(ndAmbilForm(), template);
    setTimeout(function(){ window.print(); }, 300);
}

function cetakNotadinasSosper()    { ndCetak('cetakLayoutSosper'); }
function cetakNotadinasSosrev()    { ndCetak('cetakLayoutSosrev'); }
function cetakNotadinasKomisi()    { ndCetak('cetakLayoutKomisi'); }
function cetakNotadinasKetua()     { ndCetak('cetakLayoutKetua'); }
function cetakNotadinasUndangan()  { ndCetak('cetakLayoutUndangan'); }
function cetakNotadinasKomparasi() { ndCetak('cetakLayoutKomparasi'); }
function cetakNotadinasPansus()   { ndCetak('cetakLayoutPansus'); }

window.cetakNotadinasSosper    = cetakNotadinasSosper;
window.cetakNotadinasSosrev    = cetakNotadinasSosrev;
window.cetakNotadinasKomisi    = cetakNotadinasKomisi;
window.cetakNotadinasKetua     = cetakNotadinasKetua;
window.cetakNotadinasUndangan  = cetakNotadinasUndangan;
window.cetakNotadinasKomparasi = cetakNotadinasKomparasi;
window.cetakNotadinasPansus    = cetakNotadinasPansus;
