// ================= CETAK LAPORAN FASILITASI PUBLIKASI HUMAS =================
function cetakLaporanFasilitasiHumas(id, isBulk = false) {
    const d = window.dbDinas.find(x => x.id === id); if(!d) return;
    const peg = window.dbPegawai.find(p => p.id === d.pegawaiId) || { nama: '-', nip: '-', jabatan: '-', pangkat: '-', golongan: '-' };
    const pa = window.dbPegawai.find(p => p.tingkat === 'Pengguna Anggaran') || { nama: '(Belum Ada PA)', jabatan: '-', nip: '-' };
    const templatePrint = document.getElementById('printTemplate');
    const jenisTujuanDisplay = d.jenisTujuan || "Luar Daerah"; 
    const lokasiTujuanDisplay = d.lokasiTujuan || "-";

    function formatTanggalBiasa(dateString) {
        if (!dateString) return "-";
        const date = new Date(dateString);
        const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        return `${date.getDate()} ${daftarBulan[date.getMonth()]} ${date.getFullYear()}`;
    }
    
    const formatHariTanggal = (dateString) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        const daftarHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"];
        const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        return `${daftarHari[date.getDay()]}, ${date.getDate()} ${daftarBulan[date.getMonth()]} ${date.getFullYear()}`;
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
    const rentangTanggalTeks = formatRentangTanggal(d.tglBerangkat, d.tglKepulangan);

    // KODE PERBAIKAN
    let biayaBerangkat = 0; let biayaPulang = 0; 
    let bunyiBerangkat = "Banjarmasin ke " + lokasiTujuanDisplay; 
    let bunyiPulang = lokasiTujuanDisplay + " Ke Banjarmasin"; 

    const t = window.dbTujuanDinas.find(x => x.nama === d.lokasiTujuan && x.jenis === d.jenisTujuan);
    if (t) { 
        biayaBerangkat = parseFloat(t.berangkat) || 0; 
        biayaPulang = parseFloat(t.pulang) || 0; 
        if(t.bunyi_berangkat) bunyiBerangkat = t.bunyi_berangkat; 
        if(t.bunyi_pulang) bunyiPulang = t.bunyi_pulang; 
    }
    const totalBiaya = biayaBerangkat + biayaPulang; 
    const formatRp = (angka) => 'Rp' + parseFloat(angka).toLocaleString('id-ID') + ',-';

    let kegiatanPelaksanaanTeks = '';
    const tgl1 = d.tglTitik1 ? formatHariTanggal(d.tglTitik1) : (d.tglKegiatan ? formatHariTanggal(d.tglKegiatan) : formatHariTanggal(d.tglBerangkat));
    const waktu1 = d.waktuTitik1 || d.waktuKegiatan || '';
    const tempat1 = d.tempatTitik1 || '';
    const tgl2 = d.tglTitik2 ? formatHariTanggal(d.tglTitik2) : '';
    const waktu2 = d.waktuTitik2 || '';
    const tempat2 = d.tempatTitik2 || '';

    if (d.tglTitik2) {
        kegiatanPelaksanaanTeks = `${d.keperluan || 'Kegiatan'}, yang dilaksanakan di 2 (dua) tempat/kegiatan:<br>
        <table style="width: 100%; border: none !important; margin-top: 5px; background: transparent; font-weight: normal;">
            <tr><td style="width: 3%; vertical-align: top; border: none !important; padding: 0;">1.</td><td style="vertical-align: top; border: none !important; padding: 0; padding-bottom: 5px; text-align: justify;">Pada hari ${tgl1} Pukul ${waktu1}, bertempat di ${tempat1}.</td></tr>
            <tr><td style="width: 3%; vertical-align: top; border: none !important; padding: 0;">2.</td><td style="vertical-align: top; border: none !important; padding: 0; padding-bottom: 5px; text-align: justify;">Pada hari ${tgl2} Pukul ${waktu2}, bertempat di ${tempat2}.</td></tr>
        </table>`;
    } else {
        let tempatTeks = tempat1 ? `, bertempat di ${tempat1}` : '';
        kegiatanPelaksanaanTeks = `${d.keperluan || 'Kegiatan'}, pada hari ${tgl1} Pukul ${waktu1}${tempatTeks}.`;
    }

    const kopSuratHTML = window.getKopSuratStandar();

    templatePrint.innerHTML = `
        ${kopSuratHTML}
        <div class="print-title-doc" style="text-align: center; margin-top: 25px; margin-bottom: 10px; line-height: 1.2;">
            <span style="font-size: 16px; font-weight: bold;">LAPORAN</span><br><span style="font-size: 16px;">TENTANG</span><br><span style="font-size: 16px; font-weight: bold; text-transform: uppercase;">PERJALANAN DINAS ${jenisTujuanDisplay}</span>
        </div>
        <div class="print-content">
            <ol type="A" style="font-weight: bold; text-align: justify; margin-top: 0;">
                <li>Pendahuluan
                    <ol type="1" style="font-weight: normal;">
                        <li style="text-align: justify;"><b>Umum/ Latar Belakang</b><br>
                        Bahwa dalam rangka mendukung pelaksanaan tugas dan fungsi Sekretariat DPRD yang sangat strategis dalam menyajikan informasi kegiatan DPRD kepada masyarakat, maka unsur Aparatur Sipil Negara (ASN) dan Non ASN di lingkup Sekretariat DPRD perlu untuk melakukan fasilitasi peliputan, dokumentasi, dan publikasi secara langsung terhadap kegiatan Anggota DPRD Provinsi Kalsel yang dilaksanakan di dalam maupun di luar daerah.</li>
                        <li style="margin-top: 10px; text-align: justify;"><b>Landasan Hukum</b>
                            <table style="width: 100%; border: none !important; margin-top: 5px; margin-bottom: 0 !important; background: transparent; font-weight: normal;">
                                <tr><td style="width: 3%; vertical-align: top; border: none !important; padding: 0;">a.</td><td style="vertical-align: top; border: none !important; padding: 0; padding-bottom: 5px; text-align: justify;">Nota Dinas Sekretaris DPRD Provinsi Kalimantan Selatan Nomor: ${d.nodin} tanggal ${d.tglSpd ? formatTanggalBiasa(d.tglSpd) : formatTanggalBiasa(d.tglDibuat)}, Hal Mohon Pesetujuan Perjalanan Dinas ${jenisTujuanDisplay}.</td></tr>
                                <tr><td style="width: 3%; vertical-align: top; border: none !important; padding: 0;">b.</td><td style="vertical-align: top; border: none !important; padding: 0; padding-bottom: 5px; text-align: justify;">Surat Perintah Tugas (SPT) Sekretaris DPRD Provinsi Kalimantan Selatan Nomor: ${d.spt} tanggal ${d.tglSpd ? formatTanggalBiasa(d.tglSpd) : formatTanggalBiasa(d.tglDibuat)} dalam rangka ${d.keperluan} di ${lokasiTujuanDisplay} pada tanggal ${rentangTanggalTeks}.</td></tr>
                                <tr><td style="width: 3%; vertical-align: top; border: none !important; padding: 0;">c.</td><td style="vertical-align: top; border: none !important; padding: 0; text-align: justify;">Surat Perjalanan Dinas (SPD) Nomor: ${d.spd}</td></tr>
                            </table>
                        </li>
                        <li style="margin-top: 10px; text-align: justify;"><b>Maksud dan Tujuan</b><br>Maksud dari kegiatan ini adalah ${d.keperluan} dengan tujuan menyebarluaskan informasi kegiatan serta meningkatkan citra baik DPRD Provinsi Kalimantan Selatan kepada publik.</li>        
                    </ol>
                </li>
                <li style="margin-top: 10px; text-align: justify;">Kegiatan yang dilaksanakan<br><div style="font-weight: normal; margin-top: 2px;">${kegiatanPelaksanaanTeks}</div></li>
                <li style="margin-top: 10px; text-align: justify;">Hasil yang dicapai
                    <table style="width: 100%; border: none !important; margin-top: 5px; margin-bottom: 0 !important; background: transparent; font-weight: normal;">
                        <tr><td style="width: 3%; vertical-align: top; border: none !important; padding: 0;">1.</td><td style="vertical-align: top; border: none !important; padding: 0; padding-bottom: 5px; text-align: justify;">Dilaksanakan fasilitasi peliputan dan pendokumentasian, dan Publikasi kegiatan ${d.keperluan}.</td></tr>
                        <tr><td style="width: 3%; vertical-align: top; border: none !important; padding: 0;">2.</td><td style="vertical-align: top; border: none !important; padding: 0; padding-bottom: 5px; text-align: justify;">Media yang digunakan dalam fasilitasi peliputan adalah media foto, perekaman audio dan perekaman video selama kegiatan.</td></tr>
                        <tr><td style="width: 3%; vertical-align: top; border: none !important; padding: 0;">3.</td><td style="vertical-align: top; border: none !important; padding: 0; padding-bottom: 5px; text-align: justify;">Hasil fasilitasi peliputan dan dokumentasikan telah dibagikan kepada seluruh awak media (cetak, online, dan elektronik) yang tergabung dalam Pokja/ Pressroom DPRD Provinsi Kalimantan Selatan.</td></tr>
                        <tr><td style="width: 3%; vertical-align: top; border: none !important; padding: 0;">4.</td><td style="vertical-align: top; border: none !important; padding: 0; text-align: justify;">Link Berita : <i>${d.linkBerita || '-'}</i></td></tr>
                    </table>
                </li>
                <li style="margin-top: 10px; text-align: justify;">Kesimpulan dan Saran<br>
                    <div style="font-weight: normal; margin-top: 2px;">Telah dilaksanakan ${d.keperluan}. hasil liputan ini telah dipublikasi di media resmi Website DPRD Kalsel. Selanjutnya kegiatan publikasi ini diharapkan dapat :</div>
                    <table style="width: 100%; border: none !important; margin-top: 5px; margin-bottom: 0 !important; background: transparent; font-weight: normal;">
                        <tr><td style="width: 3%; vertical-align: top; border: none !important; padding: 0;">1.</td><td style="vertical-align: top; border: none !important; padding: 0; padding-bottom: 5px; text-align: justify;">Menjadi alat komunikasi dan sekaligus mediator yang proaktif dalam menjembatani kepentingan DPRD Provinsi Kalimantan Selatan.</td></tr>
                        <tr><td style="width: 3%; vertical-align: top; border: none !important; padding: 0;">2.</td><td style="vertical-align: top; border: none !important; padding: 0; padding-bottom: 5px; text-align: justify;">Tersosialisasinya kebijakan-kebijakan dan program-program serta kinerja DPRD Provinsi Kalimantan Selatan kepada Masyarakat luas.</td></tr>
                    </table>
                </li>
                <li style="margin-top: 10px; text-align: justify;">Penutup<br><div style="font-weight: normal; margin-top: 2px;">Demikian laporan kegiatan perjalanan dinas ini disampaikan dan atas perhatiannya saya ucapkan terima kasih.</div></li>
            </ol>
        </div>
        <table class="signature-table" style="margin-top: 20px;">
            <tr>
                <td style="width: 50%;"></td>
                <td style="width: 50%; text-align: left; padding-left: 50px;">
                    <span style="display: inline-block; width: 95px;">Dibuat di</span> : Banjarmasin<br><span style="display: inline-block; width: 95px;">Pada Tanggal</span> : ${formatTanggalBiasa(d.tglDibuat)}<br><br>Yang membuat laporan<br><br><br><br><b>${peg.nama}</b><br>NIP ${peg.nip}
                </td>
            </tr>
        </table>
        
        <!-- PANGGIL CETAK RILL DISINI DENGAN AMAN -->
        ${typeof window.getLaporanRillHTML === 'function' ? window.getLaporanRillHTML(id, kopSuratHTML, pa) : '<div style="color:red; text-align:center;">Error: Modul Cetak Rill tidak termuat.</div>'}

        <!-- ================= BAGIAN LAMPIRAN TIDAK MENGINAP ================= -->
        <div class="page-break"></div>
        ${kopSuratHTML}
        <div class="print-title-doc"><h3 style="font-size:18px;">SURAT PERNYATAAN TIDAK MENGINAP DIHOTEL</h3></div>
        <div class="print-content">
            <p>Yang bertanda tangan di bawah ini :</p>
            <table class="identitas-tabel"><tr><td>Nama</td><td>:</td><td>${peg.nama}</td></tr><tr><td>NIP</td><td>:</td><td>${peg.nip || '-'}</td></tr><tr><td>Jabatan</td><td>:</td><td>${peg.jabatan || 'Anggota DPRD'}</td></tr></table>
            <p style="margin-top: 10px;">Berdasarkan surat Perjalanan Dinas (SPD) No.<b>${d.spd}</b> tanggal <b>${d.tglSpd ? formatTanggalBiasa(d.tglSpd) : formatTanggalBiasa(d.tglDibuat)}</b>, dengan ini kami menyatakan dengan sesungguhnya bahwa, selama dan/ atau sebagian dari hari perjalanan dinas diatas, saya tidak menggunakan/ menginap dihotel/ penginapan yang dibayar, dikarenakan tidak ada tarif/ ketentuan yang mengharuskan saya membayar ditempat saya menginap tersebut.</p>
            <p>Demikian surat pernyataan ini dibuat dengan sebenarnya dan untuk dipergunakan sebagaimana mestinya.</p>
        </div>
        <table class="signature-table" style="margin-top: 40px;"><tr><td style="width: 50%;"></td><td style="width: 50%; text-align: left; padding-left: 50px;">Banjarmasin, ${formatTanggalBiasa(d.tglDibuat)}<br>Pelaksana SPD,<br><br><br><br><br><b>${peg.nama}</b><br>NIP ${peg.nip || '-'}</td></tr></table>
    <!-- PANGGIL CETAK DOKUMENTASI DISINI DENGAN AMAN -->
        ${typeof window.getLampiranDokumentasiHTML === 'function' ? window.getLampiranDokumentasiHTML(id, (typeof kopSuratDewanHTML !== 'undefined' ? kopSuratDewanHTML : kopSuratHTML)) : ''}
    `;
    if (!isBulk) {
    setTimeout(function() { window.print(); }, 1000);
    }
}