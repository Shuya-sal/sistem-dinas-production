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

if (!isPusherConfigured()) {
    http_response_code(503);
    echo json_encode(['status' => 'error', 'message' => 'Realtime belum dikonfigurasi.']);
    exit;
}

$socket_id = trim((string)($_POST['socket_id'] ?? ''));
$channel_name = trim((string)($_POST['channel_name'] ?? ''));
$user_id = (string)$_SESSION['pegawai_id'];
$allowed_channels = [
    'private-chat-user-' . $user_id,
    'private-channel-global'
];

if (!preg_match('/^\d+\.\d+$/', $socket_id) || !in_array($channel_name, $allowed_channels, true)) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Channel tidak diizinkan.']);
    exit;
}

$config = getPusherConfig();
$string_to_sign = $socket_id . ':' . $channel_name;
$signature = hash_hmac('sha256', $string_to_sign, $config['secret']);

echo json_encode([
    'auth' => $config['key'] . ':' . $signature
]);
?>