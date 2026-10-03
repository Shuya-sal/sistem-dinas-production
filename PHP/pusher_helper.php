<?php
// Kredensial dibaca dari environment atau file di luar public_html.
function getPusherConfig() {
    $config = [
        'app_id' => trim((string)getenv('PUSHER_APP_ID')),
        'key' => trim((string)getenv('PUSHER_KEY')),
        'secret' => trim((string)getenv('PUSHER_SECRET')),
        'cluster' => trim((string)(getenv('PUSHER_CLUSTER') ?: 'ap1'))
    ];

    // PHP/api_*.php berada di public_html/PHP; dirname(dirname(__DIR__))
    // menunjuk ke home akun cPanel, bukan document root.
    if (!isPusherConfiguredValues($config)) {
        $config_file = dirname(dirname(__DIR__)) . '/pusher-config.php';
        if (is_file($config_file) && is_readable($config_file)) {
            $file_config = require $config_file;
            if (is_array($file_config)) {
                $config = array_merge($config, array_intersect_key($file_config, $config));
                foreach ($config as $name => $value) {
                    $config[$name] = trim((string)$value);
                }
            }
        }
    }

    return $config;
}

function isPusherConfiguredValues($config) {
    return is_array($config)
        && $config['app_id'] !== ''
        && $config['key'] !== ''
        && $config['secret'] !== ''
        && $config['cluster'] !== '';
}

function isPusherConfigured() {
    $config = getPusherConfig();
    return $config['app_id'] !== '' && $config['key'] !== '' && $config['secret'] !== '';
}

function kirimPusher($channel, $event, $data) {
    $config = getPusherConfig();
    if (!isPusherConfigured()) {
        // Realtime bersifat tambahan; aplikasi tetap bekerja melalui polling fallback.
        return false;
    }

    $app_id = $config['app_id'];
    $key = $config['key'];
    $secret = $config['secret'];
    $cluster = $config['cluster'];

    $body = json_encode([
        'name' => $event,
        'channels' => [$channel],
        'data' => json_encode($data)
    ]);
    if ($body === false) return false;

    $body_md5 = md5($body);
    $path = "/apps/$app_id/events";
    $auth_timestamp = time();
    $auth_version = '1.0';
    $sign_string = "POST\n$path\nauth_key=$key&auth_timestamp=$auth_timestamp&auth_version=$auth_version&body_md5=$body_md5";
    $auth_signature = hash_hmac('sha256', $sign_string, $secret);
    $url = "https://api-$cluster.pusher.com$path?auth_key=$key&auth_timestamp=$auth_timestamp&auth_version=$auth_version&body_md5=$body_md5&auth_signature=$auth_signature";

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
    curl_setopt($ch, CURLOPT_TIMEOUT, 3);
    $response = curl_exec($ch);
    $http_code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return $response !== false && $http_code >= 200 && $http_code < 300;
}
?>