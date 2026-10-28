import * as React from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { parseCatatanAnalisis } from "../services/sitrakDetectService";
import { getBackendUrl } from "../services/apiConfig";

/**
 * Halaman Live Scoring Latihan Menembak (SITRAK-AI)
 * Fitur:
 * - Menampilkan perolehan skor dan target visualizer/foto anotasi seluruh penembak dalam 1 babak & 1 gelombang
 * - Mode Layar Penuh (Fullscreen) untuk proyektor/layar monitor lapangan tembak
 * - Auto-refresh real-time dengan countdown dan indikator LIVE berkedip
 * - Pilihan mode tampilan (Lesan Vektor SVG, Foto Deteksi Kamera, atau Split)
 * - Mode Fokus Perorangan (Livescore Per Orang) dengan pembesaran target, tabel butir peluru, dan catatan taktis
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
  const [scoringViewMode, setScoringViewMode] = React.useState("grid"); // 'grid' | 'individual'
  const [selectedShooterId, setSelectedShooterId] = React.useState(null);
  const [highlightedHitNomor, setHighlightedHitNomor] = React.useState(null);
  const [shotTableViewMode, setShotTableViewMode] = React.useState("breakdown"); // 'breakdown' | 'detail'
  const [showToolbar, setShowToolbar] = React.useState(() => {
    const saved = localStorage.getItem("sitrak_livescore_show_toolbar");
    return saved !== null ? saved === "true" : true;
  });
  const [autoRefresh, setAutoRefresh] = React.useState(true);
  const [refreshCountdown, setRefreshCountdown] = React.useState(5);
  const [lastRefreshedAt, setLastRefreshedAt] = React.useState(new Date());

  // Simpan preferensi showToolbar ke localStorage
  React.useEffect(() => {
    localStorage.setItem("sitrak_livescore_show_toolbar", String(showToolbar));
  }, [showToolbar]);

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
    const backendBase = getBackendUrl();
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
      const url = `${getBackendUrl()}/sesi/${currentId}`;
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
      const url = `${getBackendUrl()}/sesi?limit=50`;
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
      currentBabakCatatan:
        bScore?.catatan_analisis || p.catatan_analisis || null,
      currentBabakBallistics: {
        grouping: bScore?.grouping_radius_mm,
        offsetX: bScore?.center_offset_x_mm,
        offsetY: bScore?.center_offset_y_mm,
        status: bScore?.status_analisis,
        catatan: bScore?.catatan_analisis || p.catatan_analisis || null,
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

  // Penembak aktif untuk Mode Fokus Perorangan (Individual)
  const activeShooter =
    displayedShooters.find(
      (s) => String(s.id_personel_penembak) === String(selectedShooterId)
    ) ||
    displayedShooters[0] ||
    null;

  const activeShooterIndex = displayedShooters.findIndex(
    (s) =>
      String(s.id_personel_penembak) ===
      String(activeShooter?.id_personel_penembak)
  );

  const handlePrevShooter = React.useCallback(() => {
    if (displayedShooters.length === 0) return;
    const prevIdx =
      (activeShooterIndex - 1 + displayedShooters.length) %
      displayedShooters.length;
    setSelectedShooterId(displayedShooters[prevIdx].id_personel_penembak);
    setHighlightedHitNomor(null);
  }, [activeShooterIndex, displayedShooters]);

  const handleNextShooter = React.useCallback(() => {
    if (displayedShooters.length === 0) return;
    const nextIdx = (activeShooterIndex + 1) % displayedShooters.length;
    setSelectedShooterId(displayedShooters[nextIdx].id_personel_penembak);
    setHighlightedHitNomor(null);
  }, [activeShooterIndex, displayedShooters]);

  // Listener keyboard:
  // - 'H' / 'T': Sembunyikan atau tampilkan toolbar kontrol
  // - Panah kiri / kanan: Navigasi cepat penembak (pada Mode Per Orang)
  // - 'Escape': Kembali ke Mode Grid Semua Lane
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = (e.target?.tagName || "").toUpperCase();
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      // Pintasan tombol H / T untuk toggle toolbar
      if (e.key === "h" || e.key === "H" || e.key === "t" || e.key === "T") {
        e.preventDefault();
        setShowToolbar((prev) => !prev);
        return;
      }

      if (scoringViewMode === "individual") {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          handlePrevShooter();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          handleNextShooter();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setScoringViewMode("grid");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scoringViewMode, handlePrevShooter, handleNextShooter]);

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

  // Helper render target SVG berukuran besar untuk Mode Individual (Disesuaikan untuk Monitor Atas Jalur)
  const renderLargeSvgTarget = (shooter) => {
    if (!shooter) return null;
    const hits = shooter.currentBabakHits || [];
    const ballistics = shooter.currentBabakBallistics || {};

    return (
      <svg
        viewBox="0 0 100 100"
        className="w-100 h-100"
        style={{
          maxWidth: "100%",
          maxHeight: "65vh",
          filter: "drop-shadow(0 6px 25px rgba(0, 0, 0, 0.85))",
        }}
      >
        <defs>
          <filter id="shotGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="1.5"
              floodColor="#00f2fe"
              floodOpacity="0.9"
            />
          </filter>
          <filter id="bullGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="1.5"
              floodColor="#ff3838"
              floodOpacity="0.95"
            />
          </filter>
        </defs>

        {/* Lingkaran konsentris target ring 1 sampai 10 (Kontras Tinggi Standar EST) */}
        <circle cx="50" cy="50" r="48" fill="#f8fafc" stroke="#0f172a" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="43.2" fill="#f1f5f9" stroke="#0f172a" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="38.4" fill="#e2e8f0" stroke="#0f172a" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="33.6" fill="#cbd5e1" stroke="#0f172a" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="28.8" fill="#94a3b8" stroke="#0f172a" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="24" fill="#09090b" stroke="#ffffff" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="19.2" fill="#09090b" stroke="#ffffff" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="14.4" fill="#09090b" stroke="#ffffff" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="9.6" fill="#09090b" stroke="#ffffff" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="4.8" fill="#dc2626" stroke="#ffffff" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="2" fill="#991b1b" stroke="#ffffff" strokeWidth="0.4" />

        {/* Garis Crosshair / Reticle Presisi */}
        <line
          x1="50"
          y1="2"
          x2="50"
          y2="98"
          stroke="rgba(0, 242, 254, 0.45)"
          strokeWidth="0.45"
          strokeDasharray="1.5,1.5"
        />
        <line
          x1="2"
          y1="50"
          x2="98"
          y2="50"
          stroke="rgba(0, 242, 254, 0.45)"
          strokeWidth="0.45"
          strokeDasharray="1.5,1.5"
        />

        {/* Angka Ring Lesan Sisi Atas (Huruf Tebal & Jelas dari Kejauhan) */}
        <text x="50" y="5.4" fill="#0f172a" fontSize="3.0" fontWeight="900" textAnchor="middle">1</text>
        <text x="50" y="10.2" fill="#0f172a" fontSize="3.0" fontWeight="900" textAnchor="middle">2</text>
        <text x="50" y="15.0" fill="#0f172a" fontSize="3.0" fontWeight="900" textAnchor="middle">3</text>
        <text x="50" y="19.8" fill="#0f172a" fontSize="3.0" fontWeight="900" textAnchor="middle">4</text>
        <text x="50" y="24.6" fill="#0f172a" fontSize="3.0" fontWeight="900" textAnchor="middle">5</text>
        <text x="50" y="29.4" fill="#ffffff" fontSize="3.0" fontWeight="900" textAnchor="middle">6</text>
        <text x="50" y="34.2" fill="#ffffff" fontSize="3.0" fontWeight="900" textAnchor="middle">7</text>
        <text x="50" y="39.0" fill="#ffffff" fontSize="3.0" fontWeight="900" textAnchor="middle">8</text>
        <text x="50" y="43.8" fill="#ffffff" fontSize="3.0" fontWeight="900" textAnchor="middle">9</text>
        <text x="50" y="51.2" fill="#ffffff" fontSize="2.4" fontWeight="900" textAnchor="middle">X</text>

        {/* Angka Ring Lesan Sisi Bawah (Dual-side Orientation Standar ISSF) */}
        <text x="50" y="58.2" fill="#ffffff" fontSize="3.0" fontWeight="900" textAnchor="middle">9</text>
        <text x="50" y="63.0" fill="#ffffff" fontSize="3.0" fontWeight="900" textAnchor="middle">8</text>
        <text x="50" y="67.8" fill="#ffffff" fontSize="3.0" fontWeight="900" textAnchor="middle">7</text>
        <text x="50" y="72.6" fill="#ffffff" fontSize="3.0" fontWeight="900" textAnchor="middle">6</text>
        <text x="50" y="77.4" fill="#0f172a" fontSize="3.0" fontWeight="900" textAnchor="middle">5</text>
        <text x="50" y="82.2" fill="#0f172a" fontSize="3.0" fontWeight="900" textAnchor="middle">4</text>
        <text x="50" y="87.0" fill="#0f172a" fontSize="3.0" fontWeight="900" textAnchor="middle">3</text>
        <text x="50" y="91.8" fill="#0f172a" fontSize="3.0" fontWeight="900" textAnchor="middle">2</text>
        <text x="50" y="96.6" fill="#0f172a" fontSize="3.0" fontWeight="900" textAnchor="middle">1</text>

        {/* Angka Ring Lesan Sisi Kiri (Huruf Tebal & Jelas dari Kejauhan) */}
        <text y="51.2" x="4.7" fill="#0f172a" fontSize="3.0" fontWeight="900" textAnchor="middle">1</text>
        <text y="51.2" x="9.5" fill="#0f172a" fontSize="3.0" fontWeight="900" textAnchor="middle">2</text>
        <text y="51.2" x="14.3" fill="#0f172a" fontSize="3.0" fontWeight="900" textAnchor="middle">3</text>
        <text y="51.2" x="19.1" fill="#0f172a" fontSize="3.0" fontWeight="900" textAnchor="middle">4</text>
        <text y="51.2" x="23.9" fill="#0f172a" fontSize="3.0" fontWeight="900" textAnchor="middle">5</text>
        <text y="51.2" x="28.7" fill="#ffffff" fontSize="3.0" fontWeight="900" textAnchor="middle">6</text>
        <text y="51.2" x="33.5" fill="#ffffff" fontSize="3.0" fontWeight="900" textAnchor="middle">7</text>
        <text y="51.2" x="38.3" fill="#ffffff" fontSize="3.0" fontWeight="900" textAnchor="middle">8</text>
        <text y="51.2" x="43.1" fill="#ffffff" fontSize="3.0" fontWeight="900" textAnchor="middle">9</text>

        {/* Angka Ring Lesan Sisi Kanan (Huruf Tebal & Jelas dari Kejauhan) */}
        <text y="51.2" x="57.2" fill="#ffffff" fontSize="3.0" fontWeight="900" textAnchor="middle">9</text>
        <text y="51.2" x="62" fill="#ffffff" fontSize="3.0" fontWeight="900" textAnchor="middle">8</text>
        <text y="51.2" x="66.8" fill="#ffffff" fontSize="3.0" fontWeight="900" textAnchor="middle">7</text>
        <text y="51.2" x="71.6" fill="#ffffff" fontSize="3.0" fontWeight="900" textAnchor="middle">6</text>
        <text y="51.2" x="76.4" fill="#0f172a" fontSize="3.0" fontWeight="900" textAnchor="middle">5</text>
        <text y="51.2" x="81.2" fill="#0f172a" fontSize="3.0" fontWeight="900" textAnchor="middle">4</text>
        <text y="51.2" x="86" fill="#0f172a" fontSize="3.0" fontWeight="900" textAnchor="middle">3</text>
        <text y="51.2" x="90.8" fill="#0f172a" fontSize="3.0" fontWeight="900" textAnchor="middle">2</text>
        <text y="51.2" x="95.6" fill="#0f172a" fontSize="3.0" fontWeight="900" textAnchor="middle">1</text>


        {/* Lingkaran Grouping Balistik (bila ada) */}
        {ballistics.grouping && (
          <g>
            <circle
              cx={50 + ((ballistics.offsetX || 0) / 400) * 50}
              cy={50 + ((ballistics.offsetY || 0) / 400) * 50}
              r={Math.min(
                45,
                Math.max(5, ((ballistics.grouping || 20) / 400) * 50)
              )}
              fill="rgba(56, 189, 248, 0.12)"
              stroke="#38bdf8"
              strokeWidth="0.75"
              strokeDasharray="2.5,1.5"
            />
            {/* Titik MPI Center */}
            <circle
              cx={50 + ((ballistics.offsetX || 0) / 400) * 50}
              cy={50 + ((ballistics.offsetY || 0) / 400) * 50}
              r="1.2"
              fill="#fbbf24"
              stroke="#0f172a"
              strokeWidth="0.4"
            />
          </g>
        )}

        {/* Titik Perolehan Tembakan (Hits) */}
        {hits.length === 0 ? (
          <text
            x="50"
            y="51.5"
            fill="#ffffff"
            fontSize="3.5"
            fontWeight="700"
            textAnchor="middle"
            opacity="0.9"
            style={{ letterSpacing: "0.5px" }}
          >
            Menunggu Tembakan...
          </text>
        ) : (
          hits.map((h, i) => {
            const isBull =
              h.poin === 10 ||
              h.ring === "10" ||
              String(h.ring).toLowerCase().includes("bull");
            const isHighlighted = highlightedHitNomor === (h.nomor || i + 1);
            const hitRadius = isHighlighted ? 3 : 2.2;

            let hitColor = "#eab308";
            if (isBull) hitColor = "#ef4444";
            else if (h.poin >= 9) hitColor = "#10b981";
            else if (h.poin >= 8) hitColor = "#06b6d4";

            return (
              <g
                key={i}
                style={{ cursor: "pointer" }}
                onClick={() =>
                  setHighlightedHitNomor(
                    highlightedHitNomor === (h.nomor || i + 1)
                      ? null
                      : h.nomor || i + 1
                  )
                }
                onMouseEnter={() => setHighlightedHitNomor(h.nomor || i + 1)}
                onMouseLeave={() => setHighlightedHitNomor(null)}
              >
                <title>{`Peluru #${h.nomor || i + 1}: Skor ${h.poin} (Ring ${h.ring}) | Jarak: ${h.jarak_pusat_mm !== null && h.jarak_pusat_mm !== undefined ? `${h.jarak_pusat_mm} mm` : "-"} | Koordinat: (${h.rawX?.toFixed(1) || h.x.toFixed(1)}, ${h.rawY?.toFixed(1) || h.y.toFixed(1)})`}</title>

                {isHighlighted && (
                  <circle
                    cx={h.x}
                    cy={h.y}
                    r={hitRadius + 2.0}
                    fill="rgba(0, 242, 254, 0.3)"
                    stroke="#00f2fe"
                    strokeWidth="1.0"
                    filter="url(#shotGlow)"
                  />
                )}

                <circle
                  cx={h.x}
                  cy={h.y}
                  r={hitRadius}
                  fill={hitColor}
                  stroke={isHighlighted ? "#ffffff" : "#0f172a"}
                  strokeWidth={isHighlighted ? 0.75 : 0.5}
                  filter={isBull ? "url(#bullGlow)" : undefined}
                />

                <circle
                  cx={h.x}
                  cy={h.y}
                  r={0.7}
                  fill={isBull ? "#ffffff" : "#991b1b"}
                />

                <text
                  x={h.x}
                  y={h.y}
                  fill="#ffffff"
                  fontSize={isHighlighted ? "3.2" : "0"}
                  fontWeight="900"
                  textAnchor="middle"
                  pointerEvents="none"
                  style={{
                    filter: "drop-shadow(0 1px 2px rgba(0,0,0,1))",
                    fontFamily: "monospace",
                  }}
                >
                  {h.nomor || i + 1}
                </text>
              </g>
            );
          })
        )}
      </svg>
    );
  };

  // Helper render foto anotasi kamera untuk Mode Individual (Disesuaikan untuk Monitor Atas Jalur)
  const renderPhotoTarget = (shooter) => {
    if (!shooter) return null;
    const fotoUrl = shooter.currentBabakFoto
      ? getFotoUrl(shooter.currentBabakFoto)
      : null;

    if (!fotoUrl) {
      return (
        <div className="text-center py-5 text-secondary">
          <i className="bi bi-camera-video-off fs-1 d-block mb-3 text-secondary opacity-50"></i>
          <p className="fs-6 mb-1 text-light fw-bold">Belum Ada Foto Deteksi Kamera</p>
          <span className="small text-white-50" style={{ fontSize: "0.85rem" }}>
            Foto anotasi AI akan otomatis muncul saat sasaran diunggah atau terdeteksi
          </span>
        </div>
      );
    }

    return (
      <div className="position-relative w-100 text-center">
        <img
          src={fotoUrl}
          alt={`Foto Kamera Lane ${shooter.lane}`}
          className="img-fluid rounded-4 shadow-lg w-100 h-auto border border-secondary border-opacity-50"
          style={{ maxHeight: "560px", minHeight: "430px", objectFit: "contain" }}
        />
        <a
          href={fotoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm btn-dark position-absolute bottom-0 end-0 m-3 py-1 px-3 border border-secondary shadow-lg opacity-90 fw-bold"
          style={{ fontSize: "0.82rem" }}
          title="Buka foto resolusi penuh di tab baru"
        >
          <i className="bi bi-arrows-angle-expand me-1 text-info"></i> Perbesar Foto
        </a>
      </div>
    );
  };

  // Helper render catatan analisis taktis untuk Mode Individual (Disesuaikan untuk Monitor Atas Jalur)
  const renderIndividualAnalysis = (shooter) => {
    const rawCatatan =
      shooter?.currentBabakCatatan || shooter?.currentBabakBallistics?.catatan;
    const parsed = parseCatatanAnalisis(rawCatatan);
    const hasCatatan = Boolean(
      rawCatatan && (parsed.items.length > 0 || parsed.warning)
    );

    return (
      <div
        className="card border-0 shadow-lg rounded-4 overflow-hidden h-100"
        style={{
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          border: "1px solid rgba(14, 165, 233, 0.25)",
        }}
      >
        <div
          className="card-header py-2 px-3 border-secondary border-opacity-25 d-flex justify-content-between align-items-center"
          style={{ backgroundColor: "rgba(10, 15, 29, 0.95)" }}
        >
          <span
            className="fw-bold text-info d-flex align-items-center gap-2"
            style={{ fontSize: "0.92rem", letterSpacing: "0.4px" }}
          >
            <i className="bi bi-chat-left-text-fill text-info fs-5"></i>
            Catatan Analisis & Rekomendasi Taktis:
          </span>
          {shooter?.currentBabakBallistics?.status && (
            <span
              className="badge bg-primary text-white px-2 py-1 fw-bold text-uppercase"
              style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}
            >
              {shooter.currentBabakBallistics.status}
            </span>
          )}
        </div>
        <div className="card-body p-3 d-flex flex-column justify-content-start">
          {hasCatatan ? (
            <div>
              {parsed.warning && (
                <div
                  className="alert alert-warning py-2 px-3 mb-3 border border-warning border-opacity-50 text-warning-emphasis d-flex align-items-start gap-2 rounded-3"
                  style={{
                    fontSize: "0.92rem",
                    backgroundColor: "rgba(234, 179, 8, 0.15)",
                    lineHeight: 1.5,
                  }}
                >
                  <i
                    className="bi bi-exclamation-triangle-fill text-warning flex-shrink-0 fs-5 mt-0"
                  ></i>
                  <div>
                    <strong className="text-warning fw-bold">Peringatan Kuota Peluru:</strong>{" "}
                    {parsed.warning.replace(
                      /^Peringatan Kuota Peluru:\s*/i,
                      ""
                    )}
                  </div>
                </div>
              )}

              {parsed.items.length > 1 ? (
                <ul
                  className="mb-0 ps-0 list-unstyled d-flex flex-column gap-2"
                >
                  {parsed.items.map((item, idx) => (
                    <li
                      key={idx}
                      className="d-flex align-items-start gap-2 text-white"
                      style={{ fontSize: "0.96rem", lineHeight: 1.6 }}
                    >
                      <i className="bi bi-chevron-right text-info fw-bold flex-shrink-0 mt-1"></i>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p
                  className="mb-0 text-white"
                  style={{ fontSize: "0.96rem", lineHeight: 1.6 }}
                >
                  {parsed.items[0] || rawCatatan}
                </p>
              )}
            </div>
          ) : (
            <div
              className="text-white-50 py-3 text-center"
              style={{ fontSize: "0.9rem" }}
            >
              <i className="bi bi-info-circle me-1 text-info"></i> Belum ada catatan analisis tembakan untuk babak ini. Catatan akan otomatis diperbarui saat sistem SITRAK menganalisis sasaran.
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper render tabel rincian perkenaan tembakan untuk Mode Individual (Disesuaikan untuk Monitor Atas Jalur)
  const renderShotByShotTable = (shooter) => {
    const hits = shooter?.currentBabakHits || [];

    if (hits.length === 0) {
      return (
        <div className="text-center py-5 text-white-50 fs-6 fst-italic">
          <i className="bi bi-inbox fs-2 d-block mb-2 text-secondary opacity-50"></i>
          Belum ada data butir tembakan pada babak ini
        </div>
      );
    }

    // Hitung agregasi distribusi perkenaan per poin
    const pointMap = {};
    let totalScore = 0;

    hits.forEach((h, hIdx) => {
      const p = h.poin !== undefined && h.poin !== null ? Math.round(Number(h.poin)) : 0;
      totalScore += p;
      if (!pointMap[p]) {
        pointMap[p] = {
          poin: p,
          count: 0,
          totalSubtotal: 0,
          shots: [],
          ringLabel: h.ring || (p === 10 ? "10 / X" : String(p)),
        };
      }
      pointMap[p].count += 1;
      pointMap[p].totalSubtotal += p;
      pointMap[p].shots.push({
        nomor: h.nomor || hIdx + 1,
        poin: p,
        ring: h.ring,
        jarak_pusat_mm: h.jarak_pusat_mm,
        rawHit: h,
      });
    });

    // Urutkan poin dari tertinggi (10) ke terendah (0)
    const sortedPoints = Object.values(pointMap).sort((a, b) => b.poin - a.poin);
    const totalHits = hits.length;
    const avgScore = totalHits > 0 ? (totalScore / totalHits).toFixed(1) : "0.0";

    // Mode Detail Koordinat Butir per Butir
    if (shotTableViewMode === "detail") {
      return (
        <div className="table-responsive">
          <table
            className="table table-dark table-hover mb-0 align-middle"
            style={{ fontSize: "0.88rem" }}
          >
            <thead
              className="table-dark text-white border-bottom border-secondary"
              style={{ fontSize: "0.78rem", letterSpacing: "0.6px" }}
            >
              <tr>
                <th className="text-center py-2 text-uppercase" style={{ width: "45px" }}>
                  #
                </th>
                <th className="text-center py-2 text-uppercase" style={{ width: "65px" }}>
                  Skor
                </th>
                <th className="text-center py-2 text-uppercase">Zona</th>
                <th className="text-center py-2 text-uppercase">Jarak</th>
                <th className="text-center py-2 text-uppercase">Koordinat</th>
                <th className="text-center py-2 text-uppercase" style={{ width: "55px" }}>
                  Sorot
                </th>
              </tr>
            </thead>
            <tbody>
              {hits.map((h, hIdx) => {
                const isBull =
                  h.poin === 10 ||
                  h.ring === "10" ||
                  String(h.ring).toLowerCase().includes("bull");
                const isSelected = highlightedHitNomor === (h.nomor || hIdx + 1);

                return (
                  <tr
                    key={hIdx}
                    style={{
                      cursor: "pointer",
                      backgroundColor: isSelected
                        ? "rgba(6, 182, 212, 0.28)"
                        : undefined,
                    }}
                    onMouseEnter={() =>
                      setHighlightedHitNomor(h.nomor || hIdx + 1)
                    }
                    onMouseLeave={() => setHighlightedHitNomor(null)}
                    onClick={() =>
                      setHighlightedHitNomor(
                        isSelected ? null : h.nomor || hIdx + 1
                      )
                    }
                  >
                    <td className="text-center font-monospace fw-bold fs-6 text-warning">
                      #{h.nomor || hIdx + 1}
                    </td>
                    <td className="text-center">
                      <span
                        className={`badge font-monospace fs-6 px-2 py-0 ${isBull
                          ? "bg-danger text-white border border-danger shadow-sm fw-black"
                          : h.poin >= 9
                            ? "bg-success text-white shadow-sm fw-bold"
                            : h.poin >= 8
                              ? "bg-info text-dark fw-bold shadow-sm"
                              : "bg-warning text-dark fw-bold shadow-sm"
                          }`}
                      >
                        {h.poin}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="badge bg-black border border-secondary text-white font-monospace fs-6 px-2 py-0">
                        {h.ring || "-"}
                      </span>
                    </td>
                    <td className="text-center font-monospace fw-bold text-white fs-6">
                      {h.jarak_pusat_mm !== null &&
                        h.jarak_pusat_mm !== undefined
                        ? `${h.jarak_pusat_mm}mm`
                        : "-"}
                    </td>
                    <td
                      className="text-center font-monospace text-light opacity-90"
                      style={{ fontSize: "0.8rem" }}
                    >
                      ({(h.rawX ?? h.x).toFixed(1)}, {(h.rawY ?? h.y).toFixed(1)})
                    </td>
                    <td className="text-center">
                      <button
                        type="button"
                        className={`btn btn-sm py-0 px-1 ${isSelected
                          ? "btn-info text-dark fw-bold"
                          : "btn-outline-secondary text-light"
                          }`}
                        style={{ fontSize: "0.75rem" }}
                        title="Sorot tembakan pada lesan"
                      >
                        <i className="bi bi-eye"></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    // Default Mode: Distribusi Rincian Perkenaan Tembakan (Poin 10 : X butir, Poin 9 : Y butir, dst)
    return (
      <div className="d-flex flex-column h-100">
        {/* Tabel Distribusi Rincian Poin - Tidak Scrollable */}
        <div className="table-responsive">
          <table
            className="table table-dark table-hover mb-0 align-middle"
            style={{ fontSize: "0.9rem" }}
          >
            <thead
              className="table-dark text-white border-bottom border-secondary"
              style={{
                fontSize: "0.78rem",
                letterSpacing: "0.6px",
                backgroundColor: "rgba(15, 23, 42, 0.98)",
              }}
            >
              <tr>
                <th className="py-2 px-2 text-uppercase" style={{ width: "90px" }}>
                  Poin
                </th>
                <th className="text-center py-2 text-uppercase" style={{ width: "105px" }}>
                  Jml
                </th>
                <th className="text-center py-2 text-uppercase" style={{ width: "80px" }}>
                  Subtotal
                </th>
                <th className="py-2 px-2 text-uppercase" style={{ minWidth: "110px" }}>
                  Nomor Butir
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPoints.map((item) => {
                const percentage = totalHits > 0 ? ((item.count / totalHits) * 100).toFixed(0) : 0;
                const isTen = item.poin === 10;
                const isNine = item.poin === 9;
                const isEight = item.poin === 8;

                const badgeBg = isTen
                  ? "bg-danger text-white border border-danger shadow-sm"
                  : isNine
                    ? "bg-success text-white"
                    : isEight
                      ? "bg-info text-dark"
                      : item.poin >= 7
                        ? "bg-warning text-dark"
                        : "bg-secondary text-white";

                const progressBarColor = isTen
                  ? "bg-danger"
                  : isNine
                    ? "bg-success"
                    : isEight
                      ? "bg-info"
                      : item.poin >= 7
                        ? "bg-warning"
                        : "bg-secondary";

                return (
                  <tr
                    key={item.poin}
                    className="border-bottom border-secondary border-opacity-20"
                  >
                    {/* Kolom Poin / Ring */}
                    <td className="px-2">
                      <div className="d-flex align-items-center gap-1">
                        <span
                          className={`badge font-monospace px-2 py-1 fw-black fs-6 ${badgeBg}`}
                          style={{ minWidth: "32px", textAlign: "center" }}
                        >
                          {item.poin}
                        </span>
                      </div>
                    </td>

                    {/* Kolom Jumlah Perkenaan (Besar & Jelas untuk Monitor Layar Jalur) */}
                    <td className="text-center">
                      <div className="d-inline-flex align-items-baseline gap-1 bg-black bg-opacity-40 px-2 py-0 rounded-2 border border-secondary border-opacity-30">
                        <span className="fw-black text-warning font-monospace fs-5">
                          {item.count}
                        </span>
                      </div>
                    </td>

                    {/* Kolom Subtotal Poin */}
                    <td className="text-center">
                      <span className="fw-bold font-monospace text-info fs-6">
                        +{item.totalSubtotal}
                      </span>
                    </td>

                    {/* Kolom Nomor Butir Peluru (Interaktif) */}
                    <td className="px-2">
                      <div className="d-flex flex-wrap gap-1">
                        {item.shots.map((s) => {
                          const isHighlighted = highlightedHitNomor === s.nomor;
                          return (
                            <button
                              key={s.nomor}
                              type="button"
                              className={`btn btn-sm py-0 px-1 font-monospace fw-bold rounded-pill transition-all ${isHighlighted
                                ? "btn-info text-dark shadow border border-white"
                                : "btn-outline-secondary text-light border-opacity-50"
                                }`}
                              style={{
                                fontSize: "0.78rem",
                                transform: isHighlighted ? "scale(1.12)" : "scale(1)",
                                zIndex: isHighlighted ? 2 : 1,
                              }}
                              title={`Tembakan #${s.nomor} (Ring ${s.ring || s.poin}, Jarak: ${s.jarak_pusat_mm ?? "-"
                                }mm) - Klik untuk sorot pada lesan`}
                              onMouseEnter={() => setHighlightedHitNomor(s.nomor)}
                              onMouseLeave={() => setHighlightedHitNomor(null)}
                              onClick={() =>
                                setHighlightedHitNomor(isHighlighted ? null : s.nomor)
                              }
                            >
                              #{s.nomor}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Footer Total Rekap Babak */}
            <tfoot
              className="border-top-2 border-secondary"
              style={{
                backgroundColor: "rgba(10, 15, 29, 0.98)",
              }}
            >
              <tr className="fw-bold">
                <td className="px-2 text-uppercase text-secondary small" style={{ fontSize: "0.78rem" }}>
                  TOTAL
                </td>
                <td className="text-center">
                  <span className="fw-black text-white font-monospace fs-6">
                    {totalHits}
                  </span>
                  <span className="text-white-50 small ms-1" style={{ fontSize: "0.75rem" }}>btr</span>
                </td>
                <td className="text-white-50 small" style={{ fontSize: "0.78rem" }}>
                  Avg: <span className="text-warning fw-bold font-monospace">{avgScore}</span>
                </td>
                <td className="text-center">
                  <span className="fw-black text-warning font-monospace fs-6">
                    {totalScore}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  // Helper render tabel rekap seluruh babak untuk penembak aktif (Disesuaikan untuk Monitor Atas Jalur)
  const renderMultiRoundTable = (shooter) => {
    const babakScores = shooter?.babak_scores || [];

    if (babakScores.length === 0) {
      return (
        <div className="text-center py-4 text-white-50 fs-6 fst-italic">
          Belum ada riwayat babak
        </div>
      );
    }

    return (
      <div className="table-responsive">
        <table
          className="table table-dark table-hover mb-0 align-middle"
          style={{ fontSize: "0.92rem" }}
        >
          <thead
            className="table-dark text-white border-bottom border-secondary"
            style={{ fontSize: "0.82rem", letterSpacing: "0.8px" }}
          >
            <tr>
              <th className="py-2 text-uppercase">Babak Latihan</th>
              <th className="text-center py-2 text-uppercase">Peluru</th>
              <th className="text-center py-2 text-uppercase">Skor</th>
              <th className="text-center py-2 text-uppercase">Akurasi</th>
              <th className="text-center py-2 text-uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {babakScores.map((bs, bIdx) => {
              const isCurrentBabak =
                String(bs.id_babak) === String(currentBabak?.id_babak) ||
                String(bs.nomor) === String(currentBabak?.nomor_babak);

              return (
                <tr
                  key={bIdx}
                  style={{
                    backgroundColor: isCurrentBabak
                      ? "rgba(59, 130, 246, 0.22)"
                      : undefined,
                  }}
                >
                  <td className="fw-bold text-white fs-6">
                    Babak {bs.nomor}: {bs.nama}
                    {isCurrentBabak && (
                      <span
                        className="badge bg-primary text-white ms-2 px-2 py-0 fw-bold"
                        style={{ fontSize: "0.72rem" }}
                      >
                        Aktif
                      </span>
                    )}
                  </td>
                  <td className="text-center font-monospace fw-semibold text-light fs-6">
                    {bs.hits?.length || 0} / {bs.peluru || 10}
                  </td>
                  <td className="text-center font-monospace fw-bold text-white fs-6">
                    {bs.skor}{" "}
                    <span className="text-white-50 fw-normal">
                      /{bs.max_skor}
                    </span>
                  </td>
                  <td className="text-center font-monospace fw-bold text-success fs-6">
                    {bs.akurasi}%
                  </td>
                  <td className="text-center">
                    <button
                      type="button"
                      className={`btn btn-sm py-1 px-3 fw-bold ${isCurrentBabak
                        ? "btn-primary disabled shadow-sm"
                        : "btn-outline-primary"
                        }`}
                      style={{ fontSize: "0.78rem" }}
                      onClick={() => {
                        if (bs.id_babak || bs.nomor) {
                          setActiveBabakId(String(bs.id_babak || bs.nomor));
                          setHighlightedHitNomor(null);
                        }
                      }}
                    >
                      {isCurrentBabak ? "Dipilih" : "Buka Babak"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
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
              <div className="d-flex justify-content-between mb-1">
                <span className="text-secondary">Nama Sesi:</span>
                <strong className="text-white">{sesi.nama_sesi}</strong>
              </div>
              <div className="d-flex justify-content-between mb-1">
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
      {showToolbar ? (
        <>
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
                    className="text-light d-flex align-items-center gap-2 flex-wrap mt-0"
                    style={{ fontSize: "0.88rem" }}
                  >
                    <span>
                      <i className="bi bi-geo-alt-fill me-1 text-danger"></i>
                      {sesi.nama_tempat_menembak}
                    </span>
                    <span className="text-white-50">•</span>
                    <span>
                      <i className="bi bi-crosshair me-1 text-primary"></i>
                      {sesi.model_senjata} ({sesi.kaliber})
                    </span>
                    <span className="text-white-50">•</span>
                    <span>
                      <i className="bi bi-arrows-expand me-1 text-warning"></i>
                      {sesi.jarak_meter} Meter
                    </span>
                    <span className="text-white-50">•</span>
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

                {/* TOMBOL TOGGLE HIDE/SHOW TOOLBAR */}
                <button
                  type="button"
                  className={`btn btn-sm d-flex align-items-center gap-1 shadow-sm px-2 ${showToolbar
                    ? "btn-outline-secondary text-light bg-dark"
                    : "btn-info text-dark fw-bold"
                    }`}
                  onClick={() => setShowToolbar(!showToolbar)}
                  title={
                    showToolbar
                      ? "Sembunyikan Toolbar & Kontrol Gelombang (Pintasan: 'H')"
                      : "Tampilkan Toolbar & Kontrol Gelombang (Pintasan: 'H')"
                  }
                >
                  <i className={`bi ${showToolbar ? "bi-eye-slash" : "bi-eye"}`}></i>
                  <span className="d-none d-sm-inline">
                    {showToolbar ? "Hide Toolbar" : "Show Toolbar"}
                  </span>
                  <i
                    className={`bi ${showToolbar ? "bi-chevron-up" : "bi-chevron-down"
                      } small ms-0.5`}
                  ></i>
                </button>

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
                    Gel {g.nomor_gelombang}
                    <span className="badge ms-1 bg-black bg-opacity-50 text-white-50">
                      {g.penembak?.length || 0} <i class="bi bi-person-fill"></i>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Pilihan Babak */}
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="small text-secondary fw-semibold text-uppercase tracking-wider">
                Babak Latihan :
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
                      [{b.nomor_babak}] {b.nama_babak}
                      <span className="badge ms-1 bg-black bg-opacity-50 text-white-50">
                        {b.jumlah_peluru || 10} Butir
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* View Mode, Layout Mode, & Sorting Control */}
            <div className="d-flex align-items-center gap-2 ms-md-auto flex-wrap">
              {/* Layout Mode: Grid Semua Lane vs Per Orang */}
              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className={`btn ${scoringViewMode === "grid"
                    ? "btn-primary fw-bold text-white shadow-sm"
                    : "btn-outline-secondary text-light bg-dark"
                    }`}
                  onClick={() => setScoringViewMode("grid")}
                  title="Tampilkan semua jalur latihan sekaligus (Mode Grid)"
                >
                  <i className="bi bi-grid-3x3-gap-fill me-1"></i> Semua Lane
                </button>
                <button
                  type="button"
                  className={`btn ${scoringViewMode === "individual"
                    ? "btn-warning fw-bold text-dark shadow-sm"
                    : "btn-outline-secondary text-light bg-dark"
                    }`}
                  onClick={() => {
                    setScoringViewMode("individual");
                    if (!selectedShooterId && displayedShooters.length > 0) {
                      setSelectedShooterId(displayedShooters[0].id_personel_penembak);
                    }
                  }}
                  title="Fokus detail tembakan per penembak (Livescore Per Orang)"
                >
                  <i className="bi bi-person-bounding-box me-1"></i> Per Orang
                </button>
              </div>

              {/* Visualizer Mode: SVG / Foto AI / Split */}
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

              {/* Sorting Control (Hanya relevan di Mode Grid) */}
              {scoringViewMode === "grid" && (
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
              )}
            </div>
          </div>

          {/* 3. PODIUM & STATISTIK GELOMBANG STRIP */}
          <div
            className="px-3 px-md-4 py-2 border-bottom border-secondary border-opacity-25 text-secondary d-flex justify-content-between align-items-center flex-wrap gap-2"
            style={{ backgroundColor: "rgba(10, 15, 29, 0.9)" }}
          >
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <span>
                Rerata Skor Gelombang:{" "}
                <strong className="text-primary fs-6">{avgWaveScore}</strong> /{" "}
                {(currentBabak?.jumlah_peluru || 10) * 10}
              </span>
              <span>•</span>
              <span>
                Rerata Akurasi:{" "}
                <strong className="text-success fs-6">{avgWaveAccuracy}%</strong>
              </span>
            </div>

            {scoringViewMode === "individual" && activeShooter && (
              <div className="d-flex align-items-center gap-2">
                <span
                  className="badge bg-warning text-dark fw-bold py-1 px-2 d-flex align-items-center gap-1 shadow-sm"
                  style={{ fontSize: "0.75rem" }}
                >
                  <i className="bi bi-person-fill"></i>
                  <span>Fokus: Jalur {activeShooter.lane} - {activeShooter.nama}</span>
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary text-light py-0 px-2"
                  style={{ fontSize: "0.75rem" }}
                  onClick={() => setScoringViewMode("grid")}
                >
                  <i className="bi bi-grid-3x3-gap me-1"></i> Semua Lane
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        /* STATUS STRIP RINGKAS SAAT TOOLBAR DI-HIDE */
        <></>
      )}

      {/* 4. MAIN LIVE SCOREBOARD: GRID SEMUA LANE ATAU FOKUS INDIVIDUAL PER ORANG */}
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
        ) : scoringViewMode === "individual" && activeShooter ? (
          /* ============================================================ */
          /* MODE FOKUS PERORANGAN (LIVESCORE PER ORANG / MONITOR JALUR)  */
          /* ============================================================ */
          <div className="d-flex flex-column gap-3">
            {/* B. KARTU IDENTITAS PENEMBAK & LIVE KPI BANNER BESAR */}
            <div
              className="card border-0 shadow-2xl p-3 rounded-4 overflow-hidden position-relative"
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.98)",
                backgroundImage:
                  "radial-gradient(ellipse at 10% 20%, rgba(14, 165, 233, 0.16) 0%, rgba(15, 23, 42, 0.99) 70%)",
                border: "1px solid rgba(14, 165, 233, 0.35)",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.7)",
              }}
            >
              <div className="d-flex flex-wrap align-items-xl-center justify-content-between">
                {/* Identitas Penembak & Badge Jalur Besar */}
                <div className="col-12 col-lg-6 d-flex align-items-center gap-3 p-1">
                  <div
                    className="d-flex flex-column align-items-center justify-content-center px-3 py-2 rounded-4 shadow-lg border border-warning"
                    style={{
                      background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                      color: "#0f172a",
                      minWidth: "120px",
                      boxShadow: "0 0 25px rgba(245, 158, 11, 0.35)",
                    }}
                  >
                    <span
                      className="fs-4 fw-bold text-uppercase"
                      style={{ fontSize: "0.82rem", letterSpacing: "2.5px" }}
                    >
                      LANE
                    </span>
                    <span className="fw-bold lh-1" style={{ fontSize: "3.5rem" }}>
                      {activeShooter.lane}
                    </span>
                  </div>

                  <div>
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                      <h2
                        className="fw-black text-white mb-0"
                        style={{ fontSize: "1.75rem", letterSpacing: "0.5px" }}
                      >
                        {activeShooter.nama}
                      </h2>
                      {renderBadgeKategori(activeShooter.currentKategori)}
                    </div>
                    <div
                      className="text-light d-flex align-items-center gap-2 flex-wrap"
                      style={{ fontSize: "0.95rem" }}
                    >
                      <span>
                        {" "}
                        <strong className="text-white font-monospace">
                          {activeShooter.nrp || "-"}
                        </strong>
                      </span>
                      <span className="text-white-50">•</span>
                      <span>
                        {" "}
                        <strong className="text-white">
                          {activeShooter.satuan || "-"}
                        </strong>
                      </span>
                      <span>
                        {" "}
                        <span
                          className="badge bg-warning text-dark fw-bold px-2 py-1"
                          style={{ fontSize: "0.85rem" }}
                        >
                          Babak {currentBabak?.nomor_babak}: {currentBabak?.nama_babak}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4 Mini KPI Cards (Angka Besar Kontras Tinggi) */}
                <div
                  className="col-12 col-lg-6 d-flex flex-wrap p-1"
                >
                  <div className="col-6 col-sm-3 p-1">
                    <div
                      className="p-2 rounded-3 text-center border border-warning border-opacity-30 h-100"
                      style={{ backgroundColor: "rgba(10, 15, 29, 0.85)" }}
                    >
                      <span
                        className="fw-bold text-warning text-uppercase d-block"
                        style={{ fontSize: "0.76rem", letterSpacing: "0.8px" }}
                      >
                        <i className="bi bi-bullseye me-1"></i> Skor
                      </span>
                      <div className="my-1">
                        <span
                          className="fw-black text-warning font-monospace"
                          style={{ fontSize: "2.5rem", lineHeight: 1 }}
                        >
                          {activeShooter.currentBabakScore}
                        </span>
                        <span className="text-white-50 fs-6 fw-bold">
                          /{activeShooter.currentBabakMax}
                        </span>
                      </div>
                      <div
                        className="progress bg-black bg-opacity-75 my-1"
                        style={{ height: "6px" }}
                      >
                        <div
                          className="progress-bar bg-warning shadow-sm"
                          style={{
                            width: `${Math.min(
                              100,
                              (activeShooter.currentBabakScore /
                                (activeShooter.currentBabakMax || 1)) *
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <span
                        className="text-white-50 d-block"
                        style={{ fontSize: "0.78rem" }}
                      >
                        Akurasi:{" "}
                        <strong className="text-warning font-monospace">
                          {activeShooter.currentBabakAkurasi}%
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="col-6 col-sm-3 p-1">
                    <div
                      className="p-2 rounded-3 text-center border border-danger border-opacity-30 h-100"
                      style={{ backgroundColor: "rgba(10, 15, 29, 0.85)" }}
                    >
                      <span
                        className="fw-bold text-danger text-uppercase d-block"
                        style={{ fontSize: "0.76rem", letterSpacing: "0.8px" }}
                      >
                        <i className="bi bi-star-fill me-1"></i> Bullseye
                      </span>
                      <div className="my-1">
                        <span
                          className="fw-black text-danger font-monospace"
                          style={{ fontSize: "2.1rem", lineHeight: 1 }}
                        >
                          {activeShooter.currentBabakBullseye}
                        </span>
                        <span className="text-white-50 fs-6 fw-bold"> Butir</span>
                      </div>
                      <span
                        className="text-white-50 d-block mt-2"
                        style={{ fontSize: "0.78rem" }}
                      >
                        Peluru:{" "}
                        <strong className="text-white font-monospace">
                          {activeShooter.currentBabakHits.length}
                        </strong>{" "}
                        / {currentBabak?.jumlah_peluru || 10}
                      </span>
                    </div>
                  </div>

                  <div className="col-6 col-sm-3 p-1">
                    <div
                      className="p-2 rounded-3 text-center border border-info border-opacity-30 h-100"
                      style={{ backgroundColor: "rgba(10, 15, 29, 0.85)" }}
                    >
                      <span
                        className="fw-bold text-info text-uppercase d-block"
                        style={{ fontSize: "0.76rem", letterSpacing: "0.8px" }}
                      >
                        <i className="bi bi-compass me-1"></i> Grp   & MPI
                      </span>
                      <div className="my-1">
                        <span
                          className="fw-black text-info font-monospace"
                          style={{ fontSize: "2.0rem", lineHeight: 1 }}
                        >
                          ±{activeShooter.currentBabakBallistics.grouping ?? "-"}
                        </span>
                        <span className="text-white-50 fs-6 fw-bold"> mm</span>
                      </div>
                      <span
                        className="text-white-50 d-block mt-2 font-monospace"
                        style={{ fontSize: "0.72rem" }}
                      >
                        X:{" "}
                        {activeShooter.currentBabakBallistics.offsetX > 0
                          ? `+${activeShooter.currentBabakBallistics.offsetX}`
                          : activeShooter.currentBabakBallistics.offsetX ?? 0}{" "}
                        | Y:{" "}
                        {activeShooter.currentBabakBallistics.offsetY > 0
                          ? `+${activeShooter.currentBabakBallistics.offsetY}`
                          : activeShooter.currentBabakBallistics.offsetY ?? 0}
                      </span>
                    </div>
                  </div>

                  <div className="col-6 col-sm-3 p-1">
                    <div
                      className="p-2 rounded-3 text-center border border-success border-opacity-30 h-100"
                      style={{ backgroundColor: "rgba(10, 15, 29, 0.85)" }}
                    >
                      <span
                        className="fw-bold text-success text-uppercase d-block"
                        style={{ fontSize: "0.76rem", letterSpacing: "0.8px" }}
                      >
                        <i className="bi bi-trophy-fill me-1"></i> Total Skor
                      </span>
                      <div className="my-1">
                        <span
                          className="fw-black text-success font-monospace"
                          style={{ fontSize: "2.1rem", lineHeight: 1 }}
                        >
                          {activeShooter.total_skor}
                        </span>
                        <span className="text-white-50 fs-6 fw-bold">
                          /{activeShooter.total_max}
                        </span>
                      </div>
                      <span
                        className="text-white-50 d-block mt-2"
                        style={{ fontSize: "0.78rem" }}
                      >
                        Akurasi:{" "}
                        <strong className="text-success font-monospace">
                          {activeShooter.akurasi_akhir}%
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* C. DUA KOLOM: VISUAL TARGET DI KIRI & ANALISIS / TABEL DETAIL DI KANAN */}
            <div className="row g-3">
              {/* KOLOM KIRI: TARGET VISUALIZER & KAMERA DETEKSI BESAR */}
              <div className="col-12 col-lg-6">
                <div
                  className="card border-0 shadow-lg rounded-4 overflow-hidden h-100"
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                  }}
                >
                  <div
                    className="card-header py-3 px-3 border-secondary border-opacity-25 d-flex justify-content-between align-items-center flex-wrap gap-2"
                    style={{ backgroundColor: "rgba(10, 15, 29, 0.95)" }}
                  >
                    <span
                      className="fw-bold text-white d-flex align-items-center gap-2"
                      style={{ fontSize: "0.95rem" }}
                    >
                      <i className="bi bi-bullseye text-danger fs-5"></i>
                      Visualisasi Sasaran Tembak
                    </span>

                    <div className="btn-group btn-group-sm" role="group">
                      <button
                        type="button"
                        className={`btn ${viewMode === "svg"
                          ? "btn-info text-dark fw-bold shadow-sm"
                          : "btn-outline-secondary text-light py-1 px-2"
                          }`}
                        onClick={() => setViewMode("svg")}
                        style={{ fontSize: "0.8rem" }}
                      >
                        <i className="bi bi-bullseye me-1"></i> Lesan SVG
                      </button>
                      <button
                        type="button"
                        className={`btn ${viewMode === "foto"
                          ? "btn-info text-dark fw-bold shadow-sm"
                          : "btn-outline-secondary text-light py-1 px-2"
                          }`}
                        onClick={() => setViewMode("foto")}
                        style={{ fontSize: "0.8rem" }}
                      >
                        <i className="bi bi-camera me-1"></i> Foto AI
                      </button>
                      <button
                        type="button"
                        className={`btn ${viewMode === "split"
                          ? "btn-info text-dark fw-bold shadow-sm"
                          : "btn-outline-secondary text-light py-1 px-2"
                          }`}
                        onClick={() => setViewMode("split")}
                        style={{ fontSize: "0.8rem" }}
                      >
                        <i className="bi bi-layout-split me-1"></i> Split
                      </button>
                    </div>
                  </div>

                  <div className="card-body p-3 d-flex flex-column align-items-center">
                    {/* Render Berdasarkan ViewMode dengan Kontainer Besar */}
                    {viewMode === "split" ? (
                      <div className="row g-3 w-100 align-items-center">
                        <div className="col-12 col-md-6 text-center">
                          <div
                            className="bg-black rounded-4 p-2 shadow position-relative mx-auto border border-secondary border-opacity-25"
                            style={{ maxWidth: "460px" }}
                          >
                            {renderLargeSvgTarget(activeShooter)}
                            <span
                              className="text-white-50 d-block mt-2 fw-semibold"
                              style={{ fontSize: "0.82rem" }}
                            >
                              Lesan Vektor SVG
                            </span>
                          </div>
                        </div>
                        <div className="col-12 col-md-6 text-center">
                          <div
                            className="bg-black rounded-4 p-2 shadow d-flex flex-column align-items-center justify-content-center mx-auto border border-secondary border-opacity-25"
                            style={{ maxWidth: "460px", minHeight: "380px" }}
                          >
                            {renderPhotoTarget(activeShooter)}
                            <span
                              className="text-white-50 d-block mt-2 fw-semibold"
                              style={{ fontSize: "0.82rem" }}
                            >
                              Foto Deteksi SITRAK-Detect
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : viewMode === "foto" ? (
                      <div className="w-100 text-center">
                        <div
                          className="bg-black rounded-4 p-3 shadow-lg mx-auto d-flex flex-column align-items-center justify-content-center border border-secondary border-opacity-35"
                          style={{ maxWidth: "580px", minHeight: "440px" }}
                        >
                          {renderPhotoTarget(activeShooter)}
                        </div>
                      </div>
                    ) : (
                      <div className="w-100 text-center">
                        <div
                          className="bg-black rounded-4 shadow-2xl mx-auto position-relative border border-secondary border-opacity-35"
                          style={{
                            backgroundColor: "#05070f",
                            boxShadow:
                              "0 15px 35px rgba(0, 0, 0, 0.8), inset 0 0 50px rgba(0, 0, 0, 0.9)",
                          }}
                        >
                          {renderLargeSvgTarget(activeShooter)}
                        </div>
                      </div>
                    )}

                    {/* Ringkasan Indikator / Legend Target (Jelas & Terbaca) */}
                    <div className="mt-3 pt-2 border-top border-secondary border-opacity-25 w-100 d-flex flex-wrap justify-content-between align-items-center gap-2">
                      <div
                        className="d-flex align-items-center gap-2 flex-wrap"
                        style={{ fontSize: "0.84rem" }}
                      >
                        <span className="text-white-50 fw-semibold">Keterangan :</span>
                        <span className="badge bg-danger text-white px-2 py-1 fw-bold">
                          ● 10 / X (Bullseye)
                        </span>
                        <span className="badge bg-success text-white px-2 py-1 fw-bold">
                          ● Ring 9
                        </span>
                        <span className="badge bg-info text-dark px-2 py-1 fw-bold">
                          ● Ring 8
                        </span>
                        <span className="badge bg-warning text-dark px-2 py-1 fw-bold">
                          ● Ring ≤ 7
                        </span>
                      </div>
                      {highlightedHitNomor && (
                        <span
                          className="badge bg-info text-dark fw-bold px-2 py-1 shadow"
                          style={{ fontSize: "0.82rem" }}
                        >
                          Menyorot Peluru #{highlightedHitNomor}
                          <button
                            type="button"
                            className="btn-close btn-close-white ms-2"
                            style={{ fontSize: "0.6rem" }}
                            onClick={() => setHighlightedHitNomor(null)}
                          />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* KOLOM KANAN: CARD CATATAN ANALISIS & CARD RINCIAN PERKENAAN (BERSEBELAHAN) & REKAP BABAK */}
              <div className="col-12 col-lg-6 d-flex flex-column gap-3">
                {/* BARIS DUA CARD BERSEBELAHAN */}
                <div className="row g-3 align-items-stretch">
                  {/* 1. CATATAN ANALISIS TAKTIS */}
                  <div className="col-12 col-lg-6 d-flex flex-column">
                    {renderIndividualAnalysis(activeShooter)}
                  </div>

                  {/* 2. TABEL RINCIAN PERKENAAN TEMBAKAN */}
                  <div className="col-12 col-lg-6 d-flex flex-column">
                    <div
                      className="card border-0 shadow-lg rounded-4 overflow-hidden h-100"
                      style={{
                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                      }}
                    >
                      <div
                        className="card-header py-2 px-3 border-secondary border-opacity-25 d-flex flex-wrap justify-content-between align-items-center gap-2"
                        style={{ backgroundColor: "rgba(10, 15, 29, 0.95)" }}
                      >
                        <div className="d-flex align-items-center gap-1">
                          <i className="bi bi-pie-chart-fill text-warning fs-6"></i>
                          <span
                            className="fw-bold text-warning"
                            style={{ fontSize: "0.92rem" }}
                          >
                            Rincian Perkenaan (B{currentBabak?.nomor_babak})
                          </span>
                          <span
                            className="badge bg-secondary-subtle text-light border border-secondary px-1 py-0 fw-bold"
                            style={{ fontSize: "0.75rem" }}
                          >
                            {activeShooter.currentBabakHits.length} Butir
                          </span>
                        </div>

                        <div className="btn-group btn-group-sm" role="group" aria-label="Tampilan Rincian Tembakan">
                          <button
                            type="button"
                            className={`btn btn-sm py-0 px-2 ${shotTableViewMode === "breakdown"
                              ? "btn-warning text-dark fw-bold shadow-sm"
                              : "btn-outline-secondary text-light"
                              }`}
                            onClick={() => setShotTableViewMode("breakdown")}
                            title="Tampilkan distribusi rincian perkenaan poin"
                            style={{ fontSize: "0.76rem" }}
                          >
                            <i className="bi bi-pie-chart-fill me-1"></i> Poin
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm py-0 px-2 ${shotTableViewMode === "detail"
                              ? "btn-warning text-dark fw-bold shadow-sm"
                              : "btn-outline-secondary text-light"
                              }`}
                            onClick={() => setShotTableViewMode("detail")}
                            title="Tampilkan koordinat & jarak pusat tiap butir"
                            style={{ fontSize: "0.76rem" }}
                          >
                            <i className="bi bi-list-ol me-1"></i> Detail
                          </button>
                        </div>
                      </div>

                      <div className="card-body p-0 d-flex flex-column justify-content-between">
                        {renderShotByShotTable(activeShooter)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. REKAP SELURUH BABAK UNTUK PENEMBAK INI */}
                <div className="card border-0 shadow-lg rounded-4 overflow-hidden"
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                  }}
                >
                  <div
                    className="card-header py-3 px-3 border-secondary border-opacity-25 d-flex justify-content-between align-items-center"
                    style={{ backgroundColor: "rgba(10, 15, 29, 0.95)" }}
                  >
                    <span
                      className="fw-bold text-primary d-flex align-items-center gap-2"
                      style={{ fontSize: "0.95rem" }}
                    >
                      <i className="bi bi-clipboard2-data-fill text-primary fs-5"></i>
                      Rekapitulasi Riwayat Seluruh Babak Sesi Ini
                    </span>
                    <span
                      className="text-white-50"
                      style={{ fontSize: "0.8rem" }}
                    >
                      Klik babak untuk melihat detail live
                    </span>
                  </div>

                  <div className="card-body p-0">
                    {renderMultiRoundTable(activeShooter)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* MODE GRID (SEMUA LANE)                                       */
          /* ============================================================ */
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-5 g-3">
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
                    displayedShooters.length <= 4
                      ? "col"
                      : "col"
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
                        <button
                          className={`btn fw-bold fs-6 shadow-sm ${isTop3
                            ? "btn-warning text-dark"
                            : "btn-primary text-white"
                            }`}
                          onClick={() => {
                            setSelectedShooterId(shooter.id_personel_penembak);
                            setHighlightedHitNomor(null);
                            setScoringViewMode("individual");
                          }}
                        >
                          LANE {shooter.lane} &nbsp;&nbsp;
                          <i className="bi bi-arrow-right"></i>
                        </button>
                      </div>
                      <div className="d-flex justify-content-end align-items-center">
                        <div className="px-2 bg-black bg-opacity-25 rounded-3 border border-secondary border-opacity-25">
                          <div className="d-flex align-items-baseline gap-1">
                            <span className="display-6 fw-bold text-warning lh-1 font-monospace">
                              {shooter.currentBabakScore}
                            </span>
                            <span className="text-secondary fs-small">
                              / {shooter.currentBabakMax}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Informasi Identitas Penembak */}
                    <div className="px-3 pt-2 pb-1">
                      <div className="fw-bold text-white fs-6 text-truncate">
                        {shooter.nama}
                      </div>
                    </div>

                    {/* Score Bar Display (Skor Besar) */}
                    <div className="p-3 bg-black bg-opacity-25 mx-3 my-2 rounded-3 border border-secondary border-opacity-25">

                      {/* Info Tambahan: Butir & Bullseye */}
                      <div
                        className="d-flex justify-content-between align-items-center text-secondary"
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
                                  <circle cx="50" cy="50" r="48" fill="#f8fafc" stroke="#0f172a" strokeWidth="0.4" />
                                  <circle cx="50" cy="50" r="43.2" fill="#f1f5f9" stroke="#0f172a" strokeWidth="0.4" />
                                  <circle cx="50" cy="50" r="38.4" fill="#e2e8f0" stroke="#0f172a" strokeWidth="0.4" />
                                  <circle cx="50" cy="50" r="33.6" fill="#cbd5e1" stroke="#0f172a" strokeWidth="0.4" />
                                  <circle cx="50" cy="50" r="28.8" fill="#94a3b8" stroke="#0f172a" strokeWidth="0.4" />
                                  <circle cx="50" cy="50" r="24" fill="#09090b" stroke="#ffffff" strokeWidth="0.4" />
                                  <circle cx="50" cy="50" r="19.2" fill="#09090b" stroke="#ffffff" strokeWidth="0.4" />
                                  <circle cx="50" cy="50" r="14.4" fill="#09090b" stroke="#ffffff" strokeWidth="0.4" />
                                  <circle cx="50" cy="50" r="9.6" fill="#09090b" stroke="#ffffff" strokeWidth="0.4" />
                                  <circle cx="50" cy="50" r="4.8" fill="#dc2626" stroke="#ffffff" strokeWidth="0.4" />
                                  <circle cx="50" cy="50" r="2" fill="#991b1b" stroke="#ffffff" strokeWidth="0.4" />
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
                            <circle cx="50" cy="50" r="48" fill="#f8fafc" stroke="#0f172a" strokeWidth="0.4" />
                            <circle cx="50" cy="50" r="43.2" fill="#f1f5f9" stroke="#0f172a" strokeWidth="0.4" />
                            <circle cx="50" cy="50" r="38.4" fill="#e2e8f0" stroke="#0f172a" strokeWidth="0.4" />
                            <circle cx="50" cy="50" r="33.6" fill="#cbd5e1" stroke="#0f172a" strokeWidth="0.4" />
                            <circle cx="50" cy="50" r="28.8" fill="#94a3b8" stroke="#0f172a" strokeWidth="0.4" />
                            <circle cx="50" cy="50" r="24" fill="#09090b" stroke="#ffffff" strokeWidth="0.4" />
                            <circle cx="50" cy="50" r="19.2" fill="#09090b" stroke="#ffffff" strokeWidth="0.4" />
                            <circle cx="50" cy="50" r="14.4" fill="#09090b" stroke="#ffffff" strokeWidth="0.4" />
                            <circle cx="50" cy="50" r="9.6" fill="#09090b" stroke="#ffffff" strokeWidth="0.4" />
                            <circle cx="50" cy="50" r="4.8" fill="#dc2626" stroke="#ffffff" strokeWidth="0.4" />
                            <circle cx="50" cy="50" r="2" fill="#991b1b" stroke="#ffffff" strokeWidth="0.4" />
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
                  </div>
                </div>
              );
            })}
            {displayedShooters.length < 10 && (
              <>
                {Array.from({ length: 10 - displayedShooters.length }, (_, i) => (
                  /*<div key={`placeholder-${i}`} className="col">
                    <div
                      className="card h-100 border-0 shadow-lg position-relative overflow-hidden border-top border-secondary border-3"
                      style={{
                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                        borderRadius: "14px",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)"
                      }}
                    >
                      <div
                        className="p-3 border-bottom border-secondary border-opacity-25 d-flex justify-content-between align-items-center"
                        style={{ backgroundColor: "rgba(30, 41, 59, 0.5)" }}
                      >
                        <span className="text-secondary fw-semibold">LANE {i + 1}</span>
                        <span className="text-secondary small fst-italic">Belum ada data</span>
                      </div>
                      <div className="px-3 pt-2 pb-1">
                        <div className="fw-bold text-secondary fs-6 text-truncate">
                          Belum ada penembak
                        </div>
                      </div>
                      <div className="p-3 bg-black bg-opacity-25 mx-3 my-2 rounded-3 border border-secondary border-opacity-25">
                        <div className="d-flex justify-content-between align-items-center text-secondary" style={{ fontSize: "0.74rem" }}>
                          <span>Terdeteksi: - Butir</span>
                          <span>Bullseye: -x</span>
                        </div>
                      </div>
                      <div className="px-3 py-2 flex-grow-1 d-flex flex-column align-items-center justify-content-center">
                        <div className="bg-black rounded-3 p-2 w-100 text-center shadow position-relative" style={{ minHeight: "220px" }}>
                          <span className="text-secondary small fst-italic" style={{ fontSize: "0.68rem" }}>
                            Target belum tersedia
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>*/
                  <div
                    key={`placeholder-${i}`}
                    className="col"
                  >
                    <div
                      className="card h-100 border-0 shadow-lg position-relative overflow-hidden border-top border-secondary border-3 opacity-50"
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
                          <button
                            className="btn fw-bold fs-6 shadow-sm btn-secondary text-dark"
                          >
                            LANE {i + displayedShooters.length + 1} &nbsp;&nbsp;
                            <i className="bi bi-arrow-right"></i>
                          </button>
                        </div>
                        <div className="d-flex justify-content-end align-items-center">
                          <div className="px-2 bg-black bg-opacity-25 rounded-3 border border-secondary border-opacity-25">
                            <div className="d-flex align-items-baseline gap-1">
                              <span className="display-6 fw-bold text-seccondary lh-1 font-monospace">
                                -
                              </span>
                              <span className="text-secondary fs-small">
                                / -
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Informasi Identitas Penembak */}
                      <div className="px-3 pt-2 pb-1">
                        <div className="fw-bold text-secondary fs-6 text-truncate">
                          Belum ada penembak
                        </div>
                      </div>

                      {/* Score Bar Display (Skor Besar) */}
                      <div className="p-3 bg-black bg-opacity-25 mx-3 my-2 rounded-3 border border-secondary border-opacity-25">

                        {/* Info Tambahan: Butir & Bullseye */}
                        <div
                          className="d-flex justify-content-between align-items-center text-secondary"
                          style={{ fontSize: "0.74rem" }}
                        >
                          <span>
                            <i className="bi bi-circle-fill me-1 text-primary" style={{ fontSize: "0.5rem" }}></i>
                            Terdeteksi:{" "}
                            <strong className="text-light">
                              - Butir
                            </strong>
                          </span>
                          <span>
                            <i className="bi bi-star-fill me-1 text-danger"></i>
                            Bullseye:{" "}
                            <strong className="text-danger">
                              - x
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
                            <div className="d-flex flex-column align-items-center justify-content-center h-100 p-4 text-secondary">
                              <i className="bi bi-camera-video-off fs-1 mb-2 opacity-50"></i>
                              <span className="small">
                                Belum ada foto deteksi kamera
                              </span>
                            </div>

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
                                  <span className="text-secondary small fst-italic" style={{ fontSize: "0.68rem" }}>
                                    Foto belum ada
                                  </span>

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

                            </svg>

                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
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

