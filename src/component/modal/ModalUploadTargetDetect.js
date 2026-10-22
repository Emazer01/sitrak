import React, { useState, useEffect, useRef } from "react";
import {
  detectTargetViaUpload,
  getDetectApiUrl,
  checkDetectHealth,
  fetchAvailableEngines,
  selectBestShots,
  testGeminiApiKey,
} from "../../services/sitrakDetectService";
import {
  hasGeminiApiKey,
  getGeminiModel,
} from "../../services/apiConfig";


/**
 * Modal Unggah & Analisa Foto Perkenaan Target menggunakan Layanan SITRAK-Detect (Computer Vision)
 * Fitur:
 * - Pilih Personel Penembak & Babak terkait
 * - Pengaturan kaliber & jenis target
 * - Unggah foto target sasaran (drag-and-drop / file selector)
 * - Pemanggilan API POST /api/v1/detect/upload ke backend sitrak-detect
 * - Visualisasi citra beranotasi hasil OpenCV & canvas interaktif
 * - Kartu metrik (Total Skor, Grouping sebaran mm, Arah Bias, Akurasi)
 * - Saran & rekomendasi taktis instruktur menembak
 * - Terapkan nilai langsung ke sesi latihan aktif
 */
/**
 * Komponen Overlay Retikel & Garis Panduan Cincin Sasaran Tembak ISSF
 * Digunakan saat kamera langsung aktif untuk menyelaraskan gambar fisik target
 */
const TargetCameraOverlay = ({
  scale = 1,
  showGuide = true,
  targetType = "issf_standard_10_ring",
}) => {
  if (!showGuide) return null;

  // 10 cincin konsentris ISSF
  const rings = [
    { ring: 1, r: 240, label: "1" },
    { ring: 2, r: 216, label: "2" },
    { ring: 3, r: 192, label: "3" },
    { ring: 4, r: 168, label: "4" },
    { ring: 5, r: 144, label: "5" },
    { ring: 6, r: 120, label: "6" },
    { ring: 7, r: 96, label: "7" },
    { ring: 8, r: 72, label: "8" },
    { ring: 9, r: 48, label: "9" },
    { ring: 10, r: 24, label: "10" },
  ];

  return (
    <div
      className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ pointerEvents: "none", zIndex: 10 }}
    >
      <svg
        viewBox="0 0 600 600"
        className="w-100 h-100"
        style={{
          filter: "drop-shadow(0 0 2px rgba(0,0,0,0.85))",
          maxHeight: "100%",
        }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="hudGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="1.5"
              floodColor="#00f2fe"
              floodOpacity="0.85"
            />
          </filter>
        </defs>

        {/* 1. Bingkai Pembatas Sudut Kertas Sasaran (Corner Markers) */}
        <g stroke="#00f2fe" strokeWidth="2.5" fill="none" opacity="0.85">
          {/* Pojok Kiri Atas */}
          <path d="M 40 100 L 40 40 L 100 40" />
          {/* Pojok Kanan Atas */}
          <path d="M 500 40 L 560 40 L 560 100" />
          {/* Pojok Kiri Bawah */}
          <path d="M 40 500 L 40 560 L 100 560" />
          {/* Pojok Kanan Bawah */}
          <path d="M 500 560 L 560 560 L 560 500" />

          {/* Marker Tengah Sisi */}
          <line x1="300" y1="20" x2="300" y2="40" strokeDasharray="3 3" />
          <line x1="300" y1="560" x2="300" y2="580" strokeDasharray="3 3" />
          <line x1="20" y1="300" x2="40" y2="300" strokeDasharray="3 3" />
          <line x1="560" y1="300" x2="580" y2="300" strokeDasharray="3 3" />
        </g>

        {/* 2. Cincin Konsentris dan Retikel Sasaran (Dapat diskalakan dengan slider) */}
        <g
          transform={`scale(${scale})`}
          style={{
            transformOrigin: "300px 300px",
            transition: "transform 0.1s ease-out",
          }}
        >
          {/* Lingkaran Area Hitam Sasaran (Ring 7 s/d 10) */}
          <circle
            cx="300"
            cy="300"
            r="96"
            fill="rgba(0, 242, 254, 0.08)"
            stroke="#00f2fe"
            strokeWidth="2"
            strokeDasharray="4 2"
          />

          {/* Cincin-cincin Sasaran 1 s/d 10 */}
          {rings.map((item) => (
            <circle
              key={item.ring}
              cx="300"
              cy="300"
              r={item.r}
              fill="none"
              stroke="#00f2fe"
              strokeWidth={
                item.ring === 10 || item.ring === 7 || item.ring === 1
                  ? "2"
                  : "1"
              }
              strokeOpacity={item.ring >= 7 ? "0.95" : "0.55"}
            />
          ))}

          {/* Cincin Inner 10 / X Ring */}
          <circle
            cx="300"
            cy="300"
            r="12"
            fill="none"
            stroke="#00f2fe"
            strokeWidth="1.5"
            strokeDasharray="2 2"
            strokeOpacity="0.9"
          />

          {/* Angka Cincin pada Sumbu Horisontal & Vertikal */}
          <g
            fill="#00f2fe"
            fontSize="11"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            opacity="0.85"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((ringNum) => {
              const r = 24 * (11 - ringNum);
              return (
                <React.Fragment key={ringNum}>
                  <text x="300" y={300 - r + 11}>
                    {ringNum}
                  </text>
                  <text x="300" y={300 + r - 11}>
                    {ringNum}
                  </text>
                  <text x={300 - r + 11} y="300">
                    {ringNum}
                  </text>
                  <text x={300 + r - 11} y="300">
                    {ringNum}
                  </text>
                </React.Fragment>
              );
            })}
          </g>

          {/* Garis Retikel Silang (Crosshairs) */}
          <g stroke="#00f2fe" strokeWidth="1.2" strokeOpacity="0.75">
            {/* Garis Horizontal dengan Celah di Pusat Titik */}
            <line x1="50" y1="300" x2="280" y2="300" />
            <line x1="320" y1="300" x2="550" y2="300" />

            {/* Garis Vertikal dengan Celah di Pusat Titik */}
            <line x1="300" y1="50" x2="300" y2="280" />
            <line x1="300" y1="320" x2="300" y2="550" />

            {/* Tick Marks Sumbu */}
            {[72, 120, 168, 216].map((dist) => (
              <React.Fragment key={dist}>
                <line x1={300 - dist} y1="295" x2={300 - dist} y2="305" />
                <line x1={300 + dist} y1="295" x2={300 + dist} y2="305" />
                <line x1="295" y1={300 - dist} x2="305" y2={300 - dist} />
                <line x1="295" y1={300 + dist} x2="305" y2={300 + dist} />
              </React.Fragment>
            ))}
          </g>

          {/* Titik Pusat Bullseye (Merah Tajam & Cincin Neon) */}
          <circle cx="300" cy="300" r="3.5" fill="#ff3838" />
          <circle
            cx="300"
            cy="300"
            r="6.5"
            fill="none"
            stroke="#ff3838"
            strokeWidth="1.2"
            strokeOpacity="0.8"
          />
        </g>

        {/* 3. Label HUD Taktis */}
        <g fill="#00f2fe" fontSize="10" fontFamily="monospace" opacity="0.9">
          <text x="50" y="30" textAnchor="start">
            [+] PANDUAN OVERLAY:{" "}
            {targetType === "issf_pistol_25m"
              ? "PISTOL 25M"
              : "ISSF 10-RING STANDAR"}
          </text>
          <text x="550" y="30" textAnchor="end">
            SKALA PANDUAN: {(scale * 100).toFixed(0)}%
          </text>
        </g>
      </svg>
    </div>
  );
};

export const ModalUploadTargetDetect = ({
  isOpen = false,
  onClose,
  sesiData,
  initialShooter = null,
  initialBabakId = null,
  onApplyResult,
}) => {
  // State pilihan penembak dan babak
  const [selectedShooterId, setSelectedShooterId] = useState("");
  const [selectedBabakId, setSelectedBabakId] = useState("");

  // Parameter deteksi
  const [targetType, setTargetType] = useState("issf_standard_10_ring");
  const [caliberMm, setCaliberMm] = useState("4.5");
  const [selectedEngine, setSelectedEngine] = useState("model_sendiri");
  const [availableEngines, setAvailableEngines] = useState([
    {
      id: "model_sendiri",
      name: "Model Sendiri (Local YOLO & Classical CV)",
      type: "local_vision",
      model: "YOLO + CV Ensemble",
      is_available: true,
      description:
        "Deteksi lokal otomatis menggunakan model YOLO terlatih dan algoritma Computer Vision.",
    },
    {
      id: "yolo26",
      name: "YOLO26 (Small-Target Puncture Detector)",
      type: "local_deep_learning",
      model: "bullet_hole_yolo26.pt",
      is_available: true,
      description:
        "Arsitektur YOLO26 dengan STAL (Small-Target-Aware Label Assignment) khusus target Krüger.",
    },
    {
      id: "yolo11",
      name: "YOLO11 (Ultralytics High-Precision Detector)",
      type: "local_deep_learning",
      model: "bullet_hole_yolo11.pt",
      is_available: true,
      description:
        "Arsitektur Ultralytics YOLO11 terlatih untuk deteksi sasaran tembak Krüger.",
    },
    {
      id: "gemini",
      name: "Google Gemini Cloud AI",
      type: "cloud_multimodal_ai",
      model: "gemini-3.8-flash",
      is_available: true,
      description:
        "Model multimodal vision Google Gemini untuk deteksi sasaran tembak berbasis cloud.",
    },
  ]);

  // State berkas gambar
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // State status koneksi service sitrak-detect (URL dari .env)
  const [serviceStatus, setServiceStatus] = useState({
    checking: false,
    online: null,
    message: "",
  });

  // State proses deteksi
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [errorMsg, setErrorMsg] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Tab tampilan gambar (annotated cv vs vector)
  const [viewMode, setViewMode] = useState("annotated"); // 'annotated' | 'svg'

  // Tooltip hovered shot
  const [hoveredShot, setHoveredShot] = useState(null);

  // State Pengujian Gemini API Key
  const [geminiTestStatus, setGeminiTestStatus] = useState(null);
  const [isTestingGemini, setIsTestingGemini] = useState(false);

  const handleTestGeminiKey = async () => {
    setIsTestingGemini(true);
    setGeminiTestStatus(null);
    try {
      const res = await testGeminiApiKey();
      setGeminiTestStatus(res);
    } catch (e) {
      setGeminiTestStatus({
        valid: false,
        message: e.message || "Gagal menguji Gemini API Key.",
      });
    } finally {
      setIsTestingGemini(false);
    }
  };

  const fileInputRef = useRef(null);

  // State Kamera Langsung & Overlay
  const [inputMode, setInputMode] = useState("file"); // 'file' | 'camera'
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("environment"); // 'environment' | 'user'
  const [cameraError, setCameraError] = useState(null);
  const [overlayScale, setOverlayScale] = useState(1);
  const [showOverlay, setShowOverlay] = useState(true);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Fungsi menghentikan stream kamera & mematikan hardware
  const stopCamera = () => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.warn("Gagal menghentikan track kamera:", e);
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Fungsi mengaktifkan kamera dengan dukungan WebRTC & fallback
  const startCamera = async (facing = cameraFacing) => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        "Browser Anda tidak mendukung WebRTC Camera API atau memerlukan koneksi aman (HTTPS / localhost)."
      );
      return;
    }

    try {
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (errFacing) {
        console.warn("Fallback to generic video constraints:", errFacing);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Video play error:", playErr);
        }
      }
    } catch (err) {
      console.error("Gagal membuka kamera:", err);
      let msg =
        "Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan di peramban.";
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        msg =
          "Izin akses kamera ditolak. Harap izinkan akses kamera di ikon gembok peramban Anda.";
      } else if (
        err.name === "NotFoundError" ||
        err.name === "DevicesNotFoundError"
      ) {
        msg = "Perangkat kamera tidak ditemukan pada komputer/perangkat ini.";
      } else if (
        err.name === "NotReadableError" ||
        err.name === "TrackStartError"
      ) {
        msg =
          "Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi tersebut dan coba lagi.";
      }
      setCameraError(msg);
      setIsCameraActive(false);
    }
  };

  // Toggle kamera depan dan belakang
  const handleToggleFacing = () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(nextFacing);
    if (isCameraActive) {
      startCamera(nextFacing);
    }
  };

  // Tangkap frame gambar dari video stream ke File & Preview (Auto 1:1 Square Crop)
  const handleCapturePhoto = () => {
    if (!videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    // Crop simetris tengah 1:1 bujur sangkar agar bebas distorsi
    const side = Math.min(width, height);
    const startX = (width - side) / 2;
    const startY = (height - side) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, startX, startY, side, side, 0, 0, side, side);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setErrorMsg("Gagal mengambil foto dari kamera.");
          return;
        }
        const fileName = `target_camera_${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: "image/jpeg" });

        setSelectedFile(file);
        setPreviewUrl(canvas.toDataURL("image/jpeg"));
        setErrorMsg(null);
        setAnalysisResult(null);

        // Hentikan streaming kamera setelah foto berhasil diambil
        stopCamera();
      },
      "image/jpeg",
      0.95
    );
  };

  // Switch tab unggah berkas vs kamera
  const handleSwitchTab = (mode) => {
    setInputMode(mode);
    if (mode === "file") {
      stopCamera();
    } else if (mode === "camera" && !previewUrl && !isCameraActive) {
      startCamera(cameraFacing);
    }
  };

  // Wrapper tutup modal dengan mematikan kamera
  const handleModalClose = () => {
    stopCamera();
    onClose();
  };

  // Pasang stream saat videoRef ter-mount
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current
        .play()
        .catch((e) => console.warn("Video play error:", e));
    }
  }, [isCameraActive]);

  // Cleanup kamera saat modal ditutup atau unmount
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);


  // Sinkronisasi dan pengecekan service saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      const currentUrl = getDetectApiUrl();

      // Cek konektivitas service sitrak-detect
      setServiceStatus({ checking: true, online: null, message: "Memeriksa layanan..." });
      checkDetectHealth(currentUrl).then((res) => {
        setServiceStatus({
          checking: false,
          online: res.online,
          message: res.online
            ? "Layanan SITRAK-Detect Siap (Online)"
            : "Layanan SITRAK-Detect Belum Terhubung (Offline / port 8000)",
        });
      });

      // Ambil daftar engine deteksi yang tersedia dari sitrak-detect
      fetchAvailableEngines(currentUrl)
        .then((engRes) => {
          if (engRes && engRes.engines && engRes.engines.length > 0) {
            setAvailableEngines(engRes.engines);
            const def = engRes.defaultEngine || engRes.default_engine;
            if (def) {
              setSelectedEngine((prev) => {
                const exists = engRes.engines.some((e) => e.id === prev);
                return exists ? prev : def;
              });
            }
          }
        })
        .catch((err) => {
          console.warn("Gagal memuat engine dari SITRAK-Detect:", err);
        });

      if (initialShooter?.id_personel_penembak) {
        setSelectedShooterId(String(initialShooter.id_personel_penembak));
      } else if (sesiData?.gelombang_list?.[0]?.penembak?.[0]) {
        setSelectedShooterId(
          String(sesiData.gelombang_list[0].penembak[0].id_personel_penembak)
        );
      }

      if (initialBabakId) {
        setSelectedBabakId(String(initialBabakId));
      } else if (sesiData?.babak?.[0]) {
        setSelectedBabakId(
          String(sesiData.babak[0].id_babak || sesiData.babak[0].nomor_babak)
        );
      }

      // Reset state form
      setSelectedFile(null);
      setPreviewUrl(null);
      setErrorMsg(null);
      setAnalysisResult(null);
      setIsProcessing(false);
      setViewMode("annotated");
    }
  }, [isOpen, initialShooter, initialBabakId, sesiData]);

  if (!isOpen) return null;

  // Dapatkan data penembak yang sedang dipilih
  const allShooters =
    sesiData?.gelombang_list?.flatMap((g) => g.penembak || []) || [];
  const currentShooter =
    allShooters.find(
      (p) => String(p.id_personel_penembak) === String(selectedShooterId)
    ) ||
    allShooters[0] ||
    null;

  // Dapatkan data babak yang sedang dipilih
  const allBabak = sesiData?.babak || [];
  const currentBabak =
    allBabak.find(
      (b) =>
        String(b.id_babak) === String(selectedBabakId) ||
        String(b.nomor_babak) === String(selectedBabakId)
    ) ||
    allBabak[0] ||
    null;

  // Objek metadata engine deteksi yang sedang dipilih
  const selectedEngineObj =
    availableEngines.find((e) => e.id === selectedEngine) ||
    availableEngines[0] ||
    null;

  // Handler pemilihan berkas gambar
  const handleFileChange = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg(
        "Harap unggah berkas gambar foto sasaran yang valid (JPG, JPEG, PNG)."
      );
      return;
    }

    setSelectedFile(file);
    setErrorMsg(null);
    setAnalysisResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Uji koneksi service sitrak-detect
  const handleCheckConnection = async () => {
    setServiceStatus({ checking: true, online: null, message: "Menguji koneksi..." });
    const url = getDetectApiUrl();
    const res = await checkDetectHealth(url);
    setServiceStatus({
      checking: false,
      online: res.online,
      message: res.online
        ? `Terkoneksi ke SITRAK-Detect (${url})`
        : `Gagal terhubung ke ${url}. Pastikan service SITRAK-Detect aktif.`,
    });

    if (res.online) {
      try {
        const engRes = await fetchAvailableEngines(url);
        if (engRes && engRes.engines && engRes.engines.length > 0) {
          setAvailableEngines(engRes.engines);
          const def = engRes.defaultEngine || engRes.default_engine;
          if (def) {
            setSelectedEngine((prev) => {
              const exists = engRes.engines.some((e) => e.id === prev);
              return exists ? prev : def;
            });
          }
        }
      } catch (err) {
        console.warn("Gagal memuat ulang engine:", err);
      }
    }
  };

  // Jalankan deteksi melalui sitrak-detect atau Google Gemini Cloud AI
  const handleRunDetection = async () => {
    if (!selectedFile) {
      setErrorMsg("Silakan pilih atau seret foto sasaran tembak terlebih dahulu.");
      return;
    }

    const isGemini = selectedEngine === "gemini";
    if (isGemini && !hasGeminiApiKey()) {
      setErrorMsg(
        "Kunci API Google Gemini belum diatur di file .env. Silakan tambahkan 'REACT_APP_GEMINI_API_KEY=kunci_anda' pada .env lalu muat ulang halaman."
      );
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    if (isGemini) {
      setProcessingStep("Mengirim citra sasaran ke Google Gemini Multimodal Vision API...");
      setTimeout(() => {
        setProcessingStep(
          "Menganalisis perkenaan lubang peluru & skoring cincin presisi dengan AI..."
        );
      }, 1200);
      setTimeout(() => {
        setProcessingStep(
          "Menghitung metrik dispersi, bias arah, & menghasilkan visualisasi anotasi..."
        );
      }, 2800);
    } else {
      setProcessingStep("Mengirim citra sasaran ke service sitrak-detect...");
      setTimeout(() => {
        setProcessingStep(
          "Memproses koreksi perspektif & segmentasi lingkaran cincin..."
        );
      }, 1000);
      setTimeout(() => {
        setProcessingStep(
          "Mendeteksi lubang peluru, skoring nilai, & analisis sebaran mm..."
        );
      }, 2500);
    }

    try {
      const effectiveUrl = getDetectApiUrl();

      const res = await detectTargetViaUpload(
        selectedFile,
        {
          tipeTarget: targetType,
          kaliber: parseFloat(caliberMm) || 4.5,
          namaPenembak: currentShooter?.nama || "Penembak",
          nomorBabak: currentBabak?.nomor_babak || 1,
          jumlahPeluru: currentBabak?.jumlah_peluru || 10,
          engine: selectedEngine,
        },
        effectiveUrl
      );

      setAnalysisResult(res);
      setViewMode(res.annotated_image_url ? "annotated" : "svg");
    } catch (err) {
      console.error("Gagal mendeteksi target:", err);
      setErrorMsg(
        err.message ||
          (isGemini
            ? "Gagal memproses gambar dengan Google Gemini API. Periksa kembali kuota atau validitas API key di .env."
            : "Gagal memproses gambar target. Pastikan service sitrak-detect berjalan di port 8000.")
      );
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  // Hitung seleksi tembakan terbaik jika jumlah tembakan terdeteksi melebihi kuota peluru babak
  const bulletQuota = currentBabak?.jumlah_peluru || 10;
  const shotSelection = selectBestShots(
    analysisResult?.shots || [],
    bulletQuota
  );

  // Terapkan hasil ke sesi dan simpan ke sitrak-backend
  const handleApply = async () => {
    if (!analysisResult) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      // Ambil tembakan terbaik sesuai dengan jumlah butir peluru dari babak tersebut untuk disimpan
      const quota = currentBabak?.jumlah_peluru || 10;
      const selection = selectBestShots(analysisResult.shots || [], quota);

      const finalResult = {
        ...analysisResult,
        shots: selection.bestShots, // Tembakan terbaik yang disimpan
        all_detected_shots: selection.allShots, // Seluruh tembakan terdeteksi dengan status seleksi
        total_score: selection.totalScore, // Total skor dari tembakan terbaik
        max_score: selection.maxScore,
        accuracy_percent: selection.accuracyPercent,
        total_shots: selection.bestShots.length,
        raw_total_shots: analysisResult.shots?.length || 0,
        quota_exceeded: selection.isQuotaExceeded,
        excess_count: selection.excessCount,
        rekomendasi_utama: analysisResult.rekomendasi_utama,
      };

      if (onApplyResult) {
        await onApplyResult(finalResult, selectedShooterId, selectedBabakId);
      }
      onClose();
    } catch (err) {
      console.error("Gagal menerapkan & menyimpan hasil deteksi:", err);
      setErrorMsg(
        "Gagal menyimpan data tembakan ke SITRAK-Backend: " +
          (err.response?.data?.message || err.response?.data || err.message)
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 1055 }}
      tabIndex="-1"
      role="dialog"
    >
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg">
          {/* HEADER MODAL */}
          <div className="modal-header bg-dark text-white p-3 border-bottom border-secondary border-opacity-50">
            <div className="d-flex align-items-center gap-2">
              <div
                className="bg-primary rounded-circle p-2 d-flex align-items-center justify-content-center text-white"
                style={{ width: "36px", height: "36px" }}
              >
                <i className="bi bi-camera-fill fs-5"></i>
              </div>
              <div>
                <h5 className="modal-title fs-6 fw-bold mb-0">
                  Upload & Deteksi Target Tembak (SITRAK-Detect CV)
                </h5>
                <small className="text-white-50">
                  Computer Vision OpenCV: Koreksi Perspektif, Deteksi Lubang, Skoring & Evaluasi Balistik
                </small>
              </div>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={handleModalClose}
              disabled={isProcessing}
              aria-label="Close"
            ></button>
          </div>

          {/* BODY MODAL */}
          <div className="modal-body p-3 p-md-4 bg-body-tertiary">
            {/* 1. SELEKTOR PERSONEL & BABAK */}
            <div className="card border-0 shadow-sm bg-body p-3 mb-3">
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold text-secondary mb-1">
                    <i className="bi bi-person-badge me-1 text-primary"></i>
                    Pilih Personel Penembak:
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={selectedShooterId}
                    onChange={(e) => {
                      setSelectedShooterId(e.target.value);
                      setAnalysisResult(null);
                    }}
                    disabled={isProcessing}
                  >
                    {allShooters.map((p) => (
                      <option
                        key={p.id_personel_penembak}
                        value={String(p.id_personel_penembak)}
                      >
                        Lane {p.lane || "-"}: {p.nama} ({p.nrp})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold text-secondary mb-1">
                    <i className="bi bi-flag me-1 text-primary"></i>
                    Pilih Babak Latihan Terkait:
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={selectedBabakId}
                    onChange={(e) => {
                      setSelectedBabakId(e.target.value);
                      setAnalysisResult(null);
                    }}
                    disabled={isProcessing}
                  >
                    {allBabak.map((b) => (
                      <option
                        key={b.id_babak || b.nomor_babak}
                        value={String(b.id_babak || b.nomor_babak)}
                      >
                        Babak {b.nomor_babak}: {b.nama_babak} (
                        {b.jumlah_peluru || 10} Butir Peluru)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ringkasan Personel Terpilih */}
              {currentShooter && currentBabak && (
                <div className="mt-2 pt-2 border-top d-flex flex-wrap align-items-center justify-content-between gap-2 small text-secondary">
                  <div>
                    <span className="fw-semibold text-dark">
                      {currentShooter.nama}
                    </span>{" "}
                    • NRP:{" "}
                    <span className="fw-monospace">{currentShooter.nrp}</span> •
                    Lane:{" "}
                    <span className="badge bg-secondary-subtle text-secondary border">
                      Jalur {currentShooter.lane}
                    </span>
                  </div>
                  <div>
                    Alokasi Babak:{" "}
                    <strong className="text-primary">
                      {currentBabak.jumlah_peluru || 10} Butir
                    </strong>{" "}
                    • Max Skor:{" "}
                    <strong>
                      {(currentBabak.jumlah_peluru || 10) * 10} Poin
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* 2. UPLOAD AREA & PARAMETER SERVICE */}
            <div className="row g-3 mb-3">
              {/* Kolom Kiri: Upload Berkas / Kamera Langsung */}
              <div className="col-12 col-lg-7">
                {/* Tab Pemilihan Sumber Foto */}
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="btn-group btn-group-sm shadow-sm" role="group">
                    <button
                      type="button"
                      className={`btn ${
                        inputMode === "file"
                          ? "btn-primary fw-bold"
                          : "btn-outline-secondary bg-body"
                      }`}
                      onClick={() => handleSwitchTab("file")}
                      disabled={isProcessing}
                    >
                      <i className="bi bi-file-earmark-arrow-up me-1"></i>
                      Unggah Berkas
                    </button>
                    <button
                      type="button"
                      className={`btn ${
                        inputMode === "camera"
                          ? "btn-primary fw-bold"
                          : "btn-outline-secondary bg-body"
                      }`}
                      onClick={() => handleSwitchTab("camera")}
                      disabled={isProcessing}
                    >
                      <i className="bi bi-camera-fill me-1"></i>
                      Buka Kamera Langsung
                    </button>
                  </div>

                  {inputMode === "camera" && isCameraActive && (
                    <div className="d-flex align-items-center gap-1">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary py-0 px-2"
                        onClick={handleToggleFacing}
                        title="Putar Kamera (Depan / Belakang)"
                      >
                        <i className="bi bi-arrow-repeat me-1"></i>
                        <span className="small">
                          {cameraFacing === "environment"
                            ? "Kamera Belakang"
                            : "Kamera Depan"}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger py-0 px-2"
                        onClick={stopCamera}
                        title="Matikan Kamera"
                      >
                        <i className="bi bi-camera-video-off me-1"></i>
                        <span className="small">Tutup</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* TAMPILAN MODE 1: UNGGAH BERKAS */}
                {inputMode === "file" && (
                  <div
                    className={`border-2 border-dashed rounded-3 p-4 text-center position-relative transition-all ${
                      dragActive
                        ? "border-primary bg-primary bg-opacity-10"
                        : "border-secondary border-opacity-50 bg-body"
                    }`}
                    style={{
                      borderStyle: "dashed",
                      cursor: "pointer",
                      minHeight: "240px",
                    }}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="d-none"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileChange(e.target.files[0]);
                        }
                      }}
                      disabled={isProcessing}
                    />

                    {previewUrl ? (
                      <div className="position-relative d-inline-block">
                        <img
                          src={previewUrl}
                          alt="Preview Sasaran Tembak"
                          className="rounded img-thumbnail shadow-sm"
                          style={{
                            maxHeight: "180px",
                            maxWidth: "100%",
                            objectFit: "contain",
                          }}
                        />
                        <div className="mt-2 small text-muted">
                          <i className="bi bi-check-circle-fill text-success me-1"></i>
                          {selectedFile?.name} (
                          {(selectedFile?.size / 1024).toFixed(0)} KB)
                        </div>
                        <div className="d-flex justify-content-center gap-2 mt-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(null);
                              setPreviewUrl(null);
                              setAnalysisResult(null);
                            }}
                          >
                            <i className="bi bi-trash me-1"></i> Ganti Foto
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-3">
                        <div className="mb-2 text-primary">
                          <i className="bi bi-cloud-arrow-up display-5"></i>
                        </div>
                        <h6 className="fw-bold mb-1">
                          Pilih atau Tarik Berkas Foto Sasaran ke Sini
                        </h6>
                        <p className="small text-secondary mb-3">
                          Format didukung: JPG, JPEG, PNG (Maksimal 15 MB)
                        </p>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary px-3"
                        >
                          <i className="bi bi-folder2-open me-1"></i> Jelajahi
                          Berkas
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAMPILAN MODE 2: BUKA KAMERA LANGSUNG DENGAN OVERLAY */}
                {inputMode === "camera" && (
                  <div>
                    {/* Jika sudah ada foto yang baru diambil */}
                    {previewUrl && !isCameraActive ? (
                      <div className="card border-0 shadow-sm bg-body p-3 text-center">
                        <div className="position-relative d-inline-block">
                          <div className="badge bg-success-subtle text-success border border-success mb-2 px-3 py-1 rounded-pill">
                            <i className="bi bi-check-circle-fill me-1"></i>
                            Foto Berhasil Ditangkap dari Kamera
                          </div>
                          <div>
                            <img
                              src={previewUrl}
                              alt="Hasil Foto Kamera"
                              className="rounded img-thumbnail shadow-sm"
                              style={{
                                maxHeight: "230px",
                                maxWidth: "100%",
                                objectFit: "contain",
                              }}
                            />
                          </div>
                          <div className="mt-2 small text-muted">
                            {selectedFile?.name} • Siap untuk diproses oleh OpenCV
                          </div>
                          <div className="d-flex justify-content-center gap-2 mt-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-primary shadow-sm"
                              onClick={() => {
                                setSelectedFile(null);
                                setPreviewUrl(null);
                                setAnalysisResult(null);
                                startCamera(cameraFacing);
                              }}
                            >
                              <i className="bi bi-camera-fill me-1"></i> Ambil
                              Ulang Foto
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => {
                                setSelectedFile(null);
                                setPreviewUrl(null);
                                setAnalysisResult(null);
                              }}
                            >
                              <i className="bi bi-trash me-1"></i> Hapus Foto
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : isCameraActive ? (
                      /* Live Camera View dengan Overlay Target */
                      <div
                        className="position-relative bg-black rounded-3 overflow-hidden shadow"
                        style={{ minHeight: "360px" }}
                      >
                        <video
                          ref={videoRef}
                          playsInline
                          autoPlay
                          muted
                          className="w-100"
                          style={{
                            height: "360px",
                            objectFit: "contain",
                            backgroundColor: "#000",
                            display: "block",
                          }}
                        />

                        {/* Overlay Garis Panduan Cincin Sasaran */}
                        <TargetCameraOverlay
                          scale={overlayScale}
                          showGuide={showOverlay}
                          targetType={targetType}
                        />

                        {/* Petunjuk Arah Posisi Overlay */}
                        <div
                          className="position-absolute top-0 start-50 translate-middle-x mt-2 px-3 py-1 rounded-pill bg-dark bg-opacity-75 text-white small border border-secondary border-opacity-50 text-center shadow-sm"
                          style={{
                            zIndex: 11,
                            maxWidth: "90%",
                            fontSize: "0.74rem",
                            pointerEvents: "none",
                          }}
                        >
                          <i className="bi bi-crosshair text-info me-1"></i>
                          Pusatkan sasaran tembak fisik ke dalam garis panduan retikel cyan
                        </div>

                        {/* Control Bar Bagian Bawah Kamera */}
                        <div
                          className="position-absolute bottom-0 start-0 w-100 p-2 bg-dark bg-opacity-90 border-top border-secondary border-opacity-25 d-flex flex-wrap align-items-center justify-content-between gap-2"
                          style={{ zIndex: 12 }}
                        >
                          {/* Kontrol Skala/Ukuran Overlay */}
                          <div className="d-flex align-items-center gap-2 text-white small">
                            <span className="text-white-50 small d-none d-sm-inline">
                              Skala:
                            </span>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-light py-0 px-2"
                              onClick={() =>
                                setOverlayScale((prev) =>
                                  Math.max(0.5, Number((prev - 0.05).toFixed(2)))
                                )
                              }
                              title="Perkecil Garis Panduan"
                            >
                              <i className="bi bi-dash"></i>
                            </button>
                            <input
                              type="range"
                              min="0.5"
                              max="1.5"
                              step="0.05"
                              value={overlayScale}
                              onChange={(e) =>
                                setOverlayScale(parseFloat(e.target.value))
                              }
                              className="form-range"
                              style={{ width: "85px" }}
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-light py-0 px-2"
                              onClick={() =>
                                setOverlayScale((prev) =>
                                  Math.min(1.5, Number((prev + 0.05).toFixed(2)))
                                )
                              }
                              title="Perbesar Garis Panduan"
                            >
                              <i className="bi bi-plus"></i>
                            </button>
                            <span
                              className="fw-monospace text-info small"
                              style={{ minWidth: "36px" }}
                            >
                              {(overlayScale * 100).toFixed(0)}%
                            </span>
                          </div>

                          {/* Tombol Shutter Ambil Foto & Opsi Overlay */}
                          <div className="d-flex align-items-center gap-2 ms-auto">
                            <button
                              type="button"
                              className={`btn btn-sm ${
                                showOverlay
                                  ? "btn-info text-dark fw-semibold"
                                  : "btn-outline-secondary text-white"
                              }`}
                              onClick={() => setShowOverlay(!showOverlay)}
                              title={
                                showOverlay
                                  ? "Sembunyikan Garis Panduan"
                                  : "Tampilkan Garis Panduan"
                              }
                            >
                              <i className="bi bi-grid-3x3 me-1"></i>
                              <span className="small d-none d-sm-inline">
                                {showOverlay ? "Overlay ON" : "Overlay OFF"}
                              </span>
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-light"
                              onClick={handleToggleFacing}
                              title="Balik Kamera Depan / Belakang"
                            >
                              <i className="bi bi-arrow-repeat"></i>
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-danger px-3 py-1 fw-bold d-flex align-items-center gap-2 shadow"
                              onClick={handleCapturePhoto}
                              title="Klik untuk mengambil foto"
                            >
                              <i className="bi bi-camera-fill fs-6"></i>
                              <span>Ambil Foto</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Tampilan Awal Kamera Belum Aktif */
                      <div
                        className="border rounded-3 p-4 text-center bg-body d-flex flex-column align-items-center justify-content-center"
                        style={{ minHeight: "240px" }}
                      >
                        {cameraError ? (
                          <div className="alert alert-warning d-flex align-items-center gap-2 small mb-3 text-start w-100">
                            <i className="bi bi-exclamation-triangle-fill fs-5 text-warning flex-shrink-0"></i>
                            <div className="flex-grow-1">
                              <strong>Gagal Mengakses Kamera:</strong> {cameraError}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="mb-2 text-primary">
                              <div
                                className="bg-primary-subtle text-primary rounded-circle d-inline-flex align-items-center justify-content-center p-3"
                                style={{ width: "64px", height: "64px" }}
                              >
                                <i className="bi bi-camera-fill fs-2"></i>
                              </div>
                            </div>
                            <h6 className="fw-bold mb-1">
                              Ambil Foto Sasaran Tembak Langsung
                            </h6>
                            <p
                              className="small text-secondary mb-3"
                              style={{ maxWidth: "420px" }}
                            >
                              Arahkan kamera ke kertas sasaran tembak. Overlay retikel
                              interaktif akan membantu mencocokkan lingkaran target dengan
                              posisi tegak lurus dan presisi.
                            </p>
                          </>
                        )}

                        <button
                          type="button"
                          className="btn btn-primary btn-sm px-4 shadow-sm fw-semibold d-flex align-items-center gap-2"
                          onClick={() => startCamera(cameraFacing)}
                        >
                          <i className="bi bi-camera-video-fill"></i>
                          <span>
                            {cameraError ? "Coba Buka Kamera Lagi" : "Aktifkan Kamera"}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Kolom Kanan: Parameter & Status SITRAK-Detect */}
              <div className="col-12 col-lg-5">
                <div className="card border-0 shadow-sm bg-body p-3 h-100 d-flex flex-column justify-content-between">
                  <div>
                    <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                      <i className="bi bi-sliders text-primary"></i>
                      Parameter Deteksi Target:
                    </h6>

                    {/* Pilihan Engine Deteksi SITRAK-Detect */}
                    <div className="p-2 mb-2 rounded border bg-body-tertiary">
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <label className="form-label small text-dark mb-0 fw-bold d-flex align-items-center gap-1">
                          <i className="bi bi-cpu text-primary"></i>
                          Engine Deteksi:
                        </label>
                        {selectedEngineObj && (
                          <span
                            className={`badge ${
                              selectedEngineObj.type === "cloud_multimodal_ai"
                                ? "bg-info-subtle text-info border border-info"
                                : selectedEngineObj.type === "local_deep_learning"
                                ? "bg-primary-subtle text-primary border border-primary"
                                : "bg-success-subtle text-success border border-success"
                            }`}
                            style={{ fontSize: "0.68rem" }}
                          >
                            {selectedEngineObj.type === "cloud_multimodal_ai"
                              ? "Cloud AI"
                              : selectedEngineObj.type === "local_deep_learning"
                              ? "Deep Learning PT"
                              : "Hybrid Local CV"}
                          </span>
                        )}
                      </div>
                      <select
                        className="form-select form-select-sm fw-semibold"
                        value={selectedEngine}
                        onChange={(e) => setSelectedEngine(e.target.value)}
                        disabled={isProcessing}
                      >
                        {availableEngines.map((eng) => (
                          <option
                            key={eng.id}
                            value={eng.id}
                            disabled={eng.is_available === false}
                          >
                            {eng.name}{" "}
                            {eng.is_available === false ? "(Tidak Tersedia)" : ""}
                          </option>
                        ))}
                      </select>

                      {/* Panel Status & Konfigurasi Google Gemini Cloud AI */}
                      {selectedEngine === "gemini" && (
                        <div className="mt-2 p-2 rounded bg-light border border-info-subtle">
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <span className="small fw-bold text-dark d-flex align-items-center gap-1">
                              <i className="bi bi-stars text-info"></i>
                              Status Google Gemini API:
                            </span>
                            {hasGeminiApiKey() ? (
                              <span
                                className="badge bg-success-subtle text-success border border-success"
                                style={{ fontSize: "0.68rem" }}
                              >
                                <i className="bi bi-key-fill me-1"></i>
                                API Key Terdeteksi di .env
                              </span>
                            ) : (
                              <span
                                className="badge bg-warning-subtle text-warning-emphasis border border-warning"
                                style={{ fontSize: "0.68rem" }}
                              >
                                <i className="bi bi-exclamation-triangle-fill me-1"></i>
                                API Key Belum Diisi (.env)
                              </span>
                            )}
                          </div>

                          <div
                            className="text-secondary lh-sm mb-1"
                            style={{ fontSize: "0.72rem" }}
                          >
                            Model aktif:{" "}
                            <span className="badge bg-secondary-subtle text-dark font-monospace">
                              {getGeminiModel()}
                            </span>
                            {!hasGeminiApiKey() && (
                              <div className="text-danger mt-1 fw-medium">
                                <i className="bi bi-info-circle me-1"></i>
                                Tambahkan <code>REACT_APP_GEMINI_API_KEY=kunci_anda</code> pada berkas <code>.env</code> lalu simpan.
                              </div>
                            )}
                          </div>

                          {hasGeminiApiKey() && (
                            <div className="mt-2 pt-1 border-top border-secondary-subtle d-flex flex-wrap align-items-center gap-2">
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm py-0 px-2 fw-medium"
                                style={{ fontSize: "0.72rem" }}
                                onClick={handleTestGeminiKey}
                                disabled={isTestingGemini}
                              >
                                {isTestingGemini ? (
                                  <>
                                    <span
                                      className="spinner-border spinner-border-sm me-1"
                                      role="status"
                                      style={{ width: "0.7rem", height: "0.7rem" }}
                                    ></span>
                                    Menguji API Key...
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-shield-check me-1"></i>
                                    Uji Koneksi Gemini
                                  </>
                                )}
                              </button>

                              {geminiTestStatus && (
                                <span
                                  className={`small fw-medium ${
                                    geminiTestStatus.valid ? "text-success" : "text-danger"
                                  }`}
                                  style={{ fontSize: "0.72rem" }}
                                >
                                  <i
                                    className={`bi ${
                                      geminiTestStatus.valid
                                        ? "bi-check-circle-fill"
                                        : "bi-x-circle-fill"
                                    } me-1`}
                                  ></i>
                                  {geminiTestStatus.message}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {selectedEngineObj?.description && selectedEngine !== "gemini" && (
                        <div
                          className="text-secondary mt-1 lh-sm"
                          style={{ fontSize: "0.72rem" }}
                        >
                          <i className="bi bi-info-circle me-1 text-primary"></i>
                          {selectedEngineObj.description}
                          {selectedEngineObj.model && (
                            <span className="ms-1 font-monospace text-primary fw-semibold">
                              [{selectedEngineObj.model}]
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label small text-secondary mb-1">
                          Tipe Sasaran:
                        </label>
                        <select
                          className="form-select form-select-sm"
                          value={targetType}
                          onChange={(e) => setTargetType(e.target.value)}
                          disabled={isProcessing}
                        >
                          <option value="issf_standard_10_ring">
                            ISSF 10-Ring Standar
                          </option>
                          <option value="issf_pistol_25m">
                            Pistol Presisi 25m
                          </option>
                        </select>
                      </div>
                      <div className="col-6">
                        <label className="form-label small text-secondary mb-1">
                          Kaliber Amunisi:
                        </label>
                        <select
                          className="form-select form-select-sm"
                          value={caliberMm}
                          onChange={(e) => setCaliberMm(e.target.value)}
                          disabled={isProcessing}
                        >
                          <option value="4.5">4.5 mm (.177)</option>
                          <option value="9.0">9.0 mm (Pistol)</option>
                          <option value="5.56">5.56 mm (Senapan)</option>
                          <option value="7.62">7.62 mm</option>
                        </select>
                      </div>
                    </div>

                    {/* Status Service SITRAK-Detect */}
                    <div className="p-2 bg-body-tertiary rounded border mb-2 small">
                      <div className="d-flex align-items-center justify-content-between">
                        <span className="text-secondary">Service SITRAK-Detect:</span>
                        {serviceStatus.checking ? (
                          <span className="badge bg-secondary-subtle text-secondary">
                            <span
                              className="spinner-border spinner-border-sm me-1"
                              role="status"
                            />
                            Memeriksa...
                          </span>
                        ) : serviceStatus.online ? (
                          <span className="badge bg-success-subtle text-success border border-success">
                            <i className="bi bi-check2-circle me-1"></i>Online (8000)
                          </span>
                        ) : (
                          <span className="badge bg-danger-subtle text-danger border border-danger">
                            <i className="bi bi-exclamation-triangle me-1"></i>Offline
                          </span>
                        )}
                      </div>

                      <div className="text-muted small mt-1" style={{ fontSize: "0.75rem" }}>
                        {serviceStatus.message}
                      </div>

                      <div className="mt-2 pt-2 border-top d-flex align-items-center justify-content-between">
                        <small className="text-secondary font-monospace" style={{ fontSize: "0.75rem" }}>
                          <i className="bi bi-hdd-network me-1 text-primary"></i>
                          .env: {getDetectApiUrl()}
                        </small>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary py-0 px-2"
                          style={{ fontSize: "0.75rem" }}
                          onClick={handleCheckConnection}
                          disabled={serviceStatus.checking}
                          title="Uji ulang koneksi ke endpoint .env"
                        >
                          <i className="bi bi-arrow-clockwise me-1"></i>
                          Uji Koneksi
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Deteksi */}
                  <div className="mt-3">
                    <button
                      type="button"
                      className="btn btn-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                      onClick={handleRunDetection}
                      disabled={!selectedFile || isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm"
                            role="status"
                          />
                          <span>Memproses Computer Vision...</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-cpu-fill"></i>
                          <span className="fw-bold">
                            Deteksi & Analisa (SITRAK-Detect)
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* PROGRESS STATUS BAR */}
            {isProcessing && (
              <div className="card border-0 shadow-sm bg-body p-3 mb-3 text-center">
                <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                  <div
                    className="spinner-grow spinner-grow-sm text-primary"
                    role="status"
                  />
                  <span className="fw-semibold text-primary">
                    {processingStep || "Sedang memproses deteksi target..."}
                  </span>
                </div>
                <div
                  className="progress"
                  style={{ height: "6px" }}
                  role="progressbar"
                >
                  <div
                    className="progress-bar progress-bar-striped progress-bar-animated bg-primary w-100"
                  />
                </div>
              </div>
            )}

            {/* ERROR ALERT */}
            {errorMsg && (
              <div
                className="alert alert-danger d-flex align-items-center gap-2 mb-3 shadow-sm"
                role="alert"
              >
                <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                <div className="flex-grow-1 small">{errorMsg}</div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setErrorMsg(null)}
                />
              </div>
            )}

            {/* 3. HASIL ANALISIS & VISUALISASI DETEKSI */}
            {analysisResult && (
              <div className="card border-0 shadow-sm bg-body p-3 mb-3">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 pb-3 mb-3 border-bottom">
                  <div>
                    <h5 className="fw-bold mb-0 text-success d-flex align-items-center gap-2">
                      <i className="bi bi-check-circle-fill"></i>
                      Hasil Deteksi & Skoring SITRAK-Detect
                    </h5>
                    <div className="d-flex flex-wrap align-items-center gap-2 mt-1">
                      <small className="text-secondary">
                        Pipeline: {analysisResult.model_used || "SITRAK-Detect"} • Waktu:{" "}
                        {new Date(analysisResult.analyzed_at).toLocaleTimeString(
                          "id-ID"
                        )}
                      </small>
                      {analysisResult.detection_engine_used && (
                        <span
                          className="badge bg-primary-subtle text-primary border border-primary d-inline-flex align-items-center gap-1"
                          style={{ fontSize: "0.72rem" }}
                        >
                          <i className="bi bi-cpu"></i>
                          Engine:{" "}
                          {availableEngines.find(
                            (e) => e.id === analysisResult.detection_engine_used
                          )?.name || analysisResult.detection_engine_used}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Toggle Mode Tampilan Gambar */}
                  {analysisResult.annotated_image_url && (
                    <div className="btn-group btn-group-sm">
                      <button
                        type="button"
                        className={`btn ${
                          viewMode === "annotated"
                            ? "btn-primary"
                            : "btn-outline-secondary"
                        }`}
                        onClick={() => setViewMode("annotated")}
                      >
                        <i className="bi bi-image me-1"></i> Citra Anotasi CV
                      </button>
                      <button
                        type="button"
                        className={`btn ${
                          viewMode === "svg"
                            ? "btn-primary"
                            : "btn-outline-secondary"
                        }`}
                        onClick={() => setViewMode("svg")}
                      >
                        <i className="bi bi-bullseye me-1"></i> Vektor Target
                      </button>
                    </div>
                  )}
                </div>

                {/* PERINGATAN JIKA TEMBAKAN MELEBIHI KUOTA PELURU BABAK */}
                {shotSelection.isQuotaExceeded && (
                  <div
                    className="alert alert-warning border border-warning shadow-sm d-flex flex-column flex-sm-row align-items-start align-items-sm-center gap-3 mb-3 p-3"
                    role="alert"
                  >
                    <div className="fs-2 text-warning lh-1">
                      <i className="bi bi-exclamation-triangle-fill"></i>
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-bold fs-6 text-dark mb-1 d-flex align-items-center gap-2 flex-wrap">
                        <span>Peringatan: Jumlah Tembakan Melebihi Kuota Babak Ini!</span>
                        <span className="badge bg-danger text-white">
                          +{shotSelection.excessCount} Kelebihan Tembakan
                        </span>
                      </div>
                      <div className="small text-secondary">
                        Terdeteksi <strong>{analysisResult.shots_detected} butir tembakan</strong> pada sasaran, sedangkan alokasi peluru untuk <strong>{currentBabak?.nama_babak || "Babak Ini"}</strong> adalah <strong>{bulletQuota} butir</strong>.
                        Sistem secara otomatis menandai dan mengambil <strong>{bulletQuota} tembakan terbaik</strong> (skor poin tertinggi & terdekat ke titik pusat) untuk penilaian akhir dan penyimpanan data.
                      </div>
                    </div>
                  </div>
                )}

                {/* 4 CARD METRIK SKOR */}
                <div className="row g-3 mb-3">
                  <div className="col-6 col-md-3">
                    <div className="p-3 bg-body-tertiary rounded border text-center">
                      <small className="text-secondary d-block">
                        Total Nilai Babak {shotSelection.isQuotaExceeded ? `(${bulletQuota} Terbaik)` : ""}
                      </small>
                      <span className="fs-3 fw-bold text-primary">
                        {shotSelection.totalScore}
                      </span>
                      <span className="text-muted small">
                        {" "}
                        / {shotSelection.maxScore}
                      </span>
                      <div className="small fw-semibold text-success mt-1">
                        Akurasi: {shotSelection.accuracyPercent}%
                      </div>
                      {shotSelection.isQuotaExceeded && (
                        <div className="mt-1">
                          <span
                            className="badge bg-primary-subtle text-primary border border-primary"
                            style={{ fontSize: "0.68rem" }}
                          >
                            Seleksi {bulletQuota} Tembakan Terbaik
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-6 col-md-3">
                    <div className="p-3 bg-body-tertiary rounded border text-center">
                      <small className="text-secondary d-block">
                        Tembakan Dinilai
                      </small>
                      <span className="fs-3 fw-bold text-dark">
                        {shotSelection.bestShots.length}
                      </span>
                      <span className="text-muted small"> / {bulletQuota} Butir</span>
                      <div className="mt-1">
                        {shotSelection.isQuotaExceeded ? (
                          <span
                            className="badge bg-warning text-dark border border-warning"
                            style={{ fontSize: "0.72rem" }}
                            title={`${analysisResult.shots_detected} terdeteksi, ${shotSelection.excessCount} diabaikan`}
                          >
                            Terdeteksi: {analysisResult.shots_detected} (+{shotSelection.excessCount} Diabaikan)
                          </span>
                        ) : (
                          <span className="small text-muted">
                            Rerata: {analysisResult.average_score} Poin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-6 col-md-3">
                    <div className="p-3 bg-body-tertiary rounded border text-center">
                      <small className="text-secondary d-block">
                        Grouping Sebaran
                      </small>
                      <span className="fs-3 fw-bold text-success">
                        ±{analysisResult.grouping_diameter_mm}
                      </span>
                      <span className="text-muted small"> mm</span>
                      <div className="small text-secondary mt-1">
                        {analysisResult.consistency_level}
                      </div>
                    </div>
                  </div>

                  <div className="col-6 col-md-3">
                    <div className="p-3 bg-body-tertiary rounded border text-center">
                      <small className="text-secondary d-block">
                        Arah Bias Tembakan
                      </small>
                      <div className="mt-2">
                        <span className="badge bg-warning-subtle text-dark border border-warning px-2 py-1">
                          {analysisResult.directional_bias}
                        </span>
                      </div>
                      <div className="small text-muted mt-2">
                        Predikat:{" "}
                        <strong>{analysisResult.qualification}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* VISUALISASI GAMBAR TARGET & DAFTAR TEMBAKAN */}
                <div className="row g-4 align-items-center mb-3">
                  {/* Visualizer Target (Annotated Image atau SVG Overlay) */}
                  <div className="col-12 col-lg-6 text-center">
                    <div
                      className="bg-dark rounded-3 p-3 position-relative d-inline-block shadow"
                      style={{ maxWidth: "420px", width: "100%" }}
                    >
                      {viewMode === "annotated" &&
                      analysisResult.annotated_image_url ? (
                        <div>
                          <img
                            src={analysisResult.annotated_image_url}
                            alt="Hasil Anotasi Target"
                            className="img-fluid rounded"
                            style={{ maxHeight: "360px", objectFit: "contain" }}
                          />
                          <div className="text-white-50 small mt-2">
                            {analysisResult.detection_engine_used === "gemini" ? (
                              <span className="text-info">
                                <i className="bi bi-stars me-1"></i>
                                Citra Anotasi {analysisResult.model_used || "Google Gemini Cloud AI"}
                              </span>
                            ) : (
                              <span>
                                <i className="bi bi-cpu text-info me-1"></i>
                                Citra Anotasi Computer Vision (OpenCV)
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="position-relative">
                          {previewUrl && (
                            <img
                              src={previewUrl}
                              alt="Target Sasaran"
                              className="w-100 rounded"
                              style={{
                                maxHeight: "340px",
                                objectFit: "contain",
                                opacity: 0.85,
                              }}
                            />
                          )}

                          <svg
                            viewBox="0 0 100 100"
                            className="position-absolute top-0 start-0 w-100 h-100"
                            style={{ pointerEvents: "auto" }}
                          >
                            <circle
                              cx="50"
                              cy="50"
                              r="48"
                              fill="none"
                              stroke="rgba(255,255,255,0.4)"
                              strokeWidth="0.5"
                            />
                            <circle
                              cx="50"
                              cy="50"
                              r="3"
                              fill="none"
                              stroke="#dc3545"
                              strokeWidth="0.5"
                            />
                            <line
                              x1="50"
                              y1="2"
                              x2="50"
                              y2="98"
                              stroke="rgba(255,255,255,0.2)"
                              strokeWidth="0.4"
                            />
                            <line
                              x1="2"
                              y1="50"
                              x2="98"
                              y2="50"
                              stroke="rgba(255,255,255,0.2)"
                              strokeWidth="0.4"
                            />

                            {shotSelection.allShots.map((shot, idx) => {
                              const isSelected = shot.is_selected;
                              const isBull =
                                shot.is_bullseye ||
                                shot.poin === 10 ||
                                shot.ring === "10";

                              return (
                                <g
                                  key={idx}
                                  style={{ cursor: "pointer" }}
                                  onMouseEnter={() => setHoveredShot(shot)}
                                  onMouseLeave={() => setHoveredShot(null)}
                                  opacity={isSelected ? 1 : 0.45}
                                >
                                  <circle
                                    cx={shot.x}
                                    cy={shot.y}
                                    r={isSelected ? 2.4 : 2.0}
                                    fill={
                                      isSelected
                                        ? isBull
                                          ? "#ff3838"
                                          : "#ffc107"
                                        : "#6c757d"
                                    }
                                    stroke={isSelected ? "#000" : "#dc3545"}
                                    strokeWidth={isSelected ? 0.6 : 0.8}
                                    strokeDasharray={isSelected ? "none" : "1,1"}
                                  />
                                  <circle
                                    cx={shot.x}
                                    cy={shot.y}
                                    r={isSelected ? 0.9 : 0.6}
                                    fill={
                                      isSelected
                                        ? isBull
                                          ? "#ffffff"
                                          : "#dc3545"
                                        : "#ffffff"
                                    }
                                  />
                                  <text
                                    x={shot.x}
                                    y={shot.y - 3}
                                    fill={isSelected ? "#fff" : "#ffc107"}
                                    fontSize="2.8"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                  >
                                    {shot.nomor_tampil || idx + 1}
                                    {!isSelected && " (✕)"}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>

                          {hoveredShot && (
                            <div
                              className="position-absolute bg-dark text-white p-2 rounded shadow small border border-light"
                              style={{
                                bottom: "10px",
                                left: "50%",
                                transform: "translateX(-50%)",
                                zIndex: 10,
                                fontSize: "0.75rem",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Tembakan #{hoveredShot.nomor_tampil || hoveredShot.nomor}: Skor{" "}
                              <strong>{hoveredShot.poin}</strong> (Ring{" "}
                              {hoveredShot.ring})
                              {hoveredShot.distance_mm > 0 &&
                                ` • Jarak ${Number(hoveredShot.distance_mm).toFixed(1)} mm`}
                              {" • "}
                              {hoveredShot.is_selected ? (
                                <span className="text-success fw-bold">
                                  ✓ Terpilih (Peringkat #{hoveredShot.rank_terbaik})
                                </span>
                              ) : (
                                <span className="text-warning fw-bold">
                                  ✕ Diabaikan (Melebihi Kuota {bulletQuota} Peluru)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="text-white-50 small mt-2">
                        {analysisResult.shots_detected} Perkenaan Terdeteksi
                        {shotSelection.isQuotaExceeded && (
                          <span className="text-warning fw-semibold ms-1">
                            ({bulletQuota} Terbaik Dinilai)
                          </span>
                        )}
                        {" • "}Radius Dispersi: ±{analysisResult.grouping_diameter_mm} mm
                      </div>
                    </div>
                  </div>

                  {/* Evaluasi Balistik & Saran Taktis Instruktur */}
                  <div className="col-12 col-lg-6">
                    <div className="card border p-3 bg-body mb-3">
                      <h6 className="fw-bold mb-2 text-primary d-flex align-items-center gap-2">
                        <i className="bi bi-lightbulb-fill text-warning"></i>
                        Saran & Rekomendasi Taktis Koreksi Menembak:
                      </h6>
                      <p className="small text-secondary mb-2">
                        {analysisResult.analisa_sebaran}
                      </p>
                      <ul className="mb-0 ps-3 small text-dark">
                        {analysisResult.saran.map((item, idx) => (
                          <li key={idx} className="mb-1">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Tabel Rincian Tembakan */}
                    <div className="card border p-2 bg-body">
                      <div className="d-flex justify-content-between align-items-center mb-2 px-1">
                        <span className="small fw-bold">
                          Daftar Butir Tembakan:
                        </span>
                        <div className="d-flex align-items-center gap-1">
                          <span className="badge bg-primary text-white">
                            {shotSelection.bestShots.length} Terpilih
                          </span>
                          {shotSelection.isQuotaExceeded && (
                            <span className="badge bg-warning text-dark">
                              +{shotSelection.excessCount} Diabaikan
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className="table-responsive"
                        style={{ maxHeight: "190px" }}
                      >
                        <table className="table table-sm table-hover mb-0 text-center small align-middle font-monospace">
                          <thead className="table-light sticky-top">
                            <tr>
                              <th>No</th>
                              <th>Ring</th>
                              <th>Poin</th>
                              <th>Jarak (mm)</th>
                              <th>Status Seleksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {shotSelection.allShots.map((s, idx) => {
                              const isSelected = s.is_selected;
                              return (
                                <tr
                                  key={idx}
                                  className={
                                    !isSelected
                                      ? "table-warning bg-opacity-25 opacity-75"
                                      : ""
                                  }
                                >
                                  <td className="fw-bold">
                                    <span
                                      className={`badge rounded-circle px-2 py-1 ${
                                        isSelected ? "bg-dark" : "bg-secondary"
                                      }`}
                                    >
                                      #{s.nomor_tampil || idx + 1}
                                    </span>
                                  </td>
                                  <td>Ring {s.ring}</td>
                                  <td>
                                    <span
                                      className={`badge ${
                                        !isSelected
                                          ? "bg-secondary text-decoration-line-through"
                                          : s.poin >= 9
                                          ? "bg-success"
                                          : s.poin >= 7
                                          ? "bg-primary"
                                          : "bg-secondary"
                                      }`}
                                    >
                                      {s.poin}
                                    </span>
                                  </td>
                                  <td className="text-secondary">
                                    {s.distance_mm
                                      ? Number(s.distance_mm).toFixed(1)
                                      : "-"}
                                  </td>
                                  <td>
                                    {isSelected ? (
                                      <span className="badge bg-success-subtle text-success border border-success">
                                        <i className="bi bi-check-circle-fill me-1"></i>
                                        Terpilih (Peringkat #{s.rank_terbaik})
                                      </span>
                                    ) : (
                                      <span
                                        className="badge bg-warning-subtle text-dark border border-warning"
                                        title="Diabaikan karena melebihi kuota peluru babak"
                                      >
                                        <i className="bi bi-x-circle-fill me-1 text-danger"></i>
                                        Diabaikan (Kelebihan)
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
                  </div>
                </div>

                {/* TOMBOL TERAPKAN */}
                <div className="d-flex flex-column flex-sm-row justify-content-end gap-2 pt-2 border-top">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={handleModalClose}
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    className="btn btn-success px-4 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                    onClick={handleApply}
                    disabled={isSaving || isProcessing}
                  >
                    {isSaving ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm"
                          role="status"
                          aria-hidden="true"
                        />
                        <span className="fw-bold">
                          Menyimpan ke SITRAK-Backend...
                        </span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-cloud-arrow-up-fill fs-5"></i>
                        <span className="fw-bold">
                          Terapkan & Simpan ke SITRAK-Backend
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER MODAL */}
          <div className="modal-footer bg-light p-2">
            <small className="text-muted me-auto d-none d-md-block">
              <i className="bi bi-shield-check me-1 text-primary"></i>
              SITRAK-Detect Vision Service • Endpoint: {getDetectApiUrl()}
            </small>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={handleModalClose}
              disabled={isProcessing}
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
