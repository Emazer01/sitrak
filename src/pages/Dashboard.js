import * as React from "react";
import Chart from "chart.js/auto";
import { Navbar } from "../component/Navbar";
import { Sidebar } from "../component/Sidebar";

export const Dashboard = () => {
  const trendChartRef = React.useRef(null);
  const unitChartRef = React.useRef(null);
  const weaponChartRef = React.useRef(null);
  const radarChartRef = React.useRef(null);

  React.useEffect(() => {
    document.title = "Dashboard - SITRAK-AI";

    const btnDash = document.getElementById("btn-dashboard");
    if (btnDash) btnDash.classList.add("sidebar-active");
    const navDash = document.getElementById("nav-btn-dashboard");
    if (navDash) navDash.classList.add("sidebar-active");
    const btnLat = document.getElementById("btn-latihan");
    if (btnLat) btnLat.classList.remove("sidebar-active");

    const createdCharts = [];

    // 1. Grafik Tren Skor & Akurasi Latihan (Line Chart)
    if (trendChartRef.current) {
      const trendChart = new Chart(trendChartRef.current, {
        type: "line",
        data: {
          labels: ["Mei", "Jun", "Jul", "Ags", "Sep", "Okt"],
          datasets: [
            {
              label: "Rata-rata Skor",
              data: [78, 81, 84, 82, 88, 91],
              borderColor: "#0d6efd",
              backgroundColor: "rgba(13, 110, 253, 0.15)",
              borderWidth: 2,
              fill: true,
              tension: 0.35,
              pointRadius: 4,
            },
            {
              label: "Tingkat Akurasi Hit (%)",
              data: [82, 85, 87, 86, 92, 94],
              borderColor: "#198754",
              backgroundColor: "rgba(25, 135, 84, 0.1)",
              borderWidth: 2,
              borderDash: [5, 5],
              fill: false,
              tension: 0.35,
              pointRadius: 4,
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
              min: 60,
              max: 100,
              ticks: { stepSize: 10 },
            },
          },
        },
      });
      createdCharts.push(trendChart);
    }

    // 2. Grafik Komparasi Skor per Satuan / Regu (Bar Chart)
    if (unitChartRef.current) {
      const unitChart = new Chart(unitChartRef.current, {
        type: "bar",
        data: {
          labels: ["Tim Alfa", "Tim Bravo", "Tim Charlie", "Tim Delta", "Tim Echo"],
          datasets: [
            {
              label: "Tembak Presisi",
              data: [89, 93, 85, 91, 87],
              backgroundColor: "#0d6efd",
              borderRadius: 6,
            },
            {
              label: "Tembak Reaksi",
              data: [84, 88, 82, 86, 85],
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
              min: 50,
              max: 100,
            },
          },
        },
      });
      createdCharts.push(unitChart);
    }

    // 3. Grafik Distribusi Penggunaan Senjata (Doughnut Chart)
    if (weaponChartRef.current) {
      const weaponChart = new Chart(weaponChartRef.current, {
        type: "doughnut",
        data: {
          labels: ["SS2-V4", "G2 Combat", "MP5", "SPR-3"],
          datasets: [
            {
              data: [45, 25, 18, 12],
              backgroundColor: ["#0d6efd", "#20c997", "#ffc107", "#dc3545"],
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom" },
          },
        },
      });
      createdCharts.push(weaponChart);
    }

    // 4. Grafik Evaluasi Kemampuan Personel (Radar Chart)
    if (radarChartRef.current) {
      const radarChart = new Chart(radarChartRef.current, {
        type: "radar",
        data: {
          labels: [
            "Akurasi Bidik",
            "Kecepatan Reaksi",
            "Stabilitas Sikap",
            "Jarak Jauh",
            "Kendali Recoil",
            "Konsistensi",
          ],
          datasets: [
            {
              label: "Rata-rata Personel",
              data: [88, 82, 85, 76, 84, 89],
              backgroundColor: "rgba(13, 110, 253, 0.2)",
              borderColor: "#0d6efd",
              pointBackgroundColor: "#0d6efd",
              borderWidth: 2,
            },
            {
              label: "Standar Kelulusan",
              data: [75, 75, 75, 70, 75, 75],
              backgroundColor: "rgba(108, 117, 125, 0.1)",
              borderColor: "#6c757d",
              borderDash: [4, 4],
              pointBackgroundColor: "#6c757d",
              borderWidth: 1.5,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              min: 50,
              max: 100,
              ticks: { stepSize: 10, display: false },
            },
          },
        },
      });
      createdCharts.push(radarChart);
    }

    return () => {
      createdCharts.forEach((c) => c.destroy());
    };
  }, []);

  return (
    <div>
      <Navbar />
      <div className="d-flex">
        <Sidebar />
        <div className="font-poppins w-100">
          <div className="bg-body-secondary p-1">
            Dir : sitrak/{document.URL.split("/").slice(3).join("/") || "dashboard"}
          </div>

          <div className="p-2 p-md-4">
            {/* Header Dashboard */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h2 className="fw-bold mb-1">
                  <i className="bi bi-speedometer2 me-2 text-primary"></i>Dashboard Latihan
                </h2>
                <p className="text-secondary mb-0">
                  Ringkasan metrik performa & analitik sesi latihan menembak taktis
                </p>
              </div>
              <div>
                <span className="badge bg-primary-subtle text-primary border border-primary px-3 py-2 fs-6">
                  <i className="bi bi-broadcast me-1"></i> Status: Aktif
                </span>
              </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                  <div className="card-body d-flex align-items-center">
                    <div
                      className="bg-primary text-white rounded-3 p-3 me-3 fs-3 d-flex align-items-center justify-content-center"
                      style={{ width: "55px", height: "55px" }}
                    >
                      <i className="bi bi-bullseye"></i>
                    </div>
                    <div>
                      <small className="text-secondary fw-semibold">Total Sesi Latihan</small>
                      <h4 className="fw-bold mb-0">128 Sesi</h4>
                      <small className="text-success">
                        <i className="bi bi-arrow-up-short"></i>+12% bulan ini
                      </small>
                    </div>
                  </div>
                </div>
              </div>

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
                      <small className="text-secondary fw-semibold">Rata-rata Skor</small>
                      <h4 className="fw-bold mb-0">88.4 / 100</h4>
                      <small className="text-success">
                        <i className="bi bi-arrow-up-short"></i>Kategori Mahir
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                  <div className="card-body d-flex align-items-center">
                    <div
                      className="bg-warning text-dark rounded-3 p-3 me-3 fs-3 d-flex align-items-center justify-content-center"
                      style={{ width: "55px", height: "55px" }}
                    >
                      <i className="bi bi-shield-shaded"></i>
                    </div>
                    <div>
                      <small className="text-secondary fw-semibold">Total Amunisi</small>
                      <h4 className="fw-bold mb-0">3,840 Butir</h4>
                      <small className="text-muted">Terpakai bulan ini</small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                  <div className="card-body d-flex align-items-center">
                    <div
                      className="bg-info text-white rounded-3 p-3 me-3 fs-3 d-flex align-items-center justify-content-center"
                      style={{ width: "55px", height: "55px" }}
                    >
                      <i className="bi bi-crosshair"></i>
                    </div>
                    <div>
                      <small className="text-secondary fw-semibold">Tingkat Akurasi (Hit)</small>
                      <h4 className="fw-bold mb-0">94.2%</h4>
                      <small className="text-success">
                        <i className="bi bi-check-circle me-1"></i>Optimal
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid Grafik Pendukung */}
            <div className="row g-3 g-md-4 mb-4">
              {/* Grafik 1: Tren Skor & Akurasi */}
              <div className="col-12 col-lg-8">
                <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                  <div className="card-header bg-transparent border-0 pt-3 px-3 d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold mb-0">
                      <i className="bi bi-graph-up me-2 text-primary"></i>Tren Skor & Akurasi Bulanan
                    </h5>
                    <span className="badge bg-secondary-subtle text-secondary">6 Bulan Terakhir</span>
                  </div>
                  <div className="card-body p-3">
                    <div style={{ position: "relative", height: "290px" }}>
                      <canvas ref={trendChartRef}></canvas>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grafik 3: Distribusi Senjata */}
              <div className="col-12 col-lg-4">
                <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                  <div className="card-header bg-transparent border-0 pt-3 px-3 d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold mb-0">
                      <i className="bi bi-pie-chart-fill me-2 text-primary"></i>Penggunaan Senjata
                    </h5>
                    <span className="badge bg-secondary-subtle text-secondary">Distribusi</span>
                  </div>
                  <div className="card-body p-3">
                    <div style={{ position: "relative", height: "290px" }}>
                      <canvas ref={weaponChartRef}></canvas>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grafik 2: Komparasi Skor per Regu */}
              <div className="col-12 col-lg-7">
                <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                  <div className="card-header bg-transparent border-0 pt-3 px-3 d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold mb-0">
                      <i className="bi bi-bar-chart-fill me-2 text-primary"></i>Komparasi Skor Antar Regu / Tim
                    </h5>
                    <span className="badge bg-secondary-subtle text-secondary">Presisi vs Reaksi</span>
                  </div>
                  <div className="card-body p-3">
                    <div style={{ position: "relative", height: "290px" }}>
                      <canvas ref={unitChartRef}></canvas>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grafik 4: Radar Evaluasi Parameter */}
              <div className="col-12 col-lg-5">
                <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                  <div className="card-header bg-transparent border-0 pt-3 px-3 d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold mb-0">
                      <i className="bi bi-shield-check me-2 text-primary"></i>Evaluasi Parameter Kemampuan
                    </h5>
                    <span className="badge bg-secondary-subtle text-secondary">Radar Kemampuan</span>
                  </div>
                  <div className="card-body p-3">
                    <div style={{ position: "relative", height: "290px" }}>
                      <canvas ref={radarChartRef}></canvas>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
