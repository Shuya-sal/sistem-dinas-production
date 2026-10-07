var uploadedFiles = []; 
var currentOffsetForum = 0;
var postsLimitForum = 5;
var isFetchingDataForum = false;
var hasMorePostsForum = true;

// =========================================================
// LOGIKA & POPUP STIKER PERSONAL
// =========================================================
var stickerTarget = { type: null, contextId: null };
window.isDeleteStickerMode = false;

window.getStickerIconHtml = function() {
    let stikers = [];
    try { stikers = JSON.parse(loggedInUser.stiker || '[]'); } catch(e){}
    if (stikers.length > 0) { return `<img src="${stikers[0]}" style="width:24px; height:24px; border-radius:6px; object-fit:cover; vertical-align:middle; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">`; } 
    else { return `<span style="font-size:24px; vertical-align:middle; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));">🌟</span>`; }
}

window.updateAllStickerIcons = function() {
    const icons = document.querySelectorAll('.btn-stiker-trigger');
    const html = getStickerIconHtml();
    icons.forEach(el => el.innerHTML = html);
}

window.createStickerPopup = function() {
    if (document.getElementById('stickerPopup')) return;
    const html = `
    <style>
        #stickerGrid::-webkit-scrollbar { display: none; }
        #stickerGrid { -ms-overflow-style: none; scrollbar-width: none; overflow-x: hidden; }
        @keyframes shakeSticker { 0% { transform: rotate(0deg); } 25% { transform: rotate(2deg); } 50% { transform: rotate(0eg); } 75% { transform: rotate(-2deg); } 100% { transform: rotate(0deg); } }
    </style>
    <div id="stickerPopup" style="display:none; position:absolute; z-index:10000; width:360px; background:rgba(255,255,255,0.95); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); border:1px solid #cbd5e1; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.15); flex-direction:column; overflow:hidden;">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 15px; border-bottom:1px solid #e2e8f0; background:#f8fafc;">
            <b style="font-size:13px; color:#334155;">Koleksi Stiker</b>
            <div style="display:flex; gap:5px;">
                <button type="button" id="btnToggleHapusStiker" onclick="toggleHapusStikerMode()" style="background:#e74c3c; color:white; border:none; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:bold; cursor:pointer;">🗑️ Hapus</button>
                <label style="cursor:pointer; background:#3b82f6; color:white; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:bold; margin:0;">➕ Tambah<input type="file" accept="image/png, image/jpeg, image/webp, image/gif" multiple style="display:none;" onchange="uploadStiker(this)"></label>
            </div>
        </div>
        <div id="stickerGrid" style="padding:15px; display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:12px; max-height:220px; overflow-y:auto; overflow-x:hidden; box-sizing: border-box;"></div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);

    document.addEventListener('click', function(e) {
        const popup = document.getElementById('stickerPopup');
        if (popup && popup.style.display === 'flex') {
            // KODE PERBAIKAN: Abaikan jika user sedang mengklik Popup Konfirmasi agar stiker tidak tertutup
            if (e.target.closest('#customConfirmModal')) return;

            if (!popup.contains(e.target) && !e.target.closest('.btn-stiker-trigger')) {
                popup.style.display = 'none';
                window.isDeleteStickerMode = false;
                const btn = document.getElementById('btnToggleHapusStiker');
                if (btn) { btn.innerHTML = '🗑️ Hapus'; btn.style.background = '#e74c3c'; }
            }
        }
    });
}

window.toggleHapusStikerMode = function() {
    window.isDeleteStickerMode = !window.isDeleteStickerMode;
    const btn = document.getElementById('btnToggleHapusStiker');
    if (window.isDeleteStickerMode) { btn.innerHTML = '✅ Selesai'; btn.style.background = '#27ae60'; } 
    else { btn.innerHTML = '🗑️ Hapus'; btn.style.background = '#e74c3c'; }
    renderStickerGrid();
}

window.renderStickerGrid = function() {
    const grid = document.getElementById('stickerGrid');
    if(!grid) return;
    
    let stikers = [];
    try { stikers = JSON.parse(loggedInUser.stiker || '[]'); } catch(e){}
    
    if (stikers.length === 0) {
        grid.style.display = 'block';
        grid.innerHTML = '<div style="text-align:center; padding:20px; font-size:11px; color:#94a3b8; line-height:1.5;">Belum ada stiker.<br>Klik <b>➕ Tambah</b> untuk membuat stiker kustom Anda.</div>';
        const btn = document.getElementById('btnToggleHapusStiker');
        if(btn) btn.style.display = 'none'; 
        return;
    } else {
        const btn = document.getElementById('btnToggleHapusStiker');
        if(btn) btn.style.display = 'inline-block';
    }
    
    grid.style.display = 'grid';
    let html = '';
    stikers.forEach(url => {
        // KODE PERBAIKAN: Gunakan URL murni dari database tanpa memanipulasi foldernya
        let safeUrl = url;

        if (window.isDeleteStickerMode) {
            html += `<div style="position:relative; width:100%; aspect-ratio:1/1; cursor:pointer;" onclick="hapusStiker('${url}', event)"><img src="${safeUrl}" onerror="this.src='Image/default.jpg'" style="width:100%; height:100%; object-fit:cover; border-radius:8px; border:2px solid #ef4444; opacity:0.7; animation: shakeSticker 0.4s infinite;"><div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:rgba(231,76,60,0.9); color:white; border-radius:50%; width:22px; height:22px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:bold; box-shadow:0 2px 5px rgba(0,0,0,0.5);">X</div></div>`;
        } else {
            html += `<div style="position:relative; width:100%; aspect-ratio:1/1; cursor:pointer;" onclick="sendSticker('${url}')"><img src="${safeUrl}" onerror="this.src='Image/default.jpg'" style="width:100%; height:100%; object-fit:cover; border-radius:8px; border:1px solid #e2e8f0; transition:0.2s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'"></div>`;
        }
    });
    grid.innerHTML = html;
}

window.openStickerPopup = function(element, type, contextId) {
    createStickerPopup();
    stickerTarget = { type: type, contextId: contextId };
    window.isDeleteStickerMode = false;
    const btn = document.getElementById('btnToggleHapusStiker');
    if(btn) { btn.innerHTML = '🗑️ Hapus'; btn.style.background = '#e74c3c'; }

    const popup = document.getElementById('stickerPopup');
    renderStickerGrid();
    
    popup.style.visibility = 'hidden'; popup.style.display = 'flex';
    const popupHeight = popup.offsetHeight;
    const rect = element.getBoundingClientRect();
    
    let topPos = rect.top + window.scrollY - popupHeight - 10;
    let leftPos = rect.left + window.scrollX - (360 / 2) + (rect.width / 2); 
    
    if (topPos < window.scrollY) topPos = rect.bottom + window.scrollY + 10; 
    if (leftPos < 10) leftPos = 10;
    if (leftPos + 360 > window.innerWidth) leftPos = window.innerWidth - 370;

    popup.style.top = topPos + 'px'; popup.style.left = leftPos + 'px'; popup.style.visibility = 'visible';
}

// =========================================================
// KODE PERBAIKAN: Kirim Stiker Instan Latar Belakang
// =========================================================
window.sendSticker = async function(url) {
    // 1. Tutup popup stiker seketika agar terasa instan
    document.getElementById('stickerPopup').style.display = 'none';

    // 2. Ubah URL gambar menjadi absolut (http://...)
    const baseURL = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    const absoluteUrl = baseURL + url;
    
    // ==========================================
    // SKENARIO A: MEMILIH STIKER DI POSTINGAN UTAMA
    // ==========================================
    if (stickerTarget.type === 'post') {
        const inputEl = document.getElementById('postText');
        if (!inputEl) return;
        
        // KODE PERBAIKAN: Tampilkan Gambar Secara Visual, Jangan Masukkan Link ke Kotak Teks!
        window.pendingPostSticker = absoluteUrl; 
        
        let previewBox = document.getElementById('postStickerPreview');
        if (!previewBox) {
            previewBox = document.createElement('div');
            previewBox.id = 'postStickerPreview';
            previewBox.style.cssText = 'margin-top: 10px; position: relative; display: inline-block;';
            document.getElementById('previewArea').insertAdjacentElement('beforebegin', previewBox);
        }
        
        previewBox.innerHTML = `
            <img src="${absoluteUrl}" style="width: 100px; height: 100px; object-fit: contain; border-radius: 8px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15)); border: 1px solid #cbd5e1; padding: 4px; background: white;">
            <button type="button" onclick="window.pendingPostSticker=null; this.parentNode.remove();" style="position: absolute; top: -5px; right: -5px; background: #e74c3c; color: white; border: none; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">X</button>
        `;
        
        inputEl.focus();
        return;
        
    // ==========================================
    // SKENARIO B: MENGIRIM STIKER DI KOMENTAR (Kirim Langsung)
    // ==========================================
    } else if (stickerTarget.type === 'comment') {
        const inputEl = document.getElementById('input-komentar-' + stickerTarget.contextId);
        if (!inputEl) return;
        
        const teksSaatIni = inputEl.value.trim();
        const teksAkhir = (teksSaatIni ? teksSaatIni + ' \n' : '') + absoluteUrl;
        
        // KOSONGKAN KOTAK KOMENTAR SEKETIKA
        inputEl.value = '';
        inputEl.style.height = 'auto';
        
        const payload = { 
            action: 'buat_komentar', 
            post_id: stickerTarget.contextId, 
            pegawai_id: String(loggedInUser.id).trim(), 
            teks: teksAkhir 
        };
        
        try { 
            const response = await fetch('PHP/api_forum.php', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload) 
            }); 
            const result = await response.json(); 
            
            if (result.status === 'success') { 
                if(window.location.href.includes('profile')) refreshProfileFeedKeepPosition(); 
                else refreshFeedKeepPosition(); 
            } 
        } catch (error) {}
        
    // ==========================================
    // SKENARIO C: MENGIRIM STIKER DI CHAT PRIVAT (Kirim Langsung)
    // ==========================================
    } else if (stickerTarget.type === 'chat') {
        const inputEl = document.getElementById('chatInputMessage');
        if (!inputEl || !chatActiveTargetId) return;
        
        const teksSaatIni = inputEl.value.trim();
        const teksAkhir = (teksSaatIni ? teksSaatIni + ' \n' : '') + absoluteUrl;
        
        // KOSONGKAN KOTAK CHAT SEKETIKA
        inputEl.value = '';
        
        try { 
            const response = await fetch('PHP/api_forum.php', { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({action: 'send_chat', target_id: chatActiveTargetId, message: teksAkhir}) 
            }); 
            const result = await response.json();
            
            if (result.status === 'error') { 
                alert(result.message); 
            } else { 
                lastMessagesData = ""; 
                if(typeof fetchPrivateChats === 'function') fetchPrivateChats(); 
            }
        } catch (e) { 
            alert("Terjadi kesalahan jaringan."); 
        }
    }
}

window.uploadStiker = async function(input) {
    if(!input.files||!input.files.length)return;const files=input.files;const grid=document.getElementById('stickerGrid');let successCount=0;
    for(let i=0;i<files.length;i++){const file=files[i];if(file.size>5*1024*1024)continue;try{const form=new FormData();form.append('action','tambah_stiker');form.append('file',file,file.name);const result=await(await fetch('PHP/api_pegawai.php',{method:'POST',body:form})).json();if(result.status==='success'){loggedInUser.stiker=result.stiker;sessionStorage.setItem('loggedInUser',JSON.stringify(loggedInUser));successCount++;}}catch(e){console.error(e);}}
    if(successCount){updateAllStickerIcons();renderStickerGrid();}else if(grid)alert('Gagal mengunggah stiker.');input.value='';
}

window.hapusStiker = async function(url, event) {
    event.stopPropagation(); 
    const isConf = await showCustomConfirm("Hapus stiker ini dari koleksi Anda?", "Hapus Stiker");
    if (!isConf) return;
    
    try {
        const res = await fetch('PHP/api_pegawai.php', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ action: 'hapus_stiker', id: loggedInUser.id, stiker_url: url }) });
        const result = await res.json();
        if (result.status === 'success') {
            loggedInUser.stiker = result.stiker;
            sessionStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
            updateAllStickerIcons();
            let stikers = []; try { stikers = JSON.parse(loggedInUser.stiker || '[]'); } catch(e){}
            if(stikers.length === 0) { toggleHapusStikerMode(); } else { renderStickerGrid(); }
        }
    } catch(e) {}
}


window.initForumSPA = function() {
    // 1. Ambil data paling segar dari memori
    loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser')) || {};
    fetchUsersForMention();

    // 2. KODE PERBAIKAN: Hapus script "pengubah path" yang merusak link foto!
    // Memastikan Top Bar selalu sinkron menggunakan fungsi utama
    if (typeof window.updateTopBarUI === 'function') {
        window.updateTopBarUI();
    }

    // 3. Sinkronisasi Mutlak Foto Profil di Kolom Postingan (ANTI-NESTING)
    const postAvatarEl = document.getElementById('postAvatar');
    if (postAvatarEl && window.getAvatarWidget) {
        // Langsung cetak widget tanpa dibungkus div tambahan agar ukurannya tidak pecah
        postAvatarEl.outerHTML = window.getAvatarWidget(loggedInUser.foto, loggedInUser.frame, '45px', '0 15px 0 0', 'postAvatar');
        
        // Pasang sensor klik zoom-in secara manual agar aman
        setTimeout(() => {
            const newAvatar = document.getElementById('postAvatar');
            if (newAvatar) {
                newAvatar.style.cursor = 'zoom-in';
                newAvatar.title = 'Lihat Foto Profil Saya';
                newAvatar.onclick = function() {
                    if (window.openProfilePhotoModal) window.openProfilePhotoModal(loggedInUser.foto || 'Image/default.jpg');
                };
            }
        }, 50);
    }
    
    const postText = document.getElementById('postText');
    if (postText) {
        postText.style.overflow = 'hidden'; postText.style.resize = 'none'; 
        postText.oninput = function() { this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px'; };
        
        // KODE PERBAIKAN: Sensor tombol Enter untuk kirim postingan instan
        postText.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Cegah kursor turun ke baris baru
                
                // GEMBOK ANTI-BLINK: Jika popup sedang terbuka, hentikan proses agar Enter bisa menekan "Ya"
                if (document.getElementById('customConfirmModal')) return;
                
                const pf = document.getElementById('postForm');
                const btn = document.querySelector('.create-post-actions .btn-save');
                
                if (pf && btn && !btn.disabled) {
                    pf.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
            }
        });
    }

    const postActions = document.querySelector('.create-post-actions');
    if (postActions && !document.getElementById('postStickerBtn')) {
        const fileLabel = postActions.querySelector('.file-upload-label');
        if (fileLabel) { fileLabel.insertAdjacentHTML('beforebegin', `<span id="postStickerBtn" class="btn-stiker-trigger" onclick="openStickerPopup(this, 'post', null)" style="cursor:pointer; margin-right:15px;" title="Koleksi Stiker Saya">${getStickerIconHtml()}</span>`); }
    }

    const chatInput = document.getElementById('chatInputMessage');
    if (chatInput && !document.getElementById('chatStickerBtn')) {
        chatInput.insertAdjacentHTML('beforebegin', `<span id="chatStickerBtn" class="btn-stiker-trigger" onclick="openStickerPopup(this, 'chat', null)" style="cursor:pointer; margin-right:8px;" title="Koleksi Stiker Saya">${getStickerIconHtml()}</span>`);
    }
    
    const pf = document.getElementById('postForm');
    if(pf) {
        pf.onsubmit = async (e) => {
            e.preventDefault(); 
            
            const btn = document.querySelector('.create-post-actions .btn-save'); 
            if (btn && btn.disabled) return; // Cegah double-submit jika sedang memuat
            
            const pt = document.getElementById('postText'); 
            let teks = pt.value.trim(); 
            const videoLink = document.getElementById('postVideoLink').value.trim();
            
            if (window.pendingPostSticker) {
                teks = (teks ? teks + ' \n\n' : '') + window.pendingPostSticker;
            }
            
            if (!teks && uploadedFiles.length === 0 && !videoLink) { alert("Postingan tidak boleh kosong!"); return; }
            
            // KODE PERBAIKAN UTAMA: Lepas fokus kursor agar Enter bisa dipakai mengeklik tombol Ya
            if (pt) pt.blur(); 
            
            const originalText = btn ? btn.innerHTML : ''; 
            if (btn) { btn.innerHTML = "Menunggu..."; btn.disabled = true; } // Kunci tombol fisik
            
            const isConf = await showCustomConfirm("Apakah Anda yakin ingin mempublikasikan postingan ini ke Forum Sosial?", "Kirim Postingan", "🚀", "#3b82f6", "#eff6ff");
            
            if (!isConf) { 
                if (btn) { btn.innerHTML = originalText; btn.disabled = false; } // Buka kunci jika batal
                if (pt) pt.focus(); // Kembalikan kursor ke kotak teks
                return; 
            }
            
            if (btn) { btn.innerHTML = "Memproses..."; }
            
            const formData = new FormData(); 
            formData.append('action', 'buat_post'); 
            formData.append('pegawai_id', String(loggedInUser.id).trim()); 
            formData.append('teks', teks); 
            formData.append('video_link', videoLink); 
            uploadedFiles.forEach(file => { formData.append('media[]', file); });
            
            try {
                const response = await fetch('PHP/api_forum.php', { method: 'POST', body: formData }); 
                const result = await response.json();
                
                if (result.status === 'success') { 
                    pt.value = ''; pt.style.height = 'auto'; 
                    document.getElementById('postVideoLink').value = ''; 
                    if(typeof hapusMedia === 'function') hapusMedia(); 
                    
                    window.pendingPostSticker = null;
                    const stikerPrev = document.getElementById('postStickerPreview');
                    if(stikerPrev) stikerPrev.remove();
                    
                    window.scrollTo(0,0); 
                    if(typeof fetchPosts === 'function') fetchPosts(true); 
                } else { alert("Gagal memposting! Pesan: " + result.message); }
            } catch (error) { alert("Terjadi kesalahan jaringan"); } finally { if (btn) { btn.innerHTML = originalText; btn.disabled = false; } }
        };
    }
    
    // KODE PERBAIKAN: Kembalikan Tombol Pengalih ke Bawah Kotak Postingan (Tepat di atas Feed)
    const feedBody = document.getElementById('feedBody');
    if (feedBody && !document.getElementById('forumSortToggle')) {
        const toggleHtml = `
        <div id="forumSortToggle" style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; justify-content: center;">
            <button id="btnSortLatest" onclick="changeForumSort('latest')" style="background: #3b82f6; color: white; border: none; padding: 8px 20px; border-radius: 20px; font-size: 13px; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">🕒 Terbaru</button>
            <button id="btnSortTrending" onclick="changeForumSort('trending')" style="background: #f1f5f9; color: #64748b; border: none; padding: 8px 20px; border-radius: 20px; font-size: 13px; font-weight: bold; cursor: pointer; transition: 0.2s;">🔥 Sedang Tren (FYP)</button>
        </div>`;
        feedBody.insertAdjacentHTML('beforebegin', toggleHtml);
    }
    
    fetchPosts(true);
};

window.onscroll = () => { 
    if (document.getElementById('feedBody') && document.getElementById('postForm')) { if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 300) { fetchPosts(false); } } 
    else if (document.getElementById('profileContainer')) {
         const btnTabPost = document.getElementById('btnTabPost');
         if (btnTabPost && btnTabPost.classList.contains('active')) { if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 300) { fetchProfilePosts(false); } }
    }
};

window.refreshFeedKeepPosition = async function() {
    const savedScrollY = window.scrollY; const itemsToFetch = currentOffsetForum > postsLimitForum ? currentOffsetForum : postsLimitForum;
    try {
        const sortType = window.currentSortForum || 'latest';
        const activeHashtag = window.currentHashtagFilter || '';
        const response = await fetch(`PHP/api_forum.php?limit=${itemsToFetch}&offset=0&sort=${sortType}&hashtag=${activeHashtag}`, { method: 'GET' });
        
        // KODE PERBAIKAN: Baris parser JSON yang hilang sekarang dikembalikan!
        const result = await response.json(); 
        
        if (result.status === 'success') { document.getElementById('feedBody').innerHTML = ''; renderFeed(result.data); window.scrollTo({ top: savedScrollY, behavior: 'instant' }); }
    } catch (error) {}
}

window.fetchPosts = async function(reset = false) {
    if (isFetchingDataForum || (!hasMorePostsForum && !reset)) return;
    isFetchingDataForum = true; 
    if (reset) { currentOffsetForum = 0; hasMorePostsForum = true; document.getElementById('feedBody').innerHTML = ''; }
    
    document.getElementById('loadingScroll').style.display = 'block';
    try {
       const sortType = window.currentSortForum || 'latest';
        const activeHashtag = window.currentHashtagFilter || '';
        const response = await fetch(`PHP/api_forum.php?limit=${postsLimitForum}&offset=${currentOffsetForum}&sort=${sortType}&hashtag=${activeHashtag}`, { method: 'GET' });
        const result = await response.json();
        if (result.status === 'success') {
            const dataPost = result.data; if (dataPost.length < postsLimitForum) hasMorePostsForum = false;
            if (reset && dataPost.length === 0) { document.getElementById('feedBody').innerHTML = '<div style="text-align: center; color: #7f8c8d; padding: 20px;">Belum ada postingan. Jadilah yang pertama!</div>'; } 
            else { renderFeed(dataPost); currentOffsetForum += dataPost.length; }
        }
    } catch (error) { } finally {
        isFetchingDataForum = false; document.getElementById('loadingScroll').style.display = 'none';
        if (!hasMorePostsForum && currentOffsetForum > 0) { 
            if (!document.getElementById('endOfFeedMessage')) { 
                const endMsg = document.createElement('div'); endMsg.id = 'endOfFeedMessage'; endMsg.style.cssText = "text-align: center; color: #95a5a6; padding: 20px; font-size: 13px;"; endMsg.innerText = "— Anda telah mencapai akhir dari seluruh postingan —"; document.getElementById('feedBody').appendChild(endMsg); 
            } 
        }
    }
}

// Memori untuk mengingat jumlah komentar yang sedang dibuka per postingan
window.stateKomentarPost = {};

window.tampilkanSebagianKomentar = function(postId, jumlahTambah) {
    if (!window.stateKomentarPost[postId]) {
        window.stateKomentarPost[postId] = 3; // Default bawaan
    }
    window.stateKomentarPost[postId] += jumlahTambah; // Tambah cicilan 5

    const comments = document.querySelectorAll('.comment-group-' + postId);
    let maxTampil = window.stateKomentarPost[postId];
    let totalComments = comments.length;
    
    // Tampilkan komentar sesuai batasan memori terbaru
    comments.forEach((el, index) => {
        if (index >= totalComments - maxTampil) {
            if (el.style.display === 'none') {
                el.style.display = 'flex';
                el.style.animation = 'fadeIn 0.3s ease'; // Efek halus tidak mengagetkan
            }
        }
    });

    // Perbarui Teks Tombol Cicilan
    let hiddenCount = totalComments - maxTampil;
    const btn = document.getElementById('load-more-btn-' + postId);
    if (btn) {
        if (hiddenCount > 0) {
            let sisaTampil = hiddenCount > 5 ? 5 : hiddenCount;
            btn.innerHTML = `Tampilkan ${sisaTampil} komentar sebelumnya... <span style="color:#94a3b8; font-size:11px; font-weight:normal;">(${hiddenCount} tersisa)</span>`;
            btn.setAttribute('onclick', `tampilkanSebagianKomentar('${postId}', ${sisaTampil})`);
        } else {
            btn.style.display = 'none'; // Sembunyikan tombol jika sudah habis
        }
    }
};

// Tambahan Fitur Waktu Relatif, Animasi Like, Grid Foto & Truncate Teks
if (!document.getElementById('socialStyleFix')) {
    const styleFix = document.createElement('style');
    styleFix.id = 'socialStyleFix';
    styleFix.innerHTML = `
        @keyframes popLike { 0% { transform: scale(1); } 50% { transform: scale(1.5); } 100% { transform: scale(1); } }
        
        /* Grid Foto Pintar Ala Twitter / FB */
        .post-media-grid { display: grid; gap: 4px; border-radius: 12px; overflow: hidden; margin-top: 10px; border: 1px solid #e2e8f0; }
        .post-media-grid > div { position: relative; width: 100%; height: 100%; }
        .post-media-grid img { width: 100%; height: 100%; object-fit: cover; cursor: zoom-in; max-height: 400px; transition: 0.2s; display: block; }
        .post-media-grid img:hover { filter: brightness(0.9); }
        
        .grid-count-1 { grid-template-columns: 1fr; }
        .grid-count-1 img { max-height: 450px; }
        
        .grid-count-2 { grid-template-columns: 1fr 1fr; aspect-ratio: 2/1; max-height: 300px; }
        
        .grid-count-3 { grid-template-columns: 1.5fr 1fr; grid-template-rows: 1fr 1fr; aspect-ratio: 3/2; max-height: 350px; }
        .grid-count-3 > div:nth-child(1) { grid-row: span 2; }
        
        .grid-count-4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; aspect-ratio: 1/1; max-height: 400px; }
        
        .grid-count-5 { grid-template-columns: repeat(6, 1fr); grid-template-rows: 1fr 1fr; aspect-ratio: 3/2; max-height: 400px; }
        .grid-count-5 > div:nth-child(1), .grid-count-5 > div:nth-child(2) { grid-column: span 3; }
        .grid-count-5 > div:nth-child(3), .grid-count-5 > div:nth-child(4), .grid-count-5 > div:nth-child(5) { grid-column: span 2; }

        /* Teks Truncate (Baca Selengkapnya) */
        .collapsed-text { display: -webkit-box; -webkit-line-clamp: 12; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; }
        .read-more-btn { color: #3b82f6; cursor: pointer; font-weight: 700; font-size: 13px; margin-top: 6px; display: inline-block; transition: 0.2s; }
        .read-more-btn:hover { color: #2563eb; text-decoration: underline; }
    `;
    document.head.appendChild(styleFix);
}

window.timeAgo = function(dateString) {
    if (!dateString) return '';
    const now = new Date();
    
    // KODE PERBAIKAN GLOBAL: Paksa Javascript mengenali waktu server sebagai WITA (UTC+8)
    // Ubah "2026-09-20 15:52:59" menjadi format ISO "2026-09-20T15:52:59+08:00"
    const isoString = dateString.replace(' ', 'T') + '+08:00';
    
    // Mesin browser akan otomatis menerjemahkan isoString ke waktu lokal perangkat pengguna!
    const past = new Date(isoString); 
    
    const diffInSeconds = Math.floor((now - past) / 1000);
    
    // Cegah error waktu "minus" (jika jam HP pengguna sedikit lebih lambat dari server)
    if (diffInSeconds < 0) return 'Baru saja'; 
    if (diffInSeconds < 60) return 'Baru saja';
    if (diffInSeconds < 3600) return Math.floor(diffInSeconds / 60) + ' menit yang lalu';
    if (diffInSeconds < 86400) return Math.floor(diffInSeconds / 3600) + ' jam yang lalu';
    if (diffInSeconds < 172800) return 'Kemarin';
    
    return `${String(past.getDate()).padStart(2, '0')}/${String(past.getMonth()+1).padStart(2, '0')}/${past.getFullYear()}`;
};

window.salinLinkPostingan = function(postId) {
    const baseURL = window.location.href.split('?')[0];
    const linkToCopy = `${baseURL}?view=forum&highlight=${postId}`;
    
    const tampilkanToast = (pesan) => {
        let toast = document.getElementById('customToastShare');
        if (toast) toast.remove();
        toast = document.createElement('div');
        toast.id = 'customToastShare';
        toast.style.cssText = 'position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); color: white; padding: 12px 24px; border-radius: 30px; font-size: 13px; font-weight: bold; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 999999; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); opacity: 0; pointer-events: none;';
        toast.innerHTML = `🔗 ${pesan}`;
        document.body.appendChild(toast);
        requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.bottom = '50px'; });
        setTimeout(() => { toast.style.opacity = '0'; toast.style.bottom = '30px'; setTimeout(() => toast.remove(), 300); }, 3000);
    };

    const tampilkanPopupManual = (link) => {
        const existing = document.getElementById('fallbackCopyModal');
        if (existing) existing.remove();
        const html = `
        <div id="fallbackCopyModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.6); backdrop-filter:blur(5px); z-index:999999; display:flex; justify-content:center; align-items:center; opacity:0; transition:opacity 0.2s ease-out;">
            <div id="fallbackCopyBox" style="background:#ffffff; width:320px; border-radius:16px; padding:24px; text-align:center; box-shadow:0 20px 40px rgba(0,0,0,0.2); transform:scale(0.8); transition:transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                <div style="width:60px; height:60px; background:#eff6ff; color:#3b82f6; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:28px; margin:0 auto 16px;">🔗</div>
                <h3 style="color:#0f172a; font-size:18px; font-weight:800; margin-bottom:8px;">Salin Tautan Postingan</h3>
                <p style="color:#64748b; font-size:13px; margin-bottom:20px;">Silakan salin teks di bawah ini secara manual:</p>
                <input type="text" value="${link}" readonly style="width:100%; box-sizing:border-box; padding:12px; border:2px solid #cbd5e1; border-radius:8px; margin-bottom:20px; font-size:12px; text-align:center; background:#f8fafc; color:#334155; font-weight:700; outline:none; cursor:pointer;" onclick="this.select()" id="manualLinkInput">
                <button onclick="document.getElementById('fallbackCopyModal').remove()" style="width:100%; background:#3b82f6; color:#ffffff; border:none; padding:12px; border-radius:8px; font-weight:bold; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">Tutup</button>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        const modal = document.getElementById('fallbackCopyModal');
        const modalBox = document.getElementById('fallbackCopyBox');
        requestAnimationFrame(() => { modal.style.opacity = '1'; modalBox.style.transform = 'scale(1)'; document.getElementById('manualLinkInput').select(); });
    };

    if (!navigator.clipboard) {
        const textArea = document.createElement("textarea");
        textArea.value = linkToCopy;
        textArea.style.position = "fixed";  
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        try { document.execCommand('copy'); tampilkanToast("Tautan postingan disalin ke clipboard!"); } 
        catch (err) { tampilkanPopupManual(linkToCopy); }
        document.body.removeChild(textArea);
        return;
    }

    navigator.clipboard.writeText(linkToCopy).then(() => { tampilkanToast("Tautan postingan disalin ke clipboard!"); }).catch(err => { tampilkanPopupManual(linkToCopy); });
};

// Fungsi pembuka teks panjang
window.toggleReadMore = function(id) {
    const el = document.getElementById('text-' + id);
    const btn = document.getElementById('read-more-' + id);
    if (el.classList.contains('collapsed-text')) {
        el.classList.remove('collapsed-text');
        btn.innerText = 'Sembunyikan Teks';
    } else {
        el.classList.add('collapsed-text');
        btn.innerText = 'Lihat Selengkapnya...';
    }
};

window.renderFeed = function(posts) {
    const feedBody = document.getElementById('feedBody'); if (!feedBody) return;
    const namaLoginBersih = String(loggedInUser.nama || "").trim().toLowerCase();

    posts.forEach(p => {
        let mediaHtml = '';
        if (p.media) { 
            try { 
                const mediaPaths = JSON.parse(p.media); 
                if (Array.isArray(mediaPaths) && mediaPaths.length > 0) { 
                    // KODE PERBAIKAN: Hitung jumlah foto & atur Grid Collage
                    let numImgs = mediaPaths.length;
                    let gridClass = 'grid-count-' + (numImgs > 5 ? 5 : numImgs);
                    
                    mediaHtml += `<div class="post-media-grid ${gridClass}">`; 
                    mediaPaths.forEach((path, index) => { 
                        if (index < 5) {
                            let overlayHtml = '';
                            if (numImgs > 5 && index === 4) {
                                let sisa = numImgs - 5;
                                overlayHtml = `<div style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); color:white; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:bold; cursor:zoom-in; border-radius:inherit;" onclick="openMediaModal('${path}', 'image')">+${sisa}</div>`;
                            }
                            
                            mediaHtml += `<div style="position:relative; width:100%; height:100%;">
                                            <img src="${path}" loading="lazy" title="Klik untuk lihat penuh" alt="Foto" onclick="openMediaModal('${path}', 'image')">
                                            ${overlayHtml}
                                          </div>`; 
                        }
                    }); 
                    mediaHtml += '</div>'; 
                } 
            } catch(e) {} 
        }
        
        let videoHtml = ''; if (p.video_link) { videoHtml = generateVideoEmbed(p.video_link); }

        let commentsHtml = '';
        if (p.comments && p.comments.length > 0) {
            const totalComments = p.comments.length; 
            
            // Ambil memori jumlah komentar yang sedang dibuka (Default: 3)
            if (!window.stateKomentarPost) window.stateKomentarPost = {};
            let maxTampil = window.stateKomentarPost[p.id] || 3;
            if (maxTampil > totalComments) maxTampil = totalComments; 
            
            let hiddenCount = totalComments - maxTampil;
            
            // Tombol cicilan 5 per 5 dengan sisa penghitung
            if (hiddenCount > 0) { 
                let sisaTampil = hiddenCount > 5 ? 5 : hiddenCount;
                commentsHtml += `<div id="load-more-btn-${p.id}" style="color: #3b82f6; font-size: 12px; font-weight: 700; cursor: pointer; margin-bottom: 10px; margin-left: 5px; padding: 5px; transition: 0.2s;" onmouseover="this.style.color='#2563eb'" onmouseout="this.style.color='#3b82f6'" onclick="tampilkanSebagianKomentar('${p.id}', ${sisaTampil})">Tampilkan ${sisaTampil} komentar sebelumnya... <span style="color:#94a3b8; font-size:11px; font-weight:normal;">(${hiddenCount} tersisa)</span></div>`; 
            }

            p.comments.forEach((c, i) => {
                const namaKomentatorAsli = c.nama || c.pegawai_id || "Anonim"; const namaKomentatorBersih = String(namaKomentatorAsli).trim().toLowerCase();
                let badgeKomentar = window.getBadgeHTML ? window.getBadgeHTML(c.exp) : ''; 
                if (window.getRoleBadgeHTML) { badgeKomentar += window.getRoleBadgeHTML(c.tingkat); }
                if (window.getCustomTagsHTML) { badgeKomentar += window.getCustomTagsHTML(c.is_donatur, c.is_sangean); }
                
                let dropdownKomentarHtml = ''; 
                if (namaLoginBersih === namaKomentatorBersih || loggedInUser.tingkat === 'God Creator') { 
                    let isKomenOnlyMedia = c.teks.trim().split(/\s+/).length === 1 && c.teks.match(/\.(jpeg|jpg|gif|png|webp)/i);
                    let editKomenBtnHtml = isKomenOnlyMedia ? '' : `<button type="button" onclick="editKomentar('${c.id}')">Edit Teks</button>`;
                    dropdownKomentarHtml = `<div class="post-dropdown" style="position: absolute; top: 10px; right: 5px;"><span class="dots" style="font-size: 18px; padding: 0 5px;" onclick="document.getElementById('dropdown-komentar-${c.id}').classList.toggle('show-dropdown')">⋮</span><div id="dropdown-komentar-${c.id}" class="dropdown-content">${editKomenBtnHtml}<button type="button" onclick="hapusKomentar('${c.id}')" style="color: #e74c3c;">Hapus</button></div></div>`; 
                }
                
                let likesArr = []; try { if (c.likes) likesArr = JSON.parse(c.likes); } catch(e){} let likeCount = likesArr.length; let isLiked = likesArr.some(liker => liker.toLowerCase() === namaLoginBersih); let heartIcon = isLiked ? '❤️' : '🤍';
                
                let actionKomentarHtml = `<div style="font-size: 11px; color: #7f8c8d; margin-top: 5px; display: flex; gap: 15px; align-items: center; font-weight: bold;"><span id="like-btn-${c.id}" data-likes="${likeCount}" data-isliked="${isLiked}" style="cursor: pointer; user-select: none; transition: 0.2s;" onclick="toggleLikeKomentar('${c.id}')"><span style="display:inline-block;">${heartIcon}</span> ${likeCount > 0 ? likeCount : ''} Suka</span><span style="cursor: pointer; transition: 0.2s;" onclick="balasKomentar('${p.id}', '${namaKomentatorAsli}')">💬 Balas</span></div>`;
                
                const fotoKomentatorSrc = c.foto || 'Image/default.jpg';
                const avatarKomentatorInner = window.getAvatarWidget ? window.getAvatarWidget(c.foto, c.frame, '35px', '0 8px 0 0') : `<img src="${fotoKomentatorSrc}" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover; margin-right: 8px; flex-shrink: 0;" onerror="this.onerror=null; this.src='Image/default.jpg';">`;
                const avatarKomentator = `<div style="cursor: zoom-in; flex-shrink: 0; display: inline-flex;" onclick="openProfilePhotoModal('${fotoKomentatorSrc}')" title="Lihat Foto Profil">${avatarKomentatorInner}</div>`;

                let isHidden = i < (totalComments - maxTampil);
                let hiddenStyle = isHidden ? 'display: none;' : 'display: flex;';
                
                const classVIPKomentar = (c.is_donatur == 1 || c.is_donatur == "1") ? 'comment-vip-donatur' : '';
                const waktuRelatif = window.timeAgo(c.tgl_komentar);

                commentsHtml += `<div class="comment-item comment-group-${p.id}" style="${hiddenStyle} margin-bottom:10px;">${avatarKomentator}<div class="comment-bubble ${classVIPKomentar}" style="position: relative; padding-right: 30px;"><span class="comment-author"><a href="javascript:void(0)" onclick="navigasiSPA('profile.html?user=${encodeURIComponent(namaKomentatorAsli)}')" class="link-profil" style="color:inherit; text-decoration:none;">${namaKomentatorAsli}</a>${badgeKomentar}</span><div class="comment-text" id="komentar-text-${c.id}">${formatPesanChat(c.teks)}</div>${actionKomentarHtml}<span class="comment-time" title="${c.tgl_komentar}">${waktuRelatif}</span>${dropdownKomentarHtml}</div></div>`;
            });
        }

        const namaPembuatAsli = p.nama || p.pegawai_id || "Anonim"; const namaPembuatBersih = String(namaPembuatAsli).trim().toLowerCase();
        let badgePost = window.getBadgeHTML ? window.getBadgeHTML(p.exp) : ''; 
        if (window.getRoleBadgeHTML) { badgePost += window.getRoleBadgeHTML(p.tingkat); }
        if (window.getCustomTagsHTML) { badgePost += window.getCustomTagsHTML(p.is_donatur, p.is_sangean); }
        let pinBadgeHtml = ''; if (p.is_pinned == 1) { pinBadgeHtml = `<span style="background-color: #f59e0b; color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 5px; white-space: nowrap; flex-shrink: 0; display: inline-flex; align-items: center;">📌 Disematkan</span>`; }
        
        let dropdownHtml = ''; let pinMenuHtml = '';
        if (loggedInUser.tingkat === 'God Creator') { 
            const statusPinSaatIni = (p.is_pinned == 1) ? 1 : 0; const teksPin = (statusPinSaatIni === 1) ? '🔓 Lepas Sematan' : '📌 Sematkan Postingan'; 
            pinMenuHtml = `<button type="button" onclick="togglePinPost('${p.id}', ${statusPinSaatIni})" style="color: #f59e0b; font-weight: bold;">${teksPin}</button>`; 
        }
        if (namaLoginBersih === namaPembuatBersih || loggedInUser.tingkat === 'God Creator') { 
            dropdownHtml = `<div class="post-dropdown"><span class="dots" onclick="document.getElementById('dropdown-${p.id}').classList.toggle('show-dropdown')">⋮</span><div id="dropdown-${p.id}" class="dropdown-content">${pinMenuHtml}<button type="button" onclick="editPost('${p.id}')">✏️ Edit Teks</button><button type="button" onclick="hapusPost('${p.id}')" style="color: #e74c3c;">🗑️ Hapus Postingan</button></div></div>`; 
        }

        let postLikesArr = []; try { if (p.likes) postLikesArr = JSON.parse(p.likes); } catch(e){} let postLikeCount = postLikesArr.length; let isPostLiked = postLikesArr.some(liker => liker.toLowerCase() === namaLoginBersih); let postHeartIcon = isPostLiked ? '❤️' : '🤍';
        
        let actionPostHtml = `<div style="font-size: 13px; color: #7f8c8d; padding: 10px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee; margin-top: 10px; margin-bottom: 15px; display: flex; gap: 20px; align-items: center; font-weight: bold;">
            <span id="like-post-btn-${p.id}" data-likes="${postLikeCount}" data-isliked="${isPostLiked}" style="cursor: pointer; user-select: none; transition: 0.2s;" onclick="toggleLikePost('${p.id}')"><span style="display:inline-block;">${postHeartIcon}</span> ${postLikeCount > 0 ? postLikeCount : ''} Suka</span>
            <span style="cursor: pointer; transition: 0.2s;" onclick="document.getElementById('input-komentar-${p.id}').focus()">💬 Beri Komentar</span>
            <span style="cursor: pointer; transition: 0.2s; margin-left:auto; color:#3b82f6;" onclick="salinLinkPostingan('${p.id}')" onmouseover="this.style.color='#2563eb'" onmouseout="this.style.color='#3b82f6'">🔗 Bagikan</span>
        </div>`;

        const fotoPembuatSrc = p.foto || 'Image/default.jpg';
        const avatarPembuatInner = window.getAvatarWidget ? window.getAvatarWidget(p.foto, p.frame, '45px', '0 10px 0 0') : `<img src="${fotoPembuatSrc}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; margin-right: 10px; flex-shrink: 0;" onerror="this.onerror=null; this.src='Image/default.jpg';">`;
        const avatarPembuat = `<div style="cursor: zoom-in; flex-shrink: 0; display: inline-flex;" onclick="openProfilePhotoModal('${fotoPembuatSrc}')" title="Lihat Foto Profil">${avatarPembuatInner}</div>`;

        const fotoInputSrc = loggedInUser.foto || 'Image/default.jpg';
        const avatarInputInner = window.getAvatarWidget ? window.getAvatarWidget(loggedInUser.foto, loggedInUser.frame, '35px', '0 8px 0 0') : `<img src="${fotoInputSrc}" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover; margin-right: 8px; flex-shrink: 0;" onerror="this.onerror=null; this.src='Image/default.jpg';">`;
        const avatarInput = `<div style="cursor: zoom-in; flex-shrink: 0; display: inline-flex;" onclick="openProfilePhotoModal('${fotoInputSrc}')" title="Lihat Foto Profil Saya">${avatarInputInner}</div>`;
        
        const classVIPPost = (p.is_donatur == 1 || p.is_donatur == "1") ? 'post-vip-donatur' : '';
        const waktuPostRelatif = window.timeAgo(p.tgl_posting);

        // KODE PERBAIKAN: Analisis Panjang Teks & Penyisipan HTML
        let textToRender = p.teks || '';
        let isLongText = textToRender.length > 700 || (textToRender.match(/\n/g) || []).length > 7;
        let textHtml = formatPesanChat(textToRender);
        let postTextSection = '';
        
        if (isLongText) {
            postTextSection = `
                <div class="post-text collapsed-text" id="text-${p.id}">${textHtml}</div>
                <span id="read-more-${p.id}" class="read-more-btn" onclick="toggleReadMore('${p.id}')">Lihat Selengkapnya...</span>
            `;
        } else {
            postTextSection = `<div class="post-text" id="text-${p.id}">${textHtml}</div>`;
        }

        const postCard = document.createElement('div'); 
        postCard.className = `post-card ${classVIPPost}`; 
        postCard.id = `post-card-${p.id}`;
        postCard.innerHTML = `
            <div class="post-header-top">
                <div class="post-header">${avatarPembuat}
                    <div>
                        <span class="post-author"><a href="javascript:void(0)" onclick="navigasiSPA('profile.html?user=${encodeURIComponent(namaPembuatAsli)}')" class="link-profil" style="color:inherit; text-decoration:none;">${namaPembuatAsli}</a> ${badgePost} ${pinBadgeHtml}</span>
                        <span class="post-time" title="${p.tgl_posting}">${waktuPostRelatif}</span>
                    </div>
                </div>${dropdownHtml}
            </div>
            ${postTextSection}
            ${videoHtml}${mediaHtml}${actionPostHtml}
            <div class="comments-section">
                ${commentsHtml}
                <div class="comment-input-area" style="align-items: center;">
                    ${avatarInput}
                    <span class="btn-stiker-trigger" onclick="openStickerPopup(this, 'comment', '${p.id}')" style="cursor: pointer; margin-right: 10px;" title="Koleksi Stiker Saya">${getStickerIconHtml()}</span>
                    <label for="img-komentar-${p.id}" style="cursor: pointer; margin-right: 10px; font-size: 22px;" title="Lampirkan Gambar">📷</label>
                    <input type="file" id="img-komentar-${p.id}" accept="image/png, image/jpeg, image/webp" style="display: none;" onchange="uploadImageKomentar(this, '${p.id}')">
                    <textarea id="input-komentar-${p.id}" rows="1" placeholder="Tulis komentar..." oninput="this.style.height='auto'; this.style.height=this.scrollHeight+'px';" onkeypress="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); kirimKomentar('${p.id}'); }" style="width: 100%; border: none; background: transparent; font-family: inherit; font-size: 13px; outline: none;"></textarea>
                    <button type="button" onclick="kirimKomentar('${p.id}')" id="btn-komentar-${p.id}">Balas</button>
                </div>
            </div>`;
        feedBody.appendChild(postCard);
    });
    
    if (typeof loadLinkPreviews === 'function') loadLinkPreviews();

    const urlParams = new URLSearchParams(window.location.search);
    const highlightId = urlParams.get('highlight'); const replyToName = urlParams.get('replyto'); 
    if (highlightId) {
        setTimeout(() => {
            const targetPost = document.getElementById('post-card-' + highlightId);
            if (targetPost) {
                targetPost.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetPost.style.transition = "box-shadow 0.5s"; targetPost.style.boxShadow = "0 0 25px rgba(59, 130, 246, 0.7)";
                if (typeof tampilkanSemuaKomentar === 'function') { tampilkanSemuaKomentar(highlightId); }
                const inputKomentar = document.getElementById('input-komentar-' + highlightId);
                if (inputKomentar) { if (replyToName) { inputKomentar.value = `@${replyToName} `; } inputKomentar.focus(); }
                setTimeout(() => { targetPost.style.boxShadow = "0 4px 20px rgba(0,0,0,0.04)"; }, 3000);
            }
        }, 300); 
    }
}

window.compressAndUploadImage = async function(file) {
    const form=new FormData();form.append('action','upload_gambar_base64');form.append('file',file,file.name);const result=await(await fetch('PHP/api_forum.php',{method:'POST',body:form})).json();if(result.status!=='success')throw new Error(result.message||'Upload gagal');return result.url;
}

window.previewFiles = async function(input) {
    const files=input.files;if(!files||!files.length)return;if(uploadedFiles.length+files.length>5){alert('Maksimal 5 Foto!');input.value='';return;}const mediaContainer=document.getElementById('mediaContainer'),previewArea=document.getElementById('previewArea');
    for(let i=0;i<files.length;i++){const file=files[i];if(!file.type.startsWith('image/'))continue;uploadedFiles.push(file);const img=document.createElement('img');img.src=URL.createObjectURL(file);img.className='media-item-preview';mediaContainer.appendChild(img);}if(uploadedFiles.length>0)previewArea.style.display='block';input.value='';
}

window.hapusMedia = function() { uploadedFiles = []; document.getElementById('mediaContainer').innerHTML = ''; document.getElementById('previewArea').style.display = 'none'; }

window.toggleLikePost = async function(postId) {
    const pegawaiId = String(loggedInUser.nama).trim(); const likeSpan = document.getElementById('like-post-btn-' + postId);
    if(likeSpan) { 
        let currentCount = parseInt(likeSpan.getAttribute('data-likes')) || 0; let isLiked = likeSpan.getAttribute('data-isliked') === 'true'; 
        if (isLiked) { 
            currentCount--; likeSpan.setAttribute('data-isliked', 'false'); 
            likeSpan.innerHTML = `<span style="display:inline-block;">🤍</span> ${currentCount > 0 ? currentCount : ''} Suka`; 
        } else { 
            currentCount++; likeSpan.setAttribute('data-isliked', 'true'); 
            // KODE PERBAIKAN: Tambahkan animasi lompat 'popLike'
            likeSpan.innerHTML = `<span style="display:inline-block; animation: popLike 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);">❤️</span> ${currentCount > 0 ? currentCount : ''} Suka`; 
        } 
        likeSpan.setAttribute('data-likes', currentCount); 
    }
    try { await fetch('PHP/api_forum.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'like_post', post_id: postId, pegawai_id: pegawaiId }) }); } catch(e) {}
}

window.toggleLikeKomentar = async function(commentId) {
    const pegawaiId = String(loggedInUser.nama).trim(); const likeSpan = document.getElementById('like-btn-' + commentId);
    if(likeSpan) { 
        let currentCount = parseInt(likeSpan.getAttribute('data-likes')) || 0; let isLiked = likeSpan.getAttribute('data-isliked') === 'true'; 
        if (isLiked) { 
            currentCount--; likeSpan.setAttribute('data-isliked', 'false'); 
            likeSpan.innerHTML = `<span style="display:inline-block;">🤍</span> ${currentCount > 0 ? currentCount : ''} Suka`; 
        } else { 
            currentCount++; likeSpan.setAttribute('data-isliked', 'true'); 
            // KODE PERBAIKAN: Tambahkan animasi lompat 'popLike'
            likeSpan.innerHTML = `<span style="display:inline-block; animation: popLike 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);">❤️</span> ${currentCount > 0 ? currentCount : ''} Suka`; 
        } 
        likeSpan.setAttribute('data-likes', currentCount); 
    }
    try { await fetch('PHP/api_forum.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'like_komentar', comment_id: commentId, pegawai_id: pegawaiId }) }); } catch(e) {}
}

window.balasKomentar = function(postId, namaKomentator) { const inputArea = document.getElementById('input-komentar-' + postId); if(inputArea) { inputArea.value = `@${namaKomentator} `; inputArea.focus(); } }

window.togglePinPost = async function(postId, currentStatus) {
    const newStatus = (currentStatus == 1) ? 0 : 1; const actionText = (newStatus === 1) ? 'menyematkan' : 'melepas sematan';
    const isConf = await showCustomConfirm(`Apakah Anda yakin ingin ${actionText} postingan ini?`, "Konfirmasi Sematan", "📌", "#f59e0b", "#fef3c7");
    if (isConf) { 
        try { 
            const response = await fetch('PHP/api_forum.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle_pin', post_id: postId, is_pinned: newStatus }) }); 
            const result = await response.json(); if (result.status === 'success') { refreshFeedKeepPosition(); } 
        } catch (error) {} 
    }
}

window.kirimKomentar = async function(postId) {
    const inputKomentar = document.getElementById(`input-komentar-${postId}`); const teks = inputKomentar.value.trim(); if (!teks) return;
    const payload = { action: 'buat_komentar', post_id: postId, pegawai_id: String(loggedInUser.id).trim(), teks: teks };
    try { 
        const response = await fetch('PHP/api_forum.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const result = await response.json(); 
        if (result.status === 'success') { if(window.location.href.includes('profile')) refreshProfileFeedKeepPosition(); else refreshFeedKeepPosition(); } 
    } catch (error) {}
}

window.hapusPost = async function(id) { 
    const isConf = await showCustomConfirm("Hapus postingan ini beserta file fisiknya?", "Hapus Postingan");
    if(isConf) { 
        try { 
            await fetch('PHP/api_forum.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'hapus_post', id: id }) }); 
            if(window.location.href.includes('profile')) refreshProfileFeedKeepPosition(); else refreshFeedKeepPosition(); 
        } catch(e) {} 
    } 
}

window.hapusKomentar = async function(id) { 
    const isConf = await showCustomConfirm("Hapus komentar ini secara permanen?", "Hapus Komentar");
    if(isConf) { 
        try { 
            await fetch('PHP/api_forum.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'hapus_komentar', id: id }) }); 
            if(window.location.href.includes('profile')) refreshProfileFeedKeepPosition(); else refreshFeedKeepPosition(); 
        } catch(e) {} 
    } 
}

window.editPost = function(id) {
    // KODE PERBAIKAN: Gembok Anti-Double Click! Jika sedang diedit, abaikan klik selanjutnya.
    if (document.getElementById('edit-input-post-' + id)) return; 
    
    const pTextElement = document.getElementById('text-' + id); if (!pTextElement) return; 
    const teksLama = pTextElement.innerText;
    pTextElement.innerHTML = `
        <textarea id="edit-input-post-${id}" rows="4" style="width:100%; padding:10px; border:2px solid #3498db; border-radius:8px; margin-bottom:10px; font-family:inherit; resize:none; outline:none;" oninput="this.style.height='auto'; this.style.height=this.scrollHeight+'px';">${teksLama}</textarea>
        <div style="display:flex; gap:10px; margin-bottom:15px;">
            <button type="button" onclick="simpanEditPost('${id}')" style="background:#27ae60; color:white; border:none; padding:6px 16px; border-radius:6px; cursor:pointer; font-weight:bold;">Simpan Perubahan</button>
            <button type="button" onclick="window.location.href.includes('profile') ? refreshProfileFeedKeepPosition() : refreshFeedKeepPosition()" style="background:#e74c3c; color:white; border:none; padding:6px 16px; border-radius:6px; cursor:pointer; font-weight:bold;">Batal</button>
        </div>`; 
    setTimeout(() => { const ta = document.getElementById('edit-input-post-' + id); if(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; } }, 10);
}

window.simpanEditPost = async function(id) {
    const textarea = document.getElementById('edit-input-post-' + id); const teksBaru = textarea.value.trim();
    if(teksBaru !== "") { 
        textarea.disabled = true; 
        try { 
            await fetch('PHP/api_forum.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'edit_post', id: id, teks: teksBaru }) }); 
            if(window.location.href.includes('profile')) refreshProfileFeedKeepPosition(); else refreshFeedKeepPosition(); 
        } catch(e) { textarea.disabled = false; } 
    }
}

window.editKomentar = function(id) {
    // KODE PERBAIKAN: Gembok Anti-Double Click untuk Komentar
    if (document.getElementById('edit-input-komentar-' + id)) return; 
    
    const pTextElement = document.getElementById('komentar-text-' + id); if (!pTextElement) return; 
    const teksLama = pTextElement.innerText;
    pTextElement.innerHTML = `
        <textarea id="edit-input-komentar-${id}" rows="2" style="width:100%; padding:8px; border:2px solid #3498db; border-radius:8px; margin-top:5px; margin-bottom:8px; font-family:inherit; resize:none; outline:none;" oninput="this.style.height='auto'; this.style.height=this.scrollHeight+'px';">${teksLama}</textarea>
        <div style="display:flex; gap:8px;">
            <button type="button" onclick="simpanEditKomentar('${id}')" style="background:#27ae60; color:white; border:none; padding:4px 12px; border-radius:5px; cursor:pointer; font-weight:bold; font-size:11px;">Simpan</button>
            <button type="button" onclick="window.location.href.includes('profile') ? refreshProfileFeedKeepPosition() : refreshFeedKeepPosition()" style="background:#e74c3c; color:white; border:none; padding:4px 12px; border-radius:5px; cursor:pointer; font-weight:bold; font-size:11px;">Batal</button>
        </div>`; 
    setTimeout(() => { const ta = document.getElementById('edit-input-komentar-' + id); if(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; } }, 10);
}

window.simpanEditKomentar = async function(id) {
    const textarea = document.getElementById('edit-input-komentar-' + id); const teksBaru = textarea.value.trim();
    if(teksBaru !== "") { 
        textarea.disabled = true; 
        try { 
            await fetch('PHP/api_forum.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'edit_komentar', id: id, teks: teksBaru }) }); 
            if(window.location.href.includes('profile')) refreshProfileFeedKeepPosition(); else refreshFeedKeepPosition(); 
        } catch(e) { textarea.disabled = false; } 
    }
}

window.uploadImageKomentar = async function(input, postId) {
    if (!input.files[0]) return; const btn=document.getElementById(`btn-komentar-${postId}`); const oldText=btn.innerText; btn.innerText='⏳'; btn.disabled=true;
    try { const form=new FormData(); form.append('action','buat_komentar'); form.append('post_id',postId); form.append('teks',document.getElementById(`input-komentar-${postId}`).value.trim()); form.append('media',input.files[0],input.files[0].name); const result=await(await fetch('PHP/api_forum.php',{method:'POST',body:form})).json(); if(result.status==='success'){if(window.location.href.includes('profile'))refreshProfileFeedKeepPosition();else refreshFeedKeepPosition();}else alert(result.message||'Gagal mengunggah gambar.'); } catch(e){alert('Gagal mengunggah gambar.');} finally{btn.innerText=oldText;btn.disabled=false;input.value='';}
}

// ==========================================
// KEMBALIKAN FUNGSI CHAT YANG HILANG + EFEK VIP DONATUR
// ==========================================
window.buildChatBubble = function(m) {
    const isMe = m.sender_id === loggedInUser.id; 
    const bubClass = isMe ? 'me' : 'them';
    
    // Cek Status Lencana VIP Donatur di Chat
    const isVIPChat = isMe ? (loggedInUser.is_donatur == 1 || loggedInUser.is_donatur == "1") : (m.is_donatur == 1 || m.is_donatur == "1");
    const classVIPChat = isVIPChat ? 'chat-vip-donatur' : '';

    const tgl = new Date(m.created_at); 
    const jam = String(tgl.getHours()).padStart(2, '0') + ':' + String(tgl.getMinutes()).padStart(2, '0');
    let dropdownHtml = '';
    
    let msgTrimmed = m.message.trim();
    let isOnlyMedia = msgTrimmed.split(/\s+/).length === 1 && msgTrimmed.match(/\.(jpeg|jpg|gif|png|webp)/i);
    
    let extraBubbleStyle = isOnlyMedia ? 'background: transparent !important; box-shadow: none !important; padding: 0 !important; border: none !important; animation: none !important;' : '';
    let extraTextStyle = isOnlyMedia ? 'padding-right: 0;' : 'padding-right: 15px;';
    
    let timeStyle = isOnlyMedia ? 'position: absolute; background: rgba(0,0,0,0.5); color: #ffffff; padding: 2px 6px; border-radius: 10px; right: 6px; bottom: 8px; font-weight: 600; z-index: 5;' : '';
    
    if (isMe) {
        const safeMsg = m.message.replace(/'/g, "&#39;").replace(/"/g, "&quot;").replace(/\n/g, "\\n");
        let btnStyle = isOnlyMedia ? 'top: 6px; right: 6px; background: rgba(0,0,0,0.4); color: white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 10px; z-index: 5;' : '';
        
        // KODE PERBAIKAN: Hilangkan Tombol Edit Jika Pesan Hanya Foto/Stiker
        let btnEditHtml = isOnlyMedia ? '' : `<button onclick="editPrivateChat('${m.id}', '${safeMsg}')">✏️ Edit Pesan</button>`;
        
        dropdownHtml = `<button class="chat-dropdown-btn" style="${btnStyle}" onclick="toggleChatMenu(event, '${m.id}')">▼</button>
        <div id="chat-menu-${m.id}" class="chat-dropdown-menu">
            ${btnEditHtml}
            <button onclick="deletePrivateChat('${m.id}')" style="color:#e74c3c;">🗑️ Hapus Pesan</button>
        </div>`;
    }
    
    return `<div class="chat-bubble ${bubClass} ${classVIPChat}" style="${extraBubbleStyle}">
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
    if(!input.files[0]||!chatActiveTargetId)return; const btn=document.getElementById('btnSendChat');const oldText=btn.innerText;btn.innerText='⏳';btn.disabled=true;
    try{const form=new FormData();form.append('action','send_chat');form.append('target_id',chatActiveTargetId);form.append('message',document.getElementById('chatInputMessage').value.trim());form.append('media',input.files[0],input.files[0].name);const result=await(await fetch('PHP/api_forum.php',{method:'POST',body:form})).json();if(result.status==='error')alert(result.message);else{lastMessagesData='';fetchPrivateChats();}}catch(e){alert('Gagal mengunggah gambar.');}finally{btn.innerText=oldText;btn.disabled=false;input.value='';}
}

window.currentSortForum = 'latest';

window.changeForumSort = function(type) {
    window.currentSortForum = type;
    const btnLatest = document.getElementById('btnSortLatest');
    const btnTrending = document.getElementById('btnSortTrending');
    
    if (type === 'latest') {
        btnLatest.style.background = '#3b82f6'; btnLatest.style.color = 'white'; btnLatest.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        btnTrending.style.background = '#f1f5f9'; btnTrending.style.color = '#64748b'; btnTrending.style.boxShadow = 'none';
    } else {
        btnTrending.style.background = '#f59e0b'; btnTrending.style.color = 'white'; btnTrending.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        btnLatest.style.background = '#f1f5f9'; btnLatest.style.color = '#64748b'; btnLatest.style.boxShadow = 'none';
    }
    fetchPosts(true);
};

window.currentHashtagFilter = '';

window.filterByHashtag = function(tag) {
    window.currentHashtagFilter = tag;
    
    // Buat banner indikator filter yang elegan di atas forum
    let indikator = document.getElementById('hashtagFilterIndicator');
    if (!indikator) {
        indikator = document.createElement('div');
        indikator.id = 'hashtagFilterIndicator';
        indikator.style.cssText = 'background: #eff6ff; color: #1e3a8a; padding: 12px 20px; border-radius: 12px; margin-bottom: 20px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; border: 1px solid #bfdbfe; box-shadow: 0 4px 6px rgba(0,0,0,0.05); animation: fadeIn 0.3s ease;';
        const feedBody = document.getElementById('feedBody');
        if (feedBody) feedBody.insertAdjacentElement('beforebegin', indikator);
    }
    
    indikator.innerHTML = `<div style="display:flex; align-items:center; gap:8px;"><span style="font-size:18px;">🔍</span> <span>Menelusuri tagar: <b style="color:#2563eb; font-size:15px;">#${tag}</b></span></div> <button onclick="clearHashtagFilter()" style="background: #ef4444; color: white; border: none; border-radius: 8px; padding: 6px 12px; cursor: pointer; font-size: 12px; font-weight: bold; transition:0.2s;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">✖ Hapus Filter</button>`;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchPosts(true); // Tarik ulang data dari server
};

window.clearHashtagFilter = function() {
    window.currentHashtagFilter = '';
    const indikator = document.getElementById('hashtagFilterIndicator');
    if (indikator) indikator.remove();
    fetchPosts(true);
};

// ==========================================
// PUSHER & SOUND NOTIFICATIONS
// ==========================================
window.globalAudioCtx = null;
function unlockBrowserAudio() {
    if (!window.globalAudioCtx) { const AudioContext = window.AudioContext || window.webkitAudioContext; if (AudioContext) window.globalAudioCtx = new AudioContext(); }
    if (window.globalAudioCtx && window.globalAudioCtx.state === 'suspended') { window.globalAudioCtx.resume(); }
    document.removeEventListener('click', unlockBrowserAudio); document.removeEventListener('keydown', unlockBrowserAudio);
}
document.addEventListener('click', unlockBrowserAudio); document.addEventListener('keydown', unlockBrowserAudio);

window.playNotifSound = function() {
    try {
        if (!window.globalAudioCtx) return; if (window.globalAudioCtx.state === 'suspended') window.globalAudioCtx.resume();
        const ctx = window.globalAudioCtx; const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.50, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(2093.00, ctx.currentTime + 0.1); 
        gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.15);
    } catch(e) {}
};

window.getKunciNotifikasi = function(notif) {
    if (!notif) return '';

    if (notif.jenis_notif === 'chat') {
        return (
            'chat:' +
            String(notif.chat_id || '')
        );
    }

    return (
        'forum:' +
        String(notif.comment_id || '')
    );
};

window.hapusKunciNotifTerlihat = function(kunci) {
    let seenKeys = [];

    try {
        seenKeys = JSON.parse(
            sessionStorage.getItem(
                'notifSeenKeys'
            ) || '[]'
        );
    } catch (error) {
        seenKeys = [];
    }

    seenKeys = seenKeys.filter(
        function(item) {
            return item !== kunci;
        }
    );

    sessionStorage.setItem(
        'notifSeenKeys',
        JSON.stringify(seenKeys)
    );
};

window.bukaPostinganDariNotif =
    async function(
        postId,
        commenterName = '',
        commentId = ''
    ) {
        const menu =
            document.getElementById(
                'notifMenu'
            );

        if (menu) {
            menu.style.display = 'none';
        }

        try {
            const response = await fetch(
                'PHP/api_forum.php',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json'
                    },
                    body: JSON.stringify({
                        action: 'read_notif',
                        comment_id: commentId
                    })
                }
            );

            const result =
                await response.json();

            if (
                !response.ok ||
                result.status !== 'success'
            ) {
                throw new Error(
                    result.message ||
                    'Pemberitahuan gagal dibaca.'
                );
            }

            window.hapusKunciNotifTerlihat(
                'forum:' +
                String(commentId)
            );
        } catch (error) {
            console.warn(
                'Gagal menandai pemberitahuan:',
                error
            );
        }

        let targetUrl =
            `forum.html?highlight=${postId}`;

        if (commenterName) {
            targetUrl +=
                '&replyto=' +
                encodeURIComponent(
                    commenterName
                );
        }

        navigasiSPA(targetUrl);
    };

window.startRealtimeFallbackPolling = function() {
    if (window.realtimeFallbackTimer) return;
    window.realtimeFallbackTimer = setInterval(function() {
        if (document.hidden) return;
        if (typeof pingOnlineStatus === 'function') pingOnlineStatus();
        if (typeof cekNotifikasiLonceng === 'function') cekNotifikasiLonceng();
        if (typeof checkUnreadChatsUIOnly === 'function') checkUnreadChatsUIOnly();
        if (chatActiveTargetId && typeof fetchPrivateChats === 'function') {
            lastMessagesData = '';
            fetchPrivateChats();
        }

        const feedBody = document.getElementById('feedBody');
        if (feedBody) {
            if (window.location.href.includes('profile') && typeof refreshProfileFeedKeepPosition === 'function') {
                refreshProfileFeedKeepPosition();
            } else if (typeof refreshFeedKeepPosition === 'function') {
                refreshFeedKeepPosition();
            }
        }
    }, 30000);
};

window.stopRealtimeFallbackPolling = function() {
    if (!window.realtimeFallbackTimer) return;
    clearInterval(window.realtimeFallbackTimer);
    window.realtimeFallbackTimer = null;
};

window.initPusherClient = async function() {
    if (!loggedInUser || !loggedInUser.id || window.pusherInstance) return;
    if (typeof Pusher === 'undefined') {
        startRealtimeFallbackPolling();
        return;
    }

    try {
        const configResponse = await fetch('PHP/pusher_config.php', {
            cache: 'no-store',
            headers: { 'Accept': 'application/json' }
        });
        const config = await configResponse.json();
        if (!configResponse.ok || config.status !== 'success' || !config.key) {
            throw new Error(config.message || 'Konfigurasi realtime tidak tersedia.');
        }

        Pusher.logToConsole = false;
        window.pusherInstance = new Pusher(config.key, {
            cluster: config.cluster || 'ap1',
            forceTLS: true,
            channelAuthorization: {
                endpoint: 'PHP/pusher_auth.php',
                transport: 'ajax',
                headersProvider: function() {
                    return {
                        'X-CSRF-Token': sessionStorage.getItem('csrf_token') || ''
                    };
                }
            }
        });

        window.pusherInstance.connection.bind('state_change', function(states) {
            if (states.current === 'connected') stopRealtimeFallbackPolling();
            if (states.current === 'failed' || states.current === 'unavailable' || states.current === 'disconnected') {
                startRealtimeFallbackPolling();
            }
        });
        window.pusherInstance.connection.bind('error', function() {
            startRealtimeFallbackPolling();
        });

        const privateChannel = window.pusherInstance.subscribe('private-chat-user-' + loggedInUser.id);
        privateChannel.bind('pusher:subscription_error', function() {
            startRealtimeFallbackPolling();
        });
        privateChannel.bind('pesan_baru', function(data) {
            playNotifSound();
            if (document.getElementById('chatWindow') && document.getElementById('chatWindow').style.display !== 'none' && chatActiveTargetId === data.sender_id) {
                const container = document.getElementById('chatMessagesList');
                if (container) {
                    const bubbleHtml = buildChatBubble(data);
                    container.insertAdjacentHTML('beforeend', bubbleHtml);
                    container.scrollTop = container.scrollHeight;
                    if (typeof loadLinkPreviews === 'function') loadLinkPreviews();
                }
            } else {
                checkUnreadChatsUIOnly();
            }
            cekNotifikasiLonceng();
        });

        privateChannel.bind('mention_baru', function() {
            playNotifSound();
            cekNotifikasiLonceng();
            if (document.getElementById('feedBody') && typeof refreshFeedKeepPosition === 'function') {
                refreshFeedKeepPosition();
            }
        });
        const globalChannel = window.pusherInstance.subscribe('private-channel-global');
        globalChannel.bind('pusher:subscription_error', function() {
            startRealtimeFallbackPolling();
        });
        globalChannel.bind('update_online', function(data) {
            const countText = document.getElementById('onlineCountText');
            if (countText && data.online_count !== undefined) {
                countText.textContent = ` ${data.online_count} Pengguna Online`;
            }
        });
        globalChannel.bind('refresh_feed', function() {
            if (document.getElementById('feedBody')) {
                if (window.location.href.includes('profile')) refreshProfileFeedKeepPosition();
                else refreshFeedKeepPosition();
            }
            cekNotifikasiLonceng();
        });
    } catch (error) {
        console.warn('Realtime tidak tersedia; polling fallback diaktifkan.', error);
        if (window.pusherInstance) {
            window.pusherInstance.disconnect();
            window.pusherInstance = null;
        }
        startRealtimeFallbackPolling();
    }
}

// FUNGSI BARU: Aksi ketika Notifikasi Chat di Lonceng diklik
window.bukaChatDariNotif = async function(
    senderId,
    senderName,
    chatId = ''
) {
    const menu = document.getElementById('notifMenu'); 
    if (menu) menu.style.display = 'none';
    
    window.hapusKunciNotifTerlihat('chat:' + String(chatId));
    
    const w = document.getElementById('chatWindow');
    if (w) w.style.display = 'flex';
    
    openChat(senderId, senderName);
    
    setTimeout(() => { cekNotifikasiLonceng(); checkUnreadChatsUIOnly(); }, 1000);
};

window.cekNotifikasiLonceng = async function() {
    try {
        const res = await fetch('PHP/api_forum.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'get_notif'})
        });

        const result = await res.json();

        if (result.status === 'success') {
            /* Simpan data mentah ke variabel global agar bisa dibaca oleh toggleNotifikasi */
            window.notifikasiLoncengData = result.data || [];

            const badge = document.getElementById('notifBadge');
            const notifBody = document.getElementById('notifBody');

            /* Ambil kunci yang sudah pernah terlihat */
            const seenKeys = new Set(
                JSON.parse(sessionStorage.getItem('notifSeenKeys') || '[]')
            );

            /* Hitung notifikasi yang BELUM PERNAH TERCULAP */
            let unseenCount = 0;
            let unreadHtml = '';

            for (const n of window.notifikasiLoncengData) {
                const key = n.type + ':' + (n.chat_id || n.comment_id);

                if (!seenKeys.has(key)) {
                    unseenCount++;

                    /* Render HTML untuk setiap item notifikasi */
                    if (n.type === 'chat') {
                        unreadHtml += `<div class="notif-item" onclick="bukaChatDariNotif('${n.sender_id}', '${n.commenter_name.replace(/'/g, "\\'")}', '${n.chat_id}')">`;
                        unreadHtml += `<div style="display:flex; align-items:center; gap:12px;">`;
                        unreadHtml += `<img src="${n.avatar_url}" style="width:48px; height:48px; border-radius:50%; object-fit:cover; border:2px solid #3b82f6;">`;
                        unreadHtml += `<div>`;
                        unreadHtml += `<div style="font-weight:bold;
                        color:#0f172a;">${escapeHtml(n.commenter_name)}</div>`;
                        unreadHtml += `<div style="color:#64748b; font-size:13px;">${escapeHtml(n.message_short)}</div>`;
                        unreadHtml += `<div style="color:#94a3b8; font-size:11px;">${formatWaktu(n.created_at)}</div>`;
                        unreadHtml += `</div></div></div>`;
                    } else if (n.type === 'forum') {
                        unreadHtml += `<div class="notif-item" onclick="bukaPostinganDariNotif('${n.post_id}', '${n.commenter_name.replace(/'/g, "\\'")}', '${n.comment_id}')">`;
                        unreadHtml += `<div style="display:flex; align-items:center; gap:12px;">`;
                        unreadHtml += `<img src="${n.avatar_url}" style="width:48px; height:48px; border-radius:50%; object-fit:cover; border:2px solid #3b82f6;">`;
                        unreadHtml += `<div>`;
                        unreadHtml += `<div style="font-weight:bold; color:#0f172a;">${escapeHtml(n.commenter_name)}</div>`;
                        unreadHtml += `<div style="color:#64748b; font-size:13px;">${escapeHtml(n.post_title)}</div>`;
                        unreadHtml += `<div style="color:#94a3b8; font-size:11px;">${formatWaktu(n.created_at)}</div>`;
                        unreadHtml += `</div></div></div>`;
                    }
                }
            }

            /* Update badge hanya dengan tidak terkira yang belum dilihat */
            if (unreadHtml !== '') {
                if (badge) {
                    badge.innerText = unseenCount;
                    badge.style.display = 'inline-block';
                }

                if (notifBody) {
                    notifBody.innerHTML = unreadHtml;
                }
            } else {
                if (badge) {
                    badge.style.display = 'none';
                }

                if (notifBody) {
                    notifBody.innerHTML = '<div class="notif-empty">Tidak ada pemberitahuan baru</div>';
                }
            }

            /* Mainkan suara jika ada notifikasi baru (belum pernah tampil sebelumnya) */
            const prevUnseen = parseInt(sessionStorage.getItem('prevUnseenCount') || 0);
            if (unseenCount > prevUnseen) {
                playNotifSound();
                sessionStorage.setItem('prevUnseenCount', unseenCount);
            }

        }
    } catch (error) {
        console.warn('Gagal mengambil notifikasi:', error);
    }
}
// =========================================================
// FITUR @MENTION RINGAN (ZERO SERVER LOAD)
// =========================================================
window.forumUsersList = [];
window.activeMentionTextarea = null;

// 1. Fungsi Mengambil Data 1x Saja
window.fetchUsersForMention = async function() {
    const cacheKey = 'forumUsersListV2';
    if(sessionStorage.getItem(cacheKey)) {
        window.forumUsersList = JSON.parse(sessionStorage.getItem(cacheKey));
        return;
    }
    try {
        const res = await fetch('PHP/api_pegawai.php?limit=summary', {
            cache: 'no-store',
            headers: { 'Accept': 'application/json' }
        });
        const result = await res.json();
        if(result.status === 'success') {
            window.forumUsersList = result.data.map(p => ({
                nama: p.nama,
                foto: p.foto || 'Image/default.jpg'
            }));
            sessionStorage.setItem(cacheKey, JSON.stringify(window.forumUsersList));
            sessionStorage.removeItem('forumUsersList');
        }
    } catch(e){}
};

// 2. Buat Wadah Dropdown secara gaib saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('mentionDropdown')) {
        const div = document.createElement('div');
        div.id = 'mentionDropdown';
        div.className = 'mention-dropdown';
        document.body.appendChild(div);

        // Sembunyikan popup jika user mengklik sembarang tempat
        document.addEventListener('click', (e) => {
            if(!e.target.closest('.mention-dropdown')) div.style.display = 'none';
        });
    }
});

// 3. Sensor Ketikan Real-time di Seluruh Textarea (Post, Komentar, Edit, Chat)
document.addEventListener('input', function(e) {
    if (e.target.tagName === 'TEXTAREA' && (e.target.id.startsWith('input-komentar-') || e.target.id.startsWith('edit-input-') || e.target.id === 'postText' || e.target.id === 'chatInputMessage')) {
        handleMention(e.target);
    }
});

// 4. Logika Pencarian Pintar
window.handleMention = function(textarea) {
    const val = textarea.value;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = val.substring(0, cursorPos);

    // Cari teks yang diawali '@' tepat sebelum kursor
    const mentionMatch = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_ ]*)$/);
    const dropdown = document.getElementById('mentionDropdown');
    if (!dropdown) return;

    if (mentionMatch) {
        let query = mentionMatch[1].toLowerCase();
        
        // Nama lengkap dapat terdiri dari banyak kata; pencarian berhenti saat pengguna memilih hasil.
        // Cari 5 orang pertama yang namanya cocok dari Memori HP
        const filtered = window.forumUsersList.filter(u => u.nama.toLowerCase().includes(query)).slice(0, 5);

        if (filtered.length > 0) {
            dropdown.innerHTML = filtered.map(u =>
                `<div class="mention-item" onclick="insertMention('${u.nama.replace(/'/g, "\\'")}')">
                    <img src="${u.foto}" class="mention-avatar" onerror="this.src='Image/default.jpg'"> 
                    ${u.nama}
                </div>`
            ).join('');

            // Posisikan popup tepat di atas kolom ketikan agar tidak tertutup Keyboard HP
            const rect = textarea.getBoundingClientRect();
            dropdown.style.left = Math.max(10, rect.left) + 'px';
            dropdown.style.bottom = (window.innerHeight - rect.top + 5) + 'px';
            dropdown.style.display = 'block';

            window.activeMentionTextarea = textarea;
        } else {
            dropdown.style.display = 'none';
        }
    } else {
        dropdown.style.display = 'none';
    }
};

// 5. Menyisipkan Nama yang Diklik ke dalam Kolom Teks
window.insertMention = function(namaLengkap) {
    if(!window.activeMentionTextarea) return;
    const textarea = window.activeMentionTextarea;
    const val = textarea.value;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = val.substring(0, cursorPos);
    const textAfterCursor = val.substring(cursorPos);

    // Ganti kata setelah @ dengan Nama Lengkap
    const matchStart = textBeforeCursor.lastIndexOf('@');
    if (matchStart !== -1) {
        const newTextBefore = textBeforeCursor.substring(0, matchStart);
        textarea.value = newTextBefore + '@' + namaLengkap + ' ' + textAfterCursor;
        
        // Atur ulang tinggi kotak teks
        textarea.style.height = 'auto'; 
        textarea.style.height = textarea.scrollHeight + 'px';

        // Pindahkan kursor ke depan nama
        const newCursorPos = newTextBefore.length + namaLengkap.length + 2; 
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
    }
    document.getElementById('mentionDropdown').style.display = 'none';
}

// ==========================================
// FITUR AKSI STIKER (TAMBAHKAN & HAPUS) SAAT DIKLIK
// ==========================================
window.bukaOpsiStiker = function(event, imgElement, url) {
    event.stopPropagation();
    
    // Hapus menu lama jika ada
    const oldMenu = document.getElementById('stickerActionMenu');
    if (oldMenu) oldMenu.remove();

    // Cek kepemilikan pesan jika berada di dalam chat private atau komentar
    let isMyMessage = false;
    let msgId = null;
    let deleteAction = '';

    // 1. Cek jika stiker ada di Private Chat
    const chatBubble = imgElement.closest('.chat-bubble');
    if (chatBubble) {
        if (chatBubble.classList.contains('me')) isMyMessage = true;
        const textDiv = chatBubble.querySelector('[id^="chat-text-"]');
        if (textDiv) {
            msgId = textDiv.id.replace('chat-text-', '');
            deleteAction = `deletePrivateChat('${msgId}')`;
        }
    }

    // 2. Cek jika stiker ada di Komentar Forum
    const commentBubble = imgElement.closest('.comment-item');
    if (commentBubble) {
        const authorEl = commentBubble.querySelector('.comment-author a');
        if (authorEl && authorEl.innerText.trim().toLowerCase() === loggedInUser.nama.toLowerCase()) {
            isMyMessage = true;
        }
        const textDiv = commentBubble.querySelector('[id^="komentar-text-"]');
        if (textDiv) {
            msgId = textDiv.id.replace('komentar-text-', '');
            deleteAction = `hapusKomentar('${msgId}')`;
        }
    }

    // 3. Cek jika stiker ada di Postingan Utama Forum
    const postCard = imgElement.closest('.post-card');
    if (postCard && !commentBubble) {
        const authorEl = postCard.querySelector('.post-author a');
        if (authorEl && authorEl.innerText.trim().toLowerCase() === loggedInUser.nama.toLowerCase()) {
            isMyMessage = true;
        }
        msgId = postCard.id.replace('post-card-', '');
        deleteAction = `hapusPost('${msgId}')`;
    }
    
    // Hak istimewa untuk God Creator (bisa hapus semua)
    if (loggedInUser.tingkat === 'God Creator') isMyMessage = true;

    // Tombol Hapus Pesan HANYA muncul jika itu pesan miliknya
    let btnHapusHtml = (isMyMessage && deleteAction !== '') 
        ? `<button onclick="${deleteAction}; document.getElementById('stickerActionMenu').remove();" style="display:block; width:100%; text-align:left; padding:10px 15px; border:none; background:none; font-size:12px; font-weight:bold; cursor:pointer; color:#e74c3c;">🗑️ Hapus Pesan</button>` 
        : '';

    const menuHtml = `
    <div id="stickerActionMenu" style="position:absolute; background:white; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.2); z-index:100000; border:1px solid #e2e8f0; overflow:hidden; min-width:160px; padding: 5px 0; animation: fadeIn 0.2s;">
        <button onclick="simpanStikerOrangLain('${url}'); document.getElementById('stickerActionMenu').remove();" style="display:block; width:100%; text-align:left; padding:10px 15px; border:none; background:none; font-size:12px; font-weight:bold; cursor:pointer; color:#3b82f6; border-bottom: ${btnHapusHtml ? '1px solid #f1f5f9' : 'none'}; transition:0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='none'">🌟 Tambahkan Stiker</button>
        ${btnHapusHtml}
    </div>`;

    document.body.insertAdjacentHTML('beforeend', menuHtml);

    const menu = document.getElementById('stickerActionMenu');
    
    // Posisikan menu tepat di titik ujung mouse
    let posX = event.pageX;
    let posY = event.pageY;

    // Cegah menu terpotong/hilang dari tepi kanan layar HP
    if (posX + 180 > window.innerWidth) posX = window.innerWidth - 180;
    
    menu.style.left = posX + 'px';
    menu.style.top = posY + 'px';

    // Auto-tutup menu jika klik di tempat lain
    setTimeout(() => {
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        document.addEventListener('click', closeMenu);
    }, 10);
}

// Logika gaib di balik layar untuk menyalin gambar orang lain menjadi milik kita
window.simpanStikerOrangLain = async function(url) {
    try{const res=await fetch(url);const blob=await res.blob();const form=new FormData();form.append('action','tambah_stiker');form.append('file',new File([blob],'sticker.png',{type:blob.type||'image/png'}));const result=await(await fetch('PHP/api_pegawai.php',{method:'POST',body:form})).json();if(result.status==='success'){loggedInUser.stiker=result.stiker;sessionStorage.setItem('loggedInUser',JSON.stringify(loggedInUser));updateAllStickerIcons();}else alert('Gagal menambahkan stiker.');}catch(e){alert('Terjadi kesalahan jaringan saat menyimpan stiker.');}
}


// ==========================================
// PENJAGA TOMBOL STIKER CHAT GLOBAL
// ==========================================
// Memastikan tombol stiker di obrolan privat selalu muncul di halaman manapun
setInterval(() => {
    // Cari semua kotak input chat yang ada di layar
    const chatInputs = document.querySelectorAll('#chatInputMessage');
    
    chatInputs.forEach(input => {
        const parent = input.parentElement;
        
        // Jika kotak input chat ada, tapi tombol stikernya hilang/tidak ada
        if (parent && !parent.querySelector('.btn-stiker-trigger')) {
            // Suntikkan kembali tombol stikernya
            const stickerBtnHtml = `<span class="btn-stiker-trigger" onclick="openStickerPopup(this, 'chat', null)" style="cursor:pointer; margin-right:8px; display:flex; align-items:center;" title="Koleksi Stiker Saya">${typeof getStickerIconHtml === 'function' ? getStickerIconHtml() : '🌟'}</span>`;
            input.insertAdjacentHTML('beforebegin', stickerBtnHtml);
        }
    });
}, 1500); // Sistem akan mengecek dan menjaga tombol ini setiap 1,5 detik

setTimeout(() => { if (typeof initPusherClient === 'function') initPusherClient(); if (typeof cekNotifikasiLonceng === 'function') cekNotifikasiLonceng(); }, 1000);