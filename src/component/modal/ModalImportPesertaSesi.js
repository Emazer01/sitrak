import React, { useState, useRef } from "react";
import {
  downloadTemplatePesertaExcel,
  readExcelFileToPeserta,
  matchPesertaWithDatabase,
  processImportPesertaSesi,
} from "../../services/importPesertaService";

/**
 * ModalImportPesertaSesi
 * Modal interaktif untuk mengunggah berkas Excel peserta sesi latihan menembak.
 * Fitur:
 * - Unduh template Excel peserta resmi SITRAK
 * - Unggah berkas .xlsx, .xls, .csv via file picker atau drag-and-drop
 * - Identifikasi peserta berbasis NRP:
 *   * Jika NRP sudah ada di database -> Tidak dimasukkan ulang, langsung otomatis dipilih.
 *   * Jika NRP belum ada di database -> Otomatis disimpan ke database sebagai personel baru & dipilih.
 * - Pratinjau status identifikasi sebelum disimpan.
 */
export const ModalImportPesertaSesi = ({
  show = false,
  onHide,
  masterPersonel = [],
  currentSelectedIds = [],
  onImportSuccess,
}) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [matchedData, setMatchedData] = useState({
    matchedExisting: [],
    unmatchedNew: [],
    invalidRows: [],
    allRows: [],
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef(null);

  if (!show) return null;

  // 1. Unduh Template Excel
  const handleDownloadTemplate = () => {
    try {
      downloadTemplatePesertaExcel();
    } catch (err) {
      setErrorMessage(err.message || "Gagal mengunduh template Excel.");
    }
  };

  // 2. Parse file Excel yang diunggah
  const handleProcessFile = async (uploadedFile) => {
    if (!uploadedFile) return;

    setErrorMessage("");
    setFile(uploadedFile);
    setFileName(uploadedFile.name);
    setIsProcessing(true);

    try {
      const rows = await readExcelFileToPeserta(uploadedFile);
      setParsedRows(rows);

      // Cocokkan NRP dengan master data di database
      const matched = matchPesertaWithDatabase(rows, masterPersonel);
      setMatchedData(matched);
    } catch (err) {
      console.error("Gagal memproses file Excel:", err);
      setErrorMessage(err.message || "Gagal membaca format berkas Excel.");
      setParsedRows([]);
      setMatchedData({
        matchedExisting: [],
        unmatchedNew: [],
        invalidRows: [],
        allRows: [],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileName("");
    setParsedRows([]);
    setMatchedData({
      matchedExisting: [],
      unmatchedNew: [],
      invalidRows: [],
      allRows: [],
    });
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 3. Konfirmasi & Sinkronisasi Peserta ke Database & Sesi
  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) {
      alert("Silakan pilih berkas Excel terlebih dahulu.");
      return;
    }

    const validCount =
      matchedData.matchedExisting.length + matchedData.unmatchedNew.length;
    if (validCount === 0) {
      alert("Tidak ada baris data peserta yang valid dalam berkas.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const result = await processImportPesertaSesi({
        parsedRows,
        currentMasterPersonel: masterPersonel,
        existingSelectedIds: currentSelectedIds,
      });

      if (onImportSuccess) {
        onImportSuccess(result);
      }
      onHide();
    } catch (err) {
      console.error("Gagal sinkronisasi peserta:", err);
      setErrorMessage(
        err.message ||
          "Terjadi kesalahan saat menyimpan data peserta baru ke database."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const alreadyCount = matchedData.matchedExisting.length;
  const newCount = matchedData.unmatchedNew.length;
  const invalidCount = matchedData.invalidRows.length;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        zIndex: 1060,
        backdropFilter: "blur(4px)",
        padding: "1rem",
      }}
    >
      <div
        className="card border-0 shadow-lg text-body bg-body rounded-3 overflow-hidden d-flex flex-column"
        style={{
          width: "100%",
          maxWidth: "860px",
          maxHeight: "92vh",
        }}
      >
        {/* Header Modal */}
        <div className="card-header bg-dark text-white p-3 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-success p-2">
              <i className="bi bi-file-earmark-spreadsheet-fill fs-5"></i>
            </span>
            <div>
              <h5 className="mb-0 fw-bold">Import Peserta Latihan dari Excel</h5>
              <small className="text-white-50">
                Otomatis sinkronisasi database: peserta lama dipilih, peserta baru ditambahkan
              </small>
            </div>
          </div>
          <button
            type="button"
            className="btn-close btn-close-white"
            onClick={onHide}
            disabled={isProcessing}
            aria-label="Tutup"
          ></button>
        </div>

        {/* Body Modal */}
        <div className="card-body p-3 p-md-4 overflow-y-auto">
          {/* Tombol Unduh Template Excel */}
          <div className="alert alert-primary-subtle border border-primary d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 p-3 mb-3 rounded-2">
            <div>
              <div className="fw-bold text-primary d-flex align-items-center gap-2">
                <i className="bi bi-file-earmark-arrow-down-fill fs-5"></i>
                Template File Excel Peserta
              </div>
              <small className="text-secondary">
                Gunakan template standar SITRAK dengan kolom <strong>NRP</strong>, <strong>Nama Lengkap</strong>, dan <strong>Satuan</strong>.
              </small>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm px-3 text-nowrap d-inline-flex align-items-center gap-1 shadow-sm"
              onClick={handleDownloadTemplate}
            >
              <i className="bi bi-download"></i> Unduh Template Excel
            </button>
          </div>

          {/* Area Drag & Drop / Pilih File */}
          {!file ? (
            <div
              className={`p-4 border-2 border-dashed rounded-3 text-center cursor-pointer transition ${
                isDragging
                  ? "border-primary bg-primary-subtle"
                  : "border-secondary-subtle bg-body-tertiary"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{ cursor: "pointer" }}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="d-none"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
              />
              <div className="fs-1 text-primary mb-2">
                <i className="bi bi-cloud-arrow-up-fill"></i>
              </div>
              <h6 className="fw-bold mb-1">Pilih atau Drag & Drop Berkas Excel di Sini</h6>
              <p className="text-secondary small mb-2">
                Mendukung format <strong>.xlsx</strong>, <strong>.xls</strong>, atau <strong>.csv</strong>
              </p>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm px-3"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current && fileInputRef.current.click();
                }}
              >
                <i className="bi bi-folder2-open me-1"></i> Jelajahi Komputer
              </button>
            </div>
          ) : (
            <div className="card border p-3 mb-3 bg-body-tertiary">
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-3">
                  <div className="fs-2 text-success">
                    <i className="bi bi-file-earmark-excel-fill"></i>
                  </div>
                  <div>
                    <div className="fw-bold text-dark text-truncate" style={{ maxWidth: "450px" }}>
                      {fileName}
                    </div>
                    <small className="text-secondary">
                      Terbaca: <strong>{parsedRows.length} baris</strong>
                    </small>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={handleReset}
                    disabled={isProcessing}
                  >
                    <i className="bi bi-arrow-repeat me-1"></i> Ganti File
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Alert Error jika ada */}
          {errorMessage && (
            <div className="alert alert-danger d-flex align-items-center gap-2 mt-3 p-2 small" role="alert">
              <i className="bi bi-exclamation-triangle-fill fs-5"></i>
              <div>{errorMessage}</div>
            </div>
          )}

          {/* Pratinjau Tabel Peserta & Status Identifikasi Database */}
          {parsedRows.length > 0 && (
            <div className="mt-3">
              {/* Ringkasan Status Identifikasi */}
              <div className="row g-2 mb-3">
                <div className="col-12 col-sm-4">
                  <div className="p-2 rounded border bg-info-subtle border-info text-info small d-flex align-items-center justify-content-between">
                    <span>
                      <i className="bi bi-person-check-fill me-1"></i> Sudah di Database
                    </span>
                    <strong className="fs-6">{alreadyCount}</strong>
                  </div>
                </div>
                <div className="col-12 col-sm-4">
                  <div className="p-2 rounded border bg-success-subtle border-success text-success small d-flex align-items-center justify-content-between">
                    <span>
                      <i className="bi bi-person-plus-fill me-1"></i> Peserta Baru
                    </span>
                    <strong className="fs-6">{newCount}</strong>
                  </div>
                </div>
                <div className="col-12 col-sm-4">
                  <div className="p-2 rounded border bg-body-tertiary small d-flex align-items-center justify-content-between">
                    <span>
                      <i className="bi bi-people-fill me-1 text-primary"></i> Total Dipilih
                    </span>
                    <strong className="fs-6 text-primary">{alreadyCount + newCount}</strong>
                  </div>
                </div>
              </div>

              {/* Tabel Pratinjau Baris */}
              <div className="table-responsive border rounded-2" style={{ maxHeight: "260px" }}>
                <table className="table table-hover table-sm align-middle mb-0" style={{ fontSize: "12.5px" }}>
                  <thead className="table-light sticky-top">
                    <tr>
                      <th style={{ width: "40px" }} className="text-center">#</th>
                      <th style={{ width: "130px" }}>NRP</th>
                      <th>Nama Lengkap</th>
                      <th>Satuan</th>
                      <th style={{ minWidth: "220px" }}>Status Sinkronisasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchedData.allRows.map((r, idx) => {
                      let badgeClass = "bg-secondary-subtle text-secondary border";
                      let iconClass = "bi-dash-circle";

                      if (r.dbStatus === "already_in_db") {
                        badgeClass = "bg-info-subtle text-info border border-info";
                        iconClass = "bi-check-circle-fill";
                      } else if (r.dbStatus === "new_to_db") {
                        badgeClass = "bg-success-subtle text-success border border-success";
                        iconClass = "bi-plus-circle-fill";
                      } else if (r.dbStatus === "invalid") {
                        badgeClass = "bg-danger-subtle text-danger border border-danger";
                        iconClass = "bi-x-circle-fill";
                      }

                      return (
                        <tr key={idx}>
                          <td className="text-center text-secondary">{idx + 1}</td>
                          <td>
                            <span className="font-monospace fw-semibold text-primary">
                              {r.nrp || "-"}
                            </span>
                          </td>
                          <td className="fw-semibold text-dark">{r.nama || "-"}</td>
                          <td className="text-secondary">{r.satuan || "-"}</td>
                          <td>
                            <span className={`badge px-2 py-1 ${badgeClass} d-inline-flex align-items-center gap-1`}>
                              <i className={`bi ${iconClass}`}></i>
                              {r.dbStatusLabel}
                            </span>
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

        {/* Footer Modal */}
        <div className="card-footer bg-body-tertiary p-3 d-flex justify-content-between align-items-center">
          <button
            type="button"
            className="btn btn-secondary btn-sm px-3"
            onClick={onHide}
            disabled={isProcessing}
          >
            Batal
          </button>
          <button
            type="button"
            className="btn btn-success btn-sm px-4 fw-semibold shadow-sm d-inline-flex align-items-center gap-2"
            onClick={handleConfirmImport}
            disabled={isProcessing || parsedRows.length === 0 || alreadyCount + newCount === 0}
          >
            {isProcessing ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Menyimpan Peserta...
              </>
            ) : (
              <>
                <i className="bi bi-check2-circle fs-6"></i>
                Terapkan & Pilih {alreadyCount + newCount} Peserta ke Sesi
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

