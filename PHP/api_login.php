<?php
error_reporting(0);
ini_set('display_errors', 0);
if (session_status() === PHP_SESSION_NONE) { session_start(); }
session_regenerate_id(true); 

header("Content-Type: application/json");
require 'koneksi.php';

$data = json_decode(file_get_contents("php://input"), true);
$identitas = trim($data['nip'] ?? ''); 
$password = $data['password'] ?? '';

if ($identitas === '-') {
    echo json_encode(["status" => "error", "message" => "Anda tidak bisa login menggunakan NIP '-'. Harap gunakan Nama Lengkap Anda!"]);
    exit; 
}

$stmt = $conn->prepare("SELECT * FROM pegawai WHERE nip = ? OR nama = ?");
$stmt->bind_param("ss", $identitas, $identitas);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    if (!empty($row['lock_until']) && strtotime($row['lock_until']) > time()) {
        $menit_tersisa = ceil((strtotime($row['lock_until']) - time()) / 60);
        echo json_encode(["status" => "error", "message" => "Peringatan Keamanan! Akun ini sedang dikunci. Coba lagi dalam $menit_tersisa menit."]);
        exit;
    }

    if (password_verify($password, $row['password'])) {
        $update_stmt = $conn->prepare("UPDATE pegawai SET login_attempts = 0, penalty_level = 0, lock_until = NULL, akhir_aktif = NOW() WHERE id = ?");
        $update_stmt->bind_param("s", $row['id']);
        $update_stmt->execute();

        $_SESSION['pegawai_id'] = $row['id'];
        $_SESSION['pegawai_tingkat'] = $row['tingkat'];
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

        if (!headers_sent()) {
            setcookie('csrf_token', $_SESSION['csrf_token'], [
                'expires' => 0,
                'path' => '/',
                'samesite' => 'Lax',
                'httponly' => false
            ]);
        }

        catat_log($conn, $row['id'], "LOGIN SISTEM", "Pengguna berhasil masuk ke sistem Super App");

        require_once 'pusher_helper.php';
        $res_online = $conn->query("SELECT COUNT(*) as aktif FROM pegawai WHERE akhir_aktif >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)");
        if ($res_online) {
            $aktif = $res_online->fetch_assoc()['aktif'];
            kirimPusher('private-channel-global', 'update_online', ['online_count' => $aktif]);
        }

        unset($row['password']); 
        // KODE BARU: Kirim csrf_token ke Javascript
        echo json_encode(["status" => "success", "user" => $row, "csrf_token" => $_SESSION['csrf_token']]);
    } else {
        $attempts = $row['login_attempts'] + 1;
        $level = $row['penalty_level'] ?? 0;
        
        $max_attempts = 5; $lock_minutes = 15; $next_level = 1;
        if ($level == 1) { $max_attempts = 2; $lock_minutes = 30; $next_level = 2; } 
        elseif ($level >= 2) { $max_attempts = 1; $lock_minutes = 60; $next_level = 2; }
        
        if ($attempts >= $max_attempts) {
            $lock_stmt = $conn->prepare("UPDATE pegawai SET login_attempts = 0, penalty_level = ?, lock_until = DATE_ADD(NOW(), INTERVAL $lock_minutes MINUTE) WHERE id = ?");
            $lock_stmt->bind_param("is", $next_level, $row['id']);
            $lock_stmt->execute();
            echo json_encode(["status" => "error", "message" => "Peringatan Keamanan! Anda salah $max_attempts kali. Akun dikunci sementara $lock_minutes menit!"]);
        } else {
            $update_stmt = $conn->prepare("UPDATE pegawai SET login_attempts = ? WHERE id = ?");
            $update_stmt->bind_param("is", $attempts, $row['id']);
            $update_stmt->execute();
            
            $sisa = $max_attempts - $attempts;
            echo json_encode(["status" => "error", "message" => "Password salah! Sisa percobaan: $sisa kali sebelum akun dikunci."]);
        }
    }
} else {
    echo json_encode(["status" => "error", "message" => "Identitas (NIP/Nama) tidak ditemukan di sistem."]);
}
?>