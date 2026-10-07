<?php
error_reporting(0);
ini_set('display_errors', 0);
if (session_status() === PHP_SESSION_NONE) { session_start(); }
header("Content-Type: application/json");
require 'koneksi.php';

// 1. DETAK JANTUNG: Perbarui waktu terakhir aktif milik pegawai ini menjadi DETIK INI JUGA
if (isset($_SESSION['pegawai_id'])) {
    $id = $_SESSION['pegawai_id'];
    $stmt = $conn->prepare("UPDATE pegawai SET akhir_aktif = NOW() WHERE id = ?");
    $stmt->bind_param("s", $id);
    $stmt->execute();
}

// 2. SINKRONISASI: Hitung total semua pegawai yang masih berdetak dalam 5 menit terakhir
$res = $conn->query("SELECT COUNT(*) as aktif FROM pegawai WHERE akhir_aktif >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)");
$aktif = $res ? $res->fetch_assoc()['aktif'] : 0;

echo json_encode([
    "status" => "success",
    "online_count" => $aktif,
    "csrf_token" => $_SESSION['csrf_token'] ?? ''
]);
?>
