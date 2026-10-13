// ================================================================
// TEST notadinas — uji murni (tanpa browser), dijalankan dgn node.
//   node tests/notadinas.test.js
// ================================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(name, cond, extra) {
    if (cond) { pass++; console.log('  \u2713 ' + name); }
    else { fail++; console.log('  \u2717 ' + name + (extra ? '  → ' + extra : '')); }
}
function eq(name, got, want) {
    ok(name, JSON.stringify(got) === JSON.stringify(want),
       'got=' + JSON.stringify(got) + ' want=' + JSON.stringify(want));
}

// ----------------------------------------------------------------
// Sanitasi kategori (harus sama persis dgn PHP: preg_replace('/[^a-z0-9_]/'))
// ----------------------------------------------------------------
function sanitasiKategori(v) {
    return String(v == null ? '' : v).toLowerCase().replace(/[^a-z0-9_]/g, '');
}

console.log('\n== KATEGORI SOSPER/LD MENENTUKAN MODE ==');
const KATEGORI_SOSPER = ['sosper', 'sosrev'];
function modePemimpin(kategori) {
    // sosper/sosrev → dropdown Anggota DPRD; lainnya → teks bebas
    return KATEGORI_SOSPER.indexOf(sanitasiKategori(kategori)) >= 0 ? 'dropdown' : 'teks';
}
eq('sosper → dropdown', modePemimpin('sosper'), 'dropdown');
eq('sosrev → dropdown', modePemimpin('sosrev'), 'dropdown');
eq('komisi_dd → teks', modePemimpin('komisi_dd'), 'teks');
eq('komisi_ld → teks', modePemimpin('komisi_ld'), 'teks');
eq('komparasi_dd → teks', modePemimpin('komparasi_dd'), 'teks');
eq('pansus_ld → teks', modePemimpin('pansus_ld'), 'teks');
eq('undangan_ld → teks', modePemimpin('undangan_ld'), 'teks');
eq('keg_ketua_dd → teks', modePemimpin('keg_ketua_dd'), 'teks');

console.log('\n== FILTER PEGAWAI: ANGGOTA DPRD vs NON ==');
const PEGAWAI = [
    { id: '1', nama: 'Supian HK',   status: 'Anggota DPRD', jabatan: 'Ketua DPRD' },
    { id: '2', nama: 'H. Kartoyo',  status: 'Anggota DPRD', jabatan: 'Wakil Ketua DPRD' },
    { id: '3', nama: 'Aditya R.',   status: 'PNS',          jabatan: 'Operator Layanan Operasional' },
    { id: '4', nama: 'Budi S.',     status: 'Kontrak',      jabatan: 'Fotografer' },
    { id: '5', nama: 'Citra D.',    status: 'Honorer',      jabatan: 'Juru Kamera' },
];
function isAnggota(p) { return (p.status || '').trim().toLowerCase() === 'anggota dprd'; }
function hanyaAnggotaDprd(list) { return list.filter(isAnggota); }
function hanyaNonAnggotaDprd(list) { return list.filter(p => !isAnggota(p)); }

eq('anggota DPRD terfilter benar',
   hanyaAnggotaDprd(PEGAWAI).map(p => p.nama), ['Supian HK', 'H. Kartoyo']);
eq('petugas = non-anggota DPRD',
   hanyaNonAnggotaDprd(PEGAWAI).map(p => p.nama), ['Aditya R.', 'Budi S.', 'Citra D.']);
ok('tidak ada irisan antara kedua daftar',
   hanyaAnggotaDprd(PEGAWAI).every(p => !hanyaNonAnggotaDprd(PEGAWAI).some(q => q.id === p.id)));

console.log('\n== LOKASI: DIPILAH BERDASARKAN DD/LD ==');
const TUJUAN = [
    { id: 't1', jenis: 'Dalam Daerah', nama: 'Kabupaten Tapin' },
    { id: 't2', jenis: 'Dalam Daerah', nama: 'Kabupaten Hulu Sungai Selatan' },
    { id: 't3', jenis: 'Luar Daerah',  nama: 'Kabupaten Tanah Bumbu' },
    { id: 't4', jenis: 'Luar Daerah',  nama: 'Kota Surabaya' },
];
function jenisTujuanDariTipe(tipe) { return tipe === 'DD' ? 'Dalam Daerah' : 'Luar Daerah'; }
function lokasiUntukTipe(tipe, list) {
    const j = jenisTujuanDariTipe(tipe);
    return list.filter(t => (t.jenis || '').trim().toLowerCase() === j.toLowerCase()).map(t => t.nama);
}
eq('DD → hanya Dalam Daerah',
   lokasiUntukTipe('DD', TUJUAN), ['Kabupaten Tapin', 'Kabupaten Hulu Sungai Selatan']);
eq('LD → hanya Luar Daerah',
   lokasiUntukTipe('LD', TUJUAN), ['Kabupaten Tanah Bumbu', 'Kota Surabaya']);

console.log('\n== MODEL DATA GRUP (pemimpin → petugas) ==');
function ambilGrup(grupEls) {
    // grupEls: array {pemimpin, tujuan, tujuanId, petugas: [{id,...}]}
    return grupEls.filter(g => (g.pemimpin || '').trim() || (g.petugas || []).length)
        .map(g => ({
            pemimpin: (g.pemimpin || '').trim(),
            tujuan:   (g.tujuan || '').trim(),
            tujuanId: g.tujuanId || '',
            petugas:  g.petugas || []
        }));
}
const grup = ambilGrup([
    { pemimpin: 'Supian HK', tujuan: 'Kabupaten Tanah Bumbu', tujuanId: 't3',
      petugas: [{ id: '3', nama: 'Aditya R.' }, { id: '4', nama: 'Budi S.' }] },
    { pemimpin: '', tujuan: '', petugas: [] },                        // harus dibuang
    { pemimpin: 'H. Kartoyo', tujuan: 'Kabupaten Hulu Sungai Selatan', tujuanId: 't2',
      petugas: [{ id: '5', nama: 'Citra D.' }] },
]);
eq('grup kosong dibuang', grup.length, 2);
eq('petugas bisa >1 per pemimpin', grup[0].petugas.length, 2);
eq('urutan grup dipertahankan', grup.map(g => g.pemimpin), ['Supian HK', 'H. Kartoyo']);
eq('tujuanId ikut tersimpan', grup[1].tujuanId, 't2');

console.log('\n== VALIDASI SIMPAN ==');
function validasiSimpan(st) {
    if (!st.tipe) return 'Pilih jenis nota dinas terlebih dahulu (DD/LD).';
    if (!st.kategori) return 'Pilih kategori nota dinas terlebih dahulu.';
    const g = ambilGrup(st.grup || []);
    if (g.length === 0) return 'Tambahkan minimal satu pemimpin/kegiatan yang diikuti.';
    if (!g.some(x => x.petugas.length > 0)) return 'Tambahkan minimal satu petugas yang meliput.';
    if ((st.mode === 'dropdown') && g.some(x => !x.pemimpin)) return 'Pilih Anggota DPRD yang diikuti.';
    return null;
}
ok('valid: sosper + 2 grup',
   validasiSimpan({ tipe:'LD', kategori:'sosrev', mode:'dropdown',
       grup:[{pemimpin:'Supian HK',petugas:[{id:'3'}]}] }) === null);
ok('tolak: tanpa kategori',
   /kategori/i.test(validasiSimpan({ tipe:'DD', kategori:null, grup:[] }) || ''));
ok('tolak: tanpa petugas',
   /petugas/i.test(validasiSimpan({ tipe:'DD', kategori:'komisi_dd', mode:'teks',
       grup:[{pemimpin:'X', petugas:[]}] }) || ''));
ok('tolak: sosper tanpa pilih dewan',
   /Anggota DPRD/i.test(validasiSimpan({ tipe:'LD', kategori:'sosper', mode:'dropdown',
       grup:[{pemimpin:'', petugas:[{id:'3'}]}] }) || ''));
ok('izinkan: komisi tanpa pilih dewan (teks bebas)',
   validasiSimpan({ tipe:'LD', kategori:'komisi_ld', mode:'teks',
       grup:[{pemimpin:'', petugas:[{id:'3'}]}] }) === null);

console.log('\n== SOURCE FILE: WIRING ==');
const js  = fs.readFileSync(path.join(ROOT, 'Javascript/notadinas.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'notadinas.html'), 'utf8');
ok('notadinas.js mendefinisikan modePemimpin/mode dropdown',
   /ndModePemimpin|KATEGORI_SOSPER/.test(js));
ok('notadinas.js mengambil api_tujuan.php', /api_tujuan\.php/.test(js));
ok('notadinas.js memfilter status Anggota DPRD',
   /anggota dprd/i.test(js));
ok('notadinas.js menyimpan grup (tujuanId)', /tujuanId/.test(js));
ok('html punya wadah grup pemimpin', /grupPemimpinWrap/.test(html));
ok('html memuat tom-select', /tom-select/i.test(html));

console.log('\n== PHP API: KOLOM tujuan_id ==');
const php = fs.readFileSync(path.join(ROOT, 'PHP/api_notadinas.php'), 'utf8');
ok('tabel nota_dinas punya kolom tujuan_id', /tujuan_id/.test(php));

console.log('\n----------------------------------------');
console.log('PASS: ' + pass + '   FAIL: ' + fail);
process.exit(fail ? 1 : 0);
