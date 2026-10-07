<?php
// ==========================================
// SAKLAR MAINTENANCE (true = MATI, false = NYALA)
// ==========================================
$is_maintenance = false; 

if ($is_maintenance) {
    header("Content-Type: application/json");
    echo json_encode(["status" => "maintenance"]);
    exit; 
}

$host = "localhost";
$user = "root";
$pass = ""; 
$db   = "sistem_dinas";

// Baca kredensial produksi di luar public_html agar tidak tertimpa saat update dari GitHub
$db_config_file = dirname(dirname(__DIR__)) . '/db-config.php';
if (is_file($db_config_file) && is_readable($db_config_file)) {
    $file_db = require $db_config_file;
    if (is_array($file_db)) {
        $host = $file_db['host'] ?? $host;
        $user = $file_db['user'] ?? $user;
        $pass = $file_db['pass'] ?? $pass;
        $db   = $file_db['db']   ?? $db;
    }
}

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    header("Content-Type: application/json");
    die(json_encode(["status" => "error", "message" => "Terjadi gangguan pada server database. Silakan coba beberapa saat lagi."]));
}

function catat_log($conn, $pegawai_id, $aksi, $keterangan) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
    $stmt = $conn->prepare("INSERT INTO sys_logs (pegawai_id, aksi, keterangan, ip_address) VALUES (?, ?, ?, ?)");
    if ($stmt) {
        $stmt->bind_param("ssss", $pegawai_id, $aksi, $keterangan, $ip);
        $stmt->execute();
    }
}

if (session_status() === PHP_SESSION_NONE) {
    $is_https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
    if (!headers_sent()) {
        ini_set('session.cookie_httponly', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.cookie_samesite', 'Lax');
        if ($is_https) {
            ini_set('session.cookie_secure', '1');
        }
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'domain' => '',
            'secure' => $is_https,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
    }
    session_start();
}

if (isset($_SESSION['pegawai_id']) && empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

if (!empty($_SESSION['csrf_token']) && !headers_sent()) {
    if (empty($_COOKIE['csrf_token']) || $_COOKIE['csrf_token'] !== $_SESSION['csrf_token']) {
        setcookie('csrf_token', $_SESSION['csrf_token'], [
            'expires' => 0,
            'path' => '/',
            'samesite' => 'Lax',
            'httponly' => false
        ]);
    }
}

if (!function_exists('resolve_csrf_token')) {
    function resolve_csrf_token() {
        if (!empty($_SERVER['HTTP_X_CSRF_TOKEN'])) {
            return trim($_SERVER['HTTP_X_CSRF_TOKEN']);
        }
        if (!empty($_SERVER['HTTP_X_CSRF-TOKEN'])) {
            return trim($_SERVER['HTTP_X_CSRF-TOKEN']);
        }
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            if (is_array($headers)) {
                foreach ($headers as $k => $v) {
                    if (strcasecmp($k, 'X-CSRF-Token') === 0) {
                        return trim($v);
                    }
                }
            }
        }
        if (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            if (is_array($headers)) {
                foreach ($headers as $k => $v) {
                    if (strcasecmp($k, 'X-CSRF-Token') === 0) {
                        return trim($v);
                    }
                }
            }
        }
        if (!empty($_POST['csrf_token'])) {
            return trim($_POST['csrf_token']);
        }
        return '';
    }
}

$request_method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$target_script = basename($_SERVER['SCRIPT_NAME'] ?? '');
$is_state_change = in_array($request_method, ['POST', 'PUT', 'PATCH', 'DELETE']);
$is_exempt = in_array($target_script, ['api_login.php', 'ping.php']);

if ($is_state_change && !$is_exempt) {
    if (!isset($_SESSION['pegawai_id'])) {
        header("Content-Type: application/json");
        http_response_code(401);
        echo json_encode([
            "status" => "error",
            "code" => "SESSION_EXPIRED",
            "message" => "Sesi Anda telah berakhir. Silakan login kembali."
        ]);
        exit;
    }

    $provided_token = resolve_csrf_token();
    $expected_token = $_SESSION['csrf_token'] ?? '';

    if (empty($provided_token) || empty($expected_token) || !hash_equals($expected_token, $provided_token)) {
        header("Content-Type: application/json");
        http_response_code(403);
        echo json_encode([
            "status" => "error",
            "code" => "CSRF_TOKEN_INVALID",
            "message" => "Keamanan Siber Bekerja! Akses ditolak karena CSRF Token tidak valid."
        ]);
        exit;
    }

    if ($target_script !== 'api_forum.php') {
        $actor_id = $_SESSION['pegawai_id'] ?? 'Sistem';
        $payload_stream = file_get_contents("php://input");
        $payload_data = !empty($payload_stream) ? json_decode($payload_stream, true) : null;
        $operation = $payload_data['action'] ?? $_POST['action'] ?? 'Modifikasi Data';
        $log_action = $request_method . " - " . strtoupper(str_replace('.php', '', $target_script));
        $log_desc = "Aksi: " . $operation;
        catat_log($conn, $actor_id, $log_action, $log_desc);
    }
}
?>