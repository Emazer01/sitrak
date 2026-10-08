import * as React from "react";
import axios from "axios";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Navbar } from "../component/Navbar";
import { Sidebar } from "../component/Sidebar";

export const DetailSesi = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  document.title = `Detail Sesi Latihan #${id || ""} - SITRAK-AI`;

  // State data sesi
  const [sesi, setSesi] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [activeGelombang, setActiveGelombang] = React.useState(1);
  const [activeBabakTab, setActiveBabakTab] = React.useState("semua");
  const [selectedPenembakTarget, setSelectedPenembakTarget] =
    React.useState(null);
  const [statusUpdating, setStatusUpdating] = React.useState(false);
  const [statusAlert, setStatusAlert] = React.useState(null);
  const [selectedStatusInModal, setSelectedStatusInModal] =
    React.useState("Menunggu");

  // Fungsi GET API untuk mengambil data detail sesi sesuai gaya kode sebelumnya
  const getDetailSesi = async () => {
    // Validasi ID, jika bukan angka / tidak ada, arahkan langsung ke NotFound
    if (!id || isNaN(Number(id))) {
      navigate("/notfound", { replace: true });
      return;
    }

    setLoading(true);
    try {
      const url = `${process.env.REACT_APP_BACKEND_URL}/sesi/${id}`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (response.status === 200) {
        console.log("Response GET /sesi/:id:", response.data);
        const resData = response.data;
        const rawData = resData?.data || resData;

        // Jika data kosong atau id_sesi tidak ditemukan di respons
        if (!rawData || !rawData.id_sesi) {
          navigate("/notfound", { replace: true });
          return;
        }

        // Normalisasi struktur gelombang -> babak -> personel penembak
        const gelombangList = (rawData.gelombang || []).map((g, gIdx) => {
          const babakList = g.babak || [];
          const shooterMap = new Map();

          babakList.forEach((b) => {
            (b.personel || []).forEach((p) => {
              const pid = p.id_personel_penembak;
              if (!shooterMap.has(pid)) {
                shooterMap.set(pid, {
                  id_personel_penembak: pid,
                  nrp: p.nrp || "-",
                  nama: p.nama_personel_penembak || p.nama || "Penembak",
                  pangkat:
                    p.pangkat ||
                    (p.nama_personel_penembak || p.nama || "").split(" ")[0] ||
                    "-",
                  satuan: p.satuan || "-",
                  babakScoresMap: {},
                  fotoTarget: p.foto_target || null,
                });
              }
              const s = shooterMap.get(pid);
              const bScoreItem = {
                id_personel_babak: p.id_personel_babak,
                id_babak: b.id_babak,
                nomor_babak: b.nomor_babak,
                nama_babak: b.nama_babak,
                skor: parseFloat(p.total_skor || 0),
                akurasi: parseFloat(p.akurasi_persen || 0),
                peluru: b.jumlah_peluru || 0,
              };
              s.babakScoresMap[b.id_babak] = bScoreItem;
              s.babakScoresMap[`no_${b.nomor_babak}`] = bScoreItem;
              s.babakScoresMap[b.nomor_babak] = bScoreItem;

              if (p.foto_target) {
                s.fotoTarget = p.foto_target;
              }
            });
          });

          const jumlahJalur = rawData.jumlah_jalur || g.lane || 1;
          const penembak = Array.from(shooterMap.values()).map((s, pIdx) => {
            // Alokasi nomor jalur / lane penembak dalam gelombang ini
            const laneNo = pIdx + 1;

            // Petakan nilai untuk tiap babak yang ada pada gelombang ini
            const babakScores = babakList.map((b) => {
              const bEntry = s.babakScoresMap[b.id_babak] ||
                s.babakScoresMap[`no_${b.nomor_babak}`] ||
                s.babakScoresMap[b.nomor_babak] || {
                  id_personel_babak: null,
                  skor: 0,
                  akurasi: 0,
                  peluru: b.jumlah_peluru || 0,
                  nama_babak: b.nama_babak,
                };
              return {
                id_babak: b.id_babak,
                nomor: b.nomor_babak,
                nama: b.nama_babak,
                skor: bEntry.skor || 0,
                max_skor: (b.jumlah_peluru || 0) * 10,
                akurasi: bEntry.akurasi || 0,
                peluru: b.jumlah_peluru || 0,
                id_personel_babak: bEntry.id_personel_babak,
              };
            });

            const totalSkor = babakScores.reduce((acc, bs) => acc + bs.skor, 0);
            const totalMax = babakScores.reduce(
              (acc, bs) => acc + bs.max_skor,
              0,
            );
            const akurasiAkhir =
              totalMax > 0 ? (totalSkor / totalMax) * 100 : 0;

            let kategori = "Menunggu";
            if (
              totalSkor > 0 ||
              (rawData.status || "").toLowerCase() === "selesai"
            ) {
              if (akurasiAkhir >= 90) kategori = "Istimewa";
              else if (akurasiAkhir >= 80) kategori = "Mahir";
              else if (akurasiAkhir >= 70) kategori = "Cukup";
              else kategori = "Perlu Pembinaan";
            }

            // Mengambil data deteksi tembakan riil jika ada foto target atau deteksi
            const foto = s.fotoTarget;
            const deteksiRaw =
              foto?.detail_deteksi_tembakan || foto?.deteksi_tembakan || [];

            const hits = deteksiRaw.map((d, dIdx) => ({
              nomor: d.nomor_tembakan || dIdx + 1,
              x: parseFloat(d.koordinat_x || 50),
              y: parseFloat(d.koordinat_y || 50),
              ring: d.ring_zona || "-",
              poin: parseFloat(d.skor_poin || 0),
            }));

            const ballistics = foto
              ? {
                  groupingRadius: foto.grouping_radius_mm,
                  offsetX: foto.center_offset_x_mm,
                  offsetY: foto.center_offset_y_mm,
                  statusAnalisis: foto.status_analisis,
                  catatan: foto.catatan_analisis,
                }
              : null;

            return {
              lane: laneNo,
              id_personel_penembak: s.id_personel_penembak,
              nrp: s.nrp,
              nama: s.nama,
              pangkat: s.pangkat,
              satuan: s.satuan,
              babak_scores: babakScores,
              total_skor: totalSkor,
              total_max: totalMax,
              akurasi_akhir: parseFloat(akurasiAkhir.toFixed(1)),
              kategori: kategori,
              hits: hits,
              ballistics: ballistics,
            };
          });

          return {
            id_gelombang: g.id_gelombang,
            nomor_gelombang: g.nomor_gelombang || gIdx + 1,
            status:
              g.status ||
              (penembak.some((p) => p.total_skor > 0)
                ? "Berlangsung"
                : rawData.status || "Menunggu"),
            lane: g.lane || jumlahJalur,
            babak: babakList.map((b) => ({
              id_babak: b.id_babak,
              nomor_babak: b.nomor_babak,
              nama_babak: b.nama_babak,
              jumlah_peluru: b.jumlah_peluru || 0,
            })),
            penembak: penembak,
          };
        });

        // Daftar konfigurasi babak
        const firstWaveBabak = rawData.gelombang?.[0]?.babak || [];
        const babakConfig = firstWaveBabak.map((b) => ({
          nomor_babak: b.nomor_babak,
          nama_babak: b.nama_babak,
          jumlah_peluru: b.jumlah_peluru,
        }));

        const totalPeluruPerPersonel = babakConfig.reduce(
          (acc, curr) => acc + (curr.jumlah_peluru || 0),
          0,
        );

        setSesi({
          id_sesi: rawData.id_sesi,
          kode_sesi:
            rawData.kode_sesi ||
            `SESI-${String(rawData.id_sesi).padStart(4, "0")}`,
          nama_sesi: rawData.nama_sesi || "Sesi Latihan",
          nama_tempat_menembak: rawData.nama_tempat_menembak || "-",
          tanggal: rawData.tanggal,
          status: rawData.status || "Menunggu",
          model_senjata: rawData.model_senjata || "-",
          kaliber: rawData.kaliber || "-",
          pabrikan: rawData.pabrikan || "-",
          jarak_meter: rawData.jarak_meter || 0,
          nama_sikap_menembak: rawData.nama_sikap_menembak || "-",
          nama_mode_tembakan: rawData.nama_mode_tembakan || "-",
          nama_tipe_target: rawData.nama_tipe_target || "-",
          jumlah_jalur: rawData.jumlah_jalur || 1,
          total_gelombang: rawData.total_gelombang || gelombangList.length || 1,
          total_peluru_per_personel: totalPeluruPerPersonel,
          babak: babakConfig,
          gelombang_list: gelombangList,
        });
        setSelectedStatusInModal(rawData.status || "Menunggu");
      } else {
        navigate("/notfound", { replace: true });
      }
    } catch (error) {
      console.error("Gagal mengambil detail sesi dari API:", error);
      // Jika data sesi tidak ditemukan (404/400/500), arahkan ke halaman NotFound
      navigate("/notfound", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  // Fungsi API untuk mengupdate status sesi
  const updateStatusSesi = async (newStatus) => {
    if (!id || !newStatus) return;
    if (sesi && sesi.status === newStatus) return;

    if (newStatus === "Dibatalkan") {
      const confirmCancel = window.confirm(
        "Apakah Anda yakin ingin membatalkan sesi latihan ini?"
      );
      if (!confirmCancel) return;
    }

    setStatusUpdating(true);
    setStatusAlert(null);

    try {
      const url = `${process.env.REACT_APP_BACKEND_URL}/sesi/${id}/status`;
      const response = await axios.patch(
        url,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200) {
        // Perbarui status pada state sesi lokal
        setSesi((prev) => (prev ? { ...prev, status: newStatus } : prev));
        setSelectedStatusInModal(newStatus);
        setStatusAlert({
          type: "success",
          message: `Status sesi latihan berhasil diubah menjadi "${newStatus}".`,
        });

        // Tutup modal ubah status jika terbuka
        const modalEl = document.getElementById("modalUbahStatusSesi");
        if (modalEl && window.bootstrap) {
          const modalInstance = window.bootstrap.Modal.getInstance(modalEl);
          if (modalInstance) {
            modalInstance.hide();
          }
        }

        // Hilangkan alert setelah 4 detik
        setTimeout(() => {
          setStatusAlert(null);
        }, 4000);
      }
    } catch (error) {
      console.error("Gagal mengupdate status sesi:", error);
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data ||
        error.message ||
        "Terjadi kesalahan saat mengupdate status sesi.";
      setStatusAlert({
        type: "danger",
        message: `Gagal memperbarui status: ${
          typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg)
        }`,
      });
    } finally {
      setStatusUpdating(false);
    }
  };

  React.useEffect(() => {
    document
      .getElementById("btn-dashboard")
      ?.classList.remove("sidebar-active");
    document.getElementById("btn-latihan")?.classList.add("sidebar-active");
    document
      .getElementById("btn-pengaturan")
      ?.classList.remove("sidebar-active");

    document
      .getElementById("nav-btn-dashboard")
      ?.classList.remove("sidebar-active");
    document.getElementById("nav-btn-latihan")?.classList.add("sidebar-active");
    document
      .getElementById("nav-btn-pengaturan")
      ?.classList.remove("sidebar-active");

    getDetailSesi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Set default selected penembak target saat sesi dimuat
  React.useEffect(() => {
    if (sesi && sesi.gelombang_list && sesi.gelombang_list.length > 0) {
      const currentWave =
        sesi.gelombang_list.find(
          (g) => g.nomor_gelombang === activeGelombang,
        ) || sesi.gelombang_list[0];
      if (currentWave && currentWave.penembak.length > 0) {
        setSelectedPenembakTarget(currentWave.penembak[0]);
      }
    }
    setActiveBabakTab("semua");
  }, [sesi, activeGelombang]);

  const formatTanggal = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const renderStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "berlangsung") {
      return (
        <span className="badge bg-success-subtle text-success border border-success px-3 py-2">
          <i className="bi bi-record-circle me-1"></i>Berlangsung
        </span>
      );
    }
    if (s === "selesai") {
      return (
        <span className="badge bg-secondary-subtle text-secondary border px-3 py-2">
          <i className="bi bi-check-circle me-1"></i>Selesai
        </span>
      );
    }
    if (s === "menunggu") {
      return (
        <span className="badge bg-warning-subtle text-warning border border-warning px-3 py-2">
          <i className="bi bi-clock me-1"></i>Menunggu
        </span>
      );
    }
    return (
      <span className="badge bg-danger-subtle text-danger border border-danger px-3 py-2">
        <i className="bi bi-x-circle me-1"></i>
        {status || "Dibatalkan"}
      </span>
    );
  };

  const renderKategoriBadge = (kategori) => {
    switch (kategori) {
      case "Istimewa":
        return <span className="badge bg-success text-white">Istimewa</span>;
      case "Mahir":
        return <span className="badge bg-primary text-white">Mahir</span>;
      case "Cukup":
        return <span className="badge bg-warning text-dark">Cukup</span>;
      case "Perlu Pembinaan":
        return (
          <span className="badge bg-danger text-white">Perlu Pembinaan</span>
        );
      default:
        return (
          <span className="badge bg-secondary text-white">Belum Menembak</span>
        );
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="d-flex min-vh-100">
          <Sidebar />
          <div className="font-poppins w-100 p-5 text-center">
            <div
              className="spinner-border text-primary me-2"
              role="status"
            ></div>
            <span className="text-secondary">
              Memuat rincian sesi latihan...
            </span>
          </div>
        </div>
      </div>
    );
  }

  const currentWaveData =
    sesi?.gelombang_list?.find((g) => g.nomor_gelombang === activeGelombang) ||
    sesi?.gelombang_list?.[0];

  const waveBabakList = currentWaveData?.babak || sesi?.babak || [];
  const displayedBabakList =
    activeBabakTab === "semua"
      ? waveBabakList
      : waveBabakList.filter(
          (b) => String(b.nomor_babak) === String(activeBabakTab),
        );

  return (
    <div>
      <Navbar />
      <div className="d-flex min-vh-100">
        <Sidebar />
        <div className="font-poppins w-100 overflow-x-hidden">
          {/* Breadcrumb Path Bar */}
          <div className="bg-body-secondary p-2 small d-flex align-items-center justify-content-between">
            <div className="text-truncate">
              <Link
                to="/latihan"
                className="text-decoration-none text-secondary"
              >
                Latihan
              </Link>{" "}
              / <span className="text-dark fw-semibold">{sesi.kode_sesi}</span>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary py-0 px-2"
              onClick={() => navigate("/latihan")}
            >
              <i className="bi bi-arrow-left me-1"></i> Kembali ke Daftar
              Latihan
            </button>
          </div>

          <div className="p-2 p-sm-3 p-md-4">
            {/* Alert Notifikasi Perubahan Status Sesi */}
            {statusAlert && (
              <div
                className={`alert alert-${statusAlert.type} alert-dismissible fade show d-flex align-items-center mb-3 shadow-sm`}
                role="alert"
              >
                <i
                  className={`bi ${
                    statusAlert.type === "success"
                      ? "bi-check-circle-fill text-success"
                      : "bi-exclamation-triangle-fill text-danger"
                  } me-2 fs-5`}
                ></i>
                <div className="flex-grow-1">{statusAlert.message}</div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setStatusAlert(null)}
                  aria-label="Close"
                ></button>
              </div>
            )}

            {/* 1. HEADER DETAIL SESI */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
              <div>
                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                  <h2 className="fw-bold mb-0 fs-3">
                    <i className="bi bi-crosshair me-2 text-primary"></i>
                    {sesi.nama_sesi}
                  </h2>
                  <span className="badge bg-dark text-white px-2 py-1 fs-7">
                    {sesi.kode_sesi}
                  </span>
                </div>
                <p className="text-secondary mb-0 small">
                  <i className="bi bi-geo-alt me-1 text-danger"></i>
                  {sesi.nama_tempat_menembak} •{" "}
                  <i className="bi bi-calendar3 ms-2 me-1 text-primary"></i>
                  {formatTanggal(sesi.tanggal)}
                </p>
              </div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                {renderStatusBadge(sesi.status)}

                {/* Quick Action Button berdasarkan status aktif */}
                {sesi.status === "Menunggu" && (
                  <button
                    type="button"
                    className="btn btn-sm btn-success d-flex align-items-center gap-1 shadow-sm"
                    onClick={() => updateStatusSesi("Berlangsung")}
                    disabled={statusUpdating}
                    title="Mulai Sesi Latihan"
                  >
                    {statusUpdating ? (
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                      />
                    ) : (
                      <i className="bi bi-play-circle"></i>
                    )}
                    <span>Mulai Sesi</span>
                  </button>
                )}

                {sesi.status === "Berlangsung" && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm"
                    onClick={() => updateStatusSesi("Selesai")}
                    disabled={statusUpdating}
                    title="Tandai Sesi Selesai"
                  >
                    {statusUpdating ? (
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                      />
                    ) : (
                      <i className="bi bi-check-circle"></i>
                    )}
                    <span>Selesaikan Sesi</span>
                  </button>
                )}

                {sesi.status === "Selesai" && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-warning d-flex align-items-center gap-1"
                    onClick={() => updateStatusSesi("Berlangsung")}
                    disabled={statusUpdating}
                    title="Buka Kembali Sesi Latihan"
                  >
                    {statusUpdating ? (
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                      />
                    ) : (
                      <i className="bi bi-arrow-counterclockwise"></i>
                    )}
                    <span>Buka Kembali</span>
                  </button>
                )}

                {/* Dropdown Menu & Dialog Ubah Status */}
                <div className="btn-group">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary dropdown-toggle d-flex align-items-center gap-1"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    disabled={statusUpdating}
                    title="Ubah Status Sesi"
                  >
                    {statusUpdating ? (
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                      />
                    ) : (
                      <i className="bi bi-arrow-repeat"></i>
                    )}
                    <span>Ubah Status</span>
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end shadow border-0 py-2">
                    <li>
                      <h6 className="dropdown-header text-uppercase small fw-bold">
                        Pilih Status Sesi
                      </h6>
                    </li>
                    <li>
                      <button
                        className={`dropdown-item d-flex align-items-center justify-content-between py-2 ${
                          sesi.status === "Menunggu" ? "active" : ""
                        }`}
                        type="button"
                        onClick={() => updateStatusSesi("Menunggu")}
                        disabled={sesi.status === "Menunggu" || statusUpdating}
                      >
                        <span>
                          <i className="bi bi-clock text-warning me-2"></i>
                          Menunggu
                        </span>
                        {sesi.status === "Menunggu" && (
                          <i className="bi bi-check2"></i>
                        )}
                      </button>
                    </li>
                    <li>
                      <button
                        className={`dropdown-item d-flex align-items-center justify-content-between py-2 ${
                          sesi.status === "Berlangsung" ? "active" : ""
                        }`}
                        type="button"
                        onClick={() => updateStatusSesi("Berlangsung")}
                        disabled={
                          sesi.status === "Berlangsung" || statusUpdating
                        }
                      >
                        <span>
                          <i className="bi bi-record-circle text-success me-2"></i>
                          Berlangsung
                        </span>
                        {sesi.status === "Berlangsung" && (
                          <i className="bi bi-check2"></i>
                        )}
                      </button>
                    </li>
                    <li>
                      <button
                        className={`dropdown-item d-flex align-items-center justify-content-between py-2 ${
                          sesi.status === "Selesai" ? "active" : ""
                        }`}
                        type="button"
                        onClick={() => updateStatusSesi("Selesai")}
                        disabled={sesi.status === "Selesai" || statusUpdating}
                      >
                        <span>
                          <i className="bi bi-check-circle text-primary me-2"></i>
                          Selesai
                        </span>
                        {sesi.status === "Selesai" && (
                          <i className="bi bi-check2"></i>
                        )}
                      </button>
                    </li>
                    <li>
                      <hr className="dropdown-divider my-1" />
                    </li>
                    <li>
                      <button
                        className={`dropdown-item text-danger d-flex align-items-center justify-content-between py-2 ${
                          sesi.status === "Dibatalkan" ? "active" : ""
                        }`}
                        type="button"
                        onClick={() => updateStatusSesi("Dibatalkan")}
                        disabled={
                          sesi.status === "Dibatalkan" || statusUpdating
                        }
                      >
                        <span>
                          <i className="bi bi-x-circle me-2"></i>
                          Dibatalkan
                        </span>
                        {sesi.status === "Dibatalkan" && (
                          <i className="bi bi-check2"></i>
                        )}
                      </button>
                    </li>
                    <li>
                      <hr className="dropdown-divider my-1" />
                    </li>
                    <li>
                      <button
                        className="dropdown-item text-secondary small py-2 d-flex align-items-center gap-2"
                        type="button"
                        data-bs-toggle="modal"
                        data-bs-target="#modalUbahStatusSesi"
                        onClick={() =>
                          setSelectedStatusInModal(sesi.status || "Menunggu")
                        }
                      >
                        <i className="bi bi-sliders"></i>
                        <span>Dialog Pilihan Status...</span>
                      </button>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => window.print()}
                >
                  <i className="bi bi-printer me-1"></i> Cetak Laporan
                </button>
              </div>
            </div>

            {/* 2. PARAMETER UTAMA SESI (SPESIFIKASI TEMBAKAN) */}
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-4 col-xl-2">
                <div className="card border-0 shadow-sm bg-body-tertiary h-100 p-3">
                  <small className="text-secondary fw-semibold">Senjata</small>
                  <div className="fw-bold text-truncate">
                    {sesi.model_senjata}
                  </div>
                  <small className="text-muted text-truncate">
                    {sesi.kaliber}
                  </small>
                </div>
              </div>
              <div className="col-6 col-md-4 col-xl-2">
                <div className="card border-0 shadow-sm bg-body-tertiary h-100 p-3">
                  <small className="text-secondary fw-semibold">
                    Jarak Tembak
                  </small>
                  <div className="fw-bold">{sesi.jarak_meter} Meter</div>
                  <small className="text-muted">Target Presisi</small>
                </div>
              </div>
              <div className="col-6 col-md-4 col-xl-2">
                <div className="card border-0 shadow-sm bg-body-tertiary h-100 p-3">
                  <small className="text-secondary fw-semibold">
                    Sikap Menembak
                  </small>
                  <div className="fw-bold">{sesi.nama_sikap_menembak}</div>
                  <small className="text-muted">Standard Posisi</small>
                </div>
              </div>
              <div className="col-6 col-md-4 col-xl-2">
                <div className="card border-0 shadow-sm bg-body-tertiary h-100 p-3">
                  <small className="text-secondary fw-semibold">
                    Mode Tembakan
                  </small>
                  <div className="fw-bold text-primary">
                    {sesi.nama_mode_tembakan}
                  </div>
                  <small className="text-muted">Ritme Terjadwal</small>
                </div>
              </div>
              <div className="col-6 col-md-4 col-xl-2">
                <div className="card border-0 shadow-sm bg-body-tertiary h-100 p-3">
                  <small className="text-secondary fw-semibold">
                    Kapasitas Sesi
                  </small>
                  <div className="fw-bold">
                    {sesi.jumlah_jalur} Jalur (Lane)
                  </div>
                  <small className="text-muted">
                    {sesi.total_gelombang} Gelombang
                  </small>
                </div>
              </div>
              <div className="col-6 col-md-4 col-xl-2">
                <div className="card border-0 shadow-sm bg-body-tertiary h-100 p-3">
                  <small className="text-secondary fw-semibold">
                    Amunisi / Orang
                  </small>
                  <div className="fw-bold text-success">
                    {sesi.total_peluru_per_personel} Butir
                  </div>
                  <small className="text-muted">
                    {sesi.babak?.length || 2} Babak
                  </small>
                </div>
              </div>
            </div>

            {/* 3. TABS GELOMBANG & DAFTAR PENEMBAK */}
            <div className="card border-0 shadow-sm bg-body-tertiary mb-4">
              <div className="card-header bg-transparent border-0 pt-3 px-3 d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
                <div>
                  <h5 className="fw-bold mb-0">
                    <i className="bi bi-people-fill me-2 text-primary"></i>
                    Alokasi Penembak & Perolehan Nilai
                  </h5>
                  <small className="text-secondary">
                    Pilih gelombang untuk memantau nilai tiap penembak di setiap
                    jalur
                  </small>
                </div>

                {/* Tab Selector Gelombang */}
                <div className="border rounded-2 d-flex flex-column">
                  <span className="p-1 text-center">Gelombang</span>
                  <div className="btn-group btn-group-sm">
                    {sesi.gelombang_list?.map((g) => (
                      <button
                        key={g.nomor_gelombang}
                        type="button"
                        className={`btn ${
                          activeGelombang === g.nomor_gelombang
                            ? "btn-primary"
                            : "btn-outline-secondary"
                        }`}
                        onClick={() => setActiveGelombang(g.nomor_gelombang)}
                      >
                        {g.nomor_gelombang}
                        <span
                          className={`badge ms-1 ${
                            g.status === "Berlangsung"
                              ? "bg-success"
                              : "bg-secondary"
                          }`}
                        >
                          {g.penembak?.length || 0}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card-body p-3">
                {/* Banner Status Gelombang Aktif & Filter Babak */}
                <div className="alert alert-light border d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3 py-2 px-3">
                  <div>
                    <span className="fw-bold text-primary me-2">
                      Gelombang {activeGelombang}
                    </span>
                    <span className="text-secondary small">
                      •{" "}
                      {currentWaveData?.penembak?.length || 0} Penembak
                      Terdaftar
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-1 flex-wrap">
                    <span className="small text-muted me-1">
                      Tampilan Babak:
                    </span>
                    <button
                      type="button"
                      className={`btn btn-sm py-1 px-2 ${
                        activeBabakTab === "semua"
                          ? "btn-dark fw-bold"
                          : "btn-outline-secondary"
                      }`}
                      onClick={() => setActiveBabakTab("semua")}
                    >
                      Semua Babak ({waveBabakList.length})
                    </button>
                    {waveBabakList.map((b) => (
                      <button
                        key={b.id_babak || b.nomor_babak}
                        type="button"
                        className={`btn btn-sm py-1 px-2 ${
                          String(activeBabakTab) === String(b.nomor_babak)
                            ? "btn-primary fw-bold"
                            : "btn-outline-secondary"
                        }`}
                        onClick={() => setActiveBabakTab(String(b.nomor_babak))}
                      >
                        Babak {b.nomor_babak}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tabel Detail Penembak di Gelombang Ini */}
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-dark">
                      <tr>
                        <th style={{ width: "85px" }}>Jalur</th>
                        <th style={{ minWidth: "160px" }}>Personel Penembak</th>
                        <th style={{ minWidth: "140px" }}>NRP & Satuan</th>
                        {displayedBabakList.map((b) => (
                          <th
                            key={b.id_babak || b.nomor_babak}
                            style={{ minWidth: "140px" }}
                          >
                            ({b.nomor_babak}) {b.nama_babak}
                            <div className="small text-muted fw-normal">
                              {b.jumlah_peluru} Peluru
                            </div>
                          </th>
                        ))}
                        <th style={{ minWidth: "120px" }}>Total Nilai</th>
                        <th style={{ minWidth: "120px" }}>Kategori</th>
                        <th className="text-end" style={{ minWidth: "120px" }}>
                          Aksi Target
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {!currentWaveData?.penembak ||
                      currentWaveData.penembak.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5 + displayedBabakList.length}
                            className="text-center py-4 text-muted"
                          >
                            <i className="bi bi-info-circle me-2"></i>
                            Belum ada personel penembak yang dialokasikan pada
                            gelombang ini.
                          </td>
                        </tr>
                      ) : (
                        currentWaveData.penembak.map((p, pIdx) => {
                          const isSelected =
                            selectedPenembakTarget?.id_personel_penembak ===
                            p.id_personel_penembak;

                          return (
                            <tr
                              key={p.id_personel_penembak || p.lane || pIdx}
                              className={
                                isSelected
                                  ? "table-light text-dark table-opacity-10"
                                  : ""
                              }
                            >
                              <td>
                                <span className="badge bg-dark fs-6 px-2 py-1">
                                  Lane {p.lane}
                                </span>
                              </td>
                              <td>
                                <div className="fw-bold">{p.nama}</div>
                              </td>
                              <td>
                                <div>{p.satuan}</div>
                                <small>NRP: {p.nrp}</small>
                              </td>
                              {displayedBabakList.map((b) => {
                                const bScore = p.babak_scores?.find(
                                  (bs) =>
                                    bs.id_babak === b.id_babak ||
                                    bs.nomor === b.nomor_babak,
                                );
                                const skor = bScore ? bScore.skor : 0;
                                const maxSkor =
                                  bScore?.max_skor ||
                                  (b.jumlah_peluru || 0) * 10;
                                const akurasi = bScore ? bScore.akurasi : 0;

                                return (
                                  <td key={b.id_babak || b.nomor_babak}>
                                    <div className="fw-semibold">
                                      {skor} / {maxSkor}
                                    </div>
                                    <span
                                      className={`badge ${
                                        akurasi >= 80
                                          ? "bg-success-subtle text-success border border-success"
                                          : akurasi >= 60
                                            ? "bg-warning-subtle text-warning border border-warning"
                                            : "bg-secondary-subtle text-secondary border"
                                      } small`}
                                    >
                                      Akurasi: {akurasi}%
                                    </span>
                                  </td>
                                );
                              })}
                              <td>
                                <div className="fw-bold fs-6 text-primary">
                                  {p.total_skor} / {p.total_max}
                                </div>
                                <small>{p.akurasi_akhir}% Akurasi</small>
                              </td>
                              <td>{renderKategoriBadge(p.kategori)}</td>
                              <td className="text-end">
                                <button
                                  type="button"
                                  className={`btn btn-sm ${
                                    isSelected
                                      ? "btn-primary"
                                      : "btn-outline-primary"
                                  }`}
                                  onClick={() => setSelectedPenembakTarget(p)}
                                >
                                  <i className="bi bi-bullseye me-1"></i>
                                  {isSelected ? "Sedang Dilihat" : "Cek Target"}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {currentWaveData?.penembak?.length > 0 && (
                      <tfoot className="fw-semibold">
                        <tr>
                          <td colSpan={3} className="text-end pe-3">
                            <i className="bi bi-calculator me-1"></i>
                            Rata-rata Gelombang:
                          </td>
                          {displayedBabakList.map((b) => {
                            const totalBabakSkor =
                              currentWaveData.penembak.reduce((acc, p) => {
                                const bScore = p.babak_scores?.find(
                                  (bs) =>
                                    bs.id_babak === b.id_babak ||
                                    bs.nomor === b.nomor_babak,
                                );
                                return acc + (bScore?.skor || 0);
                              }, 0);
                            const avgSkor = (
                              totalBabakSkor / currentWaveData.penembak.length
                            ).toFixed(1);
                            const maxBabak = (b.jumlah_peluru || 0) * 10;
                            const avgAkurasi =
                              maxBabak > 0
                                ? ((avgSkor / maxBabak) * 100).toFixed(1)
                                : 0;

                            return (
                              <td key={b.id_babak || b.nomor_babak}>
                                <div>
                                  {avgSkor} / {maxBabak}
                                </div>
                                <small className="text-muted fw-normal">
                                  Avg: {avgAkurasi}%
                                </small>
                              </td>
                            );
                          })}
                          <td>
                            <div>
                              {(
                                currentWaveData.penembak.reduce(
                                  (acc, p) => acc + (p.total_skor || 0),
                                  0,
                                ) / currentWaveData.penembak.length
                              ).toFixed(1)}
                            </div>
                            <small className="text-muted fw-normal">
                              Rerata Nilai
                            </small>
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>

            {/* 4. VISUALISASI TARGET TEMBAKAN & ANALISIS PERKENAAN (AI TARGET VISUALIZER) */}
            {selectedPenembakTarget && (
              <div className="card border-0 shadow-sm bg-body-tertiary">
                <div className="card-header bg-transparent border-0 pt-3 px-3 d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
                  <div>
                    <h5 className="fw-bold mb-0">
                      <i className="bi bi-bullseye me-2 text-danger"></i>
                      Visualisasi Perkenaan Target (Lane{" "}
                      {selectedPenembakTarget.lane} -{" "}
                      {selectedPenembakTarget.nama})
                    </h5>
                    <small className="text-secondary">
                      Simulasi peta tembakan dan analisis sebaran perkenaan
                      (Mean Point of Impact)
                    </small>
                  </div>
                  <span className="badge bg-info-subtle text-info border border-info px-3 py-2">
                    <i className="bi bi-cpu me-1"></i> Mode Analisis AI Target
                  </span>
                </div>

                <div className="card-body p-3">
                  <div className="row g-4 align-items-center">
                    {/* Target SVG Display */}
                    <div className="col-12 col-md-6 col-lg-5 text-center">
                      <div
                        className="bg-dark rounded-3 p-3 d-inline-block shadow"
                        style={{ maxWidth: "340px", width: "100%" }}
                      >
                        <svg
                          viewBox="0 0 100 100"
                          className="w-100 h-auto"
                          style={{ maxHeight: "300px" }}
                        >
                          {/* Target Ring Layers */}
                          <circle
                            cx="50"
                            cy="50"
                            r="48"
                            fill="#f8f9fa"
                            stroke="#212529"
                            strokeWidth="1"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="#e9ecef"
                            stroke="#212529"
                            strokeWidth="1"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="32"
                            fill="#ced4da"
                            stroke="#212529"
                            strokeWidth="1"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="24"
                            fill="#212529"
                            stroke="#fff"
                            strokeWidth="0.8"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="16"
                            fill="#212529"
                            stroke="#fff"
                            strokeWidth="0.8"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="8"
                            fill="#212529"
                            stroke="#fff"
                            strokeWidth="0.8"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="3"
                            fill="#dc3545"
                            stroke="#fff"
                            strokeWidth="0.5"
                          />

                          {/* Crosshair lines */}
                          <line
                            x1="50"
                            y1="2"
                            x2="50"
                            y2="98"
                            stroke="rgba(255,255,255,0.3)"
                            strokeWidth="0.5"
                          />
                          <line
                            x1="2"
                            y1="50"
                            x2="98"
                            y2="50"
                            stroke="rgba(255,255,255,0.3)"
                            strokeWidth="0.5"
                          />

                          {/* Bullet Hit Markers or Empty Notice */}
                          {!selectedPenembakTarget.hits ||
                          selectedPenembakTarget.hits.length === 0 ? (
                            <text
                              x="50"
                              y="52"
                              fill="#ffffff"
                              fontSize="3.6"
                              fontWeight="600"
                              textAnchor="middle"
                              opacity="0.85"
                            >
                              Belum Ada Tembakan
                            </text>
                          ) : (
                            selectedPenembakTarget.hits.map((h, i) => (
                              <g key={i}>
                                <circle
                                  cx={h.x}
                                  cy={h.y}
                                  r="1.8"
                                  fill="#ffc107"
                                  stroke="#000"
                                  strokeWidth="0.5"
                                />
                                <circle
                                  cx={h.x}
                                  cy={h.y}
                                  r="0.7"
                                  fill="#dc3545"
                                />
                              </g>
                            ))
                          )}
                        </svg>
                        <div className="text-white-50 small mt-2">
                          Target: {sesi.nama_tipe_target} •{" "}
                          {selectedPenembakTarget.hits?.length || 0} Perkenaan
                          Terdeteksi
                        </div>
                      </div>
                    </div>

                    {/* Analisis Balistik & Statistik */}
                    <div className="col-12 col-md-6 col-lg-7">
                      <div className="row g-3 mb-3">
                        <div className="col-6 col-sm-4">
                          <div className="p-3 bg-body rounded border">
                            <small className="text-muted d-block">
                              Total Poin
                            </small>
                            <span className="fs-4 fw-bold text-primary">
                              {selectedPenembakTarget.total_skor}
                            </span>
                            <span className="small text-muted">
                              {" "}
                              / {selectedPenembakTarget.total_max}
                            </span>
                          </div>
                        </div>
                        <div className="col-6 col-sm-4">
                          <div className="p-3 bg-body rounded border">
                            <small className="text-muted d-block">
                              Akurasi Tembak
                            </small>
                            <span className="fs-4 fw-bold text-success">
                              {selectedPenembakTarget.akurasi_akhir}%
                            </span>
                          </div>
                        </div>
                        <div className="col-12 col-sm-4">
                          <div className="p-3 bg-body rounded border">
                            <small className="text-muted d-block">
                              Hasil Kelulusan
                            </small>
                            <div className="mt-1">
                              {renderKategoriBadge(
                                selectedPenembakTarget.kategori,
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Rincian Skor Per Babak Penembak Ini */}
                      {selectedPenembakTarget.babak_scores &&
                        selectedPenembakTarget.babak_scores.length > 0 && (
                          <div className="mb-3 d-flex flex-wrap gap-2">
                            {selectedPenembakTarget.babak_scores.map((bs) => (
                              <div
                                key={bs.id_babak || bs.nomor}
                                className="badge bg-body text-dark border p-2 fw-normal"
                              >
                                <span className="fw-bold text-primary me-1">
                                  Babak {bs.nomor} ({bs.nama}):
                                </span>
                                <span className="fw-semibold">
                                  {bs.skor} / {bs.max_skor}
                                </span>{" "}
                                <span className="text-muted">
                                  ({bs.akurasi}% Akurasi)
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                      <div className="card border p-3 bg-body">
                        <h6 className="fw-bold mb-2">
                          <i className="bi bi-graph-up me-1 text-primary"></i>
                          Evaluasi Konsistensi & Sebaran (Grouping)
                        </h6>
                        {selectedPenembakTarget.ballistics ? (
                          <>
                            <div className="small text-secondary mb-3">
                              {selectedPenembakTarget.ballistics.catatan ||
                                "Hasil analisis AI terhadap foto sasaran dan sebaran kelompok tembakan."}
                            </div>
                            <div className="d-flex flex-wrap gap-2">
                              {selectedPenembakTarget.ballistics.offsetX !==
                                null &&
                                selectedPenembakTarget.ballistics.offsetX !==
                                  undefined && (
                                  <span className="badge bg-secondary-subtle text-secondary border">
                                    Mean Offset X:{" "}
                                    {selectedPenembakTarget.ballistics.offsetX}{" "}
                                    mm
                                  </span>
                                )}
                              {selectedPenembakTarget.ballistics.offsetY !==
                                null &&
                                selectedPenembakTarget.ballistics.offsetY !==
                                  undefined && (
                                  <span className="badge bg-secondary-subtle text-secondary border">
                                    Mean Offset Y:{" "}
                                    {selectedPenembakTarget.ballistics.offsetY}{" "}
                                    mm
                                  </span>
                                )}
                              {selectedPenembakTarget.ballistics
                                .groupingRadius !== null &&
                                selectedPenembakTarget.ballistics
                                  .groupingRadius !== undefined && (
                                  <span className="badge bg-success-subtle text-success border">
                                    Radius Sebaran: ±
                                    {
                                      selectedPenembakTarget.ballistics
                                        .groupingRadius
                                    }{" "}
                                    mm
                                  </span>
                                )}
                              {selectedPenembakTarget.ballistics
                                .statusAnalisis && (
                                <span className="badge bg-primary-subtle text-primary border">
                                  Status AI:{" "}
                                  {
                                    selectedPenembakTarget.ballistics
                                      .statusAnalisis
                                  }
                                </span>
                              )}
                            </div>
                          </>
                        ) : selectedPenembakTarget.hits &&
                          selectedPenembakTarget.hits.length > 0 ? (
                          <>
                            <div className="small text-secondary mb-3">
                              Tembakan terdeteksi (
                              {selectedPenembakTarget.hits.length} butir
                              peluru).
                            </div>
                            <div className="d-flex flex-wrap gap-2">
                              <span className="badge bg-info-subtle text-info border">
                                Perkenaan: {selectedPenembakTarget.hits.length}{" "}
                                Butir
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="small text-muted mb-3">
                              Personel belum melaksanakan penembakan atau foto
                              hasil sasaran belum diunggah untuk dianalisis.
                            </div>
                            <div className="d-flex flex-wrap gap-2">
                              <span className="badge bg-light text-secondary border">
                                Status: Belum Menembak
                              </span>
                              <span className="badge bg-light text-secondary border">
                                Perkenaan: 0 Butir
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL UBAH STATUS SESI */}
      <div
        className="modal fade"
        id="modalUbahStatusSesi"
        tabIndex="-1"
        aria-labelledby="modalUbahStatusSesiLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header bg-dark text-white">
              <h5
                className="modal-title fs-6 fw-bold mb-0"
                id="modalUbahStatusSesiLabel"
              >
                <i className="bi bi-pencil-square me-2 text-warning"></i>
                Ubah Status Sesi Latihan
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body p-4">
              <div className="mb-3 p-3 bg-body-secondary rounded">
                <div className="fw-semibold text-dark">{sesi?.nama_sesi}</div>
                <div className="small text-secondary">
                  Kode: <span className="fw-bold">{sesi?.kode_sesi}</span> •
                  Status Saat Ini:{" "}
                  <span className="fw-bold">{sesi?.status}</span>
                </div>
              </div>

              <label className="form-label fw-semibold small text-muted text-uppercase mb-2">
                Pilih Status Sesi Baru:
              </label>

              <div className="d-flex flex-column gap-2">
                {/* Opsi Menunggu */}
                <label
                  className={`card p-3 border ${
                    selectedStatusInModal === "Menunggu"
                      ? "border-warning bg-warning bg-opacity-10"
                      : "bg-body"
                  }`}
                  style={{ cursor: "pointer" }}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                      <input
                        type="radio"
                        name="statusRadio"
                        className="form-check-input mt-0"
                        checked={selectedStatusInModal === "Menunggu"}
                        onChange={() => setSelectedStatusInModal("Menunggu")}
                      />
                      <div>
                        <div className="fw-bold text-dark">
                          <i className="bi bi-clock text-warning me-1"></i>{" "}
                          Menunggu
                        </div>
                        <small className="text-secondary">
                          Sesi latihan dijadwalkan dan menunggu pelaksanaan.
                        </small>
                      </div>
                    </div>
                    {sesi?.status === "Menunggu" && (
                      <span className="badge bg-secondary-subtle text-secondary small">
                        Aktif
                      </span>
                    )}
                  </div>
                </label>

                {/* Opsi Berlangsung */}
                <label
                  className={`card p-3 border ${
                    selectedStatusInModal === "Berlangsung"
                      ? "border-success bg-success bg-opacity-10"
                      : "bg-body"
                  }`}
                  style={{ cursor: "pointer" }}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                      <input
                        type="radio"
                        name="statusRadio"
                        className="form-check-input mt-0"
                        checked={selectedStatusInModal === "Berlangsung"}
                        onChange={() => setSelectedStatusInModal("Berlangsung")}
                      />
                      <div>
                        <div className="fw-bold text-dark">
                          <i className="bi bi-record-circle text-success me-1"></i>{" "}
                          Berlangsung
                        </div>
                        <small className="text-secondary">
                          Sesi latihan tembakan sedang aktif berjalan di lapangan.
                        </small>
                      </div>
                    </div>
                    {sesi?.status === "Berlangsung" && (
                      <span className="badge bg-success-subtle text-success small">
                        Aktif
                      </span>
                    )}
                  </div>
                </label>

                {/* Opsi Selesai */}
                <label
                  className={`card p-3 border ${
                    selectedStatusInModal === "Selesai"
                      ? "border-primary bg-primary bg-opacity-10"
                      : "bg-body"
                  }`}
                  style={{ cursor: "pointer" }}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                      <input
                        type="radio"
                        name="statusRadio"
                        className="form-check-input mt-0"
                        checked={selectedStatusInModal === "Selesai"}
                        onChange={() => setSelectedStatusInModal("Selesai")}
                      />
                      <div>
                        <div className="fw-bold text-dark">
                          <i className="bi bi-check-circle text-primary me-1"></i>{" "}
                          Selesai
                        </div>
                        <small className="text-secondary">
                          Seluruh babak dan gelombang tembakan telah rampung.
                        </small>
                      </div>
                    </div>
                    {sesi?.status === "Selesai" && (
                      <span className="badge bg-secondary-subtle text-secondary small">
                        Aktif
                      </span>
                    )}
                  </div>
                </label>

                {/* Opsi Dibatalkan */}
                <label
                  className={`card p-3 border ${
                    selectedStatusInModal === "Dibatalkan"
                      ? "border-danger bg-danger bg-opacity-10"
                      : "bg-body"
                  }`}
                  style={{ cursor: "pointer" }}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                      <input
                        type="radio"
                        name="statusRadio"
                        className="form-check-input mt-0"
                        checked={selectedStatusInModal === "Dibatalkan"}
                        onChange={() => setSelectedStatusInModal("Dibatalkan")}
                      />
                      <div>
                        <div className="fw-bold text-dark">
                          <i className="bi bi-x-circle text-danger me-1"></i>{" "}
                          Dibatalkan
                        </div>
                        <small className="text-secondary">
                          Sesi dibatalkan karena cuaca buruk atau kendala operasional.
                        </small>
                      </div>
                    </div>
                    {sesi?.status === "Dibatalkan" && (
                      <span className="badge bg-danger-subtle text-danger small">
                        Aktif
                      </span>
                    )}
                  </div>
                </label>
              </div>
            </div>
            <div className="modal-footer bg-light">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                data-bs-dismiss="modal"
                disabled={statusUpdating}
              >
                Tutup
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary px-3"
                onClick={() => updateStatusSesi(selectedStatusInModal)}
                disabled={
                  statusUpdating || selectedStatusInModal === sesi?.status
                }
              >
                {statusUpdating ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      role="status"
                    />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2-circle me-1"></i>
                    Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
