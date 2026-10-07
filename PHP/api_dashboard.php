<?php
error_reporting(0);
ini_set('display_errors', 0);
header("Content-Type: application/json");
require 'koneksi.php';

session_start();
if (!isset($_SESSION['pegawai_id'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Akses Ilegal!"]);
    exit;
}

try {
    // =========================================================
    // OPTIMASI & KEAMANAN: Strict Type Casting (Anti Tanggal Palsu)
    // =========================================================
    $raw_bulan = isset($_GET['bulan']) ? (int)$_GET['bulan'] : 0;
    $raw_tahun = isset($_GET['tahun']) ? (int)$_GET['tahun'] : (int)date('Y');

    // Pastikan bulan hanya antara 1 - 12 (lalu ubah jadi format 01, 02, dst)
    $bulan = ($raw_bulan > 0 && $raw_bulan <= 12) ? str_pad($raw_bulan, 2, '0', STR_PAD_LEFT) : '';
    // Pastikan tahun logis (di atas 2000)
    $tahun = ($raw_tahun > 2000) ? $raw_tahun : date('Y');

    $bagian = isset($_GET['bagian']) ? trim($_GET['bagian']) : '';

    $penugasanConditions = [];
$pegawaiConditions = [];
$types_penugasan = '';
$params_penugasan = [];
$types_pegawai = '';
$params_pegawai = [];

if (!empty($bulan)) {
    $start_date = "$tahun-$bulan-01";
    $end_date = date("Y-m-t", strtotime($start_date));
    $penugasanConditions[] = "d.tgl_dibuat >= ? AND d.tgl_dibuat <= ?";
    $types_penugasan .= 'ss';
    array_push($params_penugasan, $start_date, $end_date);
} else {
    $penugasanConditions[] = "d.tgl_dibuat >= ? AND d.tgl_dibuat <= ?";
    $types_penugasan .= 'ss';
    array_push($params_penugasan, $tahun . '-01-01', $tahun . '-12-31');
}

if (!empty($bagian)) {
    if ($bagian === 'Lainnya') {
        $penugasanConditions[] = "(p.bagian IS NULL OR p.bagian = '')";
        $pegawaiConditions[] = "(bagian IS NULL OR bagian = '')";
    } else {
        $penugasanConditions[] = "p.bagian = ?";
        $types_penugasan .= 's';
        $params_penugasan[] = $bagian;
        $pegawaiConditions[] = "bagian = ?";
        $types_pegawai .= 's';
        $params_pegawai[] = $bagian;
    }
}

    $q_dinas = $conn->prepare("SELECT COUNT(d.id) as total FROM penugasan d LEFT JOIN pegawai p ON d.pegawai_id = p.id WHERE " . implode(' AND ', $penugasanConditions));
$q_dinas->bind_param($types_penugasan, ...$params_penugasan);
$q_dinas->execute();
$total_dinas = $q_dinas->get_result()->fetch_assoc()['total'] ?? 0;

    $q_anggaran = $conn->prepare("
    SELECT SUM(
        COALESCE((tj.uang_harian * d.durasi), 0) +
        COALESCE(tj.berangkat, 0) +
        COALESCE(tj.pulang, 0) +
        COALESCE(d.harga_hotel, 0) +
        IF(LOWER(TRIM(p.status)) = 'anggota dprd', COALESCE(tj.uang_representasi, 0), 0)
    ) as total_anggaran
    FROM penugasan d
    LEFT JOIN pegawai p ON d.pegawai_id = p.id
    LEFT JOIN tujuan tj ON d.lokasi_tujuan = tj.nama AND d.jenis_tujuan = tj.jenis
    WHERE " . implode(' AND ', $penugasanConditions)
);
$q_anggaran->bind_param($types_penugasan, ...$params_penugasan);
$q_anggaran->execute();
$total_anggaran = $q_anggaran->get_result()->fetch_assoc()['total_anggaran'] ?? 0;

    $q_pegawai_count = $conn->prepare("SELECT COUNT(id) as total FROM pegawai WHERE " . implode(' AND ', $pegawaiConditions));
if (!empty($params_pegawai)) { $q_pegawai_count->bind_param($types_pegawai, ...$params_pegawai); }
$q_pegawai_count->execute();
$total_pegawai = $q_pegawai_count->get_result()->fetch_assoc()['total'] ?? 0;

    $label_chart = [];
    $data_chart = [];

    if (empty($bagian)) {
        $q_chart = $conn->prepare("
    SELECT p.bagian, COUNT(d.id) as jumlah
    FROM penugasan d
    LEFT JOIN pegawai p ON d.pegawai_id = p.id
    WHERE " . implode(' AND ', $penugasanConditions) . "
    GROUP BY p.bagian
    ORDER BY jumlah DESC
");
$q_chart->bind_param($types_penugasan, ...$params_penugasan);
$q_chart->execute();
$q_chart = $q_chart->get_result();
        while($row = $q_chart->fetch_assoc()){
            $label_chart[] = !empty($row['bagian']) ? $row['bagian'] : 'Lainnya';
            $data_chart[] = (int)$row['jumlah'];
        }
    } else {
        $q_chart = $conn->prepare("
    SELECT p.nama, COUNT(d.id) as jumlah
    FROM penugasan d
    LEFT JOIN pegawai p ON d.pegawai_id = p.id
    WHERE " . implode(' AND ', $penugasanConditions) . "
    GROUP BY p.nama
    ORDER BY jumlah DESC
");
$q_chart->bind_param($types_penugasan, ...$params_penugasan);
$q_chart->execute();
$q_chart = $q_chart->get_result();
        while($row = $q_chart->fetch_assoc()){
            $label_chart[] = !empty($row['nama']) ? $row['nama'] : 'Anonim';
            $data_chart[] = (int)$row['jumlah'];
        }
    }

    echo json_encode([
        "status" => "success",
        "total_dinas" => $total_dinas,
        "total_anggaran" => $total_anggaran,
        "total_pegawai" => $total_pegawai,
        "chart" => [
            "labels" => $label_chart,
            "data" => $data_chart
        ]
    ]);

} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>