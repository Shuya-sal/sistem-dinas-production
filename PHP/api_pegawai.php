<?php
error_reporting(0);
ini_set('display_errors', 0);
header("Content-Type: application/json");
require 'koneksi.php';

// ==========================================
// SATPAM 1: KUNCI PINTU UTAMA API PEGAWAI
// ==========================================
if (!isset($_SESSION['pegawai_id'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Akses Ilegal! Server menolak koneksi."]);
    exit;
}

// Ambil Identitas Asli yang tidak bisa dimanipulasi Hacker
$server_user_id = $_SESSION['pegawai_id'];
$server_user_tingkat = $_SESSION['pegawai_tingkat'] ?? 'Staf';
// ==========================================

function makeEmployeeMediaUrl($employee_id, $media_type) {
    return 'PHP/api_pegawai.php?media=' . rawurlencode($media_type) . '&id=' . rawurlencode($employee_id);
}

function saveEmployeeUpload($file, $prefix, $allowed_mimes) {
    if (!is_array($file)) { return null; }
    $upload_error = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($upload_error === UPLOAD_ERR_NO_FILE) { return null; }
    if ($upload_error !== UPLOAD_ERR_OK) {
        $upload_messages = [
            UPLOAD_ERR_INI_SIZE => 'Ukuran file melebihi batas upload server.',
            UPLOAD_ERR_FORM_SIZE => 'Ukuran file melebihi batas formulir.',
            UPLOAD_ERR_PARTIAL => 'Upload file tidak selesai.',
            UPLOAD_ERR_NO_TMP_DIR => 'Folder sementara upload tidak tersedia.',
            UPLOAD_ERR_CANT_WRITE => 'Server tidak dapat menulis file upload.',
            UPLOAD_ERR_EXTENSION => 'Upload dihentikan oleh ekstensi PHP.'
        ];
        throw new Exception($upload_messages[$upload_error] ?? 'Upload file gagal.');
    }
    if (($file['size'] ?? 0) <= 0 || ($file['size'] ?? 0) > 12 * 1024 * 1024) { throw new Exception('Ukuran file tidak valid.'); }
    $tmp = $file['tmp_name'] ?? '';
    if (!is_uploaded_file($tmp)) { throw new Exception('Upload file tidak valid.'); }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($tmp);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
    if (!in_array($mime, $allowed_mimes, true) || !isset($extensions[$mime])) { throw new Exception('Format gambar ditolak.'); }
    $dir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'Users' . DIRECTORY_SEPARATOR . 'Image';
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) { throw new Exception('Folder media tidak dapat dibuat.'); }
    @chmod($dir, 0755);
    if (!is_writable($dir)) { throw new Exception('Folder media tidak dapat ditulisi oleh server.'); }
    $relative = 'Users/Image/' . $prefix . '_' . bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
    $destination = dirname(__DIR__) . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);
    if (!move_uploaded_file($tmp, $destination)) { throw new Exception('File gagal disimpan.'); }
    @chmod($destination, 0644);
    return $relative;
}

try {
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method == 'GET') {
        if (isset($_GET['avatar']) || isset($_GET['media'])) {
            $media_type = isset($_GET['avatar']) ? 'avatar' : trim((string)$_GET['media']);
            $avatar_id = isset($_GET['avatar']) ? trim((string)$_GET['avatar']) : trim((string)($_GET['id'] ?? ''));
            $media_columns = [
                'avatar' => 'foto',
                'frame' => 'frame',
                'cover' => 'cover',
                'background_page' => 'background_page'
            ];

            if ($avatar_id === '' || strlen($avatar_id) > 100 || !isset($media_columns[$media_type])) {
                http_response_code(400);
                exit;
            }

            $media_column = $media_columns[$media_type];
            $avatar_stmt = $conn->prepare("SELECT $media_column AS media_value FROM pegawai WHERE id = ? LIMIT 1");
            $avatar_stmt->bind_param("s", $avatar_id);
            $avatar_stmt->execute();
            $avatar_result = $avatar_stmt->get_result();
            $avatar_row = $avatar_result->fetch_assoc();
            $avatar_stmt->close();

            $foto = trim((string)($avatar_row['media_value'] ?? ''));
            $allowed_mimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            $image_bytes = null;
            $image_mime = null;

            if (preg_match('#^data:(image/(?:jpeg|png|webp|gif));base64,(.+)$#s', $foto, $matches)) {
                $decoded = base64_decode(str_replace(' ', '+', $matches[2]), true);
                if ($decoded !== false) {
                    $detected_mime = (new finfo(FILEINFO_MIME_TYPE))->buffer($decoded);
                    if (in_array($detected_mime, $allowed_mimes, true)) {
                        $image_bytes = $decoded;
                        $image_mime = $detected_mime;
                    }
                }
            } elseif ($foto !== '') {
                $normalized_path = str_replace('\\', '/', $foto);
                $allowed_path = preg_match('#^(?:Image|Users/Image|Uploads)/[A-Za-z0-9._/-]+$#', $normalized_path);
                $project_root = realpath(dirname(__DIR__));
                $file_path = $allowed_path ? realpath($project_root . '/' . $normalized_path) : false;

                if ($file_path && strpos($file_path, $project_root . DIRECTORY_SEPARATOR) === 0 && is_file($file_path)) {
                    $detected_mime = (new finfo(FILEINFO_MIME_TYPE))->file($file_path);
                    if (in_array($detected_mime, $allowed_mimes, true)) {
                        $image_bytes = file_get_contents($file_path);
                        $image_mime = $detected_mime;
                    }
                }
            }

            if ($image_bytes === null) {
                $default_path = realpath(dirname(__DIR__) . '/Image/default.jpg');
                if (!$default_path || !is_file($default_path)) {
                    http_response_code(404);
                    exit;
                }
                $image_bytes = file_get_contents($default_path);
                $image_mime = 'image/jpeg';
            }

            header('Content-Type: ' . $image_mime);
            header('Cache-Control: private, max-age=3600');
            header('X-Content-Type-Options: nosniff');
            header('Content-Length: ' . strlen($image_bytes));
            echo $image_bytes;
            exit;
        }

        if (isset($_GET['profile'])) {
            $profile_name = trim((string)$_GET['profile']);
            if ($profile_name === '' || strlen($profile_name) > 150) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Nama profil tidak valid."]);
                exit;
            }

            $profile_stmt = $conn->prepare("SELECT id, nama, nip, bagian, jabatan, tingkat, exp,
                                                    is_donatur, is_sangean,
                                                    (foto IS NOT NULL AND foto <> '') AS has_foto,
                                                    (frame IS NOT NULL AND frame <> '') AS has_frame,
                                                    (cover IS NOT NULL AND cover <> '') AS has_cover,
                                                    (background_page IS NOT NULL AND background_page <> '') AS has_background
                                             FROM pegawai WHERE nama = ? LIMIT 1");
            $profile_stmt->bind_param("s", $profile_name);
            $profile_stmt->execute();
            $profile_result = $profile_stmt->get_result();
            $row = $profile_result->fetch_assoc();
            $profile_stmt->close();

            if (!$row) {
                http_response_code(404);
                echo json_encode(["status" => "error", "message" => "Pegawai tidak ditemukan."]);
                exit;
            }

            // Media besar tidak ikut masuk JSON profil; klien menerima URL streaming saja.
            $row['foto'] = !empty($row['has_foto']) ? makeEmployeeMediaUrl($row['id'], 'avatar') : '';
            $row['frame'] = !empty($row['has_frame']) ? makeEmployeeMediaUrl($row['id'], 'frame') : '';
            $row['cover'] = !empty($row['has_cover']) ? makeEmployeeMediaUrl($row['id'], 'cover') : '';
            $row['background_page'] = !empty($row['has_background']) ? makeEmployeeMediaUrl($row['id'], 'background_page') : '';
            unset($row['has_foto'], $row['has_frame'], $row['has_cover'], $row['has_background']);

            echo json_encode(["status" => "success", "data" => $row]);
            exit;
        }

        // Data satu pegawai untuk form edit. Dikirim ringkas tanpa kolom
        // besar (foto Base64 / stiker) agar tidak putus di shared hosting.
        if (isset($_GET['id'])) {
            $single_id = trim((string)$_GET['id']);
            if ($single_id === '' || strlen($single_id) > 100) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "ID pegawai tidak valid."]);
                exit;
            }

            $single_stmt = $conn->prepare("SELECT id, nama, nip, jabatan, pangkat, golongan, bagian, status, tingkat,
                                                  nik, tempat_lahir, tgl_lahir, alamat,
                                                  (foto IS NOT NULL AND foto <> '') AS has_foto
                                           FROM pegawai WHERE id = ? LIMIT 1");
            $single_stmt->bind_param("s", $single_id);
            $single_stmt->execute();
            $single_result = $single_stmt->get_result();
            $single_row = $single_result->fetch_assoc();
            $single_stmt->close();

            if (!$single_row) {
                http_response_code(404);
                echo json_encode(["status" => "error", "message" => "Pegawai tidak ditemukan."]);
                exit;
            }

            $single_row['foto'] = !empty($single_row['has_foto']) ? makeEmployeeMediaUrl($single_row['id'], 'avatar') : '';
            unset($single_row['has_foto']);

            echo json_encode(["status" => "success", "data" => $single_row]);
            exit;
        }

        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $limit_param = isset($_GET['limit']) ? $_GET['limit'] : '10';

        // ANTI SQL-INJECTION: Membersihkan karakter jahat pada kolom pencarian
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';

        $kategori = isset($_GET['kategori']) ? trim($_GET['kategori']) : '';

        $whereConditions = [];
$whereTypes = '';
$whereParams = [];
if (!empty($search)) {
    $whereConditions[] = "(nama LIKE ? OR nip LIKE ? OR jabatan LIKE ? OR nik LIKE ?)";
    $whereTypes .= 'ssss';
    $like_search = '%' . $search . '%';
    array_push($whereParams, $like_search, $like_search, $like_search, $like_search);
}

        // Memisahkan data berdasarkan Tab yang diklik
        if ($kategori === 'dewan') {
    $whereConditions[] = "status = 'Anggota DPRD'";
} elseif ($kategori === 'staf') {
    $whereConditions[] = "status != 'Anggota DPRD'";
}
$whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

        if ($limit_param === 'bagian') {
            $sql = "SELECT DISTINCT bagian FROM pegawai WHERE bagian IS NOT NULL AND TRIM(bagian) != '' ORDER BY bagian ASC";
            $res = $conn->query($sql);
            $data = [];
            if ($res) {
                while ($row = $res->fetch_assoc()) {
                    $data[] = ['bagian' => $row['bagian']];
                }
            }
            echo json_encode(["status" => "success", "data" => $data]);
            exit;
        }

        if ($limit_param === 'badges' || $limit_param === 'summary') {
            // Daftar UI hanya membutuhkan kolom ringkas. Jangan memakai SELECT *
            // karena foto Base64 dan data profil lain dapat membuat respons sangat besar
            // dan terputus pada shared hosting.
            $sql = "SELECT id, nama, nip, jabatan, golongan, bagian, status,
               foto, tingkat, is_donatur, is_sangean
        FROM pegawai $whereClause ORDER BY nama ASC";
$list_stmt = $conn->prepare($sql);
if (!empty($whereConditions)) { $list_stmt->bind_param($whereTypes, ...$whereParams); }
$list_stmt->execute();
$result = $list_stmt->get_result();
            $data = [];
            while ($row = $result->fetch_assoc()) {
                // Avatar disajikan terpisah agar data Base64 tidak membengkakkan JSON daftar.
                $row['foto'] = 'PHP/api_pegawai.php?avatar=' . rawurlencode($row['id']);
                $data[] = $row;
            }
            echo json_encode(["status" => "success", "data" => $data]);
            exit;
        }

        if ($limit_param === 'all') {
            $sql = "SELECT * FROM pegawai $whereClause ORDER BY nama ASC";
$list_stmt = $conn->prepare($sql);
if (!empty($whereConditions)) { $list_stmt->bind_param($whereTypes, ...$whereParams); }
$list_stmt->execute();
$result = $list_stmt->get_result();
            $data = [];
            while ($row = $result->fetch_assoc()) {
                unset($row['password']);
                $row['is_blocked'] = (!empty($row['lock_until']) && strtotime($row['lock_until']) > time());
                $data[] = $row;
            }
            echo json_encode(["status" => "success", "data" => $data]);
            exit;
        }

        $limit = (int)$limit_param;
        $offset = ($page - 1) * $limit;

        $count_stmt = $conn->prepare("SELECT COUNT(id) as total FROM pegawai $whereClause");
if (!empty($whereConditions)) { $count_stmt->bind_param($whereTypes, ...$whereParams); }
$count_stmt->execute();
$countQuery = $count_stmt->get_result();
$total_records = $countQuery->fetch_assoc()['total'];
$total_pages = ceil($total_records / $limit);

$sql = "SELECT * FROM pegawai $whereClause ORDER BY nama ASC LIMIT ? OFFSET ?";
$list_stmt = $conn->prepare($sql);
$list_types = $whereTypes . 'ii';
$list_params = array_merge($whereParams, [$limit, $offset]);
if (!empty($whereConditions)) { $list_stmt->bind_param($list_types, ...$list_params); } else { $list_stmt->bind_param('ii', $limit, $offset); }
$list_stmt->execute();
$result = $list_stmt->get_result();

        $data = [];
        while ($row = $result->fetch_assoc()) {
            unset($row['password']);
            $row['is_blocked'] = (!empty($row['lock_until']) && strtotime($row['lock_until']) > time());
            $data[] = $row;
        }

        echo json_encode([
            "status" => "success",
            "data" => $data,
            "pagination" => [
                "current_page" => $page,
                "total_pages" => $total_pages,
                "total_records" => $total_records
            ]
        ]);
        exit;
    }
    elseif ($method == 'POST') {
        $is_multipart = isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'multipart/form-data') !== false;
        $data = $is_multipart ? $_POST : json_decode(file_get_contents("php://input"), true);
        if (!is_array($data)) { $data = []; }
        $action = $data['action'] ?? 'simpan';

        // =========================================================
        // PENGAMANAN FITUR PERSONAL (STIKER, FRAME, LATAR)
        // Memaksa $id = $server_user_id agar tidak bisa membajak profil orang lain
        // =========================================================

        if ($action === 'tambah_stiker') {
            $id = $server_user_id;
            $bg = $data['stiker_base64'] ?? '';
            $uploaded_stiker = saveEmployeeUpload($_FILES['file'] ?? $_FILES['stiker'] ?? null, 'stiker', ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

            if ($uploaded_stiker !== null) { $stiker_url = $uploaded_stiker; }
            elseif (empty($bg)) { echo json_encode(["status" => "error", "message" => "Gambar stiker kosong."]); exit; }

            if (!isset($stiker_url) && preg_match('/^data:image\/(\w+);base64,/', $bg, $type)) {
                $base64_data = substr($bg, strpos($bg, ',') + 1);
                $base64_data = str_replace(' ', '+', $base64_data);
                $decoded = base64_decode($base64_data);

                $finfo = new finfo(FILEINFO_MIME_TYPE); $mime = $finfo->buffer($decoded);

                if (in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'])) {
                    $ext = explode('/', $mime)[1];
                    if (!file_exists('../Users/Image')) { mkdir('../Users/Image', 0755, true); }
                    $stiker_url = 'Users/Image/stiker_' . time() . '_' . rand(1000, 9999) . '.' . $ext;
                    file_put_contents('../' . $stiker_url, $decoded);
                } else {
                    echo json_encode(["status" => "error", "message" => "Format stiker ditolak."]); exit;
                }
            } elseif (!isset($stiker_url)) { echo json_encode(["status" => "error", "message" => "Data tidak valid."]); exit; }

            $cek_stmt = $conn->prepare("SELECT stiker FROM pegawai WHERE id = ?");
$cek_stmt->bind_param("s", $id);
$cek_stmt->execute();
$cek = $cek_stmt->get_result();
            $stiker_arr = [];
            if ($cek->num_rows > 0) {
                $row = $cek->fetch_assoc();
                if (!empty($row['stiker'])) { $stiker_arr = json_decode($row['stiker'], true); if (!is_array($stiker_arr)) $stiker_arr = []; }
            }

            array_unshift($stiker_arr, $stiker_url);
            $stiker_json = json_encode($stiker_arr);

            $stmt = $conn->prepare("UPDATE pegawai SET stiker=? WHERE id=?");
            $stmt->bind_param("ss", $stiker_json, $id);
            if ($stmt->execute()) echo json_encode(["status" => "success", "stiker" => $stiker_json]);
            else echo json_encode(["status" => "error", "message" => $stmt->error]);
            exit;
        }

        if ($action === 'hapus_stiker') {
            $id = $server_user_id;
            $stiker_url = $data['stiker_url'];

            $cek_stmt = $conn->prepare("SELECT stiker FROM pegawai WHERE id = ?");
$cek_stmt->bind_param("s", $id);
$cek_stmt->execute();
$cek = $cek_stmt->get_result();
            $stiker_arr = [];
            if ($cek->num_rows > 0) {
                $row = $cek->fetch_assoc();
                if (!empty($row['stiker'])) { $stiker_arr = json_decode($row['stiker'], true); if (!is_array($stiker_arr)) $stiker_arr = []; }
            }

            if (file_exists('../' . $stiker_url)) { unlink('../' . $stiker_url); }

            $stiker_arr = array_filter($stiker_arr, function($v) use ($stiker_url) { return $v !== $stiker_url; });
            $stiker_arr = array_values($stiker_arr);
            $stiker_json = json_encode($stiker_arr);

            $stmt = $conn->prepare("UPDATE pegawai SET stiker=? WHERE id=?");
            $stmt->bind_param("ss", $stiker_json, $id);
            if ($stmt->execute()) echo json_encode(["status" => "success", "stiker" => $stiker_json]);
            else echo json_encode(["status" => "error", "message" => $stmt->error]);
            exit;
        }

        if ($action === 'update_frame') {
            $id = $server_user_id;
            $frame = $data['frame'] ?? '';
            $uploaded_frame = saveEmployeeUpload($_FILES['frame'] ?? $_FILES['file'] ?? null, 'frame', ['image/png', 'image/webp', 'image/gif']);
            if ($uploaded_frame !== null) { $frame = $uploaded_frame; }

            $cek_old_stmt = $conn->prepare("SELECT frame FROM pegawai WHERE id = ?");
$cek_old_stmt->bind_param("s", $id);
$cek_old_stmt->execute();
$cek_old = $cek_old_stmt->get_result();
            $old_frame = '';
            if ($cek_old->num_rows > 0) { $old_frame = $cek_old->fetch_assoc()['frame']; }

            if ($uploaded_frame === null && preg_match('/^data:image\/(\w+);base64,/', $frame, $type)) {
                $base64_data = substr($frame, strpos($frame, ',') + 1);
                $base64_data = str_replace(' ', '+', $base64_data);
                $decoded = base64_decode($base64_data);

                $finfo = new finfo(FILEINFO_MIME_TYPE); $mime = $finfo->buffer($decoded);

                if (in_array($mime, ['image/png', 'image/webp', 'image/gif'])) {
                    $ext = explode('/', $mime)[1];
                    if (!file_exists('../Users/Image')) { mkdir('../Users/Image', 0755, true); }
                    $filename = 'Users/Image/frame_' . time() . '_' . rand(1000, 9999) . '.' . $ext;
                    file_put_contents('../' . $filename, $decoded);
                    $frame = $filename;
                } else {
                    echo json_encode(["status" => "error", "message" => "Bingkai wajib berformat transparan (PNG/WEBP)."]); exit;
                }
            }

            if (!empty($old_frame) && $old_frame !== $frame && (strpos($old_frame, 'Users/Image/') === 0 || strpos($old_frame, 'Uploads/') === 0)) {
                $old_path = '../' . $old_frame; if (file_exists($old_path)) unlink($old_path);
            }

            $stmt = $conn->prepare("UPDATE pegawai SET frame=? WHERE id=?");
            $stmt->bind_param("ss", $frame, $id);
            if ($stmt->execute()) echo json_encode(["status" => "success", "frame" => $frame]);
            else echo json_encode(["status" => "error", "message" => $stmt->error]);
            exit;
        }

        if ($action === 'ganti_password') {
            $id = $server_user_id;
            $password_lama = $data['password_lama'] ?? '';
            $password_baru = $data['password_baru'] ?? '';

            if (empty($password_lama) || empty($password_baru) || strlen($password_baru) < 5) {
                echo json_encode(["status" => "error", "message" => "Semua kolom wajib diisi & password baru minimal 5 karakter."]);
                exit;
            }

            // 1. Cek kecocokan password lama di database
            $cek_stmt = $conn->prepare("SELECT password FROM pegawai WHERE id = ?");
$cek_stmt->bind_param("s", $id);
$cek_stmt->execute();
$cek = $cek_stmt->get_result();
            if ($cek->num_rows > 0) {
                $row = $cek->fetch_assoc();
                if (!password_verify($password_lama, $row['password'])) {
                    echo json_encode(["status" => "error", "message" => "Password lama yang Anda masukkan salah!"]);
                    exit;
                }
            } else {
                echo json_encode(["status" => "error", "message" => "Data pengguna tidak ditemukan."]);
                exit;
            }

            // 2. Enkripsi password baru sebelum disimpan
            $password_final = password_hash($password_baru, PASSWORD_DEFAULT);
            $stmt = $conn->prepare("UPDATE pegawai SET password=? WHERE id=?");
            $stmt->bind_param("ss", $password_final, $id);

            if ($stmt->execute()) {
                echo json_encode(["status" => "success"]);
            } else {
                echo json_encode(["status" => "error", "message" => $stmt->error]);
            }
            exit;
        }

        if ($action === 'update_cover') {
            $id = $server_user_id;
            $cover = $data['cover'] ?? '';
            $uploaded_cover = saveEmployeeUpload($_FILES['cover'] ?? $_FILES['file'] ?? null, 'cover', ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
            if ($uploaded_cover !== null) { $cover = $uploaded_cover; }

            $cek_old_stmt = $conn->prepare("SELECT cover FROM pegawai WHERE id = ?");
$cek_old_stmt->bind_param("s", $id);
$cek_old_stmt->execute();
$cek_old = $cek_old_stmt->get_result();
            $old_cover = '';
            if ($cek_old->num_rows > 0) { $old_cover = $cek_old->fetch_assoc()['cover']; }

            if ($uploaded_cover === null && preg_match('/^data:image\/(\w+);base64,/', $cover, $type)) {
                $base64_data = substr($cover, strpos($cover, ',') + 1); $base64_data = str_replace(' ', '+', $base64_data);
                $decoded = base64_decode($base64_data);
                $finfo = new finfo(FILEINFO_MIME_TYPE); $mime = $finfo->buffer($decoded);

                if (in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'])) {
                    $ext = explode('/', $mime)[1]; if (!file_exists('../Users/Image')) { mkdir('../Users/Image', 0755, true); }
                    $filename = 'Users/Image/cover_' . time() . '_' . rand(1000, 9999) . '.' . $ext; file_put_contents('../' . $filename, $decoded); $cover = $filename;
                } else { echo json_encode(["status" => "error", "message" => "Format gambar ditolak karena alasan keamanan."]); exit; }
            }

            if (!empty($old_cover) && $old_cover !== $cover && (strpos($old_cover, 'Users/Image/') === 0 || strpos($old_cover, 'Uploads/') === 0)) {
                $old_path = '../' . $old_cover; if (file_exists($old_path)) unlink($old_path);
            }

            $stmt = $conn->prepare("UPDATE pegawai SET cover=? WHERE id=?");
            $stmt->bind_param("ss", $cover, $id);
            if ($stmt->execute()) echo json_encode(["status" => "success", "cover" => $cover]);
            else echo json_encode(["status" => "error", "message" => $stmt->error]);
            exit;
        }

        if ($action === 'update_background') {
            $id = $server_user_id;
            $bg = $data['background_page'] ?? '';
            $uploaded_background = saveEmployeeUpload($_FILES['background_page'] ?? $_FILES['file'] ?? null, 'bg', ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
            if ($uploaded_background !== null) { $bg = $uploaded_background; }

            $cek_old_stmt = $conn->prepare("SELECT background_page FROM pegawai WHERE id = ?");
$cek_old_stmt->bind_param("s", $id);
$cek_old_stmt->execute();
$cek_old = $cek_old_stmt->get_result();
            $old_bg = '';
            if ($cek_old->num_rows > 0) { $old_bg = $cek_old->fetch_assoc()['background_page']; }

            if ($uploaded_background === null && preg_match('/^data:image\/(\w+);base64,/', $bg, $type)) {
                $base64_data = substr($bg, strpos($bg, ',') + 1); $base64_data = str_replace(' ', '+', $base64_data);
                $decoded = base64_decode($base64_data);
                $finfo = new finfo(FILEINFO_MIME_TYPE); $mime = $finfo->buffer($decoded);

                if (in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'])) {
                    $ext = explode('/', $mime)[1]; if (!file_exists('../Users/Image')) { mkdir('../Users/Image', 0755, true); }
                    $filename = 'Users/Image/bg_' . time() . '_' . rand(1000, 9999) . '.' . $ext; file_put_contents('../' . $filename, $decoded); $bg = $filename;
                } else { echo json_encode(["status" => "error", "message" => "Format gambar ditolak."]); exit; }
            }

            if (!empty($old_bg) && $old_bg !== $bg && (strpos($old_bg, 'Users/Image/') === 0 || strpos($old_bg, 'Uploads/') === 0)) {
                $old_path = '../' . $old_bg; if (file_exists($old_path)) unlink($old_path);
            }

            $stmt = $conn->prepare("UPDATE pegawai SET background_page=? WHERE id=?");
            $stmt->bind_param("ss", $bg, $id);
            if ($stmt->execute()) echo json_encode(["status" => "success", "background_page" => $bg]);
            else echo json_encode(["status" => "error", "message" => $stmt->error]);
            exit;
        }

        if ($action === 'buka_blokir') {
            if ($server_user_tingkat !== 'God Creator') {
                echo json_encode(["status" => "error", "message" => "Hanya God Creator yang dapat membuka blokir!"]); exit;
            }
            $id = $data['id'];
$stmt = $conn->prepare("UPDATE pegawai SET login_attempts = 0, penalty_level = 0, lock_until = NULL WHERE id = ?");
            $stmt->bind_param("s", $id);
            if ($stmt->execute()) echo json_encode(["status" => "success"]);
            else echo json_encode(["status" => "error"]);
            exit;
        }

        if ($action === 'ping_online') {
            $id = $server_user_id;
            $stmt = $conn->prepare("UPDATE pegawai SET akhir_aktif = NOW() WHERE id = ?");
            $stmt->bind_param("s", $id);
            $stmt->execute();

            $res = $conn->query("SELECT COUNT(*) as aktif FROM pegawai WHERE akhir_aktif >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)");
            $row = $res->fetch_assoc();

            $exp_stmt = $conn->prepare("SELECT exp FROM pegawai WHERE id = ?");
$exp_stmt->bind_param("s", $id);
$exp_stmt->execute();
$exp_res = $exp_stmt->get_result();
            $exp_val = 0; if ($exp_res->num_rows > 0) { $exp_val = $exp_res->fetch_assoc()['exp']; }

            echo json_encode(["status" => "success", "online_count" => $row['aktif'], "exp" => (int)$exp_val]);
            exit;
        }

        // =========================================================
        // LOGIKA BULK INSERT EXCEL
        // =========================================================
        if ($action === 'import_bulk') {
            if ($server_user_tingkat === 'Staf' || $server_user_tingkat === 'Human') {
                echo json_encode(["status" => "error", "message" => "Akses Ditolak! Anda tidak berhak mengimpor data."]); exit;
            }

            $pegawai_list = $data['data'] ?? [];
            if (empty($pegawai_list)) {
                echo json_encode(["status" => "error", "message" => "Data Excel kosong atau tidak terbaca."]); exit;
            }

            $berhasil = 0;
            $dilewati = 0;
            $default_password = password_hash('123456', PASSWORD_DEFAULT);

            $format_tanggal = function($tgl_str) {
                if (is_numeric($tgl_str) && $tgl_str > 10000) {
                    $unix_date = ($tgl_str - 25569) * 86400;
                    return gmdate("Y-m-d", $unix_date);
                }

                $tgl_str = trim((string)$tgl_str);
                if (empty($tgl_str) || $tgl_str === '-' || $tgl_str === '0000-00-00') {
                    return null;
                }

                if (strpos($tgl_str, '/') !== false) {
                    $parts = explode('/', $tgl_str);
                    if (count($parts) === 3) {
                        $day = str_pad($parts[0], 2, '0', STR_PAD_LEFT);
                        $month = str_pad($parts[1], 2, '0', STR_PAD_LEFT);
                        $year = $parts[2];

                        if (strlen($year) === 2) {
                            $year = ($year > 50 ? '19' : '20') . $year;
                        }

                        if (checkdate((int)$month, (int)$day, (int)$year)) {
                            return "$year-$month-$day";
                        }
                    }
                }

                if (strpos($tgl_str, '-') !== false) {
                    $parts = explode('-', $tgl_str);
                    if (count($parts) === 3) {
                        if (strlen($parts[0]) === 2 && strlen($parts[2]) === 4) {
                            $day = $parts[0];
                            $month = $parts[1];
                            $year = $parts[2];
                            if (checkdate((int)$month, (int)$day, (int)$year)) {
                                return "$year-$month-$day";
                            }
                        }
                    }
                }

                $timestamp = strtotime($tgl_str);
                if ($timestamp !== false && $timestamp > 0) {
                    return date('Y-m-d', $timestamp);
                }

                return null;
            };

            $stmt = $conn->prepare("INSERT INTO pegawai (id, nama, nip, jabatan, pangkat, golongan, bagian, status, password, tingkat, nik, tempat_lahir, tgl_lahir, alamat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
$cek_stmt = $conn->prepare("SELECT id FROM pegawai WHERE (nip = ? AND nip != '') OR nama = ?");

            foreach ($pegawai_list as $row) {
                $nama_val = $row['nama'] ?? ($row['Nama_Lengkap'] ?? ($row['nama_lengkap'] ?? ''));
                if (empty(trim($nama_val))) continue;

                $id = uniqid('peg_', true) . rand(1000, 9999);
                $nama = trim($nama_val);

                $nip_val = $row['nip'] ?? ($row['NIP'] ?? '');
                $nip = ($nip_val === '-') ? '' : trim($nip_val);

                $cek_stmt->bind_param("ss", $nip, $nama);
                $cek_stmt->execute();
                $cek = $cek_stmt->get_result();
                if ($cek->num_rows > 0) {
                    $dilewati++;
                    continue;
                }

                $jabatan = trim($row['jabatan'] ?? ($row['Jabatan'] ?? ''));
                $pangkat_val = $row['pangkat'] ?? ($row['Pangkat'] ?? '');
                $pangkat = ($pangkat_val === '-') ? '' : trim($pangkat_val);

                $gol_val = $row['golongan'] ?? ($row['Golongan'] ?? '');
                $golongan = ($gol_val === '-') ? '' : trim($gol_val);

                $bagian = trim($row['bagian'] ?? ($row['Bagian'] ?? ''));
                $status_raw = trim($row['status'] ?? ($row['Status'] ?? 'PNS'));
                if (stripos($status_raw, 'DPRD') !== false) {
                    $status = 'Anggota DPRD';
                } elseif (stripos($status_raw, 'Paruh Waktu') !== false) {
                    $status = 'PPPK Paruh Waktu';
                } elseif (stripos($status_raw, 'PPPK') !== false) {
                    $status = 'PPPK';
                } elseif (stripos($status_raw, 'Honorer') !== false || stripos($status_raw, 'Kontrak') !== false) {
                    $status = 'Kontrak';
                } elseif (stripos($status_raw, 'PNS') !== false || stripos($status_raw, 'ASN') !== false) {
                    $status = 'PNS';
                } else {
                    $status = $status_raw ?: 'PNS';
                }

                $tingkat_input = trim($row['tingkat'] ?? ($row['Tingkat_Akses'] ?? ($row['tingkat_akses'] ?? 'Staf')));
                $akses_terlarang = ['God Creator', 'Super Admin', 'Pengguna Anggaran'];

                if (in_array($tingkat_input, $akses_terlarang)) {
                    $tingkat = 'Staf';
                } else {
                    $tingkat = empty($tingkat_input) ? 'Staf' : $tingkat_input;
                }

                $nik_val = $row['nik'] ?? ($row['NIK'] ?? '');
                $nik = ($nik_val === '-') ? '' : trim($nik_val);

                $tempat_val = $row['tempat_lahir'] ?? ($row['Tempat_Lahir'] ?? '');
                $tempat_lahir = ($tempat_val === '-') ? '' : trim($tempat_val);

                $tgl_lahir_raw = $row['tgl_lahir'] ?? ($row['Tanggal_Lahir'] ?? ($row['tanggal_lahir'] ?? ''));
                $tgl_lahir = $format_tanggal($tgl_lahir_raw);

                $alamat_val = $row['alamat'] ?? ($row['Alamat'] ?? '');
                $alamat = ($alamat_val === '-') ? '' : trim($alamat_val);

                $tgl_lahir_bind = ($tgl_lahir === null) ? null : $tgl_lahir;

                $stmt->bind_param("ssssssssssssss", $id, $nama, $nip, $jabatan, $pangkat, $golongan, $bagian, $status, $default_password, $tingkat, $nik, $tempat_lahir, $tgl_lahir_bind, $alamat);

                if ($stmt->execute()) {
                    $berhasil++;
                }
            }

            echo json_encode(["status" => "success", "total" => $berhasil, "dilewati" => $dilewati]);
            exit;
        }

        // =========================================================
        // LOGIKA SIMPAN UTAMA (DATA PEGAWAI)
        // =========================================================
        if ($action === 'simpan' || !isset($data['action'])) {
            $is_self_update = !empty($data['is_self_update']);

            // Hak akses ditentukan dari session server,
            // bukan dari nilai yang dikirim browser.
            $role_admin = ['God Creator', 'Super Admin'];

            if (
                !$is_self_update &&
                !in_array($server_user_tingkat, $role_admin, true)
            ) {
                echo json_encode([
                    "status" => "error",
                    "message" => "Akses Ditolak! Anda tidak berhak mengubah akun lain."
                ]);
                exit;
            }

            if ($is_self_update) {
                    $id = $server_user_id;
                } else {
                    if ($server_user_tingkat === 'Staf') {
                        echo json_encode(["status" => "error", "message" => "Akses Ditolak! Anda tidak berhak mengedit data pegawai lain."]); exit;
                    }
                    // ID kosong atau "new" = tambah pegawai baru, generate ID server-side
                    $id_from_frontend = trim($data['id'] ?? '');
                    if ($id_from_frontend === '' || $id_from_frontend === 'new') {
                        $id = uniqid('peg_', true) . rand(1000, 9999);
                    } else {
                        $id = $id_from_frontend;
                    }
            }

// Upload profil dapat mengirim file saja; pertahankan field lama yang tidak dikirim.
            $current = [];
            $current_stmt = $conn->prepare("SELECT nama, nip, jabatan, pangkat, golongan, bagian, status, password, tingkat, foto, nik, tempat_lahir, tgl_lahir, alamat FROM pegawai WHERE id = ? LIMIT 1");
            $current_stmt->bind_param("s", $id);
            $current_stmt->execute();
            $current_result = $current_stmt->get_result();
            if ($current_result && ($current_row = $current_result->fetch_assoc())) { $current = $current_row; }
            $current_stmt->close();

            $nama = $data['nama'] ?? ($current['nama'] ?? '');
            $nip = $data['nip'] ?? ($current['nip'] ?? '');
            $jabatan = $data['jabatan'] ?? ($current['jabatan'] ?? '');
            $pangkat = $data['pangkat'] ?? ($current['pangkat'] ?? '');
            $golongan = $data['golongan'] ?? ($current['golongan'] ?? '');
            $bagian = $data['bagian'] ?? ($current['bagian'] ?? '');
            $status = $data['status'] ?? ($current['status'] ?? '');
            $password_input = $data['password'] ?? '';
            $tingkat = $data['tingkat'] ?? ($current['tingkat'] ?? 'Staf');
            $foto = array_key_exists('foto', $data) ? $data['foto'] : ($current['foto'] ?? '');
            $uploaded_foto = saveEmployeeUpload($_FILES['foto'] ?? $_FILES['file'] ?? null, 'pegawai', ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
            if ($uploaded_foto !== null) { $foto = $uploaded_foto; }

            $nik = $data['nik'] ?? ($current['nik'] ?? '');
            $tempat_lahir = $data['tempat_lahir'] ?? ($current['tempat_lahir'] ?? '');
            $tgl_lahir = $data['tgl_lahir'] ?? ($current['tgl_lahir'] ?? '');
            $alamat = $data['alamat'] ?? ($current['alamat'] ?? '');

            if ($uploaded_foto === null && preg_match('/^data:image\/(\w+);base64,/', $foto, $type)) {
                $base64_data = substr($foto, strpos($foto, ',') + 1); $base64_data = str_replace(' ', '+', $base64_data);
                $decoded = base64_decode($base64_data);
                $finfo = new finfo(FILEINFO_MIME_TYPE); $mime = $finfo->buffer($decoded);

                if (in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'])) {
                    $ext = explode('/', $mime)[1]; if (!file_exists('../Users/Image')) { mkdir('../Users/Image', 0755, true); }
                    $filename = 'Users/Image/pegawai_' . time() . '_' . rand(1000, 9999) . '.' . $ext; file_put_contents('../' . $filename, $decoded); $foto = $filename;
                } else { echo json_encode(["status" => "error", "message" => "Format gambar ditolak karena alasan keamanan."]); exit; }
            }

            $cek_stmt = $conn->prepare("SELECT id, foto FROM pegawai WHERE id = ?");
$cek_stmt->bind_param("s", $id);
$cek_stmt->execute();
$cek = $cek_stmt->get_result();
            if ($cek->num_rows > 0) {
                $row_old = $cek->fetch_assoc();
                $old_foto = $row_old['foto'];
                if (!empty($old_foto) && $foto !== $old_foto && (strpos($old_foto, 'Users/Image/') === 0 || strpos($old_foto, 'Uploads/') === 0)) {
                    $old_path = '../' . $old_foto; if (file_exists($old_path)) unlink($old_path);
                }

                if ($is_self_update) {
                    if (!empty($password_input)) {
                        $password_final = password_hash($password_input, PASSWORD_DEFAULT);
                        $stmt = $conn->prepare("UPDATE pegawai SET nama=?, password=?, foto=? WHERE id=?");
                        $stmt->bind_param("ssss", $nama, $password_final, $foto, $id);
                    } else {
                        $stmt = $conn->prepare("UPDATE pegawai SET nama=?, foto=? WHERE id=?");
                        $stmt->bind_param("sss", $nama, $foto, $id);
                    }
                } else {
                    if (!empty($password_input)) {
                        $password_final = password_hash($password_input, PASSWORD_DEFAULT);
                        $stmt = $conn->prepare("UPDATE pegawai SET nama=?, nip=?, jabatan=?, pangkat=?, golongan=?, bagian=?, status=?, password=?, tingkat=?, foto=?, nik=?, tempat_lahir=?, tgl_lahir=?, alamat=? WHERE id=?");
                        $stmt->bind_param("sssssssssssssss", $nama, $nip, $jabatan, $pangkat, $golongan, $bagian, $status, $password_final, $tingkat, $foto, $nik, $tempat_lahir, $tgl_lahir, $alamat, $id);
                    } else {
                        $stmt = $conn->prepare("UPDATE pegawai SET nama=?, nip=?, jabatan=?, pangkat=?, golongan=?, bagian=?, status=?, tingkat=?, foto=?, nik=?, tempat_lahir=?, tgl_lahir=?, alamat=? WHERE id=?");
                        $stmt->bind_param("ssssssssssssss", $nama, $nip, $jabatan, $pangkat, $golongan, $bagian, $status, $tingkat, $foto, $nik, $tempat_lahir, $tgl_lahir, $alamat, $id);
                    }
                }
            } else {
                if ($is_self_update) throw new Exception("Pengguna biasa tidak dapat membuat pegawai baru.");
                $password_final = password_hash($password_input, PASSWORD_DEFAULT);
                $stmt = $conn->prepare("INSERT INTO pegawai (id, nama, nip, jabatan, pangkat, golongan, bagian, status, password, tingkat, foto, nik, tempat_lahir, tgl_lahir, alamat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->bind_param("sssssssssssssss", $id, $nama, $nip, $jabatan, $pangkat, $golongan, $bagian, $status, $password_final, $tingkat, $foto, $nik, $tempat_lahir, $tgl_lahir, $alamat);
            }

            if ($stmt->execute()) echo json_encode(["status" => "success", "foto" => $foto]);
            else echo json_encode(["status" => "error", "message" => $stmt->error]);
            exit;
        }
        // ==========================================
        // API VIP DONATUR (KHUSUS GOD CREATOR)
        // ==========================================
        if ($action == 'toggle_donatur') {
        if ($server_user_tingkat !== 'God Creator') {
            echo json_encode([
                "status" => "error",
                "message" => "Akses Ditolak! Hanya God Creator yang dapat mengubah lencana."
            ]);
            exit;
        }

        $id = $data['id'];
$status = (int)$data['status'];

if (!in_array($status, [0, 1], true)) {
    echo json_encode([
        "status" => "error",
        "message" => "Status lencana tidak valid."
    ]);
    exit;
}

$stmt = $conn->prepare("UPDATE pegawai SET is_donatur = ? WHERE id = ?");
$stmt->bind_param("is", $status, $id);
if ($stmt->execute()) {
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => "Gagal mengubah status: " . $stmt->error]);
}
            exit;
        }
        if ($action == 'toggle_sangean') {
        if ($server_user_tingkat !== 'God Creator') {
            echo json_encode([
                "status" => "error",
                "message" => "Akses Ditolak! Hanya God Creator yang dapat mengubah lencana."
            ]);
            exit;
        }

        $id = $data['id'];
$status = (int)$data['status'];

if (!in_array($status, [0, 1], true)) {
    echo json_encode([
        "status" => "error",
        "message" => "Status lencana tidak valid."
    ]);
    exit;
}

$stmt = $conn->prepare("UPDATE pegawai SET is_sangean = ? WHERE id = ?");
$stmt->bind_param("is", $status, $id);
if ($stmt->execute()) {
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => "Gagal mengubah status: " . $stmt->error]);
}
            exit;
        }

    }
    elseif ($method == 'DELETE') {
        if ($server_user_tingkat === 'Staf' || $server_user_tingkat === 'Human') {
            echo json_encode(["status" => "error", "message" => "Anda tidak memiliki wewenang untuk menghapus data pegawai!"]); exit;
        }

        $data = json_decode(file_get_contents("php://input"), true);
$id = $data['id'];

$cek_stmt = $conn->prepare("SELECT foto, cover, frame, background_page, stiker FROM pegawai WHERE id = ?");
$cek_stmt->bind_param("s", $id);
$cek_stmt->execute();
$cek = $cek_stmt->get_result();
        if ($cek->num_rows > 0) {
            $row_del = $cek->fetch_assoc();
            foreach(['foto', 'cover', 'frame', 'background_page'] as $col) {
                if (!empty($row_del[$col]) && (strpos($row_del[$col], 'Users/Image/') === 0 || strpos($row_del[$col], 'Uploads/') === 0)) {
                    $path = '../' . $row_del[$col]; if (file_exists($path)) unlink($path);
                }
            }

            if (!empty($row_del['stiker'])) {
                $stikers = json_decode($row_del['stiker'], true);
                if(is_array($stikers)){
                    foreach($stikers as $stiker_path){
                        if (strpos($stiker_path, 'Users/Image/') === 0 || strpos($stiker_path, 'Uploads/') === 0) {
                            if (file_exists('../' . $stiker_path)) unlink('../' . $stiker_path);
                        }
                    }
                }
            }
        }

        $del_stmt = $conn->prepare("DELETE FROM penugasan WHERE pegawai_id = ? OR input_by = ?");
$del_stmt->bind_param("ss", $id, $id);
$del_stmt->execute();
$del_stmt->close();

$del_stmt = $conn->prepare("DELETE FROM forum_posts WHERE pegawai_id = ?");
$del_stmt->bind_param("s", $id);
$del_stmt->execute();
$del_stmt->close();

$del_stmt = $conn->prepare("DELETE FROM forum_comments WHERE pegawai_id = ?");
$del_stmt->bind_param("s", $id);
$del_stmt->execute();
$del_stmt->close();

$del_stmt = $conn->prepare("DELETE FROM private_chats WHERE sender_id = ? OR receiver_id = ?");
$del_stmt->bind_param("ss", $id, $id);
$del_stmt->execute();
$del_stmt->close();

        $stmt = $conn->prepare("DELETE FROM pegawai WHERE id = ?");
        $stmt->bind_param("s", $id);
        if ($stmt->execute()) echo json_encode(["status" => "success"]);
        else echo json_encode(["status" => "error"]);
    }
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>