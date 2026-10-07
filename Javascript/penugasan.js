// =========================================================================
// VARIABEL GLOBAL
// =========================================================================
var dbTujuanDinas = [];
var dbDinas = []; 
var selectPegawaiInstance = null;
var selectDewanInstance = null;
var preloadLogoCetak = new Image();
preloadLogoCetak.src = 'Image/logo-kalsel.png';

var currentPageDinas = 1;         
var rowsPerPageDinas = 5;       
var currentSearchDinasKeyword = ""; 
var currentSearchTanggalMulai = ""; 
var currentSearchTanggalAkhir = ""; 
var timeoutSearchDinas;

window.isFillingForm = false;
window.dokumentasiUploads_1 = [];
window.dokumentasiUploads_2 = [];

function bulanKeRomawi(tanggal) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal || '')) {
        return '';
    }

    const romawi = [
        'I', 'II', 'III', 'IV', 'V', 'VI',
        'VII', 'VIII', 'IX', 'X', 'XI', 'XII'
    ];

    const bulan = parseInt(tanggal.slice(5, 7), 10);

    return romawi[bulan - 1] || '';
}

function ambilNomorUrutDokumen(nilai, tipe) {
    const teks = String(nilai || '').trim();

    if (!teks) {
        return '';
    }

    if (tipe === 'SPT') {
        const cocokSpt = teks.match(/^090\/(\d+)/);

        if (cocokSpt) {
            return cocokSpt[1];
        }
    } else {
        const cocokSpd = teks.match(/^(\d+)\/SPD\//);

        if (cocokSpd) {
            return cocokSpd[1];
        }
    }

    return /^\d+$/.test(teks) ? teks : '';
}

function formatNomorSpt(nomorUrut, tanggal) {
    const nomor = ambilNomorUrutDokumen(
        nomorUrut,
        'SPT'
    );

    const bulan = bulanKeRomawi(tanggal);
    const tahun = (tanggal || '').slice(0, 4);

    return nomor && bulan && tahun
        ? `090/${nomor}/${bulan}/${tahun}`
        : String(nomorUrut || '');
}

function formatNomorSpd(nomorUrut, tanggal, jenis) {
    const nomor = ambilNomorUrutDokumen(
        nomorUrut,
        'SPD'
    );

    const bulan = bulanKeRomawi(tanggal);
    const tahun = (tanggal || '').slice(0, 4);

    const bagianTetap =
        jenis === 'Luar Daerah'
            ? 'SPD/KD/SET'
            : 'SPD/SET';

    return nomor && bulan && tahun && jenis
        ? `${nomor}/${bagianTetap}/${bulan}/${tahun}`
        : String(nomorUrut || '');
}

function tanganiEnterNomorDokumen(event) {
    if (event.key !== 'Enter') {
        return;
    }

    // Mencegah Enter mengirim seluruh formulir
    event.preventDefault();
    event.stopPropagation();

    // Hanya format nomor SPT dan SPD
    updateFormatNomorDokumen();
}

function updateFormatNomorDokumen() {
    const tanggalInput =
        document.getElementById('dinasTglSpd');

    const jenisInput =
        document.getElementById('jenisTujuan');

    const tanggal =
        tanggalInput ? tanggalInput.value : '';

    const jenis =
        jenisInput ? jenisInput.value : '';

    const sptInput =
        document.getElementById('dinasSpt');

    const spdInput =
        document.getElementById('dinasSpd');

    const bulan =
        bulanKeRomawi(tanggal) || 'IX';

    const tahun =
        tanggal ? tanggal.slice(0, 4) : '2026';

    if (sptInput) {
        sptInput.placeholder =
            `090/......../${bulan}/${tahun}`;

        if (sptInput.value.trim()) {
            sptInput.value = formatNomorSpt(
                sptInput.value,
                tanggal
            );
        }
    }

    if (spdInput) {
        const bagianTetap =
            jenis === 'Dalam Daerah'
                ? 'SPD/SET'
                : 'SPD/KD/SET';

        spdInput.placeholder =
            `......../${bagianTetap}/${bulan}/${tahun}`;

        if (spdInput.value.trim()) {
            spdInput.value = formatNomorSpd(
                spdInput.value,
                tanggal,
                jenis
            );
        }
    }
}

function validasiFormatNomorDokumen() {
    const tanggalInput =
        document.getElementById('dinasTglSpd');

    const jenisInput =
        document.getElementById('jenisTujuan');

    const tanggal =
        tanggalInput ? tanggalInput.value : '';

    const jenis =
        jenisInput ? jenisInput.value : '';

    const sptInput =
        document.getElementById('dinasSpt');

    const spdInput =
        document.getElementById('dinasSpd');

    const bulan = bulanKeRomawi(tanggal);
    const tahun = tanggal.slice(0, 4);

    const bagianSpd =
        jenis === 'Luar Daerah'
            ? 'SPD/KD/SET'
            : 'SPD/SET';

    const nilaiSpt =
        sptInput ? sptInput.value : '';

    const nilaiSpd =
        spdInput ? spdInput.value : '';

    const polaSpt = new RegExp(
        `^090\\/\\d+\\/${bulan}\\/${tahun}$`
    );

    const polaSpd = new RegExp(
        `^\\d+\\/${bagianSpd}\\/${bulan}\\/${tahun}$`
    );

    if (!polaSpt.test(nilaiSpt)) {
        alert(
            'Nomor SPT belum benar. Ketik nomor urutnya, ' +
            'lalu pilih Tanggal SPD Dibuat.'
        );

        if (sptInput) {
            sptInput.focus();
        }

        return false;
    }

    if (!polaSpd.test(nilaiSpd)) {
        alert(
            'Nomor SPD belum benar. Ketik nomor urutnya dan ' +
            'pastikan Keterangan Tujuan sudah dipilih.'
        );

        if (spdInput) {
            spdInput.focus();
        }

        return false;
    }

    return true;
}

// ==========================================
// KODE BARU: Sembunyikan/Tampilkan Dokumentasi 2
// ==========================================
window.toggleDokumentasi2Visibility = function() {
    const tgl2 = document.getElementById('tglTitik2') ? document.getElementById('tglTitik2').value.trim() : '';
    const wkt2 = document.getElementById('waktuTitik2') ? document.getElementById('waktuTitik2').value.trim() : '';
    const tmpt2 = document.getElementById('tempatTitik2') ? document.getElementById('tempatTitik2').value.trim() : '';

    const doc2Input = document.getElementById('dinasDokumentasi2');
    if (doc2Input && doc2Input.parentElement) {
        // Jika salah satu dari kolom Titik 2 terisi, maka tampilkan wadah foto Titik 2
        if (tgl2 !== '' || wkt2 !== '' || tmpt2 !== '') {
            doc2Input.parentElement.style.display = 'block'; 
        } else {
            // Jika kosong semua, sembunyikan wadah foto
            doc2Input.parentElement.style.display = 'none';  
            
            // Hapus paksa foto Titik 2 yang terlanjur diunggah agar tidak bocor tersimpan
            window.dokumentasiUploads_2 = [];
            const previewArea = document.getElementById('previewDokumentasi2');
            if (previewArea) previewArea.innerHTML = '';
            doc2Input.value = '';
        }
    }
};
// =========================================================================
// INISIALISASI HALAMAN PENUGASAN (SPA)
// =========================================================================
window.initPenugasanSPA = function() {
    loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser')) || null;
    
    if (loggedInUser && loggedInUser.tingkat === 'Staf') {
        // Jangan sembunyikan seluruh wadah, biarkan tombol Bulk Print tetap tampil.
        // Hanya sembunyikan fitur Export Data (Excel & PDF) untuk level Staf.
        const btnExcel = document.querySelector('button[onclick="exportExcel()"]');
        if (btnExcel) btnExcel.style.display = 'none';
        
        const btnPDF = document.querySelector('button[onclick="exportPDF()"]');
        if (btnPDF) btnPDF.style.display = 'none';
    }

    // Memaksa browser memuat modul cetak secara dinamis
    if (typeof window.getLaporanRillHTML !== 'function') {
        const scriptRill = document.createElement('script');
        scriptRill.src = 'Javascript/Cetak/cetak_rill.js?v=' + new Date().getTime(); 
        document.head.appendChild(scriptRill);
    }

    // ==========================================================
    // KODE PERBAIKAN: Memanggil kembali modul Cetak Dokumentasi yang terhapus
    // ==========================================================
    if (typeof window.getLampiranDokumentasiHTML !== 'function') {
        const scriptDoc = document.createElement('script');
        scriptDoc.src = 'Javascript/Cetak/cetak_dokumentasi.js?v=' + new Date().getTime(); 
        document.head.appendChild(scriptDoc);
    }
    
    if (typeof window.cetakLaporanDewanBanggar !== 'function') {
        const scriptBanggar = document.createElement('script');
        scriptBanggar.src = 'Javascript/Cetak/cetak_dewanbanggar.js?v=' + new Date().getTime(); 
        document.head.appendChild(scriptBanggar);
    }

    setTimeout(() => { toggleFormLaporan(); }, 100);

    // ==========================================================
    // KODE BARU: PEMANGGILAN EDITOR MS WORD DENGAN TOMBOL CUSTOM
    // ==========================================================
    const initTinyMCE = () => {
        if (typeof tinymce !== 'undefined') {
            tinymce.remove('#poinBerkembang, #kesimpulanDinas'); 
            tinymce.init({
                selector: '#poinBerkembang, #kesimpulanDinas',
                menubar: false,
                plugins: 'lists',
                // Pertahankan tombol bawaan, tambahkan tombol rata kiri-kanan & tabawal
                toolbar: 'bold italic underline | alignleft alignjustify | bullist numlist | outdent indent | tabawal',
                height: 250,
                branding: false,
                content_style: 'p { text-align: justify; margin: 0 0 10px 0; line-height: 1.6; }',
                setup: function (editor) {
                    
                    // MEMBUAT TOMBOL KUSTOM: FIRST LINE INDENT
                    editor.ui.registry.addButton('tabawal', {
                    text: 'Tab Awal',
                    tooltip: 'Majukan baris pertama paragraf',
                    onAction: function () {
                        // Mengambil paragraf tempat kursor berada.
                        // Tetap bekerja meskipun tidak ada teks yang diblok.
                        let blokTerpilih =
                            editor.selection.getSelectedBlocks();

                        // Cadangan jika TinyMCE tidak mengembalikan blok.
                        if (!blokTerpilih || blokTerpilih.length === 0) {
                            const nodeAktif =
                                editor.selection.getNode();

                            const blokAktif =
                                editor.dom.getParent(
                                    nodeAktif,
                                    'p, div, li, blockquote'
                                );

                            blokTerpilih = blokAktif
                                ? [blokAktif]
                                : [];
                        }

                        if (blokTerpilih.length === 0) {
                            return;
                        }

                        // Jika semua paragraf sudah memiliki Tab Awal,
                        // tombol akan mengembalikannya ke posisi semula.
                        const semuaSudahMenjorok =
                            blokTerpilih.every(function (blok) {
                                const nilaiIndent =
                                    editor.dom.getStyle(
                                        blok,
                                        'text-indent',
                                        true
                                    );

                                return nilaiIndent === '40px';
                            });

                        editor.undoManager.transact(function () {
                            blokTerpilih.forEach(function (blok) {
                                editor.dom.setStyle(
                                    blok,
                                    'text-indent',
                                    semuaSudahMenjorok
                                        ? ''
                                        : '40px'
                                );
                            });
                        });

                        // Pertahankan posisi kursor di editor.
                        editor.focus();

                        // Sinkronkan isi editor ke textarea.
                        editor.save();
                    }
                });

                    editor.on('change', function () {
                        editor.save(); 
                    });
                }
            });
        }
    };

    if (typeof tinymce === 'undefined') {
        const scriptWord = document.createElement('script');
        scriptWord.src = 'https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.2/tinymce.min.js';
        scriptWord.onload = () => initTinyMCE(); 
        document.head.appendChild(scriptWord);
    } else {
        initTinyMCE();
    }
    // ==========================================================

    // Event Listeners Input Harga
    ['hargaTiketBerangkat', 'hargaTiketPulang'].forEach(id => {
        var el = document.getElementById(id); 
        if(el) el.oninput = hitungTotalKeseluruhan;
    });

    const tglBerangkatInput = document.getElementById('tglBerangkat'); 
    const tglKepulanganInput = document.getElementById('tglKepulangan');
    if(tglBerangkatInput) tglBerangkatInput.onchange = hitungDurasi; 
    if(tglKepulanganInput) tglKepulanganInput.onchange = hitungDurasi;
    
    const dinasTglSpdInput =
    document.getElementById('dinasTglSpd');

    const dinasSptInput =
        document.getElementById('dinasSpt');

    const dinasSpdInput =
        document.getElementById('dinasSpd');

    if (dinasTglSpdInput) {
        dinasTglSpdInput.addEventListener(
            'change',
            updateFormatNomorDokumen
        );
    }

    if (dinasSptInput) {
        // Komputer: berpindah dari kolom
        dinasSptInput.addEventListener(
            'blur',
            updateFormatNomorDokumen
        );

        // Ponsel: tombol Done/Go/Next
        dinasSptInput.addEventListener(
            'change',
            updateFormatNomorDokumen
        );

        // Komputer: tombol Enter
        dinasSptInput.addEventListener(
            'keydown',
            tanganiEnterNomorDokumen
        );
    }

    if (dinasSpdInput) {
        // Komputer: berpindah dari kolom
        dinasSpdInput.addEventListener(
            'blur',
            updateFormatNomorDokumen
        );

        // Ponsel: tombol Done/Go/Next
        dinasSpdInput.addEventListener(
            'change',
            updateFormatNomorDokumen
        );

        // Komputer: tombol Enter
        dinasSpdInput.addEventListener(
            'keydown',
            tanganiEnterNomorDokumen
        );
    }

    document.getElementById('hargaHotel').addEventListener('input', kalkulasiTotalBiayaDinas);
    // KODE BARU: Pasang pendengar ketikan di kolom Titik 2
    ['tglTitik2', 'waktuTitik2', 'tempatTitik2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', toggleDokumentasi2Visibility);
            el.addEventListener('change', toggleDokumentasi2Visibility);
        }
    });

    // Jalankan sekali di awal untuk menyembunyikan kolom jika masih kosong
    setTimeout(() => { toggleDokumentasi2Visibility(); }, 200);

    // Event Listeners Filter Pencarian
    const searchInputDinasEl = document.getElementById('searchDinas');
    if (searchInputDinasEl) {
        searchInputDinasEl.oninput = function(e) {
            clearTimeout(timeoutSearchDinas); 
            timeoutSearchDinas = setTimeout(() => { 
                currentSearchDinasKeyword = e.target.value; 
                loadTabelDinasServerSide(1); 
            }, 500); 
        };
    }
    
    const searchTanggalMulaiEl = document.getElementById('searchTanggalMulai');
    if (searchTanggalMulaiEl) { 
        searchTanggalMulaiEl.onchange = function(e) { 
            currentSearchTanggalMulai = e.target.value; 
            loadTabelDinasServerSide(1); 
        }; 
    }
    
    const searchTanggalAkhirEl = document.getElementById('searchTanggalAkhir');
    if (searchTanggalAkhirEl) { 
        searchTanggalAkhirEl.onchange = function(e) { 
            currentSearchTanggalAkhir = e.target.value; 
            loadTabelDinasServerSide(1); 
        }; 
    }

    // =========================================================================
    // SUBMIT FORM PENUGASAN
    // =========================================================================
    const formPenugasanSubmit = document.getElementById('dinasForm');
    if(formPenugasanSubmit){
        formPenugasanSubmit.onsubmit = async function(e) {
            e.preventDefault();

            updateFormatNomorDokumen();

            if (!validasiFormatNomorDokumen()) {
                return;
            }

            // KODE BARU: Konfirmasi sebelum simpan
            const isConf = await showCustomConfirm("Pastikan kembali apakah data tugas yang Anda masukkan sudah benar?", "Konfirmasi Simpan", "💾", "#3b82f6", "#eff6ff");
            if (!isConf) return; // Batalkan proses jika user menekan 'Batal'

            const btn = document.querySelector('.btn-save'); 
            const originalText = btn.innerHTML; 
            btn.innerHTML = 'Menyimpan... ⏳'; 
            btn.style.backgroundColor = '#95a5a6';

            // Menyusun format narasumber dan materi
            let ns1 = document.getElementById('narasumber1') ? document.getElementById('narasumber1').value : ''; 
            let mt1 = document.getElementById('materi1') ? document.getElementById('materi1').value : ''; 
            if (mt1) ns1 += '|#|' + mt1;
            
            let ns2 = document.getElementById('narasumber2') ? document.getElementById('narasumber2').value : ''; 
            let mt2 = document.getElementById('materi2') ? document.getElementById('materi2').value : ''; 
            if (mt2) ns2 += '|#|' + mt2;
            
            let ns3 = document.getElementById('narasumber3') ? document.getElementById('narasumber3').value : ''; 
            let mt3 = document.getElementById('materi3') ? document.getElementById('materi3').value : ''; 
            if (mt3) ns3 += '|#|' + mt3;

            // Membangun Payload yang dikirim ke PHP
            const payload = {
                id: document.getElementById('editDinasId').value || Date.now().toString(), 
                pegawaiId: document.getElementById('dinasPegawaiSelect').value, 
                jenisTujuan: document.getElementById('jenisTujuan').value, 
                lokasiTujuan: document.getElementById('lokasiTujuan').value, 
                penginapan: document.getElementById('penginapan').value, 
                hargaHotel: document.getElementById('hargaHotel').value, 
                
                tglTiketBerangkat: document.getElementById('tglTiketBerangkat').value, 
                maskapaiBerangkat: document.getElementById('maskapaiBerangkat').value, 
                noTiketBerangkat: document.getElementById('noTiketBerangkat').value, 
                kodeBookingBerangkat: document.getElementById('kodeBookingBerangkat').value, 
                hargaTiketBerangkat: document.getElementById('hargaTiketBerangkat').value, 
                
                tglTiketPulang: document.getElementById('tglTiketPulang').value, 
                maskapaiPulang: document.getElementById('maskapaiPulang').value, 
                noTiketPulang: document.getElementById('noTiketPulang').value, 
                kodeBookingPulang: document.getElementById('kodeBookingPulang').value, 
                hargaTiketPulang: document.getElementById('hargaTiketPulang').value, 
                keteranganTiket: document.getElementById('keteranganTiket').value, 
                
                nodin: document.getElementById('dinasNodin').value, 
                spt: document.getElementById('dinasSpt').value, 
                spd: document.getElementById('dinasSpd').value, 
                tglSpd: document.getElementById('dinasTglSpd') ? document.getElementById('dinasTglSpd').value : '', 
                tglBerangkat: document.getElementById('tglBerangkat').value, 
                tglKepulangan: document.getElementById('tglKepulangan').value, 
                durasi: document.getElementById('durasi').value, 
                
                tglKegiatan: document.getElementById('tglKegiatan') ? document.getElementById('tglKegiatan').value : '', 
                waktuKegiatan: document.getElementById('waktuKegiatan') ? document.getElementById('waktuKegiatan').value : '', 
                linkBerita: document.getElementById('dinasLinkBerita') ? document.getElementById('dinasLinkBerita').value : '', 
                tglDibuat: document.getElementById('dinasTglDibuat').value, 
                keperluan: document.getElementById('keperluan') ? document.getElementById('keperluan').value : '', 
                jenisLaporan: document.getElementById('jenisLaporan').value, 
                
                dewanId: document.getElementById('dewanId') ? document.getElementById('dewanId').value : '', 
                tglTitik1: document.getElementById('tglTitik1') ? document.getElementById('tglTitik1').value : '', 
                waktuTitik1: document.getElementById('waktuTitik1') ? document.getElementById('waktuTitik1').value : '', 
                tempatTitik1: document.getElementById('tempatTitik1') ? document.getElementById('tempatTitik1').value : '', 
                
                tglTitik2: document.getElementById('tglTitik2') ? document.getElementById('tglTitik2').value : '', 
                waktuTitik2: document.getElementById('waktuTitik2') ? document.getElementById('waktuTitik2').value : '', 
                tempatTitik2: document.getElementById('tempatTitik2') ? document.getElementById('tempatTitik2').value : '', 
                
                raperda: document.getElementById('raperda') ? document.getElementById('raperda').value : '', 
                narasumber1: ns1, 
                narasumber2: ns2, 
                narasumber3: ns3, 
                moderator: document.getElementById('moderator') ? document.getElementById('moderator').value : '', 
                mc: document.getElementById('mc') ? document.getElementById('mc').value : '', 
                poinBerkembang: (function() {
                    let pb = ''; let ks = '';
                    if (typeof tinymce !== 'undefined' && tinymce.get('poinBerkembang')) {
                        pb = tinymce.get('poinBerkembang').getContent();
                    } else {
                        pb = document.getElementById('poinBerkembang') ? document.getElementById('poinBerkembang').value : '';
                    }
                    
                    if (typeof tinymce !== 'undefined' && tinymce.get('kesimpulanDinas')) {
                        ks = tinymce.get('kesimpulanDinas').getContent();
                    } else {
                        ks = document.getElementById('kesimpulanDinas') ? document.getElementById('kesimpulanDinas').value : '';
                    }
                    return pb + (ks ? '|#|KESIMPULAN|#|' + ks : '');
                })(), 
                
            };

            if (!payload.pegawaiId) { 
                alert("Silakan ketik dan pilih pegawai!"); 
                btn.innerHTML = originalText; btn.style.backgroundColor = '#27ae60'; return; 
            }
            
            if (!payload.jenisLaporan || payload.jenisLaporan === '') { 
                alert("Silakan pilih Jenis Laporan!"); 
                btn.innerHTML = originalText; btn.style.backgroundColor = '#27ae60'; return; 
            }

            try {
                const form = new FormData();
                Object.entries(payload).forEach(([key, value]) => form.append(key, value == null ? '' : String(value)));
                (window.dokumentasiUploads_1 || []).forEach(item => { if (item && item.file) form.append('dokumentasi[]', item.file, item.file.name); else if (typeof item === 'string' && item.indexOf('Uploads/') === 0) form.append('dokumentasi[]', item); });
                (window.dokumentasiUploads_2 || []).forEach(item => { if (item && item.file) form.append('dokumentasi2[]', item.file, item.file.name); else if (typeof item === 'string' && item.indexOf('Uploads/') === 0) form.append('dokumentasi2[]', item); });
                const response = await fetch('PHP/api_penugasan.php', { method: 'POST', body: form });
                const result = await response.json();
                
                if(result.status === "success") { 
                    resetFormDinas(); 
                    await loadTabelDinasServerSide(1); 
                } else { 
                    alert("Sistem Gagal Menyimpan: \n" + result.message); 
                }
            } catch (error) { 
                alert("Kesalahan jaringan."); 
            } finally { 
                btn.innerHTML = originalText; 
                btn.style.backgroundColor = '#27ae60'; 
            }
        };
    }
    
    initPenugasanPage();
};

// =========================================================================
// FUNGSI FORMAT TANGGAL & PERHITUNGAN
// =========================================================================
function formatTanggalIndonesia(dateString) {
    if (!dateString) return "-"; 
    const date = new Date(dateString); 
    const daftarHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"]; 
    const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]; 
    return `${daftarHari[date.getDay()]} ${date.getDate()} ${daftarBulan[date.getMonth()]} ${date.getFullYear()}`;
}

function formatTanggalBiasa(dateString) {
    if (!dateString) return "-"; 
    const date = new Date(dateString); 
    const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]; 
    return `${date.getDate()} ${daftarBulan[date.getMonth()]} ${date.getFullYear()}`;
}

function hitungTotalKeseluruhan() {
    const hBerangkat = parseFloat(document.getElementById('hargaTiketBerangkat').value) || 0; 
    const hPulang = parseFloat(document.getElementById('hargaTiketPulang').value) || 0; 
    document.getElementById('totalKeseluruhan').value = 'Rp' + (hBerangkat + hPulang).toLocaleString('id-ID');
}

function kosongkanFormPenerbangan() {
    ['tglTiketBerangkat','maskapaiBerangkat','noTiketBerangkat','kodeBookingBerangkat','hargaTiketBerangkat','tglTiketPulang','maskapaiPulang','noTiketPulang','kodeBookingPulang','hargaTiketPulang','keteranganTiket'].forEach(id => { 
        document.getElementById(id).value = ''; 
    }); 
    hitungTotalKeseluruhan();
}

function hitungDurasi() {
    const berangkat = document.getElementById('tglBerangkat').value; 
    const pulang = document.getElementById('tglKepulangan').value; 
    const durasiInput = document.getElementById('durasi');
    
    if (berangkat && pulang) { 
        const diffTime = new Date(pulang) - new Date(berangkat); 
        if (diffTime >= 0) { 
            durasiInput.value = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
        } else { 
            alert("Kesalahan! Tanggal pulang tidak boleh mendahului berangkat."); 
            document.getElementById('tglKepulangan').value = ""; durasiInput.value = ""; 
        } 
    } else { 
        durasiInput.value = ""; 
    }
    
    if (!window.isFillingForm) window.autoHitungHotel();
    window.kalkulasiTotalBiayaDinas();
}

// =========================================================================
// LOGIKA FORM DINAMIS (TOGGLE) & BIAYA
// =========================================================================
function toggleTujuan() {
    const jenis = document.getElementById('jenisTujuan').value; 
    const contLokasi = document.getElementById('containerLokasi'); 
    const selectLokasi = document.getElementById('lokasiTujuan'); 
    const contPenerbangan = document.getElementById('containerPenerbangan'); 
    
    updateFormatNomorDokumen();

    document.getElementById('containerRincianBiaya').style.display = 'none';
    
    if (!contLokasi || !selectLokasi) return;
    
    if (jenis === 'Dalam Daerah' || jenis === 'Luar Daerah') {
        contLokasi.style.display = 'block'; 
        selectLokasi.innerHTML = '<option value="">-- Pilih Lokasi Tujuan --</option>';
        
        const filteredTujuan = dbTujuanDinas.filter(t => t.jenis && t.jenis.trim().toLowerCase() === jenis.trim().toLowerCase());
        if (filteredTujuan.length === 0) {
            selectLokasi.innerHTML += `<option value="" disabled>-- Belum ada data di Referensi --</option>`; 
        } else {
            filteredTujuan.forEach(t => { selectLokasi.innerHTML += `<option value="${t.nama}">${t.nama}</option>`; });
        }
        
        selectLokasi.required = true;
        if (contPenerbangan) { 
            if (jenis === 'Luar Daerah') { 
                contPenerbangan.style.display = 'block'; 
            } else { 
                contPenerbangan.style.display = 'none'; 
                kosongkanFormPenerbangan(); 
            } 
        }
    } else { 
        contLokasi.style.display = 'none'; 
        selectLokasi.required = false; 
        selectLokasi.innerHTML = '<option value="">-- Pilih Lokasi --</option>'; 
        if (contPenerbangan) { contPenerbangan.style.display = 'none'; kosongkanFormPenerbangan(); } 
    }
}

function toggleFormLaporan() {
    const jlEl = document.getElementById('jenisLaporan'); if (!jlEl) return;
    const jenis = jlEl.value; 
    const formSosper = document.getElementById('formSosper'); 
    const groupNamaDewan = document.getElementById('groupNamaDewan'); 
    const dinasForm = document.getElementById('dinasForm');
    const aksiFormDinas = document.getElementById('aksiFormDinas');

    if (aksiFormDinas) {
        aksiFormDinas.style.display =
            jenis ? 'flex' : 'none';
    }
    
    // Variabel elemen yang butuh kontrol khusus
    const tglKegiatanEl = document.getElementById('tglKegiatan');
    const waktuKegiatanEl = document.getElementById('waktuKegiatan');
    const linkBeritaEl = document.getElementById('dinasLinkBerita');
    const keperluanEl = document.getElementById('keperluan');
    
    if (dinasForm) { 
        Array.from(dinasForm.children).forEach(child => { 
            const isJenisLaporan = child.contains(document.getElementById('jenisLaporan')); 
            const isButtonBox = child.tagName === 'BUTTON' || child.querySelector('button') !== null; 
            if (!isJenisLaporan && !isButtonBox) { 
                child.style.display = (!jenis || jenis === '') ? 'none' : ''; 
            } 
        }); 
    }
    
    if (jenis && jenis !== '') toggleTujuan(); 
    
    if (selectPegawaiInstance) {
        const currentVal = selectPegawaiInstance.getValue(); 
        selectPegawaiInstance.clearOptions(); 
        let filteredPegawai = window.dbPegawai || [];
        
        if (jenis === 'SosperDewan' || jenis === 'SosrevDewan' || jenis === 'DewanBanggar') {
            filteredPegawai = filteredPegawai.filter(p => p.status && p.status.trim().toLowerCase() === 'anggota dprd'); 
        } else if (jenis === 'Sosper' || jenis === 'Sosrev' || jenis === 'FasilitasiHumas' || jenis === 'Humas' || jenis === 'StafBanggar') {
            filteredPegawai = filteredPegawai.filter(p => !p.status || p.status.trim().toLowerCase() !== 'anggota dprd');
        }
        
        filteredPegawai.forEach(p => { 
            selectPegawaiInstance.addOption({value: p.id, text: `${p.nama} (${p.nip || '-'})`}); 
        });
        
        if (filteredPegawai.some(p => p.id === currentVal)) selectPegawaiInstance.setValue(currentVal, true); 
        else selectPegawaiInstance.clear(true); 
    }

    if (!jenis || jenis === '') { 
        if (formSosper) formSosper.style.display = 'none'; 
        if (tglKegiatanEl && tglKegiatanEl.parentElement) { tglKegiatanEl.parentElement.style.display = 'none'; tglKegiatanEl.removeAttribute('required'); }
        if (waktuKegiatanEl && waktuKegiatanEl.parentElement) { waktuKegiatanEl.parentElement.style.display = 'none'; waktuKegiatanEl.removeAttribute('required'); }
        if (linkBeritaEl && linkBeritaEl.parentElement) { linkBeritaEl.parentElement.style.display = 'none'; linkBeritaEl.removeAttribute('required'); }
        if (keperluanEl && keperluanEl.parentElement) { keperluanEl.parentElement.style.display = 'none'; keperluanEl.removeAttribute('required'); }
        return; 
    }

    const labelRaperdaTema = document.getElementById('labelRaperdaTema'); 
    const titleTitik1 = document.getElementById('titleTitik1'); 
    const labelTglTitik1 = document.getElementById('labelTglTitik1'); 
    const labelWaktuTitik1 = document.getElementById('labelWaktuTitik1'); 
    const labelTempatTitik1 = document.getElementById('labelTempatTitik1'); 
    const boxTitik2 = document.getElementById('boxTitik2'); 
    const gridPelaksanaan = document.getElementById('gridPelaksanaan'); 
    const inputRaperda = document.getElementById('raperda');
    const labelPoin = document.getElementById('labelHasilKomparasi');

    // 1. KONDISI UNTUK LAPORAN SOSPER / SOSREV
    if (jenis === 'Sosper' || jenis === 'Sosrev' || jenis === 'SosperDewan' || jenis === 'SosrevDewan') {
        if (formSosper) formSosper.style.display = 'block'; 
        if (groupNamaDewan) groupNamaDewan.style.display = (jenis === 'SosperDewan' || jenis === 'SosrevDewan') ? 'none' : 'block'; 
        if (inputRaperda && inputRaperda.parentElement) inputRaperda.parentElement.style.display = 'block';
        
        // KODE PERBAIKAN 1: Sembunyikan Form Keperluan
        if (keperluanEl && keperluanEl.parentElement) { 
            keperluanEl.parentElement.style.display = 'none'; 
            keperluanEl.removeAttribute('required'); 
        }
        
        for (let i = 1; i <= 3; i++) { 
            const nsEl = document.getElementById('narasumber' + i); 
            if (nsEl && nsEl.parentElement) nsEl.parentElement.style.display = 'block'; 
            const matEl = document.getElementById('materi' + i); 
            if (matEl) matEl.style.display = 'block'; 
        }
        
        const modEl = document.getElementById('moderator'); 
        if(modEl && modEl.parentElement) modEl.parentElement.style.display = 'block'; 
        const mcEl = document.getElementById('mc'); 
        if(mcEl && mcEl.parentElement) mcEl.parentElement.style.display = 'block'; 
        
        const poinEl = document.getElementById('poinBerkembang'); 
        if(poinEl && poinEl.parentElement) {
            poinEl.parentElement.style.display = 'block';
            poinEl.removeAttribute('required'); 
            
            // KODE PERBAIKAN 2: Ubah Teks Label Menjadi "Hasil yang didapat"
            if (labelPoin) labelPoin.innerText = 'Hasil yang didapat';
            poinEl.placeholder = 'Ketik hasil di sini...';
        }

        const kesimpulanWadah = document.getElementById('wadahKesimpulan');
        const kesimpulanEl = document.getElementById('kesimpulanDinas');
        if(kesimpulanWadah) {
            kesimpulanWadah.style.display = 'none';
            if(kesimpulanEl) kesimpulanEl.removeAttribute('required');
        }

        if (jenis === 'Sosrev' || jenis === 'SosrevDewan') {
            if (labelRaperdaTema) labelRaperdaTema.innerText = 'Tema yang Diangkat'; 
            if (inputRaperda) inputRaperda.placeholder = 'Cth: Aktualisasi Nilai Pancasila'; 
            if (titleTitik1) titleTitik1.innerText = '📍 PELAKSANAAN'; 
            if (labelTglTitik1) labelTglTitik1.innerText = 'Hari dan Tanggal'; 
            if (labelWaktuTitik1) labelWaktuTitik1.innerText = 'Pukul'; 
            if (labelTempatTitik1) labelTempatTitik1.innerText = 'Tempat'; 
            if (boxTitik2) { 
                boxTitik2.style.display = 'none'; 
                document.getElementById('tglTitik2').value = ''; 
                document.getElementById('waktuTitik2').value = ''; 
                document.getElementById('tempatTitik2').value = ''; 
            } 
            if (gridPelaksanaan) gridPelaksanaan.style.gridTemplateColumns = '1fr'; 
        } else {
            if (labelRaperdaTema) labelRaperdaTema.innerText = 'Raperda yang Dibahas'; 
            if (inputRaperda) inputRaperda.placeholder = 'Cth: Nomor 10 Tahun 2019 Tentang Kepemudaan'; 
            if (titleTitik1) titleTitik1.innerText = '📍 TITIK 1'; 
            if (labelTglTitik1) labelTglTitik1.innerText = 'Hari dan Tanggal Titik 1'; 
            if (labelWaktuTitik1) labelWaktuTitik1.innerText = 'Waktu Titik 1'; 
            if (labelTempatTitik1) labelTempatTitik1.innerText = 'Tempat Titik 1';
            
            if (boxTitik2) { 
                boxTitik2.style.display = 'block'; 
                const labels2 = boxTitik2.getElementsByTagName('label'); 
                if (labels2.length >= 3) { 
                    labels2[0].innerText = 'Hari dan Tanggal Titik 2'; 
                    labels2[1].innerText = 'Waktu Titik 2'; 
                    labels2[2].innerText = 'Tempat Titik 2'; 
                } 
            } 
            if (gridPelaksanaan) gridPelaksanaan.style.gridTemplateColumns = '1fr 1fr';
        }
        
        if (tglKegiatanEl && tglKegiatanEl.parentElement) { tglKegiatanEl.parentElement.style.display = 'none'; tglKegiatanEl.removeAttribute('required'); }
        if (waktuKegiatanEl && waktuKegiatanEl.parentElement) { waktuKegiatanEl.parentElement.style.display = 'none'; waktuKegiatanEl.removeAttribute('required'); }
        if (linkBeritaEl && linkBeritaEl.parentElement) { linkBeritaEl.parentElement.style.display = 'none'; linkBeritaEl.removeAttribute('required'); }
    } 
    // 2. KONDISI UNTUK LAPORAN HUMAS & DEWAN BANGGAR
    else if (jenis === 'FasilitasiHumas' || jenis === 'Humas' || jenis === 'DewanBanggar' || jenis === 'StafBanggar') {
        if (formSosper) formSosper.style.display = 'block'; 
        if (groupNamaDewan) groupNamaDewan.style.display = 'none'; 
        
        // Kembalikan Tampilan Keperluan Untuk Laporan Lainnya
        if (keperluanEl && keperluanEl.parentElement) { 
            keperluanEl.parentElement.style.display = 'block'; 
            keperluanEl.setAttribute('required', 'true'); 
        }
        
        if (inputRaperda) { 
            if (inputRaperda.parentElement) inputRaperda.parentElement.style.display = 'none'; 
            inputRaperda.removeAttribute('required'); 
        }
        for (let i = 1; i <= 3; i++) { 
            const nsEl = document.getElementById('narasumber' + i); 
            if (nsEl) { if (nsEl.parentElement) nsEl.parentElement.style.display = 'none'; nsEl.removeAttribute('required'); } 
            const matEl = document.getElementById('materi' + i); 
            if (matEl) { matEl.style.display = 'none'; matEl.removeAttribute('required'); } 
        }
        const modEl = document.getElementById('moderator'); if(modEl) { if(modEl.parentElement) modEl.parentElement.style.display = 'none'; modEl.removeAttribute('required'); } 
        const mcEl = document.getElementById('mc'); if(mcEl) { if(mcEl.parentElement) mcEl.parentElement.style.display = 'none'; mcEl.removeAttribute('required'); } 
        
        const poinEl = document.getElementById('poinBerkembang'); 
        const kesimpulanWadah = document.getElementById('wadahKesimpulan');
        const kesimpulanEl = document.getElementById('kesimpulanDinas');
        
        if (poinEl && poinEl.parentElement) {
            if (jenis === 'DewanBanggar' || jenis === 'StafBanggar') {
                poinEl.parentElement.style.display = 'block'; 
                poinEl.removeAttribute('required'); 
                if (labelPoin) labelPoin.innerText = 'Hasil Komparasi / Monitoring';
                poinEl.placeholder = 'Ketik hasil komparasi di sini...';
                
                if(kesimpulanWadah) {
                    kesimpulanWadah.style.display = 'block';
                    if(kesimpulanEl) kesimpulanEl.removeAttribute('required'); 
                }
            } else {
                poinEl.parentElement.style.display = 'none'; 
                poinEl.removeAttribute('required');
                
                if(kesimpulanWadah) {
                    kesimpulanWadah.style.display = 'none';
                    if(kesimpulanEl) kesimpulanEl.removeAttribute('required');
                }
            }
        }
        
        if (titleTitik1) titleTitik1.innerText = '📍 PELAKSANAAN KEGIATAN'; 
        if (jenis === 'DewanBanggar' || jenis === 'StafBanggar') {
            if (labelTglTitik1) labelTglTitik1.innerText = 'Tanggal Kegiatan Dilaksanakan'; 
            if (labelWaktuTitik1) labelWaktuTitik1.innerText = 'Waktu Kegiatan'; 
            if (labelTempatTitik1) labelTempatTitik1.innerText = 'Tempat Kegiatan';
        } else {
            if (labelTglTitik1) labelTglTitik1.innerText = 'Tanggal Kegiatan Dilaksanakan 1'; 
            if (labelWaktuTitik1) labelWaktuTitik1.innerText = 'Waktu Kegiatan 1'; 
            if (labelTempatTitik1) labelTempatTitik1.innerText = 'Tempat Kegiatan 1';
        }
        
        if (boxTitik2) { 
            if (jenis === 'DewanBanggar' || jenis === 'StafBanggar') {
                boxTitik2.style.display = 'none';
                document.getElementById('tglTitik2').value = ''; 
                document.getElementById('waktuTitik2').value = ''; 
                document.getElementById('tempatTitik2').value = ''; 
            } else {
                boxTitik2.style.display = 'block'; 
                const labels2 = boxTitik2.getElementsByTagName('label'); 
                if (labels2.length >= 3) { 
                    labels2[0].innerText = 'Tanggal Kegiatan Dilaksanakan 2 (Opsional)'; 
                    labels2[1].innerText = 'Waktu Kegiatan 2'; 
                    labels2[2].innerText = 'Tempat Kegiatan 2'; 
                } 
            }
        } 
        if (gridPelaksanaan) gridPelaksanaan.style.gridTemplateColumns = (jenis === 'DewanBanggar' || jenis === 'StafBanggar') ? '1fr' : '1fr 1fr';
        
        if (jenis === 'DewanBanggar' || jenis === 'StafBanggar') {
            if (tglKegiatanEl && tglKegiatanEl.parentElement) {
                tglKegiatanEl.parentElement.style.display = 'none';
                tglKegiatanEl.removeAttribute('required');
            }
            if (waktuKegiatanEl && waktuKegiatanEl.parentElement) {
                waktuKegiatanEl.parentElement.style.display = 'none';
                waktuKegiatanEl.removeAttribute('required');
            }
            if (linkBeritaEl && linkBeritaEl.parentElement) {
                linkBeritaEl.parentElement.style.display = 'none';
                linkBeritaEl.removeAttribute('required');
            }
        } else {
            if (tglKegiatanEl && tglKegiatanEl.parentElement) {
                tglKegiatanEl.parentElement.style.display = 'none'; 
                tglKegiatanEl.removeAttribute('required');
            }
            if (waktuKegiatanEl && waktuKegiatanEl.parentElement) {
                waktuKegiatanEl.parentElement.style.display = 'none'; 
                waktuKegiatanEl.removeAttribute('required');
            }
            if (linkBeritaEl && linkBeritaEl.parentElement) {
                linkBeritaEl.parentElement.style.display = 'block';
            }
        }
    }
    toggleDokumentasi2Visibility();
}

function loadDropdownAnggotaDewan() {
    const selectDewan = document.getElementById('dewanId'); 
    if (!selectDewan) return; 
    
    if (selectDewanInstance) selectDewanInstance.destroy();
    selectDewan.innerHTML = '<option value="">-- Ketik/Pilih Anggota Dewan --</option>';
    
    // KODE PERBAIKAN: Memastikan hanya Anggota DPRD yang dimuat
    const listDewan = window.dbPegawai.filter(p => p.status && p.status.trim().toLowerCase() === 'anggota dprd');
    
    listDewan.forEach(p => { 
        selectDewan.innerHTML += `<option value="${p.id}">${p.nama}</option>`; 
    });

    // Terapkan fitur TomSelect agar kotak pilihan menjadi interaktif
    try { 
        selectDewanInstance = new TomSelect("#dewanId", { 
            create: false, 
            sortField: { field: "text", direction: "asc" }, 
            placeholder: "-- Ketik Nama Anggota Dewan --" 
        }); 
    } catch(e) {}
}

function updateRincianBiaya() {
    const namaLokasi = document.getElementById('lokasiTujuan').value; 
    const jenis = document.getElementById('jenisTujuan').value; 
    const containerInfo = document.getElementById('containerRincianBiaya');
    
    if (namaLokasi) {
        const t = dbTujuanDinas.find(x => x.nama === namaLokasi && x.jenis === jenis);
        if (t) { 
            const formatRp = (angka) => 'Rp' + parseFloat(angka).toLocaleString('id-ID'); 
            
            document.getElementById('infoBerangkat').value = t.bunyi_berangkat || '-'; 
            document.getElementById('infoPulang').value = t.bunyi_pulang || '-'; 
            document.getElementById('infoBiayaBerangkat').value = formatRp(t.berangkat); 
            document.getElementById('infoBiayaPulang').value = formatRp(t.pulang); 
            document.getElementById('infoHargaTiketPp').value = formatRp(t.harga_tiket_pp);

            document.getElementById('infoUangHarian').value = formatRp(t.uang_harian);
            document.getElementById('infoPaguHotel1').value = formatRp(t.pagu_hotel);
            document.getElementById('infoPaguHotel2').value = formatRp(t.pagu_hotel_4);
            document.getElementById('infoPaguHotel3').value = formatRp(t.pagu_hotel_es2);
            document.getElementById('infoUangRepresentasi').value = formatRp(t.uang_representasi);

            containerInfo.dataset.uangHarian = t.uang_harian || 0;
            containerInfo.dataset.uangRepresentasi = t.uang_representasi || 0;
            containerInfo.dataset.biayaBerangkat = t.berangkat || 0;
            containerInfo.dataset.biayaPulang = t.pulang || 0;
            containerInfo.dataset.paguHotel1 = t.pagu_hotel || 0;
            containerInfo.dataset.paguHotel2 = t.pagu_hotel_4 || 0;
            containerInfo.dataset.paguHotel3 = t.pagu_hotel_es2 || 0;

            containerInfo.style.display = 'flex'; 
        } else { 
            containerInfo.style.display = 'none'; 
            resetDatasetBiaya();
        }
    } else { 
        containerInfo.style.display = 'none'; 
        resetDatasetBiaya();
    }
    
    if (!window.isFillingForm) window.autoHitungHotel();
    window.kalkulasiTotalBiayaDinas();
}

window.resetDatasetBiaya = function() {
    const containerInfo = document.getElementById('containerRincianBiaya');
    containerInfo.dataset.uangHarian = 0;
    containerInfo.dataset.uangRepresentasi = 0;
    containerInfo.dataset.biayaBerangkat = 0;
    containerInfo.dataset.biayaPulang = 0;
    containerInfo.dataset.paguHotel1 = 0;
    containerInfo.dataset.paguHotel2 = 0;
    containerInfo.dataset.paguHotel3 = 0;
}

window.autoHitungHotel = function() {
    if (window.isFillingForm) return; 
    
    const pegawaiId = document.getElementById('dinasPegawaiSelect').value;
    const containerInfo = document.getElementById('containerRincianBiaya');
    const durasi = parseInt(document.getElementById('durasi').value) || 0;
    
    if (!pegawaiId || !containerInfo || durasi <= 0) return;

    const pagu1 = parseFloat(containerInfo.dataset.paguHotel1) || 0;
    const pagu2 = parseFloat(containerInfo.dataset.paguHotel2) || 0;
    const pagu3 = parseFloat(containerInfo.dataset.paguHotel3) || 0;
    
    let isEs2Dewan = false;
    let isGol4 = false;

    if (window.dbPegawai) {
        const peg = window.dbPegawai.find(p => p.id == pegawaiId);
        if (peg) {
            const stat = peg.status ? peg.status.toLowerCase().trim() : '';
            const jab = peg.jabatan ? peg.jabatan.toLowerCase().trim() : '';
            const gol = peg.golongan ? peg.golongan.toLowerCase().trim() : '';

            if (stat === 'anggota dprd' || jab === 'sekretaris dprd') {
                isEs2Dewan = true;
            } else if (['iv/a', 'iv/b', 'iv/c', 'iv/d'].includes(gol)) {
                isGol4 = true;
            }
        }
    }

    let paguDigunakan = pagu1;
    if (isEs2Dewan) { paguDigunakan = pagu3; } 
    else if (isGol4) { paguDigunakan = pagu2; }

    const malam = durasi > 0 ? durasi - 1 : 0;

    if (paguDigunakan > 0 && malam > 0) {
        const hitungAktual = 0.30 * paguDigunakan * malam;
        document.getElementById('hargaHotel').value = hitungAktual;
    } else if (paguDigunakan > 0) {
        document.getElementById('hargaHotel').value = 0; 
    }
};

window.kalkulasiTotalBiayaDinas = function() {
    const containerInfo = document.getElementById('containerRincianBiaya');
    const uangHarian = parseFloat(containerInfo.dataset.uangHarian) || 0;
    const uangRepresentasiRef = parseFloat(containerInfo.dataset.uangRepresentasi) || 0;
    const biayaBerangkat = parseFloat(containerInfo.dataset.biayaBerangkat) || 0;
    const biayaPulang = parseFloat(containerInfo.dataset.biayaPulang) || 0;

    const durasi = parseInt(document.getElementById('durasi').value) || 0;
    const hargaHotel = parseFloat(document.getElementById('hargaHotel').value) || 0;

    let isDewan = false;
    const pegawaiId = document.getElementById('dinasPegawaiSelect').value;
    
    if (pegawaiId && window.dbPegawai) {
        const peg = window.dbPegawai.find(p => p.id == pegawaiId);
        if(peg) {
            const stat = peg.status ? peg.status.toLowerCase().trim() : '';
            const jab = peg.jabatan ? peg.jabatan.toLowerCase().trim() : '';
            if (stat === 'anggota dprd' || jab === 'anggota dprd') {
                isDewan = true;
            }
        }
    }

    const uangRepresentasi = isDewan ? uangRepresentasiRef : 0;
    const total = (uangHarian * durasi) + biayaBerangkat + biayaPulang + hargaHotel + uangRepresentasi;
    
    const totalEl = document.getElementById('totalBiayaDinas');
    if(totalEl) totalEl.value = 'Rp' + total.toLocaleString('id-ID');
}


// =========================================================================
// RENDER TABEL & SERVER SIDE HANDLING
// =========================================================================
async function initPenugasanPage() {
    const tbody = document.getElementById('dinasDataBody');

    try {
        const resPegawai = await fetch('PHP/api_pegawai.php?limit=summary', {
            cache: 'no-store',
            headers: { 'Accept': 'application/json' }
        });
        const pegawaiText = await resPegawai.text();
        let rawPegawai;

        try {
            rawPegawai = JSON.parse(pegawaiText);
        } catch (parseError) {
            throw new Error(`Data pegawai bukan JSON (HTTP ${resPegawai.status}).`);
        }

        if (!resPegawai.ok || rawPegawai.status !== 'success' || !Array.isArray(rawPegawai.data)) {
            throw new Error(rawPegawai.message || `Data pegawai gagal dimuat (HTTP ${resPegawai.status}).`);
        }

        window.dbPegawai = rawPegawai.data.map(p => {
            let cleanP = {};
            for (let key in p) cleanP[key] = typeof p[key] === 'string' ? escapeHTML(p[key]) : p[key];
            return cleanP;
        });
        loadDropdownAnggotaDewan();

        const selectPegawai = document.getElementById('dinasPegawaiSelect');
        if (selectPegawai) {
            if (selectPegawaiInstance) selectPegawaiInstance.destroy();
            selectPegawai.innerHTML = '<option value="">-- Ketik Nama atau NIP Pelaksana --</option>';
            window.dbPegawai.forEach(p => { selectPegawai.innerHTML += `<option value="${p.id}">${p.nama} (${p.nip})</option>`; });
            try {
                selectPegawaiInstance = new TomSelect("#dinasPegawaiSelect", {
                    create: false,
                    sortField: { field: "text", direction: "asc" },
                    placeholder: "-- Ketik Nama atau NIP Pelaksana --"
                });
                selectPegawaiInstance.on('change', function() {
                    if (!window.isFillingForm) window.autoHitungHotel();
                    window.kalkulasiTotalBiayaDinas();
                });
            } catch(e) {}
        }

        const resTujuan = await fetch('PHP/api_tujuan.php', {
            cache: 'no-store',
            headers: { 'Accept': 'application/json' }
        });
        const tujuanText = await resTujuan.text();
        let rawTujuan;

        try {
            rawTujuan = JSON.parse(tujuanText);
        } catch (parseError) {
            throw new Error(`Data tujuan bukan JSON (HTTP ${resTujuan.status}).`);
        }

        if (!resTujuan.ok || rawTujuan.status === 'error') {
            throw new Error(rawTujuan.message || `Data tujuan gagal dimuat (HTTP ${resTujuan.status}).`);
        }

        dbTujuanDinas = Array.isArray(rawTujuan) ? rawTujuan : (rawTujuan.data || []);
        toggleTujuan();
        toggleFormLaporan();
        await loadTabelDinasServerSide(1);
    } catch (error) {
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#e74c3c; padding:20px;">❌ Gagal menyiapkan halaman penugasan.<br><small>${escapeHTML(error.message || 'Kesalahan jaringan.')}</small></td></tr>`;
        }
        console.error('Inisialisasi halaman penugasan gagal:', error);
    }
}

window.loadTabelDinasServerSide = async function(page) {
    currentPageDinas = page; 
    const tbody = document.getElementById('dinasDataBody'); 
    if(!tbody) return; 
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 20px;">Memuat Data... ⏳</td></tr>';
    
    try {
        const url = `PHP/api_penugasan.php?page=${page}&limit=${rowsPerPageDinas}&search=${encodeURIComponent(currentSearchDinasKeyword)}&start_date=${encodeURIComponent(currentSearchTanggalMulai)}&end_date=${encodeURIComponent(currentSearchTanggalAkhir)}`;
        const response = await fetch(url, {
            cache: 'no-store',
            headers: { 'Accept': 'application/json' }
        });
        const responseText = await response.text();
        let result;

        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            throw new Error(`Respons riwayat bukan JSON (HTTP ${response.status}).`);
        }

        if (!response.ok || result.status === 'error') {
            throw new Error(result.message || `Riwayat gagal dimuat (HTTP ${response.status}).`);
        }

        if (!Array.isArray(result.data) || !result.pagination) {
            throw new Error('Format data riwayat dari server tidak lengkap.');
        }

        const arrayDinas = result.data || [];
        
        // MAPPING DATA DARI DATABASE (DENGAN AUTO-SANITIZER)
        dbDinas = arrayDinas.map(d => {
            let cleanD = {};
            for (let key in d) {
                if (key === 'dokumentasi' || key === 'dokumentasi2' || key === 'poin_berkembang') {
                    cleanD[key] = d[key];
                } else {
                    cleanD[key] = typeof d[key] === 'string' ? escapeHTML(d[key]) : d[key];
                }
            }
            
            return {
                id: cleanD.id, pegawaiId: cleanD.pegawai_id, jenisTujuan: cleanD.jenis_tujuan, 
                lokasiTujuan: cleanD.lokasi_tujuan, nodin: cleanD.nodin, spt: cleanD.spt, 
                spd: cleanD.spd, tglSpd: cleanD.tgl_spd || '', tglBerangkat: cleanD.tgl_berangkat, 
                tglKepulangan: cleanD.tgl_kepulangan, durasi: cleanD.durasi, tglKegiatan: cleanD.tgl_kegiatan, 
                waktuKegiatan: cleanD.waktu_kegiatan, linkBerita: cleanD.link_berita, tglDibuat: cleanD.tgl_dibuat, 
                keperluan: cleanD.keperluan, penginapan: cleanD.penginapan, hargaHotel: cleanD.harga_hotel, 
                tglTiketBerangkat: cleanD.tgl_tiket_berangkat, maskapaiBerangkat: cleanD.maskapai_berangkat, 
                noTiketBerangkat: cleanD.no_tiket_berangkat, kodeBookingBerangkat: cleanD.kode_booking_berangkat, 
                hargaTiketBerangkat: cleanD.harga_tiket_berangkat, tglTiketPulang: cleanD.tgl_tiket_pulang, 
                maskapaiPulang: cleanD.maskapai_pulang, noTiketPulang: cleanD.no_tiket_pulang, 
                kodeBookingPulang: cleanD.kode_booking_pulang, hargaTiketPulang: cleanD.harga_tiket_pulang, 
                keteranganTiket: cleanD.keterangan_tiket, jenisLaporan: cleanD.jenis_laporan || '', 
                dewanId: cleanD.dewan_id || '', tglTitik1: cleanD.tgl_titik1 || '', waktuTitik1: cleanD.waktu_titik1 || '', 
                tempatTitik1: cleanD.tempat_titik1 || '', tglTitik2: cleanD.tgl_titik2 || '', waktuTitik2: cleanD.waktu_titik2 || '', 
                tempatTitik2: cleanD.tempat_titik2 || '', raperda: cleanD.raperda || '', narasumber1: cleanD.narasumber1 || '', 
                narasumber2: cleanD.narasumber2 || '', narasumber3: cleanD.narasumber3 || '', moderator: cleanD.moderator || '', 
                mc: cleanD.mc || '', poinBerkembang: cleanD.poin_berkembang || '', inputBy: cleanD.input_by || cleanD.pegawai_id, 
                dokumentasi: d.dokumentasi || '[]', dokumentasi2: d.dokumentasi2 || '[]'
            };
        });

        if(dbDinas.length === 0) { 
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Data riwayat dinas tidak ditemukan.</td></tr>'; 
            renderPaginationDinas(0); 
            return; 
        }

        // Matikan centang 'Pilih Semua' jika pindah halaman
        const selectAllEl = document.getElementById('selectAllDinas');
        if(selectAllEl) selectAllEl.checked = false;

        tbody.innerHTML = '';
        dbDinas.forEach((d, idx) => {
            const peg = window.dbPegawai.find(p => p.id == d.pegawaiId) || { nama: 'Pegawai Terhapus', nip: '-', foto: 'Image/default.jpg' };
            const pegInput = window.dbPegawai.find(p => p.id == d.inputBy) || peg; 
            const namaInput = pegInput.nama || 'Sistem';

            let labelLaporan = '';
            if (d.jenisLaporan === 'Sosper') labelLaporan = '<span style="background:#8e44ad; color:white; padding:3px 6px; border-radius:4px; font-size:10px; font-weight:bold;">Tipe: Sosper</span>'; 
            else if (d.jenisLaporan === 'Sosrev') labelLaporan = '<span style="background:#d35400; color:white; padding:3px 6px; border-radius:4px; font-size:10px; font-weight:bold;">Tipe: Sosrev</span>'; 
            else if (d.jenisLaporan === 'SosperDewan') labelLaporan = '<span style="background:#2980b9; color:white; padding:3px 6px; border-radius:4px; font-size:10px; font-weight:bold;">Tipe: Sosper Dewan</span>'; 
            else if (d.jenisLaporan === 'SosrevDewan') labelLaporan = '<span style="background:#e67e22; color:white; padding:3px 6px; border-radius:4px; font-size:10px; font-weight:bold;">Tipe: Sosrev Dewan</span>'; 
            else if (d.jenisLaporan === 'FasilitasiHumas') labelLaporan = '<span style="background:#16a085; color:white; padding:3px 6px; border-radius:4px; font-size:10px; font-weight:bold;">Tipe: Fas. Humas</span>'; 
            else if (d.jenisLaporan === 'Humas') labelLaporan = '<span style="background:#27ae60; color:white; padding:3px 6px; border-radius:4px; font-size:10px; font-weight:bold;">Tipe: Humas</span>'; 
            else if (d.jenisLaporan === 'DewanBanggar') labelLaporan = '<span style="background:#8b5cf6; color:white; padding:3px 6px; border-radius:4px; font-size:10px; font-weight:bold;">Tipe: Banggar</span>'; 
            else if (d.jenisLaporan === 'StafBanggar') labelLaporan = '<span style="background:#34495e; color:white; padding:3px 6px; border-radius:4px; font-size:10px; font-weight:bold;">Tipe: Banggar Staf</span>';
            else labelLaporan = '<span style="background:#95a5a6; color:white; padding:3px 6px; border-radius:4px; font-size:10px; font-weight:bold;">Tipe: Belum Dipilih</span>';

            let labelLaporanHTML = `<div style="font-size: 11px; color: #475569; margin-bottom: 5px; font-weight: 500;">Input Oleh: <b style="color: #0284c7;">${namaInput}</b></div>${labelLaporan}`;
            let tombolCetak = '';
            if (d.jenisLaporan === 'Sosper') tombolCetak = `<button type="button" class="btn-action btn-print" style="background-color:#8e44ad;" onclick="cetakLaporanSosper('${d.id}')">Cetak Laporan Sosper</button>`; 
            else if (d.jenisLaporan === 'Sosrev') tombolCetak = `<button type="button" class="btn-action btn-print" style="background-color:#d35400;" onclick="cetakLaporanSosrev('${d.id}')">Cetak Laporan Sosrev</button>`; 
            else if (d.jenisLaporan === 'SosperDewan') tombolCetak = `<button type="button" class="btn-action btn-print" style="background-color:#2980b9;" onclick="cetakLaporanSosperDewan('${d.id}')">Cetak Laporan Sosper Dewan</button>`; 
            else if (d.jenisLaporan === 'SosrevDewan') tombolCetak = `<button type="button" class="btn-action btn-print" style="background-color:#e67e22;" onclick="cetakLaporanSosrevDewan('${d.id}')">Cetak Laporan Sosrev Dewan</button>`; 
            else if (d.jenisLaporan === 'FasilitasiHumas') tombolCetak = `<button type="button" class="btn-action btn-print" style="background-color:#16a085;" onclick="cetakLaporanFasilitasiHumas('${d.id}')">Cetak Lap. Fasilitasi Humas</button>`; 
            else if (d.jenisLaporan === 'Humas') tombolCetak = `<button type="button" class="btn-action btn-print" onclick="cetakLaporanHumas('${d.id}')">Cetak Dokumen Humas</button>`;
            else if (d.jenisLaporan === 'DewanBanggar') tombolCetak = `<button type="button" class="btn-action btn-print" style="background-color:#8b5cf6;" onclick="cetakLaporanDewanBanggar('${d.id}')">Cetak Laporan Banggar</button>`;
            else if (d.jenisLaporan === 'StafBanggar') tombolCetak = `<button type="button" class="btn-action btn-print" style="background-color:#34495e;" onclick="cetakLaporanStafBanggar('${d.id}')">Cetak Lap. Banggar Staf</button>`;
            
            let actionButtons = '';
            if (loggedInUser.tingkat === 'Staf' && d.inputBy !== loggedInUser.id) { 
                actionButtons = `<div class="action-group column">${tombolCetak}<button type="button" class="btn-action btn-duplicate" onclick="duplikatDinas('${d.id}')"> Duplikat Data</button><span style="color:#ef4444; font-size:10px; font-weight:bold; display:block; text-align:center; margin-top:5px; background: #fee2e2; padding: 4px; border-radius: 4px;">Terkunci (Milik ${namaInput})</span></div>`; 
            } else { 
                actionButtons = `<div class="action-group column">${tombolCetak}<button type="button" class="btn-action btn-duplicate" onclick="duplikatDinas('${d.id}')"> Duplikat Data</button><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;"><button type="button" class="btn-action btn-edit" onclick="editDinas('${d.id}')"> Edit</button><button type="button" class="btn-action btn-delete" onclick="hapusDinas('${d.id}')"> Hapus</button></div></div>`; 
            }

            let linkHTML = '-'; 
            if (d.linkBerita) linkHTML = `<a href="${d.linkBerita}" target="_blank" class="link-tabel">Link Publikasi</a>`;

            // KODE BARU: Cek status VIP Donatur
            const isVIP = (peg.is_donatur == 1 || peg.is_donatur == "1");
            const classBarisVIP = isVIP ? 'row-vip-donatur' : '';
            const classNamaVIP = isVIP ? 'name-vip-donatur' : '';
            const badgeVIP = (isVIP && window.getVIPBadgeHTML) ? window.getVIPBadgeHTML(1) : '';

            const tr = document.createElement('tr');
            if (isVIP) tr.className = classBarisVIP; // Tambahkan warna emas ke baris
            
            tr.innerHTML = `
                <td style="text-align: center; vertical-align: middle;">
                    <input type="checkbox" class="chk-dinas" value="${d.id}" style="width: 16px; height: 16px; cursor: pointer;">
                </td>
                <td>${(currentPageDinas - 1) * rowsPerPageDinas + idx + 1}</td>
                <td><img src="${peg.foto}" class="img-tabel" onerror="this.src='Image/default.jpg';"></td>
                
                <!-- Sel Nama Diberi Efek Khusus -->
                <td class="${classNamaVIP}"><b>${peg.nama}</b> ${badgeVIP}<br><small>NIP: ${peg.nip}</small></td>
                <td><small><b>Nodin:</b> ${d.nodin}<br><b>SPT:</b> ${d.spt}<br><b>SPD:</b> ${d.spd}</small></td>
                <td><small>${d.jenisTujuan || "Luar Daerah"}</small><br><b>${d.lokasiTujuan || "-"}</b></td>
                <td><small>${formatTanggalIndonesia(d.tglBerangkat)} <b>s.d</b><br>${formatTanggalIndonesia(d.tglKepulangan)}</small></td>
                <td>${d.keperluan || 'Tugas Pendampingan'}<br><br>${labelLaporanHTML}</td>
                <td><small>${linkHTML}<br><b>Rilis:</b><br>${d.tglDibuat ? formatTanggalBiasa(d.tglDibuat) : '-'}</small></td>
                <td class="no-print" style="width: 165px;">${actionButtons}</td>`;
            tbody.appendChild(tr);
        });
        renderPaginationDinas(result.pagination.total_pages);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#e74c3c; padding:20px;">❌ Gagal memuat riwayat perjalanan dinas.<br><small>${escapeHTML(e.message || 'Kesalahan jaringan.')}</small></td></tr>`;
        renderPaginationDinas(0);
        console.error('Riwayat perjalanan dinas gagal dimuat:', e);
    }
}


// =========================================================================
// ACTION FORM & TOMBOL
// =========================================================================
window.resetPencarian = function() {
    const searchInputDinasEl = document.getElementById('searchDinas'); if(searchInputDinasEl) searchInputDinasEl.value = '';
    const searchTanggalMulaiEl = document.getElementById('searchTanggalMulai'); if(searchTanggalMulaiEl) searchTanggalMulaiEl.value = '';
    const searchTanggalAkhirEl = document.getElementById('searchTanggalAkhir'); if(searchTanggalAkhirEl) searchTanggalAkhirEl.value = '';
    currentSearchDinasKeyword = ''; currentSearchTanggalMulai = ''; currentSearchTanggalAkhir = ''; 
    loadTabelDinasServerSide(1);
}

function renderPaginationDinas(totalPages) {
    let paginationContainer = document.getElementById('paginationControls');
    if (!paginationContainer) {
        const tableElement = document.getElementById('dinasDataBody').parentElement;
        paginationContainer = document.createElement('div'); 
        paginationContainer.id = 'paginationControls'; 
        paginationContainer.style.cssText = "display:flex; justify-content:center; align-items:center; gap:5px; margin-top:15px; margin-bottom:25px;"; 
        tableElement.parentNode.insertBefore(paginationContainer, tableElement.nextSibling);
    }
    paginationContainer.innerHTML = ''; if (totalPages <= 1) return; 

    const btnFactory = (text, page, disabled, active) => {
        const btn = document.createElement('button'); btn.innerHTML = text; btn.className = 'btn'; btn.style.padding = '6px 12px';
        if (text === '...') { 
            btn.disabled = true; btn.style.background = 'transparent'; btn.style.color = '#333'; btn.style.border = 'none'; 
        } else { 
            btn.style.backgroundColor = active ? '#27ae60' : (disabled ? '#bdc3c7' : '#7f8c8d'); btn.style.color = 'white'; btn.disabled = disabled; 
            if(!disabled) btn.onclick = () => { loadTabelDinasServerSide(page); }; 
        } 
        return btn;
    };

    paginationContainer.appendChild(btnFactory('←', currentPageDinas - 1, currentPageDinas === 1, false));
    let pageNumbers = totalPages <= 6 ? Array.from({length: totalPages}, (_, i) => i + 1) : (currentPageDinas <= 4 ? [1,2,3,4,5,'...',totalPages] : (currentPageDinas >= totalPages - 3 ? [1,'...',totalPages-4,totalPages-3,totalPages-2,totalPages-1,totalPages] : [1,'...',currentPageDinas-1,currentPageDinas,currentPageDinas+1,'...',totalPages]));
    pageNumbers.forEach(p => paginationContainer.appendChild(btnFactory(p, p, false, p === currentPageDinas)));
    paginationContainer.appendChild(btnFactory('→', currentPageDinas + 1, currentPageDinas === totalPages, false));
}

window.isiFormKeLayar = function(d) {
    window.isFillingForm = true; 
    
    document.getElementById('jenisLaporan').value = d.jenisLaporan || ''; toggleFormLaporan(); 
    if(selectPegawaiInstance) selectPegawaiInstance.setValue(d.pegawaiId); 
    document.getElementById('jenisTujuan').value = d.jenisTujuan || "Luar Daerah"; toggleTujuan(); 
    document.getElementById('lokasiTujuan').value = d.lokasiTujuan; updateRincianBiaya(); 
    
    document.getElementById('penginapan').value = d.penginapan || ''; 
    document.getElementById('hargaHotel').value = d.hargaHotel || ''; 
    
    document.getElementById('tglTiketBerangkat').value = d.tglTiketBerangkat || ''; 
    document.getElementById('maskapaiBerangkat').value = d.maskapaiBerangkat || ''; 
    document.getElementById('noTiketBerangkat').value = d.noTiketBerangkat || ''; 
    document.getElementById('kodeBookingBerangkat').value = d.kodeBookingBerangkat || ''; 
    document.getElementById('hargaTiketBerangkat').value = d.hargaTiketBerangkat || ''; 
    
    document.getElementById('tglTiketPulang').value = d.tglTiketPulang || ''; 
    document.getElementById('maskapaiPulang').value = d.maskapaiPulang || ''; 
    document.getElementById('noTiketPulang').value = d.noTiketPulang || ''; 
    document.getElementById('kodeBookingPulang').value = d.kodeBookingPulang || ''; 
    document.getElementById('hargaTiketPulang').value = d.hargaTiketPulang || ''; 
    document.getElementById('keteranganTiket').value = d.keteranganTiket || ''; 
    hitungTotalKeseluruhan();
    
    document.getElementById('dinasNodin').value = d.nodin; 
    document.getElementById('dinasSpt').value = d.spt; 
    document.getElementById('dinasSpd').value = d.spd; 
    if (document.getElementById('dinasTglSpd')) document.getElementById('dinasTglSpd').value = d.tglSpd || ''; 
    updateFormatNomorDokumen();

    document.getElementById('tglBerangkat').value = d.tglBerangkat; 
    document.getElementById('tglKepulangan').value = d.tglKepulangan; 
    document.getElementById('durasi').value = d.durasi;
    
    if(document.getElementById('tglKegiatan')) document.getElementById('tglKegiatan').value = d.tglKegiatan || ''; 
    if(document.getElementById('waktuKegiatan')) document.getElementById('waktuKegiatan').value = d.waktuKegiatan || ''; 
    if(document.getElementById('dinasLinkBerita')) document.getElementById('dinasLinkBerita').value = d.linkBerita || ''; 
    document.getElementById('dinasTglDibuat').value = d.tglDibuat || ''; 
    if(document.getElementById('keperluan')) document.getElementById('keperluan').value = d.keperluan || '';
    
    if(document.getElementById('dewanId')) {
        if (selectDewanInstance) {
            selectDewanInstance.setValue(d.dewanId || '');
        } else {
            document.getElementById('dewanId').value = d.dewanId || ''; 
        }
    } 
    
    if(document.getElementById('tglTitik1')) document.getElementById('tglTitik1').value = d.tglTitik1 || ''; 
    if(document.getElementById('waktuTitik1')) document.getElementById('waktuTitik1').value = d.waktuTitik1 || ''; 
    if(document.getElementById('tempatTitik1')) document.getElementById('tempatTitik1').value = d.tempatTitik1 || ''; 
    
    if(document.getElementById('tglTitik2')) document.getElementById('tglTitik2').value = d.tglTitik2 || ''; 
    if(document.getElementById('waktuTitik2')) document.getElementById('waktuTitik2').value = d.waktuTitik2 || ''; 
    if(document.getElementById('tempatTitik2')) document.getElementById('tempatTitik2').value = d.tempatTitik2 || ''; 
    
    if(document.getElementById('raperda')) document.getElementById('raperda').value = d.raperda || '';
    
    const setNsAndMateri = (fieldVal, idNs, idMt) => { 
        let val = fieldVal ? String(fieldVal) : ''; 
        if(val.includes('|#|')) { 
            let parts = val.split('|#|'); 
            if(document.getElementById(idNs)) document.getElementById(idNs).value = parts[0].trim(); 
            if(document.getElementById(idMt)) document.getElementById(idMt).value = parts[1].trim(); 
        } else { 
            if(document.getElementById(idNs)) document.getElementById(idNs).value = val; 
            if(document.getElementById(idMt)) document.getElementById(idMt).value = ''; 
        } 
    };
    
    setNsAndMateri(d.narasumber1, 'narasumber1', 'materi1'); 
    setNsAndMateri(d.narasumber2, 'narasumber2', 'materi2'); 
    setNsAndMateri(d.narasumber3, 'narasumber3', 'materi3');
    
    if(document.getElementById('moderator')) document.getElementById('moderator').value = d.moderator || ''; 
    if(document.getElementById('mc')) document.getElementById('mc').value = d.mc || ''; 
    if(document.getElementById('poinBerkembang')) {
        let pbAsli = d.poinBerkembang || '';
        let valPb = ''; let valKs = '';
        if(pbAsli.includes('|#|KESIMPULAN|#|')){
            let parts = pbAsli.split('|#|KESIMPULAN|#|');
            valPb = parts[0]; valKs = parts[1];
        } else {
            valPb = pbAsli; valKs = '';
        }
        
        // Memasukkan teks kembali ke dalam MS Word Editor
        if (typeof tinymce !== 'undefined' && tinymce.get('poinBerkembang')) {
            tinymce.get('poinBerkembang').setContent(valPb);
        } else {
            document.getElementById('poinBerkembang').value = valPb;
        }
        
        if (typeof tinymce !== 'undefined' && tinymce.get('kesimpulanDinas')) {
            tinymce.get('kesimpulanDinas').setContent(valKs);
        } else if (document.getElementById('kesimpulanDinas')) {
            document.getElementById('kesimpulanDinas').value = valKs;
        }
    }
    
    // MENGISI KEMBALI GAMBAR DARI DATABASE KE FORM
    try { window.dokumentasiUploads_1 = d.dokumentasi ? JSON.parse(d.dokumentasi) : []; } catch(e) { window.dokumentasiUploads_1 = []; }
    try { window.dokumentasiUploads_2 = d.dokumentasi2 ? JSON.parse(d.dokumentasi2) : []; } catch(e) { window.dokumentasiUploads_2 = []; }
    
    if(window.renderPreviewDokumentasi) { 
        window.renderPreviewDokumentasi(1); 
        window.renderPreviewDokumentasi(2); 
    }

    window.isFillingForm = false; 
    window.kalkulasiTotalBiayaDinas();
    
    // KODE TAMBAHAN: Panggil sensor Titik 2 saat form selesai diisi dari mode Edit/Duplikat
    toggleDokumentasi2Visibility();
}

window.editDinas = function(id) { 
    const d = dbDinas.find(x => x.id == id); 
    if(d) { 
        document.getElementById('editDinasId').value = d.id; 
        isiFormKeLayar(d); 
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    } 
}

window.duplikatDinas = function(id) { 
    const d = dbDinas.find(x => x.id == id); 
    if(d) { 
        document.getElementById('editDinasId').value = ''; 
        isiFormKeLayar(d); 
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
        alert("Data disalin ke form! Silakan ubah lalu klik Simpan."); 
    } 
}

window.hapusDinas = async function(id) {
    if(confirm('Apakah Anda yakin ingin menghapus riwayat dinas ini?')) { 
        try { 
            await fetch('PHP/api_penugasan.php', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id }) }); 
            await loadTabelDinasServerSide(currentPageDinas); 
        } catch (error) {} 
    }
}

// =========================================================================
// FITUR EXPORT
// =========================================================================
window.exportExcel = function() {
    // ==========================================
    // KODE PERBAIKAN: WAJIB ISI RENTANG TANGGAL
    // ==========================================
    if (!currentSearchTanggalMulai || !currentSearchTanggalAkhir) {
        alert("🚨 PERINGATAN: Untuk mencegah beban server berlebih, Anda WAJIB memilih Rentang Tanggal (Dari Tanggal s.d Sampai Tanggal) terlebih dahulu sebelum mengekspor data ke Excel.");
        return; // Hentikan proses
    }

    const btn = document.querySelector('.btn[onclick="exportExcel()"]'); 
    const oldText = btn.innerHTML; 
    btn.innerHTML = "⏳ Mengunduh..."; 
    btn.disabled = true;
    
    const url = `PHP/api_penugasan.php?export=penugasan&search=${encodeURIComponent(currentSearchDinasKeyword)}&start_date=${encodeURIComponent(currentSearchTanggalMulai)}&end_date=${encodeURIComponent(currentSearchTanggalAkhir)}`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => { 
        btn.innerHTML = oldText; 
        btn.disabled = false; 
    }, 2000);
}

// Fitur pembantu untuk menarik semua data yang sudah difilter
async function fetchAllFilteredForExport() {
    const url = `PHP/api_penugasan.php?limit=all&search=${encodeURIComponent(currentSearchDinasKeyword)}&start_date=${encodeURIComponent(currentSearchTanggalMulai)}&end_date=${encodeURIComponent(currentSearchTanggalAkhir)}`;
    const response = await fetch(url); 
    const result = await response.json(); 
    return result.data || [];
}

window.exportPDF = async function() {
    // ==========================================
    // KODE PERBAIKAN: WAJIB ISI RENTANG TANGGAL
    // ==========================================
    if (!currentSearchTanggalMulai || !currentSearchTanggalAkhir) {
        alert("🚨 PERINGATAN: Untuk mencegah aplikasi menjadi lambat/crash, Anda WAJIB memilih Rentang Tanggal (Dari Tanggal s.d Sampai Tanggal) terlebih dahulu sebelum mengekspor data ke PDF.");
        return; // Hentikan proses
    }

    const btn = document.querySelector('.btn[onclick="exportPDF()"]'); 
    const oldText = btn.innerHTML; 
    btn.innerHTML = "⏳ Menyiapkan PDF..."; 
    btn.disabled = true;
    
    const fullData = await fetchAllFilteredForExport();
    if (fullData.length === 0) { 
        alert("Tabel masih kosong atau tidak ada data pada rentang tanggal tersebut!"); 
        btn.innerHTML = oldText; 
        btn.disabled = false; 
        return; 
    }
    
    const { jsPDF } = window.jspdf; 
    const doc = new jsPDF('landscape'); 
    doc.setFontSize(14); 
    doc.text("Rekapitulasi Laporan Riwayat Perjalanan Dinas", 14, 15); 
    doc.setFontSize(10); 
    doc.text("Tanggal Unduh: " + formatTanggalIndonesia(new Date()), 14, 22);

    const tableColumn = ["No", "Pegawai (NIP)", "Nomor Dokumen", "Waktu & Tujuan", "Keperluan", "Akomodasi & Tiket", "Laporan"];
    const tableRows = [];

    fullData.forEach((d, index) => {
        const peg = window.dbPegawai.find(p => p.id == d.pegawai_id) || { nama: '-', nip: '-' };
        const infoWaktuTujuan = `${d.jenis_tujuan || 'Luar Daerah'} (${d.lokasi_tujuan || '-'})\nBerangkat: ${d.tgl_berangkat}\nPulang: ${d.tgl_kepulangan} (${d.durasi} Hari)\nKegiatan 1: ${d.tgl_titik1 || d.tgl_kegiatan || '-'} ${d.waktu_titik1 || d.waktu_kegiatan || ''}`;
        
        let infoAkomodasi = "Tidak Ada";
        if (d.jenis_tujuan === 'Luar Daerah') { 
            const hHotel = d.harga_hotel ? `Rp${parseFloat(d.harga_hotel).toLocaleString('id-ID')}` : '-'; 
            const totalTiket = (parseFloat(d.harga_tiket_berangkat) || 0) + (parseFloat(d.harga_tiket_pulang) || 0); 
            const hTiketStr = totalTiket > 0 ? `Rp${totalTiket.toLocaleString('id-ID')}` : '-'; 
            infoAkomodasi = `HOTEL: ${d.penginapan || '-'} (${hHotel})\nBRGKT: ${d.maskapai_berangkat || '-'} | ${d.no_tiket_berangkat || '-'}\nPLG: ${d.maskapai_pulang || '-'} | ${d.no_tiket_pulang || '-'}\nTOTAL TIKET: ${hTiketStr}`; 
        }
        
        tableRows.push([
            index + 1, 
            `${peg.nama}\nNIP: ${peg.nip}`, 
            `Nodin: ${d.nodin}\nSPT: ${d.spt}\nSPD: ${d.spd}`, 
            infoWaktuTujuan, 
            d.keperluan, 
            infoAkomodasi, 
            `Tipe: ${d.jenis_laporan || 'Humas'}\nDibuat: ${d.tgl_dibuat}\nLink: ${d.link_berita ? 'Tersedia' : '-'}`
        ]);
    });
    
    doc.autoTable({ 
        head: [tableColumn], 
        body: tableRows, 
        startY: 28, 
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' }, 
        headStyles: { fillColor: [52, 73, 94] }, 
        columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 35 }, 2: { cellWidth: 35 }, 3: { cellWidth: 40 }, 4: { cellWidth: 'auto' }, 5: { cellWidth: 55 }, 6: { cellWidth: 25 } } 
    });
    doc.save("Rekap_Data_Perjalanan_Dinas_" + new Date().toISOString().split('T')[0] + ".pdf"); 
    btn.innerHTML = oldText; 
    btn.disabled = false;
}

// =========================================================================
// FITUR BULK PRINT (CETAK MASSAL BERDASARKAN CENTANG)
// =========================================================================
window.toggleSelectAllDinas = function(source) {
    const checkboxes = document.querySelectorAll('.chk-dinas');
    checkboxes.forEach(chk => {
        chk.checked = source.checked;
    });
};

window.bulkPrintTerpilih = function() {
    // 1. Kumpulkan semua kotak yang dicentang
    const checkedBoxes = document.querySelectorAll('.chk-dinas:checked');
    if (checkedBoxes.length === 0) {
        alert("Silakan centang minimal satu laporan di tabel yang ingin dicetak.");
        return;
    }

    const btn = document.getElementById('btnBulkPrint');
    const oldText = btn ? btn.innerHTML : "🖨️ Cetak Pilihan (Bulk)";
    if(btn) {
        btn.innerHTML = "⏳ Menggabungkan Laporan...";
        btn.disabled = true;
    }

    const template = document.getElementById('printTemplate');
    let allHtml = "";
    
    // 2. BAJAK FUNGSI PRINT SEMENTARA
    const originalPrint = window.print;
    window.print = function() { 
        console.log("Print asli dicegah sementara untuk penggabungan dokumen."); 
    };

    try {
        // 3. PROSES HANYA YANG DICENTANG
        checkedBoxes.forEach((box) => {
            const id = box.value;
            const d = window.dbDinas.find(x => x.id == id);
            if (!d) return;

            template.innerHTML = ""; 
            
            if (d.jenisLaporan === 'Sosper') { if(window.cetakLaporanSosper) window.cetakLaporanSosper(d.id, true); }
            else if (d.jenisLaporan === 'Sosrev') { if(window.cetakLaporanSosrev) window.cetakLaporanSosrev(d.id, true); }
            else if (d.jenisLaporan === 'SosperDewan') { if(window.cetakLaporanSosperDewan) window.cetakLaporanSosperDewan(d.id, true); }
            else if (d.jenisLaporan === 'SosrevDewan') { if(window.cetakLaporanSosrevDewan) window.cetakLaporanSosrevDewan(d.id, true); }
            else if (d.jenisLaporan === 'FasilitasiHumas') { if(window.cetakLaporanFasilitasiHumas) window.cetakLaporanFasilitasiHumas(d.id, true); }
            else if (d.jenisLaporan === 'Humas') { if(window.cetakLaporanHumas) window.cetakLaporanHumas(d.id, true); }
            else if (d.jenisLaporan === 'DewanBanggar') { if(window.cetakLaporanDewanBanggar) window.cetakLaporanDewanBanggar(d.id, true); }
            else if (d.jenisLaporan === 'StafBanggar') { if(window.cetakLaporanStafBanggar) window.cetakLaporanStafBanggar(d.id, true); }
            
            let currentHtml = template.innerHTML.trim();
            if(currentHtml === "") return; 

            // Tambahkan Pemisah Halaman (Page Break) antar laporan karyawan
            if (allHtml !== "") {
                allHtml += '<div class="page-break" style="page-break-before: always; clear: both; padding-top: 2px;"></div>';
            }
            
            allHtml += currentHtml;
        });
        
        // 4. MASUKKAN SELURUH HTML GABUNGAN KE DALAM TEMPLATE FINAL
        template.innerHTML = allHtml;
        
    } catch (error) {
        console.error(error);
        alert("Terjadi kesalahan saat menggabungkan dokumen.");
    }

    // 5. KEMBALIKAN FUNGSI PRINT & EKSEKUSI
    setTimeout(() => {
        window.print = originalPrint; 
        window.print();               
        
        if(btn) {
            btn.innerHTML = oldText;
            btn.disabled = false;
        }
    }, 3000); // Tunggu 3 detik agar foto-foto dokumentasi ter-render
};

window.previewDokumentasiDinas = async function(input, titik) {
    const files=input.files;if(!files||!files.length)return; const key=titik===1?'dokumentasiUploads_1':'dokumentasiUploads_2'; if(!window[key])window[key]=[];
    if(window[key].length+files.length>6){alert('Maksimal 6 foto per kegiatan/titik!');input.value='';return;}
    for(let i=0;i<files.length;i++){const file=files[i];if(!file.type.startsWith('image/'))continue;window[key].push({file:file,preview:URL.createObjectURL(file)});}
    window.renderPreviewDokumentasi(titik);input.value='';
};

window.renderPreviewDokumentasi = function(titik) {
    const container = document.getElementById('previewDokumentasi' + titik);
    if (!container) return;
    
    const arr = titik === 1 ? window.dokumentasiUploads_1 : window.dokumentasiUploads_2;
    container.innerHTML = '';
    
    arr.forEach((src, index) => {
        container.innerHTML += `
            <div style="position: relative; display: inline-block; width: 80px;">
                <img src="${src.preview || src}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1; cursor: zoom-in;" onclick="if(window.openMediaModal) window.openMediaModal(this.src, 'image')">
                <button type="button" onclick="hapusDokumentasiDinas(${index}, ${titik})" style="position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; font-weight: bold; font-size: 10px; line-height: 1; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">X</button>
            </div>
        `;
    });
}

window.hapusDokumentasiDinas = function(index, titik) {
    if (titik === 1) {
        window.dokumentasiUploads_1.splice(index, 1);
    } else {
        window.dokumentasiUploads_2.splice(index, 1);
    }
    window.renderPreviewDokumentasi(titik);
}

window.resetFormDinas = function() {
    const formEl = document.getElementById('dinasForm'); 
    if(formEl) formEl.reset();
    
    document.getElementById('editDinasId').value = ''; 
    document.getElementById('containerRincianBiaya').style.display = 'none';
    
    // MENGHAPUS PREVIEW FOTO
    window.dokumentasiUploads_1 = [];
    window.dokumentasiUploads_2 = [];
    if(document.getElementById('previewDokumentasi1')) document.getElementById('previewDokumentasi1').innerHTML = '';
    if(document.getElementById('previewDokumentasi2')) document.getElementById('previewDokumentasi2').innerHTML = '';
    
    if (selectPegawaiInstance) selectPegawaiInstance.clear();
    if (selectDewanInstance) selectDewanInstance.clear();
    const jl = document.getElementById('jenisLaporan'); 
    if(jl) jl.value = ''; 
    
    toggleFormLaporan(); 
    hitungTotalKeseluruhan(); 
    toggleTujuan(); 
    window.kalkulasiTotalBiayaDinas();
    
    // KODE TAMBAHAN: Panggil sensor Titik 2 saat form dibatalkan/direset
    toggleDokumentasi2Visibility();
    
    if (typeof tinymce !== 'undefined') {
        if(tinymce.get('poinBerkembang')) tinymce.get('poinBerkembang').setContent('');
        if(tinymce.get('kesimpulanDinas')) tinymce.get('kesimpulanDinas').setContent('');
    }
}