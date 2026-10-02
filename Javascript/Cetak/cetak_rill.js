window.getLaporanRillHTML = function(id, kopSuratHTML, pa) {
    try {
        const d = window.dbDinas.find(x => x.id == id);
        if (!d) return '';

        const peg = window.dbPegawai.find(p => p.id == d.pegawaiId) || { nama: '-', nip: '-', jabatan: '-', status: '-' };
        const t = window.dbTujuanDinas.find(x => x.nama === d.lokasiTujuan && x.jenis === d.jenisTujuan);
        
        // 1. Ambil Uraian (Bunyi) dan Nominal Biaya Transportasi Saja
        const bunyiBrgkt = t && t.bunyi_berangkat ? t.bunyi_berangkat : 'Perjalanan Berangkat';
        const biayaBrgkt = t ? parseFloat(t.berangkat) || 0 : 0;
        
        const bunyiPlg = t && t.bunyi_pulang ? t.bunyi_pulang : 'Perjalanan Pulang';
        const biayaPlg = t ? parseFloat(t.pulang) || 0 : 0;

        const bunyiTmbh = t && t.bunyi_tambahan && t.bunyi_tambahan !== '-' ? t.bunyi_tambahan : 'Transportasi Tambahan';
        const biayaTmbh = t ? parseFloat(t.tambahan) || 0 : 0;

        // 2. Hitung Total Biaya Transportasi Riil
        const totalRiil = biayaBrgkt + biayaPlg + (biayaTmbh > 0 ? biayaTmbh : 0);

        const formatRp = (angka) => 'Rp' + parseFloat(angka).toLocaleString('id-ID') + ',-';
        const formatTgl = (dateString) => {
            if (!dateString) return "-"; 
            const date = new Date(dateString); 
            const bln = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]; 
            return `${date.getDate()} ${bln[date.getMonth()]} ${date.getFullYear()}`;
        };

        // 3. Susun Baris Tabel dengan Inline Border Mutlak
        let trRows = '';
        let nomer = 1;

        const tdStyleCenter = 'border: 1px solid #000 !important; padding: 8px; text-align: center; color: #000 !important;';
        const tdStyleLeft = 'border: 1px solid #000 !important; padding: 8px; text-align: left; color: #000 !important;';
        const tdStyleRight = 'border: 1px solid #000 !important; padding: 8px; text-align: right; color: #000 !important;';

        trRows += `<tr><td style="${tdStyleCenter}">${nomer++}.</td><td style="${tdStyleLeft}">${bunyiBrgkt}</td><td style="${tdStyleRight}">${formatRp(biayaBrgkt)}</td></tr>`;
        trRows += `<tr><td style="${tdStyleCenter}">${nomer++}.</td><td style="${tdStyleLeft}">${bunyiPlg}</td><td style="${tdStyleRight}">${formatRp(biayaPlg)}</td></tr>`;

        // Baris 3: Biaya Tambahan (Hanya muncul jika nominal > 0)
        if (biayaTmbh > 0) {
            trRows += `<tr><td style="${tdStyleCenter}">${nomer++}.</td><td style="${tdStyleLeft}">${bunyiTmbh}</td><td style="${tdStyleRight}">${formatRp(biayaTmbh)}</td></tr>`;
        }

        const tglSurat = d.tglSpd ? formatTgl(d.tglSpd) : formatTgl(d.tglDibuat);
        
        // =========================================================================================
        // KODE PERBAIKAN: Deteksi Pengguna Anggaran
        // Jika PA bernama Muhammad Jaini, ganti teks 'Sekretaris DPRD' menjadi Pangkat & Golongannya
        // =========================================================================================
        let jabatanPA = pa.jabatan && pa.jabatan !== '-' ? pa.jabatan : 'Pengguna Anggaran';
        if (pa.nama && pa.nama.includes('Muhammad Jaini')) {
            // Jika pangkat/golongan kosong, gunakan nilai default. Jika ada, gunakan dari database
            const pgkt = pa.pangkat && pa.pangkat !== '-' ? pa.pangkat : 'Pembina Utama Muda';
            const glng = pa.golongan && pa.golongan !== '-' ? pa.golongan : 'IV/c';
            jabatanPA = `${pgkt} (${glng})`;
        } else if (!pa.jabatan || pa.jabatan === '-') {
            // Logika cadangan untuk PA lain jika jabatan kosong
            jabatanPA = pa.pangkat ? `${pa.pangkat} (${pa.golongan})` : 'Pengguna Anggaran';
        }

        return `
            <!-- ================= BAGIAN LAMPIRAN PENGELUARAN RIIL ================= -->
            <div style="page-break-before: always; clear: both;"></div>
            <div style="padding-top: 20px;">
                ${kopSuratHTML}
            </div>
            
            <div class="print-title-doc" style="text-align: center; margin-top: 15px; margin-bottom: 15px;">
                <h3 style="font-size: 18px; margin-bottom: 5px; text-decoration: underline; font-family: 'Times New Roman', Times, serif; color: #000;">DAFTAR PENGELUARAN RIIL</h3>
            </div>
            <div class="print-content" style="font-family: 'Times New Roman', Times, serif; font-size: 14px; color: #000; line-height: 1.4;">
                <p style="margin-bottom: 10px; color: #000;">Yang bertanda tangan di bawah ini :</p>
                <table style="width: 100%; border: none !important; margin-bottom: 10px; background: transparent; font-size: 14px; color: #000;">
                    <tr><td style="width: 150px; border: none !important; padding: 2px 0;">Nama</td><td style="width: 10px; border: none !important; padding: 2px 0;">:</td><td style="border: none !important; padding: 2px 0;"><b>${peg.nama}</b></td></tr>
                    <tr><td style="border: none !important; padding: 2px 0;">NIP</td><td style="border: none !important; padding: 2px 0;">:</td><td style="border: none !important; padding: 2px 0;">${peg.nip || '-'}</td></tr>
                    <tr><td style="border: none !important; padding: 2px 0;">Jabatan</td><td style="border: none !important; padding: 2px 0;">:</td><td style="border: none !important; padding: 2px 0;">${peg.jabatan || 'Anggota DPRD'}</td></tr>
                </table>
                <p style="margin-top: 10px; margin-bottom: 10px; text-align: justify; color: #000;">Berdasarkan Surat Perjalanan Dinas (SPD) No. <b>${d.spd}</b> tanggal <b>${tglSurat}</b>, dengan ini kami menyatakan dengan sesungguhnya bahwa:</p>
                
                <table style="width: 100%; border: none !important; margin-bottom: 10px; background: transparent; color: #000;">
                    <tr><td style="width: 3%; vertical-align: top; border: none !important; padding: 0;">1.</td><td style="vertical-align: top; border: none !important; padding: 0; text-align: justify;">Biaya Transport Pegawai di bawah ini yang tidak dapat diperoleh bukti-bukti pengeluarannya meliputi:</td></tr>
                </table>
                
                <!-- BUNGKUSAN PENGAMAN: Mencegah border atas terpotong oleh page-break margin -->
                <div style="padding: 2px;">
                    <!-- TABEL MUTLAK: Mematikan border-radius dari style.css agar siku menjadi lancip -->
                    <table style="width: 100%; border-collapse: collapse !important; border: 1px solid #000 !important; border-radius: 0 !important; overflow: visible !important; margin-top: 5px; margin-bottom: 15px; background: transparent; color: #000; box-sizing: border-box;">
                        <thead>
                            <tr>
                                <th style="width: 8%; border: 1px solid #000 !important; padding: 8px; text-align: center; font-weight: bold; color: #000 !important;">NO</th>
                                <th style="border: 1px solid #000 !important; padding: 8px; text-align: center; font-weight: bold; color: #000 !important;">URAIAN</th>
                                <th style="width: 30%; border: 1px solid #000 !important; padding: 8px; text-align: center; font-weight: bold; color: #000 !important;">JUMLAH</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${trRows}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="2" style="border: 1px solid #000 !important; padding: 8px; text-align: center; color: #000 !important;"><b>JUMLAH</b></td>
                                <td style="border: 1px solid #000 !important; padding: 8px; text-align: right; color: #000 !important;"><b>${formatRp(totalRiil)}</b></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <table style="width: 100%; border: none !important; margin-top: 15px; background: transparent; color: #000;">
                    <tr><td style="width: 3%; vertical-align: top; border: none !important; padding: 0;">2.</td><td style="vertical-align: top; border: none !important; padding: 0; text-align: justify;">Jumlah uang tersebut pada angka 1 di atas benar-benar dikeluarkan untuk pelaksanaan Perjalanan Dinas dimaksud dan apabila di kemudian hari terdapat kelebihan atas pembayaran, kami bersedia untuk menyetorkan kelebihan tersebut ke Kas Daerah.</td></tr>
                </table>
                <p style="margin-top: 15px; text-align: justify; color: #000;">Demikian surat pernyataan ini dibuat dengan sebenarnya dan untuk dipergunakan sebagaimana mestinya.</p>
            </div>
            
            <table class="signature-table" style="width: 100%; border: none !important; margin-top: 30px; font-family: 'Times New Roman', Times, serif; font-size: 14px; color: #000;">
                <tr>
                    <td style="width: 50%; text-align: center; vertical-align: top; border: none !important;">
                        Mengetahui/Menyetujui,<br>
                        Pengguna Anggaran (PA),<br><br><br><br><br>
                        <b><u>${pa.nama}</u></b><br>
                        ${jabatanPA}<br>
                        NIP. ${pa.nip || '-'}
                    </td>
                    <td style="width: 50%; text-align: center; vertical-align: top; border: none !important;">
                        Banjarmasin, ${formatTgl(d.tglDibuat)}<br>
                        Pelaksana SPD,<br><br><br><br><br>
                        <b><u>${peg.nama}</u></b>
                        ${peg.nip && peg.nip.trim() !== '-' && peg.nip.trim() !== '' ? `<br>NIP. ${peg.nip}` : ''}
                    </td>
                </tr>
            </table>
        `;
    } catch (e) {
        console.error("Error pada Laporan Rill:", e);
        return '<div class="page-break"></div><p style="color:red; text-align:center;">Gagal memuat Rincian Pengeluaran Riil.</p>';
    }
};