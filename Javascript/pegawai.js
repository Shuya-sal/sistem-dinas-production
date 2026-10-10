var dbPegawai = [];
var placeholderFotoPegawai = "Image/default.jpg";
var currentFotoFilePegawai = null;
var currentPagePegawai = 1;
var rowsPerPagePegawai = 10; 
var currentSearchKeywordPegawai = ""; 
var timeoutSearchPegawai;
var currentKategoriPegawai = 'staf';

// Fungsi untuk mengganti Tab
window.switchTabPegawai = function(kategori) {
    currentKategoriPegawai = kategori;
    
    // 1. Ubah Efek Visual Tab
    document.getElementById('tabStaf').classList.remove('active');
    document.getElementById('tabDewan').classList.remove('active');
    
    const searchInput = document.getElementById('searchPegawai');
    if (kategori === 'staf') {
        document.getElementById('tabStaf').classList.add('active');
        searchInput.placeholder = "🔍 Cari Nama, NIP, atau Jabatan Staf...";
    } else {
        document.getElementById('tabDewan').classList.add('active');
        searchInput.placeholder = "🔍 Cari Nama atau Jabatan Anggota DPRD...";
    }
    
    // 2. Bersihkan kotak pencarian & Centang Bulk
    searchInput.value = '';
    currentSearchKeywordPegawai = '';
    const selectAllEl = document.getElementById('selectAllPegawai');
    if(selectAllEl) selectAllEl.checked = false;
    
    // 3. Tarik ulang data dari halaman 1
    fetchPegawai(1);
};

window.initPegawaiSPA = function() {
    loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser')) || { tingkat: 'Staf', nama: '', foto: '' };
    
    // Terapkan Proteksi
    const role = loggedInUser.tingkat;
    if (role === 'Human' || role === 'Staf') { const formSection = document.querySelector('.form-section'); if (formSection) formSection.style.display = 'none'; } 
    else if (role === 'Super Admin' || role === 'Pengguna Anggaran') { const roleSelect = document.getElementById('pegawaiTingkat'); if (roleSelect) { Array.from(roleSelect.options).forEach(opt => { if (opt.value === 'God Creator' || opt.value === 'Pengguna Anggaran') { opt.disabled = true; opt.style.color = '#ccc'; } }); } }
    if (role === 'God Creator') { const thKeamanan = document.getElementById('thKeamanan'); if (thKeamanan) thKeamanan.style.display = 'table-cell'; }
    // Tampilkan fitur Bulk Delete & Kolom Centang jika user memiliki wewenang (Bukan Staf/Human)
    if (role !== 'Human' && role !== 'Staf') {
        const btnBulk = document.getElementById('btnBulkDeletePegawai');
        if(btnBulk) btnBulk.style.display = 'inline-flex';
        const thBulk = document.getElementById('thBulkPegawai');
        if(thBulk) thBulk.style.display = 'table-cell';
    }

    // Pasang Pendengar Event (Event Listeners) SPA Aman
    const searchInput = document.getElementById('searchPegawai');
    if (searchInput) {
        searchInput.oninput = function(e) {
            clearTimeout(timeoutSearchPegawai); 
            timeoutSearchPegawai = setTimeout(() => { currentSearchKeywordPegawai = e.target.value; fetchPegawai(1); }, 500); 
        };
    }

    const pegawaiForm = document.getElementById('pegawaiForm');
    if(pegawaiForm) {
        pegawaiForm.onsubmit = async function(e) {
            e.preventDefault();
            const idField = document.getElementById('editPegawaiId').value || '';
            const id = idField.trim() === '' ? 'new' : idField;
            const fotoFile = currentFotoFilePegawai;
            const idx = dbPegawai.findIndex(p => p.id === id); const fotoFinal = idx !== -1 ? dbPegawai[idx].foto : placeholderFotoPegawai;

            const payload = {
                action: 'simpan', id: id, nama: document.getElementById('pegawaiNama').value, nip: document.getElementById('pegawaiNip').value, jabatan: document.getElementById('pegawaiJabatan').value, pangkat: document.getElementById('pegawaiPangkat').value, golongan: document.getElementById('pegawaiGolongan').value, bagian: document.getElementById('pegawaiBagian').value, status: document.getElementById('pegawaiStatus').value, password: document.getElementById('pegawaiPassword').value, tingkat: document.getElementById('pegawaiTingkat').value, nik: document.getElementById('pegawaiNik') ? document.getElementById('pegawaiNik').value : '', tempat_lahir: document.getElementById('pegawaiTempatLahir') ? document.getElementById('pegawaiTempatLahir').value : '', tgl_lahir: document.getElementById('pegawaiTglLahir') ? document.getElementById('pegawaiTglLahir').value : '', alamat: document.getElementById('pegawaiAlamat') ? document.getElementById('pegawaiAlamat').value : '', foto: fotoFinal, is_self_update: false
            };

            try {
                const formData = new FormData();
                Object.entries(payload).forEach(([key, value]) => formData.append(key, value == null ? '' : String(value)));
                if (fotoFile) formData.append('foto', fotoFile, fotoFile.name);
                const response = await fetch('PHP/api_pegawai.php', { method: 'POST', body: formData }); const result = await response.json();
                if(result.status === "success") {
                    const namaLoginBersih = String(loggedInUser.nama).trim().toLowerCase();
                    if (namaLoginBersih === payload.nama.trim().toLowerCase()) {
                        if(payload.foto) loggedInUser.foto = payload.foto; sessionStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
                        const topPicEl = document.getElementById('topProfilePic'); if(topPicEl) { if(window.getAvatarWidget) topPicEl.parentElement.outerHTML = window.getAvatarWidget(loggedInUser.foto, loggedInUser.frame, '40px', '0', 'topProfilePic'); else topPicEl.src = loggedInUser.foto || placeholderFotoPegawai; }
                    }
                    resetFormPegawai(); fetchPegawai(currentPagePegawai); alert("Berhasil menyimpan data!");
                } else { alert("Gagal menyimpan: " + result.message); }
            } catch (error) {}
        };
    }
    
    fetchPegawai(1);
};

async function fetchPegawai(page = 1) {
    currentPagePegawai = page; const tbody = document.getElementById('pegawaiDataBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Memuat data... ⏳</td></tr>';
    try {
        const url = `PHP/api_pegawai.php?page=${page}&limit=${rowsPerPagePegawai}&search=${encodeURIComponent(currentSearchKeywordPegawai)}&kategori=${currentKategoriPegawai}`;
        const response = await fetch(url); const result = await response.json();
        if (result.status === 'success') { dbPegawai = result.data || []; renderTabelPegawai(result.pagination.total_pages); } 
        else { if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">${result.message}</td></tr>`; }
    } catch (error) { if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red; font-weight:bold;">Gagal membaca data database.</td></tr>'; }
}

function previewImage(input) {
    const preview=document.getElementById('fotoPreview'); const file=input.files[0];
    if(!file){preview.src=placeholderFotoPegawai;currentFotoFilePegawai=null;return;}
    if(file.size>5*1024*1024){alert('Maksimal berkas 5MB.');input.value='';return;}
    currentFotoFilePegawai=file; preview.src=URL.createObjectURL(file);
}


window.resetFormPegawai = function() {
    const formPegawai = document.getElementById('pegawaiForm'); if(!formPegawai) return;
    formPegawai.reset(); document.getElementById('editPegawaiId').value = ''; document.getElementById('fotoPreview').src = placeholderFotoPegawai; currentFotoFilePegawai = null;
    const passInput = document.getElementById('pegawaiPassword'); if (passInput) { passInput.required = true; passInput.placeholder = 'Buat password login'; }
    document.getElementById('formTitle').innerText = "Form Input Pegawai";
}

function renderTabelPegawai(totalPages) {
    const tbody = document.getElementById('pegawaiDataBody'); if (!tbody) return; tbody.innerHTML = ''; 
    const colspan = (loggedInUser && loggedInUser.tingkat !== 'Human' && loggedInUser.tingkat !== 'Staf') ? 8 : 7;
    
    if (dbPegawai.length === 0) { tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center; padding: 20px;">Tidak ada data pegawai.</td></tr>`; renderPaginationPegawai(0); return; }

    // Matikan centang 'Pilih Semua' jika pindah halaman
    const selectAllEl = document.getElementById('selectAllPegawai');
    if(selectAllEl) selectAllEl.checked = false;

    let start = (currentPagePegawai - 1) * rowsPerPagePegawai;
    dbPegawai.forEach((p, index) => {
        const tr = document.createElement('tr'); 
        const profilClick = `navigasiSPA('profile.html?user=${encodeURIComponent(p.nama)}')`;
        
        // ==========================================
        // KODE BARU: Tombol Detail Pegawai
        // ==========================================
        let btnDetail = `<button type="button" class="btn-action" style="background-color: #3b82f6; width: 100%; margin-bottom: 6px; justify-content: center; padding: 6px 0; font-size: 11px;" onclick="showDetailPegawai('${p.id}')">👁️ Detail Pegawai</button>`;

        let btnIdCard = '';
        if (p.id === loggedInUser.id || (loggedInUser.tingkat !== 'Staf' && loggedInUser.tingkat !== 'Human')) {
            btnIdCard = `<button type="button" class="btn-action" style="background-color: #8b5cf6; width: 100%; margin-bottom: 6px; justify-content: center; padding: 6px 0; font-size: 11px;" onclick="unduhIDCard('${p.id}', event)">🪪 Unduh ID Card</button>`;
        }

        let btnEditHapus = '';
        if (loggedInUser.tingkat === 'Human' || loggedInUser.tingkat === 'Staf') { 
            btnEditHapus = '<span style="color:#94a3b8; font-size:12px; font-weight:bold; display:block; text-align:center; margin-top:5px;">Hanya Lihat</span>'; 
        } 
        else if ((loggedInUser.tingkat === 'Super Admin' || loggedInUser.tingkat === 'Pengguna Anggaran') && (p.tingkat === 'God Creator' || p.tingkat === 'Pengguna Anggaran')) { 
            btnEditHapus = '<span style="color:#ef4444; font-size:12px; font-weight:bold; display:block; text-align:center; margin-top:5px;">Akses Terkunci</span>'; 
        } 
        else { 
            btnEditHapus = `<div style="display: flex; gap: 5px; width: 100%;"><button type="button" style="flex:1; justify-content:center; margin:0;" class="btn-action btn-edit" onclick="editPegawai('${p.id}')">Edit</button><button type="button" style="flex:1; justify-content:center; margin:0;" class="btn-action btn-delete" onclick="hapusPegawai('${p.id}')">Hapus</button></div>`; 
        }

        // Menggabungkan Tombol Detail ke Paling Atas
        let actionButtons = `<div class="action-group column" style="width: 100%;">${btnDetail}${btnIdCard}${btnEditHapus}</div>`;

        let kolomKeamananHTML = '';
        if (loggedInUser.tingkat === 'God Creator') {
            if (p.is_blocked) { kolomKeamananHTML = `<td style="background-color: #fef2f2; text-align: center; vertical-align: middle; border: 1px solid #fecaca; padding: 10px;"><span style="color: #dc2626; font-weight: 800; font-size: 11px;">TERBLOKIR</span><br><button type="button" class="btn-action btn-duplicate" style="margin-top: 8px; font-size: 10px; padding: 6px 8px; width: 100%; justify-content: center;" onclick="bukaBlokir('${p.id}')">Buka Blokir</button></td>`; } 
            else { kolomKeamananHTML = `<td style="text-align: center; vertical-align: middle;"><span style="color: #10b981; font-weight: 800; font-size: 11px;">AMAN</span></td>`; }
        }

        const avatarTabel = window.getAvatarWidget ? window.getAvatarWidget(p.foto, p.frame, '45px', '0 auto') : `<img src="${p.foto || placeholderFotoPegawai}" class="img-tabel">`;

        let checkboxHtml = '';
        if (loggedInUser.tingkat !== 'Human' && loggedInUser.tingkat !== 'Staf') {
            checkboxHtml = `<td style="text-align: center; vertical-align: middle;">
                <input type="checkbox" class="chk-pegawai" value="${p.id}" style="width: 16px; height: 16px; cursor: pointer;">
            </td>`;
        }

        tr.innerHTML = `
            ${checkboxHtml}
            <td style="text-align: center; vertical-align: middle;">${start + index + 1}</td>
            <td style="text-align: center; vertical-align: middle; cursor:pointer;" onclick="${profilClick}" title="Lihat Profil">${avatarTabel}</td>
            <td style="vertical-align: middle;">
                <a href="javascript:void(0)" onclick="${profilClick}" style="text-decoration:none; font-weight: 700; color: #1e293b; margin-bottom: 3px; display:block; transition:0.2s;" onmouseover="this.style.color='#3b82f6'" onmouseout="this.style.color='#1e293b'">${p.nama}</a>
                <div style="font-size: 11px; color: #64748b; background: #f1f5f9; padding: 3px 6px; border-radius: 4px; display: inline-block;">NIP: ${p.nip || '-'}</div>
            </td>
            <td style="vertical-align: middle;"><div style="font-weight: 600; color: #334155;">${p.jabatan || '-'}</div><div style="font-size: 12px; color: #64748b;">${p.bagian || '-'}</div></td>
            <td style="vertical-align: middle;"><span style="font-size: 12px; font-weight: 600; padding: 4px 8px; border-radius: 6px; background-color: #e0f2fe; color: #0284c7;">${p.status || '-'}</span></td>
            ${kolomKeamananHTML}
            <td style="text-align: center; vertical-align: middle;">${actionButtons}</td>
        `;
        tbody.appendChild(tr);
    });
    renderPaginationPegawai(totalPages);
}

function renderPaginationPegawai(totalPages) {
    let paginationContainer = document.getElementById('paginationControlsPegawai');
    if (!paginationContainer) {
        const tableElement = document.getElementById('pegawaiDataBody').parentElement;
        paginationContainer = document.createElement('div'); paginationContainer.id = 'paginationControlsPegawai'; paginationContainer.style.cssText = "display:flex; justify-content:center; align-items:center; gap:5px; margin-top:15px; margin-bottom:25px;";
        tableElement.parentNode.insertBefore(paginationContainer, tableElement.nextSibling);
    }
    paginationContainer.innerHTML = ''; if (totalPages <= 1) return; 

    let pageNumbers = [];
    if (totalPages <= 6) { for (let i = 1; i <= totalPages; i++) pageNumbers.push(i); } 
    else {
        if (currentPagePegawai <= 4) pageNumbers = [1, 2, 3, 4, 5, '...', totalPages];
        else if (currentPagePegawai >= totalPages - 3) pageNumbers = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        else pageNumbers = [1, '...', currentPagePegawai - 1, currentPagePegawai, currentPagePegawai + 1, '...', totalPages];
    }

    const prevBtn = document.createElement('button'); prevBtn.innerHTML = '←'; prevBtn.className = 'btn'; prevBtn.style.cssText = 'padding:6px 12px; border:none; color:white; background-color:' + (currentPagePegawai === 1 ? '#bdc3c7' : '#2980b9');
    prevBtn.disabled = (currentPagePegawai === 1); prevBtn.onclick = () => { if (currentPagePegawai > 1) fetchPegawai(currentPagePegawai - 1); }; paginationContainer.appendChild(prevBtn);

    pageNumbers.forEach(p => {
        const btn = document.createElement('button'); btn.innerHTML = p; btn.className = 'btn'; btn.style.padding = '6px 12px';
        if (p === '...') { btn.disabled = true; btn.style.cssText += 'background-color:transparent; color:#333; border:none; box-shadow:none;'; } 
        else { btn.style.cssText += 'color:white; border:none; background-color:' + ((p === currentPagePegawai) ? '#27ae60' : '#7f8c8d'); btn.onclick = () => fetchPegawai(p); }
        paginationContainer.appendChild(btn);
    });

    const nextBtn = document.createElement('button'); nextBtn.innerHTML = '→'; nextBtn.className = 'btn'; nextBtn.style.cssText = 'padding:6px 12px; border:none; color:white; background-color:' + (currentPagePegawai === totalPages ? '#bdc3c7' : '#2980b9');
    nextBtn.disabled = (currentPagePegawai === totalPages); nextBtn.onclick = () => { if (currentPagePegawai < totalPages) fetchPegawai(currentPagePegawai + 1); }; paginationContainer.appendChild(nextBtn);
}

window.editPegawai = async function(id) {
    // Pakai data baris yang sudah dimuat agar tombol edit tetap responsif
    // dan tidak perlu menarik seluruh tabel pegawai dari server.
    let p = (Array.isArray(dbPegawai) ? dbPegawai : []).find(x => String(x.id) === String(id));

    if (!p) {
        try {
            const response = await fetch('PHP/api_pegawai.php?id=' + encodeURIComponent(id));
            const result = await response.json();
            if (result.status === 'success' && result.data) p = result.data;
            else { alert("Data pegawai tidak ditemukan di server."); return; }
        } catch (e) { alert("Gagal mengambil data pegawai untuk diedit."); return; }
    }

    if (document.getElementById('pegawaiForm')) {
        const setVal = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = (val === null || val === undefined) ? '' : val; };
        setVal('editPegawaiId', p.id);
        setVal('pegawaiNama', p.nama);
        setVal('pegawaiNip', p.nip);
        setVal('pegawaiJabatan', p.jabatan);
        setVal('pegawaiPangkat', p.pangkat);
        setVal('pegawaiGolongan', p.golongan);
        setVal('pegawaiBagian', p.bagian);
        setVal('pegawaiStatus', p.status === 'Honorer' ? 'Kontrak' : p.status);
        setVal('pegawaiTingkat', p.tingkat || 'Staf');
        setVal('pegawaiNik', p.nik);
        setVal('pegawaiTempatLahir', p.tempat_lahir);
        setVal('pegawaiTglLahir', p.tgl_lahir);
        setVal('pegawaiAlamat', p.alamat);

        const passInput = document.getElementById('pegawaiPassword');
        if (passInput) { passInput.value = ''; passInput.required = false; passInput.placeholder = 'Kosongkan jika tidak ingin mengubah password'; }

        document.getElementById('fotoPreview').src = p.foto || placeholderFotoPegawai;
        currentFotoFilePegawai = null;
        const fotoInput = document.getElementById('pegawaiFoto'); if (fotoInput) fotoInput.value = "";
        document.getElementById('formTitle').innerText = "✏️ Mode Edit Data Pegawai";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

async function hapusPegawai(id) {
    const isConf = await showCustomConfirm("Menghapus pegawai ini juga akan menghapus semua riwayat dinasnya secara permanen. Lanjutkan?", "Hapus Pegawai", "🗑️");
    if(isConf) {
        try { await fetch('PHP/api_pegawai.php', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'hapus', id: id }) }); fetchPegawai(currentPagePegawai); } catch (error) {}
    }
}

function toggleVisibility(inputId, iconElement) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') { input.type = 'text'; iconElement.innerText = '🙈'; } else { input.type = 'password'; iconElement.innerText = '👁️'; }
}

async function bukaBlokir(id) {
    const isConf = await showCustomConfirm("Yakin ingin mereset hukuman dan membuka blokir pegawai ini?", "Buka Blokir", "🔓", "#10b981", "#d1fae5");
    if (isConf) {
        try {
            const response = await fetch('PHP/api_pegawai.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'buka_blokir', id: id }) });
            const result = await response.json();
            if (result.status === 'success') { alert('Blokir berhasil dibuka!'); fetchPegawai(currentPagePegawai); } else { alert('Gagal membuka blokir.'); }
        } catch (error) {}
    }
}

// =========================================================
// FITUR BULK INSERT (IMPORT EXCEL)
// =========================================================

// 1. Fungsi Membuat dan Mengunduh Template Format Excel
window.downloadFormatExcel = function() {
    // Membuat data contoh (dummy) untuk template
    const templateData = [{ 
        Nama_Lengkap: "Budi Santoso", 
        NIP: "198001012005011001", 
        Jabatan: "Staf Administrasi", 
        Pangkat: "Penata Muda", 
        Golongan: "III/a", 
        Bagian: "Bagian Umum", 
        Status: "PNS", 
        Tingkat_Akses: "Staf", 
        NIK: "6371234567890001", 
        Tempat_Lahir: "Banjarmasin", 
        Tanggal_Lahir: "1980-01-01", 
        Alamat: "Jl. Manggis No 10" 
    }];

    // Proses konversi JSON ke File Excel menggunakan library XLSX
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Format_Pegawai");
    
    // Sesuaikan lebar kolom agar rapi saat dibuka di Excel
    worksheet['!cols'] = [{wch: 25}, {wch: 20}, {wch: 20}, {wch: 15}, {wch: 10}, {wch: 20}, {wch: 15}, {wch: 15}, {wch: 20}, {wch: 15}, {wch: 15}, {wch: 30}];

    XLSX.writeFile(workbook, "Format_Bulk_Pegawai.xlsx");
}

// 2. Fungsi Membaca dan Mengunggah File Excel ke Database
window.prosesUploadBulk = async function(input) {
    const file = input.files[0];
    if (!file) return;

    // Panggil Popup Kustom buatan Anda
    const isConf = await showCustomConfirm(`Anda yakin ingin mengimpor data pegawai dari file <b>${file.name}</b>?<br><br><small style='color:#e74c3c'>*Pastikan kolom sesuai dengan Format Excel yang disediakan.</small>`, "Konfirmasi Import", "📤", "#10b981", "#d1fae5");
    if (!isConf) { input.value = ''; return; }

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Ubah isi Excel menjadi array JSON (pertahankan teks NIP/NIK dan isi kolom kosong dengan string kosong)
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

            if (jsonData.length === 0) {
                alert("File Excel kosong atau format tidak sesuai.");
                input.value = ''; return;
            }

            // Tampilkan loading di layar
            document.getElementById('pegawaiDataBody').innerHTML = '<tr><td colspan="7" style="text-align:center;">Mengimpor data ke server... ⏳</td></tr>';

            // Kirim data ke PHP
            const response = await fetch('PHP/api_pegawai.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'import_bulk', data: jsonData })
            });
            const result = await response.json();
            
            if (result.status === 'success') {
                let pesan = `✅ Berhasil mengimpor ${result.total} data pegawai!`;
                if (result.dilewati && result.dilewati > 0) {
                    pesan += `\n(${result.dilewati} data dilewati karena NIP/Nama sudah terdaftar)`;
                }
                pesan += `\n\n(Catatan: Password bawaan untuk akun-akun baru ini adalah: 123456)`;
                alert(pesan);
                fetchPegawai(1); // Segarkan tabel
            } else {
                alert("Gagal mengimpor: " + result.message);
                fetchPegawai(currentPagePegawai);
            }
        } catch (err) {
            alert("Terjadi kesalahan jaringan atau format file rusak.");
            fetchPegawai(currentPagePegawai);
        } finally {
            input.value = ''; // Kosongkan input agar bisa upload file yang sama lagi
        }
    };
    reader.readAsArrayBuffer(file);
}

// Menyembunyikan tombol Bulk jika yang login adalah Staf biasa
if (loggedInUser && (loggedInUser.tingkat === 'Staf' || loggedInUser.tingkat === 'Human')) {
    const bulkContainer = document.getElementById('bulkPegawaiContainer');
    if (bulkContainer) bulkContainer.style.display = 'none';
}

// ==========================================
// FITUR BARU: GENERATOR ID CARD DIGITAL
// ==========================================
window.unduhIDCard = async function(id, event) {
    // 1. Ambil data pegawai berdasarkan ID yang diklik
    const p = window.dbPegawai.find(x => x.id == id);
    if (!p) return;

    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Sedang Mencetak...';
    btn.disabled = true;

    // 2. Pastikan library pembuat gambar (html2canvas) sudah terpasang
    if (typeof html2canvas === 'undefined') {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
        document.head.appendChild(script);
        
        // Beri waktu 1 detik agar library selesai dimuat dari internet
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 3. Siapkan Desain Virtual ID Card (Warna Navy & Emas khas DPRD)
    const cardContainer = document.createElement('div');
    cardContainer.style.position = 'absolute';
    cardContainer.style.left = '-9999px'; // Sembunyikan dari layar
    
    // ==========================================
    // PERBAIKAN BUG PATH FOTO UNTUK HTML2CANVAS
    // ==========================================
    let fotoPegawai = p.foto && p.foto.includes('.') ? p.foto : 'Image/default.jpg';
    
    // 1. Potong IP/Localhost lawas jika ada (Sama seperti kasus stiker)
    if (fotoPegawai.includes('Users/Image')) {
        fotoPegawai = fotoPegawai.substring(fotoPegawai.indexOf('Users/Image'));
    }
    
    // 2. Mesin html2canvas wajib menggunakan URL Absolut (http://...) dari domain saat ini
    // agar gambar tidak diblokir oleh sistem keamanan browser (CORS) saat digambar ulang.
    const baseURL = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    if (!fotoPegawai.startsWith('http')) {
        fotoPegawai = baseURL + fotoPegawai;
    }
    // ==========================================
    
    cardContainer.innerHTML = `
        <div id="idCardRenderBox" style="width: 320px; height: 500px; background: linear-gradient(135deg, #ffffff, #f8fafc); border-radius: 16px; position: relative; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; border: 1px solid #cbd5e1;">
            
            <!-- Header Navy & Gold -->
            <div style="background: linear-gradient(135deg, #1e3a8a, #0f172a); padding: 25px 15px 40px; text-align: center; color: white; border-bottom: 5px solid #f59e0b; position: relative;">
                <div style="font-size: 16px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">SEKRETARIAT DPRD</div>
                <div style="font-size: 12px; font-weight: 600; color: #e2e8f0; margin-top: 3px; letter-spacing: 0.5px;">PROVINSI KALIMANTAN SELATAN</div>
            </div>

            <!-- Wadah Foto (Menimpa garis Header) -->
            <div style="text-align: center; margin-top: -45px; position: relative; z-index: 2;">
                <div style="width: 120px; height: 120px; margin: 0 auto; border-radius: 50%; padding: 4px; background: white; border: 3px solid #f59e0b; box-shadow: 0 4px 15px rgba(0,0,0,0.15);">
                    <img src="${fotoPegawai}" crossorigin="anonymous" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.src='Image/default.jpg'">
                </div>
            </div>

            <!-- Data Diri Pegawai -->
            <div style="text-align: center; padding: 15px 20px;">
                <h3 style="margin: 10px 0 5px 0; font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; line-height: 1.2;">${p.nama}</h3>
                <p style="margin: 0; font-size: 14px; color: #3b82f6; font-weight: 700;">${p.jabatan || 'PEGAWAI'}</p>
                
                <div style="margin-top: 20px; background: #f1f5f9; padding: 12px; border-radius: 10px; font-size: 12px; text-align: left; border: 1px solid #e2e8f0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px;">
                        <b style="color: #64748b;">NIP / NIK</b> <span style="font-weight: 700;">${p.nip || p.nik || '-'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px;">
                        <b style="color: #64748b;">BAGIAN</b> <span style="font-weight: 700; text-align: right;">${p.bagian || '-'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <b style="color: #64748b;">STATUS</b> <span style="font-weight: 700;">${p.status || '-'}</span>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div style="position: absolute; bottom: 0; width: 100%; text-align: center; padding: 12px; background: #0f172a; color: white; font-size: 10px; font-weight: bold; letter-spacing: 1px;">
                KARTU IDENTITAS RESMI
            </div>
        </div>
    `;
    
    document.body.appendChild(cardContainer);

    // 4. Ubah HTML menjadi Gambar dan Unduh
    try {
        // Render gambar dengan resolusi 3x lipat agar sangat jernih saat di-zoom
        const canvas = await html2canvas(document.getElementById('idCardRenderBox'), { 
            scale: 3, 
            useCORS: true, 
            backgroundColor: null 
        });
        
        const link = document.createElement('a');
        link.download = `ID_Card_${p.nama}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (e) {
        alert("Gagal mencetak ID Card. Pastikan jaringan stabil.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        document.body.removeChild(cardContainer);
    }
}

// =========================================================================
// FITUR BULK DELETE (HAPUS MASSAL BERDASARKAN CENTANG)
// =========================================================================
window.toggleSelectAllPegawai = function(source) {
    const checkboxes = document.querySelectorAll('.chk-pegawai');
    checkboxes.forEach(chk => {
        chk.checked = source.checked;
    });
};

window.hapusBulkPegawai = async function() {
    const checkedBoxes = document.querySelectorAll('.chk-pegawai:checked');
    if (checkedBoxes.length === 0) {
        alert("Silakan centang minimal satu pegawai di tabel yang ingin dihapus.");
        return;
    }

    let idsToDelete = [];
    let containsSelf = false;

    // Memisahkan akun sendiri agar tidak ikut terhapus
    checkedBoxes.forEach(box => {
        if(box.value === loggedInUser.id) {
            containsSelf = true;
        } else {
            idsToDelete.push(box.value);
        }
    });

    if (containsSelf) {
        alert("Peringatan Keamanan: Anda tidak dapat menghapus akun Anda sendiri menggunakan fitur ini. Akun Anda telah diabaikan dari daftar penghapusan.");
    }

    if (idsToDelete.length === 0) {
        return; // Berhenti jika ternyata hanya akunnya sendiri yang dicentang
    }

    const isConf = await showCustomConfirm(`Anda yakin ingin menghapus ${idsToDelete.length} pegawai terpilih beserta semua riwayat dinasnya secara permanen?`, "Hapus Massal Pegawai", "🗑️");
    if (!isConf) return;

    const btn = document.getElementById('btnBulkDeletePegawai');
    const oldText = btn ? btn.innerHTML : "🗑️ Hapus Pilihan (Bulk)";
    if(btn) {
        btn.innerHTML = "⏳ Menghapus...";
        btn.disabled = true;
    }

    try {
        // Eksekusi hapus satu per satu secara paralel dan asinkronus
        const deletePromises = idsToDelete.map(idTarget => {
            return fetch('PHP/api_pegawai.php', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'hapus', id: idTarget })
            });
        });

        await Promise.all(deletePromises);
        
        alert(`✅ Berhasil menghapus ${idsToDelete.length} pegawai terpilih!`);
        fetchPegawai(1); // Refresh dan kembali ke halaman 1
    } catch (error) {
        alert("Terjadi kesalahan saat memproses penghapusan massal.");
        fetchPegawai(currentPagePegawai);
    } finally {
        if(btn) {
            btn.innerHTML = oldText;
            btn.disabled = false;
        }
        const selectAllEl = document.getElementById('selectAllPegawai');
        if(selectAllEl) selectAllEl.checked = false;
    }
};

// ==========================================
// FITUR POP-UP DETAIL PEGAWAI (DENGAN PEMBATASAN TINGKAT AKSES)
// ==========================================
window.showDetailPegawai = function(id) {
    const p = dbPegawai.find(x => x.id == id);
    if (!p) return;

    // Hapus pop-up lama jika ada (mencegah tumpuk)
    const existingModal = document.getElementById('modalDetailPegawai');
    if (existingModal) existingModal.remove();

    let fotoUrl = p.foto;
    if (!fotoUrl || fotoUrl === "null" || fotoUrl.trim() === "") {
        fotoUrl = placeholderFotoPegawai;
    }
    
    // Format Tanggal Lahir agar rapi
    let tglLahirFmt = '-';
    if (p.tgl_lahir) {
        const date = new Date(p.tgl_lahir);
        const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        tglLahirFmt = `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
    }
    const tempatTglLahir = `${p.tempat_lahir || '-'}, ${tglLahirFmt}`;

    // ==========================================
    // KODE PERBAIKAN: Baris Tingkat Akses hanya dicetak jika role adalah God Creator / Super Admin
    // ==========================================
    let tingkatAksesRow = '';
    const userRole = loggedInUser ? loggedInUser.tingkat : '';
    if (userRole === 'God Creator' || userRole === 'Super Admin') {
        tingkatAksesRow = `
            <tr>
                <td style="padding: 8px 0; color: #64748b;">Tingkat Akses</td>
                <td style="padding: 8px 0; font-weight: bold; color: #e11d48;">${p.tingkat || 'Staf'}</td>
            </tr>
        `;
    }
    // ==========================================

    const modalHtml = `
    <div id="modalDetailPegawai" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(4px);">
        <div style="background: white; width: 90%; max-width: 450px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); overflow: hidden; animation: fadeIn 0.3s ease;">
            
            <!-- Header Modal -->
            <div style="background: #1e293b; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; color: white;">
                <h3 style="margin: 0; font-size: 15px; font-weight: bold;">Biodata Pegawai</h3>
                <button onclick="document.getElementById('modalDetailPegawai').remove()" style="background: transparent; border: none; color: #cbd5e1; font-size: 22px; cursor: pointer; line-height: 1;">&times;</button>
            </div>
            
            <!-- Body Modal -->
            <div style="padding: 20px; max-height: 70vh; overflow-y: auto;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="${fotoUrl}" onerror="this.onerror=null; this.src='Image/default.jpg';" style="width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 3px solid #e2e8f0; padding: 2px;">
                    <h2 style="margin: 10px 0 5px 0; font-size: 18px; color: #0f172a;">${p.nama}</h2>
                    <span style="background: #e0f2fe; color: #0284c7; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold;">${p.jabatan || '-'}</span>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tbody>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 0; color: #64748b; width: 40%;">NIP</td>
                            <td style="padding: 8px 0; font-weight: bold; color: #1e293b;">${p.nip || '-'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 0; color: #64748b;">NIK</td>
                            <td style="padding: 8px 0; font-weight: bold; color: #1e293b;">${p.nik || '-'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 0; color: #64748b;">Bagian</td>
                            <td style="padding: 8px 0; font-weight: bold; color: #1e293b;">${p.bagian || '-'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 0; color: #64748b;">Pangkat / Gol.</td>
                            <td style="padding: 8px 0; font-weight: bold; color: #1e293b;">${p.pangkat || '-'} / ${p.golongan || '-'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 0; color: #64748b;">Status</td>
                            <td style="padding: 8px 0; font-weight: bold; color: #1e293b;">${p.status || '-'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 0; color: #64748b;">TTL</td>
                            <td style="padding: 8px 0; font-weight: bold; color: #1e293b;">${tempatTglLahir}</td>
                        </tr>
                        <tr style="${tingkatAksesRow ? 'border-bottom: 1px solid #f1f5f9;' : ''}">
                            <td style="padding: 8px 0; color: #64748b; vertical-align: top;">Alamat</td>
                            <td style="padding: 8px 0; font-weight: bold; color: #1e293b;">${p.alamat || '-'}</td>
                        </tr>
                        ${tingkatAksesRow}
                    </tbody>
                </table>
            </div>
            
            <!-- Footer Modal -->
            <div style="padding: 12px 20px; background: #f8fafc; text-align: right; border-top: 1px solid #e2e8f0;">
                <button type="button" onclick="document.getElementById('modalDetailPegawai').remove()" style="background: #64748b; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px;">Tutup</button>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};