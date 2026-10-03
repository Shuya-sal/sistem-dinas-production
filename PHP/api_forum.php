<?php
// KODE PERBAIKAN: Paksa Server menggunakan Zona Waktu Indonesia Tengah (WITA)
date_default_timezone_set('Asia/Makassar'); 
// Catatan: Jika server Anda standar WIB, ganti dengan 'Asia/Jakarta'

ini_set('display_errors', 0); 
header("Content-Type: application/json");
require 'koneksi.php';
require 'pusher_helper.php';

// ==========================================
// SATPAM 1: KUNCI PINTU UTAMA
// ==========================================
session_start();
if (!isset($_SESSION['pegawai_id'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Akses Ditolak: Anda belum login."]);
    exit;
}

// Ambil identitas ASLI dari Server (Jangan pernah percaya data dari Javascript)
$server_user_id = $_SESSION['pegawai_id'];
$server_user_nama = $_SESSION['pegawai_nama'] ?? '';
$server_user_tingkat = $_SESSION['pegawai_tingkat'] ?? 'Staf';

function employeeMediaUrlForum($employee_id, $media_type) {
    return 'PHP/api_pegawai.php?media=' . rawurlencode($media_type) . '&id=' . rawurlencode($employee_id);
}

// Mencatat notifikasi forum per penerima berdasarkan nama lengkap pegawai.
// Dipanggil setelah komentar tersimpan; kegagalan di sini tidak boleh
// menggagalkan penyimpanan komentar.
function forumQueueNotifications($conn, $comment_id, $post_id, $actor_id, $comment_text) {
    try {
        $targets = [];
        $post_owner_raw = '';
        $post_owner = '';
        $stmt_post = $conn->prepare("SELECT pegawai_id FROM forum_posts WHERE id = ? LIMIT 1");
        if ($stmt_post) {
            $stmt_post->bind_param("s", $post_id);
            $stmt_post->execute();
            $stmt_post->bind_result($post_owner_raw);
            if ($stmt_post->fetch()) {
                $post_owner = trim((string)$post_owner_raw);
            }
            $stmt_post->close();
        }

        if ($post_owner !== '') {
            $stmt_owner = $conn->prepare("SELECT id, nama FROM pegawai WHERE id = ? OR nama = ? LIMIT 1");
            if ($stmt_owner) {
                $stmt_owner->bind_param("ss", $post_owner, $post_owner);
                $stmt_owner->execute();
                $res_owner = $stmt_owner->get_result();
                if ($row_owner = $res_owner->fetch_assoc()) {
                    if ((string)$row_owner['id'] !== (string)$actor_id) {
                        $targets[(string)$row_owner['id']] = 'post_reply';
                    }
                }
                $stmt_owner->close();
            }
        }

        $stmt_users = $conn->prepare("SELECT id, nama FROM pegawai WHERE nama IS NOT NULL AND nama <> ''");
        if ($stmt_users) {
            $stmt_users->execute();
            $res_users = $stmt_users->get_result();
            $candidates = [];
            while ($row_user = $res_users->fetch_assoc()) {
                $full_name = trim((string)$row_user['nama']);
                if ($full_name === '' || (string)$row_user['id'] === (string)$actor_id) continue;
                $candidates[] = ["id" => (string)$row_user['id'], "nama" => $full_name];
            }
            $stmt_users->close();

            // Nama terpanjang dicocokkan lebih dulu agar "Devi Atika" tidak
            // kalah oleh nama yang lebih pendek.
            usort($candidates, function($a, $b) {
                return strlen($b['nama']) - strlen($a['nama']);
            });

            $decoded = html_entity_decode((string)$comment_text, ENT_QUOTES, 'UTF-8');
            foreach ($candidates as $candidate) {
                if (stripos($decoded, '@' . $candidate['nama']) !== false) {
                    $targets[$candidate['id']] = 'mention';
                }
            }
        }

        if (empty($targets)) return;

        $stmt_insert = $conn->prepare("INSERT IGNORE INTO forum_notifications (id, pegawai_id, comment_id, post_id, actor_id, jenis) VALUES (?, ?, ?, ?, ?, ?)");
        if (!$stmt_insert) return;
        foreach ($targets as $target_id => $jenis) {
            $notif_id = bin2hex(random_bytes(16));
            $stmt_insert->bind_param("ssssss", $notif_id, $target_id, $comment_id, $post_id, $actor_id, $jenis);
            $stmt_insert->execute();
        }
        $stmt_insert->close();
    } catch (Exception $e) {}
}

// Mengisi notifikasi mention untuk komentar lama yang belum punya baris di
// forum_notifications, sehingga mention yang terlanjur terlewat tetap muncul.
function forumBackfillMentions($conn, $my_id, $my_nama) {
    try {
        $my_id = (string)$my_id;
        $my_nama = trim((string)$my_nama);
        if ($my_nama === '') return;

        $needle = '%@' . $my_nama . '%';
        $stmt = $conn->prepare(
            "SELECT c.id as comment_id, c.post_id, c.pegawai_id, c.teks
             FROM forum_comments c
             WHERE c.teks LIKE ?
               AND c.pegawai_id <> ?
               AND c.tgl_komentar >= (NOW() - INTERVAL 180 DAY)
               AND NOT EXISTS (
                   SELECT 1 FROM forum_notifications fn
                   WHERE fn.comment_id = c.id AND fn.pegawai_id = ?
               )
             ORDER BY c.tgl_komentar DESC
             LIMIT 200"
        );
        if (!$stmt) return;
        $stmt->bind_param("sss", $needle, $my_id, $my_id);
        $stmt->execute();
        $res = $stmt->get_result();
        $rows = [];
        while ($row = $res->fetch_assoc()) { $rows[] = $row; }
        $stmt->close();
        if (empty($rows)) return;

        $insert = $conn->prepare(
            "INSERT IGNORE INTO forum_notifications (id, pegawai_id, comment_id, post_id, actor_id, jenis)
             VALUES (?, ?, ?, ?, ?, 'mention')"
        );
        if (!$insert) return;
        foreach ($rows as $row) {
            $text = html_entity_decode((string)$row['teks'], ENT_QUOTES, 'UTF-8');
            if (stripos($text, '@' . $my_nama) === false) continue;
            $notif_id = bin2hex(random_bytes(16));
            $actor = (string)$row['pegawai_id'];
            $insert->bind_param("sssss", $notif_id, $my_id, $row['comment_id'], $row['post_id'], $actor);
            $insert->execute();
        }
        $insert->close();
    } catch (Exception $e) {}
}

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    try { $conn->query("ALTER TABLE forum_comments ADD COLUMN is_read INT DEFAULT 0"); } catch (Exception $e) {}
    try { $conn->query("ALTER TABLE forum_comments ADD COLUMN likes TEXT NULL"); } catch (Exception $e) {}
    try { $conn->query("ALTER TABLE forum_posts ADD COLUMN likes TEXT NULL"); } catch (Exception $e) {}
    try { $conn->query("ALTER TABLE forum_posts ADD COLUMN is_pinned TINYINT(1) DEFAULT 0"); } catch (Exception $e) {}
    try { $conn->query("ALTER TABLE pegawai ADD COLUMN is_sangean TINYINT(1) DEFAULT 0"); } catch (Exception $e) {}
    try {
        $conn->query("CREATE TABLE IF NOT EXISTS private_chats (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sender_id VARCHAR(100),
            receiver_id VARCHAR(100),
            message TEXT,
            is_read TINYINT(1) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )");
    } catch (Exception $e) {}


    // Notifikasi forum disimpan per penerima. Kolom is_read di forum_comments
    // bersifat global, sehingga satu orang membaca dapat menghapus notifikasi
    // milik pengguna lain.
    try {
        $conn->query("CREATE TABLE IF NOT EXISTS forum_notifications (
            id VARCHAR(64) PRIMARY KEY,
            pegawai_id VARCHAR(100) NOT NULL,
            comment_id VARCHAR(64) NOT NULL,
            post_id VARCHAR(64) NOT NULL,
            actor_id VARCHAR(100) NOT NULL,
            jenis ENUM('mention','post_reply') NOT NULL,
            is_read TINYINT(1) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_notif (pegawai_id, comment_id),
            KEY idx_notif_pegawai (pegawai_id, is_read)
        )");
    } catch (Exception $e) {}

    $method = $_SERVER['REQUEST_METHOD'];
    $content_type = isset($_SERVER["CONTENT_TYPE"]) ? trim($_SERVER["CONTENT_TYPE"]) : '';
    $is_multipart = (strpos($content_type, 'multipart/form-data') !== false);

    if ($method == 'POST' && $is_multipart && empty($_POST) && empty($_FILES) && isset($_SERVER['CONTENT_LENGTH']) && $_SERVER['CONTENT_LENGTH'] > 0) {
        throw new Exception("Ukuran total file foto Anda ditolak oleh Server karena melebihi batas setelan php.ini!");
    }

    if ($method == 'GET') {
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 8;
        $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
        
        // KODE PERBAIKAN: Kembalikan variabel $where_clause dan filter User yang terhapus!
        $user_filter = isset($_GET['user']) ? $conn->real_escape_string($_GET['user']) : '';
        $where_clause = "";
        
        if ($user_filter !== '') {
            $where_clause = " WHERE (p.pegawai_id = '$user_filter' OR peg.nama = '$user_filter') ";
        }

        // 1. Tangkap Filter Hashtag dengan Sensor Anti-Undefined
        $hashtag_filter = isset($_GET['hashtag']) ? $conn->real_escape_string($_GET['hashtag']) : '';
        if ($hashtag_filter === 'undefined') $hashtag_filter = ''; // Buang 'undefined' dari JS

        if ($hashtag_filter !== '') {
            if ($where_clause === "") {
                $where_clause = " WHERE p.teks LIKE '%#$hashtag_filter%' ";
            } else {
                $where_clause .= " AND p.teks LIKE '%#$hashtag_filter%' ";
            }
        }

        // 2. Tangkap parameter sortir
        $sort_mode = isset($_GET['sort']) ? $_GET['sort'] : 'latest';

        // 3. Logika Pengurutan FYP (Anti-Crash MySQL)
        $order_clause = "";
        if ($sort_mode === 'trending') {
            // KODE PERBAIKAN: Gunakan format standard CASE WHEN agar 100% jalan di semua versi MySQL
            $order_clause = " ORDER BY p.is_pinned DESC, CASE WHEN p.tgl_posting >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END DESC, LENGTH(IFNULL(p.likes, '')) DESC, p.tgl_posting DESC ";
        } else {
            $order_clause = " ORDER BY p.is_pinned DESC, p.tgl_posting DESC ";
        }

        $query_posts = "SELECT p.*, peg.nama, peg.id AS profile_id,
                               (peg.foto IS NOT NULL AND peg.foto <> '') AS has_foto,
                               (peg.frame IS NOT NULL AND peg.frame <> '') AS has_frame,
                               peg.tingkat, peg.exp, peg.is_donatur, peg.is_sangean
                        FROM forum_posts p
                        LEFT JOIN pegawai peg ON (p.pegawai_id = peg.id OR p.pegawai_id = peg.nama)
                        $where_clause
                        $order_clause
                        LIMIT $limit OFFSET $offset";
        $res_posts = $conn->query($query_posts);

        $posts = [];
        while ($post = $res_posts->fetch_assoc()) {
            $post_id = $post['id'];
            $profile_id = $post['profile_id'] ?: $post['pegawai_id'];
            $post['foto'] = !empty($post['has_foto']) ? employeeMediaUrlForum($profile_id, 'avatar') : '';
            $post['frame'] = !empty($post['has_frame']) ? employeeMediaUrlForum($profile_id, 'frame') : '';
            unset($post['has_foto'], $post['has_frame'], $post['profile_id']);

            $query_comments = "SELECT c.*, peg.nama, peg.id AS profile_id,
                                      (peg.foto IS NOT NULL AND peg.foto <> '') AS has_foto,
                                      (peg.frame IS NOT NULL AND peg.frame <> '') AS has_frame,
                                      peg.tingkat, peg.exp, peg.is_donatur, peg.is_sangean
                               FROM forum_comments c
                               LEFT JOIN pegawai peg ON (c.pegawai_id = peg.id OR c.pegawai_id = peg.nama)
                               WHERE c.post_id = '$post_id'
                               ORDER BY c.tgl_komentar ASC";
            $res_comments = $conn->query($query_comments);
            $comments = [];
            while ($comment = $res_comments->fetch_assoc()) {
                $comment_profile_id = $comment['profile_id'] ?: $comment['pegawai_id'];
                $comment['foto'] = !empty($comment['has_foto']) ? employeeMediaUrlForum($comment_profile_id, 'avatar') : '';
                $comment['frame'] = !empty($comment['has_frame']) ? employeeMediaUrlForum($comment_profile_id, 'frame') : '';
                unset($comment['has_foto'], $comment['has_frame'], $comment['profile_id']);
                $comments[] = $comment;
            }
            $post['comments'] = $comments;
            $posts[] = $post;
        }
        echo json_encode(["status" => "success", "data" => $posts]);
    } 
    elseif ($method == 'POST') {
        
        if ($is_multipart) {
            $data = $_POST; $action = $data['action'] ?? '';
        } else {
            $data = json_decode(file_get_contents("php://input"), true); $action = $data['action'] ?? '';
        }

        if ($action == 'get_chat_contacts') {
            $my_id = $_SESSION['pegawai_id']; 
            $q = "SELECT p.id, p.nama, p.foto, p.frame, p.is_donatur,
                         IF(p.akhir_aktif >= NOW() - INTERVAL 5 MINUTE, 1, 0) as is_online,
                         (SELECT MAX(created_at) FROM private_chats 
                          WHERE (sender_id = p.id AND receiver_id = ?) 
                             OR (sender_id = ? AND receiver_id = p.id)) as last_chat_time,
                         (SELECT COUNT(id) FROM private_chats 
                          WHERE sender_id = p.id AND receiver_id = ? AND is_read = 0) as unread
                  FROM pegawai p WHERE p.id != ? 
                  ORDER BY last_chat_time DESC, is_online DESC, p.nama ASC";
            $stmt = $conn->prepare($q); $stmt->bind_param("ssss", $my_id, $my_id, $my_id, $my_id);
            $stmt->execute(); $res = $stmt->get_result();
            $contacts = []; while($row = $res->fetch_assoc()) { $contacts[] = $row; }
            echo json_encode(["status" => "success", "data" => $contacts]); exit;
        }

        if ($action == 'get_chats') {
            $my_id = $_SESSION['pegawai_id']; $target_id = $data['target_id'] ?? '';
            $limit = isset($data['limit']) ? (int)$data['limit'] : 30;
            $offset = isset($data['offset']) ? (int)$data['offset'] : 0;
            
            $update = $conn->prepare("UPDATE private_chats SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?");
            $update->bind_param("ss", $target_id, $my_id); $update->execute();
            
            $q = "SELECT c.*, p.is_donatur FROM private_chats c LEFT JOIN pegawai p ON c.sender_id = p.id WHERE (c.sender_id = ? AND c.receiver_id = ?) OR (c.sender_id = ? AND c.receiver_id = ?) ORDER BY c.created_at DESC LIMIT ? OFFSET ?";
            $stmt = $conn->prepare($q); 
            $stmt->bind_param("ssssii", $my_id, $target_id, $target_id, $my_id, $limit, $offset);
            $stmt->execute(); $res = $stmt->get_result();
            
            $chats = []; 
            while($row = $res->fetch_assoc()) { $chats[] = $row; }
            $chats = array_reverse($chats); 
            
            echo json_encode(["status" => "success", "data" => $chats]); exit;
        }

        if ($action == 'send_chat') {
            $my_id = $_SESSION['pegawai_id']; $target_id = $data['target_id'] ?? '';
            $message = htmlspecialchars(strip_tags($data['message'] ?? ''), ENT_QUOTES, 'UTF-8');
            
            $beri_exp = true;
            $cek_spam = $conn->query("SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) as jeda FROM private_chats WHERE sender_id = '$my_id' ORDER BY id DESC LIMIT 1");
            if ($cek_spam->num_rows > 0) {
                $last_chat = $cek_spam->fetch_assoc();
                $jeda = (int)$last_chat['jeda'];
                
                if ($jeda < 3) {
                    echo json_encode(["status" => "error", "message" => "Anti-Spam Aktif: Anda mengetik terlalu cepat! Harap tunggu 3 detik."]);
                    exit;
                }
                if ($jeda < 60) {
                    $beri_exp = false; 
                }
            }

            $exp_added = false;
            if(!empty($message) && !empty($target_id)) {
                $stmt = $conn->prepare("INSERT INTO private_chats (sender_id, receiver_id, message) VALUES (?, ?, ?)");
                $stmt->bind_param("sss", $my_id, $target_id, $message);
                if ($stmt->execute()) { 
                    if ($beri_exp) {
                        $conn->query("UPDATE pegawai SET exp = exp + 1 WHERE id = '$my_id'"); 
                        $exp_added = true;
                    }
                    
                    $dataPesan = [ "sender_id" => $my_id, "receiver_id" => $target_id, "message" => $message ];
                    kirimPusher('private-chat-user-' . $target_id, 'pesan_baru', $dataPesan);
                }
            }
            echo json_encode(["status" => "success", "exp_added" => $exp_added]); exit;
        }

        if ($action == 'edit_chat') {
            $my_id = $_SESSION['pegawai_id']; $msg_id = $data['msg_id'] ?? '';
            $message = htmlspecialchars(strip_tags($data['message'] ?? ''), ENT_QUOTES, 'UTF-8');
            if(!empty($msg_id) && !empty($message)) {
                $cek = $conn->query("SELECT message FROM private_chats WHERE id = '$msg_id' AND sender_id = '$my_id'");
                if ($cek->num_rows > 0) {
                    $row = $cek->fetch_assoc();
                    
                    // Tolak Bypass Edit jika pesan di Database murni Stiker/Foto
                    $old_msg = trim($row['message']);
                    $is_only_media = (count(preg_split('/\s+/', $old_msg)) === 1 && preg_match('/\.(jpeg|jpg|gif|png|webp)/i', $old_msg));
                    if ($is_only_media) {
                        echo json_encode(["status" => "error", "message" => "Pesan berupa foto/stiker tidak dapat diedit!"]);
                        exit;
                    }
                    
                    preg_match_all('/Uploads\/img_[a-zA-Z0-9_]+\.(jpg|jpeg|png|gif|webp)/i', $row['message'], $old_matches);
                    preg_match_all('/Uploads\/img_[a-zA-Z0-9_]+\.(jpg|jpeg|png|gif|webp)/i', $message, $new_matches);
                    $old_imgs = $old_matches[0] ?? []; $new_imgs = $new_matches[0] ?? [];
                    foreach ($old_imgs as $img) {
                        if (!in_array($img, $new_imgs)) { if (file_exists('../' . $img)) unlink('../' . $img); }
                    }
                }

                $stmt = $conn->prepare("UPDATE private_chats SET message = ? WHERE id = ? AND sender_id = ?");
                $stmt->bind_param("sss", $message, $msg_id, $my_id); $stmt->execute();
                echo json_encode(["status" => "success"]);
            }
            exit;
        }

        if ($action == 'delete_chat') {
            $my_id = $_SESSION['pegawai_id']; $msg_id = $data['msg_id'] ?? '';
            if(!empty($msg_id)) {
                $cek_chat = $conn->query("SELECT message FROM private_chats WHERE id = '$msg_id' AND sender_id = '$my_id'");
                if ($cek_chat->num_rows > 0) {
                    $row_chat = $cek_chat->fetch_assoc();
                    preg_match_all('/Uploads\/img_[a-zA-Z0-9_]+\.(jpg|jpeg|png|gif|webp)/i', $row_chat['message'], $matches_chat);
                    if (!empty($matches_chat[0])) {
                        foreach ($matches_chat[0] as $file_path) {
                            $full_path = '../' . $file_path;
                            if (file_exists($full_path)) unlink($full_path);
                        }
                    }
                }
                $stmt = $conn->prepare("DELETE FROM private_chats WHERE id = ? AND sender_id = ?");
                $stmt->bind_param("ss", $msg_id, $my_id); $stmt->execute();
                echo json_encode(["status" => "success"]);
            }
            exit;
        }

        // ==========================================
        // SATPAM 3: KHUSUS GOD CREATOR (SEMATKAN)
        // ==========================================
        if ($action == 'toggle_pin') {
            if ($server_user_tingkat !== 'God Creator') {
                echo json_encode(["status" => "error", "message" => "Akses Ilegal! Hanya God Creator yang bisa menyematkan."]);
                exit;
            }
            
            $post_id = $conn->real_escape_string($data['post_id'] ?? ''); 
            $is_pinned = (int)($data['is_pinned'] ?? 0);
            
            // Hapus pin dari semua postingan, lalu berikan ke postingan ini (Hanya bisa 1 pin)
            $conn->query("UPDATE forum_posts SET is_pinned = 0");
            if ($is_pinned === 1) {
                $stmt = $conn->prepare("UPDATE forum_posts SET is_pinned = ? WHERE id = ?");
                $stmt->bind_param("is", $is_pinned, $post_id); 
                $stmt->execute();
            }
            
            echo json_encode(["status" => "success"]); exit;
        }

        if ($action == 'like_post') {
            $post_id = $conn->real_escape_string(
                $data['post_id'] ?? ''
            );

            // Jangan percaya pegawai_id dari browser.
            $pegawai_id = $_SESSION['pegawai_id'];
            $res = $conn->query("SELECT likes FROM forum_posts WHERE id = '$post_id'");
            if ($res->num_rows > 0) {
                $row = $res->fetch_assoc(); $likes_arr = [];
                if (!empty($row['likes'])) { $likes_arr = json_decode($row['likes'], true); if (!is_array($likes_arr)) $likes_arr = []; }
                $pegawai_id_lower = strtolower(trim($pegawai_id)); $found_key = false;
                foreach($likes_arr as $key => $liker) { if (strtolower(trim($liker)) === $pegawai_id_lower) { $found_key = $key; break; } }
                if ($found_key !== false) { unset($likes_arr[$found_key]); $likes_arr = array_values($likes_arr); } else { $likes_arr[] = $pegawai_id; }
                $new_likes = json_encode($likes_arr);
                $stmt = $conn->prepare("UPDATE forum_posts SET likes = ? WHERE id = ?"); $stmt->bind_param("ss", $new_likes, $post_id); $stmt->execute();
                kirimPusher('private-channel-global', 'refresh_feed', []);
                echo json_encode(["status" => "success"]);
            }
            exit;
        }

        if ($action == 'like_komentar') {
            $comment_id = $conn->real_escape_string(
                $data['comment_id'] ?? ''
            );

            // Identitas asli diambil dari session server.
            $pegawai_id = $_SESSION['pegawai_id'];
            $res = $conn->query("SELECT likes FROM forum_comments WHERE id = '$comment_id'");
            if ($res->num_rows > 0) {
                $row = $res->fetch_assoc(); $likes_arr = [];
                if (!empty($row['likes'])) { $likes_arr = json_decode($row['likes'], true); if (!is_array($likes_arr)) $likes_arr = []; }
                $pegawai_id_lower = strtolower(trim($pegawai_id)); $found_key = false;
                foreach($likes_arr as $key => $liker) { if (strtolower(trim($liker)) === $pegawai_id_lower) { $found_key = $key; break; } }
                if ($found_key !== false) { unset($likes_arr[$found_key]); $likes_arr = array_values($likes_arr); } else { $likes_arr[] = $pegawai_id; }
                $new_likes = json_encode($likes_arr);
                $stmt = $conn->prepare("UPDATE forum_comments SET likes = ? WHERE id = ?"); $stmt->bind_param("ss", $new_likes, $comment_id); $stmt->execute();
                kirimPusher('private-channel-global', 'refresh_feed', []);
                echo json_encode(["status" => "success"]);
            }
            exit;
        }

        if ($action == 'get_notif') {
            $my_id = $_SESSION['pegawai_id'];

            $stmt_nama = $conn->prepare(
                "SELECT nama FROM pegawai WHERE id = ? LIMIT 1"
            );

            $stmt_nama->bind_param("s", $my_id);
            $stmt_nama->execute();
            $stmt_nama->bind_result($nama_db);

            if ($stmt_nama->fetch()) {
                $my_nama = trim((string)$nama_db);
            }

            $stmt_nama->close();
            $my_nama = $conn->real_escape_string($my_nama);
            forumBackfillMentions($conn, $my_id, $my_nama);

            // 1. Notifikasi forum per penerima (mention dan balasan).
            //    Dibaca dari tabel forum_notifications agar status baca tidak
            //    dibagi bersama pengguna lain seperti kolom forum_comments.is_read.
            $query_notif = "SELECT fn.comment_id, fn.post_id, fn.jenis, fn.created_at,
                                   peg.nama as commenter_name, peg.id as commenter_id,
                                   c.teks, p.teks as post_teks
                            FROM forum_notifications fn
                            JOIN forum_comments c ON c.id = fn.comment_id
                            JOIN forum_posts p ON p.id = fn.post_id
                            JOIN pegawai peg ON peg.id = fn.actor_id
                            WHERE fn.pegawai_id = '$my_id' AND fn.is_read = 0";

            $res_forum = $conn->query($query_notif);
            $notifs = [];
            while($row = $res_forum->fetch_assoc()){
                $comment_plain = html_entity_decode((string)$row['teks'], ENT_QUOTES, 'UTF-8');
                $notifs[] = [
                    'jenis_notif' => $row['jenis'],
                    'type' => 'forum',
                    'comment_id' => $row['comment_id'],
                    'post_id' => $row['post_id'],
                    'commenter_name' => $row['commenter_name'],
                    'avatar_url' => employeeMediaUrlForum($row['commenter_id'], 'avatar'),
                    'post_title' => mb_substr(trim(strip_tags(html_entity_decode((string)$row['post_teks'], ENT_QUOTES, 'UTF-8'))), 0, 80),
                    'message_short' => mb_substr($comment_plain, 0, 80),
                    'tgl_komentar' => $row['created_at'],
                    'created_at' => $row['created_at'],
                    'teks' => $row['teks']
                ];
            }

            // 2. Ambil Notifikasi Chat Private
            $query_chat = "SELECT pc.id as chat_id, pc.sender_id, peg.nama as sender_name, peg.id as sender_ref, pc.created_at, pc.message
                           FROM private_chats pc
                           JOIN pegawai peg ON pc.sender_id = peg.id
                           WHERE pc.receiver_id = '$my_id' AND pc.is_read = 0";

            $res_chat = $conn->query($query_chat);
            while($row_chat = $res_chat->fetch_assoc()){
                $chat_plain = html_entity_decode((string)$row_chat['message'], ENT_QUOTES, 'UTF-8');
                $notifs[] = [
                    'jenis_notif' => 'chat',
                    'type' => 'chat',
                    'chat_id' => $row_chat['chat_id'],
                    'sender_id' => $row_chat['sender_id'],
                    'commenter_name' => $row_chat['sender_name'],
                    'avatar_url' => employeeMediaUrlForum($row_chat['sender_ref'], 'avatar'),
                    'post_title' => '',
                    'tgl_komentar' => $row_chat['created_at'],
                    'created_at' => $row_chat['created_at'],
                    'teks' => $row_chat['message'],
                    'message' => $row_chat['message'],
                    'message_short' => mb_substr(trim(strip_tags($chat_plain)), 0, 80)
                ];
            }

            // 3. Urutkan gabungan notifikasi berdasarkan waktu terbaru (Paling atas)
            usort($notifs, function($a, $b) {
                return strtotime($b['tgl_komentar']) - strtotime($a['tgl_komentar']);
            });

            echo json_encode(["status" => "success", "data" => $notifs]); exit;
        }
        elseif ($action == 'read_notif') {
            $my_id = $_SESSION['pegawai_id'];

            $comment_id = trim((string)($data['comment_id'] ?? ''));

            if ($comment_id === '') {
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "message" => "ID pemberitahuan tidak valid."
                ]);
                exit;
            }

            // Status baca disimpan per penerima. Update global forum_comments.is_read
            // tidak digunakan lagi agar tidak menghapus notifikasi milik orang lain.
            $stmt = $conn->prepare(
                "UPDATE forum_notifications SET is_read = 1 WHERE comment_id = ? AND pegawai_id = ?"
            );

            $stmt->bind_param("ss", $comment_id, $my_id);

            $stmt->execute();
            $stmt->close();

            echo json_encode(["status" => "success"]);
            exit;
        }
        elseif ($action == 'mark_all_notif_read') {
            $my_id = $_SESSION['pegawai_id'];
            $stmt = $conn->prepare("UPDATE forum_notifications SET is_read = 1 WHERE pegawai_id = ? AND is_read = 0");
            $stmt->bind_param("s", $my_id);
            $stmt->execute();
            $stmt->close();
            echo json_encode(["status" => "success"]);
            exit;
        }
        elseif ($action == 'mark_chat_read') {
            $my_id = (string)$_SESSION['pegawai_id'];
            $target_id = trim((string)($data['target_id'] ?? ''));
            if ($target_id === '') {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Kontak tidak valid."]);
                exit;
            }

            $stmt = $conn->prepare(
                "UPDATE private_chats SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?"
            );
            $stmt->bind_param("ss", $target_id, $my_id);
            $stmt->execute();
            $stmt->close();
            echo json_encode(["status" => "success"]);
            exit;
        }

        if ($action == 'buat_post') {
            // ID acak yang aman untuk banyak request bersamaan.
            $id = bin2hex(random_bytes(16));

            // Pemilik posting wajib berasal dari session.
            $pegawai_id = $_SESSION['pegawai_id'];
            $teks = htmlspecialchars(strip_tags($data['teks'] ?? ''), ENT_QUOTES, 'UTF-8');
            $video_link = $data['video_link'] ?? ''; 
            $tgl_posting = date('Y-m-d H:i:s');
            
            $media_paths = [];
            $upload_dir = '../Uploads/';
            
            if (!is_dir($upload_dir)) { mkdir($upload_dir, 0777, true); }
            
            // Proses file foto lokal langsung ke folder Uploads/
            if (isset($_FILES['media'])) {
                foreach ($_FILES['media']['tmp_name'] as $key => $tmp_name) {
                    if ($_FILES['media']['error'][$key] === 0) {
                        $ext = pathinfo($_FILES['media']['name'][$key], PATHINFO_EXTENSION);
                        $file_name = 'img_' . time() . '_' . rand(100, 999) . '.' . $ext;
                        $dest = $upload_dir . $file_name;
                        if (move_uploaded_file($tmp_name, $dest)) {
                            $media_paths[] = 'Uploads/' . $file_name;
                        }
                    }
                }
            }
            
            $media_json = json_encode($media_paths); $media_tipe = 'image'; 
            $stmt = $conn->prepare("INSERT INTO forum_posts (id, pegawai_id, teks, media, media_tipe, video_link, tgl_posting) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("sssssss", $id, $pegawai_id, $teks, $media_json, $media_tipe, $video_link, $tgl_posting);
            
            if ($stmt->execute()) {
                $stmt_exp = $conn->prepare("UPDATE pegawai SET exp = exp + 1 WHERE id = ?");
                $stmt_exp->bind_param("s", $pegawai_id); $stmt_exp->execute();
                kirimPusher('private-channel-global', 'refresh_feed', []);
                echo json_encode(["status" => "success"]);
            }
            exit;
        }
        elseif ($action == 'buat_komentar') {
            // Mencegah ID bertabrakan saat banyak pengguna
            // membuat komentar secara bersamaan.
            $id = bin2hex(random_bytes(16));

            $post_id = $conn->real_escape_string(
                $data['post_id'] ?? ''
            );

            // Pemilik komentar berasal dari session server.
            $pegawai_id = $_SESSION['pegawai_id'];
            $teks = htmlspecialchars(strip_tags($data['teks'] ?? ''), ENT_QUOTES, 'UTF-8');
            $tgl_komentar = date('Y-m-d H:i:s');

            $stmt = $conn->prepare("INSERT INTO forum_comments (id, post_id, pegawai_id, teks, tgl_komentar) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param("sssss", $id, $post_id, $pegawai_id, $teks, $tgl_komentar);

            if ($stmt->execute()) {
                $stmt_exp = $conn->prepare("UPDATE pegawai SET exp = exp + 1 WHERE id = ?");
                $stmt_exp->bind_param("s", $pegawai_id); $stmt_exp->execute();
                forumQueueNotifications($conn, $id, $post_id, $pegawai_id, $teks);

                try {
                    $stmt_targets = $conn->prepare("SELECT DISTINCT pegawai_id FROM forum_notifications WHERE comment_id = ?");
                    $stmt_targets->bind_param("s", $id);
                    $stmt_targets->execute();
                    $res_targets = $stmt_targets->get_result();
                    while ($row_target = $res_targets->fetch_assoc()) {
                        $target = (string)$row_target['pegawai_id'];
                        if ($target === '') continue;
                        kirimPusher('private-chat-user-' . $target, 'mention_baru', ["comment_id" => $id, "post_id" => $post_id, "sender_id" => $pegawai_id]);
                    }
                    $stmt_targets->close();
                } catch (Exception $e) {}

                kirimPusher('private-channel-global', 'refresh_feed', []);
                echo json_encode(["status" => "success"]);
            }
            exit;
        }
        elseif ($action == 'hapus_post') {
            $id = $conn->real_escape_string($data['id']);

            // ==========================================
            // SATPAM 2: CEK KEPEMILIKAN POSTINGAN
            // ==========================================
            $cek_pemilik = $conn->query("SELECT pegawai_id FROM forum_posts WHERE id = '$id'");
            if ($cek_pemilik->num_rows > 0) {
                $pemilik = $cek_pemilik->fetch_assoc()['pegawai_id'];
                // Jika bukan pembuatnya dan bukan God Creator, TENDANG!
                if ($server_user_nama !== $pemilik && $server_user_tingkat !== 'God Creator') {
                    echo json_encode(["status" => "error", "message" => "Akses Ilegal! Anda bukan pemilik postingan ini."]);
                    exit;
                }
            } else {
                echo json_encode(["status" => "error", "message" => "Postingan tidak ditemukan."]);
                exit;
            }
            // ==========================================

            $cek = $conn->query("SELECT media, teks FROM forum_posts WHERE id = '$id'");
            if ($cek->num_rows > 0) {
                $row = $cek->fetch_assoc();
                if (!empty($row['teks'])) {
                    preg_match_all('/Uploads\/img_[a-zA-Z0-9_]+\.(jpg|jpeg|png|gif|webp)/i', $row['teks'], $matches);
                    if (!empty($matches[0])) {
                        foreach ($matches[0] as $file_path) { $full_path = '../' . $file_path; if (file_exists($full_path)) unlink($full_path); }
                    }
                }
                $media_data = $row['media'];
                if (!empty($media_data)) {
                    $paths = json_decode($media_data, true);
                    if (is_array($paths)) {
                        foreach ($paths as $path) { $full_path = '../' . $path; if (file_exists($full_path)) unlink($full_path); }
                    } else {
                        if (strpos($media_data, 'Upload') === 0) { $full_path = '../' . $media_data; if (file_exists($full_path)) unlink($full_path); }
                    }
                }
            }
            
            $cek_komen = $conn->query("SELECT teks FROM forum_comments WHERE post_id = '$id'");
            while ($row_komen = $cek_komen->fetch_assoc()) {
                if (!empty($row_komen['teks'])) {
                    preg_match_all('/Uploads\/img_[a-zA-Z0-9_]+\.(jpg|jpeg|png|gif|webp)/i', $row_komen['teks'], $matches_komen);
                    if (!empty($matches_komen[0])) {
                        foreach ($matches_komen[0] as $file_path) { $full_path = '../' . $file_path; if (file_exists($full_path)) unlink($full_path); }
                    }
                }
            }
            $conn->query("DELETE FROM forum_posts WHERE id = '$id'");
            $conn->query("DELETE FROM forum_comments WHERE post_id = '$id'");
            
            echo json_encode(["status" => "success"]); exit;
        }
        elseif ($action == 'hapus_komentar') {
            $id = $conn->real_escape_string($data['id']);

            // ==========================================
            // SATPAM 2B: CEK KEPEMILIKAN KOMENTAR
            // ==========================================
            $cek_pemilik = $conn->query("SELECT pegawai_id FROM forum_comments WHERE id = '$id'");
            if ($cek_pemilik->num_rows > 0) {
                $pemilik = $cek_pemilik->fetch_assoc()['pegawai_id'];
                if ($server_user_nama !== $pemilik && $server_user_tingkat !== 'God Creator') {
                    echo json_encode(["status" => "error", "message" => "Akses Ilegal! Anda bukan pemilik komentar ini."]);
                    exit;
                }
            } else {
                echo json_encode(["status" => "error", "message" => "Komentar tidak ditemukan."]);
                exit;
            }
            // ==========================================

            $cek_komen = $conn->query("SELECT teks FROM forum_comments WHERE id = '$id'");
            if ($cek_komen->num_rows > 0) {
                $row_komen = $cek_komen->fetch_assoc();
                if (!empty($row_komen['teks'])) {
                    preg_match_all('/Uploads\/img_[a-zA-Z0-9_]+\.(jpg|jpeg|png|gif|webp)/i', $row_komen['teks'], $matches_komen);
                    if (!empty($matches_komen[0])) {
                        foreach ($matches_komen[0] as $file_path) { $full_path = '../' . $file_path; if (file_exists($full_path)) unlink($full_path); }
                    }
                }
            }
            $conn->query("DELETE FROM forum_comments WHERE id = '$id'"); 
            
            echo json_encode(["status" => "success"]); exit;
        }
        elseif ($action == 'edit_post') {
            $id = $conn->real_escape_string($data['id']); 
            $teks = htmlspecialchars(strip_tags($data['teks'] ?? ''), ENT_QUOTES, 'UTF-8');
            
            // SATPAM EDIT: Cek Kepemilikan sebelum mengedit
            $cek_pemilik = $conn->query("SELECT pegawai_id FROM forum_posts WHERE id = '$id'");
            if ($cek_pemilik->num_rows > 0) {
                $pemilik = $cek_pemilik->fetch_assoc()['pegawai_id'];
                if ($server_user_nama !== $pemilik && $server_user_tingkat !== 'God Creator') {
                    echo json_encode(["status" => "error", "message" => "Akses Ilegal! Anda tidak berhak mengedit postingan ini."]);
                    exit;
                }
            }

            // Bersihkan gambar inline jika dihapus saat edit Postingan
            $cek = $conn->query("SELECT teks FROM forum_posts WHERE id = '$id'");
            if ($cek->num_rows > 0) {
                $row = $cek->fetch_assoc();
                preg_match_all('/Uploads\/img_[a-zA-Z0-9_]+\.(jpg|jpeg|png|gif|webp)/i', $row['teks'], $old_matches);
                preg_match_all('/Uploads\/img_[a-zA-Z0-9_]+\.(jpg|jpeg|png|gif|webp)/i', $teks, $new_matches);
                $old_imgs = $old_matches[0] ?? []; $new_imgs = $new_matches[0] ?? [];
                foreach ($old_imgs as $img) {
                    if (!in_array($img, $new_imgs)) { if (file_exists('../' . $img)) unlink('../' . $img); }
                }
            }

            $stmt = $conn->prepare("UPDATE forum_posts SET teks = ? WHERE id = ?"); $stmt->bind_param("ss", $teks, $id); $stmt->execute();
            echo json_encode(["status" => "success"]); exit;
        }
        elseif ($action == 'edit_komentar') {
            $id = $conn->real_escape_string($data['id']); 
            $teks = htmlspecialchars(strip_tags($data['teks'] ?? ''), ENT_QUOTES, 'UTF-8');
            
            // SATPAM EDIT: Cek Kepemilikan sebelum mengedit
            $cek_pemilik = $conn->query("SELECT pegawai_id, teks FROM forum_comments WHERE id = '$id'");
            if ($cek_pemilik->num_rows > 0) {
                $row_pem = $cek_pemilik->fetch_assoc();
                $pemilik = $row_pem['pegawai_id'];
                
                if ($server_user_nama !== $pemilik && $server_user_tingkat !== 'God Creator') {
                    echo json_encode(["status" => "error", "message" => "Akses Ilegal! Anda tidak berhak mengedit komentar ini."]);
                    exit;
                }

                // Tolak Bypass Edit jika pesan di Database murni Stiker/Foto
                $old_teks = trim($row_pem['teks']);
                $is_only_media = (count(preg_split('/\s+/', $old_teks)) === 1 && preg_match('/\.(jpeg|jpg|gif|png|webp)/i', $old_teks));
                if ($is_only_media) {
                    echo json_encode(["status" => "error", "message" => "Komentar berupa foto/stiker tidak dapat diedit!"]);
                    exit;
                }
            }

            // Bersihkan gambar inline jika dihapus saat edit Komentar
            $cek = $conn->query("SELECT teks FROM forum_comments WHERE id = '$id'");
            if ($cek->num_rows > 0) {
                $row = $cek->fetch_assoc();
                preg_match_all('/Uploads\/img_[a-zA-Z0-9_]+\.(jpg|jpeg|png|gif|webp)/i', $row['teks'], $old_matches);
                preg_match_all('/Uploads\/img_[a-zA-Z0-9_]+\.(jpg|jpeg|png|gif|webp)/i', $teks, $new_matches);
                $old_imgs = $old_matches[0] ?? []; $new_imgs = $new_matches[0] ?? [];
                foreach ($old_imgs as $img) {
                    if (!in_array($img, $new_imgs)) { if (file_exists('../' . $img)) unlink('../' . $img); }
                }
            }

            $stmt = $conn->prepare("UPDATE forum_comments SET teks = ? WHERE id = ?"); $stmt->bind_param("ss", $teks, $id); $stmt->execute();
            echo json_encode(["status" => "success"]); exit;
        }
        elseif ($action == 'upload_gambar_base64') {
            $base64 = $data['image'] ?? '';
            if(empty($base64)) { echo json_encode(["status" => "error", "message" => "Gambar kosong"]); exit; }
            $base64 = preg_replace('#^data:image/\w+;base64,#i', '', $base64); $base64 = str_replace(' ', '+', $base64);
            $img_data = base64_decode($base64);
            $finfo = new finfo(FILEINFO_MIME_TYPE); $mime = $finfo->buffer($img_data);
            if (in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'])) {
                $ext = explode('/', $mime)[1];
                if (!file_exists('../Uploads')) { mkdir('../Users/Image', 0777, true); }
                $file_name = 'Uploads/img_' . time() . '_' . rand(100,999) . '.' . $ext;
                file_put_contents('../' . $file_name, $img_data);
                echo json_encode(["status" => "success", "url" => $file_name]);
            } else { echo json_encode(["status" => "error", "message" => "Format file tidak diizinkan."]); }
            exit;
        }
    }
} catch (Exception $e) { echo json_encode(["status" => "error", "message" => $e->getMessage()]); }
?>