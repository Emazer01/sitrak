import * as React from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

/**
 * Halaman Live Scoring Latihan Menembak (SITRAK-AI)
 * Fitur:
 * - Menampilkan perolehan skor dan target visualizer/foto anotasi seluruh penembak dalam 1 babak & 1 gelombang
 * - Mode Layar Penuh (Fullscreen) untuk proyektor/layar monitor lapangan tembak
 * - Auto-refresh real-time dengan countdown dan indikator LIVE berkedip
 * - Pilihan mode tampilan (Lesan Vektor SVG, Foto Deteksi Kamera, atau Split)
 * - Pemeringkatan skor langsung (Leaderboard) dan statistik gelombang
 */
export const LiveScoring = () => {
  const { id: paramId } = useParams();
  const navigate = useNavigate();

  // State data sesi & navigasi
  const [sesi, setSesi] = React.useState(null);
  const [allSesiList, setAllSesiList] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [activeGelombang, setActiveGelombang] = React.useState(1);
  const [activeBabakId, setActiveBabakId] = React.useState(null);

  // State tampilan & fullscreen
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState("svg"); // 'svg' | 'foto' | 'split'
  const [sortBy, setSortBy] = React.useState("lane"); // 'lane' | 'score'
  const [autoRefresh, setAutoRefresh] = React.useState(true);
  const [refreshCountdown, setRefreshCountdown] = React.useState(5);
  const [lastRefreshedAt, setLastRefreshedAt] = React.useState(new Date());

  const containerRef = React.useRef(null);

  const [activeSesiId, setActiveSesiId] = React.useState(
    () => paramId || localStorage.getItem("active_sesi_id") || null
  );

  // Jika terdapat ID pada URL, simpan ke localStorage lalu bersihkan URL (tanpa reload)
  React.useEffect(() => {
    if (paramId) {
      localStorage.setItem("active_sesi_id", String(paramId));
      setActiveSesiId(String(paramId));
      navigate("/live-scoring", { replace: true });
    }
  }, [paramId, navigate]);

  const currentId =
    activeSesiId || paramId || localStorage.getItem("active_sesi_id") || null;

  // Set document title
  React.useEffect(() => {
    if (sesi?.nama_sesi) {
      document.title = `LIVE SCORING - ${sesi.nama_sesi} (${sesi.kode_sesi}) - SITRAK`;
    } else {
      document.title = "Live Scoring Latihan - SITRAK-AI";
    }
  }, [sesi]);

  // Helper untuk mendapatkan URL foto anotasi
  const getFotoUrl = (url) => {
    if (!url || typeof url !== "string") return null;
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("data:")
    ) {
      return url;
    }
    const backendBase =
      process.env.REACT_APP_BACKEND_URL || "http://172.16.8.240:1200";
    return `${backendBase}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  // Fungsi memuat data detail sesi
  const fetchSesiData = async (showSpinner = true) => {
    if (!currentId || isNaN(Number(currentId))) {
      navigate("/latihan");
      return;
    }

    if (showSpinner) setLoading(true);

    try {
      const url = `${process.env.REACT_APP_BACKEND_URL}/sesi/${currentId}`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (response.status === 200) {
        const rawData = response.data?.data || response.data;
        if (!rawData || !rawData.id_sesi) {
          navigate("/notfound");
          return;
        }

        // Parse struktur gelombang, babak, dan skor penembak
        const gelombangList = (rawData.gelombang || []).map((g, gIdx) => {
          const shooterMap = new Map();
          const babakList = g.babak || [];

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
            const laneNo = pIdx + 1;
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
                  bEntry.catatan_analisis
                ),
              };
            });

            const totalSkor = babakScores.reduce((acc, bs) => acc + bs.skor, 0);
            const totalMax = babakScores.reduce(
              (acc, bs) => acc + bs.max_skor,
              0
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

            const allHits = babakScores.flatMap((bs) =>
              (bs.hits || []).map((h) => ({
                ...h,
                nomor_babak: bs.nomor,
                nama_babak: bs.nama,
              }))
            );

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
              fotoTarget: s.fotoTarget || null,
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

        const babakConfig =
          (rawData.gelombang &&
            rawData.gelombang[0] &&
            rawData.gelombang[0].babak) ||
          [];

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
          babak: babakConfig,
          gelombang_list: gelombangList,
        });

        // Set default babak jika belum dipilih
        if (!activeBabakId && babakConfig.length > 0) {
          setActiveBabakId(
            String(babakConfig[0].id_babak || babakConfig[0].nomor_babak)
          );
        }

        setLastRefreshedAt(new Date());
      }
    } catch (err) {
      console.error("Gagal mengambil data live scoring:", err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  // Muat daftar sesi berstatus 'Berlangsung' untuk quick-switch
  const fetchAllSesi = async () => {
    try {
      const url = `${process.env.REACT_APP_BACKEND_URL}/sesi?limit=50`;
      const res = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      if (res.status === 200) {
        const list = res.data?.data || res.data || [];
        const rawArray = Array.isArray(list) ? list : [];
        // Hanya sertakan sesi latihan yang sedang 'Berlangsung'
        const ongoingList = rawArray.filter(
          (s) => (s.status || "").toLowerCase() === "berlangsung"
        );
        setAllSesiList(ongoingList);
      }
    } catch (e) {
      console.error("Gagal mengambil list sesi:", e);
    }
  };

  React.useEffect(() => {
    fetchSesiData(true);
    fetchAllSesi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  // Timer auto-refresh real-time (hanya berjalan bila sesi sedang Berlangsung)
  React.useEffect(() => {
    const isOngoing = (sesi?.status || "").toLowerCase() === "berlangsung";
    if (!autoRefresh || !isOngoing) return;
    const interval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchSesiData(false);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, activeGelombang, activeBabakId, currentId, sesi?.status]);

  // Listener fullscreen change event (F11 / Esc)
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Handler toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const elem = containerRef.current || document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch((err) => {
          console.error("Gagal mengaktifkan mode fullscreen:", err);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Gelombang dan Babak yang aktif
  const currentWaveData =
    sesi?.gelombang_list?.find((g) => g.nomor_gelombang === activeGelombang) ||
    sesi?.gelombang_list?.[0];

  const currentBabakList = currentWaveData?.babak || sesi?.babak || [];

  const currentBabak =
    currentBabakList.find(
      (b) =>
        String(b.id_babak) === String(activeBabakId) ||
        String(b.nomor_babak) === String(activeBabakId)
    ) ||
    currentBabakList[0] ||
    null;

  // Siapkan data penembak untuk babak ini
  const rawShooters = currentWaveData?.penembak || [];

  const shootersWithBabakScore = rawShooters.map((p) => {
    const bScore = p.babak_scores?.find(
      (bs) =>
        String(bs.id_babak) === String(currentBabak?.id_babak) ||
        String(bs.nomor) === String(currentBabak?.nomor_babak)
    );

    const hits = bScore?.hits || [];
    const skor = bScore?.skor ?? 0;
    const maxSkor = bScore?.max_skor ?? (currentBabak?.jumlah_peluru || 10) * 10;
    const akurasi = bScore?.akurasi ?? 0;
    const bullseyeCount = hits.filter(
      (h) =>
        h.poin === 10 ||
        h.ring === "10" ||
        String(h.ring).toLowerCase().includes("bull")
    ).length;

    const foto =
      bScore?.foto_target || bScore?.fotoTarget || bScore?.url_foto_asli || null;

    let kategori = "Menunggu";
    if (skor > 0 || (sesi?.status || "").toLowerCase() === "selesai") {
      if (akurasi >= 90) kategori = "Istimewa";
      else if (akurasi >= 80) kategori = "Mahir";
      else if (akurasi >= 70) kategori = "Cukup";
      else kategori = "Perlu Pembinaan";
    }

    return {
      ...p,
      currentBabakScore: skor,
      currentBabakMax: maxSkor,
      currentBabakAkurasi: akurasi,
      currentBabakHits: hits,
      currentBabakBullseye: bullseyeCount,
      currentBabakFoto: foto,
      currentBabakBallistics: {
        grouping: bScore?.grouping_radius_mm,
        offsetX: bScore?.center_offset_x_mm,
        offsetY: bScore?.center_offset_y_mm,
        status: bScore?.status_analisis,
        catatan: bScore?.catatan_analisis,
      },
      currentKategori: kategori,
    };
  });

  // Urutkan penembak berdasarkan pilihan sort
  const displayedShooters = [...shootersWithBabakScore].sort((a, b) => {
    if (sortBy === "score") {
      if (b.currentBabakScore !== a.currentBabakScore) {
        return b.currentBabakScore - a.currentBabakScore;
      }
      return b.currentBabakBullseye - a.currentBabakBullseye;
    }
    return (a.lane || 0) - (b.lane || 0);
  });

  // Hitung statistik ringkasan gelombang pada babak ini
  const totalWaveScore = shootersWithBabakScore.reduce(
    (acc, p) => acc + p.currentBabakScore,
    0
  );
  const avgWaveScore =
    shootersWithBabakScore.length > 0
      ? (totalWaveScore / shootersWithBabakScore.length).toFixed(1)
      : 0;

  const avgWaveAccuracy =
    shootersWithBabakScore.length > 0
      ? (
        shootersWithBabakScore.reduce(
          (acc, p) => acc + p.currentBabakAkurasi,
          0
        ) / shootersWithBabakScore.length
      ).toFixed(1)
      : 0;

  // Podium 3 teratas
  const sortedByScoreDesc = [...shootersWithBabakScore].sort((a, b) => {
    if (b.currentBabakScore !== a.currentBabakScore) {
      return b.currentBabakScore - a.currentBabakScore;
    }
    return b.currentBabakBullseye - a.currentBabakBullseye;
  });

  const renderBadgeKategori = (kategori) => {
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
      <div
        className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-dark text-white font-poppins"
        style={{ background: "radial-gradient(circle, #1a2234 0%, #0a0f1d 100%)" }}
      >
        <div
          className="spinner-border text-primary mb-3"
          style={{ width: "3.5rem", height: "3.5rem" }}
          role="status"
        />
        <h4 className="fw-bold tracking-wider mb-1">MEMUAT LIVE SCORING...</h4>
        <p className="text-secondary small">
          Menghubungkan ke sistem pemantauan target lapangan tembak SITRAK-AI...
        </p>
      </div>
    );
  }

  // Live Scoring HANYA untuk sesi yang sedang Berlangsung
  const isSesiBerlangsung = (sesi?.status || "").toLowerCase() === "berlangsung";

  if (!isSesiBerlangsung) {
    const isSelesai = (sesi?.status || "").toLowerCase() === "selesai";
    const isDibatalkan = (sesi?.status || "").toLowerCase() === "dibatalkan";

    return (
      <div
        className="min-vh-100 text-light font-poppins d-flex flex-column align-items-center justify-content-center p-4 text-center"
        style={{
          backgroundColor: "#0b1120",
          backgroundImage:
            "radial-gradient(circle at 50% 30%, rgba(30, 58, 138, 0.25) 0%, rgba(11, 17, 32, 0.98) 75%)",
        }}
      >
        <div
          className="card border-0 shadow-lg p-4 p-md-5 text-center"
          style={{
            maxWidth: "540px",
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div className="mb-3">
            {isSelesai ? (
              <span className="badge bg-secondary-subtle text-secondary border border-secondary px-3 py-2 fs-6">
                <i className="bi bi-check-circle-fill me-1 text-primary"></i> Sesi Selesai
              </span>
            ) : isDibatalkan ? (
              <span className="badge bg-danger-subtle text-danger border border-danger px-3 py-2 fs-6">
                <i className="bi bi-x-circle-fill me-1 text-danger"></i> Sesi Dibatalkan
              </span>
            ) : (
              <span className="badge bg-warning-subtle text-warning border border-warning px-3 py-2 fs-6">
                <i className="bi bi-clock-fill me-1 text-warning"></i> Sesi {sesi?.status || "Menunggu"}
              </span>
            )}
          </div>

          <i
            className={`bi ${isSelesai
                ? "bi-flag-fill text-primary"
                : isDibatalkan
                  ? "bi-slash-circle text-danger"
                  : "bi-exclamation-triangle text-warning"
              } display-3 mb-3`}
          ></i>

          <h4 className="fw-bold text-white mb-2">Live Scoring Tidak Tersedia</h4>
          <p className="text-secondary small mb-4">
            Fitur Live Scoring hanya aktif untuk sesi latihan yang sedang{" "}
            <strong className="text-success">Berlangsung</strong>. Sesi ini saat ini berstatus{" "}
            <strong className="text-white">{sesi?.status || "Tidak Berlangsung"}</strong>,
            sehingga papan skor langsung dinonaktifkan.
          </p>

          {sesi && (
            <div className="p-3 bg-black bg-opacity-40 rounded-3 mb-4 text-start small border border-secondary border-opacity-25">
              <div className="d-flex justify-content-between mb-1.5">
                <span className="text-secondary">Nama Sesi:</span>
                <strong className="text-white">{sesi.nama_sesi}</strong>
              </div>
              <div className="d-flex justify-content-between mb-1.5">
                <span className="text-secondary">Kode Sesi:</span>
                <span className="text-white font-monospace">{sesi.kode_sesi}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-secondary">Tempat:</span>
                <span className="text-white">{sesi.nama_tempat_menembak}</span>
              </div>
            </div>
          )}

          <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-primary d-flex align-items-center gap-2 px-3 shadow-sm"
              onClick={() => navigate("/detail-sesi")}
            >
              <i className="bi bi-file-earmark-text"></i>
              <span>Buka Detail Sesi</span>
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary text-light d-flex align-items-center gap-2 px-3"
              onClick={() => navigate("/latihan")}
            >
              <i className="bi bi-arrow-left"></i>
              <span>Daftar Sesi</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-vh-100 text-light font-poppins d-flex flex-column"
      style={{
        backgroundColor: "#0b1120",
        backgroundImage:
          "radial-gradient(circle at 50% 0%, rgba(30, 58, 138, 0.25) 0%, rgba(11, 17, 32, 0.95) 75%)",
        color: "#f1f5f9",
      }}
    >
      {/* 1. TOP COMMAND BAR / HEADER */}
      <header
        className="border-bottom border-secondary border-opacity-25 py-2 px-3 px-md-4 shadow"
        style={{ backgroundColor: "rgba(15, 23, 42, 0.95)" }}
      >
        <div className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between gap-2">
          {/* Sisi Kiri: Back, Live Indicator, Identitas Sesi */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-sm btn-outline-light border-secondary d-flex align-items-center gap-1"
              onClick={() => navigate("/detail-sesi")}
              title="Kembali ke halaman Detail Sesi"
            >
              <i className="bi bi-arrow-left"></i>
              <span className="d-none d-sm-inline">Kembali</span>
            </button>

            {/* LIVE INDICATOR GLOW */}
            <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-danger bg-opacity-25 border border-danger shadow-sm">
              <span
                className="spinner-grow spinner-grow-sm text-danger"
                role="status"
                style={{ width: "0.65rem", height: "0.65rem" }}
              />
              <span
                className="fw-bold text-danger tracking-wider small"
                style={{ letterSpacing: "1.5px" }}
              >
                LIVE SCORING
              </span>
            </div>

            <div>
              <h5 className="fw-bold mb-0 text-white d-flex align-items-center gap-2 flex-wrap fs-6 fs-md-5">
                <span>{sesi.nama_sesi}</span>
                <span className="badge bg-secondary bg-opacity-50 text-white font-monospace small">
                  {sesi.kode_sesi}
                </span>
                <span className="badge bg-success-subtle text-success border border-success small">
                  {sesi.status || "Berlangsung"}
                </span>
              </h5>
              <div
                className="text-secondary small d-flex align-items-center gap-2 flex-wrap"
                style={{ fontSize: "0.78rem" }}
              >
                <span>
                  <i className="bi bi-geo-alt me-1 text-danger"></i>
                  {sesi.nama_tempat_menembak}
                </span>
                <span>•</span>
                <span>
                  <i className="bi bi-crosshair me-1 text-primary"></i>
                  {sesi.model_senjata} ({sesi.kaliber})
                </span>
                <span>•</span>
                <span>
                  <i className="bi bi-arrows-expand me-1 text-warning"></i>
                  {sesi.jarak_meter} Meter
                </span>
                <span>•</span>
                <span>
                  <i className="bi bi-bullseye me-1 text-info"></i>
                  Target: {sesi.nama_tipe_target}
                </span>
              </div>
            </div>
          </div>

          {/* Sisi Kanan: Kontrol Refresh & Tombol Fullscreen */}
          <div className="d-flex align-items-center gap-2 ms-auto flex-wrap">
            {/* Auto-refresh timer button */}
            <button
              type="button"
              className={`btn btn-sm d-flex align-items-center gap-1 ${autoRefresh
                  ? "btn-outline-success text-success bg-success bg-opacity-10"
                  : "btn-outline-secondary"
                }`}
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={
                autoRefresh
                  ? "Auto-refresh aktif setiap 5 detik"
                  : "Auto-refresh dimatikan"
              }
            >
              <i
                className={`bi bi-arrow-repeat ${autoRefresh ? "text-success" : ""
                  }`}
              />
              <span className="small">
                {autoRefresh ? `Auto: ${refreshCountdown}s` : "Manual"}
              </span>
            </button>

            {/* Tombol Refresh Manual */}
            <button
              type="button"
              className="btn btn-sm btn-outline-light border-secondary"
              onClick={() => {
                fetchSesiData(false);
                setRefreshCountdown(5);
              }}
              title="Perbarui Data Sekarang"
            >
              <i className="bi bi-arrow-clockwise"></i>
            </button>

            {/* Quick Switch Sesi Dropdown */}
            {allSesiList.length > 1 && (
              <div className="dropdown">
                <button
                  className="btn btn-sm btn-outline-secondary dropdown-toggle text-light"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  title="Ganti Sesi Latihan"
                >
                  <i className="bi bi-collection-play me-1"></i>
                  <span className="d-none d-md-inline">Ganti Sesi</span>
                </button>
                <ul
                  className="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow"
                  style={{ maxHeight: "250px", overflowY: "auto" }}
                >
                  <li>
                    <h6 className="dropdown-header text-uppercase text-secondary small">
                      Pilih Sesi Latihan
                    </h6>
                  </li>
                  {allSesiList.map((s) => (
                    <li key={s.id_sesi}>
                      <button
                        type="button"
                        className={`dropdown-item small d-flex justify-content-between align-items-center ${String(s.id_sesi) === String(currentId)
                            ? "active fw-bold"
                            : ""
                          }`}
                        onClick={() => {
                          const newId = String(s.id_sesi);
                          localStorage.setItem("active_sesi_id", newId);
                          localStorage.setItem(
                            "active_sesi_kode",
                            s.kode_sesi || `SESI-${newId}`
                          );
                          setActiveSesiId(newId);
                          setActiveGelombang(1);
                          setActiveBabakId(null);
                        }}
                      >
                        <span>{s.nama_sesi}</span>
                        <span className="badge bg-secondary ms-2 small">
                          {s.status}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* TOMBOL FULLSCREEN */}
            <button
              type="button"
              className="btn btn-sm btn-warning fw-bold text-dark d-flex align-items-center gap-1 shadow px-3"
              onClick={toggleFullscreen}
              title="Beralih ke Layar Penuh (F11)"
            >
              <i
                className={`bi ${isFullscreen ? "bi-fullscreen-exit" : "bi-arrows-fullscreen"
                  }`}
              />
              <span>{isFullscreen ? "Keluar Fullscreen" : "Layar Penuh"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. SUB-HEADER: GELOMBANG & BABAK CONTROLS, VIEW MODE, & SORT */}
      <div
        className="px-3 px-md-4 py-2 border-bottom border-secondary border-opacity-25 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2"
        style={{ backgroundColor: "rgba(15, 23, 42, 0.75)" }}
      >
        {/* Tab Pilihan Gelombang */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="small text-secondary fw-semibold text-uppercase tracking-wider">
            Gelombang:
          </span>
          <div className="btn-group btn-group-sm" role="group">
            {(sesi?.gelombang_list || []).map((g) => (
              <button
                key={g.id_gelombang || g.nomor_gelombang}
                type="button"
                className={`btn ${activeGelombang === g.nomor_gelombang
                    ? "btn-primary fw-bold text-white shadow-sm"
                    : "btn-outline-secondary text-light bg-dark"
                  }`}
                onClick={() => setActiveGelombang(g.nomor_gelombang)}
              >
                Gelombang {g.nomor_gelombang}
                <span className="badge ms-1 bg-black bg-opacity-50 text-white-50">
                  {g.penembak?.length || 0} Penembak
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Pilihan Babak */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="small text-secondary fw-semibold text-uppercase tracking-wider">
            Babak Latihan:
          </span>
          <div className="btn-group btn-group-sm" role="group">
            {currentBabakList.map((b) => {
              const isSelected =
                String(activeBabakId) ===
                String(b.id_babak || b.nomor_babak);
              return (
                <button
                  key={b.id_babak || b.nomor_babak}
                  type="button"
                  className={`btn ${isSelected
                      ? "btn-success fw-bold text-white shadow-sm"
                      : "btn-outline-secondary text-light bg-dark"
                    }`}
                  onClick={() =>
                    setActiveBabakId(String(b.id_babak || b.nomor_babak))
                  }
                >
                  Babak {b.nomor_babak}: {b.nama_babak}
                  <span className="badge ms-1 bg-black bg-opacity-50 text-white-50">
                    {b.jumlah_peluru || 10} Butir
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* View Mode & Sorting Control */}
        <div className="d-flex align-items-center gap-2 ms-md-auto flex-wrap">
          <div className="btn-group btn-group-sm" role="group">
            <button
              type="button"
              className={`btn ${viewMode === "svg"
                  ? "btn-info text-dark fw-bold"
                  : "btn-outline-secondary text-light"
                }`}
              onClick={() => setViewMode("svg")}
              title="Tampilkan Target Lesan Vektor"
            >
              <i className="bi bi-bullseye me-1"></i> Lesan SVG
            </button>
            <button
              type="button"
              className={`btn ${viewMode === "foto"
                  ? "btn-info text-dark fw-bold"
                  : "btn-outline-secondary text-light"
                }`}
              onClick={() => setViewMode("foto")}
              title="Tampilkan Foto Kamera Deteksi AI"
            >
              <i className="bi bi-camera me-1"></i> Foto AI
            </button>
            <button
              type="button"
              className={`btn ${viewMode === "split"
                  ? "btn-info text-dark fw-bold"
                  : "btn-outline-secondary text-light"
                }`}
              onClick={() => setViewMode("split")}
              title="Tampilkan Target Vektor & Foto Kamera Berdampingan"
            >
              <i className="bi bi-layout-split me-1"></i> Split
            </button>
          </div>

          <div className="btn-group btn-group-sm" role="group">
            <button
              type="button"
              className={`btn ${sortBy === "lane"
                  ? "btn-light text-dark fw-bold"
                  : "btn-outline-secondary text-light"
                }`}
              onClick={() => setSortBy("lane")}
              title="Urutkan berdasarkan Nomor Jalur"
            >
              <i className="bi bi-sort-numeric-down me-1"></i> Jalur
            </button>
            <button
              type="button"
              className={`btn ${sortBy === "score"
                  ? "btn-light text-dark fw-bold"
                  : "btn-outline-secondary text-light"
                }`}
              onClick={() => setSortBy("score")}
              title="Urutkan berdasarkan Peringkat Skor Tertinggi"
            >
              <i className="bi bi-trophy me-1 text-warning"></i> Skor
            </button>
          </div>
        </div>
      </div>

      {/* 3. PODIUM & STATISTIK GELOMBANG STRIP */}
      <div
        className="px-3 px-md-4 py-2 border-bottom border-secondary border-opacity-25 text-secondary"
        style={{ backgroundColor: "rgba(10, 15, 29, 0.9)" }}
      >
          {/* Rerata Gelombang */}
            <span className="me-3">
              Rerata Skor:{" "}
              <strong className="text-primary fs-6">{avgWaveScore}</strong> /{" "}
              {(currentBabak?.jumlah_peluru || 10) * 10}
            </span>
            <span>
              Rerata Akurasi:{" "}
              <strong className="text-success fs-6">{avgWaveAccuracy}%</strong>
            </span>
      </div>

      {/* 4. MAIN LIVE SCOREBOARD GRID: SEMUA PENEMBAK DALAM SATU BABAK & GELOMBANG */}
      <main className="flex-grow-1 p-3 p-md-4 overflow-y-auto">
        {displayedShooters.length === 0 ? (
          <div className="text-center p-5 bg-dark bg-opacity-50 rounded-4 border border-secondary border-opacity-25 my-5">
            <i className="bi bi-people fs-1 text-secondary d-block mb-3"></i>
            <h5 className="fw-bold text-white mb-2">
              Tidak Ada Penembak di Gelombang Ini
            </h5>
            <p className="text-secondary small mb-3">
              Silakan periksa konfigurasi pembagian gelombang atau kembali ke
              halaman sesi.
            </p>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => navigate("/detail-sesi")}
            >
              Kembali ke Detail Sesi
            </button>
          </div>
        ) : (
          <div className="row g-3 g-xl-4 align-items-stretch">
            {displayedShooters.map((shooter) => {
              const rank =
                sortedByScoreDesc.findIndex(
                  (s) =>
                    String(s.id_personel_penembak) ===
                    String(shooter.id_personel_penembak)
                ) + 1;

              const isTop3 = rank <= 3 && shooter.currentBabakScore > 0;
              const hasHits =
                shooter.currentBabakHits &&
                shooter.currentBabakHits.length > 0;

              const fotoUrl = getFotoUrl(shooter.currentBabakFoto);

              return (
                <div
                  key={shooter.id_personel_penembak}
                  className={
                    displayedShooters.length <= 2
                      ? "col-12 col-lg-6"
                      : displayedShooters.length <= 4
                        ? "col-12 col-md-6 col-xl-3"
                        : "col-12 col-md-6 col-lg-4 col-xl-3"
                  }
                >
                  <div
                    className={`card h-100 border-0 shadow-lg position-relative overflow-hidden ${isTop3
                        ? "border-top border-warning border-3"
                        : "border-top border-primary border-3"
                      }`}
                    style={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "14px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                    }}
                  >
                    {/* Header Kartu Penembak */}
                    <div
                      className="p-3 border-bottom border-secondary border-opacity-25 d-flex justify-content-between align-items-center"
                      style={{ backgroundColor: "rgba(30, 41, 59, 0.5)" }}
                    >
                      {/* Jalur / Lane Badge */}
                      <div className="d-flex align-items-center gap-2">
                        <span
                          className={`badge px-3 py-2 fw-bold fs-6 shadow-sm ${isTop3
                              ? "bg-warning text-dark"
                              : "bg-primary text-white"
                            }`}
                        >
                          LANE {shooter.lane}
                        </span>
                        {shooter.currentBabakScore > 0 && (
                          <span
                            className="badge bg-dark border border-secondary text-white-50"
                            style={{ fontSize: "0.75rem" }}
                          >
                            #{rank}
                          </span>
                        )}
                      </div>

                      {/* Status Kelulusan */}
                      <div>{renderBadgeKategori(shooter.currentKategori)}</div>
                    </div>

                    {/* Informasi Identitas Penembak */}
                    <div className="px-3 pt-2 pb-1">
                      <div className="fw-bold text-white fs-6 text-truncate">
                        {shooter.nama}
                      </div>
                      <div
                        className="text-secondary small d-flex justify-content-between align-items-center"
                        style={{ fontSize: "0.76rem" }}
                      >
                        <span>NRP: {shooter.nrp}</span>
                        <span>{shooter.satuan}</span>
                      </div>
                    </div>

                    {/* Score Bar Display (Skor Besar) */}
                    <div className="p-3 bg-black bg-opacity-25 mx-3 my-2 rounded-3 border border-secondary border-opacity-25">
                      <div className="d-flex justify-content-between align-items-end">
                        <div>
                          <small className="text-secondary d-block" style={{ fontSize: "0.75rem" }}>
                            SKOR BABAK {currentBabak?.nomor_babak || 1}
                          </small>
                          <div className="d-flex align-items-baseline gap-1">
                            <span className="display-6 fw-bold text-warning lh-1 font-monospace">
                              {shooter.currentBabakScore}
                            </span>
                            <span className="text-secondary fs-6">
                              / {shooter.currentBabakMax}
                            </span>
                          </div>
                        </div>

                        <div className="text-end">
                          <small className="text-secondary d-block" style={{ fontSize: "0.75rem" }}>
                            AKURASI
                          </small>
                          <span
                            className={`fs-5 fw-bold font-monospace ${shooter.currentBabakAkurasi >= 80
                                ? "text-success"
                                : shooter.currentBabakAkurasi >= 60
                                  ? "text-warning"
                                  : "text-secondary"
                              }`}
                          >
                            {shooter.currentBabakAkurasi}%
                          </span>
                        </div>
                      </div>

                      {/* Info Tambahan: Butir & Bullseye */}
                      <div
                        className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top border-secondary border-opacity-25 text-secondary"
                        style={{ fontSize: "0.74rem" }}
                      >
                        <span>
                          <i className="bi bi-circle-fill me-1 text-primary" style={{ fontSize: "0.5rem" }}></i>
                          Terdeteksi:{" "}
                          <strong className="text-light">
                            {shooter.currentBabakHits.length} Butir
                          </strong>
                        </span>
                        <span>
                          <i className="bi bi-star-fill me-1 text-danger"></i>
                          Bullseye:{" "}
                          <strong className="text-danger">
                            {shooter.currentBabakBullseye}x
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* TARGET VISUALIZER & ANOTASI FOTO */}
                    <div className="px-3 py-2 flex-grow-1 d-flex flex-column align-items-center justify-content-center">
                      {/* VIEW MODE: FOTO CV ONLY */}
                      {viewMode === "foto" ? (
                        <div
                          className="bg-black rounded-3 p-2 w-100 text-center shadow-inner position-relative"
                          style={{ minHeight: "220px" }}
                        >
                          {fotoUrl ? (
                            <img
                              src={fotoUrl}
                              alt={`Foto Deteksi Lane ${shooter.lane}`}
                              className="img-fluid rounded border border-secondary border-opacity-50 w-100"
                              style={{
                                maxHeight: "230px",
                                objectFit: "contain",
                                background: "#000",
                              }}
                            />
                          ) : (
                            <div className="d-flex flex-column align-items-center justify-content-center h-100 p-4 text-secondary">
                              <i className="bi bi-camera-video-off fs-1 mb-2 opacity-50"></i>
                              <span className="small">
                                Belum ada foto deteksi kamera
                              </span>
                            </div>
                          )}
                          <div
                            className="position-absolute bottom-0 start-50 translate-middle-x mb-2 badge bg-dark bg-opacity-75 text-white-50 border border-secondary border-opacity-25"
                            style={{ fontSize: "0.68rem" }}
                          >
                            Foto Kamera OpenCV
                          </div>
                        </div>
                      ) : viewMode === "split" ? (
                        /* VIEW MODE: SPLIT (SVG + FOTO) */
                        <div className="w-100">
                          <div className="row g-2">
                            {/* Lesan SVG */}
                            <div className="col-6 text-center">
                              <div
                                className="bg-black rounded-3 p-1 w-100 shadow"
                                style={{ maxHeight: "170px" }}
                              >
                                <svg
                                  viewBox="0 0 100 100"
                                  className="w-100 h-auto"
                                  style={{ maxHeight: "160px" }}
                                >
                                  <circle cx="50" cy="50" r="48" fill="#f8f9fa" stroke="#212529" strokeWidth="1" />
                                  <circle cx="50" cy="50" r="40" fill="#e9ecef" stroke="#212529" strokeWidth="1" />
                                  <circle cx="50" cy="50" r="32" fill="#ced4da" stroke="#212529" strokeWidth="1" />
                                  <circle cx="50" cy="50" r="24" fill="#212529" stroke="#fff" strokeWidth="0.8" />
                                  <circle cx="50" cy="50" r="16" fill="#212529" stroke="#fff" strokeWidth="0.8" />
                                  <circle cx="50" cy="50" r="8" fill="#212529" stroke="#fff" strokeWidth="0.8" />
                                  <circle cx="50" cy="50" r="3" fill="#dc3545" stroke="#fff" strokeWidth="0.5" />
                                  <line x1="50" y1="2" x2="50" y2="98" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                                  <line x1="2" y1="50" x2="98" y2="50" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                                  {shooter.currentBabakHits.map((h, i) => {
                                    const isBull = h.poin === 10 || h.ring === "10" || String(h.ring).toLowerCase().includes("bull");
                                    return (
                                      <g key={i}>
                                        <circle cx={h.x} cy={h.y} r="2.8" fill={isBull ? "#ff3838" : "#ffc107"} stroke="#000" strokeWidth="0.6" />
                                        <text x={h.x} y={h.y + 1} fill={isBull ? "#fff" : "#000"} fontSize="2.4" fontWeight="bold" textAnchor="middle">
                                          {h.nomor || i + 1}
                                        </text>
                                      </g>
                                    );
                                  })}
                                </svg>
                                <small className="text-secondary d-block" style={{ fontSize: "0.65rem" }}>
                                  Lesan Target
                                </small>
                              </div>
                            </div>

                            {/* Foto Kamera */}
                            <div className="col-6 text-center">
                              <div
                                className="bg-black rounded-3 p-1 w-100 shadow d-flex align-items-center justify-content-center"
                                style={{ height: "170px" }}
                              >
                                {fotoUrl ? (
                                  <img
                                    src={fotoUrl}
                                    alt={`Foto Lane ${shooter.lane}`}
                                    className="img-fluid rounded w-100 h-100"
                                    style={{ objectFit: "contain" }}
                                  />
                                ) : (
                                  <span className="text-secondary small fst-italic" style={{ fontSize: "0.68rem" }}>
                                    Foto belum ada
                                  </span>
                                )}
                              </div>
                              <small className="text-secondary d-block mt-1" style={{ fontSize: "0.65rem" }}>
                                Foto CV
                              </small>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* VIEW MODE: SVG LESAN ONLY */
                        <div
                          className="bg-black rounded-3 p-2 w-100 text-center shadow position-relative"
                          style={{ maxWidth: "260px" }}
                        >
                          <svg
                            viewBox="0 0 100 100"
                            className="w-100 h-auto"
                            style={{ maxHeight: "220px" }}
                          >
                            <circle cx="50" cy="50" r="48" fill="#f8f9fa" stroke="#212529" strokeWidth="1" />
                            <circle cx="50" cy="50" r="40" fill="#e9ecef" stroke="#212529" strokeWidth="1" />
                            <circle cx="50" cy="50" r="32" fill="#ced4da" stroke="#212529" strokeWidth="1" />
                            <circle cx="50" cy="50" r="24" fill="#212529" stroke="#fff" strokeWidth="0.8" />
                            <circle cx="50" cy="50" r="16" fill="#212529" stroke="#fff" strokeWidth="0.8" />
                            <circle cx="50" cy="50" r="8" fill="#212529" stroke="#fff" strokeWidth="0.8" />
                            <circle cx="50" cy="50" r="3" fill="#dc3545" stroke="#fff" strokeWidth="0.5" />
                            <line x1="50" y1="2" x2="50" y2="98" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                            <line x1="2" y1="50" x2="98" y2="50" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />

                            {!hasHits ? (
                              <text
                                x="50"
                                y="52"
                                fill="#ffffff"
                                fontSize="3.6"
                                fontWeight="600"
                                textAnchor="middle"
                                opacity="0.85"
                              >
                                Menunggu Tembakan
                              </text>
                            ) : (
                              shooter.currentBabakHits.map((h, i) => {
                                const isBull =
                                  h.poin === 10 ||
                                  h.ring === "10" ||
                                  String(h.ring).toLowerCase().includes("bull");
                                return (
                                  <g key={i}>
                                    <circle
                                      cx={h.x}
                                      cy={h.y}
                                      r="2.8"
                                      fill={isBull ? "#ff3838" : "#ffc107"}
                                      stroke="#000"
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
                                      y={h.y + 1}
                                      fill={isBull ? "#ffffff" : "#000000"}
                                      fontSize="2.4"
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

                          {/* Foto thumbnail preview jika tersedia */}
                          {fotoUrl && (
                            <button
                              type="button"
                              className="btn btn-sm btn-dark position-absolute bottom-0 end-0 m-2 py-0 px-2 border border-secondary shadow-sm"
                              style={{ fontSize: "0.68rem" }}
                              onClick={() => setViewMode("foto")}
                              title="Lihat foto kamera"
                            >
                              <i className="bi bi-camera me-1 text-primary"></i> Foto
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* BUTIR PELURU STRIP (CHIPS NILAI TIAP TEMBAKAN) */}
                    <div className="p-3 border-top border-secondary border-opacity-25">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <small className="text-secondary" style={{ fontSize: "0.72rem" }}>
                          Rincian Butir Peluru:
                        </small>
                        {shooter.currentBabakBallistics.grouping && (
                          <small className="text-success" style={{ fontSize: "0.72rem" }}>
                            Grouping: ±{shooter.currentBabakBallistics.grouping} mm
                          </small>
                        )}
                      </div>

                      {hasHits ? (
                        <div
                          className="d-flex flex-wrap gap-1"
                          style={{ maxHeight: "65px", overflowY: "auto" }}
                        >
                          {shooter.currentBabakHits.map((h, hIdx) => {
                            const isBull =
                              h.poin === 10 ||
                              h.ring === "10" ||
                              String(h.ring).toLowerCase().includes("bull");
                            return (
                              <span
                                key={hIdx}
                                className={`badge font-monospace px-2 py-1 ${isBull
                                    ? "bg-danger text-white border border-danger"
                                    : h.poin >= 9
                                      ? "bg-success text-white"
                                      : h.poin >= 7
                                        ? "bg-primary text-white"
                                        : "bg-secondary text-white"
                                  }`}
                                style={{ fontSize: "0.72rem" }}
                                title={`Peluru #${h.nomor || hIdx + 1}: Skor ${h.poin
                                  } (Ring ${h.ring})`}
                              >
                                #{h.nomor || hIdx + 1}: {h.poin}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-2 text-secondary small fst-italic" style={{ fontSize: "0.75rem" }}>
                          Belum ada data tembakan
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 5. FOOTER STATUS BAR */}
      <footer
        className="px-3 px-md-4 py-2 border-top border-secondary border-opacity-25 d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 text-secondary small"
        style={{ backgroundColor: "rgba(10, 15, 29, 0.95)", fontSize: "0.75rem" }}
      >
        <div className="d-flex align-items-center gap-3">
          <span>
            SITRAK-AI • Sistem Informasi Tracking & Penilaian Menembak
          </span>
          <span>•</span>
          <span>
            Gelombang: <strong>{activeGelombang}</strong> | Babak:{" "}
            <strong>
              {currentBabak?.nomor_babak}: {currentBabak?.nama_babak}
            </strong>
          </span>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span>
            Pembaruan Terakhir: {lastRefreshedAt.toLocaleTimeString("id-ID")}
          </span>
          <span>•</span>
          <span>Mode: {isFullscreen ? "Layar Penuh (Aktif)" : "Jendela"}</span>
        </div>
      </footer>
    </div>
  );
};

