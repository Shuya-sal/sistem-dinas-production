var loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser')) || null;
var myChart = null; 
var currentChartLevel = 'bagian'; 
var cachedBagianLabels = []; 
var cachedBagianData = [];

// Variabel untuk menahan spam request ke server (Debouncing)
var filterTimeout = null;

window.initDashboardSPA = async function() {
    loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser')) || null;
    if (!loggedInUser || !loggedInUser.id) { alert("Sesi Anda berakhir, silakan login ulang."); window.location.href = "index.html"; return; }
    if (loggedInUser.tingkat === 'Staf' || loggedInUser.tingkat === 'Human') { alert("Akses Ditolak: Halaman Dashboard Eksekutif hanya untuk Pimpinan dan Admin."); navigasiSPA('penugasan.html'); return; }

    await setupFilters();
    loadDashboardData();
};

async function setupFilters() {
    const currentYear = new Date().getFullYear();
    const selectTahun = document.getElementById('filterTahun');
    if(!selectTahun) return;
    
    selectTahun.innerHTML = '';
    for (let y = currentYear - 2; y <= currentYear + 1; y++) { 
        let opt = document.createElement('option'); 
        opt.value = y; 
        opt.innerText = y; 
        if(y === currentYear) opt.selected = true; 
        selectTahun.appendChild(opt); 
    }
    document.getElementById('filterBulan').value = String(new Date().getMonth() + 1).padStart(2, '0');

    try {
        const resPegawai = await fetch('PHP/api_pegawai.php?limit=all'); 
        const dataPegawai = await resPegawai.json();
        if (dataPegawai.status === 'success') {
            const pegawais = dataPegawai.data || []; 
            const uniqueBagian = [...new Set(pegawais.map(p => p.bagian).filter(b => b && b.trim() !== ''))].sort();
            
            const selBagian = document.getElementById('filterBagian'); 
            selBagian.innerHTML = '<option value="">Seluruh Bagian Pegawai</option>';
            uniqueBagian.forEach(b => { 
                let opt = document.createElement('option'); 
                opt.value = b; 
                opt.innerText = b; 
                selBagian.appendChild(opt); 
            });
            selBagian.innerHTML += `<option value="Lainnya">Lainnya (Tanpa Bagian)</option>`;
        }
    } catch (e) {}
}

function getFilterText() {
    const selBulan = document.getElementById('filterBulan'); 
    const namaBulan = selBulan.value === "" ? "" : selBulan.options[selBulan.selectedIndex].text + " ";
    const thn = document.getElementById('filterTahun').value; 
    const selBagian = document.getElementById('filterBagian');
    const namaBagian = selBagian.value ? ` - ${selBagian.options[selBagian.selectedIndex].text}` : '';
    return `${namaBulan}${thn}${namaBagian}`;
}

// FUNGSI BARU: Menangkap perubahan filter secara instan tanpa membebani server
window.handleFilterChange = function() {
    // ==========================================
    // KODE PERBAIKAN BUG: RESET GRAFIK DRILL-DOWN
    // ==========================================
    const evt = window.event;
    // Jika ada aktivitas, dan yang diubah adalah dropdown Bulan atau Tahun...
    if (evt && evt.target) {
        if (evt.target.id === 'filterBulan' || evt.target.id === 'filterTahun') {
            // ...maka paksa dropdown Bagian kembali kosong (Seluruh Bagian Pegawai)
            document.getElementById('filterBagian').value = '';
        }
    }
    // ==========================================

    const loadingInd = document.getElementById('loadingIndicator');
    if (loadingInd) loadingInd.style.display = 'inline-block'; // Munculkan text "Memperbarui..."

    // Batalkan eksekusi sebelumnya jika user mengganti filter lagi dengan cepat
    clearTimeout(filterTimeout);
    
    // Tunggu 300ms. Jika user berhenti mengganti filter, baru load data dari server.
    filterTimeout = setTimeout(() => {
        loadDashboardData();
    }, 300);
}

async function loadDashboardData() {
    const bln = document.getElementById('filterBulan').value; 
    const thn = document.getElementById('filterTahun').value; 
    const bgn = document.getElementById('filterBagian').value; 
    const filterText = getFilterText();
    
    document.getElementById('labelStatDinas').innerText = `Total Dinas (${filterText})`; 
    document.getElementById('labelStatAnggaran').innerText = `Total Pengeluaran (${filterText})`; 
    document.getElementById('labelStatPegawai').innerText = bgn ? `Pegawai di Bagian Ini` : `Total Pegawai Terdaftar`;
    
    if (bgn) { 
        document.getElementById('chartTitle').innerText = `Rincian Dinas Pegawai (${filterText})`; 
    } else { 
        document.getElementById('chartTitle').innerText = `Aktivitas Perjalanan Dinas Berdasarkan Bagian (${filterText})`; 
    }

    try {
        const response = await fetch(`PHP/api_dashboard.php?bulan=${bln}&tahun=${thn}&bagian=${encodeURIComponent(bgn)}`); 
        const result = await response.json();
        
        if (result.status === 'success') {
            // Animasi angka untuk visual yang lebih modern
            document.getElementById('statDinas').innerText = result.total_dinas + " Kali"; 
            document.getElementById('statPegawai').innerText = result.total_pegawai + " Orang";
            document.getElementById('statAnggaran').innerText = ('Rp ' + parseFloat(result.total_anggaran).toLocaleString('id-ID'));
            
            if (bgn) {
                currentChartLevel = 'pegawai'; 
                document.getElementById('btnBackChart').style.display = 'none'; 
                document.getElementById('chartHint').style.display = 'none'; 
                renderChart(result.chart.labels, result.chart.data, `Dinas Pegawai`, 'rgba(16, 185, 129, 0.8)', 'rgba(5, 150, 105, 1)');
            } else {
                cachedBagianLabels = result.chart.labels; 
                cachedBagianData = result.chart.data; 
                currentChartLevel = 'bagian';
                document.getElementById('btnBackChart').style.display = 'none'; 
                document.getElementById('chartHint').style.display = 'block';
                renderChart(cachedBagianLabels, cachedBagianData, 'Jumlah Perjalanan Dinas', 'rgba(59, 130, 246, 0.8)', 'rgba(37, 99, 235, 1)');
            }
        }
    } catch (error) {
    } finally {
        const loadingInd = document.getElementById('loadingIndicator');
        if (loadingInd) loadingInd.style.display = 'none'; // Sembunyikan tulisan loading
    }
}

async function loadPegawaiDrilldown(namaBagian) {
    const bln = document.getElementById('filterBulan').value; 
    const thn = document.getElementById('filterTahun').value;
    
    try {
        const response = await fetch(`PHP/api_dashboard.php?bulan=${bln}&tahun=${thn}&bagian=${encodeURIComponent(namaBagian)}`); 
        const result = await response.json();
        if (result.status === 'success') {
            currentChartLevel = 'pegawai'; 
            document.getElementById('btnBackChart').style.display = 'inline-block'; 
            document.getElementById('chartHint').style.display = 'none'; 
            
            const selBulan = document.getElementById('filterBulan');
            const namaBulan = selBulan.value === "" ? "" : selBulan.options[selBulan.selectedIndex].text + " ";
            document.getElementById('chartTitle').innerText = `Rincian Dinas: ${namaBagian} (${namaBulan}${thn})`;
            
            renderChart(result.chart.labels, result.chart.data, `Dinas Pegawai (${namaBagian})`, 'rgba(16, 185, 129, 0.8)', 'rgba(5, 150, 105, 1)');
        }
    } catch (error) {}
}

function restoreMainChart() {
    currentChartLevel = 'bagian'; 
    document.getElementById('btnBackChart').style.display = 'none'; 
    document.getElementById('chartHint').style.display = 'block';
    document.getElementById('chartTitle').innerText = `Aktivitas Perjalanan Dinas Berdasarkan Bagian (${getFilterText()})`;
    renderChart(cachedBagianLabels, cachedBagianData, 'Jumlah Perjalanan Dinas', 'rgba(59, 130, 246, 0.8)', 'rgba(37, 99, 235, 1)');
    
    // Saat menekan back, reset dropdown bagian ke "Seluruh Bagian" tanpa me-reload data jika bulan/tahun tidak berubah
    const selBagian = document.getElementById('filterBagian');
    if (selBagian.value !== '') {
        selBagian.value = '';
    }
}

function renderChart(labelsArray, dataArray, datasetLabel, bgColor, borderColor) {
    const ctx = document.getElementById('dinasChart').getContext('2d');
    if (myChart !== null) { myChart.destroy(); }
    if (labelsArray.length === 0) { labelsArray = ["Belum Ada Data Dinas Pada Waktu Ini"]; dataArray = [0]; }
    
    myChart = new Chart(ctx, {
        type: 'bar',
        data: { 
            labels: labelsArray, 
            datasets: [{ 
                label: datasetLabel, 
                data: dataArray, 
                backgroundColor: bgColor, 
                borderColor: borderColor, 
                borderWidth: 2, 
                borderRadius: 6, 
                hoverBackgroundColor: borderColor, 
                cursor: currentChartLevel === 'bagian' ? 'pointer' : 'default' 
            }] 
        },
        options: { 
            responsive: true, 
            plugins: { legend: { display: false } }, 
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            onClick: async (event, elements, chart) => { 
                if (elements.length > 0 && currentChartLevel === 'bagian') { 
                    const dataIndex = elements[0].index; 
                    const selectedBagian = chart.data.labels[dataIndex]; 
                    if (selectedBagian !== "Belum Ada Data Dinas Pada Waktu Ini") { 
                        // Saat drill-down di klik, ubah otomatis dropdown bagian
                        const selBagian = document.getElementById('filterBagian');
                        for (let i = 0; i < selBagian.options.length; i++) {
                            if (selBagian.options[i].value === selectedBagian) {
                                selBagian.selectedIndex = i;
                                break;
                            }
                        }
                        await loadPegawaiDrilldown(selectedBagian); 
                    } 
                } 
            },
            onHover: (event, chartElement) => { 
                if (currentChartLevel === 'bagian') { 
                    event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default'; 
                } else { 
                    event.native.target.style.cursor = 'default'; 
                } 
            }
        }
    });
}

function openModalKeuangan() {
    let modal = document.getElementById('modalKeuanganDinas');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `<div id="modalKeuanganDinas" class="media-modal" style="display: none; align-items: center; justify-content: center; z-index: 1000;"><div style="background: #fff; padding: 30px; border-radius: 12px; width: 380px; text-align: left; box-shadow: 0 10px 40px rgba(0,0,0,0.2); position: relative;"><h3 style="margin-bottom: 20px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">💰 Rekap Keuangan Bulanan</h3><div style="margin-bottom: 15px;"><label style="font-weight: 600; font-size: 13px; color: #475569; display: block; margin-bottom: 5px;">Bulan</label><select id="keuBulan" class="custom-input"></select></div><div style="margin-bottom: 15px;"><label style="font-weight: 600; font-size: 13px; color: #475569; display: block; margin-bottom: 5px;">Tahun</label><select id="keuTahun" class="custom-input"></select></div><div style="margin-bottom: 25px;"><label style="font-weight: 600; font-size: 13px; color: #475569; display: block; margin-bottom: 5px;">Pilih Bagian (Opsional)</label><select id="keuBagian" class="custom-input"></select></div><div style="display: flex; gap: 10px;"><button id="btnDownloadKeu" class="btn btn-save" style="flex: 1; justify-content: center; background-color: #27ae60;" onclick="downloadLaporanKeuangan()">📥 Unduh Excel</button><button class="btn btn-delete" style="justify-content: center;" onclick="document.getElementById('modalKeuanganDinas').style.display='none'">Batal</button></div></div></div>`);
    }
    document.getElementById('keuBulan').innerHTML = document.getElementById('filterBulan').innerHTML; document.getElementById('keuTahun').innerHTML = document.getElementById('filterTahun').innerHTML; document.getElementById('keuBagian').innerHTML = document.getElementById('filterBagian').innerHTML;
    document.getElementById('keuBulan').value = document.getElementById('filterBulan').value; document.getElementById('keuTahun').value = document.getElementById('filterTahun').value; document.getElementById('keuBagian').value = document.getElementById('filterBagian').value;
    document.getElementById('modalKeuanganDinas').style.display = 'flex';
}

function downloadLaporanKeuangan() {
    const bln = document.getElementById('keuBulan').value; 
    const thn = document.getElementById('keuTahun').value; 
    const bgn = document.getElementById('keuBagian').value;
    const btn = document.getElementById('btnDownloadKeu'); 
    
    const oldText = btn.innerHTML; 
    btn.innerHTML = '⏳ Memproses...'; 
    btn.disabled = true;
    btn.style.backgroundColor = '#95a5a6';

    const url = `PHP/api_penugasan.php?export=keuangan&bulan=${bln}&tahun=${thn}&bagian=${encodeURIComponent(bgn)}`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => { 
        btn.innerHTML = oldText; 
        btn.disabled = false; 
        btn.style.backgroundColor = '#27ae60';
        document.getElementById('modalKeuanganDinas').style.display = 'none';
    }, 2000);
}