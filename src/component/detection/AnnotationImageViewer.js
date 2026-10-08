import React, { useState, useRef, useEffect, useCallback } from "react";
import { getFullImageUrl } from "../../services/shotDetectionService";

/**
 * Komponen Viewer Citra Anotasi Target Tembak SITRAK:
 * - Menampilkan citra hasil anotasi atau citra asli dengan canvas overlay interaktif.
 * - Kontrol Zoom & Pan (Drag to Pan, Scroll to Zoom, Reset).
 * - Canvas interaktif untuk menyorot detail lubang tembakan saat di-hover / di-klik.
 * - Tooltip popover real-time berisi koordinat, skor, dan jarak deviasi.
 */
export const AnnotationImageViewer = ({
    originalImageUrl,
    annotatedImageUrl,
    shots = [],
    summary = {},
    targetDimension = null,
    selectedShotNumber = null,
    onSelectShot = null,
}) => {
    // Mode tampilan: 'annotated' (citra server) vs 'overlay' (citra asli + interactive canvas)
    const [viewMode, setViewMode] = useState("annotated");

    // Zoom & Pan state
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Hover state pada titik tembakan
    const [hoveredShot, setHoveredShot] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    // Layer visibility toggles
    const [showRings, setShowRings] = useState(true);
    const [showCrosshairs, setShowCrosshairs] = useState(true);
    const [showLabels, setShowLabels] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Natural dimensions dari gambar yang dimuat
    const [imgNaturalSize, setImgNaturalSize] = useState({ width: 0, height: 0 });

    const containerRef = useRef(null);
    const imageRef = useRef(null);

    // Reset Zoom & Pan
    const handleResetZoom = useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);

    const handleZoomIn = () => {
        setZoom((prev) => Math.min(prev + 0.25, 4));
    };

    const handleZoomOut = () => {
        setZoom((prev) => Math.max(prev - 0.25, 0.4));
    };

    // Wheel zoom
    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        setZoom((prev) => Math.min(Math.max(prev + delta, 0.4), 4));
    };

    // Mouse drag pan
    const handleMouseDown = (e) => {
        // Hanya pan jika klik kiri dan bukan klik langsung pada tombol
        if (e.button !== 0) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Saat gambar selesai dimuat, ambil dimensi aslinya
    const handleImageLoad = (e) => {
        const { naturalWidth, naturalHeight } = e.target;
        setImgNaturalSize({ width: naturalWidth, height: naturalHeight });
    };

    // Fullscreen toggle
    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
        }
    };

    // Otomatis center saat ganti gambar
    useEffect(() => {
        handleResetZoom();
    }, [annotatedImageUrl, originalImageUrl, handleResetZoom]);

    // Tentukan URL gambar yang aktif
    const activeImageSrc =
        viewMode === "annotated" && annotatedImageUrl
            ? getFullImageUrl(annotatedImageUrl)
            : getFullImageUrl(originalImageUrl || annotatedImageUrl);

    // Tentukan pusat dan radius target tembak untuk overlay cincin
    const imgW = imgNaturalSize.width || 600;
    const imgH = imgNaturalSize.height || 600;
    const centerX = targetDimension?.centerX || Math.round(imgW / 2);
    const centerY = targetDimension?.centerY || Math.round(imgH / 2);
    const targetRadius = targetDimension?.radius || Math.round(Math.min(imgW, imgH) * 0.45);
    const ringStep = targetRadius / 10;

    return (
        <div
            ref={containerRef}
            className={`card border-0 shadow-sm bg-dark text-white overflow-hidden position-relative ${
                isFullscreen ? "vh-100 rounded-0" : ""
            }`}
            style={{ minHeight: "480px" }}
        >
            {/* 1. TOP TOOLBAR KONTROL VIEWER */}
            <div className="d-flex flex-wrap align-items-center justify-content-between p-2 px-3 bg-black bg-opacity-75 border-bottom border-secondary border-opacity-50 z-3 gap-2">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                    {/* View Mode Toggle */}
                    <div className="btn-group btn-group-sm">
                        <button
                            type="button"
                            className={`btn ${
                                viewMode === "annotated"
                                    ? "btn-primary fw-semibold"
                                    : "btn-outline-secondary text-white"
                            }`}
                            onClick={() => setViewMode("annotated")}
                            disabled={!annotatedImageUrl}
                            title="Tampilkan citra hasil anotasi AI dari server"
                        >
                            <i className="bi bi-robot me-1"></i>
                            Anotasi AI
                        </button>
                        <button
                            type="button"
                            className={`btn ${
                                viewMode === "overlay"
                                    ? "btn-primary fw-semibold"
                                    : "btn-outline-secondary text-white"
                            }`}
                            onClick={() => setViewMode("overlay")}
                            title="Tampilkan citra dengan interactive overlay canvas"
                        >
                            <i className="bi bi-layers-half me-1"></i>
                            Interactive Overlay
                        </button>
                    </div>

                    {/* Layer Toggles (Hanya aktif di mode overlay) */}
                    {viewMode === "overlay" && (
                        <div className="d-flex align-items-center gap-1 ms-2">
                            <button
                                type="button"
                                className={`btn btn-sm py-0 px-2 ${
                                    showRings ? "btn-outline-info active" : "btn-outline-secondary"
                                }`}
                                onClick={() => setShowRings(!showRings)}
                                title="Toggle Cincin Skor"
                            >
                                <i className="bi bi-record-circle me-1"></i>Cincin
                            </button>
                            <button
                                type="button"
                                className={`btn btn-sm py-0 px-2 ${
                                    showCrosshairs ? "btn-outline-info active" : "btn-outline-secondary"
                                }`}
                                onClick={() => setShowCrosshairs(!showCrosshairs)}
                                title="Toggle Crosshairs Bullseye"
                            >
                                <i className="bi bi-crosshair me-1"></i>Crosshair
                            </button>
                            <button
                                type="button"
                                className={`btn btn-sm py-0 px-2 ${
                                    showLabels ? "btn-outline-info active" : "btn-outline-secondary"
                                }`}
                                onClick={() => setShowLabels(!showLabels)}
                                title="Toggle Label Nomor"
                            >
                                <i className="bi bi-tag me-1"></i>Label
                            </button>
                        </div>
                    )}
                </div>

                {/* Zoom & Screen Controls */}
                <div className="d-flex align-items-center gap-2">
                    <div className="badge bg-secondary bg-opacity-50 text-white font-monospace px-2 py-1">
                        {Math.round(zoom * 100)}%
                    </div>
                    <div className="btn-group btn-group-sm">
                        <button
                            type="button"
                            className="btn btn-dark border-secondary"
                            onClick={handleZoomOut}
                            title="Zoom Out (-)"
                        >
                            <i className="bi bi-dash"></i>
                        </button>
                        <button
                            type="button"
                            className="btn btn-dark border-secondary"
                            onClick={handleResetZoom}
                            title="Reset Zoom & Posisi"
                        >
                            <i className="bi bi-arrows-angle-contract"></i>
                        </button>
                        <button
                            type="button"
                            className="btn btn-dark border-secondary"
                            onClick={handleZoomIn}
                            title="Zoom In (+)"
                        >
                            <i className="bi bi-plus"></i>
                        </button>
                    </div>
                    <button
                        type="button"
                        className="btn btn-sm btn-dark border-secondary"
                        onClick={toggleFullscreen}
                        title={isFullscreen ? "Keluar Fullscreen" : "Layar Penuh"}
                    >
                        <i className={`bi ${isFullscreen ? "bi-fullscreen-exit" : "bi-fullscreen"}`}></i>
                    </button>
                </div>
            </div>

            {/* 2. AREA KANVAS / CITRA INTERAKTIF */}
            <div
                className="position-relative flex-grow-1 d-flex align-items-center justify-content-center overflow-hidden"
                style={{
                    backgroundColor: "#0d1117",
                    cursor: isDragging ? "grabbing" : "grab",
                    userSelect: "none",
                    minHeight: "420px",
                }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Notice jika tidak ada citra */}
                {!activeImageSrc ? (
                    <div className="text-center text-muted p-5">
                        <i className="bi bi-image fs-1 d-block mb-2 text-secondary"></i>
                        <h6>Belum ada citra target tembak</h6>
                        <small className="text-white-50">
                            Unggah foto sasaran atau gunakan kamera real-time untuk melihat anotasi.
                        </small>
                    </div>
                ) : (
                    <div
                        className="position-relative d-inline-block transition-transform"
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            transformOrigin: "center center",
                            transition: isDragging ? "none" : "transform 0.1s ease-out",
                        }}
                    >
                        {/* Gambar Asli / Hasil Anotasi */}
                        <img
                            ref={imageRef}
                            src={activeImageSrc}
                            alt="Target Tembak"
                            onLoad={handleImageLoad}
                            draggable={false}
                            className="d-block shadow-lg rounded"
                            style={{
                                maxWidth: "100%",
                                maxHeight: isFullscreen ? "90vh" : "540px",
                                objectFit: "contain",
                            }}
                        />

                        {/* Interactive SVG Overlay (Dirender di atas citra) */}
                        <svg
                            className="position-absolute top-0 start-0 w-100 h-100"
                            viewBox={`0 0 ${imgW} ${imgH}`}
                            style={{
                                pointerEvents: "none",
                                display: "block",
                            }}
                        >
                            {/* Layer 1: Cincin Target Konsentris (1 - 10) */}
                            {viewMode === "overlay" && showRings && (
                                <g id="concentric-rings" opacity="0.6">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((ringIdx) => {
                                        const r = Math.round(ringStep * ringIdx);
                                        const isBullseye = ringIdx === 1;
                                        return (
                                            <circle
                                                key={ringIdx}
                                                cx={centerX}
                                                cy={centerY}
                                                r={r}
                                                fill="none"
                                                stroke={isBullseye ? "#ff1744" : "#00e5ff"}
                                                strokeWidth={isBullseye ? "2.5" : "1"}
                                                strokeDasharray={isBullseye ? "none" : "4,4"}
                                            />
                                        );
                                    })}
                                </g>
                            )}

                            {/* Layer 2: Garis Crosshair Bullseye */}
                            {viewMode === "overlay" && showCrosshairs && (
                                <g id="bullseye-crosshair" opacity="0.75">
                                    <line
                                        x1={centerX - targetRadius}
                                        y1={centerY}
                                        x2={centerX + targetRadius}
                                        y2={centerY}
                                        stroke="#ff1744"
                                        strokeWidth="1.5"
                                    />
                                    <line
                                        x1={centerX}
                                        y1={centerY - targetRadius}
                                        x2={centerX}
                                        y2={centerY + targetRadius}
                                        stroke="#ff1744"
                                        strokeWidth="1.5"
                                    />
                                    <circle cx={centerX} cy={centerY} r="4" fill="#ff1744" />
                                </g>
                            )}

                            {/* Layer 3: Interactive Shot Markers */}
                            {shots.map((shot) => {
                                const isSelected = selectedShotNumber === shot.shot_number;
                                const isHovered = hoveredShot?.shot_number === shot.shot_number;
                                const color =
                                    shot.score >= 9 ? "#00e676" : shot.score >= 7 ? "#ffea00" : "#ff1744";

                                return (
                                    <g
                                        key={shot.shot_number}
                                        id={`shot-node-${shot.shot_number}`}
                                        style={{ pointerEvents: "all", cursor: "pointer" }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onSelectShot) onSelectShot(shot);
                                        }}
                                        onMouseEnter={(e) => {
                                            const rect = containerRef.current?.getBoundingClientRect();
                                            setHoveredShot(shot);
                                            if (rect) {
                                                setTooltipPos({
                                                    x: e.clientX - rect.left,
                                                    y: e.clientY - rect.top,
                                                });
                                            }
                                        }}
                                        onMouseLeave={() => setHoveredShot(null)}
                                    >
                                        {/* Pulsing Outer Halo if selected */}
                                        {(isSelected || isHovered) && (
                                            <circle
                                                cx={shot.x}
                                                cy={shot.y}
                                                r="22"
                                                fill="none"
                                                stroke={color}
                                                strokeWidth="2"
                                                strokeDasharray="3,3"
                                                opacity="0.9"
                                            />
                                        )}

                                        {/* Outer Circle Ring */}
                                        <circle
                                            cx={shot.x}
                                            cy={shot.y}
                                            r={isSelected || isHovered ? "15" : "12"}
                                            fill={isSelected || isHovered ? "rgba(0,0,0,0.4)" : "none"}
                                            stroke={color}
                                            strokeWidth={isSelected || isHovered ? "3.5" : "2"}
                                        />

                                        {/* Center Bullet Hole Marker */}
                                        <circle
                                            cx={shot.x}
                                            cy={shot.y}
                                            r={isSelected || isHovered ? "5" : "3.5"}
                                            fill={color}
                                        />

                                        {/* Shot Label Badge */}
                                        {showLabels && (
                                            <g>
                                                <rect
                                                    x={shot.x + 10}
                                                    y={shot.y - 18}
                                                    width="46"
                                                    height="20"
                                                    rx="4"
                                                    fill="rgba(10, 15, 25, 0.85)"
                                                    stroke={color}
                                                    strokeWidth="1"
                                                />
                                                <text
                                                    x={shot.x + 14}
                                                    y={shot.y - 4}
                                                    fill="#ffffff"
                                                    fontSize="11"
                                                    fontWeight="bold"
                                                    fontFamily="monospace"
                                                >
                                                    #{shot.shot_number}: {shot.score}
                                                </text>
                                            </g>
                                        )}
                                    </g>
                                );
                            })}
                        </svg>
                    </div>
                )}

                {/* 3. FLOATING INTERACTIVE SHOT TOOLTIP */}
                {hoveredShot && (
                    <div
                        className="position-absolute bg-dark text-white border border-info rounded-3 p-2 px-3 shadow-lg z-3 pointer-events-none"
                        style={{
                            left: `${Math.min(tooltipPos.x + 15, (containerRef.current?.clientWidth || 300) - 180)}px`,
                            top: `${Math.max(tooltipPos.y - 85, 10)}px`,
                            minWidth: "170px",
                            pointerEvents: "none",
                            backdropFilter: "blur(6px)",
                            backgroundColor: "rgba(15, 23, 42, 0.95)",
                        }}
                    >
                        <div className="d-flex align-items-center justify-content-between mb-1 pb-1 border-bottom border-secondary">
                            <span className="fw-bold text-info">
                                <i className="bi bi-crosshair me-1"></i>
                                Tembakan #{hoveredShot.shot_number}
                            </span>
                            <span
                                className={`badge ${
                                    hoveredShot.score >= 9
                                        ? "bg-success"
                                        : hoveredShot.score >= 7
                                        ? "bg-warning text-dark"
                                        : "bg-danger"
                                }`}
                            >
                                {hoveredShot.score} Poin
                            </span>
                        </div>
                        <div className="small font-monospace text-white-50">
                            <div>
                                Koordinat: ({hoveredShot.x.toFixed(1)}, {hoveredShot.y.toFixed(1)})
                            </div>
                            <div>
                                Jarak Pusat:{" "}
                                <span className="text-white">
                                    {hoveredShot.distance_mm || hoveredShot.distance_px?.toFixed(1) || 0} mm
                                </span>
                            </div>
                            <div>
                                Ring Zona: <span className="text-warning">{hoveredShot.ring || "-"}</span>
                            </div>
                            {hoveredShot.is_bullseye && (
                                <div className="text-danger fw-bold mt-1">
                                    <i className="bi bi-star-fill me-1"></i>BULLSEYE
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 4. OVERLAY STATISTIK CEPAT (BOTTOM-LEFT HUD) */}
                {summary && summary.total_shots !== undefined && (
                    <div
                        className="position-absolute bottom-0 start-0 m-3 p-2 px-3 rounded-3 bg-black bg-opacity-75 border border-secondary border-opacity-50 text-white z-2 small"
                        style={{ backdropFilter: "blur(4px)" }}
                    >
                        <div className="d-flex align-items-center gap-3">
                            <div>
                                <span className="text-secondary d-block" style={{ fontSize: "0.75rem" }}>
                                    TOTAL TEMBAKAN
                                </span>
                                <span className="fw-bold text-info fs-6">
                                    {summary.total_shots || shots.length}
                                </span>
                            </div>
                            <div className="border-start border-secondary ps-3">
                                <span className="text-secondary d-block" style={{ fontSize: "0.75rem" }}>
                                    TOTAL SKOR
                                </span>
                                <span className="fw-bold text-warning fs-6">
                                    {summary.total_score || 0} / {summary.max_score || 0}
                                </span>
                            </div>
                            <div className="border-start border-secondary ps-3">
                                <span className="text-secondary d-block" style={{ fontSize: "0.75rem" }}>
                                    AKURASI
                                </span>
                                <span className="fw-bold text-success fs-6">
                                    {summary.accuracy_percent || 0}%
                                </span>
                            </div>
                            <div className="border-start border-secondary ps-3 d-none d-sm-block">
                                <span className="text-secondary d-block" style={{ fontSize: "0.75rem" }}>
                                    ARAH BIAS
                                </span>
                                <span className="fw-bold text-white fs-6">
                                    {summary.bias_direction || "Center"}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

