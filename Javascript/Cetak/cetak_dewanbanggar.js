// ================= CETAK LAPORAN BANGGAR DEWAN =================
window.cetakLaporanDewanBanggar = function(id, isBulk = false) {
    if (!window.dbDinas || !window.dbPegawai) { alert("Data belum siap."); return; }
    
    const d = window.dbDinas.find(x => x.id === id); 
    if(!d) { alert("Data tidak ditemukan."); return; }
    
    // Ambil data pelaksana dan Pengguna Anggaran (PA)
    const peg = window.dbPegawai.find(p => p.id === d.pegawaiId) || { nama: '-', nip: '-', jabatan: '-', pangkat: '-', golongan: '-' };
    const pa = window.dbPegawai.find(p => p.tingkat === 'Pengguna Anggaran') || { nama: '(Belum Ada PA)', jabatan: '-', nip: '-' };

    // Format Tanggal
    const formatTanggalBiasa = (dateString) => {
        if (!dateString) return "-"; 
        const date = new Date(dateString);
        const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        return `${date.getDate()} ${daftarBulan[date.getMonth()]} ${date.getFullYear()}`;
    };
    
    const formatRentangTanggal = (date1, date2) => {
        if (!date1 || !date2) return "-";
        const d1 = new Date(date1), d2 = new Date(date2);
        const bln = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        if (d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth()) {
            return d1.getDate() === d2.getDate() ? `${d1.getDate()} ${bln[d1.getMonth()]} ${d1.getFullYear()}` : `${d1.getDate()} - ${d2.getDate()} ${bln[d1.getMonth()]} ${d1.getFullYear()}`;
        } else if (d1.getFullYear() === d2.getFullYear()) {
            return `${d1.getDate()} ${bln[d1.getMonth()]} - ${d2.getDate()} ${bln[d2.getMonth()]} ${d1.getFullYear()}`;
        }
        return `${d1.getDate()} ${bln[d1.getMonth()]} ${d1.getFullYear()} - ${d2.getDate()} ${bln[d2.getMonth()]} ${d2.getFullYear()}`;
    };

    const tglObj = new Date(d.tglTitik1 || d.tglBerangkat || d.tglDibuat);
    const hariArr = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"];
    const namaHari = hariArr[tglObj.getDay()];
    const tglLengkap = formatTanggalBiasa(tglObj);
    const rentangTanggalTeks = formatRentangTanggal(d.tglBerangkat, d.tglKepulangan);

    // Identitas untuk Pakta Integritas
    const tglTempatLahir = peg.tempat_lahir && peg.tgl_lahir ? `${peg.tempat_lahir}, ${formatTanggalBiasa(peg.tgl_lahir)}` : '-';
    const alamatPegawai = peg.alamat || '-';
    const nikPegawai = peg.nik || '-';

    // Merapikan Teks Jabatan
    let jbt = peg.jabatan || 'Anggota';
    if (jbt.toLowerCase().includes('anggota dprd')) jbt = 'Anggota';

    // Merapikan Waktu dan Tempat Pelaksanaan
    let wktTugas = d.waktuTitik1 || d.waktuKegiatan || '-';
    if(wktTugas !== '-' && !wktTugas.toLowerCase().includes('wi')) wktTugas += " WITA";
    const strWaktu = `Dilaksanakan pada hari ${namaHari}, Tanggal ${tglLengkap} Pukul ${wktTugas} di ${d.tempatTitik1 || d.lokasiTujuan || '-'}.`;

    // ==============================================================
    // PEMISAH CERDAS DARI DATABASE (Menggunakan Split Code)
    // ==============================================================
    const poinStr = d.poinBerkembang ? String(d.poinBerkembang) : '';
    let hasilText = poinStr;
    let kesimpulanText = "-";

    if (poinStr.includes('|#|KESIMPULAN|#|')) {
        let splitArr = poinStr.split('|#|KESIMPULAN|#|');
        hasilText = splitArr[0].trim();
        kesimpulanText = splitArr[1].trim(); 
    }

    let hasilHtml = `<div class="rich-text-area" style="text-align: justify;">${hasilText || '-'}</div>`;
    let kesimpulanHtml = `<div class="rich-text-area" style="text-align: justify;">${kesimpulanText || '-'}</div>`;
    // ==============================================================

    const kopSuratDewanHTML = typeof window.getKopSuratDewan === 'function' ? window.getKopSuratDewan() : '';
    const template = document.getElementById('printTemplate');
    if (!template) { alert("Template cetak tidak ditemukan."); return; }

    // ==============================================================
    // HTML PAKTA INTEGRITAS (INI YANG SEBELUMNYA TIDAK SENGAJA SAYA HAPUS)
    // ==============================================================
    const paktaIntegritasHTML = `
        <div class="page-break" style="page-break-before: always; clear: both; padding-top: 20px;"></div>
        ${kopSuratDewanHTML}
        <div class="print-title-doc" style="text-align: center; margin-bottom: 20px;">
            <h3 style="font-size:16px; margin:0; text-decoration: underline;">PAKTA INTEGRITAS</h3>
            <h3 style="font-size:16px; margin:0;">PERJALANAN DINAS PIMPINAN DAN ANGGOTA DEWAN PERWAKILAN RAKYAT DAERAH PROVINSI KALIMANTAN SELATAN</h3>
        </div>
        <div class="print-content" style="font-size: 14px; text-align: justify; line-height: 1.5;">
            <p>Yang bertanda tangan di bawah ini:</p>
            <table style="width: 100%; border: 0 !important; border-collapse: collapse !important; margin-bottom: 15px; line-height: 1.5;">
                <tr style="border: 0 !important;">
                    <td style="width: 25%; padding: 2px 0 !important; border: 0 !important;">Nama</td>
                    <td style="width: 2%; padding: 2px 0 !important; border: 0 !important;">:</td>
                    <td style="padding: 2px 0 !important; border: 0 !important;"><b>${peg.nama}</b></td>
                </tr>
                <tr style="border: 0 !important;">
                    <td style="padding: 2px 0 !important; border: 0 !important;">Tempat, tanggal lahir</td>
                    <td style="padding: 2px 0 !important; border: 0 !important;">:</td>
                    <td style="padding: 2px 0 !important; border: 0 !important;">${tglTempatLahir}</td>
                </tr>
                <tr style="border: 0 !important;">
                    <td style="padding: 2px 0 !important; border: 0 !important;">NIK</td>
                    <td style="padding: 2px 0 !important; border: 0 !important;">:</td>
                    <td style="padding: 2px 0 !important; border: 0 !important;">${nikPegawai}</td>
                </tr>
                <tr style="border: 0 !important;">
                    <td style="padding: 2px 0 !important; border: 0 !important;">Jabatan</td>
                    <td style="padding: 2px 0 !important; border: 0 !important;">:</td>
                    <td style="padding: 2px 0 !important; border: 0 !important;">${peg.jabatan || 'ANGGOTA DPRD PROVINSI KALIMANTAN SELATAN'}</td>
                </tr>
                <tr style="border: 0 !important;">
                    <td style="padding: 2px 0 !important; vertical-align: top; border: 0 !important;">Alamat</td>
                    <td style="padding: 2px 0 !important; vertical-align: top; border: 0 !important;">:</td>
                    <td style="padding: 2px 0 !important; border: 0 !important; text-align: justify;">${alamatPegawai}</td>
                </tr>
            </table>
            <p>Dengan ini menyatakan:</p>
            <ol style="padding-left: 20px;">
                <li style="margin-bottom: 8px;">Bahwa saya akan melaksanakan tugas perjalanan dinas sesuai dengan Surat Tugas Nomor ${d.spt || '-'} tanggal ${d.tglSpd ? formatTanggalBiasa(d.tglSpd) : formatTanggalBiasa(d.tglDibuat)} dalam rangka Pelaksanaan ${d.keperluan || 'Tugas Kedinasan Banggar'} pada tanggal ${rentangTanggalTeks}, ${d.lokasiTujuan || '-'}.</li>
                <li style="margin-bottom: 8px;">Bahwa saya bersedia mempertanggungjawabkan biaya perjalanan dinas kepada pemberi tugas dan mempertanggungjawabkan biaya perjalanan dinas kepada Pengguna Anggaran/Kuasa Pengguna Anggaran paling lambat 5 (lima) hari kerja terhitung setelah perjalanan dinas dilaksanakan.</li>
                <li style="margin-bottom: 8px;">Bahwa saya bersedia mengembalikan/menyetorkan kelebihan biaya perjalanan dinas apabila biaya perjalanan dinas yang dibayarkan kepada saya melebihi biaya perjalanan dinas yang seharusnya dipertanggungjawabkan sesuai ketentuan peraturan perundang-undangan yang berlaku.</li>
            </ol>
            <p style="margin-top: 15px;">Demikian pernyataan ini saya buat dengan sebenarnya secara sadar dan tanpa paksaan dari siapa pun. Apabila dikemudian hari terdapat kekeliruan dan/atau penyimpangan, saya bersedia dituntut sesuai dengan hukum yang berlaku.</p>
        </div>
        <table class="signature-table" style="margin-top: 40px; font-size: 14px; width: 100%;">
            <tr>
                <td style="width: 50%;"></td>
                <td style="width: 50%; text-align: center;">
                    Banjarmasin, ${formatTanggalBiasa(d.tglDibuat)}<br>
                    Pelaksana Perjalanan Dinas,<br><br><br><br><br>
                    <b>${peg.nama}</b>
                </td>
            </tr>
        </table>
    `;

    // ==============================================================
    // HTML SURAT TIDAK MENGINAP (INI JUGA SEBELUMNYA TERHAPUS)
    // ==============================================================
    const suratTidakMenginapHTML = `
        <div style="page-break-before: always; clear: both; padding-top: 20px;"></div>
        ${kopSuratDewanHTML}
        <div class="print-title-doc" style="text-align: center; margin-bottom: 25px;">
            <h3 style="font-size:16px; text-decoration: underline; margin:0;">SURAT PERNYATAAN TIDAK MENGINAP DI HOTEL</h3>
        </div>
        <div class="print-content" style="font-size: 14px; line-height: 1.5;">
            <p>Yang bertanda tangan di bawah ini :</p>
            <table style="width: 100%; border: none !important; margin-bottom: 15px;">
                <tr><td style="width: 150px; border: none !important; padding: 2px 0;">Nama</td><td style="width: 10px; border: none !important; padding: 2px 0;">:</td><td style="border: none !important; padding: 2px 0;"><b>${peg.nama}</b></td></tr>
                <tr><td style="border: none !important; padding: 2px 0;">NIP</td><td style="border: none !important; padding: 2px 0;">:</td><td style="border: none !important; padding: 2px 0;">${peg.nip || '-'}</td></tr>
                <tr><td style="border: none !important; padding: 2px 0;">Jabatan</td><td style="border: none !important; padding: 2px 0;">:</td><td style="border: none !important; padding: 2px 0;">${peg.jabatan || 'Anggota DPRD'}</td></tr>
            </table>
            <p style="margin-top: 10px; text-align: justify;">Berdasarkan surat Perjalanan Dinas (SPD) No. <b>${d.spd || '-'}</b> tanggal <b>${d.tglSpd ? formatTanggalBiasa(d.tglSpd) : formatTanggalBiasa(d.tglDibuat)}</b>, dengan ini kami menyatakan dengan sesungguhnya bahwa, selama dan/ atau sebagian dari hari perjalanan dinas di atas, saya tidak menggunakan/ menginap di hotel/ penginapan yang dibayar, dikarenakan tidak ada tarif/ ketentuan yang mengharuskan saya membayar di tempat saya menginap tersebut.</p>
            <p style="margin-top: 10px; text-align: justify;">Demikian surat pernyataan ini dibuat dengan sebenarnya dan untuk dipergunakan sebagaimana mestinya.</p>
        </div>
        <table class="signature-table" style="margin-top: 40px; font-size: 14px; width: 100%;">
            <tr>
                <td style="width: 50%;"></td>
                <td style="width: 50%; text-align: center;">
                    Banjarmasin, ${formatTanggalBiasa(d.tglDibuat)}<br>
                    Pelaksana SPD,<br><br><br><br><br>
                    <b style="text-decoration: underline;">${peg.nama}</b>
                    ${(peg.jabatan && peg.jabatan.toLowerCase().includes('anggota dprd')) || (peg.status && peg.status.toLowerCase().includes('anggota dprd')) ? '' : `<br>NIP. ${peg.nip || '-'}`}
                </td>
            </tr>
        </table>
    `;

    // Render Keseluruhan Template Cetak
    template.innerHTML = `
        <style>
            .rich-text-area ul, .rich-text-area ol { padding-left: 20px !important; margin-top: 5px !important; margin-bottom: 5px !important; }
            .rich-text-area ul { list-style-type: disc !important; }
            .rich-text-area ol { list-style-type: decimal !important; font-weight: normal !important; }
            .rich-text-area li { margin-bottom: 5px !important; display: list-item !important; font-weight: normal !important;}
            .rich-text-area p { margin: 0 0 6px 0 !important; font-weight: normal !important;}
        </style>
        
        ${kopSuratDewanHTML}
        
        <div class="print-title-doc" style="text-align: center; margin-top: 10px; margin-bottom: 25px; line-height: 1.2;">
            <span style="font-size: 16px; font-weight: bold; text-decoration: underline;">LAPORAN PERJALANAN DINAS</span><br>
        </div>

        <table style="width: 100%; font-size: 14px; margin-bottom: 10px; border: 0 !important; border-collapse: collapse !important; line-height: 1.5;">
            <tr style="border: 0 !important;">
                <td style="width: 15%; padding: 0 !important; border: 0 !important;">Kepada</td>
                <td style="width: 2%; padding: 0 !important; border: 0 !important;">:</td>
                <td style="padding: 0 !important; border: 0 !important;">Ketua DPRD Provinsi Kalimantan Selatan</td>
            </tr>
            <tr style="border: 0 !important;">
                <td style="padding: 0 !important; border: 0 !important;">Dari</td>
                <td style="padding: 0 !important; border: 0 !important;">:</td>
                <td style="padding: 0 !important; border: 0 !important;">${peg.jabatan || 'Anggota DPRD Provinsi Kalimantan Selatan'}</td>
            </tr>
            <tr style="border: 0 !important;">
                <!-- KODE PERBAIKAN: Tanggal di Kop merujuk ke Tanggal Laporan Dibuat -->
                <td style="padding: 0 !important; border: 0 !important;">Tanggal</td>
                <td style="padding: 0 !important; border: 0 !important;">:</td>
                <td style="padding: 0 !important; border: 0 !important;">${formatTanggalBiasa(d.tglDibuat)}</td>
            </tr>
            <tr style="border: 0 !important;">
                <td style="padding: 0 !important; vertical-align: top; border: 0 !important;">Perihal</td>
                <td style="padding: 0 !important; vertical-align: top; border: 0 !important;">:</td>
                <td style="padding: 0 !important; text-align: justify; border: 0 !important;">Laporan Perjalanan Dinas</td>
            </tr>
        </table>
        
        <div style="border-top: 1px solid black; margin-bottom: 15px;"></div>

        <div class="print-content" style="font-size: 14px; line-height: 1.5;">
            
            <!-- a. Dasar -->
            <div style="display: flex; margin-bottom: 12px;">
                <div style="width: 5%; font-weight: bold;">a.</div>
                <div style="width: 95%;">
                    <div style="font-weight: bold; margin-bottom: 4px;">Dasar :</div>
                    <div style="display: flex;">
                        <div style="width: 18%;">SPD Nomor</div>
                        <div style="width: 2%;">:</div>
                        <div style="width: 80%; text-align: justify;">${d.spd || '-'}</div>
                    </div>
                    <div style="display: flex; margin-top: 4px;">
                        <div style="width: 18%;">S P T Nomor</div>
                        <div style="width: 2%;">:</div>
                        <div style="width: 80%; text-align: justify;">${d.spt || '-'}</div>
                    </div>
                </div>
            </div>

            <!-- b. Maksud dan Tujuan -->
            <div style="display: flex; margin-bottom: 12px;">
                <div style="width: 5%; font-weight: bold;">b.</div>
                <div style="width: 95%;">
                    <div style="font-weight: bold; margin-bottom: 4px;">Maksud dan Tujuan :</div>
                    <div style="display: flex;">
                        <div style="width: 18%;">Maksud</div>
                        <div style="width: 2%;">:</div>
                        <div style="width: 80%; text-align: justify;">${d.keperluan || '-'}</div>
                    </div>
                    <div style="display: flex; margin-top: 4px;">
                        <div style="width: 18%;">Tujuan</div>
                        <div style="width: 2%;">:</div>
                        <div style="width: 80%; text-align: justify;">${d.lokasiTujuan || '-'}</div>
                    </div>
                </div>
            </div>

            <!-- c. Waktu dan Tempat -->
            <div style="display: flex; margin-bottom: 12px;">
                <div style="width: 5%; font-weight: bold;">c.</div>
                <div style="width: 95%;">
                    <div style="font-weight: bold; margin-bottom: 4px;">Waktu dan Tempat :</div>
                    <div style="text-align: justify;">
                        ${strWaktu}
                    </div>
                </div>
            </div>

            <!-- d. Hasil Komparasi -->
            <div style="display: flex; margin-bottom: 12px;">
                <div style="width: 5%; font-weight: bold;">d.</div>
                <div style="width: 95%;">
                    <div style="font-weight: bold; margin-bottom: 4px;">Hasil Komparasi/Monitoring:</div>
                    ${hasilHtml}
                </div>
            </div>

            <!-- e. Kesimpulan -->
            <div style="display: flex; margin-bottom: 12px;">
                <div style="width: 5%; font-weight: bold;">e.</div>
                <div style="width: 95%;">
                    <div style="font-weight: bold; margin-bottom: 4px;">Kesimpulan:</div>
                    ${kesimpulanHtml}
                </div>
            </div>

        </div>

        <table class="signature-table" style="margin-top: 40px; font-size: 14px; width: 100%;">
            <tr>
                <td style="width: 50%;"></td>
                <td style="width: 50%; text-align: center;">
                    Pelaksana SPD<br><br><br><br><br>
                    <b style="text-decoration: underline;">${peg.nama}</b>
                </td>
            </tr>
        </table>

        <!-- PANGGIL PAKTA INTEGRITAS -->
        ${paktaIntegritasHTML}

        <!-- PANGGIL CETAK RILL -->
        ${typeof window.getLaporanRillHTML === 'function' ? window.getLaporanRillHTML(id, kopSuratDewanHTML, pa) : ''}
        
        <!-- PANGGIL SURAT TIDAK MENGINAP -->
        ${suratTidakMenginapHTML}

        <!-- PANGGIL CETAK DOKUMENTASI -->
        ${typeof window.getLampiranDokumentasiHTML === 'function' ? window.getLampiranDokumentasiHTML(id, kopSuratDewanHTML) : ''}
    `;

    if (!isBulk) {
    setTimeout(function() { window.print(); }, 1000);
    }
}