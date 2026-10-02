// ================= CETAK LAPORAN SOSPER DEWAN =================
function cetakLaporanSosperDewan(id, isBulk = false) {
    const d = window.dbDinas.find(x => x.id === id); if(!d) return;
    const peg = window.dbPegawai.find(p => p.id === d.pegawaiId) || { nama: '-', nip: '-', jabatan: '-', pangkat: '-', golongan: '-' };
    const pa = window.dbPegawai.find(p => p.tingkat === 'Pengguna Anggaran') || { nama: '(Belum Ada PA)', jabatan: '-', nip: '-' };
    const dewan = window.dbPegawai.find(p => p.id === d.dewanId) || { nama: '-' };

    function formatTanggalBiasa(dateString) {
        if (!dateString) return "-"; const date = new Date(dateString);
        const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        return `${date.getDate()} ${daftarBulan[date.getMonth()]} ${date.getFullYear()}`;
    }

    const fSlash = (dateString) => {
        if (!dateString) return "-"; const date = new Date(dateString);
        const daftarHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"];
        const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        return `${daftarHari[date.getDay()]} / ${String(date.getDate()).padStart(2, '0')} ${daftarBulan[date.getMonth()]} ${date.getFullYear()}`;
    };

    const formatRentangTanggal = (date1, date2) => {
        if (!date1 || !date2) return "-"; const d1 = new Date(date1), d2 = new Date(date2);
        const bln = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        if (d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth()) {
            return d1.getDate() === d2.getDate() ? `${d1.getDate()} ${bln[d1.getMonth()]} ${d1.getFullYear()}` : `${d1.getDate()} - ${d2.getDate()} ${bln[d1.getMonth()]} ${d1.getFullYear()}`;
        } else if (d1.getFullYear() === d2.getFullYear()) { return `${d1.getDate()} ${bln[d1.getMonth()]} - ${d2.getDate()} ${bln[d2.getMonth()]} ${d1.getFullYear()}`; }
        return `${d1.getDate()} ${bln[d1.getMonth()]} ${d1.getFullYear()} - ${d2.getDate()} ${bln[d2.getMonth()]} ${d2.getFullYear()}`;
    };
    
    const rentangTanggalTeks = formatRentangTanggal(d.tglBerangkat, d.tglKepulangan);
    const tglTitik1Teks = d.tglTitik1 ? fSlash(d.tglTitik1) : '-';
    const tglTitik2Teks = d.tglTitik2 ? fSlash(d.tglTitik2) : '-';
    
    let narasumberList = [];
    const buildNsText = (nsStr, urutan) => {
        if (!nsStr) return null;
        let s = String(nsStr);
        if (s.trim() === '') return null;
        let parts = s.split('|#|');
        let nama = parts[0].trim();
        let materi = parts.length > 1 ? parts[1].trim() : '';
        let teks = 'narasumber ' + urutan + ' ' + nama;
        if (materi) teks += ' yang membawakan materi tentang ' + materi;
        return teks;
    };
    let ns1 = buildNsText(d.narasumber1, 'pertama'); if (ns1) narasumberList.push(ns1);
    let ns2 = buildNsText(d.narasumber2, 'kedua'); if (ns2) narasumberList.push(ns2);
    let ns3 = buildNsText(d.narasumber3, 'ketiga'); if (ns3) narasumberList.push(ns3);

    const jmlNarasumber = narasumberList.length;
    let narasumberTeks = '-';
    if (jmlNarasumber === 1) {
        narasumberTeks = narasumberList[0];
    } else if (jmlNarasumber === 2) {
        narasumberTeks = narasumberList.join(' dan ');
    } else if (jmlNarasumber > 2) {
        let last = narasumberList.pop();
        narasumberTeks = narasumberList.join(', ') + ' dan ' + last;
    }

    let poinStr = d.poinBerkembang ? String(d.poinBerkembang) : '';
    if (poinStr.includes('|#|KESIMPULAN|#|')) { poinStr = poinStr.split('|#|KESIMPULAN|#|')[0].trim(); }
    
    const poinHtml = poinStr.trim() !== '' 
        ? `<div class="rich-text-area" style="padding-left: 35px; margin-top: 2px; text-align: justify;">${poinStr}</div>`
        : `<div style="padding-left: 35px; margin-top: 2px;">- Tidak ada poin spesifik yang dicatat.</div>`;

    let waktuTempatHTML = ''; let tmptStr = `di ${d.tempatTitik1 || '-'}`;
    if (!d.tempatTitik2 || String(d.tempatTitik2).trim() === '') {
        waktuTempatHTML = `<table style="width: 100%; border: 0 !important; border-collapse: collapse !important; margin: 0 !important; padding: 0 !important; line-height: 1.2;"><tr style="border: 0 !important;"><td style="width: 25%; border: 0 !important; padding: 0 !important;">Hari / Tanggal</td><td style="width: 2%; border: 0 !important; padding: 0 !important;">:</td><td style="border: 0 !important; padding: 0 !important;">${tglTitik1Teks}</td></tr><tr style="border: 0 !important;"><td style="border: 0 !important; padding: 0 !important;">Waktu</td><td style="border: 0 !important; padding: 0 !important;">:</td><td style="border: 0 !important; padding: 0 !important;">${d.waktuTitik1 || '-'}</td></tr><tr style="border: 0 !important;"><td style="vertical-align: top; border: 0 !important; padding: 0 !important;">Tempat</td><td style="vertical-align: top; border: 0 !important; padding: 0 !important;">:</td><td style="border: 0 !important; padding: 0 !important; text-align: justify;">${d.tempatTitik1 || '-'}</td></tr></table>`;
    } else {
        waktuTempatHTML = `<div style="font-weight: bold; text-decoration: underline; margin-top: 2px; margin-bottom: 0;">Titik I</div><table style="width: 100%; border: 0 !important; border-collapse: collapse !important; margin: 0 0 4px 0 !important; padding: 0 !important; line-height: 1.2;"><tr style="border: 0 !important;"><td style="width: 25%; border: 0 !important; padding: 0 !important;">Hari / Tanggal</td><td style="width: 2%; border: 0 !important; padding: 0 !important;">:</td><td style="border: 0 !important; padding: 0 !important;">${tglTitik1Teks}</td></tr><tr style="border: 0 !important;"><td style="border: 0 !important; padding: 0 !important;">Waktu</td><td style="border: 0 !important; padding: 0 !important;">:</td><td style="border: 0 !important; padding: 0 !important;">${d.waktuTitik1 || '-'}</td></tr><tr style="border: 0 !important;"><td style="vertical-align: top; border: 0 !important; padding: 0 !important;">Tempat</td><td style="vertical-align: top; border: 0 !important; padding: 0 !important;">:</td><td style="border: 0 !important; padding: 0 !important; text-align: justify;">${d.tempatTitik1 || '-'}</td></tr></table><div style="font-weight: bold; text-decoration: underline; margin-top: 2px; margin-bottom: 0;">Titik II</div><table style="width: 100%; border: 0 !important; border-collapse: collapse !important; margin: 0 !important; padding: 0 !important; line-height: 1.2;"><tr style="border: 0 !important;"><td style="width: 25%; border: 0 !important; padding: 0 !important;">Hari / Tanggal</td><td style="width: 2%; border: 0 !important; padding: 0 !important;">:</td><td style="border: 0 !important; padding: 0 !important;">${tglTitik2Teks}</td></tr><tr style="border: 0 !important;"><td style="border: 0 !important; padding: 0 !important;">Waktu</td><td style="border: 0 !important; padding: 0 !important;">:</td><td style="border: 0 !important; padding: 0 !important;">${d.waktuTitik2 || '-'}</td></tr><tr style="border: 0 !important;"><td style="vertical-align: top; border: 0 !important; padding: 0 !important;">Tempat</td><td style="vertical-align: top; border: 0 !important; padding: 0 !important;">:</td><td style="border: 0 !important; padding: 0 !important; text-align: justify;">${d.tempatTitik2 || '-'}</td></tr></table>`;
        tmptStr += ` dan ${d.tempatTitik2}`;
    }
    const tempatPelaksanaanTeks = tmptStr;

    const kopSuratDewanHTML = `
        <table style="width: 100%; border-top: none !important; border-left: none !important; border-right: none !important; border-bottom: 3px solid black !important; margin-bottom: 2px; border-collapse: collapse; background: transparent;">
            <tr>
                <td style="width: 15%; text-align: center; vertical-align: middle; border: none !important; padding: 5px 0;">
                    <img src="Image/Logo-DPRD-kalsel.png" style="width: 115px; height: auto;" alt="Logo DPRD">
                </td>
                <td style="width: 85%; text-align: center; vertical-align: middle; border: none !important; padding: 5px 0; line-height: 1.3;">
                    <span style="font-size: 20px; font-weight: bold; font-family: 'Times New Roman', Times, serif;">DEWAN PERWAKILAN RAKYAT DAERAH</span><br>
                    <span style="font-size: 20px; font-weight: bold; font-family: 'Times New Roman', Times, serif;">PROVINSI KALIMANTAN SELATAN</span><br>
                    <span style="font-size: 15px; font-family: 'Times New Roman', Times, serif;">JL. Lambung Mangkurat No. 18 Telp. [0511]-3366351-3366352 Fax. [0511]-3366353</span><br>
                    <span style="font-size: 15px; font-family: 'Times New Roman', Times, serif;">BANJARMASIN 70111</span>
                </td>
            </tr>
        </table>
        <div style="border-top: 1px solid black; margin-bottom: 10px;"></div>
    `;

    const tglTempatLahir = peg.tempat_lahir && peg.tgl_lahir ? `${peg.tempat_lahir}, ${formatTanggalBiasa(peg.tgl_lahir)}` : '-';
    const alamatPegawai = peg.alamat || '-';
    const nikPegawai = peg.nik || '-';

    document.getElementById('printTemplate').innerHTML = `
        ${kopSuratDewanHTML}
        <div class="print-title-doc" style="text-align: center; margin-top: 10px; margin-bottom: 15px; line-height: 1.2;">
            <span style="font-size: 16px; font-weight: bold;">NOTA DINAS</span><br>
        </div>

        <table style="width: 100%; font-size: 14px; margin-bottom: 10px; border: 0 !important; border-collapse: collapse !important; line-height: 1.2;">
            <tr style="border: 0 !important;"><td style="width: 15%; padding: 0 !important; border: 0 !important;">Kepada</td><td style="width: 2%; padding: 0 !important; border: 0 !important;">:</td><td style="padding: 0 !important; border: 0 !important;">Pimpinan DPRD Provinsi Kalimantan Selatan</td></tr>
            <tr style="border: 0 !important;"><td style="padding: 0 !important; border: 0 !important;">Dari</td><td style="padding: 0 !important; border: 0 !important;">:</td><td style="padding: 0 !important; border: 0 !important;">Anggota DPRD Provinsi Kalimantan Selatan</td></tr>
            <tr style="border: 0 !important;"><td style="padding: 0 !important; border: 0 !important;">Tanggal</td><td style="padding: 0 !important; border: 0 !important;">:</td><td style="padding: 0 !important; border: 0 !important;">${formatTanggalBiasa(d.tglDibuat)}</td></tr>
            <tr style="border: 0 !important;"><td style="padding: 0 !important; vertical-align: top; border: 0 !important;">Perihal</td><td style="padding: 0 !important; vertical-align: top; border: 0 !important;">:</td><td style="padding: 0 !important; text-align: justify; border: 0 !important;">Laporan Perjalanan Dinas Anggota DPRD Kalsel Dalam Rangka Pelaksanaan Kegiatan Sosialisasi Propemperda/Raperda/Perda/Peraturan Perundang-Undangan tanggal ${rentangTanggalTeks}</td></tr>
        </table>
        <div style="border-top: 1px solid black; margin-bottom: 15px;"></div>

        <div class="print-content" style="font-size: 14px; line-height: 1.2;">
            <ol type="A" style="font-weight: bold; text-align: justify; margin-top: 0; padding-left: 20px; margin-bottom: 0;">
                <li style="margin-bottom: 10px; margin-top: 10px">Dasar :
                    <ol type="1" style="font-weight: normal; margin-top: 2px; padding-left: 15px; margin-bottom: 0;">
                        <li style="padding-left: 8px; margin-bottom: 2px;">SPD Nomor &nbsp;&nbsp;&nbsp;: ${d.spd}</li>
                        <li style="padding-left: 8px;">SPT Nomor &nbsp;&nbsp;&nbsp;&nbsp;: ${d.spt}</li>
                    </ol>
                </li>
                <li style="margin-bottom: 10px; margin-top: 10px">Tujuan Pelaksanaan:
                    <div style="font-weight: normal; margin-top: 2px; text-align: justify; text-indent: 35px;">
                        Kegiatan Sosialisasi Propemperda/Raperda/Perda/Peraturan Perundang-Undangan Provinsi Kalimantan Selatan dilaksanakan untuk menjalankan tugas dan kewenangan anggota DPRD Provinsi Kalimantan Selatan dalam menyebarluaskan perda sesuai amanat Pasal 94 Undang-Undang Nomor 12 Tahun 2011 tentang Pembentukan Peraturan Perundang-Undangan sebagaimana telah diubah dengan Undang-Undang Nomor 15 Tahun 2019 tentang Perubahan Kedua Atas Undang-Undang Nomor 12 Tahun 2011 tentang Pembentukan Peraturan Perundang-Undangan, menyatakan bahwa penyebarluasan Perda yang telah diundangkan dilakukan bersama oleh DPRD dan Pemerintah daerah.
                    </div>
                </li>
                <li style="margin-bottom: 5px;">Waktu dan Tempat:
                    <div style="font-weight: normal; margin-top: 2px;">
                        <div style="text-indent: 35px; text-align: justify;">Kegiatan Sosialisasi Propemperda/Raperda/Perda/Peraturan Perundang-Undangan dilaksanakan pada:</div>
                        ${waktuTempatHTML}
                    </div>
                </li>
                <li style="margin-bottom: 5px;">Pelaksanaan Sosialisasi Propemperda/Raperda/Perda/Peraturan Perundang-Undangan:
                    <div style="font-weight: normal; margin-top: 2px; text-align: justify;">
                        <div style="text-indent: 35px;">Kegiatan Sosialisasi Propemperda/Raperda/Perda/Peraturan Perundang-Undangan Provinsi Kalimantan Selatan ${d.raperda || '(Nama Raperda Belum Diisi)'}, dilakukan ${tmptStr} yang dihadiri oleh peserta yang berasal dari unsur masyarakat.</div>
                        <div style="margin-top: 4px; text-indent: 35px;">Kegiatan diisi oleh pemaparan ${narasumberTeks}. Sebelum narasumber melakukan pemaparan dan diskusi dengan peserta yang dipandu oleh ${d.moderator || '-'} selaku moderator, acara terlebih dahulu dipimpin oleh ${d.mc || '-'} selaku MC yang menyampaikan susunan acara dan rangkaian kegiatan.</div>
                        <div style="margin-top: 4px; text-indent: 35px;">Dalam kegiatan Sosialisasi Propemperda/Raperda/Perda/Peraturan Perundang-Undangan tersebut dapat disampaikan beberapa poin yang berkembang dalam diskusi antara lain:</div>
                        ${poinHtml}                       
                    </div>
                </li>
                <li style="margin-bottom: 5px;">Kesimpulan :
                    <div style="font-weight: normal; margin-top: 2px; text-align: justify; text-indent: 35px;">
                        Dari hasil pelaksanaan kegiatan Propemperda/Raperda/Perda/Peraturan Perundang-Undangan berjalan dengan baik dan lancar sesuai dengan jadwal yang disediakan. Adapun permasalahan yang disampaikan oleh warga telah ditampung dan dipilih terlebih dahulu sesuai dengan kewenangan Provinsi atau kewenangan Kabupaten untuk disampaikan ke Kepala Daerah.
                    </div>
                </li>
            </ol>
        </div>

        <table class="signature-table" style="margin-top: 15px; font-size: 14px;">
            <tr>
                <td style="width: 50%;"></td>
                <td style="width: 50%; text-align: center;">
                    Banjarmasin, ${formatTanggalBiasa(d.tglDibuat)}<br>
                    Pelaksana SPD<br><br><br><br><br>
                    <b>${peg.nama}</b>
                </td>
            </tr>
        </table>

        <!-- ================= BAGIAN PAKTA INTEGRITAS ================= -->
        <div class="page-break"></div>
        ${kopSuratDewanHTML}
        <div class="print-title-doc" style="text-align: center; margin-bottom: 20px;">
            <h3 style="font-size:16px; margin:0; text-decoration: underline;">PAKTA INTEGRITAS</h3>
            <h3 style="font-size:16px; margin:0;">PERJALANAN DINAS PIMPINAN DAN ANGGOTA DEWAN PERWAKILAN RAKYAT DAERAH PROVINSI KALIMANTAN SELATAN</h3>
        </div>
        <div class="print-content" style="font-size: 14px; text-align: justify;">
            <p>Yang bertanda tangan di bawah ini:</p>
            <table style="width: 100%; border: 0 !important; border-collapse: collapse !important; margin-bottom: 15px; line-height: 1.2;">
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
                <li style="margin-bottom: 8px;">Bahwa saya akan melaksanakan tugas perjalanan dinas sesuai dengan Surat Tugas Nomor ${d.spt} tanggal ${d.tglSpd ? formatTanggalBiasa(d.tglSpd) : formatTanggalBiasa(d.tglDibuat)} dalam rangka Pelaksanaan Sosialisasi atau Penyeberluaskan Program Pembentukan Peraturan Daerah/ Rancangan Peraturan Daerah/ Peraturan Daerah (SOSPER) pada tanggal ${rentangTanggalTeks}, ${d.lokasiTujuan || '-'}.</li>
                <li style="margin-bottom: 8px;">Bahwa saya bersedia mempertanggungjawabkan biaya perjalanan dinas kepada pemberi tugas dan mempertanggungjawabkan biaya perjalanan dinas kepada Pengguna Anggaran/Kuasa Pengguna Anggaran paling lambat 5 (lima) hari kerja terhitung setelah perjalanan dinas dilaksanakan.</li>
                <li style="margin-bottom: 8px;">Bahwa saya bersedia mengembalikan/menyetorkan kelebihan biaya perjalanan dinas apabila biaya perjalanan dinas yang dibayarkan kepada saya melebihi biaya perjalanan dinas yang seharusnya dipertanggungjawabkan sesuai ketentuan peraturan perundang-undangan yang berlaku.</li>
            </ol>
            <p style="margin-top: 15px;">Demikian pernyataan ini saya buat dengan sebenarnya secara sadar dan tanpa paksaan dari siapa pun. Apabila dikemudian hari terdapat kekeliruan dan/atau penyimpangan, saya bersedia dituntut sesuai dengan hukum yang berlaku.</p>
        </div>
        <table class="signature-table" style="margin-top: 40px; font-size: 14px;">
            <tr>
                <td style="width: 50%;"></td>
                <td style="width: 50%; text-align: center;">
                    Banjarmasin, ${formatTanggalBiasa(d.tglDibuat)}<br>
                    Pelaksana Perjalanan Dinas,<br><br><br><br><br>
                    <b>${peg.nama}</b>
                </td>
            </tr>
        </table>

        <!-- PANGGIL CETAK RILL DISINI DENGAN AMAN -->
        ${typeof window.getLaporanRillHTML === 'function' ? window.getLaporanRillHTML(id, kopSuratDewanHTML, pa) : '<div style="color:red; text-align:center;">Error: Modul Cetak Rill tidak termuat.</div>'}

        <!-- ================= BAGIAN LAMPIRAN TIDAK MENGINAP ================= -->
        <div class="page-break"></div>
        ${kopSuratDewanHTML}
        <div class="print-title-doc"><h3 style="font-size:18px;">SURAT PERNYATAAN TIDAK MENGINAP DIHOTEL</h3></div>
        <div class="print-content">
            <p>Yang bertanda tangan di bawah ini :</p>
            <table class="identitas-tabel"><tr><td>Nama</td><td>:</td><td>${peg.nama}</td></tr><tr><td>NIP</td><td>:</td><td>${peg.nip || '-'}</td></tr><tr><td>Jabatan</td><td>:</td><td>${peg.jabatan || 'Anggota DPRD'}</td></tr></table>
            <p style="margin-top: 10px;">Berdasarkan surat Perjalanan Dinas (SPD) No.<b>${d.spd}</b> tanggal <b>${d.tglSpd ? formatTanggalBiasa(d.tglSpd) : formatTanggalBiasa(d.tglDibuat)}</b>, dengan ini kami menyatakan dengan sesungguhnya bahwa, selama dan/ atau sebagian dari hari perjalanan dinas diatas, saya tidak menggunakan/ menginap dihotel/ penginapan yang dibayar, dikarenakan tidak ada tarif/ ketentuan yang mengharuskan saya membayar ditempat saya menginap tersebut.</p>
            <p>Demikian surat pernyataan ini dibuat dengan sebenarnya dan untuk dipergunakan sebagaimana mestinya.</p>
        </div>
        <table class="signature-table" style="margin-top: 40px;"><tr><td style="width: 50%;"></td><td style="width: 50%; text-align: left; padding-left: 50px;">Banjarmasin, ${formatTanggalBiasa(d.tglDibuat)}<br>Pelaksana SPD,<br><br><br><br><br><b>${peg.nama}</b>${(peg.jabatan && peg.jabatan.toLowerCase().includes('anggota dprd')) || (peg.status && peg.status.toLowerCase().includes('anggota dprd')) ? '' : `<br>NIP ${peg.nip || '-'}`}</td></tr></table>
    `;
    setTimeout(function() { window.print(); }, 500);
}

// ================= CETAK LAPORAN SOSREV DEWAN =================
function cetakLaporanSosrevDewan(id, isBulk = false) {
    const d = window.dbDinas.find(x => x.id === id); if(!d) return;
    const peg = window.dbPegawai.find(p => p.id === d.pegawaiId) || { nama: '-', nip: '-', jabatan: '-', pangkat: '-', golongan: '-' };
    const pa = window.dbPegawai.find(p => p.tingkat === 'Pengguna Anggaran') || { nama: '(Belum Ada PA)', jabatan: '-', nip: '-' };
    const dewan = window.dbPegawai.find(p => p.id === d.dewanId) || { nama: '-' };

    function formatTanggalBiasa(dateString) {
        if (!dateString) return "-"; const date = new Date(dateString);
        const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        return `${date.getDate()} ${daftarBulan[date.getMonth()]} ${date.getFullYear()}`;
    }

    const fSlash = (dateString) => {
        if (!dateString) return "-"; const date = new Date(dateString);
        const daftarHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"];
        const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        return `${daftarHari[date.getDay()]} / ${String(date.getDate()).padStart(2, '0')} ${daftarBulan[date.getMonth()]} ${date.getFullYear()}`;
    };

    const formatRentangTanggal = (date1, date2) => {
        if (!date1 || !date2) return "-"; const d1 = new Date(date1), d2 = new Date(date2);
        const bln = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        if (d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth()) {
            return d1.getDate() === d2.getDate() ? `${d1.getDate()} ${bln[d1.getMonth()]} ${d1.getFullYear()}` : `${d1.getDate()} - ${d2.getDate()} ${bln[d1.getMonth()]} ${d1.getFullYear()}`;
        } else if (d1.getFullYear() === d2.getFullYear()) { return `${d1.getDate()} ${bln[d1.getMonth()]} - ${d2.getDate()} ${bln[d2.getMonth()]} ${d1.getFullYear()}`; }
        return `${d1.getDate()} ${bln[d1.getMonth()]} ${d1.getFullYear()} - ${d2.getDate()} ${bln[d2.getMonth()]} ${d2.getFullYear()}`;
    };
    
    const rentangTanggalTeks = formatRentangTanggal(d.tglBerangkat, d.tglKepulangan);
    const tglTitik1Teks = d.tglTitik1 ? fSlash(d.tglTitik1) : '-';
    
    let narasumberList = [];
    const buildNsText = (nsStr, urutan) => {
        if (!nsStr) return null;
        let s = String(nsStr);
        if (s.trim() === '') return null;
        let parts = s.split('|#|');
        let nama = parts[0].trim();
        let materi = parts.length > 1 ? parts[1].trim() : '';
        let teks = 'narasumber ' + urutan + ' ' + nama;
        if (materi) teks += ' yang membawakan materi tentang ' + materi;
        return teks;
    };
    let ns1 = buildNsText(d.narasumber1, 'pertama'); if (ns1) narasumberList.push(ns1);
    let ns2 = buildNsText(d.narasumber2, 'kedua'); if (ns2) narasumberList.push(ns2);
    let ns3 = buildNsText(d.narasumber3, 'ketiga'); if (ns3) narasumberList.push(ns3);

    const jmlNarasumber = narasumberList.length;
    let narasumberTeks = '-';
    if (jmlNarasumber === 1) {
        narasumberTeks = narasumberList[0];
    } else if (jmlNarasumber === 2) {
        narasumberTeks = narasumberList.join(' dan ');
    } else if (jmlNarasumber > 2) {
        let last = narasumberList.pop();
        narasumberTeks = narasumberList.join(', ') + ' dan ' + last;
    }

    let poinStr = d.poinBerkembang ? String(d.poinBerkembang) : '';
    if (poinStr.includes('|#|KESIMPULAN|#|')) { poinStr = poinStr.split('|#|KESIMPULAN|#|')[0].trim(); }
    
    const poinHtml = poinStr.trim() !== '' 
        ? `<div class="rich-text-area" style="padding-left: 35px; margin-top: 2px; text-align: justify;">${poinStr}</div>`
        : `<div style="padding-left: 35px; margin-top: 2px;">- Tidak ada poin spesifik yang dicatat.</div>`;
    const tmptStr = `di ${d.tempatTitik1 || '-'}`;
    const waktuTempatHTML = `<table style="width: 100%; border: 0 !important; border-collapse: collapse !important; margin: 0 !important; padding: 0 !important; line-height: 1.2;"><tr style="border: 0 !important;"><td style="width: 25%; border: 0 !important; padding: 0 !important;">Hari / Tanggal</td><td style="width: 2%; border: 0 !important; padding: 0 !important;">:</td><td style="border: 0 !important; padding: 0 !important;">${tglTitik1Teks}</td></tr><tr style="border: 0 !important;"><td style="border: 0 !important; padding: 0 !important;">Waktu</td><td style="border: 0 !important; padding: 0 !important;">:</td><td style="border: 0 !important; padding: 0 !important;">${d.waktuTitik1 || '-'}</td></tr><tr style="border: 0 !important;"><td style="vertical-align: top; border: 0 !important; padding: 0 !important;">Tempat</td><td style="vertical-align: top; border: 0 !important; padding: 0 !important;">:</td><td style="border: 0 !important; padding: 0 !important; text-align: justify;">${d.tempatTitik1 || '-'}</td></tr></table>`;
    
    const kopSuratDewanHTML = window.getKopSuratDewan();

    const tglTempatLahir = peg.tempat_lahir && peg.tgl_lahir ? `${peg.tempat_lahir}, ${formatTanggalBiasa(peg.tgl_lahir)}` : '-';
    const alamatPegawai = peg.alamat || '-';
    const nikPegawai = peg.nik || '-';

    document.getElementById('printTemplate').innerHTML = `
        ${kopSuratDewanHTML}
        <div class="print-title-doc" style="text-align: center; margin-top: 10px; margin-bottom: 15px; line-height: 1.2;">
            <span style="font-size: 16px; font-weight: bold;">NOTA DINAS</span><br>
        </div>

        <table style="width: 100%; font-size: 14px; margin-bottom: 10px; border: 0 !important; border-collapse: collapse !important; line-height: 1.2;">
            <tr style="border: 0 !important;"><td style="width: 15%; padding: 0 !important; border: 0 !important;">Kepada</td><td style="width: 2%; padding: 0 !important; border: 0 !important;">:</td><td style="padding: 0 !important; border: 0 !important;">Pimpinan DPRD Provinsi Kalimantan Selatan</td></tr>
            <tr style="border: 0 !important;"><td style="padding: 0 !important; border: 0 !important;">Dari</td><td style="padding: 0 !important; border: 0 !important;">:</td><td style="padding: 0 !important; border: 0 !important;">Anggota DPRD Provinsi Kalimantan Selatan</td></tr>
            <tr style="border: 0 !important;"><td style="padding: 0 !important; border: 0 !important;">Tanggal</td><td style="padding: 0 !important; border: 0 !important;">:</td><td style="padding: 0 !important; border: 0 !important;">${formatTanggalBiasa(d.tglDibuat)}</td></tr>
            <tr style="border: 0 !important;"><td style="padding: 0 !important; vertical-align: top; border: 0 !important;">Perihal</td><td style="padding: 0 !important; vertical-align: top; border: 0 !important;">:</td><td style="padding: 0 !important; text-align: justify; border: 0 !important;">Laporan Perjalanan Dinas Anggota DPRD Kalsel Dalam Rangka Pelaksanaan Kegiatan Sosialisasi Revitalisasi Ideologi Pancasila dan Wawasan Kebangsaan tanggal ${rentangTanggalTeks}</td></tr>
        </table>
        <div style="border-top: 1px solid black; margin-bottom: 15px;"></div>

        <div class="print-content" style="font-size: 14px; line-height: 1.2;">
            <ol type="A" style="font-weight: bold; text-align: justify; margin-top: 0; padding-left: 20px; margin-bottom: 0;">
                <li style="margin-bottom: 10px; margin-top: 10px">Dasar :
                    <ol type="1" style="font-weight: normal; margin-top: 2px; padding-left: 15px; margin-bottom: 0;">
                        <li style="padding-left: 8px; margin-bottom: 2px;">SPD Nomor &nbsp;&nbsp;&nbsp;: ${d.spd}</li>
                        <li style="padding-left: 8px;">SPT Nomor &nbsp;&nbsp;&nbsp;&nbsp;: ${d.spt}</li>
                    </ol>
                </li>
                <li style="margin-bottom: 10px; margin-top: 10px">Tujuan Pelaksanaan:
                    <div style="font-weight: normal; margin-top: 2px; text-align: justify; text-indent: 35px;">
                        Kegiatan Sosialisasi Revitalisasi Ideologi Pancasila dan Wawasan Kebangsaan Provinsi Kalimantan Selatan dilaksanakan untuk menjalankan tugas dan kewenangan anggota DPRD Provinsi Kalimantan Selatan.
                    </div>
                </li>
                <li style="margin-bottom: 5px;">Waktu dan Tempat:
                    <div style="font-weight: normal; margin-top: 2px;">
                        <div style="text-indent: 35px; text-align: justify;">Kegiatan Sosialisasi Revitalisasi Ideologi Pancasila dilaksanakan pada:</div>
                        ${waktuTempatHTML}
                    </div>
                </li>
                <li style="margin-bottom: 5px;">Pelaksanaan Sosialisasi Revitalisasi Ideologi Pancasila:
                    <div style="font-weight: normal; margin-top: 2px; text-align: justify;">
                        <div style="text-indent: 35px;">Kegiatan Sosialisasi Revitalisasi Ideologi Pancasila dan Wawasan Kebangsaan dengan tema ${d.raperda || '(Tema Belum Diisi)'}, dilakukan ${tmptStr} yang dihadiri oleh peserta yang berasal dari unsur masyarakat.</div>
                        <div style="margin-top: 4px; text-indent: 35px;">Kegiatan diisi oleh pemaparan ${narasumberTeks}. Sebelum narasumber melakukan pemaparan dan diskusi dengan peserta yang dipandu oleh ${d.moderator || '-'} selaku moderator, acara terlebih dahulu dipimpin oleh ${d.mc || '-'} selaku MC yang menyampaikan susunan acara dan rangkaian kegiatan.</div>
                        <div style="margin-top: 4px; text-indent: 35px;">Dalam kegiatan Sosialisasi tersebut dapat disampaikan beberapa poin yang berkembang dalam diskusi antara lain:</div>
                        ${poinHtml}                       
                    </div>
                </li>
                <li style="margin-bottom: 5px;">Kesimpulan :
                    <div style="font-weight: normal; margin-top: 2px; text-align: justify; text-indent: 35px;">
                        Dari hasil pelaksanaan kegiatan Sosialisasi Revitalisasi Ideologi Pancasila dan Wawasan Kebangsaan berjalan dengan baik dan lancar sesuai dengan jadwal yang disediakan. Adapun permasalahan yang disampaikan oleh warga telah ditampung dan dipilih terlebih dahulu sesuai dengan kewenangan Provinsi atau kewenangan Kabupaten untuk disampaikan ke Kepala Daerah.
                    </div>
                </li>
            </ol>
        </div>

        <table class="signature-table" style="margin-top: 15px; font-size: 14px;">
            <tr>
                <td style="width: 50%;"></td>
                <td style="width: 50%; text-align: center;">
                    Banjarmasin, ${formatTanggalBiasa(d.tglDibuat)}<br>
                    Pelaksana SPD<br><br><br><br><br>
                    <b>${peg.nama}</b>
                </td>
            </tr>
        </table>

        <!-- ================= BAGIAN PAKTA INTEGRITAS ================= -->
        <div class="page-break"></div>
        ${kopSuratDewanHTML}
        <div class="print-title-doc" style="text-align: center; margin-bottom: 20px;">
            <h3 style="font-size:16px; margin:0; text-decoration: underline;">PAKTA INTEGRITAS</h3>
            <h3 style="font-size:16px; margin:0;">PERJALANAN DINAS PIMPINAN DAN ANGGOTA DEWAN PERWAKILAN RAKYAT DAERAH PROVINSI KALIMANTAN SELATAN</h3>
        </div>
        <div class="print-content" style="font-size: 14px; text-align: justify;">
            <p>Yang bertanda tangan di bawah ini:</p>
            <table style="width: 100%; border: 0 !important; border-collapse: collapse !important; margin-bottom: 15px; line-height: 1.2;">
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
                <li style="margin-bottom: 8px;">Bahwa saya akan melaksanakan tugas perjalanan dinas sesuai dengan Surat Tugas Nomor ${d.spt} tanggal ${d.tglSpd ? formatTanggalBiasa(d.tglSpd) : formatTanggalBiasa(d.tglDibuat)} dalam rangka Pelaksanaan Sosialisasi atau Penyeberluaskan Program Pembentukan Peraturan Daerah/ Rancangan Peraturan Daerah/ Peraturan Daerah (SOSPER) pada tanggal ${rentangTanggalTeks}, ${d.lokasiTujuan || '-'}.</li>
                <li style="margin-bottom: 8px;">Bahwa saya bersedia mempertanggungjawabkan biaya perjalanan dinas kepada pemberi tugas dan mempertanggungjawabkan biaya perjalanan dinas kepada Pengguna Anggaran/Kuasa Pengguna Anggaran paling lambat 5 (lima) hari kerja terhitung setelah perjalanan dinas dilaksanakan.</li>
                <li style="margin-bottom: 8px;">Bahwa saya bersedia mengembalikan/menyetorkan kelebihan biaya perjalanan dinas apabila biaya perjalanan dinas yang dibayarkan kepada saya melebihi biaya perjalanan dinas yang seharusnya dipertanggungjawabkan sesuai ketentuan peraturan perundang-undangan yang berlaku.</li>
            </ol>
            <p style="margin-top: 15px;">Demikian pernyataan ini saya buat dengan sebenarnya secara sadar dan tanpa paksaan dari siapa pun. Apabila dikemudian hari terdapat kekeliruan dan/atau penyimpangan, saya bersedia dituntut sesuai dengan hukum yang berlaku.</p>
        </div>
        <table class="signature-table" style="margin-top: 40px; font-size: 14px;">
            <tr>
                <td style="width: 50%;"></td>
                <td style="width: 50%; text-align: center;">
                    Banjarmasin, ${formatTanggalBiasa(d.tglDibuat)}<br>
                    Pelaksana Perjalanan Dinas,<br><br><br><br><br>
                    <b>${peg.nama}</b>
                </td>
            </tr>
        </table>

        <!-- PANGGIL CETAK RILL DISINI DENGAN AMAN -->
        ${typeof window.getLaporanRillHTML === 'function' ? window.getLaporanRillHTML(id, kopSuratDewanHTML, pa) : '<div style="color:red; text-align:center;">Error: Modul Cetak Rill tidak termuat.</div>'}

        <!-- ================= BAGIAN LAMPIRAN TIDAK MENGINAP ================= -->
        <div class="page-break"></div>
        ${kopSuratDewanHTML}
        <div class="print-title-doc"><h3 style="font-size:18px;">SURAT PERNYATAAN TIDAK MENGINAP DIHOTEL</h3></div>
        <div class="print-content">
            <p>Yang bertanda tangan di bawah ini :</p>
            <table class="identitas-tabel"><tr><td>Nama</td><td>:</td><td>${peg.nama}</td></tr><tr><td>NIP</td><td>:</td><td>${peg.nip || '-'}</td></tr><tr><td>Jabatan</td><td>:</td><td>${peg.jabatan || 'Anggota DPRD'}</td></tr></table>
            <p style="margin-top: 10px;">Berdasarkan surat Perjalanan Dinas (SPD) No.<b>${d.spd}</b> tanggal <b>${d.tglSpd ? formatTanggalBiasa(d.tglSpd) : formatTanggalBiasa(d.tglDibuat)}</b>, dengan ini kami menyatakan dengan sesungguhnya bahwa, selama dan/ atau sebagian dari hari perjalanan dinas diatas, saya tidak menggunakan/ menginap dihotel/ penginapan yang dibayar, dikarenakan tidak ada tarif/ ketentuan yang mengharuskan saya membayar ditempat saya menginap tersebut.</p>
            <p>Demikian surat pernyataan ini dibuat dengan sebenarnya dan untuk dipergunakan sebagaimana mestinya.</p>
        </div>
        <table class="signature-table" style="margin-top: 40px;"><tr><td style="width: 50%;"></td><td style="width: 50%; text-align: left; padding-left: 50px;">Banjarmasin, ${formatTanggalBiasa(d.tglDibuat)}<br>Pelaksana SPD,<br><br><br><br><br><b>${peg.nama}</b>${(peg.jabatan && peg.jabatan.toLowerCase().includes('anggota dprd')) || (peg.status && peg.status.toLowerCase().includes('anggota dprd')) ? '' : `<br>NIP ${peg.nip || '-'}`}</td></tr></table>
    <!-- PANGGIL CETAK DOKUMENTASI DISINI DENGAN AMAN -->
        ${typeof window.getLampiranDokumentasiHTML === 'function' ? window.getLampiranDokumentasiHTML(id, (typeof kopSuratDewanHTML !== 'undefined' ? kopSuratDewanHTML : kopSuratHTML)) : ''}
    `;
    if (!isBulk) {
    setTimeout(function() { window.print(); }, 1000);
}
}