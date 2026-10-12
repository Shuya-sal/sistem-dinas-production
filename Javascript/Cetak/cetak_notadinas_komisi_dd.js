// cetak_notadinas_komisi_dd.js  — Komisi DD
function cetakLayoutKomisi(data, template) {
    const fmt = (d) => {
        if (!d) return '-';
        const dt = new Date(d);
        const bln = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        return dt.getDate() + ' ' + bln[dt.getMonth()] + ' ' + dt.getFullYear();
    };
    const fmtRentang = (a, b) => {
        if (!a && !b) return '-';
        const da = a ? new Date(a) : null, db = b ? new Date(b) : null;
        const bln = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        if (!da || !db) return (a || b) ? fmt(a || b) : '-';
        if (da.getFullYear()===db.getFullYear() && da.getMonth()===db.getMonth()) {
            return da.getDate()===db.getDate()
                ? fmt(a) : da.getDate()+' - '+db.getDate()+' '+bln[da.getMonth()]+' '+da.getFullYear();
        }
        return fmt(a)+' s/d '+fmt(b);
    };
    const kop = typeof window.getKopSuratStandar === 'function' ? window.getKopSuratStandar() : '';
    const pegHtml = data.pegawai.map((p,i) =>
        '<tr><td style="width:30px; text-align:center;">'+(i+1)+'.</td><td>'+escHtml(p.nama)+'</td><td style="width:200px;">'+escHtml(p.jabatan||'-')+'</td></tr>'
    ).join('');

    template.innerHTML = `
        ${kop}
        <div style="text-align:center; margin-top:10px; margin-bottom:15px;">
            <span style="font-size:16px; font-weight:bold;">NOTA DINAS</span>
        </div>
        <table style="width:100%; font-size:14px; margin-bottom:10px; border:none !important; line-height:1.4; font-family:'Times New Roman',Times,serif;">
            <tr><td style="width:15%; border:none !important; padding:1px 0;">Kepada</td><td style="width:2%; border:none !important; padding:1px 0;">:</td><td style="border:none !important; padding:1px 0;">Yth. Sekretaris DPRD Provinsi Kalimantan Selatan</td></tr>
            <tr><td style="border:none !important; padding:1px 0;">Dari</td><td style="border:none !important; padding:1px 0;">:</td><td style="border:none !important; padding:1px 0;">Kepala Bagian Persidangan dan Perundang-Undangan</td></tr>
            <tr><td style="border:none !important; padding:1px 0;">Tanggal</td><td style="border:none !important; padding:1px 0;">:</td><td style="border:none !important; padding:1px 0;">${fmt(data.tanggal)}</td></tr>
            <tr><td style="border:none !important; padding:1px 0;">Nomor</td><td style="border:none !important; padding:1px 0;">:</td><td style="border:none !important; padding:1px 0;">${escHtml(data.nomor||'-')}</td></tr>
            <tr><td style="border:none !important; padding:1px 0; vertical-align:top;">Perihal</td><td style="border:none !important; padding:1px 0; vertical-align:top;">:</td><td style="border:none !important; padding:1px 0;">Mohon Perjalanan Dinas Dalam Daerah</td></tr>
        </table>
        <div style="border-top:1px solid black; margin-bottom:12px;"></div>
        <div style="font-size:14px; font-family:'Times New Roman',Times,serif; line-height:1.4; text-align:justify;">
            <p style="margin-bottom:8px;">${escHtml(data.dasar||'(Dasar Keputusan Pimpinan)')}</p>
            <p style="margin-bottom:8px;">Sehubungan dengan hal tersebut, mohon diikutsertakan:</p>
            <table style="width:100%; font-size:13px; border-collapse:collapse; margin-bottom:10px; font-family:'Times New Roman',Times,serif;">
                ${pegHtml}
            </table>
            <p style="margin-bottom:8px;">Untuk melakukan <strong>${escHtml(data.maksud||'-')}</strong> tanggal ${fmtRentang(data.tgl_mulai, data.tgl_selesai)} ${data.lokasi ? 'di '+escHtml(data.lokasi) : ''}. Pembebanan biaya pada ${escHtml(data.pembebanan||'-')}.</p>
            <p style="margin-bottom:8px;">Demikian disampaikan atas perhatian dan perkenan Bapak kami ucapkan terima kasih.</p>
        </div>
        <table style="width:100%; margin-top:25px; font-size:13px; font-family:'Times New Roman',Times,serif;">
            <tr>
                <td style="width:50%;"></td>
                <td style="text-align:left;">
                    Plh. Kabag Persidangan dan Perundang-Undangan<br><br><br><br>
                    <b>Ady Prasetya Radam, S.H., M.kn.</b><br>
                    Penata (III/c)<br>
                    NIP. 19910610 2015 1 001
                </td>
            </tr>
        </table>
        <div style="margin-top:15px; font-size:12px; font-family:'Times New Roman',Times,serif;">
            <strong>Disposisi Atasan :</strong><br>
            <span style="border-bottom:1px solid black; display:inline-block; width:200px;">   PPTK   </span><br><br>
            <span style="border-bottom:1px solid black; display:inline-block; width:200px;">   PENGGUNA ANGGARAN   </span>
        </div>
    `;
}
function escHtml(s){if(s==null)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
