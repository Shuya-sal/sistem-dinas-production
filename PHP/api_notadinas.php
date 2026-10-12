<?php
error_reporting(0);
ini_set('display_errors', 0);
header("Content-Type: application/json");
require 'koneksi.php';

if (!isset($_SESSION['pegawai_id'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Akses Ilegal!"]);
    exit;
}

$user_tingkat = $_SESSION['pegawai_tingkat'] ?? 'Staf';
$method = $_SERVER['REQUEST_METHOD'];

// ==============================================
// AMBIL DATA BODY JSON
// ==============================================
$data = [];
if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true) ?? [];
}

// ==============================================
// GET  → list nota dinas
// POST → simpan
// DELETE → hapus
// ==============================================

// ===================================================================
// JIKA TABEL BELUM ADA → auto-create (aman, idempotent)
// ===================================================================
$conn->query("
    CREATE TABLE IF NOT EXISTS nota_dinas (
        id VARCHAR(80) PRIMARY KEY,
        jenis ENUM('DD','LD') NOT NULL,
        kategori VARCHAR(50) NOT NULL,
        nomor VARCHAR(100) DEFAULT '',
        tanggal DATE DEFAULT NULL,
        dasar VARCHAR(255) DEFAULT '',
        maksud TEXT,
        lokasi VARCHAR(255) DEFAULT '',
        tgl_mulai DATE DEFAULT NULL,
        tgl_selesai DATE DEFAULT NULL,
        pembebanan VARCHAR(255) DEFAULT '',
        pegawai_json TEXT,
        created_by VARCHAR(50) DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

// ==============================================
// GET — daftar nota dinas
// ==============================================
if ($method === 'GET') {
    $result = $conn->query("SELECT * FROM nota_dinas ORDER BY created_at DESC");
    $data_out = [];
    while ($row = $result->fetch_assoc()) $data_out[] = $row;
    echo json_encode(["status" => "success", "data" => $data_out]);
    exit;
}

// ==============================================
// POST — simpan / update nota dinas
// ==============================================
if ($method === 'POST') {
    $action = trim($data['action'] ?? '');

    // ----- list -----
    if ($action === 'list') {
        $result = $conn->query("SELECT * FROM nota_dinas ORDER BY created_at DESC");
        $rows = [];
        while ($row = $result->fetch_assoc()) $rows[] = $row;
        echo json_encode(["status" => "success", "data" => $rows]);
        exit;
    }

    // ----- simpan -----
    if ($action === 'simpan') {
        $id          = trim($data['id'] ?? '');
        $jenis       = trim($data['jenis'] ?? '');
        $kategori    = trim($data['kategori'] ?? '');
        $nomor       = trim($data['nomor'] ?? '');
        $tanggal     = trim($data['tanggal'] ?? '');
        $dasar       = trim($data['dasar'] ?? '');
        $maksud      = trim($data['maksud'] ?? '');
        $lokasi      = trim($data['lokasi'] ?? '');
        $tgl_mulai   = trim($data['tgl_mulai'] ?? '');
        $tgl_selesai = trim($data['tgl_selesai'] ?? '');
        $pembebanan  = trim($data['pembebanan'] ?? '');
        $pegawai_json = trim($data['pegawai_json'] ?? '[]');
        $created_by  = $_SESSION['pegawai_id'];

        if ($id === '') {
            $id = 'nd_' . uniqid() . '_' . rand(1000, 9999);
        }

        // sanitasi
        $jenis    = in_array($jenis, ['DD','LD']) ? $jenis : 'DD';
        $kategori = preg_replace('/[^a-z0-9_]/', '', strtolower($kategori));

        // Cek apakah sudah ada
        $cek = $conn->prepare("SELECT id FROM nota_dinas WHERE id = ?");
        $cek->bind_param("s", $id);
        $cek->execute();
        $ada = $cek->get_result()->num_rows > 0;
        $cek->close();

        if ($ada) {
            $sql = "UPDATE nota_dinas SET
                jenis=?, kategori=?, nomor=?, tanggal=?, dasar=?, maksud=?,
                lokasi=?, tgl_mulai=?, tgl_selesai=?, pembebanan=?, pegawai_json=?
                WHERE id=?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ssssssssssss",
                $jenis, $kategori, $nomor, $tanggal, $dasar, $maksud,
                $lokasi, $tgl_mulai, $tgl_selesai, $pembebanan, $pegawai_json, $id
            );
        } else {
            $sql = "INSERT INTO nota_dinas
                (id,jenis,kategori,nomor,tanggal,dasar,maksud,lokasi,tgl_mulai,tgl_selesai,pembebanan,pegawai_json,created_by)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("sssssssssssss",
                $id, $jenis, $kategori, $nomor, $tanggal, $dasar, $maksud,
                $lokasi, $tgl_mulai, $tgl_selesai, $pembebanan, $pegawai_json, $created_by
            );
        }

        if ($stmt->execute()) {
            echo json_encode(["status" => "success", "id" => $id]);
        } else {
            echo json_encode(["status" => "error", "message" => $stmt->error]);
        }
        $stmt->close();
        exit;
    }

    // ----- hapus -----
    if ($action === 'hapus') {
        $id = trim($data['id'] ?? '');
        $stmt = $conn->prepare("DELETE FROM nota_dinas WHERE id = ?");
        $stmt->bind_param("s", $id);
        if ($stmt->execute()) {
            echo json_encode(["status" => "success"]);
        } else {
            echo json_encode(["status" => "error", "message" => $stmt->error]);
        }
        $stmt->close();
        exit;
    }

    // action tidak dikenali
    echo json_encode(["status" => "error", "message" => "Action tidak dikenal."]);
    exit;
}

// ==============================================
// DELETE — hapus nota dinas
// ==============================================
if ($method === 'DELETE') {
    $data = json_decode(file_get_contents("php://input"), true) ?? [];
    $id = trim($data['id'] ?? '');
    $stmt = $conn->prepare("DELETE FROM nota_dinas WHERE id = ?");
    $stmt->bind_param("s", $id);
    if ($stmt->execute()) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error"]);
    }
    $stmt->close();
    exit;
}

echo json_encode(["status" => "error", "message" => "Metode tidak diizinkan."]);
?>
