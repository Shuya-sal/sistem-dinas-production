<?php
error_reporting(0);
ini_set('display_errors', 0);

header("Content-Type: application/json");
require 'koneksi.php';
session_start();

if (!isset($_SESSION['pegawai_id'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Akses Ilegal! Server menolak koneksi."]);
    exit;
}

try { $conn->query("ALTER TABLE penugasan ADD COLUMN dokumentasi LONGTEXT NULL"); } catch (Exception $e) {}
try { $conn->query("ALTER TABLE penugasan ADD COLUMN dokumentasi2 LONGTEXT NULL"); } catch (Exception $e) {}

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $user_id_login = $_SESSION['pegawai_id'];
    $user_tingkat = $_SESSION['pegawai_tingkat'] ?? 'Staf';

    // Ambil Bagian/Subbagian akun yang sedang masuk langsung dari server.
    // Jangan mengambil nilai ini dari browser karena dapat dimanipulasi.
    $user_bagian = '';

    $stmt_user = $conn->prepare(
        "SELECT bagian FROM pegawai WHERE id = ? LIMIT 1"
    );

    $stmt_user->bind_param("s", $user_id_login);
    $stmt_user->execute();
    $stmt_user->bind_result($bagian_db);

    if ($stmt_user->fetch()) {
        $user_bagian = trim((string)$bagian_db);
    }

    $stmt_user->close();

    if ($method == 'GET') {
        // [BLOCK GET SAMA SEPERTI SEBELUMNYA, DILONCATI UNTUK MENGHEMAT TEMPAT KARENA TIDAK ADA BUG DISINI]
        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $limit_param = isset($_GET['limit']) ? $_GET['limit'] : '5';
        $search = isset($_GET['search']) ? $conn->real_escape_string(trim($_GET['search'])) : '';
        $start_date = isset($_GET['start_date']) ? $conn->real_escape_string(trim($_GET['start_date'])) : '';
        $end_date = isset($_GET['end_date']) ? $conn->real_escape_string(trim($_GET['end_date'])) : '';
        $bulan = isset($_GET['bulan']) ? $conn->real_escape_string(trim($_GET['bulan'])) : '';
        $tahun = isset($_GET['tahun']) ? $conn->real_escape_string(trim($_GET['tahun'])) : '';
        $bagian = isset($_GET['bagian']) ? $conn->real_escape_string(trim($_GET['bagian'])) : '';
        $whereClause = "WHERE 1=1";

        // God Creator dapat melihat seluruh laporan.
        // Tingkat akses lain hanya dapat melihat laporan yang dibuat
        // oleh pengguna dari Bagian/Subbagian yang sama.
        if ($user_tingkat !== 'God Creator') {
            $user_id_aman = $conn->real_escape_string(
                $user_id_login
            );

            $user_bagian_aman = $conn->real_escape_string(
                $user_bagian
            );

            if ($user_bagian_aman !== '') {
                $whereClause .= "
                    AND pembuat.bagian = '$user_bagian_aman'
                ";
            } else {
                // Apabila akun belum mempunyai Bagian/Subbagian,
                // pengguna hanya dapat melihat laporannya sendiri.
                $whereClause .= "
                    AND (
                        d.input_by = '$user_id_aman'
                        OR (
                            (d.input_by IS NULL OR d.input_by = '')
                            AND d.pegawai_id = '$user_id_aman'
                        )
                    )
                ";
            }
        }

        if (!empty($search)) {
            $whereClause .= "
                AND (
                    p.nama LIKE '%$search%'
                    OR p.nip LIKE '%$search%'
                    OR d.lokasi_tujuan LIKE '%$search%'
                    OR d.nodin LIKE '%$search%'
                )
            ";
        }

        if (!empty($start_date) && !empty($end_date)) {
            $whereClause .= "
                AND d.tgl_dibuat >= '$start_date'
                AND d.tgl_dibuat <= '$end_date'
            ";
        } elseif (!empty($start_date)) {
            $whereClause .= "
                AND d.tgl_dibuat >= '$start_date'
            ";
        } elseif (!empty($end_date)) {
            $whereClause .= "
                AND d.tgl_dibuat <= '$end_date'
            ";
        }

        if (!empty($tahun)) {
            if (!empty($bulan)) {
                $start_date_dash = "$tahun-$bulan-01";

                $end_date_dash = date(
                    "Y-m-t",
                    strtotime($start_date_dash)
                );

                $whereClause .= "
                    AND d.tgl_dibuat >= '$start_date_dash'
                    AND d.tgl_dibuat <= '$end_date_dash'
                ";
            } else {
                $whereClause .= "
                    AND d.tgl_dibuat >= '$tahun-01-01'
                    AND d.tgl_dibuat <= '$tahun-12-31'
                ";
            }
        }

        if (isset($_GET['export'])) {
            $export_type = $_GET['export'];
            
            // ==========================================
            // SATPAM EXPORT 1: CEGAH STAF UNDUH REKAP KEUANGAN
            // ==========================================
            if ($export_type === 'keuangan' && $user_tingkat === 'Staf') {
                header("Content-Type: text/html; charset=utf-8");
                echo "<h2 style='color:red; text-align:center; margin-top:50px;'>🚨 Akses Ditolak!</h2>";
                echo "<p style='text-align:center;'>Anda tidak memiliki wewenang (Akses Level) untuk mengunduh dokumen Rekap Keuangan.</p>";
                exit;
            }
            
            // ==========================================
            // SATPAM EXPORT 2: WAJIB RENTANG TANGGAL (ANTI CRASH)
            // Mencegah hacker/staf menarik 300.000 data sekaligus lewat link langsung
            // ==========================================
            if (empty($start_date) || empty($end_date)) {
                header("Content-Type: text/html; charset=utf-8");
                echo "<h2 style='color:red; text-align:center; margin-top:50px;'>🚨 Akses Ditolak: Beban Server Terlalu Berat!</h2>";
                echo "<p style='text-align:center;'>Anda diwajibkan untuk memilih filter <b>Rentang Tanggal (Mulai - Sampai)</b> terlebih dahulu di aplikasi sebelum melakukan Export.</p>";
                exit;
            }
            
            // Logika Export (Sama)
            ini_set('memory_limit', '1024M'); set_time_limit(0);
            $export_type = $_GET['export'];
            $filename = ($export_type === 'keuangan') ? "Rekap_Keuangan_" . date('Ymd_His') . ".xls" : "Riwayat_Dinas_" . date('Ymd_His') . ".xls";
            header("Content-Type: application/vnd.ms-excel; charset=utf-8"); header("Content-Disposition: attachment; filename=\"$filename\""); header("Pragma: no-cache"); header("Expires: 0");
            echo '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1">';
            if ($export_type === 'keuangan') { echo '<tr style="background-color: #3498db; color: white;"><th>No</th><th>Nama Pegawai</th><th>Bagian</th><th>NIP</th><th>Jabatan</th><th>Tujuan</th><th>Tgl Keberangkatan</th><th>Durasi (Hari)</th><th>Keperluan</th><th>Uang Harian (Total)</th><th>Biaya Berangkat (Ref)</th><th>Biaya Pulang (Ref)</th><th>Harga Hotel Aktual</th><th>Uang Representasi</th><th>Total Biaya Dinas (Rp)</th></tr>'; } else { echo '<tr style="background-color: #3498db; color: white;"><th>No</th><th>Nama Pegawai</th><th>NIP Pegawai</th><th>Jabatan Pegawai</th><th>Pangkat / Golongan</th><th>Nomor Nota Dinas</th><th>Nomor SPT</th><th>Nomor SPD</th><th>Tanggal SPD</th><th>Jenis Tujuan</th><th>Lokasi Tujuan</th><th>Tgl Keberangkatan</th><th>Tgl Kepulangan</th><th>Durasi Tugas (Hari)</th><th>Tgl Kegiatan Dilaksanakan</th><th>Waktu Kegiatan</th><th>Keperluan / Agenda</th><th>Nama Penginapan/Hotel</th><th>Harga Hotel Aktual (Rp)</th><th>Tgl Tiket Berangkat</th><th>Maskapai Berangkat</th><th>No. Tiket Berangkat</th><th>Kode Booking Berangkat</th><th>Harga Tiket Berangkat (Rp)</th><th>Tgl Tiket Pulang</th><th>Maskapai Kepulangan</th><th>No. Tiket Kepulangan</th><th>Kode Booking Pulang</th><th>Harga Tiket Pulang (Rp)</th><th>Total Keseluruhan Tiket (Rp)</th><th>Keterangan Tiket Tambahan</th><th>Jenis Laporan</th><th>Dewan Pendamping</th><th>Kegiatan / Titik 1 (Tgl|Waktu|Tempat)</th><th>Kegiatan / Titik 2 (Tgl|Waktu|Tempat)</th><th>Raperda</th><th>Narasumber</th><th>Moderator & MC</th><th>Poin Berkembang</th><th>Link Bukti Publikasi</th><th>Laporan Dibuat Tanggal</th></tr>'; }
            $sql = "SELECT d.*, p.nama as peg_nama, p.nip as peg_nip, p.jabatan as peg_jabatan, p.golongan as peg_golongan, p.bagian as peg_bagian, p.status as peg_status, dwn.nama as dewan_nama, tj.uang_harian as ref_uang_harian, tj.uang_representasi as ref_uang_representasi, tj.berangkat as ref_berangkat, tj.pulang as ref_pulang FROM penugasan d
            LEFT JOIN pegawai p
                ON d.pegawai_id = p.id
            LEFT JOIN pegawai pembuat
                ON pembuat.id = COALESCE(
                    NULLIF(d.input_by, ''),
                    d.pegawai_id
                )
            LEFT JOIN pegawai dwn 
                ON d.dewan_id = dwn.id 
            LEFT JOIN tujuan tj 
            ON d.lokasi_tujuan = tj.nama 
            AND d.jenis_tujuan = tj.jenis 
            $whereClause ORDER BY d.id DESC";
            
            $result = $conn->query($sql);
            $no = 1; $t_harian = 0; $t_brgkt = 0; $t_plg = 0; $t_hotel = 0; $t_rep = 0; $t_all = 0;
            while ($row = $result->fetch_assoc()) {
                if ($export_type === 'keuangan') {
                    $durasi = (int)$row['durasi']; $hH = (float)$row['harga_hotel']; $uHarian = (float)$row['ref_uang_harian']; $bBrgkt = (float)$row['ref_berangkat']; $bPlg = (float)$row['ref_pulang']; $isDewan = (strtolower(trim($row['peg_status'])) === 'anggota dprd'); $uRep = $isDewan ? (float)$row['ref_uang_representasi'] : 0; $totUangHarian = $uHarian * $durasi; $rowTotal = $totUangHarian + $bBrgkt + $bPlg + $hH + $uRep;
                    $t_harian += $totUangHarian; $t_brgkt += $bBrgkt; $t_plg += $bPlg; $t_hotel += $hH; $t_rep += $uRep; $t_all += $rowTotal;
                    echo "<tr><td>" . $no++ . "</td><td>" . htmlspecialchars(!empty($row['peg_nama']) ? $row['peg_nama'] : '-') . "</td><td>" . htmlspecialchars(!empty($row['peg_bagian']) ? $row['peg_bagian'] : '-') . "</td><td style='mso-number-format:\"\@\";'>" . htmlspecialchars(!empty($row['peg_nip']) ? $row['peg_nip'] : '-') . "</td><td>" . htmlspecialchars(!empty($row['peg_jabatan']) ? $row['peg_jabatan'] : '-') . "</td><td>" . htmlspecialchars(!empty($row['lokasi_tujuan']) ? $row['lokasi_tujuan'] : '-') . "</td><td>" . htmlspecialchars($row['tgl_berangkat']) . "</td><td>" . $durasi . "</td><td>" . htmlspecialchars($row['keperluan']) . "</td><td>" . $totUangHarian . "</td><td>" . $bBrgkt . "</td><td>" . $bPlg . "</td><td>" . $hH . "</td><td>" . $uRep . "</td><td>" . $rowTotal . "</td></tr>";
                } else {
                    $hH = (float)$row['harga_hotel']; $hB = (float)$row['harga_tiket_berangkat']; $hP = (float)$row['harga_tiket_pulang']; $totalTiket = $hB + $hP;
                    $titik1 = !empty($row['tgl_titik1']) ? $row['tgl_titik1']." | ".$row['waktu_titik1']." | ".$row['tempat_titik1'] : '-'; $titik2 = !empty($row['tgl_titik2']) ? $row['tgl_titik2']." | ".$row['waktu_titik2']." | ".$row['tempat_titik2'] : '-';
                    $narsum_arr = []; foreach(['narasumber1', 'narasumber2', 'narasumber3'] as $ns) { if (!empty($row[$ns])) { if (strpos($row[$ns], '|#|') !== false) { $parts = explode('|#|', $row[$ns]); $narsum_arr[] = trim($parts[0]) . " (Materi: " . trim($parts[1]) . ")"; } else { $narsum_arr[] = $row[$ns]; } } }
                    $narsum_str = !empty($narsum_arr) ? implode(", ", $narsum_arr) : '-'; $mod_mc = "Mod: ".(!empty($row['moderator']) ? $row['moderator'] : '-')." | MC: ".(!empty($row['mc']) ? $row['mc'] : '-');
                    echo "<tr><td>" . $no++ . "</td><td>" . htmlspecialchars(!empty($row['peg_nama']) ? $row['peg_nama'] : '-') . "</td><td style='mso-number-format:\"\@\";'>" . htmlspecialchars(!empty($row['peg_nip']) ? $row['peg_nip'] : '-') . "</td><td>" . htmlspecialchars(!empty($row['peg_jabatan']) ? $row['peg_jabatan'] : '-') . "</td><td>" . htmlspecialchars(!empty($row['peg_golongan']) ? $row['peg_golongan'] : '-') . "</td><td>" . htmlspecialchars($row['nodin']) . "</td><td>" . htmlspecialchars($row['spt']) . "</td><td>" . htmlspecialchars($row['spd']) . "</td><td>" . htmlspecialchars(!empty($row['tgl_spd']) ? $row['tgl_spd'] : '-') . "</td><td>" . htmlspecialchars(!empty($row['jenis_tujuan']) ? $row['jenis_tujuan'] : 'Luar Daerah') . "</td><td>" . htmlspecialchars(!empty($row['lokasi_tujuan']) ? $row['lokasi_tujuan'] : '-') . "</td><td>" . htmlspecialchars($row['tgl_berangkat']) . "</td><td>" . htmlspecialchars($row['tgl_kepulangan']) . "</td><td>" . htmlspecialchars($row['durasi']) . "</td><td>" . htmlspecialchars(!empty($row['tgl_kegiatan']) ? $row['tgl_kegiatan'] : (!empty($row['tgl_titik1']) ? $row['tgl_titik1'] : '-')) . "</td><td>" . htmlspecialchars(!empty($row['waktu_kegiatan']) ? $row['waktu_kegiatan'] : (!empty($row['waktu_titik1']) ? $row['waktu_titik1'] : '-')) . "</td><td>" . htmlspecialchars($row['keperluan']) . "</td><td>" . htmlspecialchars(!empty($row['penginapan']) ? $row['penginapan'] : '-') . "</td><td>" . $hH . "</td><td>" . htmlspecialchars(!empty($row['tgl_tiket_berangkat']) ? $row['tgl_tiket_berangkat'] : '-') . "</td><td>" . htmlspecialchars(!empty($row['maskapai_berangkat']) ? $row['maskapai_berangkat'] : '-') . "</td><td>" . htmlspecialchars(!empty($row['no_tiket_berangkat']) ? $row['no_tiket_berangkat'] : '-') . "</td><td>" . htmlspecialchars(!empty($row['kode_booking_berangkat']) ? $row['kode_booking_berangkat'] : '-') . "</td><td>" . $hB . "</td><td>" . htmlspecialchars(!empty($row['tgl_tiket_pulang']) ? $row['tgl_tiket_pulang'] : '-') . "</td><td>" . htmlspecialchars(!empty($row['maskapai_pulang']) ? $row['maskapai_pulang'] : '-') . "</td><td>" . htmlspecialchars(!empty($row['no_tiket_pulang']) ? $row['no_tiket_pulang'] : '-') . "</td><td>" . htmlspecialchars(!empty($row['kode_booking_pulang']) ? $row['kode_booking_pulang'] : '-') . "</td><td>" . $hP . "</td><td>" . $totalTiket . "</td><td>" . htmlspecialchars(!empty($row['keterangan_tiket']) ? $row['keterangan_tiket'] : '-') . "</td><td>" . htmlspecialchars(!empty($row['jenis_laporan']) ? $row['jenis_laporan'] : 'Humas') . "</td><td>" . htmlspecialchars(!empty($row['dewan_nama']) ? $row['dewan_nama'] : '-') . "</td><td>" . htmlspecialchars($titik1) . "</td><td>" . htmlspecialchars($titik2) . "</td><td>" . htmlspecialchars(!empty($row['raperda']) ? $row['raperda'] : '-') . "</td><td>" . htmlspecialchars($narsum_str) . "</td><td>" . htmlspecialchars($mod_mc) . "</td><td>" . htmlspecialchars(!empty($row['poin_berkembang']) ? $row['poin_berkembang'] : '-') . "</td><td>" . htmlspecialchars(!empty($row['link_berita']) ? $row['link_berita'] : '-') . "</td><td>" . htmlspecialchars($row['tgl_dibuat']) . "</td></tr>";
                }
            }
            if ($export_type === 'keuangan') { echo "<tr style='background-color: #f1f5f9; font-weight: bold;'><td></td><td>TOTAL KESELURUHAN PENGELUARAN</td><td colspan='7'></td><td>$t_harian</td><td>$t_brgkt</td><td>$t_plg</td><td>$t_hotel</td><td>$t_rep</td><td>$t_all</td></tr>"; }
            echo '</table></body></html>'; exit;
        }

        if ($limit_param === 'all') {
            ini_set('memory_limit', '512M'); set_time_limit(0); 
            $sql = "SELECT d.* FROM penugasan d
        LEFT JOIN pegawai p
            ON d.pegawai_id = p.id
            LEFT JOIN pegawai pembuat
            ON pembuat.id = COALESCE(
                NULLIF(d.input_by, ''),
                d.pegawai_id
            )
        $whereClause
        ORDER BY d.id DESC";
            $result = $conn->query($sql); $data = []; while ($row = $result->fetch_assoc()) { $data[] = $row; }
            echo json_encode(["status" => "success", "data" => $data]); exit;
        }

        $limit = (int)$limit_param; $offset = ($page - 1) * $limit;
        $countQuery = $conn->query(
            "SELECT COUNT(d.id) as total
            FROM penugasan d
            LEFT JOIN pegawai p
                ON d.pegawai_id = p.id
            LEFT JOIN pegawai pembuat
                ON pembuat.id = COALESCE(
                    NULLIF(d.input_by, ''),
                    d.pegawai_id
                )
            $whereClause"
        );
        $total_records = $countQuery->fetch_assoc()['total']; $total_pages = ceil($total_records / $limit);
        $sql = "SELECT d.*
        FROM penugasan d
        LEFT JOIN pegawai p
            ON d.pegawai_id = p.id
        LEFT JOIN pegawai pembuat
            ON pembuat.id = COALESCE(
                NULLIF(d.input_by, ''),
                d.pegawai_id
            )
        $whereClause
        ORDER BY d.id DESC
        LIMIT $limit OFFSET $offset";
        
        $result = $conn->query($sql); $data = []; while ($row = $result->fetch_assoc()) { $data[] = $row; }

        echo json_encode([
            "status" => "success", "data" => $data,
            "pagination" => [ "current_page" => $page, "total_pages" => $total_pages, "total_records" => $total_records ]
        ]);
        
    } elseif ($method == 'POST') {
        
        $content_type = $_SERVER['CONTENT_TYPE'] ?? '';
        $is_multipart = strpos($content_type, 'multipart/form-data') !== false;
        $data = $is_multipart ? $_POST : json_decode(file_get_contents("php://input"), true);
        if (!is_array($data)) $data = [];
        
        $id = !empty($data['id']) ? $data['id'] : uniqid('tgs_') . rand(100, 999);
        $pegawai_id = $data['pegawaiId'];
        $jenis_tujuan = $data['jenisTujuan'];
        $lokasi_tujuan = $data['lokasiTujuan'];
        $penginapan = $data['penginapan'] ?? '';
        
        // ==========================================
        // KODE PERBAIKAN: PAKSA ABSOLUT (ANTI MINUS)
        // ==========================================
        $harga_hotel = !empty($data['hargaHotel']) ? abs((float)$data['hargaHotel']) : 0;
        
        $tgl_tiket_berangkat = !empty($data['tglTiketBerangkat']) ? $data['tglTiketBerangkat'] : null;
        $maskapai_berangkat = $data['maskapaiBerangkat'] ?? '';
        $no_tiket_berangkat = $data['noTiketBerangkat'] ?? '';
        $kode_booking_berangkat = $data['kodeBookingBerangkat'] ?? '';
        
        // KODE PERBAIKAN: PAKSA ABSOLUT (ANTI MINUS)
        $harga_tiket_berangkat = !empty($data['hargaTiketBerangkat']) ? abs((float)$data['hargaTiketBerangkat']) : 0;
        
        $tgl_tiket_pulang = !empty($data['tglTiketPulang']) ? $data['tglTiketPulang'] : null;
        $maskapai_pulang = $data['maskapaiPulang'] ?? '';
        $no_tiket_pulang = $data['noTiketPulang'] ?? '';
        $kode_booking_pulang = $data['kodeBookingPulang'] ?? '';
        
        // KODE PERBAIKAN: PAKSA ABSOLUT (ANTI MINUS)
        $harga_tiket_pulang = !empty($data['hargaTiketPulang']) ? abs((float)$data['hargaTiketPulang']) : 0;
        
        $keterangan_tiket = $data['keteranganTiket'] ?? '';
        $nodin = $data['nodin'];
        $spt = $data['spt'];
        $spd = $data['spd'];
        $tgl_spd = !empty($data['tglSpd']) ? $data['tglSpd'] : null;
        $tgl_berangkat = $data['tglBerangkat'];
        $tgl_kepulangan = $data['tglKepulangan'];
        
        // KODE PERBAIKAN: PAKSA ABSOLUT UNTUK DURASI HARI (ANTI MINUS)
        $durasi = abs((int)$data['durasi']);
        
        $tgl_kegiatan = !empty($data['tglKegiatan']) ? $data['tglKegiatan'] : null;
        $waktu_kegiatan = $data['waktuKegiatan'] ?? '';
        $link_berita = $data['linkBerita'];
        $tgl_dibuat = $data['tglDibuat'];
        $keperluan = $data['keperluan'];

        $jenis_laporan = $data['jenisLaporan'] ?? 'Humas';
        $dewan_id = $data['dewanId'] ?? '';
        $tgl_titik1 = !empty($data['tglTitik1']) ? $data['tglTitik1'] : null;
        $waktu_titik1 = $data['waktuTitik1'] ?? '';
        $tempat_titik1 = $data['tempatTitik1'] ?? '';
        $tgl_titik2 = !empty($data['tglTitik2']) ? $data['tglTitik2'] : null;
        $waktu_titik2 = $data['waktuTitik2'] ?? '';
        $tempat_titik2 = $data['tempatTitik2'] ?? '';
        $raperda = $data['raperda'] ?? '';
        $narasumber1 = $data['narasumber1'] ?? '';
        $narasumber2 = $data['narasumber2'] ?? '';
        $narasumber3 = $data['narasumber3'] ?? '';
        $moderator = $data['moderator'] ?? '';
        $mc = $data['mc'] ?? '';
        $poin_berkembang = $data['poinBerkembang'] ?? '';

        // Multipart adalah jalur baru; Base64 lama tetap dibaca untuk kompatibilitas.
        $proses_uploads = function($field, $existing) {
            $paths = array_values(array_filter(is_array($existing) ? $existing : [], function($v) { return is_string($v) && strpos($v, 'Uploads/') === 0; }));
            $files = $_FILES[$field] ?? null;
            if (!$files) return $paths;
            $dir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'Uploads';
            if (!is_dir($dir) && !mkdir($dir, 0755, true)) throw new Exception('Folder Uploads tidak dapat dibuat.');
            if (!is_writable($dir)) throw new Exception('Folder Uploads tidak dapat ditulisi oleh server.');
            $count = is_array($files['tmp_name'] ?? null) ? count($files['tmp_name']) : 0;
            for ($i = 0; $i < $count; $i++) {
                $upload_error = (int)($files['error'][$i] ?? UPLOAD_ERR_NO_FILE);
                if ($upload_error === UPLOAD_ERR_NO_FILE) continue;
                if ($upload_error !== UPLOAD_ERR_OK) throw new Exception('Upload dokumentasi gagal atau melebihi batas server.');
                $tmp = $files['tmp_name'][$i];
                if (!is_uploaded_file($tmp)) throw new Exception('Upload file tidak valid.');
                $mime = (new finfo(FILEINFO_MIME_TYPE))->file($tmp);
                $ext = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp','image/gif'=>'gif'][$mime] ?? null;
                if ($ext === null || ($files['size'][$i] ?? 0) > 12 * 1024 * 1024) throw new Exception('Format dokumentasi ditolak.');
                $relative = 'Uploads/doc_' . bin2hex(random_bytes(16)) . '.' . $ext;
                $destination = dirname(__DIR__) . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);
                if (!move_uploaded_file($tmp, $destination)) throw new Exception('Dokumentasi gagal disimpan.');
                @chmod($destination, 0644);
                $paths[] = $relative;
            }
            return $paths;
        };

        // Fungsi konversi Base64 ke File (kompatibilitas klien lama).
        $proses_foto = function($input_arr) {
            $paths = [];
            foreach ($input_arr as $doc) {
                if (preg_match('/^data:image\/(\w+);base64,/', $doc, $type)) {
                    $base64_data = substr($doc, strpos($doc, ',') + 1);
                    $base64_data = str_replace(' ', '+', $base64_data);
                    $decoded = base64_decode($base64_data);
                    $finfo = new finfo(FILEINFO_MIME_TYPE);
                    $mime = $finfo->buffer($decoded);
                    if (in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'])) {
                        $ext = explode('/', $mime)[1];
                        if (!file_exists('../Uploads')) { mkdir('../Uploads', 0755, true); }
                        $filename = 'Uploads/doc_' . time() . '_' . rand(10000, 99999) . '.' . $ext;
                        file_put_contents('../' . $filename, $decoded);
                        $paths[] = $filename;
                    }
                } else {
                    $paths[] = $doc; 
                }
            }
            return json_encode($paths);
        };

        $dokumentasi_arr = $proses_uploads('dokumentasi', $data['dokumentasi'] ?? []);
        $dokumentasi2_arr = $proses_uploads('dokumentasi2', $data['dokumentasi2'] ?? []);
        $legacy_docs = array_filter($data['dokumentasi'] ?? [], 'is_string');
        $legacy_docs2 = array_filter($data['dokumentasi2'] ?? [], 'is_string');
        if (empty($_FILES['dokumentasi'])) $dokumentasi_arr = json_decode($proses_foto($legacy_docs), true) ?: [];
        if (empty($_FILES['dokumentasi2'])) $dokumentasi2_arr = json_decode($proses_foto($legacy_docs2), true) ?: [];
        $dokumentasi_json = json_encode($dokumentasi_arr);
        $dokumentasi2_json = json_encode($dokumentasi2_arr);

        $cek = $conn->query("SELECT id, input_by, dokumentasi, dokumentasi2 FROM penugasan WHERE id = '$id'");
        
        if ($cek->num_rows > 0) {
            $row_cek = $cek->fetch_assoc();
            
            if ($user_tingkat === 'Staf') {
                $pemilik_data = !empty($row_cek['input_by']) ? $row_cek['input_by'] : $pegawai_id;
                if ($pemilik_data !== $user_id_login) {
                    echo json_encode(["status" => "error", "message" => "Akses Ditolak: Anda tidak dapat mengubah data orang lain!"]);
                    exit;
                }
            }

            // ========================================================
            // KODE PERBAIKAN: HAPUS FISIK FOTO JIKA ADA FOTO YANG DIHAPUS DARI FORM
            // ========================================================
            $old_docs1 = []; try { $old_docs1 = json_decode($row_cek['dokumentasi'], true); } catch(Exception $e){}
            $old_docs2 = []; try { $old_docs2 = json_decode($row_cek['dokumentasi2'], true); } catch(Exception $e){}
            if(!is_array($old_docs1)) $old_docs1 = [];
            if(!is_array($old_docs2)) $old_docs2 = [];

            // Memeriksa path file yang dipertahankan oleh User
            $new_paths_from_client_1 = [];
            foreach (($data['dokumentasi'] ?? []) as $doc) { if (strpos($doc, 'Uploads/') === 0) { $new_paths_from_client_1[] = $doc; } }
            // Hapus file lama yang tidak ada lagi di array baru
            foreach ($old_docs1 as $old_file) {
                if (!in_array($old_file, $new_paths_from_client_1) && strpos($old_file, 'Uploads/') === 0) {
                    if (file_exists('../' . $old_file)) unlink('../' . $old_file);
                }
            }
            
            $new_paths_from_client_2 = [];
            foreach (($data['dokumentasi2'] ?? []) as $doc) { if (strpos($doc, 'Uploads/') === 0) { $new_paths_from_client_2[] = $doc; } }
            foreach ($old_docs2 as $old_file) {
                if (!in_array($old_file, $new_paths_from_client_2) && strpos($old_file, 'Uploads/') === 0) {
                    if (file_exists('../' . $old_file)) unlink('../' . $old_file);
                }
            }

            // Lanjut Proses Update Database
            $stmt = $conn->prepare("UPDATE penugasan SET pegawai_id=?, jenis_tujuan=?, lokasi_tujuan=?, penginapan=?, harga_hotel=?, tgl_tiket_berangkat=?, maskapai_berangkat=?, no_tiket_berangkat=?, kode_booking_berangkat=?, harga_tiket_berangkat=?, tgl_tiket_pulang=?, maskapai_pulang=?, no_tiket_pulang=?, kode_booking_pulang=?, harga_tiket_pulang=?, keterangan_tiket=?, nodin=?, spt=?, spd=?, tgl_spd=?, tgl_berangkat=?, tgl_kepulangan=?, durasi=?, tgl_kegiatan=?, waktu_kegiatan=?, link_berita=?, tgl_dibuat=?, keperluan=?, jenis_laporan=?, dewan_id=?, tgl_titik1=?, waktu_titik1=?, tempat_titik1=?, tgl_titik2=?, waktu_titik2=?, tempat_titik2=?, raperda=?, narasumber1=?, narasumber2=?, narasumber3=?, moderator=?, mc=?, poin_berkembang=?, dokumentasi=?, dokumentasi2=? WHERE id=?");
            $stmt->bind_param("ssssdssssdssssdsssssssisssssssssssssssssssssss", $pegawai_id, $jenis_tujuan, $lokasi_tujuan, $penginapan, $harga_hotel, $tgl_tiket_berangkat, $maskapai_berangkat, $no_tiket_berangkat, $kode_booking_berangkat, $harga_tiket_berangkat, $tgl_tiket_pulang, $maskapai_pulang, $no_tiket_pulang, $kode_booking_pulang, $harga_tiket_pulang, $keterangan_tiket, $nodin, $spt, $spd, $tgl_spd, $tgl_berangkat, $tgl_kepulangan, $durasi, $tgl_kegiatan, $waktu_kegiatan, $link_berita, $tgl_dibuat, $keperluan, $jenis_laporan, $dewan_id, $tgl_titik1, $waktu_titik1, $tempat_titik1, $tgl_titik2, $waktu_titik2, $tempat_titik2, $raperda, $narasumber1, $narasumber2, $narasumber3, $moderator, $mc, $poin_berkembang, $dokumentasi_json, $dokumentasi2_json, $id);

        } else {
            // INSERT BARU
            $stmt = $conn->prepare("INSERT INTO penugasan (id, pegawai_id, jenis_tujuan, lokasi_tujuan, penginapan, harga_hotel, tgl_tiket_berangkat, maskapai_berangkat, no_tiket_berangkat, kode_booking_berangkat, harga_tiket_berangkat, tgl_tiket_pulang, maskapai_pulang, no_tiket_pulang, kode_booking_pulang, harga_tiket_pulang, keterangan_tiket, nodin, spt, spd, tgl_spd, tgl_berangkat, tgl_kepulangan, durasi, tgl_kegiatan, waktu_kegiatan, link_berita, tgl_dibuat, keperluan, jenis_laporan, dewan_id, tgl_titik1, waktu_titik1, tempat_titik1, tgl_titik2, waktu_titik2, tempat_titik2, raperda, narasumber1, narasumber2, narasumber3, moderator, mc, poin_berkembang, dokumentasi, dokumentasi2, input_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("sssssdssssdssssdsssssssisssssssssssssssssssssss", $id, $pegawai_id, $jenis_tujuan, $lokasi_tujuan, $penginapan, $harga_hotel, $tgl_tiket_berangkat, $maskapai_berangkat, $no_tiket_berangkat, $kode_booking_berangkat, $harga_tiket_berangkat, $tgl_tiket_pulang, $maskapai_pulang, $no_tiket_pulang, $kode_booking_pulang, $harga_tiket_pulang, $keterangan_tiket, $nodin, $spt, $spd, $tgl_spd, $tgl_berangkat, $tgl_kepulangan, $durasi, $tgl_kegiatan, $waktu_kegiatan, $link_berita, $tgl_dibuat, $keperluan, $jenis_laporan, $dewan_id, $tgl_titik1, $waktu_titik1, $tempat_titik1, $tgl_titik2, $waktu_titik2, $tempat_titik2, $raperda, $narasumber1, $narasumber2, $narasumber3, $moderator, $mc, $poin_berkembang, $dokumentasi_json, $dokumentasi2_json, $user_id_login);
        }
        
        if ($stmt->execute()) { echo json_encode(["status" => "success"]); } else { echo json_encode(["status" => "error", "message" => $stmt->error]); }
    } 
    elseif ($method == 'DELETE') {
        $data = json_decode(file_get_contents("php://input"), true);
        $id = $data['id'];

        $cek_pemilik = $conn->query("SELECT pegawai_id, input_by, dokumentasi, dokumentasi2 FROM penugasan WHERE id = '$id'");
        if ($cek_pemilik->num_rows > 0) {
            $row_hapus = $cek_pemilik->fetch_assoc();
            
            if ($user_tingkat === 'Staf') {
                $pemilik_data = !empty($row_hapus['input_by']) ? $row_hapus['input_by'] : $row_hapus['pegawai_id'];
                if ($pemilik_data !== $user_id_login) {
                    echo json_encode(["status" => "error", "message" => "Akses Ditolak: Anda tidak berhak menghapus laporan yang diinput oleh orang lain!"]);
                    exit;
                }
            }

            // ========================================================
            // KODE PERBAIKAN: HAPUS FISIK FOTO JIKA LAPORAN DINAS DIHAPUS
            // ========================================================
            $docs1 = []; try { $docs1 = json_decode($row_hapus['dokumentasi'], true); } catch(Exception $e){}
            $docs2 = []; try { $docs2 = json_decode($row_hapus['dokumentasi2'], true); } catch(Exception $e){}
            if(!is_array($docs1)) $docs1 = [];
            if(!is_array($docs2)) $docs2 = [];

            foreach ($docs1 as $file) {
                if (strpos($file, 'Uploads/') === 0 && file_exists('../' . $file)) unlink('../' . $file);
            }
            foreach ($docs2 as $file) {
                if (strpos($file, 'Uploads/') === 0 && file_exists('../' . $file)) unlink('../' . $file);
            }
        }
        
        $stmt = $conn->prepare("DELETE FROM penugasan WHERE id = ?"); 
        $stmt->bind_param("s", $id);
        $stmt->execute();
        echo json_encode(["status" => "success"]);
    }
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>