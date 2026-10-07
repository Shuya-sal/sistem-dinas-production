var profilePosts = [];
var currentUserObj = null;
var currentOffsetProfile = 0;
var postsLimitProfile = 10;
var isFetchingDataProfile = false;
var hasMorePostsProfile = true;

window.initProfileSPA = async function() {
    loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser')) || {};
    
    const urlParams = new URLSearchParams(window.location.search);
    var targetUser = urlParams.get('user') || loggedInUser.nama;

    try {
        const resPegawai = await fetch(`PHP/api_pegawai.php?profile=${encodeURIComponent(targetUser)}`, {
            cache: 'no-store',
            headers: { 'Accept': 'application/json' }
        });
        const responseText = await resPegawai.text();
        let resultPegawai;
        try {
            resultPegawai = JSON.parse(responseText);
        } catch (_) {
            throw new Error(`Respons profil bukan JSON yang valid (HTTP ${resPegawai.status}).`);
        }
        if (!resPegawai.ok || resultPegawai.status !== 'success' || !resultPegawai.data) {
            throw new Error(resultPegawai.message || `Profil gagal dimuat (HTTP ${resPegawai.status}).`);
        }

        currentUserObj = resultPegawai.data;

        let editCoverBtn = ''; 
        let currentCover = currentUserObj.cover || ''; 
        let coverBg = currentCover ? `url('${currentCover}')` : 'linear-gradient(135deg, #1e293b, #3b82f6, #a855f7)';
        let coverCursor = currentCover ? 'cursor: zoom-in;' : '';
        let coverClickEvent = currentCover ? `onclick="if(event.target === this) openMediaModal('${currentCover}', 'image')"` : '';
        
        if (currentUserObj.id === loggedInUser.id) {
            editCoverBtn = `
                <div style="position: absolute; top: 15px; right: 15px; z-index: 50;">
                    <button onclick="toggleCoverMenu(event)" style="background: rgba(0,0,0,0.5); color: white; border: none; width: 36px; height: 36px; border-radius: 8px; font-size: 20px; font-weight: bold; cursor: pointer; backdrop-filter: blur(4px); transition: 0.2s; display: flex; align-items: center; justify-content: center; padding-bottom: 2px;">⋮</button>
                    <div id="coverDropdown" style="display: none; position: absolute; top: 100%; right: 0; margin-top: 8px; background: white; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); overflow: hidden; min-width: 180px; text-align: left; border: 1px solid #e2e8f0;">
                        <label style="display: block; padding: 12px 15px; color: #334155; font-size: 13px; font-weight: 600; cursor: pointer; border-bottom: 1px solid #f1f5f9; margin: 0;">👤 Ubah Foto Profil<input type="file" accept="image/png, image/jpeg, image/webp" style="display:none;" onchange="uploadProfilePic(this)"></label>
                        <div onclick="hapusFotoProfil()" style="padding: 12px 15px; color: #e74c3c; font-size: 13px; font-weight: 600; cursor: pointer; border-bottom: 1px solid #f1f5f9; margin: 0;">🗑️ Hapus Foto Profil</div>
                        
                        <label style="display: block; padding: 12px 15px; color: #334155; font-size: 13px; font-weight: 600; cursor: pointer; border-bottom: 1px solid #f1f5f9; margin: 0;">💠 Pasang Bingkai (PNG)<input type="file" accept="image/png, image/webp" style="display:none;" onchange="uploadFrame(this)"></label>
                        <div onclick="hapusFrame()" style="padding: 12px 15px; color: #e74c3c; font-size: 13px; font-weight: 600; cursor: pointer; border-bottom: 1px solid #f1f5f9; margin: 0;">✖️ Lepas Bingkai</div>
                        
                        <label style="display: block; padding: 12px 15px; color: #334155; font-size: 13px; font-weight: 600; cursor: pointer; border-bottom: 1px solid #f1f5f9; margin: 0;">🌄 Ubah Sampul<input type="file" accept="image/png, image/jpeg, image/webp" style="display:none;" onchange="uploadCover(this)"></label>
                        <div onclick="hapusCover()" style="padding: 12px 15px; color: #e74c3c; font-size: 13px; font-weight: 600; cursor: pointer; border-bottom: 1px solid #f1f5f9; margin: 0;">🗑️ Hapus Sampul</div>
                        
                        <!-- Menu Background Halaman -->
                        <label style="display: block; padding: 12px 15px; color: #334155; font-size: 13px; font-weight: 600; cursor: pointer; border-top: 3px solid #e2e8f0; border-bottom: 1px solid #f1f5f9; margin: 0;">🎨 Ubah Latar Halaman<input type="file" accept="image/png, image/jpeg, image/webp" style="display:none;" onchange="uploadBackground(this)"></label>
                        <div onclick="hapusBackground()" style="padding: 12px 15px; color: #e74c3c; font-size: 13px; font-weight: 600; cursor: pointer; margin: 0;">🗑️ Hapus Latar Halaman</div>
                        
                        <!-- MENU GANTI PASSWORD -->
                        <div onclick="bukaModalPassword()" style="padding: 12px 15px; color: #0284c7; font-size: 13px; font-weight: 600; cursor: pointer; border-top: 3px solid #e2e8f0; margin: 0;">🔑 Ganti Password</div>
                    </div>
                </div>`;
        }

        const hasFrame = currentUserObj.frame ? true : false;
        let textBagian = currentUserObj.bagian ? currentUserObj.bagian + ' • ' : '';
        let textNip = currentUserObj.nip ? 'NIP: ' + currentUserObj.nip + ' • ' : '';
        let textJabatan = currentUserObj.jabatan || 'Pegawai';
        let profileRoleString = `${textBagian}${textNip}${textJabatan} | ${currentUserObj.tingkat}`;

        let profileBadgeHtml = window.getBadgeHTML ? window.getBadgeHTML(currentUserObj.exp) : '';
        if (window.getRoleBadgeHTML) {
            profileBadgeHtml += window.getRoleBadgeHTML(currentUserObj.tingkat);
        }
        /* KODE BARU: Memunculkan Semua Tag Lencana Custom di Halaman Profil */
        if (window.getCustomTagsHTML) {
            profileBadgeHtml += window.getCustomTagsHTML(currentUserObj.is_donatur, currentUserObj.is_sangean);
        }

        // ==========================================
        // KODE BARU: LOGIKA PERHITUNGAN PROGRES POIN (SINKRON DENGAN LENCANA)
        // ==========================================
        let currentExp = parseInt(currentUserObj.exp) || 0;
        
        // Sinkronisasi dengan syarat EXP lencana di gembok.js
        const tiers = [
            { name: 'Belum Ada Lencana', min: 0 },
            { name: '🌱 Newbie', min: 10 },
            { name: '✨ Pencair Suasana', min: 30 },
            { name: '😎 Moodmaker', min: 100 },
            { name: '🎉 Life of the Party', min: 200 },
            { name: '🦋 Social Butterfly', min: 500 },
            { name: '👑 Suhu Tongkrongan', min: 1000 }
        ];

        let currentTier = tiers[0];
        let nextTier = null;

        for (let i = 0; i < tiers.length; i++) {
            if (currentExp >= tiers[i].min) {
                currentTier = tiers[i];
                nextTier = tiers[i + 1] || null; // Cek lencana berikutnya jika masih ada
            }
        }

        let progressPercent = 100;
        let pointText = '';
        let targetHtml = '';

        if (nextTier) {
            // JIKA BELUM MAKSIMAL: Hitung persentase bar menuju lencana berikutnya
            let earnedInTier = currentExp - currentTier.min;
            let neededInTier = nextTier.min - currentTier.min;
            progressPercent = (earnedInTier / neededInTier) * 100;
            let pointToNext = nextTier.min - currentExp;
            
            pointText = `Total: <b>${currentExp} Poin</b>. Butuh <b>${pointToNext} Poin</b> lagi untuk mendapatkan <b>${nextTier.name}</b>!`;
            targetHtml = `<span style="color: #3b82f6;">Target: ${nextTier.name}</span>`;
        } else {
            // JIKA SUDAH MAKSIMAL (SUHU TONGKRONGAN): Set bar ke 100% dan ubah teksnya
            progressPercent = 100;
            pointText = `Total: <b>${currentExp} Poin</b>. Luar biasa! Anda telah mencapai puncak lencana tertinggi.`;
            targetHtml = `<span style="color: #10b981;">🏆 Pangkat Maksimal</span>`;
        }

        // Cetakan HTML untuk Progress Bar
        const progressBarHtml = `
            <div class="progress-container" style="margin-top: 15px; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; width: 100%; max-width: 500px; margin-left: auto; margin-right: auto; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: #475569; margin-bottom: 8px;">
                    <span>${currentTier.name}</span>
                    ${targetHtml}
                </div>
                <div style="width: 100%; background-color: #cbd5e1; border-radius: 10px; height: 12px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
                    <div id="animatedRankBar" data-width="${progressPercent}%" style="width: 0%; height: 100%; background: linear-gradient(90deg, #3b82f6, #10b981); transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 10px;"></div>
                </div>
                <div style="text-align: center; font-size: 11px; color: #64748b; margin-top: 8px;">
                    ${pointText}
                </div>
            </div>
        `;
        // ==========================================

        const html = `
            <div class="profile-wrapper">
                <div class="profile-cover" id="profileCoverArea" style="background: ${coverBg}; background-size: cover; background-position: center; transition: 0.5s; ${coverCursor}" ${coverClickEvent}>${editCoverBtn}</div>
                <div class="profile-header">
                    <div style="position: relative; width: 140px; height: 140px; z-index: 2; margin-bottom: 10px; border-radius: 50%; border: 4px solid #fff; background: white; box-shadow: 0 4px 15px rgba(0,0,0,0.15);">
                        <img id="profileAvatarImg" src="${currentUserObj.foto || 'Image/default.jpg'}" onclick="if(this.src && !this.src.includes('default.jpg')) openMediaModal(this.src, 'image')" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; cursor: zoom-in; display: block; margin: 0; padding: 0; border: none;" onerror="this.onerror=null; this.src='Image/default.jpg'; this.style.cursor='default'; this.onclick=null;">
                        <img id="profileFrameImg" src="${currentUserObj.frame || ''}" style="display: ${hasFrame ? 'block' : 'none'}; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 125%; height: 125%; pointer-events: none; z-index: 10;">
                    </div>
                    <div class="profile-name">${currentUserObj.nama} ${profileBadgeHtml}</div>
                    <div class="profile-role-text">${profileRoleString}</div>
                    ${progressBarHtml}
                </div>
                <div class="profile-nav">
                    <button class="profile-nav-btn active" id="btnTabPost" onclick="switchProfileTab('post')">📝 Postingan</button>
                    <button class="profile-nav-btn" id="btnTabFoto" onclick="switchProfileTab('foto')">📸 Galeri Foto</button>
                </div>
                <div style="background: #f8fafc;">
                    <div id="tab-foto" class="profile-photo-grid" style="display:none;"></div>
                </div>
            </div>`;
            
        document.getElementById('profileContainer').innerHTML = html;
        // ==========================================
        // KODE BARU: PELATUK ANIMASI PROGRESS BAR
        // ==========================================
        setTimeout(() => {
            const bar = document.getElementById('animatedRankBar');
            if (bar) {
                // Perintahkan bar untuk memanjang dari 0% menuju target angkanya
                bar.style.width = bar.getAttribute('data-width');
            }
        }, 150); // Jeda singkat 150 milidetik agar browser siap merender animasinya
        // ==========================================

        if (typeof applyGlobalBackground === 'function') {
            applyGlobalBackground(currentUserObj.background_page);
        }

        fetchProfilePosts(true);

    } catch(e) {
        const message = (e && e.message) ? e.message : 'Terjadi kesalahan jaringan.';
        document.getElementById('profileContainer').innerHTML = `<div style="text-align:center; padding:50px; font-weight:bold; color:#e74c3c;">❌ Profil pegawai gagal dimuat.<br><small>${escapeHTML(message)}</small></div>`;
        console.error('Profil pegawai gagal dimuat:', e);
    }
}

window.fetchProfilePosts = async function(reset = false) {
    if (isFetchingDataProfile || (!hasMorePostsProfile && !reset)) return;
    isFetchingDataProfile = true; 
    
    if (reset) { 
        currentOffsetProfile = 0; 
        hasMorePostsProfile = true; 
        document.getElementById('feedBody').innerHTML = ''; 
        profilePosts = []; 
    }
    
    let loader = document.getElementById('loadingScrollProfile');
    if (!loader) {
        loader = document.createElement('div'); 
        loader.id = 'loadingScrollProfile'; 
        loader.style.cssText = "text-align: center; padding: 15px; display: none; color: #64748b; font-size: 13px;"; 
        loader.innerHTML = '<span class="spinner"></span> Menarik data postingan profil...'; 
        document.getElementById('feedBody').parentNode.appendChild(loader);
    }
    loader.style.display = 'block';
    
    try {
        const response = await fetch(`PHP/api_forum.php?user=${encodeURIComponent(currentUserObj.nama)}&limit=${postsLimitProfile}&offset=${currentOffsetProfile}`, { method: 'GET' });
        const result = await response.json();
        
        if (result.status === 'success') {
            const dataPost = result.data; 
            if (dataPost.length < postsLimitProfile) hasMorePostsProfile = false;
            
            if (reset && dataPost.length === 0) { 
                document.getElementById('feedBody').innerHTML = '<div style="text-align: center; color: #7f8c8d; padding: 20px;">Belum ada postingan dari pengguna ini.</div>'; 
            } else { 
                profilePosts = profilePosts.concat(dataPost);
                
                if (typeof renderFeedProfile === 'function') { renderFeedProfile(dataPost, reset); } 
                else if (typeof renderFeed === 'function') { renderFeed(dataPost); }
                
                renderProfilePhotos(); 
                currentOffsetProfile += dataPost.length; 
            }
        }
    } catch (error) {
    } finally {
        isFetchingDataProfile = false; 
        loader.style.display = 'none';
        
        if (!hasMorePostsProfile && currentOffsetProfile > 0) { 
            if (!document.getElementById('endOfFeedMessageProfile')) { 
                const endMsg = document.createElement('div'); 
                endMsg.id = 'endOfFeedMessageProfile'; 
                endMsg.style.cssText = "text-align: center; color: #95a5a6; padding: 20px; font-size: 13px;"; 
                endMsg.innerText = "— Akhir dari postingan profil —"; 
                document.getElementById('feedBody').appendChild(endMsg); 
            } 
        }
    }
}

window.renderFeedProfile = function(posts, clear = false) {
    if(clear && document.getElementById('feedBody')) document.getElementById('feedBody').innerHTML = ''; 
    if(typeof renderFeed === 'function') { renderFeed(posts); }
}

window.refreshProfileFeedKeepPosition = async function() {
    const savedScrollY = window.scrollY; 
    const itemsToFetch = currentOffsetProfile > postsLimitProfile ? currentOffsetProfile : postsLimitProfile;
    try {
        const resPosts = await fetch(`PHP/api_forum.php?user=${encodeURIComponent(currentUserObj.nama)}&limit=${itemsToFetch}&offset=0`);
        const postsData = await resPosts.json(); 
        profilePosts = postsData.data || [];
        renderFeedProfile(profilePosts, true); 
        renderProfilePhotos(); 
        window.scrollTo({ top: savedScrollY, behavior: 'instant' });
    } catch (e) {}
}

window.switchProfileTab = function(tab) {
    document.getElementById('btnTabPost').classList.remove('active'); 
    document.getElementById('btnTabFoto').classList.remove('active');
    document.getElementById('feedBody').style.display = 'none'; 
    document.getElementById('tab-foto').style.display = 'none';
    
    document.getElementById('btnTab' + (tab === 'post' ? 'Post' : 'Foto')).classList.add('active');
    if (tab === 'post') document.getElementById('feedBody').style.display = 'block'; 
    else document.getElementById('tab-foto').style.display = 'grid';
}

window.renderProfilePhotos = function() {
    const container = document.getElementById('tab-foto'); 
    let photosHtml = '';
    profilePosts.forEach(p => {
        if(p.media) { 
            try { 
                const paths = JSON.parse(p.media); 
                paths.forEach(img => { 
                    // Ditambahkan loading="lazy" di sini
                    photosHtml += `<img src="${img}" loading="lazy" onclick="openMediaModal('${img}', 'image')">`; 
                }); 
            } catch(e){} 
        }
    });
    if(photosHtml === '') photosHtml = '<div style="grid-column:1/-1; text-align:center; padding:30px; color:#94a3b8;">Belum ada foto yang diunggah.</div>';
    container.innerHTML = photosHtml;
}

window.toggleCoverMenu = function(event) {
    event.stopPropagation(); 
    const menu = document.getElementById('coverDropdown');
    if(menu) { menu.style.display = menu.style.display === 'none' ? 'block' : 'none'; }
}

window.updateTopBarWidget = function(foto, frame) {
    const topPicEl = document.getElementById('topProfilePic');
    if (topPicEl && window.getAvatarWidget) {
        topPicEl.parentElement.outerHTML = window.getAvatarWidget(foto, frame, '40px', '0', 'topProfilePic');
    }
}

window.uploadProfilePic = async function(input) {
    if(!input.files[0])return;const file=input.files[0];if(file.size>10*1024*1024){alert('Ukuran maksimal foto profil adalah 10MB!');return;}
    try{const form=new FormData();form.append('action','simpan');form.append('is_self_update','true');form.append('file',file,file.name);const result=await(await fetch('PHP/api_pegawai.php',{method:'POST',body:form})).json();if(result.status==='success'){const url=result.foto||('PHP/api_pegawai.php?media=avatar&id='+loggedInUser.id);document.getElementById('profileAvatarImg').src=url;updateTopBarWidget(url,loggedInUser.frame);loggedInUser.foto=url;sessionStorage.setItem('loggedInUser',JSON.stringify(loggedInUser));}else alert(result.message||'Gagal mengubah foto profil.');}catch(e){alert('Gagal mengunggah foto profil.');}finally{input.value='';}
}

window.hapusFotoProfil = async function() {
    const isConf = await showCustomConfirm("Apakah Anda yakin ingin menghapus foto profil?", "Hapus Foto Profil");
    if (!isConf) return;
    
    const menu = document.getElementById('coverDropdown'); if(menu) menu.style.display = 'none';
    
    try {
        const payload = { action: 'simpan', id: loggedInUser.id, nama: loggedInUser.nama, is_self_update: true, foto: '' };
        const res = await fetch('PHP/api_pegawai.php', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        const result = await res.json();
        
        if (result.status === 'success') {
            const avatarImg = document.getElementById('profileAvatarImg');
            avatarImg.src = 'Image/default.jpg'; avatarImg.style.cursor = 'default'; avatarImg.onclick = null;
            updateTopBarWidget('', loggedInUser.frame);
            loggedInUser.foto = ''; sessionStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
        } else { alert("Gagal menghapus foto profil: " + result.message); }
    } catch(e) { alert("Terjadi kesalahan jaringan."); }
}

window.uploadFrame = async function(input) {
    if(!input.files[0])return;const file=input.files[0];if(file.size>5*1024*1024){alert('Ukuran maksimal bingkai adalah 5MB!');return;}
    try{const form=new FormData();form.append('action','update_frame');form.append('file',file,file.name);const result=await(await fetch('PHP/api_pegawai.php',{method:'POST',body:form})).json();if(result.status==='success'){const frameImg=document.getElementById('profileFrameImg');frameImg.src=result.frame;frameImg.style.display='block';updateTopBarWidget(loggedInUser.foto,result.frame);loggedInUser.frame=result.frame;sessionStorage.setItem('loggedInUser',JSON.stringify(loggedInUser));}else alert(result.message||'Gagal mengunggah bingkai.');}catch(e){alert('Gagal mengunggah bingkai.');}finally{input.value='';}
}

window.hapusFrame = async function() {
    const isConf = await showCustomConfirm("Apakah Anda yakin ingin melepas bingkai profil?", "Lepas Bingkai", "✖️", "#f59e0b", "#fef3c7");
    if (!isConf) return;
    
    const menu = document.getElementById('coverDropdown'); if(menu) menu.style.display = 'none';
    
    try {
        const res = await fetch('PHP/api_pegawai.php', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ action: 'update_frame', id: loggedInUser.id, frame: '' }) });
        const result = await res.json();
        if (result.status === 'success') {
            const frameImg = document.getElementById('profileFrameImg'); frameImg.src = ''; frameImg.style.display = 'none';
            updateTopBarWidget(loggedInUser.foto, '');
            loggedInUser.frame = ''; sessionStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
        }
    } catch(e) {}
}

window.uploadCover = async function(input) {
    if(!input.files[0])return;const file=input.files[0];if(file.size>10*1024*1024){alert('Ukuran maksimal sampul adalah 10MB!');return;}
    try{const form=new FormData();form.append('action','update_cover');form.append('file',file,file.name);const result=await(await fetch('PHP/api_pegawai.php',{method:'POST',body:form})).json();if(result.status==='success'){const area=document.getElementById('profileCoverArea');area.style.background=`url('${result.cover}')`;area.style.backgroundSize='cover';area.style.backgroundPosition='center';loggedInUser.cover=result.cover;sessionStorage.setItem('loggedInUser',JSON.stringify(loggedInUser));}else alert(result.message||'Gagal mengunggah sampul.');}catch(e){alert('Gagal mengunggah sampul.');}finally{input.value='';}
}

window.hapusCover = async function() {
    const isConf = await showCustomConfirm("Apakah Anda yakin ingin menghapus foto sampul?", "Hapus Sampul");
    if (!isConf) return;
    
    const menu = document.getElementById('coverDropdown'); if(menu) menu.style.display = 'none';
    
    try {
        const res = await fetch('PHP/api_pegawai.php', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ action: 'update_cover', id: loggedInUser.id, cover: '' }) });
        const result = await res.json();
        if (result.status === 'success') {
            const coverArea = document.getElementById('profileCoverArea');
            coverArea.style.background = 'linear-gradient(135deg, #1e293b, #3b82f6, #a855f7)'; coverArea.style.cursor = 'default'; coverArea.onclick = null; 
            loggedInUser.cover = ''; sessionStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
        }
    } catch(e) {}
}

window.uploadBackground = async function(input) {
    if(!input.files[0])return;const file=input.files[0];if(file.size>10*1024*1024){alert('Ukuran maksimal latar adalah 10MB!');return;}
    try{const form=new FormData();form.append('action','update_background');form.append('file',file,file.name);const result=await(await fetch('PHP/api_pegawai.php',{method:'POST',body:form})).json();if(result.status==='success'){loggedInUser.background_page=result.background_page;sessionStorage.setItem('loggedInUser',JSON.stringify(loggedInUser));if(typeof applyGlobalBackground==='function')applyGlobalBackground(result.background_page);}else alert(result.message||'Gagal mengunggah latar.');}catch(e){alert('Gagal mengunggah latar.');}finally{input.value='';}
}

window.hapusBackground = async function() {
    const isConf = await showCustomConfirm("Apakah Anda yakin ingin menghapus latar halaman?", "Hapus Latar");
    if (!isConf) return;
    
    const menu = document.getElementById('coverDropdown'); if(menu) menu.style.display = 'none';
    
    try {
        const res = await fetch('PHP/api_pegawai.php', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ action: 'update_background', id: loggedInUser.id, background_page: '' }) });
        const result = await res.json();
        if (result.status === 'success') {
            loggedInUser.background_page = ''; sessionStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
            if (typeof applyGlobalBackground === 'function') applyGlobalBackground('');
        }
    } catch(e) {}
}
// ==========================================
// FITUR GANTI PASSWORD DARI HALAMAN PROFIL
// ==========================================
window.bukaModalPassword = function() {
    const menu = document.getElementById('coverDropdown');
    if(menu) menu.style.display = 'none';

    const existing = document.getElementById('modalGantiPassword');
    if (existing) existing.remove();

    // Buat HTML Modal dengan 3 input dan tombol Mata (Eye Icon)
    const html = `
    <div id="modalGantiPassword" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.6); backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); z-index:999999; display:flex; justify-content:center; align-items:center; opacity:0; transition:opacity 0.2s ease-out;">
        <div id="boxGantiPassword" style="background:#ffffff; width:340px; border-radius:16px; padding:24px; text-align:center; box-shadow:0 20px 40px rgba(0,0,0,0.2); transform:scale(0.8); transition:transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
            <div style="width:60px; height:60px; background:#e0f2fe; color:#0284c7; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:28px; margin:0 auto 16px;">🔑</div>
            <h3 style="color:#0f172a; font-size:18px; font-weight:800; margin-bottom:8px;">Ganti Password</h3>
            <p style="color:#64748b; font-size:12px; line-height:1.5; margin-bottom:20px;">Amankan akun Anda dengan password baru.</p>
            
            <div style="text-align: left; margin-bottom: 12px; position: relative;">
                <label style="font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px; display: block;">Password Lama</label>
                <input type="password" id="inputPasswordLama" placeholder="Ketik password lama..." style="width:100%; padding:10px 40px 10px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; box-sizing:border-box; outline:none; transition:0.2s;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#cbd5e1'">
                <span onclick="toggleViewPass('inputPasswordLama', this)" style="position: absolute; right: 12px; top: 28px; cursor: pointer; font-size: 16px; color: #94a3b8; user-select: none;">👁️</span>
            </div>

            <div style="text-align: left; margin-bottom: 12px; position: relative;">
                <label style="font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px; display: block;">Password Baru</label>
                <input type="password" id="inputPasswordBaru" placeholder="Ketik password baru..." style="width:100%; padding:10px 40px 10px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; box-sizing:border-box; outline:none; transition:0.2s;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#cbd5e1'">
                <span onclick="toggleViewPass('inputPasswordBaru', this)" style="position: absolute; right: 12px; top: 28px; cursor: pointer; font-size: 16px; color: #94a3b8; user-select: none;">👁️</span>
            </div>

            <div style="text-align: left; margin-bottom: 20px; position: relative;">
                <label style="font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px; display: block;">Konfirmasi Password Baru</label>
                <input type="password" id="inputKonfirmasiPassword" placeholder="Ketik ulang password baru..." style="width:100%; padding:10px 40px 10px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; box-sizing:border-box; outline:none; transition:0.2s;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#cbd5e1'">
                <span onclick="toggleViewPass('inputKonfirmasiPassword', this)" style="position: absolute; right: 12px; top: 28px; cursor: pointer; font-size: 16px; color: #94a3b8; user-select: none;">👁️</span>
            </div>
            
            <div style="display:flex; gap:10px; justify-content:center;">
                <button onclick="tutupModalPassword()" style="flex:1; background:#f1f5f9; color:#475569; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer; transition:0.2s;">Batal</button>
                <button id="btnSimpanPassword" onclick="simpanPasswordBaru()" style="flex:1; background:#0284c7; color:#ffffff; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer; transition:0.2s; box-shadow:0 4px 10px rgba(2, 132, 199, 0.2);">Simpan</button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
    
    requestAnimationFrame(() => {
        document.getElementById('modalGantiPassword').style.opacity = '1';
        document.getElementById('boxGantiPassword').style.transform = 'scale(1)';
        document.getElementById('inputPasswordLama').focus();
    });
};

// Fungsi Tampilkan/Sembunyikan Password
window.toggleViewPass = function(inputId, iconEl) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        iconEl.innerText = '🙈'; // Ikon tertutup
    } else {
        input.type = 'password';
        iconEl.innerText = '👁️'; // Ikon terbuka
    }
};

window.tutupModalPassword = function() {
    const modal = document.getElementById('modalGantiPassword');
    const box = document.getElementById('boxGantiPassword');
    if (modal && box) {
        modal.style.opacity = '0';
        box.style.transform = 'scale(0.8)';
        setTimeout(() => modal.remove(), 200); 
    }
};

// Fungsi Popup Notifikasi Kustom Berdiri Sendiri (Pengganti Alert)
window.customAlertPopup = function(title, message, icon, color, bgColor) {
    const existing = document.getElementById('customAlertModal');
    if (existing) existing.remove();
    const html = `
    <div id="customAlertModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.6); backdrop-filter:blur(5px); z-index:9999999; display:flex; justify-content:center; align-items:center; opacity:0; transition:opacity 0.2s ease-out;">
        <div id="customAlertBox" style="background:#ffffff; width:300px; border-radius:16px; padding:24px; text-align:center; box-shadow:0 20px 40px rgba(0,0,0,0.2); transform:scale(0.8); transition:transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
            <div style="width:60px; height:60px; background:${bgColor}; color:${color}; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:28px; margin:0 auto 16px;">${icon}</div>
            <h3 style="color:#0f172a; font-size:18px; font-weight:800; margin-bottom:8px;">${title}</h3>
            <p style="color:#64748b; font-size:13px; line-height:1.5; margin-bottom:24px;">${message}</p>
            <button onclick="document.getElementById('customAlertModal').remove()" style="width:100%; background:${color}; color:#ffffff; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer; transition:0.2s; box-shadow:0 4px 10px rgba(0,0,0,0.15);">Mengerti</button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    requestAnimationFrame(() => {
        document.getElementById('customAlertModal').style.opacity = '1';
        document.getElementById('customAlertBox').style.transform = 'scale(1)';
    });
};

window.simpanPasswordBaru = async function() {
    const passLama = document.getElementById('inputPasswordLama').value;
    const passBaru = document.getElementById('inputPasswordBaru').value;
    const passKonfirm = document.getElementById('inputKonfirmasiPassword').value;
    
    if (!passLama || !passBaru || !passKonfirm) {
        customAlertPopup("Kolom Kosong", "Harap isi semua kolom password sebelum menyimpan!", "⚠️", "#f59e0b", "#fef3c7");
        return;
    }

    if (passBaru.length < 5) {
        customAlertPopup("Terlalu Pendek", "Password baru wajib terdiri dari minimal 5 karakter.", "⚠️", "#f59e0b", "#fef3c7");
        return;
    }

    if (passBaru !== passKonfirm) {
        customAlertPopup("Tidak Cocok", "Konfirmasi password baru tidak sama dengan password baru!", "❌", "#ef4444", "#fee2e2");
        return;
    }

    const btn = document.getElementById('btnSimpanPassword');
    btn.innerHTML = '⏳ Memproses...'; btn.disabled = true;

    try {
        const res = await fetch('PHP/api_pegawai.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'ganti_password', password_lama: passLama, password_baru: passBaru })
        });
        const result = await res.json();
        
        if (result.status === 'success') {
            tutupModalPassword();
            customAlertPopup("Berhasil", "Password akun Anda telah sukses diperbarui!", "✅", "#10b981", "#d1fae5");
        } else {
            customAlertPopup("Gagal", result.message, "❌", "#ef4444", "#fee2e2");
        }
    } catch(e) {
        customAlertPopup("Kesalahan Sistem", "Terjadi kesalahan jaringan atau koneksi server.", "📡", "#ef4444", "#fee2e2");
    } finally {
        btn.innerHTML = 'Simpan'; btn.disabled = false;
    }
};

window.tutupModalPassword = function() {
    const modal = document.getElementById('modalGantiPassword');
    const box = document.getElementById('boxGantiPassword');
    if (modal && box) {
        modal.style.opacity = '0';
        box.style.transform = 'scale(0.8)';
        setTimeout(() => modal.remove(), 200); // Hapus elemen setelah animasi selesai
    }
};

window.simpanPasswordBaru = async function() {
    const passInput = document.getElementById('inputPasswordBaru');
    const passValue = passInput.value.trim();
    
    if (passValue.length < 5) {
        alert("Password terlalu pendek! Harap gunakan minimal 5 karakter.");
        return;
    }

    try {
        const res = await fetch('PHP/api_pegawai.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'ganti_password', password_baru: passValue })
        });
        const result = await res.json();
        
        if (result.status === 'success') {
            alert("✅ Password berhasil diubah!");
            tutupModalPassword();
        } else {
            alert("❌ Gagal mengubah password: " + result.message);
        }
    } catch(e) {
        alert("Terjadi kesalahan jaringan.");
    }
};