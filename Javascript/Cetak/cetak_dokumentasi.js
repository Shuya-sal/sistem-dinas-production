// File: Javascript/Cetak/cetak_dokumentasi.js

window.getLampiranDokumentasiHTML = function(id, kopSuratHTML) {
    try {
        const d = window.dbDinas.find(x => x.id == id);
        if (!d) return '';

        // 1. Ambil foto dari Titik 1 dan Titik 2
        let images1 = [];
        let images2 = [];
        try { images1 = JSON.parse(d.dokumentasi || '[]'); } catch(e) {}
        try { images2 = JSON.parse(d.dokumentasi2 || '[]'); } catch(e) {}

        // Jika tidak ada foto sama sekali, kosongkan lampiran
        if (images1.length === 0 && images2.length === 0) return '';

        // Fungsi Format Tanggal
        const formatHariTanggal = (dateString) => {
            if (!dateString) return "";
            const date = new Date(dateString);
            const daftarHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"];
            const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
            return `${daftarHari[date.getDay()]}, tanggal ${date.getDate()} ${daftarBulan[date.getMonth()]} ${date.getFullYear()}`;
        };

        // Fungsi Cerdas Format Waktu (Mencegah "Pukul Pukul" atau "WITA Wita")
        const formatWaktu = (waktuStr) => {
            if (!waktuStr) return '';
            // Hapus kata 'pukul' dan 'wita' dari inputan user jika terlanjur diketik, lalu susun ulang agar rapi
            const bersih = waktuStr.replace(/pukul/i, '').trim();
            return `Pukul ${bersih}`;
        };

        let htmlUtama = '';

        // ==========================================
        // BLOK RENDER DOKUMENTASI TITIK 1
        // ==========================================
        if (images1.length > 0) {
            const tgl1 = d.tglTitik1 ? formatHariTanggal(d.tglTitik1) : (d.tglKegiatan ? formatHariTanggal(d.tglKegiatan) : '');
            const wkt1 = formatWaktu(d.waktuTitik1 || d.waktuKegiatan || '');
            const tmpt1 = d.tempatTitik1 || d.lokasiTujuan || '';
            
            let caption1 = '';
            if (tgl1) {
                caption1 = `<p style="text-align: justify; margin-bottom: 10px; font-size: 14px;">Dilaksanakan hari ${tgl1}, ${wkt1}, bertempat di ${tmpt1}.</p>`;
            }

            let imgHtml1 = images1.map(img => `
                <div style="width: 48%; margin-bottom: 15px; text-align: center; page-break-inside: avoid;">
                    <img src="${img}" style="width: 100%; height: 260px; object-fit: cover; border-radius: 8px; border: 1px solid #334155; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                </div>
            `).join('');

            htmlUtama += `
            <div class="page-break" style="page-break-before: always; clear: both; padding-top: 20px;"></div>
            <div class="print-title-doc" style="text-align: center; margin-top: 15px; margin-bottom: 20px;">
                <h3 style="font-size:18px; margin:0; text-decoration: underline; font-family: 'Times New Roman', Times, serif; color: #000;">DOKUMENTASI KEGIATAN</h3>
            </div>
            <div class="print-content" style="font-family: 'Times New Roman', Times, serif; color: #000;">
                ${caption1}
                <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; margin-top: 15px;">
                    ${imgHtml1}
                </div>
            </div>
            `;
        }

        // ==========================================
        // BLOK RENDER DOKUMENTASI TITIK 2
        // ==========================================
        if (images2.length > 0) {
            const tgl2 = d.tglTitik2 ? formatHariTanggal(d.tglTitik2) : '';
            const wkt2 = formatWaktu(d.waktuTitik2 || '');
            const tmpt2 = d.tempatTitik2 || '';
            
            let caption2 = '';
            if (tgl2) {
                caption2 = `<p style="text-align: justify; margin-bottom: 10px; font-size: 14px;">Dilaksanakan hari ${tgl2}, ${wkt2}, bertempat di ${tmpt2}.</p>`;
            }

            let imgHtml2 = images2.map(img => `
                <div style="width: 48%; margin-bottom: 15px; text-align: center; page-break-inside: avoid;">
                    <img src="${img}" style="width: 100%; height: 260px; object-fit: cover; border-radius: 8px; border: 1px solid #334155; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                </div>
            `).join('');

            htmlUtama += `
            <div class="page-break" style="page-break-before: always; clear: both; padding-top: 20px;"></div>
            <div class="print-title-doc" style="text-align: center; margin-top: 15px; margin-bottom: 20px;">
                <h3 style="font-size:18px; margin:0; text-decoration: underline; font-family: 'Times New Roman', Times, serif; color: #000;">DOKUMENTASI KEGIATAN</h3>
            </div>
            <div class="print-content" style="font-family: 'Times New Roman', Times, serif; color: #000;">
                ${caption2}
                <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; margin-top: 15px;">
                    ${imgHtml2}
                </div>
            </div>
            `;
        }

        return `<!-- ================= BAGIAN LAMPIRAN DOKUMENTASI ================= -->` + htmlUtama;

    } catch (e) {
        console.error("Gagal memuat dokumentasi foto:", e);
        return '';
    }
};