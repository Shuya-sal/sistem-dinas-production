<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
header("Content-Type: application/json");
require 'koneksi.php';

if (!isset($_SESSION['pegawai_id'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "step" => "session", "msg" => "Akses Ilegal"]);
    exit;
}

$out = [];

// 1. Cek kolom di tabel
$res = $conn->query("DESCRIBE pegawai");
$kolom = [];
while ($r = $res->fetch_assoc()) $kolom[] = $r['Field'];
$out['kolom_pegawai'] = $kolom;
$out['kolom_tersedia'] = [
    'nik' => in_array('nik', $kolom),
    'tempat_lahir' => in_array('tempat_lahir', $kolom),
    'tgl_lahir' => in_array('tgl_lahir', $kolom),
    'alamat' => in_array('alamat', $kolom),
];

// 2. Coba query kolom lengkap (tanpa @ suppression, biar error keliatan)
$kolom_str = implode(', ', $kolom);
$sql = "SELECT $kolom_str FROM pegawai ORDER BY nama ASC LIMIT 3";
$out['sql_coba'] = $sql;
$result = $conn->query($sql);
if ($result === false) {
    $out['query_error'] = $conn->error;
    $out['query_errno'] = $conn->errno;
} else {
    $rows = [];
    while ($r = $result->fetch_assoc()) $rows[] = $r;
    $out['baris'] = count($rows);
    $out['contoh'] = $rows[0] ?? null;
}

$out['post_max_size'] = ini_get('post_max_size');
$out['memory_limit'] = ini_get('memory_limit');
$out['max_execution_time'] = ini_get('max_execution_time');
$out['mysqli_report'] = mysqli_report(MYSQLI_REPORT_OFF);

echo json_encode($out, JSON_PRETTY_PRINT);
