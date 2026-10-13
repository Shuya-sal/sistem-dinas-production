// cetak_notadinas_util.js
// Helper bersama untuk semua cetak nota dinas.
// Menghasilkan blok "diikutsertakan" berbasis GRUP (pemimpin + petugas).

window.ndFormatTanggal = function(d) {
    if (!d) return '-';
    var dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    var bln = ['Januari','Februari','Maret','April','Mei','Juni','Juli',
               'Agustus','September','Oktober','November','Desember'];
    return dt.getDate() + ' ' + bln[dt.getMonth()] + ' ' + dt.getFullYear();
};

window.ndFormatRentang = function(a, b) {
    if (!a && !b) return '-';
    var bln = ['Januari','Februari','Maret','April','Mei','Juni','Juli',
               'Agustus','September','Oktober','November','Desember'];
    var da = a ? new Date(a) : null, db = b ? new Date(b) : null;
    if (!da || isNaN(da.getTime())) return window.ndFormatTanggal(a || b);
    if (!db || isNaN(db.getTime())) return window.ndFormatTanggal(a);
    if (da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth()) {
        return da.getDate() === db.getDate()
            ? window.ndFormatTanggal(a)
            : da.getDate() + ' - ' + db.getDate() + ' ' + bln[da.getMonth()] + ' ' + da.getFullYear();
    }
    return window.ndFormatTanggal(a) + ' s/d ' + window.ndFormatTanggal(b);
};

// Blok utama: daftar pemimpin + petugas yang meliput (bertingkat)
window.ndBlokGrup = function(data) {
    var esc = function(s){ if(s==null) return ''; return String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
    var grup = (data && data.grup) ? data.grup : [];

    // Fallback: kalau data lama tanpa grup, pakai daftar pegawai biasa
    if (!grup.length) {
        var peg = (data && data.pegawai) ? data.pegawai : [];
        if (!peg.length) return '<p>—</p>';
        var rows = peg.map(function(p, i){
            return '<tr><td style="width:30px; text-align:center;">' + (i+1) + '.</td>' +
                   '<td>' + esc(p.nama) + '</td>' +
                   '<td style="width:220px;">' + esc(p.jabatan || '-') + '</td></tr>';
        }).join('');
        return '<table style="width:100%; font-size:13px; border-collapse:collapse; ' +
               'margin-bottom:10px; font-family:\'Times New Roman\',Times,serif;">' + rows + '</table>';
    }

    var html = '';
    grup.forEach(function(g, gi){
        var judul = esc(g.pemimpin || '-');
        var tujuan = g.tujuan ? ' ke ' + esc(g.tujuan) : '';
        var petugas = g.petugas || [];
        var namaPetugas = petugas.map(function(p){
            return esc(p.nama) + (p.jabatan ? ' (' + esc(p.jabatan) + ')' : '');
        }).join(', ');

        html += '<p style="margin:6px 0 4px;">' +
                    '<strong>' + (gi + 1) + '. ' + judul + tujuan + '</strong>' +
                '</p>';
        if (petugas.length) {
            html += '<p style="margin:0 0 8px 18px;">Yang meliput/mendampingi: ' +
                    esc(namaPetugas) + '</p>';
        } else {
            html += '<p style="margin:0 0 8px 18px; font-style:italic;">(belum ada petugas)</p>';
        }
    });
    return html;
};
