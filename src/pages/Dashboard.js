import * as React from "react";
import Chart from "chart.js/auto";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../component/Navbar";
import { Sidebar } from "../component/Sidebar";
import { Breadcrumb } from "../component/Breadcrumb";
import { getBackendUrl } from "../services/apiConfig";

export const Dashboard = () => {
  document.title = "Dashboard - SITRAK-AI";
  const navigate = useNavigate();

  // Canvas Refs untuk Chart.js
  const trendChartRef = React.useRef(null);
  const weaponChartRef = React.useRef(null);
  const unitChartRef = React.useRef(null);
  const qualificationChartRef = React.useRef(null);
  const chartInstancesRef = React.useRef([]);

  // State data dashboard dari backend
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [data, setData] = React.useState({
    totalSesi: 0,
    statusCount: { Berlangsung: 0, Selesai: 0, Menunggu: 0, Dibatalkan: 0 },
    totalPersonel: 0,
    totalHits: 0,
    totalBulletsAllocated: 0,
    avgScore: "0.0",
    avgAccuracy: "0.0",
    weaponCount: {},
    satuanStats: {},
    kategoriCount: { Istimewa: 0, Mahir: 0, Cukup: 0, "Perlu Pembinaan": 0 },
    sessionTrends: [],
    recentSessions: [],
    topShooters: [],
    activeSession: null,
  });

  // Navigasi ke detail sesi
  const handleNavigateDetail = (sesi) => {
    if (!sesi?.id_sesi) return;
    localStorage.setItem("active_sesi_id", String(sesi.id_sesi));
    localStorage.setItem(
      "active_sesi_kode",
      sesi.kode_sesi || `SESI-${sesi.id_sesi}`
    );
    navigate(`/detail-sesi/${sesi.id_sesi}`);
  };

  // Navigasi ke live scoring
  const handleNavigateLiveScoring = (sesi) => {
    if (!sesi?.id_sesi) return;
    localStorage.setItem("active_sesi_id", String(sesi.id_sesi));
    localStorage.setItem(
      "active_sesi_kode",
      sesi.kode_sesi || `SESI-${sesi.id_sesi}`
    );
    navigate(`/live-scoring/${sesi.id_sesi}`);
  };

  // Format tanggal Indonesia ringkas
  const formatTanggal = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Mengambil dan mengagregasi data dari backend SITRAK
  const fetchDashboardData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const backendUrl = getBackendUrl();

    try {
      // 1. Ambil daftar seluruh sesi latihan & personel
      const [sesiRes, personelRes] = await Promise.all([
        axios.get(`${backendUrl}/sesi?limit=100`),
        axios.get(`${backendUrl}/personel?limit=100`).catch(() => ({ data: { total: 0, data: [] } })),
      ]);

      const sesiList = Array.isArray(sesiRes.data?.data)
        ? sesiRes.data.data
        : Array.isArray(sesiRes.data)
        ? sesiRes.data
        : [];

      const totalPersonel =
        personelRes.data?.total ||
        (Array.isArray(personelRes.data?.data) ? personelRes.data.data.length : 0);

      // 2. Ambil detail untuk setiap sesi secara paralel untuk menghitung data skor, hits, dan amunisi
      const detailPromises = sesiList.map((s) =>
        axios
          .get(`${backendUrl}/sesi/${s.id_sesi}`)
          .then((res) => res.data)
          .catch(() => null)
      );
      const details = await Promise.all(detailPromises);

      // 3. Kalkulasi dan agregasi metrik performa
      let totalHits = 0;
      let totalBulletsAllocated = 0;
      const allScores = [];
      const allAccuracies = [];
      const weaponCount = {};
      const satuanStats = {};
      const kategoriCount = {
        Istimewa: 0,
        Mahir: 0,
        Cukup: 0,
        "Perlu Pembinaan": 0,
      };
      const statusCount = {
        Berlangsung: 0,
        Selesai: 0,
        Menunggu: 0,
        Dibatalkan: 0,
      };
      const shooterScoresMap = {};
      const sessionTrends = [];

      sesiList.forEach((s, idx) => {
        const rawStatus = s.status || "Menunggu";
        statusCount[rawStatus] = (statusCount[rawStatus] || 0) + 1;

        const weapon = s.model_senjata || "Standar";
        weaponCount[weapon] = (weaponCount[weapon] || 0) + 1;

        const detail = details[idx];
        let sScoreSum = 0;
        let sScoreCount = 0;
        let sAccSum = 0;
        let sAccCount = 0;
        let sHits = 0;

        if (detail && detail.gelombang) {
          detail.gelombang.forEach((g) => {
            (g.babak || []).forEach((b) => {
              const bulletPerRound = parseInt(b.jumlah_peluru) || 10;
              const shooterCount = (b.personel || []).length;
              totalBulletsAllocated += bulletPerRound * shooterCount;

              (b.personel || []).forEach((p) => {
                const hits = Array.isArray(p.detail_tembakan)
                  ? p.detail_tembakan.length
                  : 0;
                totalHits += hits;
                sHits += hits;

                const skor = parseFloat(p.total_skor || 0);
                const acc = parseFloat(p.akurasi_persen || 0);

                if (p.kategori_kelulusan && kategoriCount[p.kategori_kelulusan] !== undefined) {
                  kategoriCount[p.kategori_kelulusan]++;
                }

                if (hits > 0 || skor > 0) {
                  allScores.push(skor);
                  allAccuracies.push(acc);
                  sScoreSum += skor;
                  sScoreCount++;
                  sAccSum += acc;
                  sAccCount++;

                  const sat = p.satuan || "Lainnya";
                  if (!satuanStats[sat]) {
                    satuanStats[sat] = { skorSum: 0, accSum: 0, count: 0 };
                  }
                  satuanStats[sat].skorSum += skor;
                  satuanStats[sat].accSum += acc;
                  satuanStats[sat].count++;

                  // Hitung skor agregat per penembak untuk penembak terbaik
                  const pid = p.id_personel_penembak;
                  if (pid) {
                    if (!shooterScoresMap[pid]) {
                      shooterScoresMap[pid] = {
                        id: pid,
                        nama: p.nama_personel_penembak || "Personel",
                        nrp: p.nrp || "-",
                        satuan: p.satuan || "-",
                        totalSkor: 0,
                        totalAcc: 0,
                        babakCount: 0,
                      };
                    }
                    shooterScoresMap[pid].totalSkor += skor;
                    shooterScoresMap[pid].totalAcc += acc;
                    shooterScoresMap[pid].babakCount++;
                  }
                }
              });
            });
          });
        }

        sessionTrends.push({
          id_sesi: s.id_sesi,
          nama: s.nama_sesi,
          tanggal: s.tanggal ? s.tanggal.split("T")[0] : "-",
          avgSkor:
            sScoreCount > 0 ? Number((sScoreSum / sScoreCount).toFixed(1)) : null,
          avgAcc:
            sAccCount > 0 ? Number((sAccSum / sAccCount).toFixed(1)) : null,
          hits: sHits,
        });
      });

      const avgScore =
        allScores.length > 0
          ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)
          : "0.0";
      const avgAccuracy =
        allAccuracies.length > 0
          ? (allAccuracies.reduce((a, b) => a + b, 0) / allAccuracies.length).toFixed(1)
          : "0.0";

      // Sesi aktif saat ini (berstatus 'Berlangsung')
      const activeSession =
        sesiList.find((s) => (s.status || "").toLowerCase() === "berlangsung") ||
        null;

      // Urutkan penembak dengan skor tertinggi
      const topShooters = Object.values(shooterScoresMap)
        .map((sh) => ({
          ...sh,
          avgSkor: (sh.totalSkor / sh.babakCount).toFixed(1),
          avgAcc: (sh.totalAcc / sh.babakCount).toFixed(1),
        }))
        .sort((a, b) => b.totalSkor - a.totalSkor)
        .slice(0, 5);

      setData({
        totalSesi: sesiList.length,
        statusCount,
        totalPersonel,
        totalHits,
        totalBulletsAllocated,
        avgScore,
        avgAccuracy,
        weaponCount,
        satuanStats,
        kategoriCount,
        sessionTrends: sessionTrends.reverse(), // Sesi terlama ke terbaru untuk grafik
        recentSessions: sesiList.slice(0, 6), // 6 sesi terkini
        topShooters,
        activeSession,
      });
    } catch (err) {
      console.error("Gagal memuat data dashboard:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Gagal menghubungi server SITRAK-Backend."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Muat data saat halaman dibuka
  React.useEffect(() => {
    fetchDashboardData();
  }, []);

  // Update grafik saat data berubah
  React.useEffect(() => {
    if (loading) return;

    // Bersihkan grafik sebelumnya
    chartInstancesRef.current.forEach((c) => {
      try {
        c.destroy();
      } catch (e) {
        // Abaikan jika sudah didestroy
      }
    });
    chartInstancesRef.current = [];

    // 1. Grafik Tren Skor & Akurasi Latihan (Line Chart)
    if (trendChartRef.current) {
      const validTrends = data.sessionTrends.filter(
        (t) => t.avgSkor !== null || t.avgAcc !== null
      );
      const labels =
        validTrends.length > 0
          ? validTrends.map((t) => t.nama.length > 15 ? t.nama.substring(0, 15) + "..." : t.nama)
          : ["Belum Ada Data Sesi"];
      const scoreData =
        validTrends.length > 0 ? validTrends.map((t) => t.avgSkor || 0) : [0];
      const accData =
        validTrends.length > 0 ? validTrends.map((t) => t.avgAcc || 0) : [0];

      const trendChart = new Chart(trendChartRef.current, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Rata-rata Skor",
              data: scoreData,
              borderColor: "#0d6efd",
              backgroundColor: "rgba(13, 110, 253, 0.15)",
              borderWidth: 2.5,
              fill: true,
              tension: 0.35,
              pointRadius: 5,
              pointHoverRadius: 7,
            },
            {
              label: "Tingkat Akurasi (%)",
              data: accData,
              borderColor: "#198754",
              backgroundColor: "rgba(25, 135, 84, 0.1)",
              borderWidth: 2,
              borderDash: [5, 5],
              fill: false,
              tension: 0.35,
              pointRadius: 5,
              pointHoverRadius: 7,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top" },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw} poin`,
              },
            },
          },
          scales: {
            y: {
              min: 0,
              max: 100,
              ticks: { stepSize: 20 },
            },
          },
        },
      });
      chartInstancesRef.current.push(trendChart);
    }

    // 2. Grafik Distribusi Penggunaan Senjata (Doughnut Chart)
    if (weaponChartRef.current) {
      const weaponLabels = Object.keys(data.weaponCount);
      const weaponValues = Object.values(data.weaponCount);
      const colors = ["#0d6efd", "#20c997", "#ffc107", "#dc3545", "#6f42c1", "#fd7e14"];

      const weaponChart = new Chart(weaponChartRef.current, {
        type: "doughnut",
        data: {
          labels: weaponLabels.length > 0 ? weaponLabels : ["Tidak Ada Data"],
          datasets: [
            {
              data: weaponValues.length > 0 ? weaponValues : [1],
              backgroundColor: colors.slice(0, Math.max(1, weaponLabels.length)),
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom" },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${ctx.raw} sesi latihan`,
              },
            },
          },
        },
      });
      chartInstancesRef.current.push(weaponChart);
    }

    // 3. Grafik Komparasi Performa Satuan / Regu (Bar Chart)
    if (unitChartRef.current) {
      const satuanKeys = Object.keys(data.satuanStats);
      const labels =
        satuanKeys.length > 0
          ? satuanKeys
          : ["Belum Ada Data Satuan"];
      const scoreData =
        satuanKeys.length > 0
          ? satuanKeys.map((k) =>
              Number((data.satuanStats[k].skorSum / data.satuanStats[k].count).toFixed(1))
            )
          : [0];
      const accData =
        satuanKeys.length > 0
          ? satuanKeys.map((k) =>
              Number((data.satuanStats[k].accSum / data.satuanStats[k].count).toFixed(1))
            )
          : [0];

      const unitChart = new Chart(unitChartRef.current, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Rata-rata Skor",
              data: scoreData,
              backgroundColor: "#0d6efd",
              borderRadius: 6,
            },
            {
              label: "Akurasi (%)",
              data: accData,
              backgroundColor: "#ffc107",
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top" },
          },
          scales: {
            y: {
              min: 0,
              max: 100,
              ticks: { stepSize: 20 },
            },
          },
        },
      });
      chartInstancesRef.current.push(unitChart);
    }

    // 4. Grafik Distribusi Kualifikasi Kelulusan (Bar / Doughnut Chart)
    if (qualificationChartRef.current) {
      const qualLabels = ["Istimewa", "Mahir", "Cukup", "Perlu Pembinaan"];
      const qualValues = qualLabels.map((k) => data.kategoriCount[k] || 0);

      const qualificationChart = new Chart(qualificationChartRef.current, {
        type: "bar",
        data: {
          labels: qualLabels,
          datasets: [
            {
              label: "Jumlah Babak / Kualifikasi",
              data: qualValues,
              backgroundColor: [
                "rgba(25, 135, 84, 0.8)",   // Istimewa - Hijau
                "rgba(13, 110, 253, 0.8)",  // Mahir - Biru
                "rgba(255, 193, 7, 0.8)",   // Cukup - Kuning
                "rgba(220, 53, 69, 0.8)",   // Pembinaan - Merah
              ],
              borderColor: ["#198754", "#0d6efd", "#ffc107", "#dc3545"],
              borderWidth: 1.5,
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.raw} Babak Penembakan`,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 2 },
            },
          },
        },
      });
      chartInstancesRef.current.push(qualificationChart);
    }

    return () => {
      chartInstancesRef.current.forEach((c) => {
        try {
          c.destroy();
        } catch (e) {
          // cleanup
        }
      });
    };
  }, [loading, data]);

  return (
    <div>
      <Navbar />
      <div className="d-flex min-vh-100">
        <Sidebar />
        <div className="font-poppins w-100 overflow-x-hidden">
          {/* Breadcrumb Path Bar */}
          <Breadcrumb
            items={[
              { label: "Dashboard", active: true, icon: "bi bi-speedometer2" },
            ]}
            rightContent={
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 shadow-sm"
                  onClick={() => fetchDashboardData(true)}
                  disabled={refreshing || loading}
                  title="Segarkan data dari SITRAK-Backend"
                >
                  <i
                    className={`bi bi-arrow-clockwise ${
                      refreshing ? "spin-animation" : ""
                    }`}
                  ></i>
                  <span className="d-none d-sm-inline">
                    {refreshing ? "Memperbarui..." : "Segarkan"}
                  </span>
                </button>
                <span className="badge bg-body-tertiary text-secondary border px-2 py-1 d-flex align-items-center">
                  <i className="bi bi-broadcast text-success me-1"></i>
                  Real-time Data
                </span>
              </div>
            }
          />

          <div className="p-2 p-sm-3 p-md-4">
            {/* Alert Error jika Backend Bermasalah */}
            {error && (
              <div className="alert alert-danger d-flex align-items-center justify-content-between mb-4 shadow-sm">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                  <div>
                    <strong>Koneksi Backend Terkendala:</strong> {error}
                  </div>
                </div>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => fetchDashboardData()}
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {/* Header Dashboard & Callout Sesi Berlangsung */}
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3 mb-4">
              <div>
                <h2 className="fw-bold mb-1 fs-3 fs-md-2">
                  <i className="bi bi-speedometer2 me-2 text-primary"></i>
                  Dashboard Analisis Latihan
                </h2>
                <p className="text-secondary mb-0 small">
                  Ringkasan metrik performa & analitik sesi latihan menembak terintegrasi SITRAK-AI
                </p>
              </div>

              {/* Status Sesi Aktif */}
              <div>
                {data.activeSession ? (
                  <div className="p-2 px-3 bg-primary-subtle border border-primary rounded-3 d-flex align-items-center gap-2 shadow-sm">
                    <span className="spinner-grow spinner-grow-sm text-primary" role="status"></span>
                    <div className="small">
                      <span className="fw-bold text-primary d-block">
                        Sesi Aktif: {data.activeSession.nama_sesi}
                      </span>
                      <span className="text-secondary" style={{ fontSize: "11px" }}>
                        {data.activeSession.model_senjata || "Senjata"} • {data.activeSession.jarak_meter}m
                      </span>
                    </div>
                    <div className="ms-2 d-flex gap-1">
                      <button
                        className="btn btn-sm btn-primary py-1 px-2 fw-semibold"
                        onClick={() => handleNavigateLiveScoring(data.activeSession)}
                        title="Buka Layar Live Scoring"
                      >
                        <i className="bi bi-broadcast me-1"></i>Live
                      </button>
                      <button
                        className="btn btn-sm btn-outline-primary py-1 px-2"
                        onClick={() => handleNavigateDetail(data.activeSession)}
                        title="Buka Detail Sesi"
                      >
                        <i className="bi bi-eye"></i>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-secondary-subtle text-secondary border px-3 py-2 fs-7">
                      <i className="bi bi-check2-circle text-success me-1"></i> Tidak Ada Sesi Berlangsung
                    </span>
                    <button
                      className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm"
                      onClick={() => navigate("/latihan")}
                    >
                      <i className="bi bi-plus-circle"></i>
                      <span>Sesi Baru</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Metric KPI Cards (Data Riil Backend) */}
            <div className="row g-3 mb-4">
              {/* Card 1: Total Sesi Latihan */}
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                  <div className="card-body d-flex align-items-center">
                    <div
                      className="bg-primary text-white rounded-3 p-3 me-3 fs-3 d-flex align-items-center justify-content-center"
                      style={{ width: "55px", height: "55px" }}
                    >
                      <i className="bi bi-bullseye"></i>
                    </div>
                    <div className="w-100">
                      <small className="text-secondary fw-semibold d-block">Total Sesi Latihan</small>
                      <h4 className="fw-bold mb-1">
                        {loading ? "..." : `${data.totalSesi} Sesi`}
                      </h4>
                      <div className="d-flex flex-wrap gap-1" style={{ fontSize: "10.5px" }}>
                        <span className="badge bg-success-subtle text-success border border-success py-0 px-1">
                          {data.statusCount.Berlangsung} Aktif
                        </span>
                        <span className="badge bg-primary-subtle text-primary border border-primary py-0 px-1">
                          {data.statusCount.Selesai} Selesai
                        </span>
                        <span className="badge bg-secondary-subtle text-secondary border py-0 px-1">
                          {data.statusCount.Menunggu} Antre
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Rata-rata Skor */}
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                  <div className="card-body d-flex align-items-center">
                    <div
                      className="bg-success text-white rounded-3 p-3 me-3 fs-3 d-flex align-items-center justify-content-center"
                      style={{ width: "55px", height: "55px" }}
                    >
                      <i className="bi bi-trophy"></i>
                    </div>
                    <div>
                      <small className="text-secondary fw-semibold d-block">Rata-rata Skor Latihan</small>
                      <h4 className="fw-bold mb-0">
                        {loading ? "..." : `${data.avgScore} / 100`}
                      </h4>
                      <small
                        className={
                          parseFloat(data.avgScore) >= 80
                            ? "text-success fw-semibold"
                            : parseFloat(data.avgScore) >= 70
                            ? "text-warning fw-semibold"
                            : "text-secondary"
                        }
                      >
                        <i className="bi bi-bar-chart-line me-1"></i>
                        {parseFloat(data.avgScore) >= 90
                          ? "Kualifikasi Istimewa"
                          : parseFloat(data.avgScore) >= 80
                          ? "Kualifikasi Mahir"
                          : parseFloat(data.avgScore) >= 70
                          ? "Kualifikasi Cukup"
                          : "Perlu Pembinaan"}
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Total Amunisi & Hits Terdeteksi */}
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                  <div className="card-body d-flex align-items-center">
                    <div
                      className="bg-warning text-dark rounded-3 p-3 me-3 fs-3 d-flex align-items-center justify-content-center"
                      style={{ width: "55px", height: "55px" }}
                    >
                      <i className="bi bi-crosshair2"></i>
                    </div>
                    <div>
                      <small className="text-secondary fw-semibold d-block">Amunisi Terdeteksi</small>
                      <h4 className="fw-bold mb-0">
                        {loading ? "..." : `${data.totalHits.toLocaleString("id-ID")} Butir`}
                      </h4>
                      <small className="text-muted" style={{ fontSize: "11px" }}>
                        Dari {data.totalBulletsAllocated.toLocaleString("id-ID")} butir alokasi
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Tingkat Akurasi (Hit Rate) */}
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                  <div className="card-body d-flex align-items-center">
                    <div
                      className="bg-info text-white rounded-3 p-3 me-3 fs-3 d-flex align-items-center justify-content-center"
                      style={{ width: "55px", height: "55px" }}
                    >
                      <i className="bi bi-shield-check"></i>
                    </div>
                    <div>
                      <small className="text-secondary fw-semibold d-block">Rata-rata Akurasi</small>
                      <h4 className="fw-bold mb-0">
                        {loading ? "..." : `${data.avgAccuracy}%`}
                      </h4>
                      <small className="text-secondary" style={{ fontSize: "11px" }}>
                        <i className="bi bi-people me-1 text-primary"></i>
                        {data.totalPersonel} Personel Terdaftar
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid Grafik Analitik Riil */}
            <div className="row g-3 g-md-4 mb-4">
              {/* Grafik 1: Tren Skor & Akurasi Sesi */}
              <div className="col-12 col-lg-8">
                <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                  <div className="card-header bg-transparent border-0 pt-3 px-3 d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold mb-0">
                      <i className="bi bi-graph-up me-2 text-primary"></i>Tren Skor & Akurasi Sesi Latihan
                    </h5>
                    <span className="badge bg-secondary-subtle text-secondary">
                      Data Riil Backend
                    </span>
                  </div>
                  <div className="card-body p-3">
                    <div style={{ position: "relative", height: "290px" }}>
                      <canvas ref={trendChartRef}></canvas>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grafik 2: Distribusi Penggunaan Senjata */}
              <div className="col-12 col-lg-4">
                <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                  <div className="card-header bg-transparent border-0 pt-3 px-3 d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold mb-0">
                      <i className="bi bi-pie-chart-fill me-2 text-primary"></i>Distribusi Senjata
                    </h5>
                    <span className="badge bg-secondary-subtle text-secondary">
                      Sesi
                    </span>
                  </div>
                  <div className="card-body p-3">
                    <div style={{ position: "relative", height: "290px" }}>
                      <canvas ref={weaponChartRef}></canvas>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grafik 3: Komparasi Performa per Satuan / Regu */}
              <div className="col-12 col-lg-7">
                <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                  <div className="card-header bg-transparent border-0 pt-3 px-3 d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold mb-0">
                      <i className="bi bi-bar-chart-fill me-2 text-primary"></i>Komparasi Nilai per Satuan / Regu
                    </h5>
                    <span className="badge bg-secondary-subtle text-secondary">
                      Skor & Akurasi
                    </span>
                  </div>
                  <div className="card-body p-3">
                    <div style={{ position: "relative", height: "290px" }}>
                      <canvas ref={unitChartRef}></canvas>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grafik 4: Distribusi Kualifikasi Kelulusan */}
              <div className="col-12 col-lg-5">
                <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                  <div className="card-header bg-transparent border-0 pt-3 px-3 d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold mb-0">
                      <i className="bi bi-award-fill me-2 text-primary"></i>Distribusi Kualifikasi
                    </h5>
                    <span className="badge bg-secondary-subtle text-secondary">
                      Standar Kategori
                    </span>
                  </div>
                  <div className="card-body p-3">
                    <div style={{ position: "relative", height: "290px" }}>
                      <canvas ref={qualificationChartRef}></canvas>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabel Sesi Latihan Terkini (Data Riil Backend) */}
            <div className="card border-0 shadow-sm bg-body-tertiary mb-4">
              <div className="card-header bg-transparent border-0 pt-3 px-3 d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="fw-bold mb-0">
                    <i className="bi bi-card-checklist me-2 text-primary"></i>Daftar Sesi Latihan Terkini
                  </h5>
                  <small className="text-secondary">
                    Menampilkan sesi latihan yang tersimpan pada pangkalan data SITRAK
                  </small>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => navigate("/latihan")}
                >
                  Lihat Semua Sesi <i className="bi bi-arrow-right ms-1"></i>
                </button>
              </div>

              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover table-striped mb-0 align-middle">
                    <thead className="table-light small">
                      <tr>
                        <th className="ps-3" style={{ width: "50px" }}>No</th>
                        <th>Nama Sesi</th>
                        <th>Senjata & Jarak</th>
                        <th>Lokasi / Lapangan</th>
                        <th>Tanggal</th>
                        <th className="text-center">Status</th>
                        <th className="text-end pe-3" style={{ minWidth: "160px" }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="text-center py-4 text-muted">
                            <span className="spinner-border spinner-border-sm me-2 text-primary"></span>
                            Memuat data sesi latihan...
                          </td>
                        </tr>
                      ) : data.recentSessions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-4 text-muted">
                            Belum ada data sesi latihan pada sistem.
                          </td>
                        </tr>
                      ) : (
                        data.recentSessions.map((s, idx) => {
                          const statusLower = (s.status || "").toLowerCase();
                          let badgeClass = "badge bg-secondary-subtle text-secondary border";
                          if (statusLower === "berlangsung") {
                            badgeClass = "badge bg-primary-subtle text-primary border border-primary";
                          } else if (statusLower === "selesai") {
                            badgeClass = "badge bg-success-subtle text-success border border-success";
                          } else if (statusLower === "dibatalkan") {
                            badgeClass = "badge bg-danger-subtle text-danger border border-danger";
                          } else if (statusLower === "menunggu") {
                            badgeClass = "badge bg-warning-subtle text-warning-emphasis border border-warning";
                          }

                          return (
                            <tr key={s.id_sesi || idx}>
                              <td className="ps-3 fw-bold text-secondary font-monospace">
                                {idx + 1}
                              </td>
                              <td>
                                <div className="fw-semibold text-dark">
                                  {s.nama_sesi}
                                </div>
                                <small className="text-secondary font-monospace">
                                  ID: {s.id_sesi} • {s.total_gelombang || 1} Gelombang • {s.jumlah_jalur || 1} Jalur
                                </small>
                              </td>
                              <td>
                                <div className="fw-semibold text-dark">
                                  {s.model_senjata || "-"}
                                </div>
                                <small className="text-muted">
                                  {s.jarak_meter ? `${s.jarak_meter} Meter` : "-"} • {s.nama_mode_tembakan || "Presisi"}
                                </small>
                              </td>
                              <td className="text-secondary small">
                                {s.nama_tempat_menembak || "-"}
                              </td>
                              <td className="text-secondary small font-monospace">
                                {formatTanggal(s.tanggal)}
                              </td>
                              <td className="text-center">
                                <span className={badgeClass} style={{ fontSize: "11px" }}>
                                  {s.status || "Menunggu"}
                                </span>
                              </td>
                              <td className="text-end pe-3">
                                <div className="btn-group btn-group-sm">
                                  <button
                                    type="button"
                                    className="btn btn-outline-primary"
                                    onClick={() => handleNavigateDetail(s)}
                                    title="Lihat Detail Nilai & Sasaran"
                                  >
                                    <i className="bi bi-eye me-1"></i>Detail
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => handleNavigateLiveScoring(s)}
                                    title="Buka Live Scoring"
                                  >
                                    <i className="bi bi-broadcast"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
