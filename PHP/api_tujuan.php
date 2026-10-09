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

// ==========================================
// KODE PERBAIKAN: BLOKIR STAF & HUMAN
// Hanya God Creator (atau Admin) yang boleh merubah Master Biaya!
// ==========================================
if (($user_tingkat === 'Human' || $user_tingkat === 'Staf') && ($method === 'POST' || $method === 'DELETE')) {
    echo json_encode(["status" => "error", "message" => "Akses Ditolak! Anda tidak berhak mengubah Master Data Tujuan & Biaya."]);
    exit;
}

if ($method == 'GET') {
    $result = $conn->query("SELECT * FROM tujuan");
    $data = [];
    while ($row = $result->fetch_assoc()) $data[] = $row;
    echo json_encode($data);
} 
elseif ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    // ID kosong atau "new" = tambah tujuan baru, generate ID server-side
    $id_from_frontend = trim($data['id'] ?? '');
    if ($id_from_frontend === '' || $id_from_frontend === 'new') {
        $id = uniqid('tuj_', true) . rand(1000, 9999);
    } else {
        $id = $id_from_frontend;
    }
    $jenis = htmlspecialchars($data['jenis']);
    $nama = htmlspecialchars($data['nama']);
    $bunyi_berangkat = htmlspecialchars($data['bunyi_berangkat']);
    $bunyi_pulang = htmlspecialchars($data['bunyi_pulang']);
    $bunyi_tambahan = htmlspecialchars($data['bunyi_tambahan'] ?? '-');
    
    // ==========================================
    // KODE PERBAIKAN: PAKSA ABSOLUT (ANTI MINUS)
    // ==========================================
    $uang_harian = abs(floatval($data['uang_harian']));
    $pagu_hotel = abs(floatval($data['pagu_hotel'])); 
    $pagu_hotel_4 = abs(floatval($data['pagu_hotel_4'])); 
    $pagu_hotel_es2 = abs(floatval($data['pagu_hotel_es2'])); 
    $uang_representasi = abs(floatval($data['uang_representasi']));
    $harga_tiket_pp = abs(floatval($data['harga_tiket_pp'] ?? 0));
    $berangkat = abs(floatval($data['berangkat']));
    $pulang = abs(floatval($data['pulang']));
    $tambahan = abs(floatval($data['tambahan']));
    $total = abs(floatval($data['total']));

    $stmt_cek = $conn->prepare("SELECT id FROM tujuan WHERE id = ?");
    $stmt_cek->bind_param("s", $id);
    $stmt_cek->execute();
    $cek = $stmt_cek->get_result();
    
    if ($cek->num_rows > 0) {
        $stmt = $conn->prepare(
    "UPDATE tujuan SET
        jenis=?,
        nama=?,
        bunyi_berangkat=?,
        bunyi_pulang=?,
        bunyi_tambahan=?,
        uang_harian=?,
        pagu_hotel=?,
        pagu_hotel_4=?,
        pagu_hotel_es2=?,
        uang_representasi=?,
        berangkat=?,
        pulang=?,
        tambahan=?,
        harga_tiket_pp=?,
        total=?
     WHERE id=?"
);

$stmt->bind_param(
    "sssssdddddddddds",
    $jenis,
    $nama,
    $bunyi_berangkat,
    $bunyi_pulang,
    $bunyi_tambahan,
    $uang_harian,
    $pagu_hotel,
    $pagu_hotel_4,
    $pagu_hotel_es2,
    $uang_representasi,
    $berangkat,
    $pulang,
    $tambahan,
    $harga_tiket_pp,
    $total,
    $id
);
    } else {
        $stmt = $conn->prepare(
    "INSERT INTO tujuan (
        id,
        jenis,
        nama,
        bunyi_berangkat,
        bunyi_pulang,
        bunyi_tambahan,
        uang_harian,
        pagu_hotel,
        pagu_hotel_4,
        pagu_hotel_es2,
        uang_representasi,
        berangkat,
        pulang,
        tambahan,
        harga_tiket_pp,
        total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    $stmt->bind_param(
        "ssssssdddddddddd",
        $id,
        $jenis,
        $nama,
        $bunyi_berangkat,
        $bunyi_pulang,
        $bunyi_tambahan,
        $uang_harian,
        $pagu_hotel,
        $pagu_hotel_4,
        $pagu_hotel_es2,
        $uang_representasi,
        $berangkat,
        $pulang,
        $tambahan,
        $harga_tiket_pp,
        $total
    );
    }
    
    if ($stmt->execute()) echo json_encode(["status" => "success"]);
    else echo json_encode(["status" => "error", "message" => $stmt->error]);
}
elseif ($method == 'DELETE') {
    $data = json_decode(file_get_contents("php://input"), true);
    $id = $data['id'];
    
    $stmt = $conn->prepare("DELETE FROM tujuan WHERE id = ?");
    $stmt->bind_param("s", $id);
    if ($stmt->execute()) echo json_encode(["status" => "success"]);
    else echo json_encode(["status" => "error"]);
}
?>