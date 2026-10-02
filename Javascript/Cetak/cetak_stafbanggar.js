// ================= CETAK LAPORAN BANGGAR STAF =================
window.cetakLaporanStafBanggar = function(id, isBulk = false) {
    if (!window.dbDinas || !window.dbPegawai) { alert("Data belum siap."); return; }
    
    const d = window.dbDinas.find(x => x.id === id); 
    if(!d) { alert("Data tidak ditemukan."); return; }
    
    const peg = window.dbPegawai.find(p => p.id === d.pegawaiId) || { nama: '-', nip: '-', jabatan: '-', pangkat: '-', golongan: '-' };
    const pa = window.dbPegawai.find(p => p.tingkat === 'Pengguna Anggaran') || { nama: '(Belum Ada PA)', jabatan: '-', nip: '-' };

    const formatTanggalBiasa = (dateString) => {
        if (!dateString) return "-"; 
        const date = new Date(dateString);
        const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        return `${date.getDate()} ${daftarBulan[date.getMonth()]} ${date.getFullYear()}`;
    };

    const tglObj = new Date(d.tglTitik1 || d.tglBerangkat || d.tglDibuat);
    const hariArr = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"];
    const namaHari = hariArr[tglObj.getDay()];
    const tglLengkap = formatTanggalBiasa(tglObj);

    let wktTugas = d.waktuTitik1 || d.waktuKegiatan || '-';
    if(wktTugas !== '-' && !wktTugas.toLowerCase().includes('wi')) wktTugas += " WITA";
    const strWaktu = `Dilaksanakan pada hari ${namaHari}, Tanggal ${tglLengkap} Pukul ${wktTugas} di ${d.tempatTitik1 || d.lokasiTujuan || '-'}.`;

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

    // KODE PERBAIKAN: Menggunakan Kop Surat Standar (Sekretariat)
    const kopSuratHTML = typeof window.getKopSuratStandar === 'function' ? window.getKopSuratStandar() : '';
    const template = document.getElementById('printTemplate');
    if (!template) { alert("Template cetak tidak ditemukan."); return; }

    // HTML SURAT TIDAK MENGINAP (Kop Sekretariat)
    const suratTidakMenginapHTML = `
        <div style="page-break-before: always; clear: both; padding-top: 20px;"></div>
        ${kopSuratHTML}
        <div class="print-title-doc" style="text-align: center; margin-bottom: 25px;">
            <h3 style="font-size:16px; text-decoration: underline; margin:0;">SURAT PERNYATAAN TIDAK MENGINAP DI HOTEL</h3>
        </div>
        <div class="print-content" style="font-size: 14px; line-height: 1.5;">
            <p>Yang bertanda tangan di bawah ini :</p>
            <table style="width: 100%; border: none !important; margin-bottom: 15px;">
                <tr><td style="width: 150px; border: none !important; padding: 2px 0;">Nama</td><td style="width: 10px; border: none !important; padding: 2px 0;">:</td><td style="border: none !important; padding: 2px 0;"><b>${peg.nama}</b></td></tr>
                <tr><td style="border: none !important; padding: 2px 0;">NIP</td><td style="border: none !important; padding: 2px 0;">:</td><td style="border: none !important; padding: 2px 0;">${peg.nip || '-'}</td></tr>
                <tr><td style="border: none !important; padding: 2px 0;">Jabatan</td><td style="border: none !important; padding: 2px 0;">:</td><td style="border: none !important; padding: 2px 0;">${peg.jabatan || '-'}</td></tr>
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
                    <b style="text-decoration: underline;">${peg.nama}</b><br>
                    NIP. ${peg.nip || '-'}
                </td>
            </tr>
        </table>
    `;

    // ==============================================================
    // LOGIKA PENYARING JABATAN PENGIRIM (DARI)
    // ==============================================================
    let jabatanAsli = peg.jabatan ? peg.jabatan : '';
    let jbtLower = jabatanAsli.toLowerCase();
    let teksDari = 'Staf Set. DPRD Prov. Kalsel'; // Nilai Default

    // Jika di dalam jabatannya mengandung kata kunci pejabat struktural:
    if (jbtLower.includes('sekretaris') || 
        jbtLower.includes('kepala') || 
        jbtLower.includes('kepala sub bagian') || 
        jbtLower.includes('kasubbag')) {
        teksDari = jabatanAsli; // Gunakan jabatan aslinya
    }
    // ==============================================================

    // Render Keseluruhan Template Cetak
    template.innerHTML = `
        <style>
            .rich-text-area ul, .rich-text-area ol { padding-left: 20px !important; margin-top: 5px !important; margin-bottom: 5px !important; }
            .rich-text-area ul { list-style-type: disc !important; }
            .rich-text-area ol { list-style-type: decimal !important; font-weight: normal !important; }
            .rich-text-area li { margin-bottom: 5px !important; display: list-item !important; font-weight: normal !important;}
            .rich-text-area p { margin: 0 0 6px 0 !important; font-weight: normal !important;}
        </style>
        
        ${kopSuratHTML}
        
        <div class="print-title-doc" style="text-align: center; margin-top: 10px; margin-bottom: 25px; line-height: 1.2;">
            <span style="font-size: 16px; font-weight: bold; text-decoration: underline;">LAPORAN PERJALANAN DINAS</span><br>
        </div>

        <table style="width: 100%; font-size: 14px; margin-bottom: 10px; border: 0 !important; border-collapse: collapse !important; line-height: 1.5;">
            <tr style="border: 0 !important;">
                <td style="width: 15%; padding: 0 !important; border: 0 !important;">Kepada</td>
                <td style="width: 2%; padding: 0 !important; border: 0 !important;">:</td>
                <td style="padding: 0 !important; border: 0 !important;">Sekretaris DPRD Provinsi Kalimantan Selatan</td>
            </tr>
            <tr style="border: 0 !important;">
                <td style="padding: 0 !important; border: 0 !important;">Dari</td>
                <td style="padding: 0 !important; border: 0 !important;">:</td>
                <td style="padding: 0 !important; border: 0 !important;">${teksDari}</td>
            </tr>
            <tr style="border: 0 !important;">
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

            <div style="display: flex; margin-bottom: 12px;">
                <div style="width: 5%; font-weight: bold;">c.</div>
                <div style="width: 95%;">
                    <div style="font-weight: bold; margin-bottom: 4px;">Waktu dan Tempat :</div>
                    <div style="text-align: justify;">${strWaktu}</div>
                </div>
            </div>

            <div style="display: flex; margin-bottom: 12px;">
                <div style="width: 5%; font-weight: bold;">d.</div>
                <div style="width: 95%;">
                    <div style="font-weight: bold; margin-bottom: 4px;">Hasil Komparasi/Monitoring:</div>
                    ${hasilHtml}
                </div>
            </div>

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
                    <b style="text-decoration: underline;">${peg.nama}</b><br>
                    NIP. ${peg.nip || '-'}
                </td>
            </tr>
        </table>

        <!-- PANGGIL CETAK RILL -->
        ${typeof window.getLaporanRillHTML === 'function' ? window.getLaporanRillHTML(id, kopSuratHTML, pa) : ''}
        
        <!-- PANGGIL SURAT TIDAK MENGINAP -->
        ${suratTidakMenginapHTML}

        <!-- PANGGIL CETAK DOKUMENTASI -->
        ${typeof window.getLampiranDokumentasiHTML === 'function' ? window.getLampiranDokumentasiHTML(id, kopSuratHTML) : ''}
    `;

    if (!isBulk) {
    setTimeout(function() { window.print(); }, 1000);
    }
}