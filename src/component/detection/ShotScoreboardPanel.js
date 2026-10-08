import React from "react";

/**
 * Panel Analisis & Papan Skor SITRAK:
 * - Card ringkasan metrik (Total Skor, Max Skor, Rata-rata, Akurasi, Grouping, Arah Bias).
 * - Visual ringkas arah bias tembakan (Diagram Polar/Radar Sebaran Tembakan).
 * - Tabel rincian tembakan interaktif dengan koordinat dan poin.
 */
export const ShotScoreboardPanel = ({
    summary = {},
    shots = [],
    selectedShotNumber = null,
    onSelectShot = null,
}) => {
    // Helper untuk render badge kualifikasi
    const renderKategoriBadge = (kategori, scorePercent = 0) => {
        const k = kategori || (scorePercent >= 90 ? "Istimewa" : scorePercent >= 80 ? "Mahir" : scorePercent >= 70 ? "Cukup" : "Perlu Pembinaan");
        switch (k) {
            case "Istimewa":
                return <span className="badge bg-success text-white px-2 py-1">Istimewa</span>;
            case "Mahir":
                return <span className="badge bg-primary text-white px-2 py-1">Mahir</span>;
            case "Cukup":
                return <span className="badge bg-warning text-dark px-2 py-1">Cukup</span>;
            default:
                return <span className="badge bg-danger text-white px-2 py-1">Perlu Pembinaan</span>;
        }
    };

    // Evaluasi taktis arah bias tembakan
    const getBiasEvaluationNote = (bias) => {
        const b = (bias || "Center").toLowerCase();
        if (b.includes("right") || b.includes("kanan")) {
            if (b.includes("top") || b.includes("atas")) {
                return "Bias Kanan-Atas: Kemungkinan dorongan bahu (heeling) atau antisipasi recoil.";
            }
            if (b.includes("bottom") || b.includes("bawah")) {
                return "Bias Kanan-Bawah: Kemungkinan penekanan ibu jari berlebih atau sentakan picu.";
            }
            return "Bias Kanan: Telapak tangan atau jari telunjuk terlalu dalam pada picu.";
        }
        if (b.includes("left") || b.includes("kiri")) {
            if (b.includes("top") || b.includes("atas")) {
                return "Bias Kiri-Atas: Penembak mengunci pergelangan terlalu kencang atau pendorongan tubuh.";
            }
            if (b.includes("bottom") || b.includes("bawah")) {
                return "Bias Kiri-Bawah: Jerking / tarikan picu terlalu cepat (slapping trigger).";
            }
            return "Bias Kiri: Terlalu sedikit kontak jari pada picu atau genggaman jari manis/kelingking.";
        }
        if (b.includes("top") || b.includes("atas")) {
            return "Bias Atas: Bidikan terlalu tinggi atau pelepasan napas tidak sempurna.";
        }
        if (b.includes("bottom") || b.includes("bawah")) {
            return "Bias Bawah: Penurunan moncong senjata sebelum tembakan meletus (dipping).";
        }
        return "Perkenaan Presisi: Kelompok tembakan konsisten terpusat di area Bullseye.";
    };

    // Kalkulasi rata-rata deviasi untuk visual polar radar
    const centerDriftX = summary.center_drift?.dx || 0;
    const centerDriftY = summary.center_drift?.dy || 0;

    return (
        <div className="d-flex flex-column gap-3">
            {/* 1. CARD RINGKASAN METRIK SKOR */}
            <div className="row g-2">
                {/* Total Skor & Maksimal */}
                <div className="col-6 col-lg-3">
                    <div className="card border-0 shadow-sm bg-body-tertiary h-100 p-3">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                            <small className="text-secondary fw-semibold">TOTAL SKOR</small>
                            <i className="bi bi-trophy text-warning"></i>
                        </div>
                        <div className="d-flex align-items-baseline gap-1">
                            <span className="fs-3 fw-bold text-primary">
                                {summary.total_score !== undefined ? summary.total_score : 0}
                            </span>
                            <span className="text-muted small">
                                / {summary.max_score !== undefined ? summary.max_score : (shots.length * 10 || 0)}
                            </span>
                        </div>
                        <small className="text-muted" style={{ fontSize: "0.75rem" }}>
                            {shots.length} Butir Peluru Terdeteksi
                        </small>
                    </div>
                </div>

                {/* Rata-rata Skor */}
                <div className="col-6 col-lg-3">
                    <div className="card border-0 shadow-sm bg-body-tertiary h-100 p-3">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                            <small className="text-secondary fw-semibold">RATA-RATA POIN</small>
                            <i className="bi bi-calculator text-info"></i>
                        </div>
                        <div className="d-flex align-items-baseline gap-1">
                            <span className="fs-3 fw-bold text-info">
                                {summary.average_score !== undefined ? summary.average_score : 0}
                            </span>
                            <span className="text-muted small">/ 10</span>
                        </div>
                        <small className="text-muted" style={{ fontSize: "0.75rem" }}>
                            Konsistensi Perkenaan
                        </small>
                    </div>
                </div>

                {/* Akurasi & Kategori */}
                <div className="col-6 col-lg-3">
                    <div className="card border-0 shadow-sm bg-body-tertiary h-100 p-3">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                            <small className="text-secondary fw-semibold">AKURASI</small>
                            <i className="bi bi-bullseye text-success"></i>
                        </div>
                        <div className="d-flex align-items-baseline gap-2">
                            <span className="fs-3 fw-bold text-success">
                                {summary.accuracy_percent !== undefined ? summary.accuracy_percent : 0}%
                            </span>
                        </div>
                        <div className="mt-1">
                            {renderKategoriBadge(summary.qualification, summary.accuracy_percent)}
                        </div>
                    </div>
                </div>

                {/* Grouping Sebaran */}
                <div className="col-6 col-lg-3">
                    <div className="card border-0 shadow-sm bg-body-tertiary h-100 p-3">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                            <small className="text-secondary fw-semibold">GROUPING SEBARAN</small>
                            <i className="bi bi-arrows-fullscreen text-danger"></i>
                        </div>
                        <div className="d-flex align-items-baseline gap-1">
                            <span className="fs-3 fw-bold text-danger">
                                ±{summary.grouping_radius_mm || summary.grouping_diameter_px || 0}
                            </span>
                            <span className="text-muted small">mm</span>
                        </div>
                        <small className="text-muted" style={{ fontSize: "0.75rem" }}>
                            Radius Sebaran Tembakan
                        </small>
                    </div>
                </div>
            </div>

            {/* 2. DIAGRAM POLAR / RADAR BIAS TEMBAKAN & ANALISIS ARAH */}
            <div className="card border-0 shadow-sm bg-body-tertiary p-3">
                <div className="d-flex flex-wrap align-items-center justify-content-between mb-2 pb-2 border-bottom">
                    <div>
                        <h6 className="fw-bold mb-0">
                            <i className="bi bi-compass me-2 text-primary"></i>
                            Diagram Polar Sebaran & Arah Bias Tembakan
                        </h6>
                        <small className="text-secondary">
                            Visualisasi deviasi perkenaan relatif terhadap titik tengah target (Bullseye)
                        </small>
                    </div>
                    <span className="badge bg-primary-subtle text-primary border border-primary px-3 py-1">
                        Bias: {summary.bias_direction || "Center"}
                    </span>
                </div>

                <div className="row g-3 align-items-center">
                    {/* Visual Radar Polar Chart (SVG) */}
                    <div className="col-12 col-md-5 text-center">
                        <div
                            className="bg-dark rounded-circle p-2 d-inline-block shadow position-relative"
                            style={{ width: "220px", height: "220px" }}
                        >
                            <svg viewBox="-60 -60 120 120" className="w-100 h-100">
                                {/* Cincin target polar */}
                                <circle cx="0" cy="0" r="50" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
                                <circle cx="0" cy="0" r="37.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
                                <circle cx="0" cy="0" r="25" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="2,2" />
                                <circle cx="0" cy="0" r="12.5" fill="none" stroke="rgba(255, 23, 68, 0.5)" strokeWidth="1.2" />
                                <circle cx="0" cy="0" r="2.5" fill="#ff1744" />

                                {/* Sumbu X dan Y */}
                                <line x1="-54" y1="0" x2="54" y2="0" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
                                <line x1="0" y1="-54" x2="0" y2="54" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />

                                {/* Label Mata Angin / Sumbu */}
                                <text x="0" y="-53" fill="#94a3b8" fontSize="6" textAnchor="middle">ATAS</text>
                                <text x="0" y="58" fill="#94a3b8" fontSize="6" textAnchor="middle">BAWAH</text>
                                <text x="-56" y="2" fill="#94a3b8" fontSize="6" textAnchor="end">KIRI</text>
                                <text x="56" y="2" fill="#94a3b8" fontSize="6" textAnchor="start">KANAN</text>

                                {/* Titik-titik tembakan pada diagram polar */}
                                {shots.map((s) => {
                                    // Normalisasi skala deviasi dx/dy ke radius diagram (max 45px)
                                    const scale = 0.5;
                                    const plotX = Math.max(Math.min((s.dx || 0) * scale, 45), -45);
                                    const plotY = Math.max(Math.min((s.dy || 0) * scale, 45), -45);
                                    const isSelected = selectedShotNumber === s.shot_number;
                                    const color = s.score >= 9 ? "#00e676" : s.score >= 7 ? "#ffea00" : "#ff1744";

                                    return (
                                        <g key={s.shot_number}>
                                            <circle
                                                cx={plotX}
                                                cy={plotY}
                                                r={isSelected ? 4.5 : 3}
                                                fill={color}
                                                stroke="#000"
                                                strokeWidth="0.8"
                                            />
                                            {isSelected && (
                                                <circle
                                                    cx={plotX}
                                                    cy={plotY}
                                                    r="7"
                                                    fill="none"
                                                    stroke={color}
                                                    strokeWidth="1"
                                                    strokeDasharray="1.5,1.5"
                                                />
                                            )}
                                        </g>
                                    );
                                })}

                                {/* Vektor arah center drift jika ada tembakan */}
                                {shots.length > 0 && (centerDriftX !== 0 || centerDriftY !== 0) && (
                                    <line
                                        x1="0"
                                        y1="0"
                                        x2={Math.max(Math.min(centerDriftX * 0.5, 42), -42)}
                                        y2={Math.max(Math.min(centerDriftY * 0.5, 42), -42)}
                                        stroke="#ff9100"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                    />
                                )}
                            </svg>
                        </div>
                    </div>

                    {/* Deskripsi & Saran Taktis */}
                    <div className="col-12 col-md-7">
                        <div className="p-3 bg-body rounded border">
                            <h6 className="fw-semibold text-primary mb-2">
                                <i className="bi bi-lightbulb me-1"></i>
                                Rekomendasi Koreksi Penembak
                            </h6>
                            <p className="small mb-3 text-secondary">
                                {getBiasEvaluationNote(summary.bias_direction)}
                            </p>
                            <div className="d-flex flex-wrap gap-2 small">
                                <div className="badge bg-body-secondary text-dark border">
                                    Arah Bias: <strong className="text-primary">{summary.bias_direction || "Center"}</strong>
                                </div>
                                <div className="badge bg-body-secondary text-dark border">
                                    Offset X: <strong>{centerDriftX > 0 ? `+${centerDriftX}` : centerDriftX} px</strong>
                                </div>
                                <div className="badge bg-body-secondary text-dark border">
                                    Offset Y: <strong>{centerDriftY > 0 ? `+${centerDriftY}` : centerDriftY} px</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. TABEL RINCIAN TEMBAKAN */}
            <div className="card border-0 shadow-sm bg-body-tertiary">
                <div className="card-header bg-transparent border-0 pt-3 px-3 d-flex align-items-center justify-content-between">
                    <h6 className="fw-bold mb-0">
                        <i className="bi bi-list-ol me-2 text-primary"></i>
                        Daftar Rincian Titik Tembakan ({shots.length} Butir)
                    </h6>
                    <small className="text-secondary">
                        Klik baris tembakan untuk menyorot titik pada kanvas
                    </small>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light small">
                                <tr>
                                    <th style={{ width: "60px" }} className="text-center">#</th>
                                    <th>Poin Skor</th>
                                    <th>Zona Ring</th>
                                    <th>Koordinat (X, Y)</th>
                                    <th>Jarak Pusat</th>
                                    <th>Status Perkenaan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shots.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-4 text-muted">
                                            <i className="bi bi-info-circle me-1"></i>
                                            Belum ada tembakan yang terdeteksi. Unggah foto atau gunakan kamera untuk memulai.
                                        </td>
                                    </tr>
                                ) : (
                                    shots.map((s) => {
                                        const isSelected = selectedShotNumber === s.shot_number;
                                        return (
                                            <tr
                                                key={s.shot_number}
                                                className={isSelected ? "table-primary" : ""}
                                                style={{ cursor: "pointer" }}
                                                onClick={() => {
                                                    if (onSelectShot) onSelectShot(s);
                                                }}
                                            >
                                                <td className="text-center fw-bold">
                                                    #{s.shot_number}
                                                </td>
                                                <td>
                                                    <span
                                                        className={`badge fs-6 ${
                                                            s.score >= 9
                                                                ? "bg-success"
                                                                : s.score >= 7
                                                                ? "bg-warning text-dark"
                                                                : "bg-danger"
                                                        }`}
                                                    >
                                                        {s.score} Poin
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="badge bg-secondary-subtle text-secondary border font-monospace">
                                                        Ring {s.ring || "-"}
                                                    </span>
                                                </td>
                                                <td className="font-monospace small">
                                                    ({s.x.toFixed(1)}, {s.y.toFixed(1)})
                                                </td>
                                                <td className="small">
                                                    {s.distance_mm || s.distance_px?.toFixed(1) || 0} mm
                                                </td>
                                                <td>
                                                    {s.is_bullseye ? (
                                                        <span className="badge bg-danger-subtle text-danger border border-danger">
                                                            <i className="bi bi-star-fill me-1"></i>Bullseye
                                                        </span>
                                                    ) : s.score >= 8 ? (
                                                        <span className="badge bg-success-subtle text-success border border-success">
                                                            Akurat
                                                        </span>
                                                    ) : (
                                                        <span className="badge bg-secondary-subtle text-secondary border">
                                                            Normal
                                                        </span>
                                                    )}
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
    );
};

