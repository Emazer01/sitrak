import React, { useState, useRef, useEffect, useCallback } from "react";

/**
 * Komponen Kamera Real-Time SITRAK:
 * - Mengakses webcam/kamera perangkat (navigator.mediaDevices.getUserMedia).
 * - Overlay panduan target bundar (Circular Alignment Reticle) untuk meluruskan posisi sasaran.
 * - Mode Snapshot (ambil foto sasaran & kirim ke deteksi AI).
 * - Mode Live Streaming (interval frame capture otomatis berkala).
 */
export const CameraCaptureView = ({
    onCapturePhoto,
    onStreamFrame,
    isProcessing = false,
    onClose = null,
}) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const streamIntervalRef = useRef(null);

    // State kamera
    const [devices, setDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState("");
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState(null);

    // Mode live stream otomatis
    const [isLiveStreaming, setIsLiveStreaming] = useState(false);
    const [streamFrameCount, setStreamFrameCount] = useState(0);

    // Flash visual effect saat capture
    const [isFlashing, setIsFlashing] = useState(false);

    // Dapatkan daftar perangkat video input
    const getCameraDevices = useCallback(async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                return;
            }
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = allDevices.filter((d) => d.kind === "videoinput");
            setDevices(videoInputs);
            if (videoInputs.length > 0 && !selectedDeviceId) {
                // Prioritaskan kamera belakang jika ada (environment)
                const backCam = videoInputs.find(
                    (d) =>
                        d.label.toLowerCase().includes("back") ||
                        d.label.toLowerCase().includes("rear") ||
                        d.label.toLowerCase().includes("belakang")
                );
                setSelectedDeviceId(backCam ? backCam.deviceId : videoInputs[0].deviceId);
            }
        } catch (err) {
            console.warn("Gagal enumerasi device kamera:", err);
        }
    }, [selectedDeviceId]);

    // Hentikan video stream yang sedang berjalan
    const stopCamera = useCallback(() => {
        if (streamIntervalRef.current) {
            clearInterval(streamIntervalRef.current);
            streamIntervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
        setIsLiveStreaming(false);
    }, []);

    // Mulai kamera dengan constraint yang sesuai
    const startCamera = useCallback(async () => {
        stopCamera();
        setCameraError(null);

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCameraError(
                "Browser tidak mendukung akses kamera (WebRTC getUserMedia). Pastikan menggunakan koneksi HTTPS atau localhost."
            );
            return;
        }

        try {
            const constraints = {
                video: {
                    deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: selectedDeviceId ? undefined : { ideal: "environment" },
                },
                audio: false,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setCameraActive(true);
            }

            // Update device list setelah izin diberikan
            getCameraDevices();
        } catch (err) {
            console.error("Gagal membuka kamera:", err);
            let msg = "Gagal mengakses kamera perangkat.";
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                msg = "Akses kamera ditolak oleh pengguna/browser. Mohon izinkan akses kamera di pengaturan browser.";
            } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                msg = "Tidak ditemukan perangkat kamera yang terpasang pada sistem ini.";
            } else if (err.name === "NotReadableError") {
                msg = "Kamera sedang digunakan oleh aplikasi lain.";
            }
            setCameraError(msg);
            setCameraActive(false);
        }
    }, [selectedDeviceId, stopCamera, getCameraDevices]);

    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
    }, [startCamera, stopCamera]);

    // Tangkap satu frame ke blob foto
    const captureSnapshot = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Flash effect
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 200);

        canvas.toBlob(
            (blob) => {
                if (blob && onCapturePhoto) {
                    onCapturePhoto(blob);
                }
            },
            "image/jpeg",
            0.92
        );
    }, [onCapturePhoto]);

    // Live Streaming loop: ambil frame JPEG base64 berkala
    useEffect(() => {
        if (isLiveStreaming && cameraActive) {
            streamIntervalRef.current = setInterval(() => {
                if (!videoRef.current || !canvasRef.current || isProcessing) return;

                const video = videoRef.current;
                const canvas = canvasRef.current;
                canvas.width = Math.min(video.videoWidth || 800, 800);
                canvas.height = Math.min(video.videoHeight || 600, 600);

                const ctx = canvas.getContext("2d");
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                const base64 = canvas.toDataURL("image/jpeg", 0.75);
                setStreamFrameCount((c) => c + 1);

                if (onStreamFrame) {
                    onStreamFrame(base64);
                }
            }, 1800); // interval tiap 1.8 detik
        } else {
            if (streamIntervalRef.current) {
                clearInterval(streamIntervalRef.current);
                streamIntervalRef.current = null;
            }
        }

        return () => {
            if (streamIntervalRef.current) {
                clearInterval(streamIntervalRef.current);
            }
        };
    }, [isLiveStreaming, cameraActive, isProcessing, onStreamFrame]);

    return (
        <div className="card border-0 shadow-lg bg-dark text-white overflow-hidden position-relative rounded-3">
            {/* 1. HEADER KONTROL KAMERA */}
            <div className="d-flex flex-wrap align-items-center justify-content-between p-3 bg-black bg-opacity-75 border-bottom border-secondary gap-2 z-3">
                <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-danger p-2 rounded-circle animate-pulse"></span>
                    <h6 className="fw-bold mb-0 text-white">
                        <i className="bi bi-camera-video-fill me-2 text-danger"></i>
                        Live Camera Feed & Alignment Target
                    </h6>
                    {isLiveStreaming && (
                        <span className="badge bg-success-subtle text-success border border-success small ms-2">
                            <i className="bi bi-broadcast me-1"></i>
                            Live AI Streaming #{streamFrameCount}
                        </span>
                    )}
                </div>

                <div className="d-flex align-items-center gap-2">
                    {/* Device Selector */}
                    {devices.length > 1 && (
                        <select
                            className="form-select form-select-sm bg-dark text-white border-secondary"
                            style={{ maxWidth: "180px" }}
                            value={selectedDeviceId}
                            onChange={(e) => setSelectedDeviceId(e.target.value)}
                        >
                            {devices.map((d, idx) => (
                                <option key={d.deviceId || idx} value={d.deviceId}>
                                    {d.label || `Kamera ${idx + 1}`}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Tombol Tutup Kamera jika disediakan */}
                    {onClose && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => {
                                stopCamera();
                                onClose();
                            }}
                        >
                            <i className="bi bi-x-lg"></i> Tutup Kamera
                        </button>
                    )}
                </div>
            </div>

            {/* 2. AREA TAMPILAN VIDEO DENGAN RETICLE OVERLAY */}
            <div
                className="position-relative d-flex align-items-center justify-content-center bg-black overflow-hidden"
                style={{ minHeight: "440px", maxHeight: "560px" }}
            >
                {/* Elemen Video WebRTC */}
                <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-100 h-auto"
                    style={{
                        objectFit: "cover",
                        maxHeight: "560px",
                        filter: isFlashing ? "brightness(3)" : "none",
                        transition: "filter 0.15s ease",
                    }}
                />

                {/* Hidden Canvas untuk Capture & Streaming */}
                <canvas ref={canvasRef} className="d-none" />

                {/* Pesan Error / Fallback */}
                {cameraError && (
                    <div className="position-absolute top-50 start-50 translate-middle text-center p-4 bg-dark bg-opacity-90 rounded-3 border border-danger max-w-md w-75 shadow-lg z-3">
                        <i className="bi bi-camera-video-off fs-1 text-danger d-block mb-2"></i>
                        <h6 className="fw-bold text-danger">Akses Kamera Gagal</h6>
                        <p className="small text-white-50 mb-3">{cameraError}</p>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-light"
                            onClick={startCamera}
                        >
                            <i className="bi bi-arrow-clockwise me-1"></i> Coba Akses Lagi
                        </button>
                    </div>
                )}

                {/* Loading camera state */}
                {!cameraActive && !cameraError && (
                    <div className="position-absolute top-50 start-50 translate-middle text-center text-white-50 z-3">
                        <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                        <span>Menginisialisasi kamera...</span>
                    </div>
                )}

                {/* 3. CIRCULAR TARGET ALIGNMENT RETICLE OVERLAY */}
                {cameraActive && (
                    <div
                        className="position-absolute top-0 start-0 w-100 h-100 pointer-events-none d-flex align-items-center justify-content-center"
                        style={{ pointerEvents: "none" }}
                    >
                        <svg
                            className="w-100 h-100 position-absolute"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="xMidYMid meet"
                            style={{ opacity: 0.85 }}
                        >
                            {/* Cincin konsentris panduan target */}
                            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(0, 229, 255, 0.4)" strokeWidth="0.5" strokeDasharray="2,2" />
                            <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(0, 229, 255, 0.4)" strokeWidth="0.5" strokeDasharray="2,2" />
                            <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(0, 229, 255, 0.5)" strokeWidth="0.6" strokeDasharray="3,3" />
                            <circle cx="50" cy="50" r="20" fill="none" stroke="rgba(0, 229, 255, 0.6)" strokeWidth="0.8" />
                            <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255, 23, 68, 0.7)" strokeWidth="1" />
                            <circle cx="50" cy="50" r="5" fill="none" stroke="#ff1744" strokeWidth="1.2" />
                            <circle cx="50" cy="50" r="1.5" fill="#ff1744" />

                            {/* Crosshair Horizontal & Vertikal */}
                            <line x1="6" y1="50" x2="44" y2="50" stroke="rgba(255, 23, 68, 0.8)" strokeWidth="0.6" />
                            <line x1="56" y1="50" x2="94" y2="50" stroke="rgba(255, 23, 68, 0.8)" strokeWidth="0.6" />
                            <line x1="50" y1="6" x2="50" y2="44" stroke="rgba(255, 23, 68, 0.8)" strokeWidth="0.6" />
                            <line x1="50" y1="56" x2="50" y2="94" stroke="rgba(255, 23, 68, 0.8)" strokeWidth="0.6" />

                            {/* Corner Viewfinder Brackets */}
                            <path d="M 8 16 L 8 8 L 16 8" fill="none" stroke="rgba(0, 230, 118, 0.8)" strokeWidth="0.8" />
                            <path d="M 92 16 L 92 8 L 84 8" fill="none" stroke="rgba(0, 230, 118, 0.8)" strokeWidth="0.8" />
                            <path d="M 8 84 L 8 92 L 16 92" fill="none" stroke="rgba(0, 230, 118, 0.8)" strokeWidth="0.8" />
                            <path d="M 92 84 L 92 92 L 84 92" fill="none" stroke="rgba(0, 230, 118, 0.8)" strokeWidth="0.8" />
                        </svg>

                        {/* Petunjuk Posisi Center Target */}
                        <div
                            className="position-absolute top-0 start-50 translate-middle-x mt-3 px-3 py-1 bg-black bg-opacity-75 text-info rounded-pill small border border-info border-opacity-50"
                            style={{ fontSize: "0.78rem" }}
                        >
                            <i className="bi bi-bullseye me-1 text-danger"></i>
                            Posisikan lingkaran merah sejajar dengan pusat target tembak (Bullseye)
                        </div>
                    </div>
                )}
            </div>

            {/* 4. BOTTOM ACTION CONTROL BAR */}
            <div className="p-3 bg-black bg-opacity-80 border-top border-secondary d-flex flex-wrap align-items-center justify-content-between gap-3 z-3">
                <div className="d-flex align-items-center gap-3">
                    {/* Live Streaming Toggle */}
                    <div className="form-check form-switch mb-0">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            id="liveStreamSwitch"
                            checked={isLiveStreaming}
                            onChange={(e) => setIsLiveStreaming(e.target.checked)}
                            disabled={!cameraActive}
                        />
                        <label className="form-check-label small fw-semibold text-white" htmlFor="liveStreamSwitch">
                            Live Stream AI Detection (Delta Frame)
                        </label>
                    </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                    {/* Snapshot Button */}
                    <button
                        type="button"
                        className="btn btn-danger px-4 py-2 d-flex align-items-center gap-2 shadow"
                        onClick={captureSnapshot}
                        disabled={!cameraActive || isProcessing}
                    >
                        {isProcessing ? (
                            <>
                                <span className="spinner-border spinner-border-sm" role="status" />
                                <span>Menganalisis...</span>
                            </>
                        ) : (
                            <>
                                <i className="bi bi-camera-fill fs-5"></i>
                                <span className="fw-bold">Ambil Foto & Analisis AI</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

