<?php
error_reporting(0);
ini_set('display_errors', 0);
header('Content-Type: application/json');
header('Cache-Control: no-store');
require 'koneksi.php';
require_once 'pusher_helper.php';

if (!isset($_SESSION['pegawai_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Sesi tidak valid.']);
    exit;
}

$config = getPusherConfig();
if (!isPusherConfigured()) {
    echo json_encode([
        'status' => 'disabled',
        'message' => 'Realtime belum dikonfigurasi; polling fallback aktif.'
    ]);
    exit;
}

// Hanya key dan cluster yang bersifat publik. App ID dan secret tidak pernah dikirim.
echo json_encode([
    'status' => 'success',
    'key' => $config['key'],
    'cluster' => $config['cluster']
]);
?>