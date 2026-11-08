import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import { getBackendUrl } from "../../services/apiConfig";

/**
 * ModalImportExcelPersonel
 * Modal interaktif untuk bulk insert data personel penembak dari file Excel (.xlsx, .xls) atau CSV.
 * Fitur:
 * - Unduh template Excel terstandar
 * - Drag & drop / browse file Excel
 * - Auto-detect header kolom (NRP, Nama Lengkap, Satuan)
 * - Validasi data riil sebelum dikirim (cek kekosongan & duplikasi)
 * - Pratinjau tabel interaktif
 * - Pengiriman batch ke API backend POST /personel/bulk
 */
export const ModalImportExcelPersonel = ({
  show = false,
  onHide,
  onImportSuccess,
}) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef(null);

  if (!show) return null;

  // 1. Unduh Template Excel Resmi SITRAK
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        {
          "NRP": "219800112",
          "Nama Lengkap": "Lettu Inf. Pratama",
          "Satuan": "Batalyon A",
        },
        {
          "NRP": "219900234",
          "Nama Lengkap": "Serda Budi Santoso",
          "Satuan": "Batalyon B",
        },
        {
          "NRP": "219900567",
          "Nama Lengkap": "Praka Dimas Setiawan",
          "Satuan": "Batalyon A",
        },
        {
          "NRP": "220100889",
          "Nama Lengkap": "Sertu Agus Haryanto",
          "Satuan": "Batalyon C",
        },
        {
          "NRP": "220200101",
          "Nama Lengkap": "Koptu Hendra Gunawan",
          "Satuan": "Kogabwilhan I",
        },
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);

      // Lebar kolom otomatis agar rapi
      ws["!cols"] = [
        { wch: 18 }, // NRP
        { wch: 32 }, // Nama Lengkap
        { wch: 24 }, // Satuan
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Master Personel");
      XLSX.writeFile(wb, "Template_Import_Personel_SITRAK.xlsx");
    } catch (err) {
      console.error("Gagal mengunduh template Excel:", err);
      alert("Gagal mengunduh template. Silakan coba lagi.");
    }
  };

  // 2. Deteksi Kolom & Parse File Excel
  const processExcelFile = (uploadedFile) => {
    if (!uploadedFile) return;

    setErrorMessage("");
    setImportSummary(null);
    setFileName(uploadedFile.name);
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const workbook = XLSX.read(buffer, { type: "array" });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          setErrorMessage("File Excel tidak memiliki lembar kerja (sheet).");
          return;
        }

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJson = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

        if (!rawJson || rawJson.length === 0) {
          setErrorMessage(
            "File Excel kosong atau tidak memiliki baris data di bawah judul kolom."
          );
          setParsedRows([]);
          return;
        }

        // Peta header fleksibel (case-insensitive & variasi nama kolom umum)
        const nrpSeen = new Set();
        const processed = rawJson.map((row, index) => {
          let nrpVal = "";
          let namaVal = "";
          let satuanVal = "";

          // Cari kolom NRP, Nama, Satuan dari keys row
          Object.keys(row).forEach((key) => {
            const cleanKey = key.trim().toLowerCase();
            const val = String(row[key] || "").trim();

            if (
              cleanKey === "nrp" ||
              cleanKey.includes("nrp") ||
              cleanKey === "nip" ||
              cleanKey.includes("no registrasi")
            ) {
              if (!nrpVal) nrpVal = val;
            } else if (
              cleanKey.includes("nama") ||
              cleanKey === "name" ||
              cleanKey.includes("prajurit") ||
              cleanKey.includes("personel")
            ) {
              if (!namaVal) namaVal = val;
            } else if (
              cleanKey.includes("satuan") ||
              cleanKey.includes("unit") ||
              cleanKey === "korps" ||
              cleanKey === "batalyon"
            ) {
              if (!satuanVal) satuanVal = val;
            }
          });

          // Validasi kelengkapan baris
          let status = "valid";
          let statusNote = "Siap Diimpor";

          if (!nrpVal && !namaVal) {
            status = "invalid";
            statusNote = "NRP & Nama Kosong";
          } else if (!nrpVal) {
            status = "invalid";
            statusNote = "NRP Kosong";
          } else if (!namaVal) {
            status = "invalid";
            statusNote = "Nama Kosong";
          } else if (nrpSeen.has(nrpVal)) {
            status = "duplicate_file";
            statusNote = "Duplikat di File (Akan Ditimpa)";
          }

          if (nrpVal) {
            nrpSeen.add(nrpVal);
          }

          return {
            id: index + 1,
            nrp: nrpVal,
            nama: namaVal,
            satuan: satuanVal || "-",
            status,
            statusNote,
          };
        });

        setParsedRows(processed);
      } catch (err) {
        console.error("Gagal membaca file Excel:", err);
        setErrorMessage(
          "Gagal membaca format file Excel. Pastikan file valid (.xlsx, .xls, .csv)."
        );
        setParsedRows([]);
      }
    };

    reader.onerror = () => {
      setErrorMessage("Terjadi kesalahan saat membaca file.");
    };

    reader.readAsArrayBuffer(uploadedFile);
  };

  // 3. Event Drag & Drop
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
      processExcelFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processExcelFile(e.target.files[0]);
    }
  };

  // 4. Hapus Baris Tertentu dari Pratinjau
  const handleRemoveRow = (rowId) => {
    setParsedRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  // 5. Reset File
  const handleReset = () => {
    setFile(null);
    setFileName("");
    setParsedRows([]);
    setErrorMessage("");
    setImportSummary(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 6. Submit Data ke Backend (POST /personel/bulk)
  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.status !== "invalid");
    if (validRows.length === 0) {
      alert("Tidak ada baris data valid untuk diimpor.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const payload = validRows.map((r) => ({
        nrp: r.nrp,
        nama_personel_penembak: r.nama,
        satuan: r.satuan,
      }));

      const response = await axios.post(
        `${getBackendUrl()}/personel/bulk`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        const resData = response.data;
        setImportSummary(resData);
        if (onImportSuccess) {
          onImportSuccess(
            resData.message ||
              `Berhasil mengimpor ${validRows.length} data personel ke database.`
          );
        }
      }
    } catch (err) {
      console.error("Gagal melakukan bulk import:", err);
      setErrorMessage(
        err.response?.data?.message ||
          (typeof err.response?.data === "string" ? err.response.data : "") ||
          "Gagal mengirim data ke backend. Pastikan server backend sedang aktif."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.status !== "invalid").length;
  const invalidCount = parsedRows.filter((r) => r.status === "invalid").length;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        zIndex: 1055,
        backdropFilter: "blur(3px)",
        overflowY: "auto",
        padding: "1rem",
      }}
    >
      <div
        className="card border-0 shadow-lg font-poppins"
        style={{
          maxWidth: "850px",
          width: "100%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header Modal */}
        <div className="card-header bg-dark text-white d-flex align-items-center justify-content-between p-3 border-0">
          <div className="d-flex align-items-center gap-2">
            <span className="p-2 bg-success rounded-circle d-flex align-items-center justify-content-center text-white">
              <i className="bi bi-file-earmark-excel-fill fs-5"></i>
            </span>
            <div>
              <h5 className="fw-bold mb-0 text-white">
                Import Data Personel dari File Excel
              </h5>
              <small className="text-secondary">
                Unggah berkas .xlsx, .xls, atau .csv untuk bulk insert data personel ke database
              </small>
            </div>
          </div>
          <button
            type="button"
            className="btn-close btn-close-white"
            onClick={onHide}
            disabled={isSubmitting}
            aria-label="Tutup"
          ></button>
        </div>

        {/* Body Modal */}
        <div className="card-body p-3 p-md-4 overflow-y-auto" style={{ flex: 1 }}>
          {/* Pesan Sukses / Ringkasan Import */}
          {importSummary && (
            <div className="alert alert-success border border-success p-3 mb-4 rounded-3 shadow-sm">
              <div className="d-flex align-items-center gap-2 mb-2">
                <i className="bi bi-check-circle-fill fs-4 text-success"></i>
                <h6 className="fw-bold mb-0 text-success">
                  {importSummary.message || "Proses Bulk Insert Berhasil Diselesaikan!"}
                </h6>
              </div>
              <div className="row g-2 text-center mt-2">
                <div className="col-4">
                  <div className="p-2 bg-white rounded border">
                    <span className="small text-muted d-block">Total Diproses</span>
                    <strong className="fs-5 text-dark">
                      {importSummary.total_processed || 0}
                    </strong>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 bg-white rounded border">
                    <span className="small text-muted d-block">Baru Ditambahkan</span>
                    <strong className="fs-5 text-success">
                      +{importSummary.total_inserted || 0}
                    </strong>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 bg-white rounded border">
                    <span className="small text-muted d-block">Data Diperbarui</span>
                    <strong className="fs-5 text-primary">
                      {importSummary.total_updated || 0}
                    </strong>
                  </div>
                </div>
              </div>

              {importSummary.failed && importSummary.failed.length > 0 && (
                <div className="mt-3">
                  <span className="small fw-semibold text-danger d-block mb-1">
                    Gagal diproses ({importSummary.failed.length} baris):
                  </span>
                  <ul className="small text-danger mb-0 ps-3">
                    {importSummary.failed.map((f, i) => (
                      <li key={i}>
                        Baris {f.baris} (NRP: {f.nrp}): {f.alasan}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-3 text-end">
                <button
                  type="button"
                  className="btn btn-sm btn-success px-4"
                  onClick={onHide}
                >
                  <i className="bi bi-check-lg me-1"></i> Selesai
                </button>
              </div>
            </div>
          )}

          {/* Pesan Error */}
          {errorMessage && (
            <div className="alert alert-danger d-flex align-items-center gap-2 mb-3">
              <i className="bi bi-exclamation-triangle-fill fs-5"></i>
              <div>{errorMessage}</div>
            </div>
          )}

          {!importSummary && (
            <>
              {/* Box Unduh Template */}
              <div className="card border bg-light p-3 mb-3 rounded-3">
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
                  <div>
                    <h6 className="fw-bold mb-1 text-dark">
                      <i className="bi bi-info-circle-fill text-primary me-2"></i>
                      Format Kolom File Excel
                    </h6>
                    <small className="text-secondary d-block">
                      Gunakan format kolom: <strong>NRP</strong>, <strong>Nama Lengkap</strong>, dan <strong>Satuan</strong>.
                    </small>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm text-nowrap d-flex align-items-center gap-1 shadow-sm"
                    onClick={handleDownloadTemplate}
                    title="Unduh contoh template excel terstandarisasi"
                  >
                    <i className="bi bi-download"></i>
                    <span>Unduh Template (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Area Upload File (Dropzone) */}
              {!file ? (
                <div
                  className={`border border-2 rounded-3 text-center p-4 transition-all ${
                    isDragging
                      ? "border-success bg-success-subtle"
                      : "border-dashed bg-body-tertiary"
                  }`}
                  style={{
                    borderStyle: "dashed",
                    cursor: "pointer",
                    minHeight: "160px",
                  }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="d-none"
                    onChange={handleFileChange}
                  />
                  <div className="mb-2">
                    <i className="bi bi-cloud-arrow-up-fill text-success fs-1"></i>
                  </div>
                  <h6 className="fw-bold mb-1 text-dark">
                    Tarik & Lepas File Excel ke Sini
                  </h6>
                  <p className="text-secondary small mb-2">
                    atau klik untuk memilih file dari komputer Anda
                  </p>
                  <span className="badge bg-secondary-subtle text-secondary border">
                    Mendukung .xlsx, .xls, .csv (Maksimal 10 MB)
                  </span>
                </div>
              ) : (
                /* File Terpilih & Pratinjau */
                <div>
                  <div className="d-flex flex-wrap justify-content-between align-items-center bg-body-tertiary p-2 px-3 rounded border mb-3 gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-file-earmark-spreadsheet-fill text-success fs-4"></i>
                      <div>
                        <strong className="text-dark small d-block">
                          {fileName}
                        </strong>
                        <span className="text-muted small">
                          {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} baris terdeteksi
                        </span>
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={handleReset}
                        disabled={isSubmitting}
                      >
                        <i className="bi bi-arrow-repeat me-1"></i> Ganti File
                      </button>
                    </div>
                  </div>

                  {/* Ringkasan Baris Valid / Invalid */}
                  <div className="d-flex gap-2 mb-2 flex-wrap align-items-center">
                    <span className="badge bg-primary px-3 py-2">
                      Total: {parsedRows.length} Baris
                    </span>
                    <span className="badge bg-success px-3 py-2">
                      <i className="bi bi-check-circle me-1"></i>
                      {validCount} Baris Valid
                    </span>
                    {invalidCount > 0 && (
                      <span className="badge bg-danger px-3 py-2">
                        <i className="bi bi-exclamation-octagon me-1"></i>
                        {invalidCount} Baris Tidak Lengkap
                      </span>
                    )}
                  </div>

                  {/* Tabel Pratinjau Data */}
                  <div
                    className="table-responsive border rounded"
                    style={{ maxHeight: "300px", overflowY: "auto" }}
                  >
                    <table className="table table-sm table-hover align-middle mb-0 small">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th style={{ width: "40px" }}>#</th>
                          <th>NRP</th>
                          <th>Nama Lengkap</th>
                          <th>Satuan</th>
                          <th>Status</th>
                          <th className="text-center" style={{ width: "40px" }}>
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.map((row, idx) => (
                          <tr
                            key={row.id}
                            className={
                              row.status === "invalid"
                                ? "table-danger"
                                : row.status === "duplicate_file"
                                ? "table-warning"
                                : ""
                            }
                          >
                            <td className="text-muted">{idx + 1}</td>
                            <td className="fw-bold font-monospace">
                              {row.nrp || (
                                <span className="text-danger italic">
                                  (Kosong)
                                </span>
                              )}
                            </td>
                            <td>
                              {row.nama || (
                                <span className="text-danger italic">
                                  (Kosong)
                                </span>
                              )}
                            </td>
                            <td>{row.satuan}</td>
                            <td>
                              {row.status === "valid" ? (
                                <span className="badge bg-success-subtle text-success border border-success">
                                  Siap Diimpor
                                </span>
                              ) : row.status === "duplicate_file" ? (
                                <span className="badge bg-warning-subtle text-warning-emphasis border border-warning">
                                  Duplikat di File
                                </span>
                              ) : (
                                <span className="badge bg-danger-subtle text-danger border border-danger">
                                  {row.statusNote}
                                </span>
                              )}
                            </td>
                            <td className="text-center">
                              <button
                                type="button"
                                className="btn btn-sm btn-link text-danger p-0"
                                onClick={() => handleRemoveRow(row.id)}
                                title="Hapus baris ini dari daftar impor"
                                disabled={isSubmitting}
                              >
                                <i className="bi bi-x-circle"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {invalidCount > 0 && (
                    <small className="text-danger d-block mt-2">
                      <i className="bi bi-exclamation-triangle-fill me-1"></i>
                      Baris yang ditandai merah (NRP/Nama kosong) akan otomatis dilewati saat proses impor.
                    </small>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Modal */}
        {!importSummary && (
          <div className="card-footer bg-light d-flex justify-content-between align-items-center p-3 border-0">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-3"
              onClick={onHide}
              disabled={isSubmitting}
            >
              Batal
            </button>

            {file && (
              <button
                type="button"
                className="btn btn-success btn-sm px-4 fw-bold d-flex align-items-center gap-2 shadow-sm"
                onClick={handleConfirmImport}
                disabled={isSubmitting || validCount === 0}
              >
                {isSubmitting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    <span>Menyimpan ke Database...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-cloud-arrow-up-fill fs-6"></i>
                    <span>Simpan {validCount} Personel ke Database</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

