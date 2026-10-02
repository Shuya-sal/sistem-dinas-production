<?php
if (session_status() === PHP_SESSION_NONE) { session_start(); }
header('Content-Type: application/json');

if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(["status" => "error", "message" => "Metode tidak diizinkan."]);
    exit;
}

// 1. Panggil koneksi ke database; POST logout divalidasi CSRF secara global.
require 'koneksi.php';

// 2. Jika ada sesi pegawai yang sedang aktif, matikan status onlinenya di MySQL
if (isset($_SESSION['pegawai_id'])) {
    $pegawai_id = $_SESSION['pegawai_id'];
    
    catat_log($conn, $pegawai_id, "LOGOUT SISTEM", "Pengguna keluar dari aplikasi.");
    // KODE BARU: Kita paksa mundurkan waktu aktifnya 10 menit ke belakang
    // sehingga MySQL langsung menganggapnya OFFLINE detik ini juga!
    $stmt = $conn->prepare("UPDATE pegawai SET akhir_aktif = DATE_SUB(NOW(), INTERVAL 10 MINUTE) WHERE id = ?");
    $stmt->bind_param("s", $pegawai_id);
    $stmt->execute();
}

// 3. Setelah status dimatikan, barulah hancurkan tiket dan gemboknya
session_unset();
session_destroy();

// KODE BARU: TEMBAK PUSHER SAAT ADA YANG LOGOUT
require_once 'pusher_helper.php';
$res_online = $conn->query("SELECT COUNT(*) as aktif FROM pegawai WHERE akhir_aktif >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)");
if ($res_online) {
    $aktif = $res_online->fetch_assoc()['aktif'];
    kirimPusher('private-channel-global', 'update_online', ['online_count' => $aktif]);
}

echo json_encode(["status" => "success"]);
?>