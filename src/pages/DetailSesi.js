import * as React from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "../component/Navbar";
import { Sidebar } from "../component/Sidebar";
import { Breadcrumb } from "../component/Breadcrumb";
import { ModalUploadTargetDetect } from "../component/modal/ModalUploadTargetDetect";
import {
  ModalCetakLaporan,
  DokumenLaporanSesi,
} from "../component/modal/ModalCetakLaporan";
import { selectBestShots } from "../services/sitrakDetectService";
import { getBackendUrl } from "../services/apiConfig";

export const DetailSesi = () => {
  const { id: paramId } = useParams();
  const navigate = useNavigate();

  // Jika terdapat ID pada URL, simpan ke localStorage lalu bersihkan URL (tanpa reload)
  React.useEffect(() => {
    if (paramId) {
      localStorage.setItem("active_sesi_id", String(paramId));
      navigate("/detail-sesi", { replace: true });
    }
  }, [paramId, navigate]);

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

  // State modal upload target deteksi (SITRAK-Detect)
  const [showTargetModal, setShowTargetModal] = React.useState(false);
  const [targetModalShooter, setTargetModalShooter] = React.useState(null);
  const [targetModalBabakId, setTargetModalBabakId] = React.useState(null);

  // State modal cetak & pratinjau laporan resmi
  const [showModalCetak, setShowModalCetak] = React.useState(false);

  // State visualizer target per babak
  const [selectedVisualizerBabakId, setSelectedVisualizerBabakId] =
    React.useState("semua");
  const [visualizerViewMode, setVisualizerViewMode] = React.useState("svg"); // "svg" | "foto"

  // Set document title
  React.useEffect(() => {
    if (sesi?.kode_sesi) {
      document.title = `Detail Sesi ${sesi.kode_sesi} - SITRAK-AI`;
    } else {
      document.title = "Detail Sesi Latihan - SITRAK-AI";
    }
  }, [sesi]);

  // Fungsi GET API untuk mengambil data detail sesi
  const getDetailSesi = async () => {
    const currentId = paramId || localStorage.getItem("active_sesi_id");

    // Validasi ID, jika tidak ada atau bukan angka, arahkan ke daftar latihan
    if (!currentId || isNaN(Number(currentId))) {
      navigate("/latihan", { replace: true });
      return;
    }

    setLoading(true);
    try {
      const url = `${getBackendUrl()}/sesi/${currentId}`;
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
              // Ekstrak rincian deteksi tembakan tiap babak jika tersedia
              const rawDeteksi = Array.isArray(p.detail_tembakan)
                ? p.detail_tembakan
                : typeof p.detail_tembakan === "string"
                ? JSON.parse(p.detail_tembakan || "[]")
                : [];

              const babakHits = rawDeteksi.map((d, dIdx) => {
                const rx = parseFloat(d.koordinat_x ?? 50);
                const ry = parseFloat(d.koordinat_y ?? 50);
                const nx = rx > 100 ? (rx / 800) * 100 : rx;
                const ny = ry > 100 ? (ry / 800) * 100 : ry;
                return {
                  id_deteksi_tembakan: d.id_deteksi_tembakan,
                  nomor: d.nomor_tembakan || dIdx + 1,
                  x: Math.max(2, Math.min(98, nx)),
                  y: Math.max(2, Math.min(98, ny)),
                  rawX: rx,
                  rawY: ry,
                  ring: d.ring_zona || "-",
                  poin: parseFloat(d.skor_poin ?? 0),
                  jarak_pusat_mm:
                    d.jarak_dari_pusat_mm !== null &&
                    d.jarak_dari_pusat_mm !== undefined
                      ? parseFloat(d.jarak_dari_pusat_mm)
                      : null,
                  confidence:
                    d.confidence_score !== null &&
                    d.confidence_score !== undefined
                      ? parseFloat(d.confidence_score)
                      : null,
                  nomor_babak: b.nomor_babak,
                  nama_babak: b.nama_babak,
                };
              });

              const bScoreItem = {
                id_personel_babak: p.id_personel_babak,
                id_babak: b.id_babak,
                nomor_babak: b.nomor_babak,
                nama_babak: b.nama_babak,
                skor: parseFloat(p.total_skor || 0),
                akurasi: parseFloat(p.akurasi_persen || 0),
                peluru: b.jumlah_peluru || 0,
                hits: babakHits,
                catatan_analisis: p.catatan_analisis || null,
                grouping_radius_mm:
                  p.grouping_radius_mm !== null &&
                  p.grouping_radius_mm !== undefined
                    ? parseFloat(p.grouping_radius_mm)
                    : null,
                center_offset_x_mm:
                  p.center_offset_x_mm !== null &&
                  p.center_offset_x_mm !== undefined
                    ? parseFloat(p.center_offset_x_mm)
                    : null,
                center_offset_y_mm:
                  p.center_offset_y_mm !== null &&
                  p.center_offset_y_mm !== undefined
                    ? parseFloat(p.center_offset_y_mm)
                    : null,
                status_analisis: p.status_analisis || null,
                kategori_kelulusan: p.kategori_kelulusan || null,
                foto_target: p.foto_target || null,
                url_foto_asli: p.url_foto_asli || null,
                total_peluru_terdeteksi:
                  p.total_peluru_terdeteksi || babakHits.length,
              };
              s.babakScoresMap[b.id_babak] = bScoreItem;
              s.babakScoresMap[`no_${b.nomor_babak}`] = bScoreItem;
              s.babakScoresMap[b.nomor_babak] = bScoreItem;

              if (p.foto_target) {
                s.fotoTarget = p.foto_target;
              }
              if (p.catatan_analisis && !s.catatan_analisis) {
                s.catatan_analisis = p.catatan_analisis;
              }
            });
          });

          const jumlahJalur = rawData.jumlah_jalur || g.lane || 1;
          const penembak = Array.from(shooterMap.values()).map((s, pIdx) => {
            // Alokasi nomor jalur / lane penembak dalam gelombang ini
            const laneNo = pIdx + 1;

            // Petakan nilai untuk tiap babak yang ada pada gelombang ini
            const babakScores = babakList.map((b) => {
              const bEntry =
                s.babakScoresMap[b.id_babak] ||
                s.babakScoresMap[`no_${b.nomor_babak}`] ||
                s.babakScoresMap[b.nomor_babak] || {
                  id_personel_babak: null,
                  skor: 0,
                  akurasi: 0,
                  peluru: b.jumlah_peluru || 0,
                  nama_babak: b.nama_babak,
                  hits: [],
                  catatan_analisis: null,
                  grouping_radius_mm: null,
                  center_offset_x_mm: null,
                  center_offset_y_mm: null,
                  status_analisis: null,
                  foto_target: null,
                  url_foto_asli: null,
                  total_peluru_terdeteksi: 0,
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
                hits: bEntry.hits || [],
                catatan_analisis: bEntry.catatan_analisis || null,
                grouping_radius_mm: bEntry.grouping_radius_mm ?? null,
                center_offset_x_mm: bEntry.center_offset_x_mm ?? null,
                center_offset_y_mm: bEntry.center_offset_y_mm ?? null,
                status_analisis: bEntry.status_analisis || null,
                kategori_kelulusan: bEntry.kategori_kelulusan || null,
                foto_target: bEntry.foto_target || null,
                url_foto_asli: bEntry.url_foto_asli || null,
                total_peluru_terdeteksi:
                  bEntry.total_peluru_terdeteksi ||
                  (bEntry.hits ? bEntry.hits.length : 0),
                aiAnalyzed: Boolean(
                  (bEntry.hits && bEntry.hits.length > 0) ||
                    bEntry.catatan_analisis,
                ),
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

            // Kumpulkan seluruh tembakan dari semua babak
            const allHits = babakScores.flatMap((bs) =>
              (bs.hits || []).map((h) => ({
                ...h,
                nomor_babak: bs.nomor,
                nama_babak: bs.nama,
              })),
            );

            // Ambil data analisis balistik dari babak yang memiliki data foto atau catatan
            const babakWithBallistics =
              babakScores.find(
                (bs) =>
                  bs.grouping_radius_mm !== null ||
                  bs.catatan_analisis ||
                  (bs.hits && bs.hits.length > 0),
              ) || null;

            const ballistics = babakWithBallistics
              ? {
                  groupingRadius: babakWithBallistics.grouping_radius_mm,
                  offsetX: babakWithBallistics.center_offset_x_mm,
                  offsetY: babakWithBallistics.center_offset_y_mm,
                  statusAnalisis: babakWithBallistics.status_analisis,
                  catatan: babakWithBallistics.catatan_analisis,
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
              hits: allHits,
              ballistics: ballistics,
              fotoTarget:
                babakWithBallistics?.foto_target || s.fotoTarget || null,
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

        // Perbarui selectedPenembakTarget jika sudah ada penembak terpilih sebelumnya
        setSelectedPenembakTarget((prev) => {
          if (!prev) return null;
          for (const g of gelombangList) {
            const found = g.penembak.find(
              (p) =>
                String(p.id_personel_penembak) ===
                String(prev.id_personel_penembak),
            );
            if (found) return found;
          }
          return prev;
        });
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
    const currentId =
      paramId || localStorage.getItem("active_sesi_id") || sesi?.id_sesi;
    if (!currentId || !newStatus) return;
    if (sesi && sesi.status === newStatus) return;

    if (newStatus === "Dibatalkan") {
      const confirmCancel = window.confirm(
        "Apakah Anda yakin ingin membatalkan sesi latihan ini?",
      );
      if (!confirmCancel) return;
    }

    setStatusUpdating(true);
    setStatusAlert(null);

    try {
      const url = `${getBackendUrl()}/sesi/${currentId}/status`;
      const response = await axios.patch(
        url,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            "Content-Type": "application/json",
          },
        },
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
        message: `Gagal memperbarui status: ${typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg)
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
  }, [paramId]);

  // Set default selected penembak target saat sesi dimuat
  React.useEffect(() => {
    if (sesi && sesi.gelombang_list && sesi.gelombang_list.length > 0) {
      const currentWave =
        sesi.gelombang_list.find(
          (g) => g.nomor_gelombang === activeGelombang,
        ) || sesi.gelombang_list[0];
      if (currentWave && currentWave.penembak.length > 0) {
        setSelectedPenembakTarget((prev) => {
          if (!prev) return currentWave.penembak[0];
          const found = currentWave.penembak.find(
            (p) =>
              String(p.id_personel_penembak) ===
              String(prev.id_personel_penembak),
          );
          return found || currentWave.penembak[0];
        });
      }
    }
    setActiveBabakTab("semua");
  }, [sesi, activeGelombang]);

  const getFotoUrl = (url) => {
    if (!url || typeof url !== "string") return null;
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("data:")
    ) {
      return url;
    }
    const backendBase = getBackendUrl();
    return `${backendBase}${url.startsWith("/") ? "" : "/"}${url}`;
  };

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
        <span className="col-5 badge bg-success-subtle text-success border border-success px-3 py-2">
          <i className="bi bi-record-circle me-1"></i>Berlangsung
        </span>
      );
    }
    if (s === "selesai") {
      return (
        <span className="col-5 badge bg-secondary-subtle text-secondary border px-3 py-2">
          <i className="bi bi-check-circle me-1"></i>Selesai
        </span>
      );
    }
    if (s === "menunggu") {
      return (
        <span className="col-5 badge bg-warning-subtle text-warning border border-warning px-3 py-2">
          <i className="bi bi-clock me-1"></i>Menunggu
        </span>
      );
    }
    return (
      <span className="col-5 badge bg-danger-subtle text-danger border border-danger px-3 py-2">
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
          <div className="font-poppins w-100">
            <Breadcrumb
              items={[
                {
                  label: "Sesi Latihan",
                  path: "/latihan",
                  icon: "bi bi-bullseye",
                },
                {
                  label: "Memuat Rincian...",
                  active: true,
                  icon: "bi bi-crosshair",
                },
              ]}
              rightContent={
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary py-1 px-2 d-flex align-items-center"
                  onClick={() => navigate("/latihan")}
                >
                  <i className="bi bi-arrow-left me-1"></i> Kembali ke Daftar
                  Latihan
                </button>
              }
            />
            <div className="p-5 text-center">
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

  // Handler untuk membuka modal upload & analisa target SITRAK-Detect
  const handleOpenUploadTargetModal = (shooter = null, babakId = null) => {
    if ((sesi?.status || "").toLowerCase() !== "berlangsung") {
      setStatusAlert({
        type: "warning",
        message:
          "Fitur deteksi target hanya dapat diakses saat sesi latihan berstatus Berlangsung.",
      });
      return;
    }
    setTargetModalShooter(shooter);
    setTargetModalBabakId(babakId);
    setShowTargetModal(true);
  };

  // Handler untuk menerapkan hasil deteksi SITRAK-Detect ke babak personel dan mengirimkan ke sitrak-backend
  const handleApplyDetectResult = async (result, shooterId, babakId) => {
    if (!result || !sesi) return;
    if ((sesi?.status || "").toLowerCase() !== "berlangsung") return;

    // 1. Identifikasi id_personel_babak dan id_babak yang valid
    let foundPersonelBabakId = null;
    let resolvedBabakId = babakId;
    let babakPeluruQuota = 10;

    if (sesi.babak && Array.isArray(sesi.babak)) {
      const bObj = sesi.babak.find(
        (b) =>
          String(b.id_babak) === String(babakId) ||
          String(b.nomor_babak) === String(babakId)
      );
      if (bObj) {
        resolvedBabakId = bObj.id_babak;
        if (bObj.jumlah_peluru) babakPeluruQuota = bObj.jumlah_peluru;
      }
    }

    if (sesi.gelombang_list && Array.isArray(sesi.gelombang_list)) {
      for (const gel of sesi.gelombang_list) {
        for (const p of gel.penembak || []) {
          if (String(p.id_personel_penembak) === String(shooterId)) {
            for (const bs of p.babak_scores || []) {
              const isMatch = babakId
                ? String(bs.id_babak) === String(babakId) ||
                  String(bs.nomor) === String(babakId)
                : true;
              if (isMatch) {
                if (bs.id_personel_babak) foundPersonelBabakId = bs.id_personel_babak;
                if (!resolvedBabakId) resolvedBabakId = bs.id_babak;
                if (bs.peluru) babakPeluruQuota = bs.peluru;
                break;
              }
            }
          }
        }
      }
    }

    const currentSesiId =
      sesi.id_sesi || paramId || localStorage.getItem("active_sesi_id");

    // Seleksi tembakan terbaik jika jumlah tembakan melebihi kuota butir peluru babak
    const rawShots = result.shots || [];
    const selection = selectBestShots(rawShots, babakPeluruQuota);

    const finalShots = selection.bestShots;
    const totalScore = selection.totalScore;
    const accuracy = selection.accuracyPercent;
    const isQuotaExceeded = selection.isQuotaExceeded;
    const excessCount = selection.excessCount;

    let kategori = "Cukup";
    if (accuracy >= 90) kategori = "Istimewa";
    else if (accuracy >= 80) kategori = "Mahir";
    else if (accuracy >= 70) kategori = "Cukup";
    else if (totalScore > 0) kategori = "Perlu Pembinaan";

    // Catatan analisis dilengkapi penanda koreksi kuota jika terdeteksi melebihi batas
    const baseCatatan = [result.rekomendasi_utama, result.saran]
      .filter(Boolean)
      .join(" - ");
    const catatanAnalisis = isQuotaExceeded
      ? `[Peringatan Kuota Peluru: Terdeteksi ${rawShots.length} butir tembakan (${excessCount} butir melebihi alokasi ${babakPeluruQuota} peluru). Diambil ${babakPeluruQuota} tembakan terbaik dengan nilai tertinggi (${totalScore} Poin)]. ${baseCatatan}`
      : baseCatatan;

    // Format rincian tiap lubang tembakan terbaik untuk disimpan ke backend
    const shotsPayload = finalShots.map((s, idx) => ({
      nomor_tembakan: s.nomor || idx + 1,
      koordinat_x: s.x,
      koordinat_y: s.y,
      jarak_dari_pusat_mm:
        s.distance_from_center_mm !== undefined
          ? s.distance_from_center_mm
          : s.distance_mm !== undefined
          ? s.distance_mm
          : null,
      skor_poin:
        s.poin !== undefined
          ? s.poin
          : s.ring !== undefined
          ? parseFloat(s.ring)
          : 0,
      ring_zona: String(s.ring !== undefined ? s.ring : ""),
      confidence_score:
        s.confidence !== undefined ? s.confidence : 1.0,
    }));

    const backendPayload = {
      id_sesi: currentSesiId,
      id_personel_penembak: shooterId,
      id_babak: resolvedBabakId,
      id_personel_babak: foundPersonelBabakId,
      total_skor: totalScore,
      akurasi_persen: accuracy,
      url_foto_asli: result.foto_target_url || "",
      url_foto_teranotasi:
        result.annotated_image_url || result.foto_target_url || "",
      total_peluru_terdeteksi: finalShots.length,
      grouping_radius_mm: result.grouping_diameter_mm
        ? Number((result.grouping_diameter_mm / 2).toFixed(2))
        : null,
      center_offset_x_mm:
        result.center_of_mass?.x !== undefined
          ? Number(result.center_of_mass.x.toFixed(2))
          : null,
      center_offset_y_mm:
        result.center_of_mass?.y !== undefined
          ? Number(result.center_of_mass.y.toFixed(2))
          : null,
      kategori_kelulusan: kategori,
      status_analisis: "Selesai",
      catatan_analisis: catatanAnalisis,
      shots: shotsPayload,
    };

    // 2. Kirim data ke SITRAK-Backend melalui API POST /deteksi
    try {
      const backendUrl = `${getBackendUrl()}/deteksi`;
      const saveResponse = await axios.post(backendUrl, backendPayload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
      });
      console.log(
        "Berhasil menyimpan data tembakan ke SITRAK-Backend:",
        saveResponse.data
      );
    } catch (backendError) {
      console.error(
        "Peringatan: Gagal menyimpan data tembakan ke SITRAK-Backend:",
        backendError
      );
      // Tampilkan notifikasi peringatan jika backend offline, namun pembaruan state lokal tetap berjalan
      setStatusAlert({
        type: "warning",
        message: `Hasil diterapkan ke tabel lokal, namun terjadi kendala penyimpanan ke SITRAK-Backend: ${
          backendError.response?.data?.message ||
          backendError.response?.data ||
          backendError.message
        }`,
      });
    }

    // 3. Perbarui state lokal sesi secara instan
    setSesi((prevSesi) => {
      if (!prevSesi || !prevSesi.gelombang_list) return prevSesi;

      const newGelombangList = prevSesi.gelombang_list.map((gel) => {
        const newPenembak = (gel.penembak || []).map((p) => {
          if (String(p.id_personel_penembak) !== String(shooterId)) return p;

          // Perbarui skor babak terkait
          const updatedBabakScores = (p.babak_scores || []).map((bs) => {
            const matchBabak = babakId
              ? String(bs.id_babak) === String(babakId) ||
                String(bs.nomor) === String(babakId)
              : true;

            if (matchBabak) {
              const newSkor = totalScore;
              const maxScore = (bs.peluru || 10) * 10;
              const newAkurasi =
                maxScore > 0
                  ? Number(((newSkor / maxScore) * 100).toFixed(1))
                  : accuracy;
              const bHits = (result.shots || []).map((s, idx) => {
                const rx = parseFloat(s.x ?? 50);
                const ry = parseFloat(s.y ?? 50);
                const nx = rx > 100 ? (rx / 800) * 100 : rx;
                const ny = ry > 100 ? (ry / 800) * 100 : ry;
                return {
                  nomor: s.nomor || idx + 1,
                  x: Math.max(2, Math.min(98, nx)),
                  y: Math.max(2, Math.min(98, ny)),
                  rawX: rx,
                  rawY: ry,
                  ring: s.ring !== undefined ? s.ring : "-",
                  poin: parseFloat(s.poin ?? 0),
                  jarak_pusat_mm:
                    s.distance_from_center_mm !== undefined
                      ? s.distance_from_center_mm
                      : null,
                  nomor_babak: bs.nomor,
                  nama_babak: bs.nama,
                };
              });
              return {
                ...bs,
                skor: newSkor,
                akurasi: newAkurasi,
                hits: bHits,
                foto_target:
                  result.annotated_image_url || result.foto_target_url,
                fotoTarget:
                  result.annotated_image_url || result.foto_target_url,
                url_foto_asli: result.foto_target_url || null,
                catatan_analisis: catatanAnalisis,
                grouping_radius_mm: result.grouping_diameter_mm
                  ? Number((result.grouping_diameter_mm / 2).toFixed(1))
                  : null,
                center_offset_x_mm:
                  result.center_of_mass?.x !== undefined
                    ? Number(result.center_of_mass.x.toFixed(2))
                    : null,
                center_offset_y_mm:
                  result.center_of_mass?.y !== undefined
                    ? Number(result.center_of_mass.y.toFixed(2))
                    : null,
                status_analisis: "Teranalisis SITRAK-Detect",
                aiAnalyzed: true,
              };
            }
            return bs;
          });

          // Hitung ulang total skor dan akurasi akhir penembak
          const newTotalSkor = updatedBabakScores.reduce(
            (acc, bs) => acc + (bs.skor || 0),
            0,
          );
          const totalPeluru = updatedBabakScores.reduce(
            (acc, bs) => acc + (bs.peluru || 10),
            0,
          );
          const maxTotal = totalPeluru * 10;
          const newAkurasiAkhir =
            maxTotal > 0
              ? Number(((newTotalSkor / maxTotal) * 100).toFixed(1))
              : 0;

          let newKategori = "Menunggu";
          if (newAkurasiAkhir >= 90) newKategori = "Istimewa";
          else if (newAkurasiAkhir >= 80) newKategori = "Mahir";
          else if (newAkurasiAkhir >= 70) newKategori = "Cukup";
          else if (newTotalSkor > 0) newKategori = "Perlu Pembinaan";

          const updatedHits = (result.shots || []).map((s) => ({
            nomor: s.nomor,
            x: s.x,
            y: s.y,
            ring: s.ring,
            poin: s.poin,
            is_bullseye: s.is_bullseye,
          }));

          const updatedBallistics = {
            groupingRadius: result.grouping_diameter_mm
              ? Number((result.grouping_diameter_mm / 2).toFixed(1))
              : 15,
            groupingDiameter: result.grouping_diameter_mm,
            directionalBias: result.directional_bias,
            statusAnalisis: "Teranalisis SITRAK-Detect",
            saran: result.saran,
            rekomendasiUtama: result.rekomendasi_utama,
            analyzedAt: result.analyzed_at,
          };

          const updatedPersonel = {
            ...p,
            total_skor: newTotalSkor,
            total_max: maxTotal,
            akurasi_akhir: newAkurasiAkhir,
            kategori: newKategori,
            babak_scores: updatedBabakScores,
            hits: updatedHits,
            fotoTarget:
              result.annotated_image_url ||
              result.foto_target_url ||
              p.fotoTarget,
            ballistics: updatedBallistics,
          };

          // Jika penembak ini sedang dilihat di panel target visualizer, update juga
          if (
            selectedPenembakTarget &&
            String(selectedPenembakTarget.id_personel_penembak) ===
            String(p.id_personel_penembak)
          ) {
            setSelectedPenembakTarget(updatedPersonel);
          }

          return updatedPersonel;
        });

        return {
          ...gel,
          penembak: newPenembak,
        };
      });

      return {
        ...prevSesi,
        gelombang_list: newGelombangList,
      };
    });

    setStatusAlert({
      type: isQuotaExceeded ? "warning" : "success",
      message: isQuotaExceeded
        ? `Tembakan terdeteksi (${rawShots.length} butir) melebihi kuota babak (${babakPeluruQuota} butir). Sistem berhasil memilih & menyimpan ${babakPeluruQuota} tembakan terbaik ke SITRAK-Backend! Total Skor: ${totalScore} Poin (${accuracy}% Akurasi).`
        : `Data tembakan deteksi berhasil diterapkan & disimpan ke SITRAK-Backend! Total Skor: ${totalScore} Poin (${shotsPayload.length} perkenaan peluru tercatat).`,
    });

    if (resolvedBabakId) {
      setSelectedVisualizerBabakId(resolvedBabakId);
    }
    // Segarkan data dari database backend agar konsisten
    await getDetailSesi();
  };

  return (
    <div>
      <div className="no-print">
        <Navbar />
        <div className="d-flex min-vh-100">
          <Sidebar />
          <div className="font-poppins w-100 overflow-x-hidden">
          {/* Breadcrumb Path Bar Terstandarisasi */}
          <Breadcrumb
            items={[
              {
                label: "Sesi Latihan",
                path: "/latihan",
                icon: "bi bi-bullseye",
              },
              {
                label: sesi.kode_sesi || "Detail Sesi",
                active: true,
                icon: "bi bi-crosshair",
              },
            ]}
            rightContent={
              <div className="d-flex align-items-center gap-2">
                {(sesi?.status || "").toLowerCase() === "berlangsung" && (
                  <button
                    type="button"
                    className="btn btn-sm btn-warning fw-bold text-dark py-1 px-2 d-flex align-items-center shadow-sm"
                    onClick={() => {
                      const id =
                        sesi.id_sesi || paramId || localStorage.getItem("active_sesi_id");
                      if (id) localStorage.setItem("active_sesi_id", String(id));
                      navigate("/live-scoring");
                    }}
                    title="Buka Mode Live Scoring Layar Penuh untuk Proyektor / Monitor"
                  >
                    <i className="bi bi-display me-1 text-danger"></i> Live Scoring
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary py-1 px-2 d-flex align-items-center"
                  onClick={() => navigate("/latihan")}
                >
                  <i className="bi bi-arrow-left me-1"></i> Kembali ke Daftar
                  Latihan
                </button>
              </div>
            }
          />

          <div className="p-2 p-sm-3 p-md-4">
            {/* Alert Notifikasi Perubahan Status Sesi */}
            {statusAlert && (
              <div
                className={`alert alert-${statusAlert.type} alert-dismissible fade show d-flex align-items-center mb-3 shadow-sm`}
                role="alert"
              >
                <i
                  className={`bi ${statusAlert.type === "success"
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
              <div className="d-flex flex-column gap-1 col-12 col-md-8">
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
              <div className="d-flex align-items-center flex-wrap gap-2 col justify-content-end">
                {renderStatusBadge(sesi.status)}

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
                        className={`dropdown-item d-flex align-items-center justify-content-between py-2 ${sesi.status === "Menunggu" ? "active" : ""
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
                        className={`dropdown-item d-flex align-items-center justify-content-between py-2 ${sesi.status === "Berlangsung" ? "active" : ""
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
                        className={`dropdown-item d-flex align-items-center justify-content-between py-2 ${sesi.status === "Selesai" ? "active" : ""
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
                        className={`dropdown-item text-danger d-flex align-items-center justify-content-between py-2 ${sesi.status === "Dibatalkan" ? "active" : ""
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

                {(sesi?.status || "").toLowerCase() === "berlangsung" && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm"
                    onClick={() => handleOpenUploadTargetModal()}
                    title="Unggah Foto Target & Deteksi Nilai dengan SITRAK-Detect"
                  >
                    <i className="bi bi-camera-fill me-1"></i>
                    <span>Upload & Deteksi Target</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 shadow-sm"
                  onClick={() => setShowModalCetak(true)}
                  title="Pratinjau & Cetak Laporan Resmi Sesi Latihan"
                >
                  <i className="bi bi-printer me-1"></i>
                  <span>Cetak Laporan</span>
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
                        className={`btn ${activeGelombang === g.nomor_gelombang
                          ? "btn-primary"
                          : "btn-outline-secondary"
                          }`}
                        onClick={() => setActiveGelombang(g.nomor_gelombang)}
                      >
                        {g.nomor_gelombang}
                        <span
                          className={`badge ms-1 ${g.status === "Berlangsung"
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
                      • {currentWaveData?.penembak?.length || 0} Penembak
                      Terdaftar
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-1 flex-wrap">
                    <span className="small text-muted me-1">
                      Tampilan Babak:
                    </span>
                    <button
                      type="button"
                      className={`btn btn-sm py-1 px-2 ${activeBabakTab === "semua"
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
                        className={`btn btn-sm py-1 px-2 ${String(activeBabakTab) === String(b.nomor_babak)
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
                                    <div className="d-flex align-items-center justify-content-between">
                                      <div className="fw-semibold">
                                        {skor} / {maxSkor}
                                      </div>
                                    </div>
                                    <div className="d-flex align-items-center gap-1 mt-1">
                                      <span
                                        className={`badge ${akurasi >= 80
                                          ? "bg-success-subtle text-success border border-success"
                                          : akurasi >= 60
                                            ? "bg-warning-subtle text-warning border border-warning"
                                            : "bg-secondary-subtle text-secondary border"
                                          } small`}
                                      >
                                        Akurasi: {akurasi}%
                                      </span>
                                      
                                    </div>
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
                                <div className="d-flex align-items-center justify-content-end gap-1">
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${isSelected
                                      ? "btn-primary"
                                      : "btn-outline-primary"
                                      }`}
                                    onClick={() => setSelectedPenembakTarget(p)}
                                    title="Tinjau Peta Sasaran"
                                  >
                                    <i className="bi bi-bullseye me-1"></i>
                                    {isSelected
                                      ? "Sedang Dilihat"
                                      : "Cek Target"}
                                  </button>
                                  {(sesi?.status || "").toLowerCase() === "berlangsung" && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 shadow-sm"
                                      onClick={() =>
                                        handleOpenUploadTargetModal(
                                          p,
                                          activeBabakTab !== "semua"
                                            ? activeBabakTab
                                            : null,
                                        )
                                      }
                                      title={`Unggah Foto Target & Deteksi Nilai untuk ${p.nama}`}
                                    >
                                      <i className="bi bi-camera me-1"></i>
                                      Deteksi
                                    </button>
                                  )}
                                </div>
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
            {selectedPenembakTarget &&
              (() => {
                const activeVisualizerBabak =
                  selectedVisualizerBabakId === "semua"
                    ? null
                    : (selectedPenembakTarget.babak_scores || []).find(
                        (b) =>
                          String(b.id_babak) ===
                            String(selectedVisualizerBabakId) ||
                          String(b.nomor) === String(selectedVisualizerBabakId),
                      );

                const activeHits = activeVisualizerBabak
                  ? activeVisualizerBabak.hits || []
                  : selectedPenembakTarget.hits || [];

                const activeCatatan = activeVisualizerBabak
                  ? activeVisualizerBabak.catatan_analisis
                  : selectedPenembakTarget.ballistics?.catatan ||
                    (selectedPenembakTarget.babak_scores || [])
                      .filter((bs) => bs.catatan_analisis)
                      .map(
                        (bs) =>
                          `[Babak ${bs.nomor} - ${bs.nama}]:\n${bs.catatan_analisis}`,
                      )
                      .join("\n\n") ||
                    null;

                const rawActiveFoto = activeVisualizerBabak
                  ? activeVisualizerBabak.foto_target ||
                    activeVisualizerBabak.url_foto_asli
                  : (selectedPenembakTarget.babak_scores || []).find(
                      (bs) => bs.foto_target || bs.url_foto_asli,
                    )?.foto_target || selectedPenembakTarget.fotoTarget;

                const activeFoto = getFotoUrl(rawActiveFoto);

                const activeGroupingRadius = activeVisualizerBabak
                  ? activeVisualizerBabak.grouping_radius_mm
                  : selectedPenembakTarget.ballistics?.groupingRadius;

                const activeOffsetX = activeVisualizerBabak
                  ? activeVisualizerBabak.center_offset_x_mm
                  : selectedPenembakTarget.ballistics?.offsetX;

                const activeOffsetY = activeVisualizerBabak
                  ? activeVisualizerBabak.center_offset_y_mm
                  : selectedPenembakTarget.ballistics?.offsetY;

                const activeStatus = activeVisualizerBabak
                  ? activeVisualizerBabak.status_analisis
                  : selectedPenembakTarget.ballistics?.statusAnalisis;

                const activeSkor = activeVisualizerBabak
                  ? activeVisualizerBabak.skor
                  : selectedPenembakTarget.total_skor;

                const activeMaxSkor = activeVisualizerBabak
                  ? activeVisualizerBabak.max_skor
                  : selectedPenembakTarget.total_max;

                const activeAkurasi = activeVisualizerBabak
                  ? activeVisualizerBabak.akurasi
                  : selectedPenembakTarget.akurasi_akhir;

                const activeKategori = activeVisualizerBabak
                  ? activeVisualizerBabak.kategori_kelulusan ||
                    (activeAkurasi >= 90
                      ? "Istimewa"
                      : activeAkurasi >= 80
                      ? "Mahir"
                      : activeAkurasi >= 70
                      ? "Cukup"
                      : activeSkor > 0
                      ? "Perlu Pembinaan"
                      : "Menunggu")
                  : selectedPenembakTarget.kategori;

                return (
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
                          {activeVisualizerBabak ? (
                            <span className="text-primary fw-semibold ms-1">
                              • Babak {activeVisualizerBabak.nomor} (
                              {activeVisualizerBabak.nama})
                            </span>
                          ) : (
                            <span className="text-secondary ms-1">
                              • Seluruh Babak
                            </span>
                          )}
                        </small>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        {(sesi?.status || "").toLowerCase() === "berlangsung" && (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm"
                            onClick={() =>
                              handleOpenUploadTargetModal(
                                selectedPenembakTarget,
                                activeVisualizerBabak
                                  ? activeVisualizerBabak.id_babak ||
                                      activeVisualizerBabak.nomor
                                  : selectedPenembakTarget.babak_scores?.[0]
                                      ?.id_babak ||
                                      selectedPenembakTarget.babak_scores?.[0]
                                        ?.nomor ||
                                      1,
                              )
                            }
                            title="Upload foto target untuk dianalisis oleh SITRAK-Detect"
                          >
                            <i className="bi bi-camera me-1"></i> Upload Foto
                            Target (Detect)
                          </button>
                        )}
                        <span className="badge bg-primary-subtle text-primary border border-primary px-3 py-2">
                          <i className="bi bi-cpu me-1"></i> Mode Deteksi
                          SITRAK-Detect
                        </span>
                      </div>
                    </div>

                    <div className="card-body p-3">
                      <div className="row g-4 align-items-start">
                        {/* Target Visual Display (SVG / Annotated Photo) */}
                        <div className="col-12 col-md-5 col-xl-4 text-center">
                          <div
                            className="bg-dark rounded-3 p-3 d-inline-block shadow w-100"
                            style={{ maxWidth: "340px" }}
                          >
                            {visualizerViewMode === "foto" && activeFoto ? (
                              <div className="position-relative text-center">
                                <img
                                  src={activeFoto}
                                  alt="Hasil Deteksi Target"
                                  className="img-fluid rounded border border-secondary shadow-sm"
                                  style={{
                                    maxHeight: "300px",
                                    width: "100%",
                                    objectFit: "contain",
                                    background: "#111",
                                  }}
                                />
                                <div className="badge bg-dark bg-opacity-75 text-white position-absolute bottom-0 start-50 translate-middle-x mb-2 px-2 py-1 small">
                                  <i className="bi bi-camera-fill me-1 text-info"></i>
                                  Foto Kamera SITRAK-Detect
                                </div>
                              </div>
                            ) : (
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

                                {/* Bullet Hit Markers */}
                                {!activeHits || activeHits.length === 0 ? (
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
                                  activeHits.map((h, i) => {
                                    const isBull =
                                      String(h.ring)
                                        .toLowerCase()
                                        .includes("bull") ||
                                      h.ring === "10" ||
                                      h.poin === 10;
                                    return (
                                      <g key={i}>
                                        <circle
                                          cx={h.x}
                                          cy={h.y}
                                          r="2.4"
                                          fill={isBull ? "#ff3838" : "#ffc107"}
                                          stroke="#212529"
                                          strokeWidth="0.6"
                                        />
                                        <circle
                                          cx={h.x}
                                          cy={h.y}
                                          r="1.0"
                                          fill={isBull ? "#ffffff" : "#dc3545"}
                                        />
                                        <text
                                          x={h.x}
                                          y={h.y + 0.9}
                                          fill={isBull ? "#ffffff" : "#000000"}
                                          fontSize="2.1"
                                          fontWeight="bold"
                                          textAnchor="middle"
                                          pointerEvents="none"
                                        >
                                          {h.nomor || i + 1}
                                        </text>
                                      </g>
                                    );
                                  })
                                )}
                              </svg>
                            )}

                            <div className="text-white-50 small mt-2">
                              Target: {sesi.nama_tipe_target || "Lesan Standar"}{" "}
                              • {activeHits.length} Perkenaan Terdeteksi
                            </div>

                            {/* View Switcher: Target SVG vs Foto Deteksi */}
                            <div
                              className="btn-group btn-group-sm w-100 mt-2 shadow-sm"
                              role="group"
                            >
                              <button
                                type="button"
                                className={`btn ${
                                  visualizerViewMode === "svg"
                                    ? "btn-light fw-bold text-dark border-0"
                                    : "btn-outline-secondary text-white-50"
                                }`}
                                onClick={() => setVisualizerViewMode("svg")}
                              >
                                <i className="bi bi-bullseye me-1 text-danger"></i>{" "}
                                Lesan Vektor
                              </button>
                              <button
                                type="button"
                                className={`btn ${
                                  visualizerViewMode === "foto"
                                    ? "btn-light fw-bold text-dark border-0"
                                    : "btn-outline-secondary text-white-50"
                                }`}
                                onClick={() => setVisualizerViewMode("foto")}
                                disabled={!activeFoto}
                                title={
                                  activeFoto
                                    ? "Lihat foto deteksi kamera"
                                    : "Foto target belum tersedia untuk babak ini"
                                }
                              >
                                <i className="bi bi-camera me-1 text-primary"></i>{" "}
                                Foto Deteksi {activeFoto ? "" : "(N/A)"}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Analisis Balistik, Catatan Analisis, Selector Babak, & Statistik */}
                        <div className="col-12 col-md-7 col-xl-8">
                          {/* 3 Metric Summary Cards */}
                          <div className="row g-3 mb-3">
                            <div className="col-6 col-sm-4">
                              <div className="p-3 bg-body rounded border shadow-sm">
                                <small className="text-muted d-block">
                                  {activeVisualizerBabak
                                    ? `Skor Babak ${activeVisualizerBabak.nomor}`
                                    : "Total Poin"}
                                </small>
                                <span className="fs-4 fw-bold text-primary">
                                  {activeSkor}
                                </span>
                                <span className="small text-muted">
                                  {" "}
                                  / {activeMaxSkor}
                                </span>
                              </div>
                            </div>
                            <div className="col-6 col-sm-4">
                              <div className="p-3 bg-body rounded border shadow-sm">
                                <small className="text-muted d-block">
                                  Akurasi Tembak
                                </small>
                                <span className="fs-4 fw-bold text-success">
                                  {activeAkurasi}%
                                </span>
                              </div>
                            </div>
                            <div className="col-12 col-sm-4">
                              <div className="p-3 bg-body rounded border shadow-sm">
                                <small className="text-muted d-block">
                                  Hasil Kelulusan
                                </small>
                                <div className="mt-1">
                                  {renderKategoriBadge(activeKategori)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Interactive Babak Selection Pills (Tampilkan per babak) */}
                          <div className="mb-3">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <span className="small fw-semibold text-secondary text-uppercase tracking-wider">
                                <i className="bi bi-layers me-1 text-primary"></i>
                                Pilih Babak Tembakan:
                              </span>
                              {activeVisualizerBabak && (
                                <span className="badge bg-secondary-subtle text-secondary small">
                                  Alokasi:{" "}
                                  {activeVisualizerBabak.peluru || 10} Butir
                                </span>
                              )}
                            </div>
                            <div className="d-flex flex-wrap gap-2">
                              <button
                                type="button"
                                className={`btn btn-sm d-flex align-items-center gap-1 ${
                                  selectedVisualizerBabakId === "semua"
                                    ? "btn-primary shadow-sm fw-bold"
                                    : "btn-outline-secondary bg-body"
                                }`}
                                onClick={() =>
                                  setSelectedVisualizerBabakId("semua")
                                }
                              >
                                <i className="bi bi-grid-fill me-1"></i>
                                Semua Babak
                                <span
                                  className={`badge ms-1 ${
                                    selectedVisualizerBabakId === "semua"
                                      ? "bg-white text-primary"
                                      : "bg-secondary text-white"
                                  }`}
                                >
                                  {selectedPenembakTarget.hits?.length || 0} Hit
                                </span>
                              </button>

                              {(
                                selectedPenembakTarget.babak_scores || []
                              ).map((bs) => {
                                const isSelected =
                                  String(selectedVisualizerBabakId) ===
                                  String(bs.id_babak || bs.nomor);
                                const hitCount = bs.hits?.length || 0;
                                const hasAnalysis = Boolean(
                                  bs.catatan_analisis || hitCount > 0,
                                );

                                return (
                                  <button
                                    key={bs.id_babak || bs.nomor}
                                    type="button"
                                    className={`btn btn-sm d-flex align-items-center gap-1 ${
                                      isSelected
                                        ? "btn-primary shadow-sm fw-bold"
                                        : "btn-outline-secondary bg-body"
                                    }`}
                                    onClick={() =>
                                      setSelectedVisualizerBabakId(
                                        bs.id_babak || bs.nomor,
                                      )
                                    }
                                  >
                                    <span>
                                      Babak {bs.nomor} ({bs.nama})
                                    </span>
                                    <span
                                      className={`badge ms-1 ${
                                        isSelected
                                          ? "bg-white text-primary"
                                          : hitCount > 0
                                          ? "bg-success text-white"
                                          : "bg-secondary-subtle text-secondary border"
                                      }`}
                                    >
                                      {hitCount > 0
                                        ? `${hitCount} Hit`
                                        : `${bs.skor} Poin`}
                                    </span>
                                    {hasAnalysis && (
                                      <i
                                        className={`bi bi-check-circle-fill ms-1 ${
                                          isSelected
                                            ? "text-white"
                                            : "text-success"
                                        }`}
                                        title="Data deteksi tersimpan"
                                      ></i>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Catatan Analisis AI & Pelatih (SITRAK-Detect) */}
                          <div className="card border-primary border-opacity-25 shadow-sm mb-3 bg-body">
                            <div className="card-header bg-primary bg-opacity-10 border-0 py-2 px-3 d-flex align-items-center justify-content-between">
                              <div className="fw-bold text-primary d-flex align-items-center gap-2">
                                <i className="bi bi-chat-left-quote-fill"></i>
                                Catatan Analisis{" "}
                                {activeVisualizerBabak
                                  ? `(Babak ${activeVisualizerBabak.nomor} - ${activeVisualizerBabak.nama})`
                                  : "(Seluruh Babak)"}
                              </div>
                              {activeStatus && (
                                <span className="badge bg-primary text-white">
                                  <i className="bi bi-cpu me-1"></i>
                                  {activeStatus}
                                </span>
                              )}
                            </div>
                            <div className="card-body p-3">
                              {activeCatatan ? (
                                <div className="p-3 bg-light rounded border border-primary-subtle text-dark">
                                  {activeCatatan.includes("Peringatan Kuota Peluru") && (
                                    <div className="alert alert-warning py-2 px-3 small d-flex align-items-center gap-2 mb-2 border border-warning shadow-sm">
                                      <i className="bi bi-exclamation-triangle-fill text-warning fs-5"></i>
                                      <div>
                                        <span className="fw-bold">
                                          Koreksi Kuota Peluru Diterapkan:
                                        </span>{" "}
                                        Deteksi mendeteksi tembakan melebihi alokasi babak ini. Sistem telah menandai dan menyimpan <strong>tembakan terbaik</strong> dengan poin tertinggi.
                                      </div>
                                    </div>
                                  )}
                                  <div className="fw-semibold text-primary mb-1 small d-flex align-items-center gap-1">
                                    <i className="bi bi-lightbulb-fill text-warning"></i>
                                    Rekomendasi & Catatan Analisis Tembakan:
                                  </div>
                                  <p
                                    className="mb-0 fw-medium"
                                    style={{
                                      whiteSpace: "pre-wrap",
                                      lineHeight: 1.6,
                                    }}
                                  >
                                    {activeCatatan}
                                  </p>
                                </div>
                              ) : (
                                <div className="p-3 bg-light rounded border text-muted small d-flex align-items-center gap-2">
                                  <i className="bi bi-info-circle text-primary fs-5"></i>
                                  <div>
                                    <span>
                                      Belum ada catatan analisis tembakan untuk
                                      babak ini. Silakan unggah foto target pada
                                      babak ini melalui tombol{" "}
                                      <strong>"Upload Foto Target"</strong> di
                                      atas untuk menghasilkan analisis otomatis
                                      dari SITRAK-Detect.
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Evaluasi Konsistensi, Sebaran (Grouping) & Metrik Balistik */}
                          <div className="card border p-3 bg-body mb-3 shadow-sm">
                            <h6 className="fw-bold mb-2 d-flex align-items-center justify-content-between">
                              <span>
                                <i className="bi bi-graph-up me-2 text-primary"></i>
                                Evaluasi Konsistensi & Sebaran (Grouping)
                              </span>
                              {activeHits.length > 0 && (
                                <span className="badge bg-success-subtle text-success border border-success">
                                  {activeHits.length} Butir Perkenaan Terdeteksi
                                </span>
                              )}
                            </h6>
                            <div className="d-flex flex-wrap gap-2 pt-1">
                              {activeOffsetX !== null &&
                                activeOffsetX !== undefined && (
                                  <span className="badge bg-secondary-subtle text-secondary border p-2">
                                    <i className="bi bi-arrows-expand-vertical me-1"></i>
                                    Mean Offset X: {activeOffsetX} mm
                                  </span>
                                )}
                              {activeOffsetY !== null &&
                                activeOffsetY !== undefined && (
                                  <span className="badge bg-secondary-subtle text-secondary border p-2">
                                    <i className="bi bi-arrows-expand me-1"></i>
                                    Mean Offset Y: {activeOffsetY} mm
                                  </span>
                                )}
                              {activeGroupingRadius !== null &&
                                activeGroupingRadius !== undefined && (
                                  <span className="badge bg-success-subtle text-success border p-2">
                                    <i className="bi bi-bullseye me-1"></i>
                                    Radius Sebaran: ±{activeGroupingRadius} mm
                                  </span>
                                )}
                              {activeHits.length > 0 && (
                                <span className="badge bg-info-subtle text-info-emphasis border p-2">
                                  <i className="bi bi-check-all me-1"></i>
                                  Total Skor Terdeteksi:{" "}
                                  {activeHits.reduce(
                                    (acc, h) => acc + (h.poin || 0),
                                    0,
                                  )}{" "}
                                  Poin
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Tabel Rincian Tiap Butir Tembakan (Shot-by-Shot Table) */}
                          {activeHits && activeHits.length > 0 && (
                            <div className="card border shadow-sm bg-body">
                              <div className="card-header bg-transparent border-bottom py-2 px-3 d-flex align-items-center justify-content-between">
                                <h6 className="fw-bold mb-0 small text-uppercase tracking-wider">
                                  <i className="bi bi-list-ol me-2 text-primary"></i>
                                  Daftar Perkenaan Tiap Butir Peluru{" "}
                                  {activeVisualizerBabak
                                    ? `(Babak ${activeVisualizerBabak.nomor})`
                                    : ""}
                                </h6>
                                <span className="badge bg-secondary-subtle text-secondary small">
                                  {activeHits.length} Butir
                                </span>
                              </div>
                              <div
                                className="table-responsive"
                                style={{ maxHeight: "220px" }}
                              >
                                <table
                                  className="table table-sm table-hover mb-0 text-center align-middle font-monospace"
                                  style={{ fontSize: "0.82rem" }}
                                >
                                  <thead className="table-light sticky-top">
                                    <tr>
                                      <th>No</th>
                                      {selectedVisualizerBabakId ===
                                        "semua" && <th>Babak</th>}
                                      <th>Poin</th>
                                      <th>Ring / Zona</th>
                                      <th>Jarak Pusat</th>
                                      <th>Koordinat (X, Y)</th>
                                      <th>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activeHits.map((h, hIdx) => {
                                      const isBullseye =
                                        String(h.ring)
                                          .toLowerCase()
                                          .includes("bull") ||
                                        h.ring === "10" ||
                                        h.poin === 10;
                                      return (
                                        <tr
                                          key={
                                            h.id_deteksi_tembakan ||
                                            `${h.nomor_babak || ""}-${hIdx}`
                                          }
                                        >
                                          <td>
                                            <span className="badge bg-dark rounded-circle px-2 py-1">
                                              {h.nomor || hIdx + 1}
                                            </span>
                                          </td>
                                          {selectedVisualizerBabakId ===
                                            "semua" && (
                                            <td>
                                              Babak {h.nomor_babak || "-"}
                                            </td>
                                          )}
                                          <td className="fw-bold text-primary">
                                            {h.poin}
                                          </td>
                                          <td>
                                            <span
                                              className={`badge ${
                                                isBullseye
                                                  ? "bg-danger text-white"
                                                  : "bg-secondary-subtle text-dark border"
                                              }`}
                                            >
                                              Ring {h.ring}
                                            </span>
                                          </td>
                                          <td className="text-secondary">
                                            {h.jarak_pusat_mm !== null &&
                                            h.jarak_pusat_mm !== undefined
                                              ? `${Number(
                                                  h.jarak_pusat_mm,
                                                ).toFixed(1)} mm`
                                              : "-"}
                                          </td>
                                          <td className="text-muted small">
                                            {h.rawX !== undefined
                                              ? Number(h.rawX).toFixed(1)
                                              : Number(h.x).toFixed(1)}
                                            ,{" "}
                                            {h.rawY !== undefined
                                              ? Number(h.rawY).toFixed(1)
                                              : Number(h.y).toFixed(1)}
                                          </td>
                                          <td>
                                            {isBullseye ? (
                                              <span className="badge bg-danger-subtle text-danger border border-danger">
                                                <i className="bi bi-star-fill me-1"></i>
                                                Bullseye
                                              </span>
                                            ) : (
                                              <span className="badge bg-success-subtle text-success border border-success">
                                                Hit
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>
      </div>
    </div>

      {/* Dokumen Laporan Resmi untuk cetak langsung browser (Ctrl+P) jika modal cetak tidak sedang dibuka */}
      {!showModalCetak && sesi && (
        <div id="sitrak-print-area-fallback" className="d-none d-print-block">
          <DokumenLaporanSesi
            sesi={sesi}
            filterGelombang="semua"
            sertakanBalistik={true}
            sertakanTandaTangan={true}
            namaPenandatangan1={sesi.pelatih || "Komandan Latihan Menembak"}
            pangkatNrpPenandatangan1="Kapten Inf / NRP 110401829"
            namaPenandatangan2={
              localStorage.getItem("user_nama") || "Petugas Pencatat Nilai SITRAK"
            }
            pangkatNrpPenandatangan2="Sersan Satu / NRP 211200481"
            lokasiPenerbitan={sesi.nama_tempat_menembak || "Jakarta"}
            isPrintMode={true}
          />
        </div>
      )}

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
                  className={`card p-3 border ${selectedStatusInModal === "Menunggu"
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
                  className={`card p-3 border ${selectedStatusInModal === "Berlangsung"
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
                          Sesi latihan tembakan sedang aktif berjalan di
                          lapangan.
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
                  className={`card p-3 border ${selectedStatusInModal === "Selesai"
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
                  className={`card p-3 border ${selectedStatusInModal === "Dibatalkan"
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
                          Sesi dibatalkan karena cuaca buruk atau kendala
                          operasional.
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

      {/* Modal Upload & Analisis Target Tembakan SITRAK-Detect */}
      {showTargetModal && (sesi?.status || "").toLowerCase() === "berlangsung" && (
        <ModalUploadTargetDetect
          isOpen={showTargetModal}
          onClose={() => setShowTargetModal(false)}
          sesiData={sesi}
          initialShooter={targetModalShooter}
          initialBabakId={targetModalBabakId}
          onApplyResult={handleApplyDetectResult}
        />
      )}

      {/* Modal Pratinjau & Cetak Laporan Resmi Sesi Latihan */}
      {showModalCetak && sesi && (
        <ModalCetakLaporan
          isOpen={showModalCetak}
          onClose={() => setShowModalCetak(false)}
          sesi={sesi}
          activeGelombang={activeGelombang}
        />
      )}
    </div>
  );
};
