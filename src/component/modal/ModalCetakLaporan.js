import React, { useState, useMemo } from "react";
import { parseCatatanAnalisis } from "../../services/sitrakDetectService";

/**
 * Komponen Dokumen Laporan Resmi Latihan Menembak (SITRAK-AI)
 * Didesain khusus sesuai kaidah dokumen resmi militer/kedinasan untuk dicetak di kertas A4 portrait.
 */
export const DokumenLaporanSesi = ({
  sesi,
  filterGelombang = "semua",
  sertakanBalistik = true,
  sertakanCatatanAnalisis = true,
  sertakanTandaTangan = true,
  namaPenandatangan1 = "Komandan Latihan Menembak",
  pangkatNrpPenandatangan1 = "",
  namaPenandatangan2 = "Petugas Pencatat Nilai SITRAK",
  pangkatNrpPenandatangan2 = "",
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

  // Kumpulan gelombang yang dipilih untuk dicetak
  const displayedGelombangList = useMemo(() => {
    if (!sesi?.gelombang_list) return [];
    if (filterGelombang === "semua") {
      return sesi.gelombang_list;
    }
    return sesi.gelombang_list.filter(
      (g) => String(g.nomor_gelombang) === String(filterGelombang)
    );
  }, [sesi, filterGelombang]);

  // Seluruh penembak dalam cakupan cetak
  const allPenembak = useMemo(() => {
    return displayedGelombangList.flatMap((g) =>
      (g.penembak || []).map((p) => ({
        ...p,
        nomor_gelombang: g.nomor_gelombang,
      }))
    );
  }, [displayedGelombangList]);

  // Perhitungan statistik sesi
  const stats = useMemo(() => {
    const totalPeserta = allPenembak.length;
    if (totalPeserta === 0) {
      return {
        totalPeserta: 0,
        avgSkor: 0,
        avgAkurasi: 0,
        topScorer: null,
        kategoriDist: {
          istimewa: 0,
          mahir: 0,
          cukup: 0,
          pembinaan: 0,
        },
      };
    }

    const totalSkorSemua = allPenembak.reduce(
      (acc, p) => acc + (p.total_skor || 0),
      0
    );
    const avgSkor = (totalSkorSemua / totalPeserta).toFixed(1);
    const totalAkurasiSemua = allPenembak.reduce(
      (acc, p) => acc + (p.akurasi_akhir || 0),
      0
    );
    const avgAkurasi = (totalAkurasiSemua / totalPeserta).toFixed(1);

    // Shooter of the day (Skor tertinggi)
    const sorted = [...allPenembak].sort(
      (a, b) => (b.total_skor || 0) - (a.total_skor || 0)
    );
    const topScorer = sorted[0] || null;

    // Distribusi kategori
    const kategoriDist = {
      istimewa: allPenembak.filter((p) => p.kategori === "Istimewa").length,
      mahir: allPenembak.filter((p) => p.kategori === "Mahir").length,
      cukup: allPenembak.filter((p) => p.kategori === "Cukup").length,
      pembinaan: allPenembak.filter((p) => p.kategori === "Perlu Pembinaan").length,
    };

    return {
      totalPeserta,
      avgSkor,
      avgAkurasi,
      topScorer,
      kategoriDist,
    };
  }, [allPenembak]);

  // Ekstraksi ringkasan catatan taktis penembak untuk baris tabel
  const getShooterNotesSummary = (p) => {
    const parts = [];
    if (p.babak_scores && p.babak_scores.length > 0) {
      p.babak_scores.forEach((bs) => {
        if (
          bs.catatan_analisis &&
          typeof bs.catatan_analisis === "string" &&
          bs.catatan_analisis.trim()
        ) {
          const parsed = parseCatatanAnalisis(bs.catatan_analisis);
          const babakLabel =
            bs.nama ||
            bs.nama_babak ||
            `Babak ${bs.nomor || bs.nomor_babak || ""}`.trim();
          const primary =
            parsed.items.length > 0
              ? parsed.items.slice(0, 2).join(" • ")
              : bs.catatan_analisis.trim();
          parts.push(`[${babakLabel}] ${primary}`);
        }
      });
    }
    if (parts.length === 0 && (p.catatan_analisis || p.ballistics?.catatan)) {
      const raw = p.catatan_analisis || p.ballistics?.catatan;
      if (typeof raw === "string" && raw.trim()) {
        const parsed = parseCatatanAnalisis(raw);
        const primary =
          parsed.items.length > 0
            ? parsed.items.slice(0, 2).join(" • ")
            : raw.trim();
        parts.push(primary);
      }
    }
    return parts.join(" | ");
  };

  // Kumpulan seluruh personel yang memiliki catatan analisis tembakan terdeteksi
  const penembakWithCatatan = useMemo(() => {
    const result = [];
    displayedGelombangList.forEach((g) => {
      (g.penembak || []).forEach((p) => {
        const babakNotes = (p.babak_scores || [])
          .filter(
            (bs) =>
              bs.catatan_analisis &&
              typeof bs.catatan_analisis === "string" &&
              bs.catatan_analisis.trim()
          )
          .map((bs) => {
            const parsed = parseCatatanAnalisis(bs.catatan_analisis);
            return {
              nomorBabak: bs.nomor || bs.nomor_babak,
              namaBabak:
                bs.nama ||
                bs.nama_babak ||
                `Babak ${bs.nomor || bs.nomor_babak || ""}`.trim(),
              rawNote: bs.catatan_analisis,
              warning: parsed.warning,
              items:
                parsed.items.length > 0
                  ? parsed.items
                  : [bs.catatan_analisis.trim()],
              groupingRadius:
                bs.grouping_radius_mm !== null &&
                bs.grouping_radius_mm !== undefined
                  ? parseFloat(bs.grouping_radius_mm)
                  : null,
              offsetX:
                bs.center_offset_x_mm !== null &&
                bs.center_offset_x_mm !== undefined
                  ? parseFloat(bs.center_offset_x_mm)
                  : null,
              offsetY:
                bs.center_offset_y_mm !== null &&
                bs.center_offset_y_mm !== undefined
                  ? parseFloat(bs.center_offset_y_mm)
                  : null,
              skor: bs.skor,
            };
          });

        let generalNote = null;
        const rawDirect = p.catatan_analisis || p.ballistics?.catatan;
        if (rawDirect && typeof rawDirect === "string" && rawDirect.trim()) {
          const parsed = parseCatatanAnalisis(rawDirect);
          generalNote = {
            rawNote: rawDirect,
            warning: parsed.warning,
            items:
              parsed.items.length > 0 ? parsed.items : [rawDirect.trim()],
          };
        }

        if (babakNotes.length > 0 || generalNote) {
          result.push({
            id: p.id_personel_penembak || `${g.nomor_gelombang}-${p.lane}`,
            lane: p.lane,
            nama: p.nama,
            nrp: p.nrp,
            satuan: p.satuan,
            kategori: p.kategori,
            nomorGelombang: g.nomor_gelombang,
            babakNotes,
            generalNote,
          });
        }
      });
    });
    return result;
  }, [displayedGelombangList]);

  if (!sesi) return null;

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
      {/* 1. KOP SURAT RESMI */}
      <div className="d-flex align-items-center justify-content-between border-bottom border-dark pb-3 mb-2">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center bg-dark text-white rounded-3"
            style={{ width: "90px", height: "90px", flexShrink: 0 }}
          >
            <img
              src="SITRAK Tactical Analytics Emblem.png"
              alt="Logo Sitrak"
              style={{ width: "80px", height: "80px", objectFit: "contain" }}
            />
          </div>
          <div>
            <h6 className="fw-bold text-uppercase mb-0 tracking-wide fs-6 text-dark">
              SISTEM ANALISIS TARGET & Rekapitulasi Latihan Menembak (SITRAK)
            </h6>
            <div className="fw-semibold small text-secondary">
              KODIKLAT TNI • SITRAK-AI v1.0
            </div>
            <small className="text-secondary" style={{ fontSize: "11px" }}>
              Lokasi: {sesi.nama_tempat_menembak || "-"}
            </small>
          </div>
        </div>
        <div className="text-end">
          <span className="badge bg-dark px-2 py-1 font-monospace fs-7">
            {sesi.kode_sesi}
          </span>
          <div className="small text-secondary mt-1" style={{ fontSize: "11px" }}>
            Tgl Dokumen: {tanggalCetakIndonesia}
          </div>
        </div>
      </div>

      {/* Garis Ganda Pemisah Kop Surat */}
      <div
        style={{
          borderBottom: "2px solid #000",
          borderTop: "1px solid #000",
          height: "3px",
          marginBottom: "18px",
        }}
      />

      {/* 2. JUDUL DOKUMEN */}
      <div className="text-center mb-4">
        <h4 className="fw-bold text-uppercase mb-1 text-dark tracking-wider">
          LAPORAN RESMI HASIL LATIHAN MENEMBAK
        </h4>
        <div className="text-secondary small fw-semibold">
          Nomor: BA-LTR/{sesi.kode_sesi}/{new Date().getFullYear()}
        </div>
      </div>

      {/* 3. PARAMETER & SPESIFIKASI TEKNIS MENEMBAK */}
      <div
        className="section-block mb-4"
        style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
      >
        <div className="section-title fw-bold text-uppercase small text-dark border-bottom border-secondary pb-1 mb-2 d-flex align-items-center justify-content-between">
          <span>
            <i className="bi bi-info-circle me-1 text-primary"></i> I. Parameter & Spesifikasi Sesi Latihan
          </span>
          <span className="badge bg-secondary-subtle text-dark border">
            Status: {sesi.status || "Menunggu"}
          </span>
        </div>

        <table
          className="table table-sm table-bordered mb-0 align-middle"
          style={{
            fontSize: "12px",
            breakInside: "avoid",
            pageBreakInside: "avoid",
          }}
        >
          <tbody>
            <tr>
              <th className="bg-light" style={{ width: "20%" }}>
                Nama Sesi
              </th>
              <td className="fw-semibold" style={{ width: "30%" }}>
                {sesi.nama_sesi}
              </td>
              <th className="bg-light" style={{ width: "20%" }}>
                Model Senjata
              </th>
              <td style={{ width: "30%" }}>
                {sesi.model_senjata || sesi.jenis_senjata || "-"} ({sesi.pabrikan || "-"})
              </td>
            </tr>
            <tr>
              <th className="bg-light">Waktu / Tanggal</th>
              <td>{formatTanggalLengkap(sesi.tanggal)}</td>
              <th className="bg-light">Kaliber</th>
              <td>
                {sesi.kaliber || "-"}
              </td>
            </tr>
            <tr>
              <th className="bg-light">Lapangan / Lokasi</th>
              <td>{sesi.nama_tempat_menembak || "-"}</td>
              <th className="bg-light">Jarak Tembak</th>
              <td className="fw-semibold text-primary">
                {sesi.jarak_meter || sesi.jarak || 0} Meter
              </td>
            </tr>
            <tr>
              <th className="bg-light">Sikap Menembak</th>
              <td>{sesi.nama_sikap_menembak || sesi.sikap_menembak || "-"}</td>
              <th className="bg-light">Mode Tembakan</th>
              <td>{sesi.nama_mode_tembakan || "-"}</td>
            </tr>
            <tr>
              <th className="bg-light">Tipe Sasaran / Lesan</th>
              <td>{sesi.nama_tipe_target || sesi.tipe_sasaran || "-"}</td>
              <th className="bg-light">Konfigurasi Babak</th>
              <td>
                {(sesi.babak || []).length > 0
                  ? (sesi.babak || [])
                      .map((b, idx) => {return (
                        <div>
                          {idx + 1}. {b.nama_babak} ({b.jumlah_peluru} butir)
                        </div>)})
                      
                  : "-"}
              </td>
            </tr>
            <tr>
              <th className="bg-light">Total Peluru / Org</th>
              <td className="fw-semibold">
                {sesi.total_peluru_per_personel || 0} Butir
              </td>
              <th className="bg-light">Jalur & Gelombang</th>
              <td>
                {sesi.jumlah_jalur || 1} Jalur • {sesi.total_gelombang || sesi.gelombang_list?.length || 1} Gelombang
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. RINGKASAN EKSEKUTIF & STATISTIK KINERJA */}
      <div
        className="section-block mb-4"
        style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
      >
        <div className="section-title fw-bold text-uppercase small text-dark border-bottom border-secondary pb-1 mb-2">
          <i className="bi bi-graph-up me-1 text-primary"></i> II. Ringkasan Eksekutif & Statistik Performa
        </div>

        <div className="row g-2 mb-2">
          <div className="col-3">
            <div className="border rounded p-2 text-center bg-light">
              <small className="text-secondary d-block" style={{ fontSize: "11px" }}>
                Total Personel
              </small>
              <div className="fs-5 fw-bold text-dark">{stats.totalPeserta} Orang</div>
            </div>
          </div>
          <div className="col-3">
            <div className="border rounded p-2 text-center bg-light">
              <small className="text-secondary d-block" style={{ fontSize: "11px" }}>
                Rata-rata Skor
              </small>
              <div className="fs-5 fw-bold text-primary">{stats.avgSkor} Poin</div>
            </div>
          </div>
          <div className="col-3">
            <div className="border rounded p-2 text-center bg-light">
              <small className="text-secondary d-block" style={{ fontSize: "11px" }}>
                Rata-rata Akurasi
              </small>
              <div className="fs-5 fw-bold text-success">{stats.avgAkurasi}%</div>
            </div>
          </div>
          <div className="col-3">
            <div className="border rounded p-2 text-center bg-light">
              <small className="text-secondary d-block" style={{ fontSize: "11px" }}>
                Nilai Tertinggi (Rank 1)
              </small>
              <div
                className="fs-6 fw-bold text-dark text-truncate"
                title={stats.topScorer ? `${stats.topScorer.nama} (${stats.topScorer.total_skor} poin)` : "-"}
              >
                {stats.topScorer ? `${stats.topScorer.total_skor} Poin` : "-"}
              </div>
              <small className="text-muted d-block text-truncate" style={{ fontSize: "10px" }}>
                {stats.topScorer ? `${stats.topScorer.nama}` : ""}
              </small>
            </div>
          </div>
        </div>

        {/* Distribusi Kualifikasi Kelulusan */}
        <div className="p-2 border rounded bg-light" style={{ fontSize: "11.5px" }}>
          <div className="row text-center g-1">
            <div className="col-3 border-end">
              <span className="text-success fw-bold me-1">Istimewa (≥90%):</span>
              <span className="badge bg-success-subtle text-success border border-success">
                {stats.kategoriDist.istimewa} Personel
              </span>
            </div>
            <div className="col-3 border-end">
              <span className="text-primary fw-bold me-1">Mahir (80-89%):</span>
              <span className="badge bg-primary-subtle text-primary border border-primary">
                {stats.kategoriDist.mahir} Personel
              </span>
            </div>
            <div className="col-3 border-end">
              <span className="text-warning-emphasis fw-bold me-1">Cukup (70-79%):</span>
              <span className="badge bg-warning-subtle text-warning-emphasis border border-warning">
                {stats.kategoriDist.cukup} Personel
              </span>
            </div>
            <div className="col-3">
              <span className="text-danger fw-bold me-1">Pembinaan (&lt;70%):</span>
              <span className="badge bg-danger-subtle text-danger border border-danger">
                {stats.kategoriDist.pembinaan} Personel
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. TABEL REKAPITULASI HASIL PENEMBAK PER GELOMBANG */}
      <div className="mb-4">
        <div className="section-title fw-bold text-uppercase small text-dark border-bottom border-secondary pb-1 mb-2 d-flex justify-content-between align-items-center">
          <span>
            <i className="bi bi-card-checklist me-1 text-primary"></i> III. Rekapitulasi Nilai & Evaluasi Penembak
          </span>
          <small className="text-muted text-capitalize">
            {filterGelombang === "semua"
              ? "Seluruh Gelombang"
              : `Gelombang ${filterGelombang}`}
          </small>
        </div>

        {displayedGelombangList.length === 0 ? (
          <div className="text-center py-4 border rounded text-secondary small">
            Tidak ada data gelombang penembak pada sesi ini.
          </div>
        ) : (
          displayedGelombangList.map((g) => {
            const penembakList = g.penembak || [];
            const waveTotalSkor = penembakList.reduce(
              (acc, p) => acc + (p.total_skor || 0),
              0
            );
            const waveAvgSkor =
              penembakList.length > 0
                ? (waveTotalSkor / penembakList.length).toFixed(1)
                : 0;
            const waveAvgAkurasi =
              penembakList.length > 0
                ? (
                    penembakList.reduce(
                      (acc, p) => acc + (p.akurasi_akhir || 0),
                      0
                    ) / penembakList.length
                  ).toFixed(1)
                : 0;

            return (
              <div
                key={g.id_gelombang || g.nomor_gelombang}
                className="tabel-gelombang-block mb-4"
                style={{
                  breakInside: "avoid",
                  pageBreakInside: "avoid",
                }}
              >
                <div
                  className="d-flex align-items-center justify-content-between bg-dark text-white px-2 py-1 rounded-top"
                  style={{
                    fontSize: "11.5px",
                    breakAfter: "avoid",
                    pageBreakAfter: "avoid",
                  }}
                >
                  <span className="fw-bold">
                    GELOMBANG {g.nomor_gelombang} ({penembakList.length} Personel)
                  </span>
                </div>

                <table
                  className="table table-sm table-bordered mb-0 align-middle"
                  style={{
                    fontSize: "11px",
                    breakInside: "avoid",
                    pageBreakInside: "avoid",
                  }}
                >
                  <thead className="bg-light text-center align-middle">
                    <tr>
                      <th style={{ width: "42px" }}>Lane</th>
                      <th className="text-start" style={{ width: "160px" }}>
                        Nama
                      </th>
                      <th style={{ width: "85px" }}>NRP, Satuan</th>
                      {(sesi.babak || []).map((b) => (
                        <th key={b.nomor_babak} style={{ minWidth: "60px" }}>
                          {b.nama_babak}
                          <div className="text-muted" style={{ fontSize: "9px" }}>
                            ({b.jumlah_peluru} btr)
                          </div>
                        </th>
                      ))}
                      <th style={{ width: "70px" }}>Total Skor</th>
                      <th style={{ width: "65px" }}>Akurasi</th>
                      <th style={{ width: "85px" }}>Kualifikasi</th>
                      {sertakanBalistik && (
                        <th style={{ width: "110px" }}>Analisis Balistik</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {penembakList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={
                            8 +
                            (sesi.babak?.length || 0) +
                            (sertakanBalistik ? 1 : 0)
                          }
                          className="text-center py-2 text-muted"
                        >
                          Belum ada personel pada gelombang ini.
                        </td>
                      </tr>
                    ) : (
                      penembakList.map((p, idx) => {
                        let badgeClass = "badge bg-secondary-subtle text-secondary border";
                        if (p.kategori === "Istimewa") {
                          badgeClass = "badge bg-success-subtle text-success border border-success";
                        } else if (p.kategori === "Mahir") {
                          badgeClass = "badge bg-primary-subtle text-primary border border-primary";
                        } else if (p.kategori === "Cukup") {
                          badgeClass = "badge bg-warning-subtle text-warning-emphasis border border-warning";
                        } else if (p.kategori === "Perlu Pembinaan") {
                          badgeClass = "badge bg-danger-subtle text-danger border border-danger";
                        }

                        const shooterNoteSummary = sertakanCatatanAnalisis ? getShooterNotesSummary(p) : null;

                        return (
                          <React.Fragment key={p.id_personel_penembak || idx}>
                            <tr style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                              <td className="text-center fw-bold">
                                {p.lane || idx + 1}
                              </td>
                              <td className="text-start">
                                <div className="fw-bold text-dark">
                                  {p.nama}
                                </div>
                              </td>
                              <td className="text-center font-monospace">
                                {p.nrp || "-"}<br/>
                                {p.satuan || "-"}
                              </td>
                              {(sesi.babak || []).map((b) => {
                                const bScore = (p.babak_scores || []).find(
                                  (bs) =>
                                    String(bs.nomor) ===
                                      String(b.nomor_babak) ||
                                    String(bs.id_babak) ===
                                      String(b.id_babak)
                                );
                                return (
                                  <td
                                    key={b.nomor_babak}
                                    className="text-center font-monospace"
                                  >
                                    {bScore ? bScore.skor : 0}
                                  </td>
                                );
                              })}
                              <td className="text-center fw-bold text-dark font-monospace">
                                {p.total_skor}
                                <span className="text-muted fw-normal" style={{ fontSize: "9px" }}>
                                  /{p.total_max}
                                </span>
                              </td>
                              <td className="text-center fw-bold font-monospace">
                                {p.akurasi_akhir}%
                              </td>
                              <td className="text-center">
                                <span className={badgeClass} style={{ fontSize: "9.5px" }}>
                                  {p.kategori}
                                </span>
                              </td>
                              {sertakanBalistik && (
                                <td className="text-start" style={{ fontSize: "9.5px" }}>
                                  {p.ballistics?.groupingRadius ? (
                                    <div>
                                      <div>Grp: {p.ballistics.groupingRadius.toFixed(1)} mm</div>
                                      {p.ballistics.offsetX !== null && (
                                        <div className="text-muted">
                                          MPI: X:{p.ballistics.offsetX.toFixed(0)}, Y:{p.ballistics.offsetY?.toFixed(0)}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot className="table-light fw-bold text-center" style={{ fontSize: "11px" }}>
                    <tr>
                      <td colSpan={3} className="text-end pe-3">
                        Rata-rata Gelombang {g.nomor_gelombang}:
                      </td>
                      {(sesi.babak || []).map((b) => {
                        const avgBabakSkor =
                          penembakList.length > 0
                            ? (
                                penembakList.reduce((acc, p) => {
                                  const bScore = (p.babak_scores || []).find(
                                    (bs) =>
                                      String(bs.nomor) === String(b.nomor_babak) ||
                                      String(bs.id_babak) === String(b.id_babak)
                                  );
                                  return acc + (bScore ? bScore.skor : 0);
                                }, 0) / penembakList.length
                              ).toFixed(1)
                            : 0;
                        return (
                          <td key={b.nomor_babak} className="font-monospace">
                            {avgBabakSkor}
                          </td>
                        );
                      })}
                      <td className="font-monospace text-primary">{waveAvgSkor}</td>
                      <td className="font-monospace text-success">{waveAvgAkurasi}%</td>
                      <td colSpan={sertakanBalistik ? 2 : 1}>-</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })
        )}
      </div>

      {/* 6. CATATAN EVALUASI & REKOMENDASI */}
      <div
        className="section-block mb-4 p-3 border rounded bg-light"
        style={{
          fontSize: "11.5px",
          breakInside: "avoid",
          pageBreakInside: "avoid",
        }}
      >
        <div className="fw-bold mb-2 text-dark fs-6 border-bottom pb-1">
          <i className="bi bi-pencil-square me-1 text-primary"></i> IV. Catatan & Rekomendasi Evaluasi Menembak
        </div>

        {/* IV.A Evaluasi Standar Sesi Latihan */}
        <div className="mb-3">
          <div className="fw-semibold text-dark small mb-1">
            A. Evaluasi Standar Sesi Latihan:
          </div>
          <ul className="mb-0 ps-3 text-secondary">
            <li>
              Seluruh tembakan telah direkam dan diverifikasi menggunakan sistem computer vision presisi SITRAK-AI.
            </li>
            <li>
              Personel dengan kualifikasi <strong>Istimewa</strong> dan <strong>Mahir</strong> dinyatakan telah memenuhi standar kemahiran menembak perorangan pada jarak dan sikap yang ditentukan.
            </li>
            <li>
              Personel dengan kualifikasi <strong>Perlu Pembinaan</strong> direkomendasikan untuk mengikuti evaluasi koreksi sikap bidik (sight alignment), remasan picu (trigger control), dan latihan bayangan (dry fire).
            </li>
          </ul>
        </div>

        {/* IV.B Catatan & Rekomendasi Taktis Perorangan */}
        {sertakanCatatanAnalisis && (
          <div className="pt-2 border-top">
            <div className="fw-semibold text-dark small mb-2 d-flex align-items-center justify-content-between">
              <span>
                <i className="bi bi-cpu text-primary me-1"></i> B. Catatan Analisis Taktis & Koreksi Perorangan (SITRAK-Detect AI):
              </span>
              <span className="badge bg-secondary-subtle text-secondary font-monospace" style={{ fontSize: "9.5px" }}>
                {penembakWithCatatan.length} Personel Dianalisis
              </span>
            </div>

            {penembakWithCatatan.length === 0 ? (
              <div className="text-muted fst-italic px-2 py-1" style={{ fontSize: "11px" }}>
                Belum ada data catatan analisis taktis yang tersimpan untuk sesi/gelombang yang dipilih. Catatan akan terisi secara otomatis setelah target tembakan diproses oleh sistem deteksi.
              </div>
            ) : (
              <div className="d-flex flex-column gap-2 mt-2">
                {penembakWithCatatan.map((p, pIdx) => {
                  let badgeClass = "badge bg-secondary-subtle text-secondary border";
                  if (p.kategori === "Istimewa") {
                    badgeClass = "badge bg-success-subtle text-success border border-success";
                  } else if (p.kategori === "Mahir") {
                    badgeClass = "badge bg-primary-subtle text-primary border border-primary";
                  } else if (p.kategori === "Cukup") {
                    badgeClass = "badge bg-warning-subtle text-warning-emphasis border border-warning";
                  } else if (p.kategori === "Perlu Pembinaan") {
                    badgeClass = "badge bg-danger-subtle text-danger border border-danger";
                  }

                  return (
                    <div
                      key={p.id || pIdx}
                      className="p-2 border rounded bg-white shadow-none"
                      style={{
                        breakInside: "avoid",
                        pageBreakInside: "avoid",
                        fontSize: "11px",
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between border-bottom pb-1 mb-1">
                        <div className="fw-bold text-dark">
                          <span className="badge bg-dark me-1" style={{ fontSize: "9px" }}>
                            Gel {p.nomorGelombang} • Lane {p.lane}
                          </span>
                          {p.nama}
                          <span className="text-muted fw-normal ms-1 font-monospace" style={{ fontSize: "10px" }}>
                            ({p.nrp ? `NRP: ${p.nrp}` : "-"} • {p.satuan || "-"})
                          </span>
                        </div>
                        <span className={badgeClass} style={{ fontSize: "9px" }}>
                          {p.kategori}
                        </span>
                      </div>

                      {/* Rincian per Babak */}
                      {p.babakNotes && p.babakNotes.length > 0 ? (
                        p.babakNotes.map((bn, bIdx) => (
                          <div
                            key={bIdx}
                            className={bIdx > 0 ? "pt-2 mt-2 border-top border-light-subtle" : "mt-1"}
                          >
                            <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                              <span className="fw-semibold text-primary" style={{ fontSize: "10.5px" }}>
                                <i className="bi bi-bullseye me-1"></i>
                                {bn.namaBabak} {bn.skor !== undefined && bn.skor !== null ? `(Skor: ${bn.skor})` : ""}
                              </span>
                              {bn.groupingRadius !== null && (
                                <span className="badge bg-light text-dark border font-monospace" style={{ fontSize: "9px" }}>
                                  Grouping: {(bn.groupingRadius * 2).toFixed(1)} mm
                                </span>
                              )}
                              {bn.offsetX !== null && bn.offsetY !== null && (
                                <span className="badge bg-light text-secondary border font-monospace" style={{ fontSize: "9px" }}>
                                  MPI: X:{bn.offsetX.toFixed(0)}, Y:{bn.offsetY.toFixed(0)}
                                </span>
                              )}
                            </div>

                            {bn.warning && (
                              <div
                                className="alert alert-warning py-1 px-2 mb-1 d-flex align-items-center gap-1 border border-warning"
                                style={{ fontSize: "10px" }}
                              >
                                <i className="bi bi-exclamation-triangle-fill text-warning flex-shrink-0"></i>
                                <span>{bn.warning}</span>
                              </div>
                            )}

                            <ul className="mb-0 ps-3 text-secondary" style={{ lineHeight: "1.4" }}>
                              {bn.items.map((item, itemIdx) => (
                                <li key={itemIdx}>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))
                      ) : p.generalNote ? (
                        <div className="mt-1">
                          {p.generalNote.warning && (
                            <div
                              className="alert alert-warning py-1 px-2 mb-1 d-flex align-items-center gap-1 border border-warning"
                              style={{ fontSize: "10px" }}
                            >
                              <i className="bi bi-exclamation-triangle-fill text-warning flex-shrink-0"></i>
                              <span>{p.generalNote.warning}</span>
                            </div>
                          )}
                          <ul className="mb-0 ps-3 text-secondary" style={{ lineHeight: "1.4" }}>
                            {p.generalNote.items.map((item, itemIdx) => (
                              <li key={itemIdx}>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7. LEMBAR PENGESAHAN / TANDA TANGAN RESMI */}
      {sertakanTandaTangan && (
        <div
          className="signature-section mt-5 pt-3"
          style={{
            breakInside: "avoid",
            pageBreakInside: "avoid",
          }}
        >
          <div className="text-end mb-3 small fw-semibold text-dark pe-5">
            {lokasiPenerbitan},&nbsp;&nbsp;&nbsp;{tanggalCetakIndonesia}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          </div>
          <div className="row text-center align-items-start g-4">
            <div className="col-6">
              <div className="fw-semibold small text-dark mb-5">
                Petugas Pencatat & Operator SITRAK,
              </div>
              <div style={{ height: "45px" }}></div>
              <div className="fw-bold text-dark">
                {namaPenandatangan2}
              </div>
              <div className="text-secondary small font-monospace">
                {pangkatNrpPenandatangan2}
              </div>
            </div>

            <div className="col-6">
              <div className="fw-semibold small text-dark mb-5">
                Penanggung Jawab Latihan / Instruktur
              </div>
              <div style={{ height: "45px" }}></div>
              <div className="fw-bold text-dark">
                {namaPenandatangan1}
              </div>
              <div className="text-secondary small font-monospace">
                {pangkatNrpPenandatangan1}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. FOOTER DOKUMEN SISTEM (MENEMPEL DI BAWAH SETIAP HALAMAN CETAK) */}
      <div className="laporan-cetak-footer">
        <span>
          Document Generated by SITRAK-AI v1.0 • &copy; 2026 KODIKLAT TNI
        </span>
        <span>
          Kode Sesi: {sesi.kode_sesi} • Dicetak: {new Date().toLocaleString("id-ID")}
        </span>
      </div>
    </div>
  );
};

/**
 * Modal Pratinjau & Cetak Laporan Resmi SITRAK
 * Mengizinkan pengguna mengonfigurasi opsi cetak sebelum membuka dialog cetak browser.
 */
export const ModalCetakLaporan = ({
  isOpen = false,
  onClose,
  sesi,
  activeGelombang = 1,
}) => {
  // Opsi cetak
  const [filterGelombang, setFilterGelombang] = useState("semua"); // "semua" | string nomor gelombang
  const [sertakanBalistik, setSertakanBalistik] = useState(true);
  const [sertakanCatatanAnalisis, setSertakanCatatanAnalisis] = useState(true);
  const [sertakanTandaTangan, setSertakanTandaTangan] = useState(true);
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
  const [lokasiPenerbitan, setLokasiPenerbitan] = useState(
    "Jakarta"
  );

  if (!isOpen || !sesi) return null;

  const handleCetak = () => {
    window.print();
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
          {/* Header Modal (Layar Web - Tidak Tercetak) */}
          <div className="modal-header bg-dark text-white py-3 no-print">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-file-earmark-pdf fs-4 text-warning"></i>
              <div>
                <h5 className="modal-title fw-bold mb-0">
                  Pratinjau & Cetak Laporan Resmi Latihan Menembak
                </h5>
                <small className="text-light opacity-75">
                  Format Dokumen Berita Acara & Rekapitulasi Nilai SITRAK-AI
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

          {/* Toolbar Konfigurasi Cetak (Layar Web - Tidak Tercetak) */}
          <div className="bg-dark text-light border-bottom p-3 no-print">
            {/* Baris 1: Filter & Pengaturan Umum */}
            <div className="row g-3 align-items-center mb-2">
              <div className="col-12 col-md-4">
                <label className="form-label small fw-semibold mb-1 text-light">
                  <i className="bi bi-filter me-1 text-warning"></i> Cakupan Gelombang:
                </label>
                <select
                  className="form-select form-select-sm"
                  value={filterGelombang}
                  onChange={(e) => setFilterGelombang(e.target.value)}
                >
                  <option value="semua">
                    Semua Gelombang ({sesi.gelombang_list?.length || 1} Gelombang)
                  </option>
                  {(sesi.gelombang_list || []).map((g) => (
                    <option
                      key={g.id_gelombang || g.nomor_gelombang}
                      value={g.nomor_gelombang}
                    >
                      Gelombang {g.nomor_gelombang} ({g.penembak?.length || 0} Personel)
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label small fw-semibold mb-1 text-light">
                  <i className="bi bi-geo-alt me-1 text-warning"></i> Tempat / Kota Penerbitan:
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={lokasiPenerbitan}
                  onChange={(e) => setLokasiPenerbitan(e.target.value)}
                  placeholder="Contoh: Jakarta"
                />
              </div>

              <div className="col-12 col-md-4 d-flex flex-column gap-1">
                <div className="form-check form-switch mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="checkBalistik"
                    checked={sertakanBalistik}
                    onChange={(e) => setSertakanBalistik(e.target.checked)}
                  />
                  <label
                    className="form-check-label small fw-semibold text-light"
                    htmlFor="checkBalistik"
                  >
                    Sertakan Analisis Balistik
                  </label>
                </div>
                <div className="form-check form-switch mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="checkCatatanAnalisis"
                    checked={sertakanCatatanAnalisis}
                    onChange={(e) => setSertakanCatatanAnalisis(e.target.checked)}
                  />
                  <label
                    className="form-check-label small fw-semibold text-light"
                    htmlFor="checkCatatanAnalisis"
                  >
                    Sertakan Catatan Analisis Taktis
                  </label>
                </div>
                <div className="form-check form-switch mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="checkTTD"
                    checked={sertakanTandaTangan}
                    onChange={(e) => setSertakanTandaTangan(e.target.checked)}
                  />
                  <label
                    className="form-check-label small fw-semibold text-light"
                    htmlFor="checkTTD"
                  >
                    Kolom Tanda Tangan Resmi
                  </label>
                </div>
              </div>
            </div>

            {/* Baris 2: Konfigurasi Pejabat & Petugas Penandatangan Dokumen */}
            {sertakanTandaTangan && (
              <div className="pt-2 mt-2 border-top border-secondary border-opacity-50">
                <div className="row g-2">
                  <div className="col-12 col-md-3">
                    <label className="form-label small fw-semibold mb-1 text-info">
                      <i className="bi bi-person-check me-1"></i> Petugas Pencatat (Nama):
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={namaPenandatangan2}
                      onChange={(e) => setNamaPenandatangan2(e.target.value)}
                      placeholder="Nama Petugas Pencatat"
                    />
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label small fw-semibold mb-1 text-info">
                      <i className="bi bi-shield-check me-1"></i> Pangkat / NRP Pencatat:
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={pangkatNrpPenandatangan2}
                      onChange={(e) => setPangkatNrpPenandatangan2(e.target.value)}
                      placeholder="Pangkat / NRP Pencatat"
                    />
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label small fw-semibold mb-1 text-warning">
                      <i className="bi bi-person-badge me-1"></i> Penanggung Jawab (Nama):
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={namaPenandatangan1}
                      onChange={(e) => setNamaPenandatangan1(e.target.value)}
                      placeholder="Nama Penanggung Jawab"
                    />
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label small fw-semibold mb-1 text-warning">
                      <i className="bi bi-award me-1"></i> Pangkat / NRP Penanggung Jawab:
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={pangkatNrpPenandatangan1}
                      onChange={(e) => setPangkatNrpPenandatangan1(e.target.value)}
                      placeholder="Pangkat / NRP Penanggung Jawab"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Body: Lembar Dokumen Laporan (Pratinjau Kertas A4) */}
          <div
            className="modal-body p-3 p-md-4 bg-secondary-subtle"
            style={{ maxHeight: "72vh", overflowY: "auto" }}
          >
            <DokumenLaporanSesi
              sesi={sesi}
              filterGelombang={filterGelombang}
              sertakanBalistik={sertakanBalistik}
              sertakanCatatanAnalisis={sertakanCatatanAnalisis}
              sertakanTandaTangan={sertakanTandaTangan}
              namaPenandatangan1={namaPenandatangan1}
              pangkatNrpPenandatangan1={pangkatNrpPenandatangan1}
              namaPenandatangan2={namaPenandatangan2}
              pangkatNrpPenandatangan2={pangkatNrpPenandatangan2}
              lokasiPenerbitan={lokasiPenerbitan}
              isPrintMode={false}
            />
          </div>

          {/* Footer Modal (Layar Web - Tidak Tercetak) */}
          <div className="modal-footer border-top py-2 px-3 d-flex justify-content-between align-items-center no-print">
            <div className="small text-muted d-flex align-items-center gap-1">
              <i className="bi bi-info-circle text-primary"></i>
              <span>
                Laporan akan diformat khusus untuk kertas A4 (portrait) tanpa elemen antarmuka web.
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
                <i className="bi bi-printer-fill me-1"></i> Cetak / Simpan PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* 2. DOKUMEN CETAK RESMI (HANYA AKTIF SAAT CETAK @media print, DIMULAI DARI PALING ATAS HALAMAN A4) */}
      <div id="sitrak-print-area" className="d-none d-print-block">
        <DokumenLaporanSesi
          sesi={sesi}
          filterGelombang={filterGelombang}
          sertakanBalistik={sertakanBalistik}
          sertakanCatatanAnalisis={sertakanCatatanAnalisis}
          sertakanTandaTangan={sertakanTandaTangan}
          namaPenandatangan1={namaPenandatangan1}
          pangkatNrpPenandatangan1={pangkatNrpPenandatangan1}
          namaPenandatangan2={namaPenandatangan2}
          pangkatNrpPenandatangan2={pangkatNrpPenandatangan2}
          lokasiPenerbitan={lokasiPenerbitan}
          isPrintMode={true}
        />
      </div>
    </>
  );
};
