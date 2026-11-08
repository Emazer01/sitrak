import React, { useState, useMemo } from "react";
import { parseCatatanAnalisis } from "../../services/sitrakDetectService";
import { getBackendUrl } from "../../services/apiConfig";

/**
 * Helper untuk memastikan URL foto target dapat dimuat baik dari URL absolut,
 * data base64, maupun path relatif dari backend SITRAK.
 */
const resolveFotoUrl = (url) => {
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

/**
 * Komponen Grafis Target Ring ISSF / Militer SVG dengan Plot Titik Perkenaan (Hits)
 */
export const TargetRingGraphic = ({
  hits = [],
  groupingRadiusMm = null,
  centerOffsetX = null,
  centerOffsetY = null,
  size = 240,
}) => {
  // Normalisasi skala: 100x100 viewBox
  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center p-2 bg-white rounded border"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg
        viewBox="0 0 100 100"
        style={{ width: "100%", height: "100%", overflow: "visible" }}
      >
        {/* Ring 1 - 6 (Putih / Abu-abu terang) */}
        <circle cx="50" cy="50" r="48" fill="#f8fafc" stroke="#334155" strokeWidth="0.8" />
        <circle cx="50" cy="50" r="40" fill="#f1f5f9" stroke="#334155" strokeWidth="0.8" />
        <circle cx="50" cy="50" r="32" fill="#e2e8f0" stroke="#334155" strokeWidth="0.8" />

        {/* Ring 7 - 10 (Hitam / Bullseye khas sasaran presisi) */}
        <circle cx="50" cy="50" r="24" fill="#1e293b" stroke="#ffffff" strokeWidth="0.6" />
        <circle cx="50" cy="50" r="16" fill="#1e293b" stroke="#ffffff" strokeWidth="0.6" />
        <circle cx="50" cy="50" r="8" fill="#1e293b" stroke="#ffffff" strokeWidth="0.6" />
        <circle cx="50" cy="50" r="3" fill="#dc2626" stroke="#ffffff" strokeWidth="0.4" />

        {/* Garis Crosshair / Pembidik Tipis */}
        <line x1="50" y1="2" x2="50" y2="98" stroke="#94a3b8" strokeWidth="0.3" strokeDasharray="1,1" />
        <line x1="2" y1="50" x2="98" y2="50" stroke="#94a3b8" strokeWidth="0.3" strokeDasharray="1,1" />

        {/* Angka Zona Skoring Cincin */}
        <text x="50" y="8" fontSize="2.8" fill="#475569" textAnchor="middle" fontWeight="bold">1</text>
        <text x="50" y="16" fontSize="2.8" fill="#475569" textAnchor="middle" fontWeight="bold">3</text>
        <text x="50" y="24" fontSize="2.8" fill="#475569" textAnchor="middle" fontWeight="bold">5</text>
        <text x="50" y="32" fontSize="2.8" fill="#cbd5e1" textAnchor="middle" fontWeight="bold">7</text>
        <text x="50" y="40" fontSize="2.8" fill="#cbd5e1" textAnchor="middle" fontWeight="bold">9</text>
        <text x="50" y="62" fontSize="2.8" fill="#cbd5e1" textAnchor="middle" fontWeight="bold">9</text>
        <text x="50" y="70" fontSize="2.8" fill="#cbd5e1" textAnchor="middle" fontWeight="bold">7</text>
        <text x="50" y="78" fontSize="2.8" fill="#475569" textAnchor="middle" fontWeight="bold">5</text>
        <text x="50" y="86" fontSize="2.8" fill="#475569" textAnchor="middle" fontWeight="bold">3</text>
        <text x="50" y="94" fontSize="2.8" fill="#475569" textAnchor="middle" fontWeight="bold">1</text>

        {/* Grouping Spread (Lingkaran sebaran kuning putus-putus jika ada MPI & grouping) */}
        {groupingRadiusMm && centerOffsetX !== null && centerOffsetY !== null && (
          <circle
            cx={50 + (parseFloat(centerOffsetX) || 0) * 0.15}
            cy={50 + (parseFloat(centerOffsetY) || 0) * 0.15}
            r={Math.max(2, (parseFloat(groupingRadiusMm) || 0) * 0.15)}
            fill="none"
            stroke="#eab308"
            strokeWidth="0.8"
            strokeDasharray="2,1.5"
          />
        )}

        {/* Mean Point of Impact (Titik Pusat Sebaran MPI - Palang Merah) */}
        {centerOffsetX !== null && centerOffsetY !== null && (
          <g>
            <circle
              cx={50 + (parseFloat(centerOffsetX) || 0) * 0.15}
              cy={50 + (parseFloat(centerOffsetY) || 0) * 0.15}
              r="1.5"
              fill="#ef4444"
            />
            <line
              x1={50 + (parseFloat(centerOffsetX) || 0) * 0.15 - 3}
              y1={50 + (parseFloat(centerOffsetY) || 0) * 0.15}
              x2={50 + (parseFloat(centerOffsetX) || 0) * 0.15 + 3}
              y2={50 + (parseFloat(centerOffsetY) || 0) * 0.15}
              stroke="#ef4444"
              strokeWidth="0.6"
            />
            <line
              x1={50 + (parseFloat(centerOffsetX) || 0) * 0.15}
              y1={50 + (parseFloat(centerOffsetY) || 0) * 0.15 - 3}
              x2={50 + (parseFloat(centerOffsetX) || 0) * 0.15}
              y2={50 + (parseFloat(centerOffsetY) || 0) * 0.15 + 3}
              stroke="#ef4444"
              strokeWidth="0.6"
            />
          </g>
        )}

        {/* Titik Lubang Tembakan Asli (Hits) */}
        {hits.map((h, idx) => {
          const hX = typeof h.x === "number" ? h.x : 50;
          const hY = typeof h.y === "number" ? h.y : 50;
          const score = h.score !== undefined ? h.score : "-";
          const hitColor =
            score >= 9 ? "#22c55e" : score >= 7 ? "#f59e0b" : "#ef4444";

          return (
            <g key={h.id || idx}>
              <circle
                cx={hX}
                cy={hY}
                r="2.5"
                fill={hitColor}
                stroke="#ffffff"
                strokeWidth="0.6"
              />
              <circle cx={hX} cy={hY} r="0.8" fill="#111827" />
              <text
                x={hX}
                y={hY - 3.2}
                fontSize="3.2"
                fill="#0f172a"
                fontWeight="bold"
                textAnchor="middle"
                style={{
                  paintOrder: "stroke",
                  stroke: "#ffffff",
                  strokeWidth: "1px",
                  strokeLinecap: "butt",
                  strokeLinejoin: "miter",
                }}
              >
                #{idx + 1}({score})
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/**
 * Komponen Dokumen Laporan Hasil Menembak Individu (Perorangan)
 * Didesain khusus sesuai standar dokumen kedinasan/militer untuk dicetak pada kertas A4 Portrait.
 */
export const DokumenLaporanIndividu = ({
  sesi,
  penembak,
  sertakanFotoTarget = true,
  sertakanVisualizerSvg = true,
  sertakanBalistik = true,
  sertakanTandaTangan = true,
  namaPenandatangan1 = "Komandan Latihan Menembak",
  pangkatNrpPenandatangan1 = "",
  namaPenandatangan2 = "Petugas Pencatat Nilai SITRAK",
  pangkatNrpPenandatangan2 = "",
  namaPenembakTtd = "",
  pangkatNrpPenembakTtd = "",
  lokasiPenerbitan = "Jakarta",
  isPrintMode = false,
}) => {
  // Tanggal cetak hari ini (format Indonesia)
  const tanggalCetakIndonesia = useMemo(() => {
    return new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  const formatTanggalLengkap = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Daftar babak yang terhubung
  const babakList = useMemo(() => {
    if (sesi?.babak_list && sesi.babak_list.length > 0) {
      return sesi.babak_list;
    }
    return [
      { id_babak: 1, nomor_babak: 1, nama_babak: "Perkenaan (Koreksi)", jumlah_peluru: 3 },
      { id_babak: 2, nomor_babak: 2, nama_babak: "Penilaian (Scoring)", jumlah_peluru: 10 },
    ];
  }, [sesi]);

  // Gabungkan nilai babak penembak
  const babakDetails = useMemo(() => {
    if (!sesi || !penembak) return [];
    return babakList.map((b) => {
      const bScore = (penembak.babak_scores || []).find(
        (bs) =>
          String(bs.id_babak) === String(b.id_babak) ||
          String(bs.nomor) === String(b.nomor_babak) ||
          String(bs.nomor_babak) === String(b.nomor_babak)
      );

      const skor = bScore ? bScore.skor : 0;
      const maxSkor = bScore?.max_skor || (b.jumlah_peluru || 0) * 10 || 100;
      const akurasi = bScore ? bScore.akurasi : maxSkor > 0 ? ((skor / maxSkor) * 100).toFixed(1) : 0;
      const rawFoto = bScore?.foto_target || bScore?.url_foto_asli || null;

      let parsedCatatan = null;
      if (bScore?.catatan_analisis && typeof bScore.catatan_analisis === "string") {
        parsedCatatan = parseCatatanAnalisis(bScore.catatan_analisis);
      }

      return {
        id_babak: b.id_babak || b.nomor_babak,
        nomor_babak: b.nomor_babak,
        nama_babak: b.nama_babak || `Babak ${b.nomor_babak}`,
        jumlah_peluru: b.jumlah_peluru || 10,
        jarak: b.jarak || sesi?.jarak_meter || sesi?.jarak || 15,
        sikap: b.sikap || sesi?.sikap_menembak || "Tiarap / Presisi",
        skor,
        maxSkor,
        akurasi,
        groupingRadius:
          bScore?.grouping_radius_mm !== null && bScore?.grouping_radius_mm !== undefined
            ? parseFloat(bScore.grouping_radius_mm)
            : null,
        offsetX:
          bScore?.center_offset_x_mm !== null && bScore?.center_offset_x_mm !== undefined
            ? parseFloat(bScore.center_offset_x_mm)
            : null,
        offsetY:
          bScore?.center_offset_y_mm !== null && bScore?.center_offset_y_mm !== undefined
            ? parseFloat(bScore.center_offset_y_mm)
            : null,
        hits: bScore?.hits || [],
        fotoTargetUrl: resolveFotoUrl(rawFoto),
        catatanAnalisis: bScore?.catatan_analisis,
        parsedCatatan,
      };
    });
  }, [babakList, penembak, sesi]);

  // Evaluasi Umum Catatan Penembak
  const generalEvaluation = useMemo(() => {
    if (!penembak) {
      return { warning: null, items: [] };
    }
    const rawDirect = penembak.catatan_analisis || penembak.ballistics?.catatan;
    if (rawDirect && typeof rawDirect === "string" && rawDirect.trim()) {
      return parseCatatanAnalisis(rawDirect);
    }
    // Jika tidak ada general note, kumpulkan dari babak
    const collectedItems = [];
    babakDetails.forEach((bd) => {
      if (bd.parsedCatatan?.items) {
        collectedItems.push(...bd.parsedCatatan.items);
      }
    });
    return {
      warning: babakDetails.find((b) => b.parsedCatatan?.warning)?.parsedCatatan?.warning || null,
      items: collectedItems.length > 0 ? collectedItems : [
        "Pertahankan ritme penarikan picu secara halus dan konsisten.",
        "Pastikan cengkeraman (grip) mantap dan stabil sepanjang pelaksanaan seri tembakan.",
      ],
    };
  }, [penembak, babakDetails]);

  // Validasi data input: Kembalikan null jika data sesi atau penembak belum tersedia
  // (Diletakkan SETELAH seluruh React Hooks dipanggil agar mematuhi aturan react-hooks/rules-of-hooks)
  if (!sesi || !penembak) return null;

  // Badge Kategori Styling
  const kategori = penembak.kategori || "Cukup";
  let badgeStyle = {
    bg: "#e0f2fe",
    color: "#0369a1",
    border: "#0284c7",
    statusText: "MEMENUHI SYARAT KELAS A",
  };
  if (kategori === "Istimewa") {
    badgeStyle = {
      bg: "#dcfce7",
      color: "#15803d",
      border: "#16a34a",
      statusText: "LULUS DENGAN PREDIKAT ISTIMEWA",
    };
  } else if (kategori === "Mahir") {
    badgeStyle = {
      bg: "#ecfdf5",
      color: "#047857",
      border: "#059669",
      statusText: "LULUS MEMENUHI SYARAT KEMAHIRAN",
    };
  } else if (kategori === "Cukup") {
    badgeStyle = {
      bg: "#fef9c3",
      color: "#a16207",
      border: "#ca8a04",
      statusText: "LULUS STANDAR MINIMUM (CUKUP)",
    };
  } else if (kategori === "Perlu Pembinaan") {
    badgeStyle = {
      bg: "#fee2e2",
      color: "#b91c1c",
      border: "#dc2626",
      statusText: "PERLU LATIHAN ULANG / PEMBINAAN",
    };
  }

  const gelombangNum = penembak.nomor_gelombang || 1;
  const laneNum = penembak.lane || 1;

  return (
    <div
      className={`laporan-cetak-document bg-white ${
        isPrintMode
          ? "p-0 m-0 border-0 shadow-none"
          : "p-4 p-md-5 mx-auto shadow-sm border rounded"
      }`}
      style={{
        maxWidth: isPrintMode ? "100%" : "960px",
        minHeight: isPrintMode ? "0" : "1100px",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        color: "#111827",
        lineHeight: "1.45",
      }}
      data-bs-theme="light"
    >
      {/* 1. KOP SURAT RESMI KEDINASAN / MILITER */}
      <div className="d-flex align-items-center justify-content-between border-bottom border-dark pb-3 mb-2">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center bg-dark text-white rounded-3"
            style={{ width: "85px", height: "85px", flexShrink: 0 }}
          >
            <img
              src="SITRAK Tactical Analytics Emblem.png"
              alt="Logo SITRAK"
              onError={(e) => {
                e.target.style.display = "none";
              }}
              style={{ width: "75px", height: "75px", objectFit: "contain" }}
            />
          </div>
          <div>
            <h6 className="fw-bold text-uppercase mb-0 tracking-wide text-dark" style={{ fontSize: "14px" }}>
              MARKAS BESAR TENTARA NASIONAL INDONESIA
            </h6>
            <div className="fw-semibold text-secondary" style={{ fontSize: "12px" }}>
              KOMANDO DOKTRIN PENDIDIKAN DAN LATIHAN (KODIKLAT TNI)
            </div>
            <div className="small text-muted" style={{ fontSize: "11px" }}>
              SISTEM INFORMASI TEMBAKAN & REKAPITULASI AKURASI TAKTIS (SITRAK-AI)
            </div>
          </div>
        </div>
        <div className="text-end">
          <span className="badge bg-dark px-2 py-1 font-monospace" style={{ fontSize: "11px" }}>
            LANE {laneNum} • GEL {gelombangNum}
          </span>
          <div className="small text-secondary mt-1 font-monospace" style={{ fontSize: "10.5px" }}>
            KODE: {sesi.kode_sesi}
          </div>
          <div className="small text-secondary" style={{ fontSize: "10px" }}>
            Tgl Cetak: {tanggalCetakIndonesia}
          </div>
        </div>
      </div>

      {/* Garis Ganda Pemisah Kop Surat */}
      <div
        style={{
          borderBottom: "2px solid #000",
          borderTop: "1px solid #000",
          height: "3px",
          marginBottom: "16px",
        }}
      />

      {/* 2. JUDUL DOKUMEN LAPORAN INDIVIDU */}
      <div className="text-center mb-3">
        <h4 className="fw-bold text-uppercase mb-1 text-dark tracking-wider" style={{ fontSize: "18px" }}>
          LEMBAR HASIL & EVALUASI MENEMBAK PERORANGAN
        </h4>
        <div className="text-secondary small fw-semibold" style={{ fontSize: "11px" }}>
          NOMOR: LHMP/{sesi.kode_sesi}/G{gelombangNum}-L{laneNum}/{new Date().getFullYear()}
        </div>
      </div>

      {/* 3. PROFIL PERSONEL & PARAMETER SESI */}
      <div className="section-block mb-3" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
        <div className="section-title fw-bold text-uppercase small text-dark border-bottom border-secondary pb-1 mb-2 d-flex align-items-center justify-content-between">
          <span>
            <i className="bi bi-person-badge-fill me-1 text-primary"></i> I. Data Identitas Penembak & Spesifikasi Sesi
          </span>
          <span className="badge bg-light text-dark border" style={{ fontSize: "10px" }}>
            Status Sesi: {sesi.status || "Selesai"}
          </span>
        </div>

        <table
          className="table table-sm table-bordered mb-0 align-middle"
          style={{
            fontSize: "11.5px",
            breakInside: "avoid",
            pageBreakInside: "avoid",
          }}
        >
          <tbody>
            <tr>
              <th className="bg-light text-secondary" style={{ width: "20%" }}>
                Nama Personel
              </th>
              <td className="fw-bold text-dark" style={{ width: "30%" }}>
                {penembak.nama}
              </td>
              <th className="bg-light text-secondary" style={{ width: "20%" }}>
                Nama Sesi Latihan
              </th>
              <td className="fw-semibold" style={{ width: "30%" }}>
                {sesi.nama_sesi}
              </td>
            </tr>
            <tr>
              <th className="bg-light text-secondary">Pangkat / Korps</th>
              <td>{penembak.pangkat || "-"}</td>
              <th className="bg-light text-secondary">Tanggal / Waktu</th>
              <td>{formatTanggalLengkap(sesi.tanggal)}</td>
            </tr>
            <tr>
              <th className="bg-light text-secondary">NRP / NIP</th>
              <td className="font-monospace fw-semibold">{penembak.nrp || "-"}</td>
              <th className="bg-light text-secondary">Senjata & Kaliber</th>
              <td>
                {sesi.model_senjata || sesi.jenis_senjata || "Senjata Standar"} ({sesi.kaliber || "-"})
              </td>
            </tr>
            <tr>
              <th className="bg-light text-secondary">Kesatuan / Satuan</th>
              <td className="fw-semibold">{penembak.satuan || "-"}</td>
              <th className="bg-light text-secondary">Jarak & Sikap</th>
              <td>
                <span className="fw-semibold text-primary">{sesi.jarak_meter || sesi.jarak || 15} M</span> • {sesi.sikap_menembak || "Presisi"}
              </td>
            </tr>
            <tr>
              <th className="bg-light text-secondary">Posisi Jalur (Lane)</th>
              <td className="fw-bold">
                Jalur {laneNum} (Gelombang {gelombangNum})
              </td>
              <th className="bg-light text-secondary">Lapangan Tembak</th>
              <td>{sesi.nama_tempat_menembak || "Lapangan Tembak Utama"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. SCORECARD BANNER & PREDIKAT KELULUSAN */}
      <div
        className="section-block p-3 rounded mb-3 border"
        style={{
          backgroundColor: badgeStyle.bg,
          borderColor: badgeStyle.border,
          breakInside: "avoid",
          pageBreakInside: "avoid",
        }}
      >
        <div className="row align-items-center text-center g-2">
          <div className="col-4 border-end" style={{ borderColor: badgeStyle.border }}>
            <div className="text-uppercase fw-semibold" style={{ fontSize: "10px", color: badgeStyle.color }}>
              Total Nilai Perolehan
            </div>
            <div className="fw-bold font-monospace" style={{ fontSize: "24px", color: badgeStyle.color }}>
              {penembak.total_skor} <span style={{ fontSize: "14px", fontWeight: "normal" }}>/ {penembak.total_max}</span>
            </div>
            <div className="small fw-semibold" style={{ fontSize: "10.5px", color: badgeStyle.color }}>
              Poin Maksimal: {penembak.total_max}
            </div>
          </div>

          <div className="col-4 border-end" style={{ borderColor: badgeStyle.border }}>
            <div className="text-uppercase fw-semibold" style={{ fontSize: "10px", color: badgeStyle.color }}>
              Persentase Akurasi
            </div>
            <div className="fw-bold font-monospace" style={{ fontSize: "24px", color: badgeStyle.color }}>
              {penembak.akurasi_akhir}%
            </div>
            <div className="small fw-semibold" style={{ fontSize: "10.5px", color: badgeStyle.color }}>
              Rerata Akurasi Tembakan
            </div>
          </div>

          <div className="col-4">
            <div className="text-uppercase fw-semibold" style={{ fontSize: "10px", color: badgeStyle.color }}>
              Kategori & Status
            </div>
            <div className="fw-bold" style={{ fontSize: "20px", color: badgeStyle.color }}>
              {kategori}
            </div>
            <div className="badge px-2 py-1 font-monospace" style={{ fontSize: "9.5px", backgroundColor: badgeStyle.color, color: "#fff" }}>
              {badgeStyle.statusText}
            </div>
          </div>
        </div>
      </div>

      {/* 5. TABEL RINCIAN HASIL PENILAIAN PER BABAK */}
      <div className="section-block mb-3" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
        <div className="section-title fw-bold text-uppercase small text-dark border-bottom border-secondary pb-1 mb-2 d-flex align-items-center justify-content-between">
          <span>
            <i className="bi bi-card-checklist me-1 text-primary"></i> II. Rincian Penilaian Hasil Tembakan Per Babak
          </span>
          <span className="text-muted small" style={{ fontSize: "10px" }}>
            Metode Penilaian: ISSF Inward-Gauging Standar
          </span>
        </div>

        <table
          className="table table-sm table-bordered align-middle text-center mb-0"
          style={{
            fontSize: "11px",
            breakInside: "avoid",
            pageBreakInside: "avoid",
          }}
        >
          <thead className="table-light">
            <tr>
              <th style={{ width: "35px" }}>No</th>
              <th className="text-start" style={{ minWidth: "150px" }}>Nama Babak Latihan</th>
              <th style={{ width: "70px" }}>Jarak</th>
              <th style={{ width: "95px" }}>Sikap Tembak</th>
              <th style={{ width: "75px" }}>Jml Peluru</th>
              <th style={{ width: "95px" }}>Nilai / Max</th>
              <th style={{ width: "80px" }}>Akurasi</th>
              {sertakanBalistik && (
                <>
                  <th style={{ width: "95px" }}>Grouping (mm)</th>
                  <th style={{ width: "95px" }}>MPI Deviasi</th>
                </>
              )}
              <th style={{ width: "95px" }}>Predikat</th>
            </tr>
          </thead>
          <tbody>
            {babakDetails.map((bd, idx) => {
              const bAkurasiNum = parseFloat(bd.akurasi) || 0;
              let bPredikat = "Cukup";
              let bClass = "text-secondary";
              if (bAkurasiNum >= 90) {
                bPredikat = "Istimewa";
                bClass = "text-success fw-bold";
              } else if (bAkurasiNum >= 80) {
                bPredikat = "Mahir";
                bClass = "text-primary fw-bold";
              } else if (bAkurasiNum >= 70) {
                bPredikat = "Cukup";
                bClass = "text-warning fw-bold";
              } else if (bd.skor > 0) {
                bPredikat = "Perlu Pembinaan";
                bClass = "text-danger fw-bold";
              }

              return (
                <tr key={bd.id_babak || idx}>
                  <td className="fw-bold">{idx + 1}</td>
                  <td className="text-start fw-semibold">
                    {bd.nama_babak}
                  </td>
                  <td>{bd.jarak} M</td>
                  <td>{bd.sikap}</td>
                  <td>{bd.jumlah_peluru} Butir</td>
                  <td className="fw-bold text-primary font-monospace">
                    {bd.skor} / {bd.maxSkor}
                  </td>
                  <td className="fw-bold font-monospace">
                    {bd.akurasi}%
                  </td>
                  {sertakanBalistik && (
                    <>
                      <td className="font-monospace">
                        {bd.groupingRadius !== null
                          ? `${(bd.groupingRadius * 2).toFixed(1)} mm`
                          : "-"}
                      </td>
                      <td className="font-monospace small">
                        {bd.offsetX !== null && bd.offsetY !== null
                          ? `X:${bd.offsetX.toFixed(0)} Y:${bd.offsetY.toFixed(0)}`
                          : "-"}
                      </td>
                    </>
                  )}
                  <td className={bClass}>{bPredikat}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="table-light fw-bold">
            <tr>
              <td colSpan={5} className="text-end pe-3">
                Akumulasi Nilai Keseluruhan:
              </td>
              <td className="text-primary font-monospace">
                {penembak.total_skor} / {penembak.total_max}
              </td>
              <td className="font-monospace">{penembak.akurasi_akhir}%</td>
              {sertakanBalistik && <td colSpan={2}></td>}
              <td className="text-uppercase">{kategori}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 6. DOKUMENTASI VISUALISASI SASARAN TARGET & COMPUTER VISION */}
      {(sertakanVisualizerSvg || sertakanFotoTarget) && (
        <div className="section-block mb-3" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
          <div className="section-title fw-bold text-uppercase small text-dark border-bottom border-secondary pb-1 mb-2 d-flex align-items-center justify-content-between">
            <span>
              <i className="bi bi-bullseye me-1 text-danger"></i> III. Dokumentasi Visual Sasaran Tembak & Peta Perkenaan
            </span>
            <span className="text-muted small" style={{ fontSize: "10px" }}>
              Analisis Balistik Komputer: SITRAK-Detect & Gemini AI
            </span>
          </div>

          <div className="row g-2 align-items-start">
            {babakDetails.map((bd, bIdx) => (
              <div
                key={bIdx}
                className={babakDetails.length === 1 ? "col-12" : "col-12 col-md-6"}
                style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
              >
                <div className="p-2 border rounded bg-light-subtle h-100">
                  <div className="d-flex align-items-center justify-content-between border-bottom pb-1 mb-2">
                    <span className="fw-bold text-dark" style={{ fontSize: "11px" }}>
                      Babak {bd.nomor_babak}: {bd.nama_babak}
                    </span>
                    <span className="badge bg-primary font-monospace" style={{ fontSize: "9.5px" }}>
                      Skor: {bd.skor}/{bd.maxSkor} ({bd.akurasi}%)
                    </span>
                  </div>

                  <div className="d-flex flex-row align-items-center justify-content-center gap-2">
                    {/* Visualizer Target Ring SVG */}
                    {sertakanVisualizerSvg && (
                      <div className="text-center">
                        <TargetRingGraphic
                          hits={bd.hits}
                          groupingRadiusMm={bd.groupingRadius}
                          centerOffsetX={bd.offsetX}
                          centerOffsetY={bd.offsetY}
                          size={160}
                        />
                        <div className="small text-muted mt-1" style={{ fontSize: "9px" }}>
                          Peta Perkenaan ({bd.hits.length} Hits)
                        </div>
                      </div>
                    )}

                    {/* Foto Kamera Target / Anotasi AI */}
                    {sertakanFotoTarget && (
                      <div className="text-center">
                        {bd.fotoTargetUrl ? (
                          <div
                            className="bg-dark rounded border d-flex align-items-center justify-content-center overflow-hidden"
                            style={{ width: "160px", height: "160px" }}
                          >
                            <img
                              src={bd.fotoTargetUrl}
                              alt={`Target Babak ${bd.nomor_babak}`}
                              style={{
                                maxWidth: "100%",
                                maxHeight: "100%",
                                objectFit: "contain",
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            className="bg-white border rounded d-flex flex-column align-items-center justify-content-center text-muted p-2"
                            style={{ width: "160px", height: "160px", fontSize: "10px" }}
                          >
                            <i className="bi bi-camera-slash fs-4 text-secondary opacity-50 mb-1"></i>
                            <span>Foto Target Belum Diunggah</span>
                          </div>
                        )}
                        <div className="small text-muted mt-1" style={{ fontSize: "9px" }}>
                          Dokumentasi Kamera
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ringkasan Balistik Babak */}
                  {sertakanBalistik && (
                    <div className="mt-2 pt-1 border-top d-flex justify-content-between small text-secondary font-monospace" style={{ fontSize: "9.5px" }}>
                      <span>
                        Grouping: {bd.groupingRadius !== null ? `${(bd.groupingRadius * 2).toFixed(1)} mm` : "-"}
                      </span>
                      <span>
                        MPI: {bd.offsetX !== null && bd.offsetY !== null ? `X:${bd.offsetX.toFixed(0)}, Y:${bd.offsetY.toFixed(0)}` : "-"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. DIAGNOSA BALISTIK & CATATAN EVALUASI TAKTIS */}
      {sertakanBalistik && (
        <div className="section-block mb-3" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
          <div className="section-title fw-bold text-uppercase small text-dark border-bottom border-secondary pb-1 mb-2 d-flex align-items-center justify-content-between">
            <span>
              <i className="bi bi-chat-square-quote-fill me-1 text-primary"></i> IV. Evaluasi Taktis & Catatan Perbaikan Menembak
            </span>
            <span className="text-muted small" style={{ fontSize: "10px" }}>
              Analisis Biomekanik & Pola Perkenaan
            </span>
          </div>

          <div className="p-2 border rounded bg-white" style={{ fontSize: "10.5px" }}>
            {generalEvaluation.warning && (
              <div
                className="alert alert-warning py-1 px-2 mb-2 d-flex align-items-center gap-2 border border-warning"
                style={{ fontSize: "10.5px" }}
              >
                <i className="bi bi-exclamation-triangle-fill text-warning flex-shrink-0"></i>
                <span className="fw-semibold">{generalEvaluation.warning}</span>
              </div>
            )}

            <div className="fw-semibold text-dark mb-1">
              Rekomendasi Instruktur & Asistensi Balistik SITRAK-AI:
            </div>
            <ul className="mb-0 ps-3 text-secondary" style={{ lineHeight: "1.45" }}>
              {generalEvaluation.items.map((item, idx) => (
                <li key={idx}>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 8. LEMBAR PENGESAHAN / TANDA TANGAN RESMI 3 PIHAK */}
      {sertakanTandaTangan && (
        <div
          className="signature-section mt-4 pt-2"
          style={{
            breakInside: "avoid",
            pageBreakInside: "avoid",
          }}
        >
          <div className="text-end mb-2 small fw-semibold text-dark pe-4" style={{ fontSize: "10.5px" }}>
            Dikeluarkan di: {lokasiPenerbitan}, Pada Tanggal: {tanggalCetakIndonesia}
          </div>

          <div className="row text-center align-items-start g-2">
            {/* 1. Penembak Yang Bersangkutan */}
            <div className="col-4">
              <div className="fw-semibold text-dark mb-4" style={{ fontSize: "10.5px" }}>
                Yang Dinilai / Penembak,
              </div>
              <div style={{ height: "40px" }}></div>
              <div className="fw-bold text-dark text-decoration-underline" style={{ fontSize: "11px" }}>
                {namaPenembakTtd || penembak.nama}
              </div>
              <div className="text-secondary small font-monospace" style={{ fontSize: "9.5px" }}>
                {pangkatNrpPenembakTtd || (penembak.nrp ? `NRP: ${penembak.nrp}` : "-")}
              </div>
            </div>

            {/* 2. Petugas Pencatat / Operator */}
            <div className="col-4">
              <div className="fw-semibold text-dark mb-4" style={{ fontSize: "10.5px" }}>
                Petugas Operator SITRAK,
              </div>
              <div style={{ height: "40px" }}></div>
              <div className="fw-bold text-dark text-decoration-underline" style={{ fontSize: "11px" }}>
                {namaPenandatangan2}
              </div>
              <div className="text-secondary small font-monospace" style={{ fontSize: "9.5px" }}>
                {pangkatNrpPenandatangan2}
              </div>
            </div>

            {/* 3. Penanggung Jawab Latihan / Instruktur */}
            <div className="col-4">
              <div className="fw-semibold text-dark mb-4" style={{ fontSize: "10.5px" }}>
                Penanggung Jawab Latihan,
              </div>
              <div style={{ height: "40px" }}></div>
              <div className="fw-bold text-dark text-decoration-underline" style={{ fontSize: "11px" }}>
                {namaPenandatangan1}
              </div>
              <div className="text-secondary small font-monospace" style={{ fontSize: "9.5px" }}>
                {pangkatNrpPenandatangan1}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. FOOTER DOKUMEN SISTEM */}
      <div className="laporan-cetak-footer">
        <span>
          Lembar Evaluasi Hasil Menembak Perorangan • SITRAK-AI v1.0 • &copy; {new Date().getFullYear()} KODIKLAT TNI
        </span>
        <span>
          {penembak.nama} (NRP: {penembak.nrp || "-"}) • Gel {gelombangNum}/Lane {laneNum} • Dicetak: {new Date().toLocaleTimeString("id-ID")}
        </span>
      </div>
    </div>
  );
};

/**
 * Modal Pratinjau & Cetak Laporan Individu Perorangan SITRAK
 * Mengizinkan pemilihan penembak secara fleksibel dan pengaturan parameter cetak dokumen A4.
 */
export const ModalCetakLaporanIndividu = ({
  isOpen = false,
  onClose,
  sesi,
  selectedPenembak,
  onSelectPenembak = null,
}) => {
  // Ambil seluruh daftar penembak di sesi untuk dropdown navigasi cepat
  const allShooters = useMemo(() => {
    if (!sesi?.gelombang_list) return [];
    return sesi.gelombang_list.flatMap((g) =>
      (g.penembak || []).map((p) => ({
        ...p,
        nomor_gelombang: g.nomor_gelombang,
      }))
    );
  }, [sesi]);

  // Current active shooter
  const [activePenembakId, setActivePenembakId] = useState(
    selectedPenembak?.id_personel_penembak ||
    (selectedPenembak ? `${selectedPenembak.nomor_gelombang || 1}-${selectedPenembak.lane || 1}` : "")
  );

  // Penembak aktif yang sedang ditampilkan
  const currentPenembak = useMemo(() => {
    if (!activePenembakId && selectedPenembak) return selectedPenembak;
    const found = allShooters.find(
      (s) =>
        String(s.id_personel_penembak) === String(activePenembakId) ||
        `${s.nomor_gelombang}-${s.lane}` === String(activePenembakId)
    );
    return found || selectedPenembak || allShooters[0] || null;
  }, [activePenembakId, allShooters, selectedPenembak]);

  // Pengaturan opsi cetak
  const [sertakanFotoTarget, setSertakanFotoTarget] = useState(true);
  const [sertakanVisualizerSvg, setSertakanVisualizerSvg] = useState(true);
  const [sertakanBalistik, setSertakanBalistik] = useState(true);
  const [sertakanTandaTangan, setSertakanTandaTangan] = useState(true);

  // Data penandatangan
  const [namaPenandatangan1, setNamaPenandatangan1] = useState(
    sesi?.pelatih || "Tommy Firmansyah, S.Hub.Int."
  );
  const [pangkatNrpPenandatangan1, setPangkatNrpPenandatangan1] = useState(
    "Letkol Inf NRP 11030036360882"
  );
  const [namaPenandatangan2, setNamaPenandatangan2] = useState(
    localStorage.getItem("user_nama") || "Gary Ferdinand Wahyudi, S.Kom."
  );
  const [pangkatNrpPenandatangan2, setPangkatNrpPenandatangan2] = useState(
    "Letda Sus NRP 3225107020561289"
  );
  const [lokasiPenerbitan, setLokasiPenerbitan] = useState("Jakarta");

  if (!isOpen || !sesi || !currentPenembak) return null;

  const handleCetak = () => {
    window.print();
  };

  const handleShooterChange = (e) => {
    const val = e.target.value;
    setActivePenembakId(val);
    if (onSelectPenembak) {
      const found = allShooters.find(
        (s) =>
          String(s.id_personel_penembak) === String(val) ||
          `${s.nomor_gelombang}-${s.lane}` === String(val)
      );
      if (found) onSelectPenembak(found);
    }
  };

  return (
    <>
      <div
        className="modal fade show d-block no-print"
        tabIndex="-1"
        style={{ backgroundColor: "rgba(15, 23, 42, 0.75)", zIndex: 1060 }}
      >
        <div className="modal-dialog modal-xl modal-dialog-scrollable">
          <div className="modal-content shadow-lg border-0">
            {/* Header Modal */}
            <div className="modal-header bg-dark text-white py-3 no-print">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-file-earmark-person-fill fs-4 text-warning"></i>
                <div>
                  <h5 className="modal-title fw-bold mb-0">
                    Pratinjau & Cetak Laporan Menembak Individu
                  </h5>
                  <small className="text-light opacity-75">
                    Format Dokumen Lembar Evaluasi & Penilaian Perorangan SITRAK-AI
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>

            {/* Toolbar Konfigurasi Cetak */}
            <div className="bg-dark text-light border-bottom p-3 no-print">
              <div className="row g-2 align-items-center mb-2">
                {/* Pemilih Personel */}
                <div className="col-12 col-md-5">
                  <label className="form-label small fw-semibold mb-1 text-light">
                    <i className="bi bi-person-fill me-1 text-warning"></i> Personel Penembak yang Dicetak:
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={
                      activePenembakId ||
                      currentPenembak.id_personel_penembak ||
                      `${currentPenembak.nomor_gelombang || 1}-${currentPenembak.lane || 1}`
                    }
                    onChange={handleShooterChange}
                  >
                    {allShooters.map((s) => (
                      <option
                        key={s.id_personel_penembak || `${s.nomor_gelombang}-${s.lane}`}
                        value={
                          s.id_personel_penembak ||
                          `${s.nomor_gelombang}-${s.lane}`
                        }
                      >
                        Gel {s.nomor_gelombang} • Lane {s.lane}: {s.nama} ({s.satuan || "NRP: " + s.nrp}) — Skor: {s.total_skor} ({s.kategori})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lokasi Penerbitan */}
                <div className="col-12 col-md-3">
                  <label className="form-label small fw-semibold mb-1 text-light">
                    <i className="bi bi-geo-alt me-1 text-warning"></i> Kota / Lokasi Penerbitan:
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={lokasiPenerbitan}
                    onChange={(e) => setLokasiPenerbitan(e.target.value)}
                    placeholder="Contoh: Jakarta"
                  />
                </div>

                {/* Opsi Tampilan Cepat */}
                <div className="col-12 col-md-4 d-flex flex-column gap-1">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="form-check form-switch mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="checkFotoIndividu"
                        checked={sertakanFotoTarget}
                        onChange={(e) => setSertakanFotoTarget(e.target.checked)}
                      />
                      <label className="form-check-label small text-light" htmlFor="checkFotoIndividu">
                        Foto Target Kamera
                      </label>
                    </div>

                    <div className="form-check form-switch mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="checkBalistikIndividu"
                        checked={sertakanBalistik}
                        onChange={(e) => setSertakanBalistik(e.target.checked)}
                      />
                      <label className="form-check-label small text-light" htmlFor="checkBalistikIndividu">
                        Analisis Balistik
                      </label>
                    </div>
                  </div>

                  <div className="d-flex align-items-center justify-content-between">
                    <div className="form-check form-switch mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="checkVisualizerSvg"
                        checked={sertakanVisualizerSvg}
                        onChange={(e) => setSertakanVisualizerSvg(e.target.checked)}
                      />
                      <label className="form-check-label small text-light" htmlFor="checkVisualizerSvg">
                        Diagram Sasaran SVG
                      </label>
                    </div>

                    <div className="form-check form-switch mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="checkTtdIndividu"
                        checked={sertakanTandaTangan}
                        onChange={(e) => setSertakanTandaTangan(e.target.checked)}
                      />
                      <label className="form-check-label small text-light" htmlFor="checkTtdIndividu">
                        Kolom Tanda Tangan
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Pejabat Penandatangan */}
              {sertakanTandaTangan && (
                <div className="pt-2 mt-2 border-top border-secondary border-opacity-50">
                  <div className="row g-2">
                    <div className="col-12 col-md-3">
                      <label className="form-label small fw-semibold mb-1 text-info" style={{ fontSize: "11px" }}>
                        Operator SITRAK (Nama):
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={namaPenandatangan2}
                        onChange={(e) => setNamaPenandatangan2(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-3">
                      <label className="form-label small fw-semibold mb-1 text-info" style={{ fontSize: "11px" }}>
                        Pangkat / NRP Operator:
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={pangkatNrpPenandatangan2}
                        onChange={(e) => setPangkatNrpPenandatangan2(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-3">
                      <label className="form-label small fw-semibold mb-1 text-warning" style={{ fontSize: "11px" }}>
                        Instruktur / Wasdal (Nama):
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={namaPenandatangan1}
                        onChange={(e) => setNamaPenandatangan1(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-3">
                      <label className="form-label small fw-semibold mb-1 text-warning" style={{ fontSize: "11px" }}>
                        Pangkat / NRP Instruktur:
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={pangkatNrpPenandatangan1}
                        onChange={(e) => setPangkatNrpPenandatangan1(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Body Modal: Pratinjau Lembar A4 */}
            <div
              className="modal-body p-3 p-md-4 bg-secondary-subtle"
              style={{ maxHeight: "72vh", overflowY: "auto" }}
            >
              <DokumenLaporanIndividu
                sesi={sesi}
                penembak={currentPenembak}
                sertakanFotoTarget={sertakanFotoTarget}
                sertakanVisualizerSvg={sertakanVisualizerSvg}
                sertakanBalistik={sertakanBalistik}
                sertakanTandaTangan={sertakanTandaTangan}
                namaPenandatangan1={namaPenandatangan1}
                pangkatNrpPenandatangan1={pangkatNrpPenandatangan1}
                namaPenandatangan2={namaPenandatangan2}
                pangkatNrpPenandatangan2={pangkatNrpPenandatangan2}
                namaPenembakTtd={currentPenembak.nama}
                pangkatNrpPenembakTtd={currentPenembak.nrp ? `NRP: ${currentPenembak.nrp}` : ""}
                lokasiPenerbitan={lokasiPenerbitan}
                isPrintMode={false}
              />
            </div>

            {/* Footer Modal */}
            <div className="modal-footer border-top py-2 px-3 d-flex justify-content-between align-items-center no-print">
              <div className="small text-muted d-flex align-items-center gap-1">
                <i className="bi bi-info-circle text-primary"></i>
                <span>
                  Laporan individu ini dicetak khusus pada kertas A4 Portrait resmi tanpa elemen antarmuka web.
                </span>
              </div>
              <div className="d-flex align-items-center gap-2 no-print">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary px-3"
                  onClick={onClose}
                >
                  <i className="bi bi-x me-1"></i> Tutup
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary px-4 shadow-sm fw-bold d-flex align-items-center gap-1"
                  onClick={handleCetak}
                >
                  <i className="bi bi-printer-fill me-1"></i> Cetak Lembar Individu
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DOKUMEN CETAK RESMI (@media print) */}
      <div id="sitrak-print-area" className="d-none d-print-block">
        <DokumenLaporanIndividu
          sesi={sesi}
          penembak={currentPenembak}
          sertakanFotoTarget={sertakanFotoTarget}
          sertakanVisualizerSvg={sertakanVisualizerSvg}
          sertakanBalistik={sertakanBalistik}
          sertakanTandaTangan={sertakanTandaTangan}
          namaPenandatangan1={namaPenandatangan1}
          pangkatNrpPenandatangan1={pangkatNrpPenandatangan1}
          namaPenandatangan2={namaPenandatangan2}
          pangkatNrpPenandatangan2={pangkatNrpPenandatangan2}
          namaPenembakTtd={currentPenembak.nama}
          pangkatNrpPenembakTtd={currentPenembak.nrp ? `NRP: ${currentPenembak.nrp}` : ""}
          lokasiPenerbitan={lokasiPenerbitan}
          isPrintMode={true}
        />
      </div>
    </>
  );
};

