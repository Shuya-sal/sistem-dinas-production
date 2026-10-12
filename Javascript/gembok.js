// Interceptor XMLHttpRequest — tambahkan CSRF token ke semua request POST/PUT/PATCH/DELETE
(function() {
    var OriginalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
        var xhr = new OriginalXHR();
        var originalOpen = xhr.open.bind(xhr);
        var originalSend = xhr.send.bind(xhr); // CAPTURE SEBELUM override — bugfix
        var csrfMethods = {POST:1, PUT:1, PATCH:1, DELETE:1};
        xhr.open = function(method, url, async, user, pass) {
            var isMutation = !!csrfMethods[String(method).toUpperCase()];
            var isApi = (typeof url === 'string') && (url.includes('/PHP/') || url.startsWith('PHP/'));
            xhr.send = function(data) {
                if (isMutation && isApi) {
                    var token = sessionStorage.getItem('csrf_token');
                    if (!token) {
                        var m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
                        if (m) { token = decodeURIComponent(m[1]); }
                    }
                    if (token) { xhr.setRequestHeader('X-CSRF-Token', token); }
                }
                return originalSend(data);
            };
            return originalOpen(method, url, async, user, pass);
        };
        return xhr;
    };
})();

// Interceptor fetch (yang sudah ada)
const originalFetch = window.fetch.bind(window);

window.fetch = async function (...args) {
    const resource = args[0];
    const config = args[1] || {};

    let url = '';

    if (typeof resource === 'string') {
        url = resource;
    } else if (
        resource &&
        typeof resource.url === 'string'
    ) {
        url = resource.url;
    }

    const isApiPhp =
        url.includes('/PHP/') ||
        url.startsWith('PHP/');

    let method = 'GET';

    if (config.method) {
        method = String(config.method).toUpperCase();
    } else if (
        resource &&
        resource.method
    ) {
        method = String(
            resource.method
        ).toUpperCase();
    }

    const isMutation =
        method === 'POST' ||
        method === 'PUT' ||
        method === 'PATCH' ||
        method === 'DELETE';

    if (isApiPhp && isMutation) {
        let csrfToken = sessionStorage.getItem('csrf_token');
        if (!csrfToken) {
            const cookieMatch = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
            if (cookieMatch) {
                csrfToken = decodeURIComponent(cookieMatch[1]);
                sessionStorage.setItem('csrf_token', csrfToken);
            }
        }

        if (csrfToken) {
            const headers =
                new Headers(
                    config.headers ||
                    (
                        resource &&
                        resource.headers
                    ) ||
                    {}
                );

            headers.set(
                'X-CSRF-Token',
                csrfToken
            );

            config.headers = headers;
            args[1] = config;
        }
    }

    const response = await originalFetch(...args);

    if (response.status === 401 && isApiPhp && !url.includes('api_login.php') && !url.includes('ping.php')) {
        sessionStorage.removeItem('loggedInUser');
        sessionStorage.removeItem('csrf_token');
        if (!window.location.pathname.includes('index.html')) {
            alert('Sesi Anda telah berakhir. Silakan login kembali.');
            window.location.href = 'index.html';
        }
    }

    return response;
};

var loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser')) || null;

// ==========================================
// 1. UTILITAS DESAIN (AVATAR & BADGE PANGKAT)
// ==========================================
window.getBadgeHTML = function(exp) {
    exp = parseInt(exp) || 0;
    if (exp >= 1000) { return `<span class="badge-level badge-suhu" title="EXP: ${exp}">👑 Suhu Tongkrongan</span>`; }
    if (exp >= 500) { return `<span class="badge-level badge-butterfly" title="EXP: ${exp}">Social Butterfly</span>`; }
    if (exp >= 200) { return `<span class="badge-level badge-life" title="EXP: ${exp}">🎉 Life of the Party</span>`; }
    if (exp >= 100) { return `<span class="badge-level badge-moodmaker" title="EXP: ${exp}">😎 Moodmaker</span>`; }
    if (exp >= 30) { return `<span class="badge-level badge-pencair" title="EXP: ${exp}">✨ Pencair Suasana</span>`; }
    if (exp >= 10) { return `<span class="badge-level badge-newbie" title="EXP: ${exp}">🌱 Newbie</span>`; }
    return ``;
}

window.getRoleBadgeHTML = function(tingkat) {
    if (!tingkat) return '';
    if (tingkat === 'God Creator') return ` <span class="badge-god">God Creator</span>`;
    if (tingkat === 'Super Admin') return ` <span class="badge-admin">Super Admin</span>`;
    if (tingkat === 'Pengguna Anggaran') return ` <span class="badge-pa">Pengguna Anggaran</span>`;
    if (tingkat === 'Staf') return ` <span class="badge-staf">Staf</span>`;
    return ` <span class="badge-staf">${tingkat}</span>`; 
}

window.getAvatarWidget = function(foto, frame, size = '40px', margin = '0', id = '') {
    const imgSrc = foto || 'Image/default.jpg';
    const idAttr = id ? `id="${id}"` : '';
    if (!frame) {
        return `<img src="${imgSrc}" ${idAttr} class="top-profile-img" loading="lazy" style="width: ${size}; height: ${size}; border-radius: 50%; object-fit: cover; margin: ${margin}; cursor: pointer; flex-shrink: 0;" onerror="this.src='Image/default.jpg'">`;
    }
    return `<div ${idAttr} style="position: relative; width: ${size}; height: ${size}; margin: ${margin}; display: inline-block; cursor: pointer; flex-shrink: 0;"><img src="${imgSrc}" loading="lazy" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.src='Image/default.jpg'"><img src="${frame}" loading="lazy" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 125%; height: 125%; pointer-events: none; z-index: 2;"></div>`;
}

// ==========================================
// 2. SISTEM TOP BAR & PING ONLINE
// ==========================================
window.updateTopBarUI = function() {
    if (!loggedInUser) return;
    
    const topPicEl = document.getElementById('topProfilePic');
    if (topPicEl) { topPicEl.outerHTML = window.getAvatarWidget(loggedInUser.foto, loggedInUser.frame, '40px', '0', 'topProfilePic'); }

    const topName = document.getElementById('topProfileName');
    if (topName) {
        let roleBadgeHTML = window.getRoleBadgeHTML ? window.getRoleBadgeHTML(loggedInUser.tingkat) : '';
        let customTagsHTML = window.getCustomTagsHTML ? window.getCustomTagsHTML(loggedInUser.is_donatur, loggedInUser.is_sangean) : ''; 
        topName.innerHTML = `<a href="javascript:void(0)" onclick="navigasiSPA('profile.html?user=${encodeURIComponent(loggedInUser.nama)}')" style="color:inherit; text-decoration:none; font-weight:bold;">${loggedInUser.nama}</a> ${window.getBadgeHTML(loggedInUser.exp)}${roleBadgeHTML} ${customTagsHTML}`;
        }
    
    const topRole = document.getElementById('topProfileRole');
    if (topRole) { topRole.style.display = 'none'; }
}

window.pingOnlineStatus = async function() {
    if (!loggedInUser || !loggedInUser.id) return;
    try {
        const response = await fetch('PHP/api_pegawai.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'ping_online', id: loggedInUser.id }) });
        const result = await response.json();
        
        if (result.status === 'success') {
            const countText = document.getElementById('onlineCountText');
            if (countText) countText.innerText = result.online_count + " Pengguna Online";
            
            if (result.exp !== undefined && parseInt(result.exp) !== parseInt(loggedInUser.exp)) {
                loggedInUser.exp = parseInt(result.exp);
                sessionStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
                updateTopBarUI(); 
            }
        }
    } catch (error) {}
}

if (loggedInUser) {
    pingOnlineStatus();
    setInterval(pingOnlineStatus, 300000);
}

// ==========================================
// 3. SISTEM NOTIFIKASI & LOGOUT
// ==========================================
window.disconnectRealtimeClient = function() {
    if (window.realtimeFallbackTimer) {
        clearInterval(window.realtimeFallbackTimer);
        window.realtimeFallbackTimer = null;
    }
    if (window.pusherInstance) {
        window.pusherInstance.disconnect();
        window.pusherInstance = null;
    }
};

window.addEventListener('storage', function(event) {
    if (event.key !== 'sidina_logout_event' || !event.newValue) return;
    disconnectRealtimeClient();
    sessionStorage.removeItem('loggedInUser');
    sessionStorage.removeItem('csrf_token');
    if (!window.location.pathname.endsWith('/index.html') && window.location.pathname !== '/') {
        window.location.replace('index.html');
    }
});

window.logoutSistem = async function() {
    // Panggil Custom Popup Konfirmasi
    const isConf = await showCustomConfirm(
        "Apakah Anda yakin ingin keluar dari sesi saat ini?", 
        "Konfirmasi Keluar", 
        "🚪", 
        "#e74c3c", // Warna merah tombol
        "#fee2e2"  // Warna merah muda background ikon
    );
    
    // Jika user menekan tombol "Ya, Lanjutkan"
    if (isConf) {
    try {
        await fetch(
            'PHP/api_logout.php',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    } catch (error) {
        console.warn(
            'Logout server gagal:',
            error
        );
    } finally {
        disconnectRealtimeClient();
        try {
            localStorage.setItem('sidina_logout_event', String(Date.now()));
        } catch (error) {}
        sessionStorage.removeItem('loggedInUser');
        sessionStorage.removeItem('csrf_token');

        window.location.href = 'index.html';
    }
}
}

window.tandaiLoncengSudahDibuka = function() {
    const dataNotif = Array.isArray(
        window.notifikasiLoncengData
    )
        ? window.notifikasiLoncengData
        : [];

    const kunciTerlihat = dataNotif
        .map(function(notif) {
            return typeof window.getKunciNotifikasi ===
                'function'
                ? window.getKunciNotifikasi(notif)
                : '';
        })
        .filter(Boolean);

    sessionStorage.setItem(
        'notifSeenKeys',
        JSON.stringify(kunciTerlihat)
    );

    sessionStorage.setItem(
        'notifCount',
        '0'
    );

    const badge =
        document.getElementById('notifBadge');

    if (badge) {
        badge.innerText = '0';
        badge.style.display = 'none';
    }
};

window.tandaiSemuaForumSudahDibaca = async function() {
    const dataNotif = Array.isArray(window.notifikasiLoncengData) ? window.notifikasiLoncengData : [];
    const forumIds = [];
    dataNotif.forEach(function(notif) {
        const jenis = notif ? (notif.jenis_notif || notif.type || '') : '';
        const commentId = notif ? String(notif.comment_id || '') : '';
        if ((jenis === 'mention' || jenis === 'post_reply' || jenis === 'forum') && commentId !== '') forumIds.push(commentId);
    });
    for (const commentId of Array.from(new Set(forumIds))) {
        try {
            await fetch('PHP/api_forum.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({action: 'read_notif', comment_id: commentId})
            });
        } catch (error) {}
    }
    try {
        await fetch('PHP/api_forum.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'mark_all_notif_read'})
        });
    } catch (error) {}
    window.notifikasiLoncengData = [];
    window.tandaiLoncengSudahDibuka();
    if (typeof cekNotifikasiLonceng === 'function') setTimeout(cekNotifikasiLonceng, 400);
};

window.toggleNotifikasi = function(event) {
    event.stopPropagation();

    const menu =
        document.getElementById('notifMenu');

    if (!menu) return;

    const akanDibuka =
        menu.style.display === 'none';

    menu.style.display =
        akanDibuka ? 'block' : 'none';

    /*
     * Membuka lonceng hanya menghilangkan
     * angka merah. Isi pemberitahuan tidak
     * ditandai sudah dibaca.
     */
    if (akanDibuka) {
        window.tandaiLoncengSudahDibuka();
        if (typeof window.tandaiSemuaForumSudahDibaca === 'function') {
            window.tandaiSemuaForumSudahDibaca();
        }
    }
};

// ==========================================
// 4. MESIN ROUTER SPA UTAMA
// ==========================================
window.navigasiSPA = async function(url, menuElement = null) {
    if (menuElement) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        menuElement.classList.add('active');
    }

    const contentArea = document.getElementById('spa-content');
    contentArea.style.animation = 'none';
    contentArea.offsetHeight;

    contentArea.innerHTML = '<div style="text-align:center; padding:50px; color:#64748b;"><span class="spinner"></span> Mengambil data halaman...</div>';

    try {
        const res = await fetch(url);
        const htmlText = await res.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const container = doc.querySelector('.container');
        
        if(!container) throw new Error("Container HTML Halaman Tidak Ditemukan!");

        const elementsToInject = Array.from(container.children).filter(el => 
            !el.classList.contains('top-bar') && 
            !el.classList.contains('nav-menu') &&
            el.id !== 'printTemplate'
        );

        contentArea.innerHTML = ''; 
        elementsToInject.forEach(el => contentArea.appendChild(el));

        contentArea.style.animation = 'fadeIn 0.3s ease-in-out';

        let viewName = url.split('?')[0].replace('.html', '');
        let queryParams = url.split('?')[1] ? '&' + url.split('?')[1] : '';
        window.history.pushState({path: url}, '', `app.html?view=${viewName}${queryParams}`);

        if (!url.includes('profile')) {
            if (loggedInUser && typeof applyGlobalBackground === 'function') { applyGlobalBackground(loggedInUser.background_page); }
        }

        if (url.includes('dashboard') && typeof initDashboardSPA === 'function') initDashboardSPA();
        else if (url.includes('pegawai') && typeof initPegawaiSPA === 'function') initPegawaiSPA();
        else if (url.includes('tujuan') && typeof initTujuanSPA === 'function') initTujuanSPA();
        else if (url.includes('penugasan') && typeof initPenugasanSPA === 'function') initPenugasanSPA();
        else if (url.includes('forum') && typeof initForumSPA === 'function') initForumSPA();
        else if (url.includes('profile') && typeof initProfileSPA === 'function') initProfileSPA();

    } catch (e) {
        contentArea.innerHTML = '<div style="text-align:center; padding:50px; color:#e74c3c;">❌ Gagal memuat komponen halaman.</div>';
    }
}

window.addEventListener('popstate', function(event) {
    if(event.state && event.state.path) {
        const baseView = event.state.path.split('?')[0];
        const targetBtn = document.querySelector(`.nav-btn[data-target="${baseView}"]`);
        navigasiSPA(event.state.path, targetBtn);
    }
});

// =========================================================================
// KODE PERBAIKAN: SATPAM GLOBAL (ANTI-BYPASS URL LANGSUNG)
// Fungsi ini berjalan seketika saat file JS dimuat, bahkan sebelum HTML selesai digambar.
// =========================================================================
(function cekKeamananGlobal() {
    const userSession = sessionStorage.getItem('loggedInUser');
    const currentPath = window.location.pathname.toLowerCase();

    // Daftar halaman yang boleh diakses tanpa login (Halaman Publik)
    const isPublicPage = currentPath.includes('index.html') || currentPath.includes('maintenance.html') || currentPath.endsWith('/') || currentPath.endsWith('/sistem_dinas/');

    if (!userSession) {
        // JIKA TIDAK ADA SESI: Dan user mencoba membuka halaman selain index/maintenance
        if (!isPublicPage) {
            // Tanpa sesi client, cukup arahkan ke login. Logout server hanya menerima POST+CSRF.
            window.location.replace('index.html');
        }
    } else {
        // JIKA ADA SESI: Tapi user mencoba mengetik manual file HTML mentah (misal: forum.html)
        if (!isPublicPage && !currentPath.includes('app.html')) {
            // Ambil nama file (misal "forum" dari "forum.html")
            let fileName = currentPath.split('/').pop().replace('.html', '');
            
            // Redirect ke format SPA yang benar (app.html?view=forum)
            if (fileName && fileName !== 'app' && fileName !== 'index') {
                const searchParams = window.location.search; // Bawa parameter tambahan jika ada (misal ?user=...)
                window.location.replace(`app.html?view=${fileName}${searchParams.replace('?', '&')}`);
            }
        }
    }
})();

// =========================================================================
// INISIALISASI SUPER APP SPA
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Logika ini HANYA boleh berjalan jika berada di dalam kerangka app.html
    if (window.location.pathname.includes('app.html')) {
        
        if (!sessionStorage.getItem('loggedInUser')) return; // Sudah dicegat oleh Satpam Global di atas

        loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));
        
        if (typeof applyGlobalBackground === 'function') applyGlobalBackground(loggedInUser.background_page);

        // Sembunyikan Dashboard jika levelnya Staf
        if (loggedInUser && (loggedInUser.tingkat === 'Staf' || loggedInUser.tingkat === 'Human')) {
            const btnDashboard = document.querySelector('.nav-btn[data-target="dashboard.html"]');
            if (btnDashboard) btnDashboard.style.display = 'none';
        }

        updateTopBarUI();
        
        const params = new URLSearchParams(window.location.search);
        let view = params.get('view');
        
        // Pengecekan view default
        if ((!view || view === 'dashboard') && (loggedInUser.tingkat === 'Staf' || loggedInUser.tingkat === 'Human')) { 
            view = 'penugasan'; 
        } else if (!view) { 
            view = 'dashboard'; 
        }
        
        const userParam = params.get('user') ? `?user=${encodeURIComponent(params.get('user'))}` : '';
        const targetUrl = view + '.html' + userParam;
        
        let targetBtn = document.querySelector(`.nav-btn[data-target="${view}.html"]`);
        if (!targetBtn) targetBtn = document.querySelector('.nav-btn:not([style*="display: none"])'); 
        
        // Render halaman ke dalam wadah SPA
        navigasiSPA(targetUrl, targetBtn);
        window.sinkronisasiOnline = async function() {
            try {
                const res = await fetch('PHP/ping.php');
                const data = await res.json();
                if (data.status === 'success') {
                    if (data.csrf_token && !sessionStorage.getItem('csrf_token')) {
                        sessionStorage.setItem('csrf_token', data.csrf_token);
                    }
                    const countText = document.getElementById('onlineCountText');
                    if (countText) {
                        countText.innerHTML = ` ${data.online_count} Pengguna Online`;
                    }
                }
            } catch (e) {}
        };
        
        // 1. Panggil seketika saat aplikasi baru dibuka (Timpa teks bawaan)
        sinkronisasiOnline();
        
        // 2. Berdetak terus setiap 2 menit (120000 milidetik) agar tidak disangka Offline
        setInterval(sinkronisasiOnline, 120000);
    }
});

// ==========================================
// 5. FUNGSI UTILITAS GLOBAL MEDIA (SLIDER/GALLERY FIX)
// ==========================================
window.currentMediaGroup = [];
window.currentMediaIndex = 0;

window.openProfilePhotoModal = function(src) {
    const modal = document.getElementById('mediaModal');
    if (!modal) return;

    const tmpA = document.createElement('a');
    tmpA.href = src || 'Image/default.jpg';
    const absoluteSrc = tmpA.href;

    window.currentMediaGroup = [absoluteSrc];
    window.currentMediaIndex = 0;
    renderMediaModalContent('image');
    modal.style.display = 'flex';
    modal.focus();
};

window.openMediaModal = function(src, type) {
    const modal = document.getElementById('mediaModal');
    
    window.currentMediaGroup = [];
    window.currentMediaIndex = 0;

    const tmpA = document.createElement('a');
    tmpA.href = src;
    const absoluteSrc = tmpA.href;

    // LOGIKA KEKUASAAN (SCOPE PINTAR)
    let searchContainer = document;
    if (window.event && window.event.target) {
        const targetEl = window.event.target;
        if (targetEl.closest('#chatMessagesList')) {
            searchContainer = document.getElementById('chatMessagesList');
        } else if (targetEl.closest('.post-card')) {
            searchContainer = targetEl.closest('.post-card');
        } else if (targetEl.closest('.profile-photo-grid') || targetEl.closest('#tab-foto')) {
            searchContainer = targetEl.closest('.profile-photo-grid') || document.getElementById('tab-foto');
        }
    }

    // KUMPULKAN FOTO
    if (searchContainer && type === 'image') {
        const allImgs = searchContainer.querySelectorAll('img');
        
        allImgs.forEach(img => {
            let pathStr = img.src; 
            const isVisible = img.offsetParent !== null;

            if (isVisible && pathStr && !pathStr.includes('default.jpg') && !pathStr.includes('logo') && !pathStr.includes('stiker_')) {
                if (!img.closest('.post-header') && !img.closest('.comment-author') && !img.closest('.comment-input-area') && !img.closest('.vip-user-info') && !img.closest('.chat-contact-item')) {
                    if (!window.currentMediaGroup.includes(pathStr)) {
                        window.currentMediaGroup.push(pathStr);
                    }
                }
            }
        });
        
        window.currentMediaIndex = window.currentMediaGroup.findIndex(url => url === absoluteSrc || url.includes(src) || absoluteSrc.includes(url));
        if (window.currentMediaIndex === -1) {
            window.currentMediaGroup = [absoluteSrc];
            window.currentMediaIndex = 0;
        }
    } else {
        window.currentMediaGroup = [absoluteSrc];
        window.currentMediaIndex = 0;
    }

    // SUNTIKAN CSS ANTI GARIS HITAM
    if (!document.getElementById('mediaModalStyleFix')) {
        const styleFix = document.createElement('style');
        styleFix.id = 'mediaModalStyleFix';
        styleFix.innerHTML = `
            .nav-media-btn { outline: none !important; border: none !important; -webkit-tap-highlight-color: transparent; }
            .nav-media-btn:focus { outline: none !important; background: rgba(0,0,0,0.8) !important; }
            .media-modal-content { outline: none !important; border: none !important; user-select: none; }
        `;
        document.head.appendChild(styleFix);
    }

    renderMediaModalContent(type);
    modal.style.display = 'flex';
    modal.focus(); // Buang fokus klik agar garis hitam lenyap seketika
}

window.renderMediaModalContent = function(type) {
    const wrapper = document.getElementById('modalContentWrapper');
    let src = window.currentMediaGroup[window.currentMediaIndex];
    
    let navHtml = '';
    if (window.currentMediaGroup.length > 1) {
        navHtml = `
            <button class="nav-media-btn left" style="position:absolute; left:20px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.5); color:white; border:none; padding:15px; cursor:pointer; font-size:24px; border-radius:50%; z-index:10002; transition:0.2s;" onclick="navMediaModal(-1, event)">&#10094;</button>
            <button class="nav-media-btn right" style="position:absolute; right:20px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.5); color:white; border:none; padding:15px; cursor:pointer; font-size:24px; border-radius:50%; z-index:10002; transition:0.2s;" onclick="navMediaModal(1, event)">&#10095;</button>
            <div style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); color: white; font-weight: bold; background: rgba(0,0,0,0.6); padding: 4px 14px; border-radius: 12px; font-size: 13px; z-index: 10001; text-shadow: 0 1px 2px rgba(0,0,0,0.5); pointer-events: none; border: 1px solid rgba(255,255,255,0.1);">
                ${window.currentMediaIndex + 1} / ${window.currentMediaGroup.length}
            </div>
        `;
    }

    if (type === 'video') { 
        wrapper.innerHTML = `<video src="${src}" controls autoplay class="media-modal-content" style="max-width:90vw; max-height:85vh; border-radius:8px; outline:none;"></video>`; 
    } else { 
        wrapper.innerHTML = `<img src="${src}" class="media-modal-content" style="max-width:90vw; max-height:85vh; object-fit:contain; border-radius:8px; outline:none; animation: popInMedia 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">${navHtml}`; 
    }
}

window.navMediaModal = function(step, event) {
    if(event) { event.stopPropagation(); event.preventDefault(); }
    window.currentMediaIndex += step;
    if (window.currentMediaIndex < 0) window.currentMediaIndex = window.currentMediaGroup.length - 1;
    if (window.currentMediaIndex >= window.currentMediaGroup.length) window.currentMediaIndex = 0;
    renderMediaModalContent('image');
}

window.closeMediaModal = function() {
    document.getElementById('mediaModal').style.display = 'none';
    document.getElementById('modalContentWrapper').innerHTML = '';
    window.currentMediaGroup = [];
}

// PEMBERSIHAN HANTU: Hapus pendengar event lama agar tombol tidak melompat 4x
if (window.mediaKeydownListener) {
    document.removeEventListener('keydown', window.mediaKeydownListener);
    window.removeEventListener('keydown', window.mediaKeydownListener, true);
}

window.mediaKeydownListener = function(event) {
    const modal = document.getElementById('mediaModal');
    if (modal && modal.style.display === 'flex') {
        if (event.key === 'Escape' || event.keyCode === 27) {
            window.closeMediaModal();
            return;
        }
        if (window.currentMediaGroup && window.currentMediaGroup.length > 1) {
            if (event.key === 'ArrowLeft' || event.keyCode === 37) {
                window.navMediaModal(-1);
            } else if (event.key === 'ArrowRight' || event.keyCode === 39) {
                window.navMediaModal(1);
            }
        }
    }
};

// Pasang 1 pendengar sensor keyboard murni
window.addEventListener('keydown', window.mediaKeydownListener, true);

window.generateVideoEmbed = function(url) {
    if (!url) return ''; 
    let embedUrl = url;
    if (url.includes('youtube.com/watch?v=')) {
        embedUrl = url.replace('watch?v=', 'embed/');
        embedUrl = embedUrl.split('&')[0];
        return `<iframe width="100%" height="315" src="${embedUrl}" frameborder="0" allowfullscreen loading="lazy" style="border-radius:8px; margin-bottom:15px; border:1px solid #ddd;"></iframe>`;
    } else if (url.includes('youtu.be/')) {
        embedUrl = url.replace('youtu.be/', 'youtube.com/embed/');
        embedUrl = embedUrl.split('?')[0];
        return `<iframe width="100%" height="315" src="${embedUrl}" frameborder="0" allowfullscreen loading="lazy" style="border-radius:8px; margin-bottom:15px; border:1px solid #ddd;"></iframe>`;
    } else if (url.match(/\.(mp4|webm|ogg)$/i)) {
        return `<video src="${url}" controls preload="metadata" style="width:100%; border-radius:8px; margin-bottom:15px; background:black;"></video>`;
    } else {
        return `<div style="margin-bottom:15px; padding:10px; background:#e8f4f8; border-radius:8px; font-size:13px;"><a href="${url}" target="_blank" style="color:#2980b9; font-weight:bold; text-decoration:none;">🎥 Buka Lampiran Video</a></div>`;
    }
}

window.formatMentionText = function(text, users) {
    if (!text) return '';

    const mentionStyle = "background: rgba(59, 130, 246, 0.15); color: rgb(29, 78, 216); font-weight: 800; padding: 2px 8px; border-radius: 12px; display: inline-block; box-shadow: 0 1px 2px rgba(59,130,246,0.05); cursor: pointer; transition: 0.2s; white-space: nowrap; font-size: 0.95em;";
    const makeMention = (name, clickable = true) => {
        const safeAttrName = String(name).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeTextName = String(name).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const clickHandler = clickable
            ? ` onclick="if(window.navigasiSPA) window.navigasiSPA('profile.html?user=${encodeURIComponent(name)}')"`
            : '';
        return `<span data-mention-name="${safeAttrName}" style="${mentionStyle}" onmouseover="this.style.background='rgba(59, 130, 246, 0.25)'" onmouseout="this.style.background='rgba(59, 130, 246, 0.15)'"${clickHandler}>@${safeTextName}</span>`;
    };

    let processedText = text;
    const placeholders = [];
    const knownUsers = Array.isArray(users)
        ? [...users].filter(u => u && u.nama).sort((a, b) => b.nama.length - a.nama.length)
        : [];

    knownUsers.forEach(u => {
        const safeName = u.nama.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const mentionRegex = new RegExp(`(^|[\\s\\n.,!?])@${safeName}(?=[\\s\\n.,!?]|$)`, 'gi');
        processedText = processedText.replace(mentionRegex, (match, prefix) => {
            const token = `\u0001MENTION_${placeholders.length}\u0002`;
            placeholders.push(makeMention(u.nama, true));
            return prefix + token;
        });
    });

    // Mention yang tidak ada di daftar tetap ditampilkan, tetapi tidak diarahkan ke profil palsu.
    processedText = processedText.replace(/(^|[\s\n.,!?])@([a-zA-Z0-9_]+)/g, (match, prefix, name) => prefix + makeMention(name, false));
    processedText = processedText.replace(/\u0001MENTION_(\d+)\u0002/g, (match, index) => placeholders[Number(index)] || match);
    return processedText;
};
// END FORMAT MENTION TEXT

window.formatPesanChat = function(text) {
    if (!text) return ''; 
    
    // 1. Format mention satu kali agar nama lengkap tidak dipotong atau dibungkus ulang.
    let users = window.forumUsersList;
    if (!users || users.length === 0) {
        try { users = JSON.parse(sessionStorage.getItem('forumUsersListV2')) || []; } catch(e) { users = []; }
    }
    let processedText = window.formatMentionText(text, users);

    // 2. KODE PERBAIKAN: Hashtag juga pakai rgb()
    processedText = processedText.replace(/(^|[\s\n.,!?])#([a-zA-Z0-9_]+)/g, `$1<span onclick="if(window.filterByHashtag) window.filterByHashtag('$2')" style="color: rgb(59, 130, 246); font-weight: bold; cursor: pointer;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">#$2</span>`);

    // 3. Regex Pendeteksi Link Gambar / Stiker
    const urlRegex = /(https?:\/\/[^\s<]+|Uploads\/[^\s<]+|Users\/Image\/[^\s<]+)/g;
    
    return processedText.replace(urlRegex, function(url) {
        let cleanUrl = url.replace(/[.,);\]\/]+$/, ''); 
        let sisaTeks = url.substring(cleanUrl.length);
        let finalUrl = cleanUrl;
        
        if (cleanUrl.includes('Uploads/')) finalUrl = cleanUrl.substring(cleanUrl.indexOf('Uploads/'));
        else if (cleanUrl.includes('Users/Image/')) finalUrl = cleanUrl.substring(cleanUrl.indexOf('Users/Image/'));
        
        // 1. UKURAN STIKER DIPERBESAR
        if (finalUrl.includes('Uploads/stiker_') || finalUrl.includes('Users/Image/stiker_')) {
            return `<div style="margin-top: 4px; margin-bottom: 4px;"><img src="${finalUrl}" alt="Stiker" loading="lazy" style="width: 150px !important; height: 150px !important; max-width: 100% !important; object-fit: contain !important; border-radius: 8px !important; background-color: transparent !important; cursor: pointer; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.15));" onerror="this.onerror=null; this.src='Image/default.jpg';" onclick="if(window.bukaOpsiStiker) window.bukaOpsiStiker(event, this, '${finalUrl}')"></div>` + sisaTeks.replace(/^\s+/, '');
        }
        
        // 2. DETEKSI VIDEO YOUTUBE
        if (finalUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)/i)) {
            let videoId = "";
            if (finalUrl.includes('youtube.com/watch?v=')) videoId = finalUrl.split('v=')[1].split('&')[0];
            else if (finalUrl.includes('youtu.be/')) videoId = finalUrl.split('youtu.be/')[1].split('?')[0];
            if (videoId) return `<div style="margin-top: 4px; margin-bottom: 4px;"><iframe width="100%" height="200" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen loading="lazy" style="border-radius: 8px; border: 1px solid rgb(203, 213, 225);"></iframe></div>` + sisaTeks.replace(/^\s+/, ''); 
        }
        
        // 3. DESAIN FOTO BIASA
        if (finalUrl.match(/\.(jpeg|jpg|gif|png|webp)(?:\?|#|$)/i)) {
            return `<div style="margin-top: 4px; margin-bottom: 4px;"><a href="${finalUrl}" target="_blank" onclick="event.preventDefault(); if(window.openMediaModal) window.openMediaModal('${finalUrl}', 'image')"><img src="${finalUrl}" alt="Lampiran" loading="lazy" style="width: 100% !important; max-width: 400px !important; height: auto !important; max-height: 350px !important; border-radius: 8px !important; border: 1px solid rgb(203, 213, 225); object-fit: cover; cursor: zoom-in;" onerror="this.onerror=null; this.src='Image/default.jpg';"></a></div>` + sisaTeks.replace(/^\s+/, '');
        }
        
        // 4. PREVIEW LINK BIASA
        return `<a href="${finalUrl}" target="_blank" style="color: rgb(59, 130, 246); text-decoration: underline; font-weight: 600;">${cleanUrl}</a><div class="link-preview-container" data-url="${finalUrl.replace(/"/g, '&quot;')}"></div>` + sisaTeks;
    });
}

window.escapeHTML = function(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, function(tag) {
        const chars = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
        return chars[tag] || tag;
    });
}

window.loadLinkPreviews = async function() {
    const previewContainers = document.querySelectorAll('.link-preview-container:not(.loaded)');
    for (let container of previewContainers) {
        container.classList.add('loaded'); 
        const url = container.getAttribute('data-url');
        try {
            const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`); 
            const json = await res.json();
            if (json.contents) {
                const parser = new DOMParser(); 
                const doc = parser.parseFromString(json.contents, "text/html");
                let title = doc.querySelector('meta[property="og:title"]')?.content || doc.querySelector('title')?.innerText || url;
                let desc = doc.querySelector('meta[property="og:description"]')?.content || doc.querySelector('meta[name="description"]')?.content || '';
                const image = doc.querySelector('meta[property="og:image"]')?.content || doc.querySelector('meta[name="twitter:image"]')?.content || '';
                
                if (desc.length > 75) desc = desc.substring(0, 75) + '...';
                
                title = escapeHTML(title);
                desc = escapeHTML(desc);

                if (image) {
                    container.innerHTML = `<a href="${url}" target="_blank" style="display: flex; text-decoration: none; color: #334155; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #fff; margin-top: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: 0.2s;"><img src="${escapeHTML(image)}" style="width: 85px; height: 85px; object-fit: cover; border-right: 1px solid #cbd5e1;" onerror="this.style.display='none'"><div style="padding: 10px; display: flex; flex-direction: column; justify-content: center; overflow: hidden; flex: 1;"><div style="font-weight: 700; font-size: 12px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</div><div style="font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.3;">${desc}</div></div></a>`;
                }
            }
        } catch (e) {}
    }
}


// =============================================================
// UPLOAD PROGRESS BAR UTILITY (canonical - loaded on every page)
// =============================================================
(function() {
    var _pStyleInjected = false;
    function _injectCSS() {
        if (_pStyleInjected) return;
        _pStyleInjected = true;
        var s = document.createElement('style');
        s.id = 'sisdin-upload-progress-css';
        s.textContent = "\n" +
            ".up-progress-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15,23,42,0.55); backdrop-filter: blur(4px); z-index: 99998; display: flex; align-items: center; justify-content: center; }\n" +
            ".up-progress-card { background: white; border-radius: 16px; padding: 28px 32px; min-width: 320px; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); text-align: center; }\n" +
            ".up-progress-title { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 20px; }\n" +
            ".up-progress-bar-wrap { background: #e2e8f0; border-radius: 999px; height: 14px; overflow: hidden; margin-bottom: 10px; }\n" +
            ".up-progress-bar { height: 100%; background: linear-gradient(90deg, #3b82f6, #06b6d4); border-radius: 999px; transition: width 0.15s ease; width: 0%; }\n" +
            ".up-progress-pct { font-size: 14px; font-weight: 700; color: #475569; margin-bottom: 4px; }\n" +
            ".up-progress-sub { font-size: 12px; color: #94a3b8; }\n" +
            ".up-progress-check { font-size: 48px; margin-bottom: 12px; }\n";
        document.head.appendChild(s);
    }
    var _overlay = null, _bar = null, _pct = null, _sub = null;
    var _safetyTimer = null;
    window.uploadProgressShow = function(title) {
        _injectCSS();
        window.uploadProgressHide();          // buang overlay lama + timer lama
        _overlay = document.createElement('div');
        _overlay.className = 'up-progress-overlay';
        _overlay.innerHTML = '<div class="up-progress-card"><div class="up-progress-title">' + (title || 'Mengunggah...') + '</div><div class="up-progress-pct" id="upProgPct">0%</div><div class="up-progress-bar-wrap"><div class="up-progress-bar" id="upProgBar"></div></div><div class="up-progress-sub" id="upProgSub">Memproses...</div></div>';
        document.body.appendChild(_overlay);
        _bar = document.getElementById('upProgBar');
        _pct = document.getElementById('upProgPct');
        _sub = document.getElementById('upProgSub');
        // JARING PENGAMAN: overlay TIDAK BOLEH memblokir UI selamanya.
        if (_safetyTimer) clearTimeout(_safetyTimer);
        _safetyTimer = setTimeout(function() { window.uploadProgressHide(); }, 120000);
    };
    window.uploadProgressSet = function(pct, sub) {
        if (!_bar) return;
        var v = Math.min(100, Math.max(0, Math.round(pct)));
        _bar.style.width = v + '%';
        _pct.textContent = v + '%';
        if (sub !== undefined) _sub.textContent = sub;
    };
    window.uploadProgressDone = function(msg, success) {
        if (!_overlay) return;
        var card = _overlay.querySelector('.up-progress-card');
        card.innerHTML = '<div class="up-progress-check">' + (success ? '\u2705' : '\u274C') + '</div><div class="up-progress-title">' + (msg || (success ? 'Berhasil!' : 'Gagal!')) + '</div>';
        setTimeout(function() { if (_overlay) { _overlay.remove(); _overlay = null; } }, success ? 1800 : 2800);
    };
    window.uploadProgressHide = function() {
        if (_safetyTimer) { clearTimeout(_safetyTimer); _safetyTimer = null; }
        if (_overlay && _overlay.parentNode) { _overlay.parentNode.removeChild(_overlay); }
        _overlay = null; _bar = null; _pct = null; _sub = null;
        // bersihkan sisa overlay apa pun (jaga-jaga kalau ada duplikat)
        var strays = document.querySelectorAll('.up-progress-overlay');
        for (var i = 0; i < strays.length; i++) { strays[i].parentNode.removeChild(strays[i]); }
    };

    // Promise helper: upload FormData dgn progress bar, resolve dgn JSON hasil.
    window.uploadWithProgress = function(url, formData, title) {
        return new Promise(function(resolve, reject) {
            window.uploadProgressShow(title);
            var xhr = new XMLHttpRequest();
            xhr.upload.addEventListener('progress', function(e) {
                if (e.lengthComputable) {
                    window.uploadProgressSet((e.loaded / e.total) * 100, Math.round(e.loaded/1024) + ' / ' + Math.round(e.total/1024) + ' KB');
                }
            });
            xhr.addEventListener('load', function() {
                try { resolve(JSON.parse(xhr.responseText)); }
                catch (err) { reject(new Error('Respons server tidak valid.')); }
            });
            xhr.addEventListener('error', function() { reject(new Error('Gagal koneksi ke server.')); });
            xhr.addEventListener('abort', function() { window.uploadProgressHide(); reject(new Error('Upload dibatalkan.')); });
            xhr.open('POST', url);
            xhr.send(formData);
        });
    };
})();

window.compressAndUploadImage = async function(file) {
    const form = new FormData();
    form.append('action', 'upload_gambar_base64');
    form.append('file', file, file.name);
    const result = await window.uploadWithProgress('PHP/api_forum.php', form, 'Mengunggah Gambar');
    if (result.status !== 'success') { window.uploadProgressDone(result.message || 'Upload gagal.', false); throw new Error(result.message || 'Upload gagal'); }
    window.uploadProgressDone('Gambar berhasil diunggah!', true);
    return result.url;
}


// ==========================================
// 6. WIDGET OBROLAN PRIVAT GLOBAL
// ==========================================
var chatActiveTargetId = null;
var dbChatContacts = []; 
var currentSearchContactKeyword = ""; 
var lastMessagesData = ""; 
var currentChatOffset = 0;
var chatLimit = 30;
var hasMoreChats = true;
var isFetchingChats = false;

window.toggleChatWindow = function() {
    const w = document.getElementById('chatWindow');
    if (!w) { console.warn('[Chat] widget obrolan tidak ada di halaman ini'); return; }
    if (w.style.display === 'none') { w.style.display = 'flex'; if(!chatActiveTargetId) checkUnreadChatsUIOnly(); }
    else { w.style.display = 'none'; }
}

window.backToContacts = function() {
    chatActiveTargetId = null; lastMessagesData = "";
    var sc = document.getElementById('searchChatContact'); if (sc) sc.value = '';
    currentSearchContactKeyword = '';
    var cv = document.getElementById('chatConversationView'); if (cv) cv.style.display = 'none';
    var cl = document.getElementById('chatContactsView'); if (cl) cl.style.display = 'flex';
    checkUnreadChatsUIOnly();
}

window.checkUnreadChatsUIOnly = async function() {
    if (!loggedInUser || !loggedInUser.id) return;
    try {
        const res = await fetch('PHP/api_forum.php', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'get_chat_contacts'}) });
        const result = await res.json();
        
        if (result.status === 'success') {
            dbChatContacts = result.data; let totalUnread = 0; 
            result.data.forEach(c => { totalUnread += parseInt(c.unread); });
            
            const badge = document.getElementById('totalUnreadBadge');
            if (badge) { if (totalUnread > 0) { badge.innerText = totalUnread; badge.style.display = 'inline-block'; } else { badge.style.display = 'none'; } }

            const win = document.getElementById('chatWindow');
            if (win && win.style.display !== 'none') {
                if (!chatActiveTargetId) { 
                    const filtered = dbChatContacts.filter(c => c.nama.toLowerCase().includes(currentSearchContactKeyword)); 
                    renderContactsList(filtered); 
                } else { fetchPrivateChats(); }
            }
        }
    } catch(e) {}
}

if (loggedInUser) setInterval(checkUnreadChatsUIOnly, 30000);

window.renderContactsList = function(contacts) {
    const list = document.getElementById('chatContactsList');
    if (contacts.length === 0) { list.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8;">Tidak ditemukan.</div>'; return; }

    // Pisahkan pengguna yang sedang online
    const onlineContacts = contacts.filter(c => c.is_online == 1 || c.is_online == "1");

    let html = '';

    // ==========================================
    // 1. WIDGET "ACTIVE NOW" (GAYA INSTAGRAM STORY)
    // Hanya muncul jika tidak sedang mencari (Search kosong)
    // ==========================================
    if (onlineContacts.length > 0 && currentSearchContactKeyword === "") {
        html += `<div style="padding: 15px; border-bottom: 1px solid #f1f5f9; background: #fafafa;">`;
        html += `<div style="font-size: 11px; font-weight: 800; color: #94a3b8; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Sedang Aktif (${onlineContacts.length})</div>`;
        
        // Membungkus avatar untuk digeser ke samping (Horizontal Scroll)
        html += `<style>.story-scroll::-webkit-scrollbar { display: none; }</style>`;
        html += `<div class="story-scroll" style="display: flex; gap: 15px; overflow-x: auto; padding-bottom: 5px; scrollbar-width: none; -ms-overflow-style: none;">`;

        onlineContacts.forEach(c => {
            const safeName = c.nama.replace(/'/g, "\\'");
            const namaPendek = c.nama.split(' ')[0]; // Ambil nama depan saja
            const foto = (c.foto && c.foto !== '') ? c.foto : 'Image/default.jpg';
            const frameImg = c.frame ? `<img src="${c.frame}" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:125%; height:125%; pointer-events:none; z-index:2;">` : '';

            // Desain Cincin Hijau Ala Story
            html += `
            <div style="display:flex; flex-direction:column; align-items:center; width: 56px; gap: 6px; cursor: pointer;" onclick="openChat('${c.id}', '${safeName}')" onmouseover="this.children[0].style.transform='scale(1.08)'" onmouseout="this.children[0].style.transform='scale(1)'">
                <div style="position:relative; width:52px; height:52px; border-radius:50%; background: linear-gradient(45deg, #10b981, #34d399); padding:2px; box-shadow:0 4px 10px rgba(16,185,129,0.25); transition: transform 0.2s ease;">
                    <div style="position:relative; width:100%; height:100%; background:white; border-radius:50%; overflow:hidden;">
                        <img src="${foto}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='Image/default.jpg'">
                    </div>
                    ${frameImg}
                    <span style="position:absolute; bottom:0px; right:0px; width:14px; height:14px; background-color:#2ecc71; border:2.5px solid white; border-radius:50%; z-index:3;"></span>
                </div>
                <span style="font-size: 10px; font-weight: 700; color: #334155; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">${namaPendek}</span>
            </div>`;
        });

        html += `</div></div>`;
    }

    // ==========================================
    // 2. DAFTAR KONTAK / RIWAYAT (GAYA WHATSAPP)
    // ==========================================
    // Urutkan kontak: yang memiliki pesan belum dibaca (Unread) ditaruh paling atas
    let sortedContacts = [...contacts].sort((a, b) => {
        return parseInt(b.unread) - parseInt(a.unread);
    });

    html += `<div style="padding: 10px 15px;">`;
    if (currentSearchContactKeyword === "") {
        html += `<div style="font-size: 11px; font-weight: 800; color: #94a3b8; margin-bottom: 10px; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.5px;">Riwayat Pesan</div>`;
    }

    sortedContacts.forEach(c => {
        // Label Pesan Baru
        let unreadHtml = parseInt(c.unread) > 0 ? `<div style="background:#ef4444; color:white; padding:4px 8px; border-radius:12px; font-size:10px; font-weight:800; box-shadow:0 2px 6px rgba(239,68,68,0.3); flex-shrink:0;">${c.unread} Baru</div>` : '';

        // Status Titik Hijau Kecil
        let statusDot = (c.is_online == 1) ? `<span style="display:inline-block; width:8px; height:8px; background-color:#2ecc71; border-radius:50%; margin-left:6px; box-shadow:0 0 4px #2ecc71;"></span>` : '';

        const safeName = c.nama.replace(/'/g, "\\'");
        const avatarContact = window.getAvatarWidget(c.foto, c.frame, '48px', '0 12px 0 0');

        // Subteks Dinamis: Jika ada pesan baru, ubah jadi merah. Jika tidak, tampilkan jabatannya
        let subText = (parseInt(c.unread) > 0) ? `<span style="color:#ef4444; font-weight:700;">Mengirim pesan baru...</span>` : `<span style="color:#94a3b8;">${c.jabatan || 'Ketuk untuk mengobrol'}</span>`;

        html += `
        <div class="chat-contact-item" onclick="openChat('${c.id}', '${safeName}')" style="display:flex; align-items:center; justify-content:space-between; padding:12px; border-radius:14px; cursor:pointer; transition:background 0.2s; margin-bottom:4px;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
            <div style="display:flex; align-items:center; overflow:hidden; flex:1;">
                ${avatarContact}
                <div style="overflow:hidden; padding-right:10px;">
                    <div style="font-size:14px; font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center;">${c.nama} ${statusDot}</div>
                    <div style="font-size:12px; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${subText}</div>
                </div>
            </div>
            ${unreadHtml}
        </div>`;
    });
    
    html += `</div>`;
    list.innerHTML = html;
}

window.markChatRead = async function(targetId) {
    if (!targetId) return false;
    try {
        const response = await fetch('PHP/api_forum.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'mark_chat_read', target_id: String(targetId)})
        });
        const result = await response.json();
        return response.ok && result.status === 'success';
    } catch (error) {
        return false;
    }
};

window.openChat = function(id, nama) {
    chatActiveTargetId = id; lastMessagesData = ""; currentChatOffset = 0; hasMoreChats = true;
    
    const profilChatUrl = `profile.html?user=${encodeURIComponent(nama)}`;
    document.getElementById('chatActiveName').innerHTML = `<a href="javascript:void(0)" onclick="navigasiSPA('${profilChatUrl}')" style="color:white; text-decoration:none;">${nama}</a>`;
    document.getElementById('chatContactsView').style.display = 'none';
    document.getElementById('chatConversationView').style.display = 'flex';
    document.getElementById('chatMessagesList').innerHTML = '<div style="text-align:center; padding:20px; font-size:12px; color:#94a3b8;"><span class="spinner"></span> Memuat pesan...</div>';
    
    markChatRead(id).then(() => {
        checkUnreadChatsUIOnly();
        cekNotifikasiLonceng();
    });
    fetchPrivateChats();
}

window.fetchPrivateChats = async function(isLoadMore = false) {
    if(!chatActiveTargetId || isFetchingChats) return;
    if(isLoadMore && !hasMoreChats) return;

    isFetchingChats = true;
    let offsetToFetch = isLoadMore ? currentChatOffset + chatLimit : 0;
    let limitToFetch = isLoadMore ? chatLimit : currentChatOffset + chatLimit; 
    if(!isLoadMore && limitToFetch === 0) limitToFetch = chatLimit;

    try {
        const res = await fetch('PHP/api_forum.php', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'get_chats', target_id: chatActiveTargetId, limit: limitToFetch, offset: offsetToFetch}) });
        const result = await res.json();
        
        if(result.status === 'success') {
            const msgs = result.data; 
            const container = document.getElementById('chatMessagesList');
            
            if (isLoadMore) {
                if (msgs.length < chatLimit) hasMoreChats = false;
                currentChatOffset += chatLimit;
                
                let html = '';
                if (hasMoreChats) html += `<div id="loadMoreChatBtn" style="text-align:center; padding:10px;"><button onclick="fetchPrivateChats(true)" style="background:transparent; border:none; color:#3498db; cursor:pointer; font-weight:bold; font-size:12px;">⬆️ Muat pesan sebelumnya...</button></div>`;
                msgs.forEach(m => { html += buildChatBubble(m); });
                
                const oldBtn = document.getElementById('loadMoreChatBtn');
                if (oldBtn) oldBtn.remove();
                
                const oldScrollHeight = container.scrollHeight;
                container.insertAdjacentHTML('afterbegin', html);
                loadLinkPreviews();
                container.scrollTop = container.scrollHeight - oldScrollHeight; 
            } else {
                if (currentChatOffset === 0 && msgs.length === chatLimit) hasMoreChats = true;
                else if (currentChatOffset === 0 && msgs.length < chatLimit) hasMoreChats = false;

                if (msgs.length === 0) { 
                    container.innerHTML = '<div style="text-align:center; padding:20px; font-size:12px; color:#94a3b8;">Belum ada riwayat pesan. Kirim pesan pertama Anda!</div>'; 
                    lastMessagesData = "[]"; isFetchingChats = false; return; 
                }
                
                let html = '';
                if (hasMoreChats) html += `<div id="loadMoreChatBtn" style="text-align:center; padding:10px;"><button onclick="fetchPrivateChats(true)" style="background:transparent; border:none; color:#3498db; cursor:pointer; font-weight:bold; font-size:12px;">⬆️ Muat pesan sebelumnya...</button></div>`;
                msgs.forEach(m => { html += buildChatBubble(m); });

                const newDataString = JSON.stringify(msgs);
                if (newDataString !== lastMessagesData || lastMessagesData === "") {
                    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 80;
                    container.innerHTML = html; 
                    loadLinkPreviews(); 
                    if (lastMessagesData === "" || isAtBottom || (msgs.length > 0 && msgs[msgs.length - 1].sender_id === loggedInUser.id)) { container.scrollTop = container.scrollHeight; }
                    lastMessagesData = newDataString; 
                }
            }
        }
    } catch (e) {} finally { isFetchingChats = false; }
}

window.buildChatBubble = function(m) {
    const isMe = m.sender_id === loggedInUser.id; 
    const bubClass = isMe ? 'me' : 'them';
    const tgl = new Date(m.created_at); 
    const jam = String(tgl.getHours()).padStart(2, '0') + ':' + String(tgl.getMinutes()).padStart(2, '0');
    let dropdownHtml = '';
    
    // 1. DETEKSI STIKER MURNI: 
    // Memastikan pesan mengandung 'Uploads/stiker_' DAN tidak ada spasi (artinya murni 1 link stiker tanpa teks tambahan)
    let msgTrimmed = m.message.trim();
    let isOnlySticker = msgTrimmed.includes('Uploads/stiker_') && msgTrimmed.split(/\s+/).length === 1;
    
    // 2. MODIFIKASI WUJUD BUBBLE: Jika itu stiker murni, hilangkan kotak biru/abu-abunya
    let extraBubbleStyle = isOnlySticker ? 'background: transparent; box-shadow: none; padding: 0; border: none;' : '';
    let extraTextStyle = isOnlySticker ? 'padding-right: 0;' : 'padding-right: 15px;';
    
    // 3. MODIFIKASI JAM: Beri latar hitam transparan agar jam terbaca jelas menumpuk di atas stiker
    let timeStyle = isOnlySticker ? 'background: rgba(0,0,0,0.5); color: #ffffff; padding: 2px 6px; border-radius: 10px; right: 0; bottom: 5px; font-weight: 600;' : '';
    
    if (isMe) {
        const safeMsg = m.message.replace(/'/g, "&#39;").replace(/"/g, "&quot;").replace(/\n/g, "\\n");
        
        // 4. MODIFIKASI TOMBOL MENU ▼: Geser sedikit letak tombolnya agar pas dengan gambar stiker
        let btnStyle = isOnlySticker ? 'top: 8px; right: 0px; background: rgba(0,0,0,0.4); color: white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 10px;' : '';
        
        dropdownHtml = `<button class="chat-dropdown-btn" style="${btnStyle}" onclick="toggleChatMenu(event, '${m.id}')">▼</button>
        <div id="chat-menu-${m.id}" class="chat-dropdown-menu">
            <button onclick="editPrivateChat('${m.id}', '${safeMsg}')">✏️ Edit Pesan</button>
            <button onclick="deletePrivateChat('${m.id}')" style="color:#e74c3c;">🗑️ Hapus Pesan</button>
        </div>`;
    }
    
    return `<div class="chat-bubble ${bubClass}" style="${extraBubbleStyle}">
        <div id="chat-text-${m.id}" style="${extraTextStyle} white-space: pre-wrap;">${formatPesanChat(m.message)}</div>
        ${dropdownHtml}<span class="chat-time" style="${timeStyle}">${jam}</span>
    </div>`;
}

window.toggleChatMenu = function(event, id) { 
    event.stopPropagation(); 
    document.querySelectorAll('.chat-dropdown-menu').forEach(menu => { if(menu.id !== 'chat-menu-' + id) menu.classList.remove('show'); }); 
    document.getElementById('chat-menu-' + id).classList.toggle('show'); 
}

window.deletePrivateChat = async function(id) { 
    const isConf = await showCustomConfirm("Tarik / hapus pesan ini dari obrolan?", "Hapus Pesan", "🗑️");
    if(isConf) { 
        try { 
            await fetch('PHP/api_forum.php', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'delete_chat', msg_id: id}) }); 
            lastMessagesData = ""; 
            fetchPrivateChats(); 
        } catch(e){} 
    } 
}

window.editPrivateChat = function(id, oldText) {
    const bubText = document.getElementById('chat-text-' + id); 
    if(!bubText) return;
    bubText.innerHTML = `
        <textarea id="edit-chat-input-${id}" style="width:100%; border:none; border-radius:4px; padding:4px; font-family:inherit; font-size:12px; color:#333; resize:vertical; outline:none;" rows="2">${oldText}</textarea>
        <div style="display:flex; gap:5px; margin-top:5px;">
            <button onclick="saveEditChat('${id}')" style="background:#f1c40f; color:#333; border:none; border-radius:4px; padding:3px 8px; font-size:10px; cursor:pointer; font-weight:bold;">Simpan</button>
            <button onclick="lastMessagesData=''; fetchPrivateChats()" style="background:#e74c3c; color:white; border:none; border-radius:4px; padding:3px 8px; font-size:10px; cursor:pointer; font-weight:bold;">Batal</button>
        </div>`;
    const btn = bubText.parentElement.querySelector('.chat-dropdown-btn'); 
    if(btn) btn.style.display = 'none';
}

window.saveEditChat = async function(id) {
    const input = document.getElementById('edit-chat-input-' + id); 
    const newText = input.value.trim();
    if(newText) { 
        try { 
            await fetch('PHP/api_forum.php', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'edit_chat', msg_id: id, message: newText}) }); 
            lastMessagesData = ""; fetchPrivateChats(); 
        } catch(e){} 
    } else { lastMessagesData = ""; fetchPrivateChats(); }
}

window.sendPrivateMessage = async function() {
    const input = document.getElementById('chatInputMessage'); 
    const msg = input.value.trim(); 
    if(!msg || !chatActiveTargetId) return;
    
    input.value = ''; 
    try { 
        const response = await fetch('PHP/api_forum.php', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'send_chat', target_id: chatActiveTargetId, message: msg}) }); 
        const result = await response.json();
        if (result.status === 'error') { alert(result.message); input.value = msg; } else { lastMessagesData = ""; fetchPrivateChats(); }
    } catch (e) { alert("Terjadi kesalahan jaringan."); input.value = msg; }
}

window.uploadImageChat = async function(input) {
    if (!input.files[0]) return; 
    const btn = document.getElementById('btnSendChat'); 
    const oldText = btn.innerText; btn.innerText = '⏳'; btn.disabled = true;
    try { 
        const url = await compressAndUploadImage(input.files[0]); 
        const inputMsg = document.getElementById('chatInputMessage'); 
        inputMsg.value = (inputMsg.value ? inputMsg.value + ' \n' : '') + url; inputMsg.focus(); 
    } catch (e) { alert('Gagal mengunggah gambar.'); } finally { btn.innerText = oldText; btn.disabled = false; input.value = ''; }
}

// ==========================================
// 7. FUNGSI BACKGROUND HALAMAN PERSONAL
// ==========================================
window.applyGlobalBackground = function(bgOuter) {
    const container = document.querySelector('.container');
    const navMenu = document.querySelector('.nav-menu'); // Mengambil elemen menu kiri
    const topBar = document.querySelector('.top-bar');   // Mengambil elemen menu atas
    
    if (bgOuter && typeof bgOuter === 'string' && bgOuter.trim() !== '') {
        // 1. Terapkan Wallpaper di Body
        document.body.style.backgroundImage = `url('${bgOuter}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
        
        // 2. Efek Kaca untuk Wadah Konten Tengah
        if (container) {
            container.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
            container.style.backdropFilter = 'blur(2px)';
            container.style.webkitBackdropFilter = 'blur(2px)';
            container.style.backgroundImage = 'none';
            container.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.1)';
            container.style.border = '1px solid rgba(255, 255, 255, 0.4)';
        }
   
        // 4. Efek Kaca untuk Top Bar (Agar warnanya mengikuti wallpaper)
        if (topBar) {
            topBar.style.backgroundColor = 'rgba(255, 255, 255, 0.70)'; // Sangat transparan
            topBar.style.backdropFilter = 'blur(35px)';
            topBar.style.webkitBackdropFilter = 'blur(35px)';
            topBar.style.borderBottom = '1px solid rgba(255, 255, 255, 0.2)';
            topBar.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.05)';
        }
        
    } else {
        // Reset ke setelan asli sistem jika tidak ada wallpaper (kembali abu-abu/putih)
        document.body.style.backgroundImage = 'none';
        document.body.style.backgroundColor = '#f1f5f9';
        
        if (container) {
            container.style.backgroundColor = '#ffffff';
            container.style.backdropFilter = 'none';
            container.style.webkitBackdropFilter = 'none';
            container.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.04)';
            container.style.border = 'none';
        }
        
        if (topBar) {
            topBar.style.backgroundColor = ''; // Mengembalikan ke warna CSS asli
            topBar.style.backdropFilter = 'none';
            topBar.style.webkitBackdropFilter = 'none';
            topBar.style.borderBottom = '';
            topBar.style.boxShadow = '';
        }
    }
}

// ==========================================
// 8. RADAR MAINTENANCE OTOMATIS GLOBAL
// ==========================================
let maintenanceProbeAktif = false;

async function cekStatusMaintenance() {
    // Mencegah pemeriksaan menumpuk apabila server lambat.
    if (maintenanceProbeAktif) {
        return;
    }

    maintenanceProbeAktif = true;

    try {
        const response = await fetch(
            'PHP/ping.php?t=' + Date.now(),
            {
                method: 'GET',
                cache: 'no-store',
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        // HTTP 500, 502, 503, dan error lain
        // bukan otomatis berarti maintenance.
        if (!response.ok) {
            console.warn(
                'Pemeriksaan server gagal:',
                response.status
            );

            return;
        }

        const data = await response.json();

        // Hanya respons eksplisit berikut yang valid:
        // { "status": "maintenance" }
        if (
            data &&
            data.status === 'maintenance' &&
            !window.location.pathname.includes(
                'maintenance.html'
            )
        ) {
            window.location.replace(
                'maintenance.html'
            );
        }
    } catch (error) {
        // Gangguan jaringan tidak boleh mengubah halaman.
        console.warn(
            'Pemeriksaan maintenance gagal:',
            error
        );
    } finally {
        maintenanceProbeAktif = false;
    }
}

cekStatusMaintenance();

setInterval(
    cekStatusMaintenance,
    15000
);

// ==========================================
// 9. POPUP KONFIRMASI KUSTOM (PENGGANTI CONFIRM BROWSER)
// ==========================================
window.showCustomConfirm = function(message, title = 'Konfirmasi', icon = '⚠️', color = '#ef4444', bgColor = '#fee2e2') {
    return new Promise((resolve) => {
        const existing = document.getElementById('customConfirmModal');
        if (existing) existing.remove();

        const html = `
        <div id="customConfirmModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.6); backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); z-index:999999; display:flex; justify-content:center; align-items:center; opacity:0; transition:opacity 0.2s ease-out;">
            <div id="customConfirmBox" style="background:#ffffff; width:320px; border-radius:16px; padding:24px; text-align:center; box-shadow:0 20px 40px rgba(0,0,0,0.2); transform:scale(0.8); transition:transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                <div style="width:60px; height:60px; background:${bgColor}; color:${color}; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:28px; margin:0 auto 16px;">${icon}</div>
                <h3 style="color:#0f172a; font-size:18px; font-weight:800; margin-bottom:8px;">${title}</h3>
                <p style="color:#64748b; font-size:13px; line-height:1.5; margin-bottom:24px;">${message}</p>
                <div style="display:flex; gap:10px; justify-content:center;">
                    <button id="btnConfirmCancel" style="flex:1; background:#f1f5f9; color:#475569; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer; transition:0.2s;">Batal</button>
                    <button id="btnConfirmOk" style="flex:1; background:${color}; color:#ffffff; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer; transition:0.2s; box-shadow:0 4px 10px rgba(0,0,0,0.15);">Ya, Lanjutkan</button>
                </div>
            </div>
        </div>`;
        
        document.body.insertAdjacentHTML('beforeend', html);
        
        const modal = document.getElementById('customConfirmModal');
        const modalBox = document.getElementById('customConfirmBox');
        
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            modalBox.style.transform = 'scale(1)';
        });

        const closePopup = (result) => {
            modal.style.opacity = '0';
            modalBox.style.transform = 'scale(0.8)';
            setTimeout(() => {
                modal.remove();
                resolve(result);
            }, 200);
        };

        document.getElementById('btnConfirmCancel').onclick = () => closePopup(false);
        document.getElementById('btnConfirmOk').onclick = () => closePopup(true);
    });
};

// =========================================================
// PINTASAN TOMBOL ENTER UNTUK POPUP KONFIRMASI (VERSI SMART)
// =========================================================
document.addEventListener('keydown', function(event) {
    // 1. PENGAMAN: Jika user sedang mengetik di Textarea, biarkan Enter berfungsi normal (turun baris)
    if (event.target.tagName === 'TEXTAREA') return;

    if (event.key === 'Enter') {
        // 2. Cari semua elemen popup yang mengambang di layar (biasanya pakai z-index tinggi)
        const popups = document.querySelectorAll('div[style*="z-index: 10000"], div[style*="z-index: 9999"], div[style*="z-index:9999"]');
        
        for (let popup of popups) {
            // Pastikan popup tersebut sedang aktif/muncul di layar
            if (popup.style.display !== 'none' && popup.style.visibility !== 'hidden' && popup.style.opacity !== '0') {
                
                // Ambil semua tombol yang ada di dalam popup tersebut
                const buttons = popup.querySelectorAll('button');
                
                for (let btn of buttons) {
                    const teksTombol = btn.innerText.toLowerCase();
                    
                    // 3. TARGET SPESIFIK: Hanya klik tombol yang mengandung kata persetujuan
                    if (teksTombol.includes('ya') || teksTombol.includes('lanjut') || teksTombol.includes('hapus') || teksTombol.includes('simpan')) {
                        event.preventDefault(); // Cegah fungsi default browser
                        btn.click(); // Picu klik otomatis pada tombol "Ya, Lanjutkan"
                        return; // Langsung hentikan proses agar tidak salah klik tombol lain
                    }
                }
            }
        }
    }
});

// ==========================================
// 10. GLOBAL CLICK DETECTOR (TUTUP MENU OTOMATIS)
// ==========================================
document.addEventListener('click', function(event) {
    // 1. Tutup Menu Titik 3 di Postingan & Komentar Forum
    if (!event.target.matches('.dots') && !event.target.closest('.dropdown-content')) {
        document.querySelectorAll('.dropdown-content.show-dropdown').forEach(menu => {
            menu.classList.remove('show-dropdown');
        });
    }
    
    // 2. Tutup Menu Panah (▼) di Private Chat
    if (!event.target.matches('.chat-dropdown-btn') && !event.target.closest('.chat-dropdown-menu')) {
        document.querySelectorAll('.chat-dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
    }

    // 3. (Bonus) Tutup Menu Titik 3 di Halaman Profil jika diklik di luar
    if (!event.target.closest('#coverDropdown') && !event.target.matches('button[onclick*="toggleCoverMenu"]')) {
        const coverMenu = document.getElementById('coverDropdown');
        if (coverMenu) coverMenu.style.display = 'none';
    }
});

// ==========================================
// KODE BARU: TUTUP NOTIFIKASI & PESAN SAAT KLIK DI LUAR
// ==========================================
document.addEventListener('click', function(event) {
    // 1. Logika untuk Lonceng Notifikasi
    const notifWrapper = document.querySelector('.notif-wrapper');
    const notifMenu = document.getElementById('notifMenu');
    
    if (notifWrapper && notifMenu) {
        if (!notifWrapper.contains(event.target)) {
            notifMenu.style.display = 'none';
        }
    }

    // 2. Logika untuk Menu Obrolan Privat
    const chatWrapper = document.getElementById('privateChatWidget');
    const chatWindow = document.getElementById('chatWindow');
    
    // Jika tombol pesan dan kotak obrolan ada di layar...
    if (chatWrapper && chatWindow) {
        // KODE PERBAIKAN: Berikan hak istimewa (pengecualian) untuk Media Modal dan tombol X (Close)
        if (!chatWrapper.contains(event.target) 
            && !event.target.closest('#stickerPopup') 
            && !event.target.closest('#customConfirmModal')
            && !event.target.closest('#mediaModal')
            && !event.target.closest('.close-modal')) {
            chatWindow.style.display = 'none'; // Sembunyikan kotak obrolan
        }
    }
});

// ==========================================
// PENGAPLIKASIAN BACKGROUND PERSONAL
// ==========================================
window.terapkanBackgroundPersonal = function() {
    try {
        const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser')) || {};
        
        if (loggedInUser.background_page && loggedInUser.background_page !== "null" && loggedInUser.background_page.trim() !== "") {
            let bgUrl = loggedInUser.background_page;
            
            // Jika path tersimpan dengan awalan Uploads/, ubah ke Users/Image/
            if (bgUrl.startsWith('Uploads/')) {
                bgUrl = bgUrl.replace('Uploads/', 'Users/Image/');
            } 
            // Jika path tersimpan hanya nama filenya saja tanpa folder, arahkan ke Users/Image/
            else if (!bgUrl.startsWith('Users/Image/') && !bgUrl.startsWith('Image/') && !bgUrl.startsWith('http')) {
                bgUrl = 'Users/Image/' + bgUrl;
            }
            
            // Terapkan secara paksa ke body agar muncul di semua halaman
            document.body.style.setProperty('background-image', `url('${bgUrl}')`, 'important');
            document.body.style.setProperty('background-size', 'cover', 'important');
            document.body.style.setProperty('background-position', 'center', 'important');
            document.body.style.setProperty('background-attachment', 'fixed', 'important');
        } else {
            document.body.style.removeProperty('background-image');
        }
    } catch (e) {
        console.error("Gagal memuat background personal:", e);
    }
};

// =========================================================
// LOGIKA DASHBOARD DONATUR VIP (TAHAP 1) - SPA MODE
// =========================================================
window.dbPegawaiVIP = []; 

// 1. Tampilkan tombol menu khusus God Creator saat login
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('app.html')) {
        let user = JSON.parse(sessionStorage.getItem('loggedInUser'));
        if (user && user.tingkat === 'God Creator') {
            const btnDnt = document.getElementById('navDonaturBtn');
            if(btnDnt) btnDnt.style.display = 'inline-block';
        }
    }
});

// 2. Fungsi membuka dashboard sebagai Halaman Virtual (SPA)
window.bukaDashboardDonatur = async function() {
    // Matikan semua tombol menu yang aktif, lalu aktifkan tombol Donatur
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const btnDnt = document.getElementById('navDonaturBtn');
    if(btnDnt) btnDnt.classList.add('active');

    // Kosongkan wadah utama dan injeksi HTML Dashboard Tag Lencana
    const contentArea = document.getElementById('spa-content');
    contentArea.innerHTML = `
        <div id="page-donatur" class="page-section" style="background: linear-gradient(135deg, #0f172a, #1e293b); border: 1px solid #ec4899; box-shadow: 0 10px 40px rgba(236, 72, 153, 0.15); padding: 30px; border-radius: 16px; margin-bottom: 20px;">
            <div style="border-bottom: 1px solid #334155; padding-bottom: 20px; margin-bottom: 20px;">
                <h2 style="color: #fbcfe8; display: flex; align-items: center; gap: 10px; margin-bottom: 5px; font-weight: 800; font-size: 22px;">
                    🏷️ Manajemen Tag Lencana
                </h2>
                <p style="color: #94a3b8; font-size: 14px;">
                    Berikan lencana khusus kepada pengguna. Pemegang lencana ini akan mendapatkan tag unik di samping nama mereka pada Forum Sosial.
                </p>
            </div>
            
            <input type="text" id="searchDonatur" placeholder="🔍 Cari nama pegawai..." class="custom-input vip-search" oninput="renderListDonatur()" style="width: 100%;">

            <div class="vip-list-container" id="listPegawaiDonatur">
                <div style="text-align: center; color: #94a3b8; padding: 30px; font-weight: bold;"><span class="spinner"></span> Memuat data pegawai... ⏳</div>
            </div>
        </div>
    `;

    // Ubah URL secara visual tanpa reload
    window.history.pushState({path: 'app.html?view=donatur'}, '', `app.html?view=donatur`);

    // Ambil data ringan khusus panel lencana dari server.
    try {
        const res = await fetch('PHP/api_pegawai.php?limit=badges', {
            cache: 'no-store',
            headers: { 'Accept': 'application/json' }
        });
        const responseText = await res.text();
        let result;

        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            throw new Error(`Respons server bukan JSON (HTTP ${res.status}).`);
        }

        if (!res.ok || result.status !== 'success' || !Array.isArray(result.data)) {
            throw new Error(result.message || `Server merespons HTTP ${res.status}.`);
        }

        window.dbPegawaiVIP = result.data;
        renderListDonatur();
    } catch(e) {
        const list = document.getElementById('listPegawaiDonatur');
        if (list) {
            list.innerHTML = `<div style="color:#ef4444; text-align:center; line-height:1.6;">❌ Gagal memuat data pegawai.<br><small>${escapeHTML(e.message || 'Kesalahan jaringan.')}</small></div>`;
        }
        console.error('Panel lencana gagal memuat data:', e);
    }
};

// 3. Fungsi merender daftar pegawai dengan Live Search
window.renderListDonatur = function() {
    const container = document.getElementById('listPegawaiDonatur');
    if (!container) return;
    const searchInput = document.getElementById('searchDonatur');
    const searchKw = searchInput ? searchInput.value.toLowerCase() : '';
    
    let html = '';
    let filtered = window.dbPegawaiVIP.filter(p => p.nama.toLowerCase().includes(searchKw));
    
    // KODE PERBAIKAN: Urutkan agar yang memiliki lencana berada paling atas
    filtered.sort((a, b) => {
        const aHasBadge = (a.is_donatur == 1 || a.is_sangean == 1) ? 1 : 0;
        const bHasBadge = (b.is_donatur == 1 || b.is_sangean == 1) ? 1 : 0;
        
        // Jika status kepemilikan lencana berbeda, yang punya lencana (1) naik ke atas
        if (aHasBadge !== bHasBadge) {
            return bHasBadge - aHasBadge; 
        }
        // Jika statusnya sama (sama-sama punya atau sama-sama tidak), urutkan sesuai abjad nama
        return a.nama.localeCompare(b.nama); 
    });
    
    if(filtered.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 20px;">Pegawai tidak ditemukan.</div>';
        return;
    }

    filtered.forEach(p => {
        // Logika Lencana Donatur
        const isDonatur = p.is_donatur == 1; 
        const btnDonaturClass = isDonatur ? 'btn-toggle-donatur active' : 'btn-toggle-donatur';
        const btnDonaturText = isDonatur ? '🌟 Cabut Donatur' : '👑 Beri Donatur';

        // Logika Lencana Sangean
        const isSangean = p.is_sangean == 1;
        const btnSangeanStyle = isSangean ? 'background: linear-gradient(135deg, #ec4899, #be185d); color: white; border: 1px solid #fbcfe8; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);' : 'background: #475569; color: white; border: none;';
        const btnSangeanText = isSangean ? '🔥 Cabut Ngacengan' : '🔥 Beri Ngacengan';

        const foto = (p.foto && p.foto !== '') ? p.foto.replace('Uploads/', 'Users/Image/') : 'Image/default.jpg';
        
        html += `
        <div class="vip-item">
            <div class="vip-user-info">
                <img src="${foto}" class="vip-avatar" onerror="this.src='Image/default.jpg'">
                <div>
                    <div class="vip-name">${p.nama}</div>
                    <div class="vip-role">${p.jabatan || 'Staf'} • NIP: ${p.nip || '-'}</div>
                </div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="${btnDonaturClass}" onclick="toggleDonaturAPI('${p.id}', ${isDonatur ? 0 : 1})">${btnDonaturText}</button>
                <button class="btn-toggle-donatur" style="${btnSangeanStyle}" onclick="toggleSangeanAPI('${p.id}', ${isSangean ? 0 : 1})">${btnSangeanText}</button>
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
};

// 4. API Call Asli ke Database (Menyimpan Status Lencana Donatur)
window.toggleDonaturAPI = async function(id, setStatus) {
    const aksiTeks = setStatus === 1 ? "MEMBERIKAN" : "MENCABUT";
    const isConf = await showCustomConfirm(`Apakah Anda yakin ingin ${aksiTeks} lencana Donatur untuk pegawai ini?`, "Konfirmasi Hak Akses", "🌟", "#f59e0b", "#f8fafc");
    if (!isConf) return;

    try {
        const res = await fetch('PHP/api_pegawai.php', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ action: 'toggle_donatur', id: id, status: setStatus }) });
        const result = await res.json();
        
        if(result.status === 'success') {
            const pIndex = window.dbPegawaiVIP.findIndex(p => p.id == id);
            if(pIndex > -1) window.dbPegawaiVIP[pIndex].is_donatur = setStatus;
            renderListDonatur();
        } else { alert("Gagal memperbarui status: " + result.message); }
    } catch(e) { alert("Kesalahan jaringan."); }
};

// 5. API Call Asli ke Database (Menyimpan Status Lencana Ngacengan sebelumnya Sangean)
window.toggleSangeanAPI = async function(id, setStatus) {
    const aksiTeks = setStatus === 1 ? "MEMBERIKAN" : "MENCABUT";
    const isConf = await showCustomConfirm(`Apakah Anda yakin ingin ${aksiTeks} lencana Ngacengan untuk pegawai ini?`, "Konfirmasi Hak Akses Lencana", "🔥", "#ec4899", "#fce7f3");
    if (!isConf) return;

    try {
        const res = await fetch('PHP/api_pegawai.php', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ action: 'toggle_sangean', id: id, status: setStatus }) });
        const result = await res.json();
        
        if(result.status === 'success') {
            const pIndex = window.dbPegawaiVIP.findIndex(p => p.id == id);
            if(pIndex > -1) window.dbPegawaiVIP[pIndex].is_sangean = setStatus;
            renderListDonatur();
        } else { alert("Gagal memperbarui status: " + result.message); }
    } catch(e) { alert("Kesalahan jaringan."); }
};

// 6. Utilitas Pembuat Multi Lencana (Menampilkan semua tag yang dimiliki)
window.getCustomTagsHTML = function(is_donatur, is_sangean) {
    let html = '';
    if (is_donatur == 1 || is_donatur == "1" || is_donatur === true) {
        html += `<span class="badge-vip-donatur" title="Donatur Pengembangan Sistem">Donatur</span>`;
    }
    if (is_sangean == 1 || is_sangean == "1" || is_sangean === true) {
        html += `<span class="badge-sangean" title="Ngacengan">Ngacengan</span>`;
    }
    return html;
};

// Jalankan otomatis saat halaman dimuat
window.addEventListener('DOMContentLoaded', () => {
    window.terapkanBackgroundPersonal();
});