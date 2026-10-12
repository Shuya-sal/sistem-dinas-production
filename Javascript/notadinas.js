// ================================================================
// NOTA DINAS — Javascript/notadinas.js
// Form pembuatan Nota Dinas (DD & LD), 11 jenis, tombol cetak TERPISAH.
// ================================================================

// ---------- KONFIGURASI JENIS PER TIPE ----------
const ND_JENIS = {
    DD: [
        { key: 'sosper',    label: 'Sosper',           cetak: 'cetakLayoutSosper'   },
        { key: 'sosrev',    label: 'Sosrev',           cetak: 'cetakLayoutSosrev'   },
        { key: 'komisi',    label: 'Komisi DD',        cetak: 'cetakLayoutKomisi'   },
        { key: 'ketua',     label: 'Kegiatan Ketua',   cetak: 'cetakLayoutKetua'    },
        { key: 'undangan',  label: 'Undangan',         cetak: 'cetakLayoutUndangan' },
        { key: 'komparasi', label: 'Komparasi',        cetak: 'cetakLayoutKomparasi'}
    ],
    LD: [
        { key: 'komisi',    label: 'Komisi LD',        cetak: 'cetakLayoutKomisi'   },
        { key: 'pansus',    label: 'Pansus LD',        cetak: 'cetakLayoutPansus'   },
        { key: 'ketua',     label: 'Kegiatan Ketua',   cetak: 'cetakLayoutKetua'    },
        { key: 'undangan',  label: 'Undangan',         cetak: 'cetakLayoutUndangan' },
        { key: 'komparasi', label: 'Komparasi',        cetak: 'cetakLayoutKomparasi'}
    ]
};

// ---------- STATE ----------
let ndState = {
    tipe: null,          // 'DD' | 'LD'
    jenis: null,         // key dari ND_JENIS
    pegawai: [],         // daftar pegawai terpilih
    daftarPegawai: []    // master daftar pegawai dari server
};

function ndEsc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function ndCsrf() {
    return sessionStorage.getItem('csrf_token') || '';
}

// ================================================================
// INIT (dipanggil oleh navigasiSPA di gembok.js)
// ================================================================
function initNotaDinasSPA() {
    ndState.tipe = null;
    ndState.jenis = null;
    ndState.pegawai = [];

    // Muat daftar pegawai untuk dropdown
    ndMuatDaftarPegawai();

    // Render pilihan tipe di awal
    ndRenderPilihTipe();

    // Sembunyikan area form & tombol cetak
    const areaForm = document.getElementById('ndAreaForm');
    if (areaForm) areaForm.style.display = 'none';
    const areaCetak = document.getElementById('ndAreaCetak');
    if (areaCetak) areaCetak.style.display = 'none';
}
window.initNotaDinasSPA = initNotaDinasSPA;

// ================================================================
// LOAD DATA PEGAWAI (untuk pilih orang dari daftar)
// ================================================================
async function ndMuatDaftarPegawai() {
    try {
        const res = await fetch('PHP/api_pegawai.php', {
            headers: { 'X-CSRF-Token': ndCsrf() },
            credentials: 'same-origin'
        });
        const json = await res.json();
        const list = Array.isArray(json) ? json : (json.data || []);
        ndState.daftarPegawai = list.map(p => ({
            id: p.id ?? p.pegawai_id,
            nama: p.nama ?? p.nama_pegawai ?? '',
            jabatan: p.jabatan ?? p.nama_jabatan ?? ''
        }));
        ndRenderDropdownPegawai();
    } catch (e) {
        console.warn('Gagal memuat daftar pegawai:', e);
        ndState.daftarPegawai = [];
    }
}

function ndRenderDropdownPegawai() {
    const sel = document.getElementById('ndPilihPegawai');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Pilih Pegawai --</option>' +
        ndState.daftarPegawai.map((p,i) =>
            `<option value="${i}">${ndEsc(p.nama)}${p.jabatan ? ' — '+ndEsc(p.jabatan) : ''}</option>`
        ).join('');
}

// ================================================================
// LANGKAH 1: PILIH TIPE (DD / LD)
// ================================================================
function ndRenderPilihTipe() {
    const wrap = document.getElementById('ndPilihTipeWrap');
    if (!wrap) return;
    wrap.innerHTML = `
        <div style="display:flex; gap:15px; flex-wrap:wrap;">
            <button type="button" class="nav-btn" style="padding:14px 28px; font-size:15px;"
                onclick="ndPilihTipe('DD')">📍 Dalam Daerah (DD)</button>
            <button type="button" class="nav-btn" style="padding:14px 28px; font-size:15px;"
                onclick="ndPilihTipe('LD')">✈️ Luar Daerah (LD)</button>
        </div>
    `;
}

function ndPilihTipe(tipe) {
    ndState.tipe = tipe;
    ndState.jenis = null;
    ndState.pegawai = [];

    // Tampilkan area form, sembunyikan pilihan cetak
    document.getElementById('ndAreaForm').style.display = '';
    document.getElementById('ndAreaCetak').style.display = 'none';

    ndRenderJenis();
    ndRenderPegawaiTerpilih();
    ndRenderTombolCetak();
    ndResetFormFields();
}

// ================================================================
// LANGKAH 2: PILIH JENIS NOTA DINAS
// ================================================================
function ndRenderJenis() {
    const wrap = document.getElementById('ndPilihJenisWrap');
    if (!wrap) return;
    const list = ND_JENIS[ndState.tipe] || [];
    wrap.innerHTML = list.map(j =>
        `<button type="button" class="nav-btn" data-jenis="${j.key}"
            style="padding:10px 18px; font-size:13px;"
            onclick="ndPilihJenis('${j.key}')">${ndEsc(j.label)}</button>`
    ).join('');
}

function ndPilihJenis(key) {
    ndState.jenis = key;
    document.querySelectorAll('#ndPilihJenisWrap .nav-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.jenis === key);
    });
    // Tampilkan tombol cetak untuk jenis ini
    document.getElementById('ndAreaCetak').style.display = '';
    ndRenderTombolCetak();
}

// ================================================================
// LANGKAH 3: PILIH PEGAWAI DARI DAFTAR
// ================================================================
function ndTambahPegawai() {
    const sel = document.getElementById('ndPilihPegawai');
    if (!sel || sel.value === '') return;
    const p = ndState.daftarPegawai[parseInt(sel.value, 10)];
    if (!p) return;
    if (ndState.pegawai.some(x => x.id === p.id)) {
        alert('Pegawai ini sudah ditambahkan.');
        return;
    }
    ndState.pegawai.push(p);
    sel.value = '';
    ndRenderPegawaiTerpilih();
}

function ndHapusPegawai(idx) {
    ndState.pegawai.splice(idx, 1);
    ndRenderPegawaiTerpilih();
}

function ndRenderPegawaiTerpilih() {
    const wrap = document.getElementById('ndDaftarPegawaiTerpilih');
    if (!wrap) return;
    if (ndState.pegawai.length === 0) {
        wrap.innerHTML = '<div style="color:#94a3b8; font-size:13px; padding:8px;">Belum ada pegawai dipilih.</div>';
        return;
    }
    wrap.innerHTML = ndState.pegawai.map((p,i) => `
        <div style="display:flex; justify-content:space-between; align-items:center;
                    padding:8px 12px; background:#f8fafc; border:1px solid #e2e8f0;
                    border-radius:8px; margin-bottom:6px;">
            <div style="font-size:13px;">
                <strong>${ndEsc(p.nama)}</strong>
                <span style="color:#64748b;">${p.jabatan ? ' — '+ndEsc(p.jabatan) : ''}</span>
            </div>
            <button type="button" onclick="ndHapusPegawai(${i})"
                style="background:#ef4444; color:#fff; border:none; border-radius:6px;
                       padding:4px 10px; cursor:pointer; font-size:12px;">Hapus</button>
        </div>
    `).join('');
}

// ================================================================
// FORM FIELDS
// ================================================================
function ndResetFormFields() {
    ['ndNomor','ndTanggal','ndTglMulai','ndTglSelesai','ndMaksud','ndLokasi','ndPembebanan','ndDasar']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const t = document.getElementById('ndTanggal');
    if (t && !t.value) t.value = new Date().toISOString().slice(0,10);
}

function ndKumpulkanData() {
    const g = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    return {
        tipe: ndState.tipe,
        jenis: ndState.jenis,
        nomor: g('ndNomor'),
        tanggal: g('ndTanggal'),
        tgl_mulai: g('ndTglMulai'),
        tgl_selesai: g('ndTglSelesai'),
        maksud: g('ndMaksud'),
        lokasi: g('ndLokasi'),
        pembebanan: g('ndPembebanan'),
        dasar: g('ndDasar'),
        pegawai: ndState.pegawai.map(p => ({ id: p.id, nama: p.nama, jabatan: p.jabatan }))
    };
}

// ================================================================
// SIMPAN KE DATABASE
// ================================================================
async function ndSimpan() {
    if (!ndState.tipe)  { alert('Pilih tipe Nota Dinas terlebih dahulu.'); return; }
    if (!ndState.jenis) { alert('Pilih jenis Nota Dinas terlebih dahulu.'); return; }
    if (ndState.pegawai.length === 0) { alert('Pilih minimal satu pegawai.'); return; }

    const data = ndKumpulkanData();
    try {
        const res = await fetch('PHP/api_notadinas.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': ndCsrf()
            },
            credentials: 'same-origin',
            body: JSON.stringify(data)
        });
        const json = await res.json();
        if (json.success) {
            alert('Nota Dinas berhasil disimpan.');
        } else {
            alert('Gagal menyimpan: ' + (json.error || 'kesalahan tidak diketahui'));
        }
    } catch (e) {
        alert('Gagal menyimpan: ' + e.message);
    }
}

// ================================================================
// TOMBOL CETAK — TERPISAH PER JENIS
// ================================================================
function ndRenderTombolCetak() {
    const wrap = document.getElementById('ndAreaCetak');
    if (!wrap) return;
    if (!ndState.jenis) { wrap.innerHTML = ''; return; }

    const list = ND_JENIS[ndState.tipe] || [];
    const jenis = list.find(j => j.key === ndState.jenis);
    if (!jenis) { wrap.innerHTML = ''; return; }

    // tombol cetak khusus jenis yang sedang aktif (tidak digabung)
    wrap.innerHTML = `
        <div style="margin-top:15px; padding:12px; background:#f0f9ff;
                    border:1px solid #bae6fd; border-radius:8px;">
            <div style="font-size:13px; color:#0369a1; margin-bottom:8px;">
                Cetak Nota Dinas — <strong>${ndEsc(jenis.label)} ${ndState.tipe}</strong>
            </div>
            <button type="button" class="nav-btn"
                style="background:#0284c7; color:#fff; border-color:#0284c7; padding:10px 22px;"
                onclick="ndCetak()">🖨️ Cetak ${ndEsc(jenis.label)}</button>
        </div>
    `;
}

function ndCetak() {
    if (!ndState.jenis) { alert('Pilih jenis Nota Dinas terlebih dahulu.'); return; }
    if (ndState.pegawai.length === 0) { alert('Pilih minimal satu pegawai.'); return; }

    const list = ND_JENIS[ndState.tipe] || [];
    const jenis = list.find(j => j.key === ndState.jenis);
    if (!jenis) return;

    const data = ndKumpulkanData();
    const template = document.getElementById('printTemplate');
    if (!template) { alert('Template cetak tidak ditemukan.'); return; }

    const fn = window[jenis.cetak];
    if (typeof fn !== 'function') {
        alert('Fungsi cetak "' + jenis.cetak + '" belum tersedia.');
        return;
    }

    fn(data, template);
    setTimeout(() => window.print(), 300);
}

// ================================================================
// EKSPOR KE WINDOW
// ================================================================
window.ndPilihTipe        = ndPilihTipe;
window.ndPilihJenis       = ndPilihJenis;
window.ndTambahPegawai    = ndTambahPegawai;
window.ndHapusPegawai     = ndHapusPegawai;
window.ndSimpan           = ndSimpan;
window.ndCetak            = ndCetak;
window.ndRenderTombolCetak = ndRenderTombolCetak;
