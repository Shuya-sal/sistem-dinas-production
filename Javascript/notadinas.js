// ================================================================
// NOTA DINAS — Javascript/notadinas.js
// Dipasangkan dengan notadinas.html (versi server live).
// Alur: pilih tipe (DD/LD) → pilih kategori → isi form →
//       pilih pegawai → simpan → cetak (tombol TERPISAH per kategori).
// ================================================================

// ---------- STATE ----------
var ndTipe     = null;   // 'DD' | 'LD'
var ndKategori = null;   // key kategori
var ndPegawai  = [];     // pegawai terpilih
var ndMaster   = [];     // daftar pegawai dari server

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

// ================================================================
// INIT — dipanggil oleh navigasiSPA() di gembok.js
// ================================================================
function initNotaDinasSPA() {
    ndTipe     = null;
    ndKategori = null;
    ndPegawai  = [];
    ndMaster   = [];

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

    loadDaftarPegawai();
    loadRiwayatNotaDinas();
}
window.initNotaDinasSPA = initNotaDinasSPA;

// ================================================================
// LANGKAH 1: PILIH TIPE (DD / LD)
// ================================================================
function pilihJenis(tipe) {
    ndTipe     = tipe;
    ndKategori = null;
    ndPegawai  = [];

    // Reset UI
    ['formSection','pegawaiSection','aksiSection','labelTerpilih'].forEach(function(id){
        var e = document.getElementById(id); if(e) e.style.display = 'none';
    });
    var badge = document.getElementById('badgeJenis');
    if (badge) { badge.textContent = ''; badge.className = 'kategori-badge'; }
    var lbl = document.getElementById('labelKategori');
    if (lbl) lbl.textContent = '';

    // Tampilkan dropdown kategori + isi option sesuai tipe
    var wrap  = document.getElementById('kategoriWrapper');
    var sel   = document.getElementById('selectKategori');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Pilih Jenis Nota Dinas --</option>';

    var options = {
        DD: [
            {value:'sosper',       label:'&#127891; Sosper DD'},
            {value:'komisi_dd',     label:'&#128101; Komisi DD'},
            {value:'keg_ketua_dd',  label:'&#127968; Keg. Ketua DD'},
            {value:'undangan_dd',   label:'&#128236; Undangan DD'},
            {value:'komparasi_dd',  label:'&#128202; Komparasi DD'},
        ],
        LD: [
            {value:'sosrev',        label:'&#128227; SOSREV LD'},
            {value:'komisi_ld',     label:'&#128101; Komisi LD'},
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

// ================================================================
// LANGKAH 2: PILIH KATEGORI
// ================================================================
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

    renderTerpilih();
    renderPegawaiList(ndMaster);

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
window.pilihKategori = pilihKategori;


// ================================================================
// PEGAWAI PICKER — pilih dari daftar pegawai yang ada
// ================================================================
function loadDaftarPegawai() {
    fetch('PHP/api_pegawai.php', {
        headers: { 'X-CSRF-Token': ndCsrf() },
        credentials: 'same-origin'
    })
    .then(function(r){ return r.json(); })
    .then(function(json){
        var list = Array.isArray(json) ? json : (json.data || []);
        ndMaster = list.map(function(p){
            return {
                id: p.id || p.pegawai_id,
                nama: p.nama || p.nama_pegawai || '',
                jabatan: p.jabatan || p.nama_jabatan || '',
                foto: p.foto || p.foto_url || 'Image/default.jpg'
            };
        });
        var cp = document.getElementById('countPegawai');
        if (cp) cp.textContent = ndMaster.length + ' orang';
        renderPegawaiList(ndMaster);
    })
    .catch(function(){
        var cp = document.getElementById('countPegawai');
        if (cp) cp.textContent = 'Gagal memuat';
    });
}

function renderPegawaiList(list) {
    var container = document.getElementById('pegawaiList');
    if (!container) return;
    if (!list || list.length === 0) {
        container.innerHTML = '<div style="padding:20px; text-align:center; color:#94a3b8; font-size:13px; grid-column:1/-1;">Tidak ada pegawai ditemukan.</div>';
        return;
    }
    container.innerHTML = list.map(function(p){
        var selected = ndPegawai.some(function(x){ return x.id === p.id; });
        var idx = ndMaster.indexOf(p);
        var foto = p.foto || 'Image/default.jpg';
        return '<div class="pegawai-item' + (selected ? ' selected' : '') + '" ' +
               'onclick="togglePegawai(' + idx + ')">' +
               '<img src="' + ndEsc(foto) + '" alt="Foto ' + ndEsc(p.nama) + '" ' +
               'loading="lazy" width="44" height="44" ' +
               'onerror="this.onerror=null;this.src=\'Image/default.jpg\'">' +
               '<div class="pegawai-item-info">' +
               '<div class="pegawai-item-nama">' + ndEsc(p.nama) + '</div>' +
               '<div class="pegawai-item-jabatan">' + ndEsc(p.jabatan) + '</div>' +
               '</div>' +
               (selected ? '<span class="cek">&#10003;</span>' : '') +
               '</div>';
    }).join('');
}

function togglePegawai(index) {
    var p = ndMaster[index];
    if (!p) return;
    var i = -1;
    for (var k=0;k<ndPegawai.length;k++) if (ndPegawai[k].id === p.id) { i=k; break; }
    if (i >= 0) ndPegawai.splice(i,1); else ndPegawai.push(p);
    renderPegawaiList(ndMaster);
    renderTerpilih();
}
window.togglePegawai = togglePegawai;

function renderTerpilih() {
    var section = document.getElementById('terpilihSection');
    var list    = document.getElementById('terpilihList');
    var count   = document.getElementById('countTerpilih');
    if (count) count.textContent = ndPegawai.length;
    if (section) section.style.display = ndPegawai.length > 0 ? '' : 'none';
    if (!list) return;
    list.innerHTML = ndPegawai.map(function(p, i){
        return '<div class="terpilih-item">' +
               '<div class="terpilih-nama">' + ndEsc(p.nama) + '</div>' +
               '<div class="terpilih-jabatan">' + ndEsc(p.jabatan) + '</div>' +
               '<button class="btn-hapus-terpilih" onclick="hapusTerpilih(' + i + ')">&#10005;</button>' +
               '</div>';
    }).join('');
}

function hapusTerpilih(index) {
    ndPegawai.splice(index, 1);
    renderPegawaiList(ndMaster);
    renderTerpilih();
}
window.hapusTerpilih = hapusTerpilih;

function filterPegawaiPicker() {
    var el = document.getElementById('searchPegawai');
    var q = (el ? el.value : '').toLowerCase();
    var filtered = ndMaster.filter(function(p){
        return (p.nama||'').toLowerCase().indexOf(q) >= 0 ||
               (p.jabatan||'').toLowerCase().indexOf(q) >= 0;
    });
    renderPegawaiList(filtered);
}
window.filterPegawaiPicker = filterPegawaiPicker;

// ================================================================
// AMBIL DATA FORM
// ================================================================
function ndAmbilForm() {
    var g = function(id){ var e=document.getElementById(id); return e ? e.value.trim() : ''; };
    return {
        tipe: ndTipe, kategori: ndKategori,
        nomor:       g('nomorND'),
        tanggal:     g('tanggalND'),
        dasar:       g('dasarKeputusan'),
        lokasi:      g('lokasiKeg'),
        tgl_mulai:   g('tglMulai'),
        tgl_selesai: g('tglSelesai'),
        maksud:      g('maksudKeg'),
        pembebanan:  g('pembebanan'),
        pegawai: ndPegawai.map(function(p){ return { id:p.id, nama:p.nama, jabatan:p.jabatan }; })
    };
}

// ================================================================
// SIMPAN
// ================================================================
function simpanNotaDinas() {
    if (!ndTipe)      { showAlert('Pilih jenis nota dinas terlebih dahulu (DD/LD).','error'); return; }
    if (!ndKategori)  { showAlert('Pilih kategori nota dinas terlebih dahulu.','error'); return; }
    if (ndPegawai.length === 0) { showAlert('Pilih minimal satu pegawai.','error'); return; }

    var btn = document.getElementById('btnSimpan');
    if (btn) btn.disabled = true;
    var st = document.getElementById('simpanStatus'); if (st) st.textContent = 'Menyimpan...';

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
        if (json.success) {
            showAlert('Nota Dinas berhasil disimpan.','success');
            addRiwayat(ndAmbilForm());
        } else {
            showAlert('Gagal menyimpan: ' + (json.error || 'kesalahan tidak diketahui'),'error');
        }
    })
    .catch(function(e){
        if (btn) btn.disabled = false;
        if (st) st.textContent = '';
        showAlert('Gagal menyimpan: ' + e.message,'error');
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

// ================================================================
// RIWAYAT (localStorage)
// ================================================================
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

// ================================================================
// CETAK — tombol TERPISAH per kategori (tidak digabung)
// ================================================================
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
function cetakNotadinasPansus()    { ndCetak('cetakLayoutPansus'); }

window.cetakNotadinasSosper    = cetakNotadinasSosper;
window.cetakNotadinasSosrev    = cetakNotadinasSosrev;
window.cetakNotadinasKomisi    = cetakNotadinasKomisi;
window.cetakNotadinasKetua     = cetakNotadinasKetua;
window.cetakNotadinasUndangan  = cetakNotadinasUndangan;
window.cetakNotadinasKomparasi = cetakNotadinasKomparasi;
window.cetakNotadinasPansus    = cetakNotadinasPansus;
