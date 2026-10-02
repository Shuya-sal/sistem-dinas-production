// ================= CETAK LAPORAN PENDAMPING SOSREV =================
function cetakLaporanSosrev(id, isBulk = false) {
    const d = window.dbDinas.find(x => x.id === id); if(!d) return;
    const peg = window.dbPegawai.find(p => p.id === d.pegawaiId) || { nama: '-', nip: '-', jabatan: '-', pangkat: '-', golongan: '-' };
    const pa = window.dbPegawai.find(p => p.tingkat === 'Pengguna Anggaran') || { nama: '(Belum Ada PA)', jabatan: '-', nip: '-' };
    const dewan = window.dbPegawai.find(p => p.id === d.dewanId) || { nama: '-' };
               
    const templatePrint = document.getElementById('printTemplate');
    const lokasiTujuanDisplay = d.lokasiTujuan || "-";
    
    function formatTanggalBiasa(dateString) {
        if (!dateString) return "-";
        const date = new Date(dateString);
        const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        return `${date.getDate()} ${daftarBulan[date.getMonth()]} ${date.getFullYear()}`;
    }

    const formatHariTanggalSlashed = (dateString) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        const daftarHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"];
        const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        return `${daftarHari[date.getDay()]} / ${String(date.getDate()).padStart(2, '0')} ${daftarBulan[date.getMonth()]} ${date.getFullYear()}`;
    };

    const tglTitik1Teks = d.tglTitik1 ? formatHariTanggalSlashed(d.tglTitik1) : '-';
    
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

    const tmptStr = `di ${d.tempatTitik1 || '-'}`;
    const waktuTempatHTML = `
        <table style="width: 100%; border: none !important; margin-top: 3px; margin-bottom: 0;">
            <tr><td style="width: 25%; border: none !important; padding: 0 0 2px 0;">Hari / Tanggal</td><td style="width: 2%; border: none !important; padding: 0 0 2px 0;">:</td><td style="border: none !important; padding: 0 0 2px 0;">${tglTitik1Teks}</td></tr>
            <tr><td style="border: none !important; padding: 0 0 2px 0;">Pukul</td><td style="border: none !important; padding: 0 0 2px 0;">:</td><td style="border: none !important; padding: 0 0 2px 0;">${d.waktuTitik1 || '-'}</td></tr>
            <tr><td style="vertical-align: top; border: none !important; padding: 0;">Tempat</td><td style="vertical-align: top; border: none !important; padding: 0;">:</td><td style="border: none !important; padding: 0; text-align: justify;">${d.tempatTitik1 || '-'}</td></tr>
        </table>
    `;
    const tempatPelaksanaanTeks = tmptStr;

    const kopSuratHTML = window.getKopSuratStandar();
    const kopSuratDewanHTML = window.getKopSuratDewan();

    document.getElementById('printTemplate').innerHTML = `
        ${kopSuratHTML}
        
        <div class="print-title-doc" style="text-align: center; margin-top: 10px; margin-bottom: 15px; line-height: 1.2;">
            <span style="font-size: 16px; font-weight: bold;">NOTA DINAS</span><br>
        </div>

        <table style="width: 100%; font-size: 14px; margin-bottom: 10px; border: none !important; line-height: 1.2;">
            <tr><td style="width: 15%; border: none !important; padding: 0;">Kepada</td><td style="width: 2%; border: none !important; padding: 0;">:</td><td style="border: none !important; padding: 0;">Sekretaris DPRD Provinsi Kalimantan Selatan</td></tr>
            <tr><td style="border: none !important; padding: 0;">Dari</td><td style="border: none !important; padding: 0;">:</td><td style="border: none !important; padding: 0;">Staf Set. DPRD Provinsi Kalimantan Selatan</td></tr>
            <tr><td style="border: none !important; padding: 0;">Tanggal</td><td style="border: none !important; padding: 0;">:</td><td style="border: none !important; padding: 0;">${formatTanggalBiasa(d.tglDibuat)}</td></tr>
            <tr><td style="border: none !important; padding: 0; vertical-align: top;">Perihal</td><td style="border: none !important; padding: 0; vertical-align: top;">:</td><td style="border: none !important; padding: 0; text-align: justify;">Laporan Fasilitasi/Pendamping Perjalanan Dinas Anggota DPRD Kalsel Dalam Rangka Pelaksanaan Kegiatan Sosialisasi Revitalisasi Ideologi Pancasila dan Wawasan Kebangsaan tanggal ${rentangTanggalTeks}</td></tr>
        </table>
        <div style="border-top: 1px solid black; margin-bottom: 15px;"></div>

        <div class="print-content" style="font-size: 14px; line-height: 1.2;">
            <ol type="A" style="font-weight: bold; text-align: justify; margin-top: 0; padding-left: 20px; margin-bottom: 0;">
                <li style="margin-bottom: 10px; margin-top: 10px;">Dasar :
                    <ol type="1" style="font-weight: normal; margin-top: 2px; padding-left: 15px; margin-bottom: 0;">
                        <li style="padding-left: 8px; margin-bottom: 2px;">SPD Nomor &nbsp;&nbsp;&nbsp;: ${d.spd}</li>
                        <li style="padding-left: 8px;">SPT Nomor &nbsp;&nbsp;&nbsp;&nbsp;: ${d.spt}</li>
                    </ol>
                </li>
                <li style="margin-bottom: 10px; margin-top: 10px;">Maksud dan Tujuan:
                    <div style="font-weight: normal; margin-top: 2px; text-align: justify;">
                        <div style="margin-top: 4px; font-weight: bold; text-decoration: underline;">Maksud :</div>
                        <div style="text-indent: 0;">Mendampingi/Fasilitasi Kunjungan Kerja Anggota DPRD Kalsel Dalam Rangka Pelaksanaan Kegiatan Sosialisasi Revitalisasi Ideologi Pancasila dan Wawasan Kebangsaan tanggal ${rentangTanggalTeks}</div>
                        <div style="margin-top: 4px; font-weight: bold; text-decoration: underline;">Tujuan :</div>
                        <div style="text-indent: 0;">Membantu memfasilitasi kunjungan kerja yang bertujuan agar pelaksanaan kegiatan Sosialisasi yang dilakukan berjalan dengan lancar dan baik secara administratif.</div>
                    </div>
                </li>
                <li style="margin-bottom: 10px; margin-top: 10px;">Waktu dan Tempat:
                    <div style="font-weight: normal; margin-top: 2px;">
                        <div style="text-indent: 35px; text-align: justify;">Kegiatan fasilitasi kunjungan Anggota DPRD Provinsi Kalimantan Selatan atas nama <b>${dewan.nama}</b> dalam rangka Sosialisasi Revitalisasi Ideologi Pancasila dan Wawasan Kebangsaan yang dilaksanakan pada:</div>
                        ${waktuTempatHTML}
                    </div>
                </li>
                <li style="margin-bottom: 10px; margin-top: 10px;">Kegiatan Fasilitasi:
                    <ol type="1" style="font-weight: normal; margin-top: 2px; padding-left: 15px; margin-bottom: 0;">
                        <li style="padding-left: 8px; margin-bottom: 2px; text-align: justify;">Melakukan koordinasi dengan pihak Kabupaten/Kota setempat, narasumber, moderator, mc, dan peserta kegiatan</li>
                        <li style="padding-left: 8px; margin-bottom: 2px; text-align: justify;">Memfasilitasi pengumpulan bahan kelengkapan pertanggungjawaban kegiatan sosialisasi.</li>
                        <li style="padding-left: 8px; margin-bottom: 2px; text-align: justify;">Menyiapkan pendampingan ke tempat pertemuan sampai acara selesai, dengan mencatat jalannya pertemuan.</li>
                        <li style="padding-left: 8px; text-align: justify;">Penyelesaian administrasi lainnya.</li>
                    </ol>
                </li>
                <li style="margin-bottom: 10px; margin-top: 10px;">Hasil-Hasil Pendampingan:
                    <div style="font-weight: normal; margin-top: 2px; text-align: justify;">
                        <div style="text-indent: 35px;">Kegiatan Sosialisasi Revitalisasi Ideologi Pancasila dan Wawasan Kebangsaan dengan tema <b>${d.raperda || '(Tema Belum Diisi)'}</b> yang dilakukan ${tempatPelaksanaanTeks} yang dihadiri oleh peserta yang berasal dari unsur masyarakat.</div>
                        <div style="margin-top: 4px; text-indent: 35px;">Kegiatan diisi oleh pemaparan ${jmlNarasumber} orang narasumber, yaitu ${narasumberTeks}. Sebelum narasumber melakukan pemaparan dan diskusi dengan peserta yang dipandu oleh <b>${d.moderator || '-'}</b> selaku moderator, acara terlebih dahulu dipimpin oleh <b>${d.mc || '-'}</b> selaku MC yang menyampaikan susunan acara dan rangkaian kegiatan.</div>
                        <div style="margin-top: 4px; text-indent: 35px;">Dalam Kegiatan Sosialisasi tersebut dapat disampaikan beberapa poin yang berkembang dalam diskusi antara lain:</div>
                            ${poinHtml}                        
                    </div>
                </li>
                <li style="margin-bottom: 10px; margin-top: 10px;">Kesimpulan :
                    <div style="font-weight: normal; margin-top: 2px; text-align: justify; text-indent: 35px;">
                        Berdasarkan kegiatan fasilitasi dimaksud dapat dicatat beberapa kesimpulan, antara lain:
                    </div>
                    <ol type="1" style="font-weight: normal; margin-top: 2px; padding-left: 15px; margin-bottom: 0;">
                        <li style="padding-left: 8px; margin-bottom: 2px; text-align: justify;">Kegiatan fasilitasi Sosialisasi Revitalisasi Ideologi Pancasila dan Wawasan Kebangsaan telah dilaksanakan dengan baik.</li>
                        <li style="padding-left: 8px; margin-bottom: 2px; text-align: justify;">Beberapa catatan penutup dari hasil sosialisasi diantaranya, materi yang disampaikan dapat diterima dengan baik oleh masyarakat setempat.</li>
                    </ol>
                    <div style="font-weight: normal; margin-top: 4px; text-align: justify; text-indent: 35px;">
                        Demikian laporan ini dibuat sebagai bahan selanjutnya.
                    </div>
                </li>
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