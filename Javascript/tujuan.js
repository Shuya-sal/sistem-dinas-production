var dbTujuan = [];
var currentPageTujuan = 1;
var rowsPerPageTujuan = 5;

window.initTujuanSPA = function() {
    loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser')) || { tingkat: 'Staf' };
    
    if (loggedInUser.tingkat === 'Human' || loggedInUser.tingkat === 'Staf') {
        const formSection = document.querySelector('.form-section');
        if(formSection) formSection.style.display = 'none';
    }

    document.querySelectorAll('.hitung').forEach(el => {
    el.oninput = () => {
        const b =
            parseFloat(document.getElementById('duitBerangkat').value) || 0;

        const p =
            parseFloat(document.getElementById('duitPulang').value) || 0;

        const t =
            parseFloat(document.getElementById('duitTambahan').value) || 0;

        const uh =
            parseFloat(document.getElementById('uangHarian').value) || 0;

        const ph1 =
            parseFloat(document.getElementById('paguHotel1').value) || 0;

        const ph2 =
            parseFloat(document.getElementById('paguHotel2').value) || 0;

        const ph3 =
            parseFloat(document.getElementById('paguHotel3').value) || 0;

        const ur =
            parseFloat(document.getElementById('uangRepresentasi').value) || 0;

        const hargaTiketPp =
            parseFloat(document.getElementById('hargaTiketPp').value) || 0;

        document.getElementById('totalDuit').value =
            b + p + t + uh + ph1 + ph2 + ph3 + ur + hargaTiketPp;
    };
});

    const tujuanForm = document.getElementById('tujuanForm');
    if(tujuanForm) {
        tujuanForm.onsubmit = async (e) => {
            e.preventDefault();
            const idEdit = document.getElementById('editTujuanId').value;
            const dBerangkat = parseFloat(document.getElementById('duitBerangkat').value) || 0;
            const dPulang = parseFloat(document.getElementById('duitPulang').value) || 0;
            const dTambahan = parseFloat(document.getElementById('duitTambahan').value) || 0;
            const hargaTiketPp = parseFloat(document.getElementById('hargaTiketPp').value) || 0;
            const uHarian = parseFloat(document.getElementById('uangHarian').value) || 0;
            const pHotel1 = parseFloat(document.getElementById('paguHotel1').value) || 0;
            const pHotel2 = parseFloat(document.getElementById('paguHotel2').value) || 0;
            const pHotel3 = parseFloat(document.getElementById('paguHotel3').value) || 0;
            const uRepresentasi = parseFloat(document.getElementById('uangRepresentasi').value) || 0;

            const totalHitung = dBerangkat + dPulang + dTambahan + uHarian + pHotel1 + pHotel2 + pHotel3 + uRepresentasi + hargaTiketPp;
            
            const payload = {
                id: idEdit || Date.now().toString(), 
                jenis: document.getElementById('jenisTujuanInput').value, 
                nama: document.getElementById('namaTujuanInput').value, 
                bunyi_berangkat: document.getElementById('bunyiBerangkatInput').value, 
                bunyi_pulang: document.getElementById('bunyiPulangInput').value, 
                bunyi_tambahan: document.getElementById('bunyiTambahanInput').value || '-', 
                uang_harian: uHarian,
                pagu_hotel: pHotel1,
                pagu_hotel_4: pHotel2,
                pagu_hotel_es2: pHotel3,
                uang_representasi: uRepresentasi,
                harga_tiket_pp: hargaTiketPp,
                berangkat: dBerangkat, 
                pulang: dPulang, 
                tambahan: dTambahan, 
                total: totalHitung
            };

            try {
                const response = await fetch('PHP/api_tujuan.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const result = await response.json();
                if(result.status === "success") { if (!idEdit) currentPageTujuan = 1; resetFormTujuan(); fetchTujuan(); } 
                else { alert("Gagal menyimpan referensi: " + result.message); }
            } catch (error) {}
        };
    }

    const filterTujuanInput = document.getElementById('filterTujuan');
    if (filterTujuanInput) {
        filterTujuanInput.oninput = function() {
            clearTimeout(window.timeoutSearchTujuan);
            window.timeoutSearchTujuan = setTimeout(() => { currentPageTujuan = 1; renderTujuan(this.value.toLowerCase()); }, 500);
        };
    }

    fetchTujuan();
};

function formatRupiah(angka) {
    const parsed = parseFloat(angka);
    if (isNaN(parsed) || parsed === 0) return '-';
    return 'Rp' + parsed.toLocaleString('id-ID');
}

async function fetchTujuan() {
    try {
        const response = await fetch('PHP/api_tujuan.php'); dbTujuan = await response.json();
        const filterEl = document.getElementById('filterTujuan');
        renderTujuan(filterEl ? filterEl.value.toLowerCase() : '');
    } catch (error) {}
}

window.resetFormTujuan = function() {
    const form = document.getElementById('tujuanForm');
    if(form) { form.reset(); document.getElementById('editTujuanId').value = ''; }
}

window.editTujuan = function(id) {
    const d = dbTujuan.find(x => x.id == id); 
    if (d && document.getElementById('tujuanForm')) {
        document.getElementById('editTujuanId').value = d.id; 
        document.getElementById('jenisTujuanInput').value = d.jenis; 
        document.getElementById('namaTujuanInput').value = d.nama; 
        document.getElementById('bunyiBerangkatInput').value = d.bunyi_berangkat; 
        document.getElementById('bunyiPulangInput').value = d.bunyi_pulang; 
        document.getElementById('bunyiTambahanInput').value = d.bunyi_tambahan === '-' ? '' : d.bunyi_tambahan; 
        
        document.getElementById('uangHarian').value = d.uang_harian == 0 ? '' : d.uang_harian; 
        document.getElementById('paguHotel1').value = d.pagu_hotel == 0 ? '' : d.pagu_hotel; 
        document.getElementById('paguHotel2').value = d.pagu_hotel_4 == 0 ? '' : d.pagu_hotel_4; 
        document.getElementById('paguHotel3').value = d.pagu_hotel_es2 == 0 ? '' : d.pagu_hotel_es2; 
        
        document.getElementById('duitBerangkat').value = d.berangkat == 0 ? '' : d.berangkat; 
        document.getElementById('duitPulang').value = d.pulang == 0 ? '' : d.pulang; 
        document.getElementById('duitTambahan').value = d.tambahan == 0 ? '' : d.tambahan; 
        document.getElementById('uangRepresentasi').value = d.uang_representasi == 0 ? '' : d.uang_representasi; 
        document.getElementById('hargaTiketPp').value = d.harga_tiket_pp == 0 ? '' : d.harga_tiket_pp;
        document.getElementById('totalDuit').value = d.total;
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function renderTujuan(filterText = '') {
    const tbody = document.getElementById('tujuanDataBody'); if(!tbody) return;
    const filteredData = dbTujuan.filter(d => d.nama.toLowerCase().includes(filterText) || d.jenis.toLowerCase().includes(filterText));

    if (filteredData.length === 0) { tbody.innerHTML = '<tr><td colspan="16" style="text-align:center;">Data tidak ditemukan.</td></tr>'; document.getElementById('paginationControls').innerHTML = ''; return; }

    const totalPages = Math.ceil(filteredData.length / rowsPerPageTujuan);
    if (currentPageTujuan > totalPages) currentPageTujuan = totalPages; 

    const startIndex = (currentPageTujuan - 1) * rowsPerPageTujuan;
    const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPageTujuan);

    tbody.innerHTML = paginatedData.map(d => {
        let actionButtons = '';
        if (loggedInUser.tingkat === 'Human' || loggedInUser.tingkat === 'Staf') { actionButtons = '<span style="color:#94a3b8; font-size:12px; font-weight:bold;">Hanya Lihat</span>'; } 
        else { actionButtons = `<div class="action-group"><button type="button" class="btn-action btn-edit" onclick="editTujuan('${d.id}')" style="width: 100%;">Edit</button><button type="button" class="btn-action btn-delete" onclick="hapusTujuan('${d.id}')" style="width: 100%; margin-top:5px;">Hapus</button></div>`; }
        return `<tr>
                    <td>${d.jenis}</td>
                    <td><b>${d.nama}</b></td>
                    <td><span style="color: #2563eb; font-weight:600;">${formatRupiah(d.uang_harian)}</span></td>
                    <td><span style="color: #10b981; font-weight:600;">${formatRupiah(d.pagu_hotel)}</span></td>
                    <td><span style="color: #10b981; font-weight:600;">${formatRupiah(d.pagu_hotel_4)}</span></td>
                    <td><span style="color: #10b981; font-weight:600;">${formatRupiah(d.pagu_hotel_es2)}</span></td>
                    <td><small>${d.bunyi_berangkat}</small></td>
                    <td><small>${d.bunyi_pulang}</small></td>
                    <td><small>${!d.bunyi_tambahan || d.bunyi_tambahan === '-' ? '-' : d.bunyi_tambahan}</small></td>
                    <td>${formatRupiah(d.berangkat)}</td>
                    <td>${formatRupiah(d.pulang)}</td>
                    <td>${formatRupiah(d.tambahan)}</td>
                    <td><span style="color: #f59e0b; font-weight:600;">${formatRupiah(d.uang_representasi)}</span></td>
                    <td><span style="color: #8b5cf6; font-weight:600;">${formatRupiah(d.harga_tiket_pp)}</span></td>
                    <td><b style="color: #e74c3c;">${formatRupiah(d.total)}</b></td>
                    <td style="text-align:center; vertical-align:middle;">${actionButtons}</td>
                </tr>`
    }).join('');
    renderPaginationControlsTujuan(filteredData.length, filterText);
}

function renderPaginationControlsTujuan(totalItems, currentFilter) {
    const controlsContainer = document.getElementById('paginationControls'); if(!controlsContainer) return; controlsContainer.innerHTML = '';
    const totalPages = Math.ceil(totalItems / rowsPerPageTujuan); if (totalPages <= 1) return; 

    const prevBtn = document.createElement('button'); prevBtn.innerHTML = '←'; prevBtn.className = 'btn'; prevBtn.style.padding = '6px 12px'; prevBtn.style.backgroundColor = currentPageTujuan === 1 ? '#bdc3c7' : '#2980b9'; prevBtn.disabled = currentPageTujuan === 1;
    prevBtn.onclick = () => { currentPageTujuan--; renderTujuan(currentFilter); }; controlsContainer.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button'); pageBtn.innerText = i; pageBtn.className = 'btn'; pageBtn.style.padding = '6px 12px'; pageBtn.style.backgroundColor = currentPageTujuan === i ? '#27ae60' : '#7f8c8d';
        pageBtn.onclick = () => { currentPageTujuan = i; renderTujuan(currentFilter); }; controlsContainer.appendChild(pageBtn);
    }

    const nextBtn = document.createElement('button'); nextBtn.innerHTML = '→'; nextBtn.className = 'btn'; nextBtn.style.padding = '6px 12px'; nextBtn.style.backgroundColor = currentPageTujuan === totalPages ? '#bdc3c7' : '#2980b9'; nextBtn.disabled = currentPageTujuan === totalPages;
    nextBtn.onclick = () => { currentPageTujuan++; renderTujuan(currentFilter); }; controlsContainer.appendChild(nextBtn);
}

window.hapusTujuan = async function(id) {
    if (confirm('Yakin ingin menghapus referensi tujuan ini?')) {
        try { await fetch('PHP/api_tujuan.php', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id }) }); fetchTujuan(); } catch (error) {}
    }
}