import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    detectUploadShots,
    streamFrameDetection,
    getShotsHistory,
    connectShotsWebSocket,
} from "../../services/shotDetectionService";
import { AnnotationImageViewer } from "./AnnotationImageViewer";
import { CameraCaptureView } from "./CameraCaptureView";
import { ShotScoreboardPanel } from "./ShotScoreboardPanel";

/**
 * Komponen Utama: "Analisis & Deteksi Target Tembak" SITRAK
 * Mengintegrasikan Mode Upload Foto, Mode Kamera Real-Time,
 * Viewer Anotasi Zoom/Pan, dan Papan Skor Analisis.
 */
export const TargetDetectionSection = ({
    sessionId,
    sesiData = null,
    initialShooter = null,
    initialBabak = null,
}) => {
    // Mode input aktif: 'upload' atau 'camera'
    const [inputMode, setInputMode] = useState("upload");

    // State form upload
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    // Filter asosiasi personel dan babak
    const [selectedPersonelId, setSelectedPersonelId] = useState(
        initialShooter?.id_personel_penembak || ""
    );
    const [selectedBabakId, setSelectedBabakId] = useState(
        initialBabak?.id_babak || ""
    );

    // Parameter kalibrasi AI opsional
    const [darkThreshold, setDarkThreshold] = useState(75);
    const [mockIfEmpty, setMockIfEmpty] = useState(true);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

    // State proses analisis
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    // Hasil deteksi aktif
    const [detectionResult, setDetectionResult] = useState(null);
    const [selectedShotNumber, setSelectedShotNumber] = useState(null);

    // Riwayat deteksi sesi ini
    const [historyList, setHistoryList] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // WebSocket state
    const [wsStatus, setWsStatus] = useState("disconnected"); // 'connecting' | 'connected' | 'disconnected'
    const wsRef = useRef(null);
    const fileInputRef = useRef(null);

    // Muat riwayat deteksi sesi ini dari API
    const loadHistory = useCallback(async () => {
        if (!sessionId) return;
        setLoadingHistory(true);
        try {
            const data = await getShotsHistory(sessionId);
            setHistoryList(data || []);

            // Jika belum ada detectionResult aktif dan ada riwayat, muat riwayat paling baru
            if (!detectionResult && data && data.length > 0) {
                const latest = data[0];
                setDetectionResult({
                    original_image_url: latest.original_image_url,
                    annotated_image_url: latest.annotated_image_url,
                    shots: latest.shot_coordinates || [],
                    summary: {
                        total_shots: latest.total_shots || 0,
                        total_score: latest.total_score || 0,
                        max_score: (latest.total_shots || 0) * 10,
                        average_score: latest.average_score || 0,
                        accuracy_percent: latest.total_shots
                            ? Math.round(((latest.total_score || 0) / (latest.total_shots * 10)) * 100)
                            : 0,
                        grouping_diameter_px: latest.grouping_size || 0,
                        grouping_radius_mm: (latest.grouping_size ? latest.grouping_size * 0.42 : 0).toFixed(1),
                        bias_direction: latest.bias_direction || "Center",
                    },
                    created_at: latest.created_at,
                });
            }
        } catch (err) {
            console.warn("Gagal memuat riwayat tembakan:", err);
        } finally {
            setLoadingHistory(false);
        }
    }, [sessionId, detectionResult]);

    // Hubungkan WebSocket saat sesi dibuka
    useEffect(() => {
        if (!sessionId) return;

        const connection = connectShotsWebSocket(sessionId, {
            onStatusChange: (status) => {
                setWsStatus(status);
            },
            onMessage: (msg) => {
                if (msg.event === "SHOT_DETECTED" && msg.data) {
                    const shotData = msg.data;
                    setDetectionResult((prev) => ({
                        ...prev,
                        ...shotData,
                        shots: shotData.shots || shotData.current_shots || [],
                        summary: shotData.summary || prev?.summary || {},
                    }));
                    setSuccessMsg("Pembaruan tembakan real-time diterima!");
                    setTimeout(() => setSuccessMsg(null), 3500);
                }
            },
            onError: (err) => {
                console.warn("WebSocket Shot Detection error:", err);
            },
        });

        wsRef.current = connection;
        loadHistory();

        return () => {
            if (wsRef.current) {
                wsRef.current.disconnect();
            }
        };
    }, [sessionId, loadHistory]);

    // Sinkronkan initialShooter jika berubah dari parent
    useEffect(() => {
        if (initialShooter?.id_personel_penembak) {
            setSelectedPersonelId(initialShooter.id_personel_penembak);
        }
    }, [initialShooter]);

    // File input change handler
    const handleFileChange = (file) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setErrorMsg("Format berkas tidak didukung. Harap pilih berkas gambar (JPG, PNG, JPEG).");
            return;
        }

        setSelectedFile(file);
        setErrorMsg(null);
        setSuccessMsg(null);

        // Buat local preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewUrl(e.target.result);
        };
        reader.readAsDataURL(file);
    };

    // Drag and Drop handlers
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

    // Jalankan analisis deteksi file gambar upload
    const handleRunUploadDetection = async () => {
        if (!selectedFile) {
            setErrorMsg("Silakan pilih atau seret foto sasaran terlebih dahulu.");
            return;
        }

        setIsProcessing(true);
        setUploadProgress(0);
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
            const res = await detectUploadShots(
                sessionId,
                {
                    file: selectedFile,
                    id_babak: selectedBabakId || undefined,
                    id_personel_penembak: selectedPersonelId || undefined,
                    darkThreshold,
                    mockIfEmpty,
                },
                (progress) => {
                    setUploadProgress(progress);
                }
            );

            if (res && res.data) {
                setDetectionResult(res.data);
                setSuccessMsg("Deteksi tembakan berhasil diproses oleh AI Computer Vision!");
                loadHistory();
            } else {
                throw new Error("Respon tidak valid dari server analitik");
            }
        } catch (err) {
            console.error("Gagal mendeteksi tembakan:", err);
            const msg =
                err.response?.data?.error ||
                err.response?.data?.message ||
                err.message ||
                "Gagal memproses citra sasaran tembak.";
            setErrorMsg(`Kesalahan Analisis: ${msg}`);
        } finally {
            setIsProcessing(false);
            setUploadProgress(0);
        }
    };

    // Handler capture photo dari kamera real-time
    const handleCameraCapture = async (blob) => {
        setIsProcessing(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        const capturedFile = new File([blob], `camera_target_${Date.now()}.jpg`, {
            type: "image/jpeg",
        });

        // Set sebagai file aktif dan preview
        setSelectedFile(capturedFile);
        setPreviewUrl(URL.createObjectURL(blob));

        try {
            const res = await detectUploadShots(sessionId, {
                file: capturedFile,
                id_babak: selectedBabakId || undefined,
                id_personel_penembak: selectedPersonelId || undefined,
                darkThreshold,
                mockIfEmpty,
            });

            if (res && res.data) {
                setDetectionResult(res.data);
                setSuccessMsg("Foto dari kamera berhasil ditangkap dan dianalisis!");
                loadHistory();
            }
        } catch (err) {
            console.error("Gagal memproses snapshot kamera:", err);
            setErrorMsg(
                err.response?.data?.error || "Gagal menganalisis snapshot foto dari kamera."
            );
        } finally {
            setIsProcessing(false);
        }
    };

    // Handler live streaming frame interval
    const handleCameraStreamFrame = async (frameBase64) => {
        try {
            await streamFrameDetection(sessionId, frameBase64, mockIfEmpty);
        } catch (err) {
            console.warn("Gagal kirim streaming frame:", err);
        }
    };

    // Pilih item riwayat untuk ditinjau
    const handleSelectHistoryItem = (item) => {
        setDetectionResult({
            original_image_url: item.original_image_url,
            annotated_image_url: item.annotated_image_url,
            shots: item.shot_coordinates || [],
            summary: {
                total_shots: item.total_shots || 0,
                total_score: item.total_score || 0,
                max_score: (item.total_shots || 0) * 10,
                average_score: item.average_score || 0,
                accuracy_percent: item.total_shots
                    ? Math.round(((item.total_score || 0) / (item.total_shots * 10)) * 100)
                    : 0,
                grouping_diameter_px: item.grouping_size || 0,
                grouping_radius_mm: (item.grouping_size ? item.grouping_size * 0.42 : 0).toFixed(1),
                bias_direction: item.bias_direction || "Center",
            },
            created_at: item.created_at,
        });
    };

    return (
        <div className="d-flex flex-column gap-4">
            {/* 1. TOP CONTROL BAR & WEBSOCKET STATUS */}
            <div className="card border-0 shadow-sm bg-body-tertiary p-3">
                <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                            <h5 className="fw-bold mb-0">
                                <i className="bi bi-cpu-fill me-2 text-danger"></i>
                                Analisis & Deteksi Target Tembak (Computer Vision)
                            </h5>
                            <span className="badge bg-danger-subtle text-danger border border-danger small">
                                AI Vision Scoring
                            </span>
                        </div>
                        <small className="text-secondary">
                            Mendeteksi lubang peluru otomatis, mengkalkulasi cincin skor (1 - 10), dan menganalisis sebaran tembakan secara presisi.
                        </small>
                    </div>

                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        {/* Status WebSocket Indicator */}
                        <div
                            className={`badge d-flex align-items-center gap-2 px-3 py-2 border ${
                                wsStatus === "connected"
                                    ? "bg-success-subtle text-success border-success"
                                    : wsStatus === "connecting"
                                    ? "bg-warning-subtle text-warning border-warning"
                                    : "bg-secondary-subtle text-secondary border-secondary"
                            }`}
                        >
                            <span
                                className={`rounded-circle d-inline-block ${
                                    wsStatus === "connected" ? "bg-success animate-pulse" : "bg-secondary"
                                }`}
                                style={{ width: "8px", height: "8px" }}
                            ></span>
                            <span className="small">
                                {wsStatus === "connected"
                                    ? "Live WebSocket Terhubung"
                                    : wsStatus === "connecting"
                                    ? "Menghubungkan WS..."
                                    : "WebSocket Offline"}
                            </span>
                        </div>

                        {/* Mode Input Selector Tabs */}
                        <div className="btn-group btn-group-sm">
                            <button
                                type="button"
                                className={`btn ${
                                    inputMode === "upload" ? "btn-primary fw-bold" : "btn-outline-secondary"
                                }`}
                                onClick={() => setInputMode("upload")}
                            >
                                <i className="bi bi-cloud-arrow-up me-1"></i>
                                Unggah Foto Target
                            </button>
                            <button
                                type="button"
                                className={`btn ${
                                    inputMode === "camera" ? "btn-primary fw-bold" : "btn-outline-secondary"
                                }`}
                                onClick={() => setInputMode("camera")}
                            >
                                <i className="bi bi-camera-video me-1"></i>
                                Kamera Real-Time
                            </button>
                        </div>
                    </div>
                </div>

                {/* Feedback Alerts */}
                {errorMsg && (
                    <div className="alert alert-danger alert-dismissible fade show mt-3 mb-0 d-flex align-items-center small" role="alert">
                        <i className="bi bi-exclamation-triangle-fill me-2 fs-6"></i>
                        <div className="flex-grow-1">{errorMsg}</div>
                        <button type="button" className="btn-close" onClick={() => setErrorMsg(null)}></button>
                    </div>
                )}
                {successMsg && (
                    <div className="alert alert-success alert-dismissible fade show mt-3 mb-0 d-flex align-items-center small" role="alert">
                        <i className="bi bi-check-circle-fill me-2 fs-6"></i>
                        <div className="flex-grow-1">{successMsg}</div>
                        <button type="button" className="btn-close" onClick={() => setSuccessMsg(null)}></button>
                    </div>
                )}
            </div>

            {/* 2. AREA INPUT SESUAI MODE YANG DIPILIH */}
            {inputMode === "camera" ? (
                /* MODE KAMERA REAL-TIME */
                <CameraCaptureView
                    onCapturePhoto={handleCameraCapture}
                    onStreamFrame={handleCameraStreamFrame}
                    isProcessing={isProcessing}
                    onClose={() => setInputMode("upload")}
                />
            ) : (
                /* MODE UPLOAD FOTO */
                <div className="card border-0 shadow-sm bg-body-tertiary p-3">
                    <div className="row g-3">
                        {/* Drag and Drop Zone */}
                        <div className="col-12 col-lg-7">
                            <div
                                className={`border-2 border-dashed rounded-3 p-4 text-center position-relative transition-all ${
                                    dragActive ? "border-primary bg-primary bg-opacity-10" : "border-secondary bg-body"
                                }`}
                                style={{
                                    borderStyle: "dashed",
                                    cursor: "pointer",
                                    minHeight: "220px",
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
                                />

                                {previewUrl ? (
                                    <div className="d-flex flex-column align-items-center">
                                        <img
                                            src={previewUrl}
                                            alt="Preview Sasaran"
                                            className="rounded shadow-sm mb-2"
                                            style={{ maxHeight: "160px", maxWidth: "100%", objectFit: "contain" }}
                                        />
                                        <small className="text-muted fw-semibold">
                                            {selectedFile?.name} ({(selectedFile?.size / 1024).toFixed(1)} KB)
                                        </small>
                                        <small className="text-primary mt-1">
                                            <i className="bi bi-arrow-repeat me-1"></i>Klik untuk ganti gambar
                                        </small>
                                    </div>
                                ) : (
                                    <div className="py-4">
                                        <div className="fs-1 text-primary mb-2">
                                            <i className="bi bi-cloud-arrow-up"></i>
                                        </div>
                                        <h6 className="fw-bold mb-1">
                                            Seret & Lepaskan Foto Target di Sini
                                        </h6>
                                        <p className="text-secondary small mb-2">
                                            Atau klik untuk memilih berkas dari perangkat Anda (JPG, PNG, JPEG)
                                        </p>
                                        <button type="button" className="btn btn-sm btn-outline-primary px-3">
                                            Pilih Berkas Citra
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Parameter & Association Panel */}
                        <div className="col-12 col-lg-5">
                            <div className="p-3 bg-body rounded border h-100 d-flex flex-column justify-content-between">
                                <div>
                                    <h6 className="fw-bold mb-3 text-primary">
                                        <i className="bi bi-sliders me-1"></i>
                                        Konfigurasi Deteksi & Personel
                                    </h6>

                                    {/* Pilih Personel Penembak (Opsional) */}
                                    <div className="mb-2">
                                        <label className="form-label small fw-semibold text-secondary mb-1">
                                            Personel Penembak:
                                        </label>
                                        <select
                                            className="form-select form-select-sm"
                                            value={selectedPersonelId}
                                            onChange={(e) => setSelectedPersonelId(e.target.value)}
                                        >
                                            <option value="">-- Umum / Tanpa Personel Khusus --</option>
                                            {sesiData?.gelombang_list?.flatMap((g) => g.penembak || []).map((p, pIdx) => (
                                                <option key={p.id_personel_penembak || pIdx} value={p.id_personel_penembak}>
                                                    Lane {p.lane || pIdx + 1} - {p.nama} ({p.satuan || p.nrp})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Pilih Babak (Opsional) */}
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold text-secondary mb-1">
                                            Babak Tembakan:
                                        </label>
                                        <select
                                            className="form-select form-select-sm"
                                            value={selectedBabakId}
                                            onChange={(e) => setSelectedBabakId(e.target.value)}
                                        >
                                            <option value="">-- Semua / Babak Aktif --</option>
                                            {sesiData?.babak?.map((b) => (
                                                <option key={b.id_babak || b.nomor_babak} value={b.id_babak || b.nomor_babak}>
                                                    Babak {b.nomor_babak} ({b.nama_babak} - {b.jumlah_peluru} Peluru)
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Advanced CV Options */}
                                    <div className="mb-2">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-link p-0 text-decoration-none small text-muted"
                                            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                                        >
                                            <i className={`bi ${showAdvancedOptions ? "bi-chevron-up" : "bi-chevron-down"} me-1`}></i>
                                            Pengaturan Lanjutan Computer Vision
                                        </button>
                                    </div>

                                    {showAdvancedOptions && (
                                        <div className="p-2 bg-body-tertiary rounded border mb-3 small">
                                            <div className="mb-2">
                                                <label className="form-label text-muted d-flex justify-content-between mb-1" style={{ fontSize: "0.75rem" }}>
                                                    <span>Sensitivitas Ambang Gelap:</span>
                                                    <strong>{darkThreshold}</strong>
                                                </label>
                                                <input
                                                    type="range"
                                                    className="form-range"
                                                    min="30"
                                                    max="130"
                                                    value={darkThreshold}
                                                    onChange={(e) => setDarkThreshold(parseInt(e.target.value))}
                                                />
                                            </div>
                                            <div className="form-check form-switch mb-0">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="mockSwitch"
                                                    checked={mockIfEmpty}
                                                    onChange={(e) => setMockIfEmpty(e.target.checked)}
                                                />
                                                <label className="form-check-label text-muted" htmlFor="mockSwitch" style={{ fontSize: "0.75rem" }}>
                                                    Fallback Cerdas jika target buram/kabur
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Progress Bar & Submit Button */}
                                <div className="mt-3">
                                    {isProcessing && (
                                        <div className="mb-2">
                                            <div className="d-flex justify-content-between small text-muted mb-1">
                                                <span>Memproses Computer Vision...</span>
                                                <span>{uploadProgress}%</span>
                                            </div>
                                            <div className="progress" style={{ height: "6px" }}>
                                                <div
                                                    className="progress-bar progress-bar-striped progress-bar-animated bg-danger"
                                                    style={{ width: `${Math.max(uploadProgress, 25)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        className="btn btn-danger w-100 py-2 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                                        onClick={handleRunUploadDetection}
                                        disabled={!selectedFile || isProcessing}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm" role="status" />
                                                <span>Menganalisis Titik Tembakan...</span>
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-play-circle-fill fs-5"></i>
                                                <span className="fw-bold">Jalankan Deteksi AI Sekarang</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. HASIL DETEKSI: VIEWER ANOTASI & PAPAN SKOR */}
            {detectionResult ? (
                <div className="row g-3">
                    {/* Kolom Kiri: Viewer Anotasi Gambar Interaktif */}
                    <div className="col-12 col-xl-7">
                        <AnnotationImageViewer
                            originalImageUrl={detectionResult.original_image_url}
                            annotatedImageUrl={detectionResult.annotated_image_url}
                            shots={detectionResult.shots || []}
                            summary={detectionResult.summary || {}}
                            targetDimension={detectionResult.analysis_metadata?.target_dimension}
                            selectedShotNumber={selectedShotNumber}
                            onSelectShot={(shot) => setSelectedShotNumber(shot.shot_number)}
                        />
                    </div>

                    {/* Kolom Kanan: Panel Papan Skor & Diagram Polar */}
                    <div className="col-12 col-xl-5">
                        <ShotScoreboardPanel
                            summary={detectionResult.summary || {}}
                            shots={detectionResult.shots || []}
                            selectedShotNumber={selectedShotNumber}
                            onSelectShot={(shot) => setSelectedShotNumber(shot.shot_number)}
                        />
                    </div>
                </div>
            ) : (
                /* Empty state notice jika belum ada deteksi */
                <div className="card border-0 shadow-sm bg-body-tertiary p-5 text-center">
                    <div className="mx-auto text-secondary mb-3 fs-1">
                        <i className="bi bi-bullseye"></i>
                    </div>
                    <h5 className="fw-bold mb-1">Siap Menganalisis Sasaran Tembak</h5>
                    <p className="text-secondary small max-w-md mx-auto mb-3" style={{ maxWidth: "480px" }}>
                        Unggah foto kertas target sasaran atau aktifkan kamera real-time di atas untuk mendeteksi lubang peluru, cincin nilai, dan analisis sebaran tembakan secara otomatis.
                    </p>
                </div>
            )}

            {/* 4. RIWAYAT DETEKSI TEMBAKAN PADA SESI INI */}
            {historyList.length > 0 && (
                <div className="card border-0 shadow-sm bg-body-tertiary p-3">
                    <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                        <h6 className="fw-bold mb-0">
                            <i className="bi bi-clock-history me-2 text-primary"></i>
                            Riwayat Deteksi Tembakan Sesi Ini ({historyList.length})
                        </h6>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={loadHistory}
                            disabled={loadingHistory}
                        >
                            <i className={`bi bi-arrow-clockwise me-1 ${loadingHistory ? "spin" : ""}`}></i>
                            Refresh Riwayat
                        </button>
                    </div>

                    <div className="row g-2">
                        {historyList.map((item, idx) => (
                            <div key={item.id || idx} className="col-12 col-sm-6 col-md-4 col-xl-3">
                                <div
                                    className="card border p-2 bg-body hover-shadow cursor-pointer transition-all h-100"
                                    style={{ cursor: "pointer" }}
                                    onClick={() => handleSelectHistoryItem(item)}
                                >
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <img
                                            src={item.annotated_image_url || item.original_image_url}
                                            alt="Sasaran"
                                            className="rounded border"
                                            style={{ width: "48px", height: "48px", objectFit: "cover" }}
                                        />
                                        <div className="overflow-hidden">
                                            <div className="fw-bold text-truncate small">
                                                Analisis #{item.id || idx + 1}
                                            </div>
                                            <small className="text-muted text-truncate d-block" style={{ fontSize: "0.72rem" }}>
                                                {item.created_at ? new Date(item.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "Baru saja"}
                                            </small>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-center justify-content-between small text-secondary border-top pt-1">
                                        <span>
                                            <strong className="text-primary">{item.total_shots || 0}</strong> Tembakan
                                        </span>
                                        <span className="badge bg-warning-subtle text-warning border border-warning">
                                            Skor: {item.total_score || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

