import * as XLSX from "xlsx";
import axios from "axios";
import { getBackendUrl } from "./apiConfig";

/**
 * Normalisasi format NRP untuk perbandingan akurat (case-insensitive & whitespace trimmed)
 * @param {string|number} nrp
 * @returns {string}
 */
export const normalizeNrp = (nrp) => {
  if (nrp === null || nrp === undefined) return "";
  return String(nrp).trim().toLowerCase();
};

/**
 * Mengunduh Template File Excel Resmi Peserta Latihan Menembak SITRAK (.xlsx)
 */
export const downloadTemplatePesertaExcel = () => {
  try {
    const templateData = [
      {
        NRP: "524250",
        "Nama Lengkap": "Kolonel Lek Kurniawan S., A.Md.",
        Satuan: "Kohanudnas",
      },
      {
        NRP: "13483/P",
        "Nama Lengkap": "Kolonel Laut (S) Mufidin, S.T.",
        Satuan: "Koarmada I",
      },
      {
        NRP: "11030036360882",
        "Nama Lengkap": "Letkol Inf Tommy Firmansyah",
        Satuan: "Kopassus",
      },
      {
        NRP: "21930146990972",
        "Nama Lengkap": "Mayor Cpl (K) Indri Susilowati",
        Satuan: "Puspalad",
      },
      {
        NRP: "11080087540680",
        "Nama Lengkap": "Mayor Cku Gde Kemal Surya",
        Satuan: "Ditkuad",
      },
      {
        NRP: "15424/P",
        "Nama Lengkap": "Letkol Laut (P) Wahyu Hidayat",
        Satuan: "Kormar",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);

    // Format lebar kolom terstandar
    ws["!cols"] = [
      { wch: 22 }, // NRP
      { wch: 38 }, // Nama Lengkap
      { wch: 24 }, // Satuan
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Peserta Latihan");
    XLSX.writeFile(wb, "Template_Peserta_Latihan_Menembak_SITRAK.xlsx");
    return true;
  } catch (err) {
    console.error("Gagal mengunduh template Excel peserta:", err);
    throw new Error("Gagal mengunduh template Excel. Silakan coba kembali.");
  }
};

/**
 * Parsing data mentah baris JSON dari lembar Excel menjadi struktur peserta terstandar
 * @param {Array<Object>} rawJson
 * @returns {Array<Object>}
 */
export const parsePesertaFromSheetData = (rawJson = []) => {
  if (!Array.isArray(rawJson) || rawJson.length === 0) {
    return [];
  }

  const seenNrp = new Set();
  const result = [];

  rawJson.forEach((row, index) => {
    let nrpVal = "";
    let namaVal = "";
    let satuanVal = "";

    // Deteksi nama kolom secara fleksibel & case-insensitive
    Object.keys(row || {}).forEach((key) => {
      const cleanKey = key.trim().toLowerCase();
      const val = String(row[key] ?? "").trim();

      if (
        cleanKey === "nrp" ||
        cleanKey.includes("nrp") ||
        cleanKey === "nip" ||
        cleanKey.includes("no registrasi") ||
        cleanKey.includes("nomor registrasi")
      ) {
        if (!nrpVal) nrpVal = val;
      } else if (
        cleanKey.includes("nama") ||
        cleanKey === "name" ||
        cleanKey.includes("prajurit") ||
        cleanKey.includes("personel") ||
        cleanKey.includes("peserta") ||
        cleanKey.includes("penembak")
      ) {
        if (!namaVal) namaVal = val;
      } else if (
        cleanKey.includes("satuan") ||
        cleanKey.includes("unit") ||
        cleanKey.includes("kesatuan") ||
        cleanKey.includes("korps") ||
        cleanKey.includes("batalyon")
      ) {
        if (!satuanVal) satuanVal = val;
      }
    });

    const normNrp = normalizeNrp(nrpVal);

    let status = "valid";
    let errorNote = "";

    if (!nrpVal && !namaVal) {
      status = "invalid";
      errorNote = "NRP dan Nama kosong";
    } else if (!nrpVal) {
      status = "invalid";
      errorNote = "NRP wajib diisi";
    } else if (!namaVal) {
      status = "invalid";
      errorNote = "Nama lengkap wajib diisi";
    } else if (seenNrp.has(normNrp)) {
      status = "duplicate_in_file";
      errorNote = "NRP duplikat di file (diabaikan)";
    }

    if (normNrp) {
      seenNrp.add(normNrp);
    }

    result.push({
      rowNumber: index + 2, // Baris pada Excel (baris 1 = header)
      nrp: nrpVal,
      nama: namaVal,
      satuan: satuanVal || "-",
      normalizedNrp: normNrp,
      status,
      errorNote,
    });
  });

  return result;
};

/**
 * Membaca berkas File/Blob Excel dan menghasilkan daftar baris parsed
 * @param {File|Blob} file
 * @returns {Promise<Array<Object>>}
 */
export const readExcelFileToPeserta = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("Berkas file belum dipilih."));
    }

    const reader = new FileReader();
    reader.onerror = (err) => reject(new Error("Gagal membaca file: " + err.message));
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const workbook = XLSX.read(buffer, { type: "array" });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          return reject(new Error("File Excel tidak memiliki lembar kerja (sheet)."));
        }

        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!rawJson || rawJson.length === 0) {
          return reject(
            new Error("File Excel kosong atau tidak memiliki data di bawah baris judul.")
          );
        }

        const parsed = parsePesertaFromSheetData(rawJson);
        resolve(parsed);
      } catch (err) {
        reject(new Error("Gagal membaca format file Excel: " + err.message));
      }
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * Mencocokkan daftar peserta dari file Excel dengan Master Data Personel di Database.
 * - Jika NRP sudah ada di database: TIDAK dimasukkan ulang ke database, cukup ditandai untuk dipilih.
 * - Jika NRP belum ada di database: Ditandai sebagai peserta baru yang harus ditambahkan ke database.
 *
 * @param {Array<Object>} parsedRows
 * @param {Array<Object>} masterPersonel
 * @returns {{ matchedExisting: Array, unmatchedNew: Array, invalidRows: Array, allRows: Array }}
 */
export const matchPesertaWithDatabase = (parsedRows = [], masterPersonel = []) => {
  // Buat lookup map dari master personel berbasis normalized NRP
  const masterMap = new Map();
  masterPersonel.forEach((p) => {
    const norm = normalizeNrp(p.nrp);
    if (norm) {
      masterMap.set(norm, p);
    }
  });

  const matchedExisting = [];
  const unmatchedNew = [];
  const invalidRows = [];
  const allRows = [];

  parsedRows.forEach((row) => {
    if (row.status === "invalid" || row.status === "duplicate_in_file") {
      invalidRows.push(row);
      allRows.push({
        ...row,
        existsInDb: false,
        dbStatus: "invalid",
        dbStatusLabel: row.errorNote,
      });
      return;
    }

    const norm = row.normalizedNrp;
    if (masterMap.has(norm)) {
      // SUDAH ADA DI DATABASE: Jangan di-insert ulang!
      const existingPersonel = masterMap.get(norm);
      const enriched = {
        ...row,
        existsInDb: true,
        existingId: existingPersonel.id || existingPersonel.id_personel_penembak,
        existingPersonel,
        dbStatus: "already_in_db",
        dbStatusLabel: "Sudah Ada di Database (Hanya Dipilih)",
      };
      matchedExisting.push(enriched);
      allRows.push(enriched);
    } else {
      // BELUM ADA DI DATABASE: Tambahkan ke database!
      const enriched = {
        ...row,
        existsInDb: false,
        dbStatus: "new_to_db",
        dbStatusLabel: "Peserta Baru (Akan Ditambahkan ke Database)",
      };
      unmatchedNew.push(enriched);
      allRows.push(enriched);
    }
  });

  return {
    matchedExisting,
    unmatchedNew,
    invalidRows,
    allRows,
  };
};

/**
 * Menyimpan hanya peserta baru (unmatchedNew) ke database melalui API backend
 * Menggunakan POST /personel/bulk jika tersedia, dengan fallback ke POST /personel
 *
 * @param {Object} params
 * @param {Array<Object>} params.unmatchedNew - Peserta baru yang belum ada di DB
 * @param {string} [params.backendUrl] - URL Backend
 * @param {string} [params.token] - Access Token
 * @param {Function} [params.axiosClient] - Mock / Custom axios client untuk testing
 * @returns {Promise<{ insertedPersonel: Array<Object>, failedRows: Array<Object> }>}
 */
export const insertNewPesertaToDatabase = async ({
  unmatchedNew = [],
  backendUrl = null,
  token = null,
  axiosClient = null,
}) => {
  if (!unmatchedNew || unmatchedNew.length === 0) {
    return { insertedPersonel: [], failedRows: [] };
  }

  const client = axiosClient || axios;
  const baseUrl = (backendUrl || getBackendUrl() || "").replace(/\/+$/, "");
  const authToken = token || (typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null);

  const headers = {
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };

  const insertedPersonel = [];
  const failedRows = [];

  // Coba bulk insert terlebih dahulu
  try {
    const bulkPayload = unmatchedNew.map((r) => ({
      nrp: r.nrp,
      nama_personel_penembak: r.nama,
      satuan: r.satuan || "-",
    }));

    const bulkRes = await client.post(`${baseUrl}/personel/bulk`, bulkPayload, { headers });

    if (bulkRes.status === 200 || bulkRes.status === 201) {
      const resData = bulkRes.data;
      let returnedItems = [];

      if (Array.isArray(resData)) {
        returnedItems = resData;
      } else if (resData && Array.isArray(resData.data)) {
        returnedItems = resData.data;
      } else if (resData && Array.isArray(resData.personel)) {
        returnedItems = resData.personel;
      }

      unmatchedNew.forEach((item, idx) => {
        const returned = returnedItems[idx] || {};
        const newId =
          returned.id_personel_penembak ||
          returned.id ||
          Date.now() + idx;

        insertedPersonel.push({
          id: newId,
          id_personel_penembak: newId,
          nrp: item.nrp,
          nama: item.nama,
          nama_personel_penembak: item.nama,
          satuan: item.satuan || "-",
          pangkat: (item.nama || "").split(" ")[0] || "",
        });
      });

      return { insertedPersonel, failedRows: [] };
    }
  } catch (bulkErr) {
    // Jika endpoint /personel/bulk 404 atau tidak didukung, fallback ke /personel satuan
    console.warn("Bulk insert gagal, mencoba fallback single insert /personel:", bulkErr.message);
  }

  // Fallback: Kirim satu per satu ke POST /personel
  for (let i = 0; i < unmatchedNew.length; i++) {
    const item = unmatchedNew[i];
    try {
      const singlePayload = {
        nrp: item.nrp,
        nama_personel_penembak: item.nama,
        satuan: item.satuan || "-",
      };

      const singleRes = await client.post(`${baseUrl}/personel`, singlePayload, { headers });
      const resData = singleRes.data || {};
      const newId =
        resData.id_personel_penembak ||
        resData.id ||
        resData.data?.id_personel_penembak ||
        resData.data?.id ||
        Date.now() + i;

      insertedPersonel.push({
        id: newId,
        id_personel_penembak: newId,
        nrp: item.nrp,
        nama: item.nama,
        nama_personel_penembak: item.nama,
        satuan: item.satuan || "-",
        pangkat: (item.nama || "").split(" ")[0] || "",
      });
    } catch (err) {
      console.error(`Gagal insert personel NRP ${item.nrp}:`, err.message);
      failedRows.push({
        ...item,
        error: err.response?.data?.message || err.message,
      });
    }
  }

  return { insertedPersonel, failedRows };
};

/**
 * Memproses sinkronisasi keseluruhan dan menghasilkan daftar ID terpilih untuk sesi latihan
 *
 * @param {Object} params
 * @param {Array<Object>} params.parsedRows - Baris parsed dari Excel
 * @param {Array<Object>} params.currentMasterPersonel - Daftar master personel aktif
 * @param {Array<string|number>} [params.existingSelectedIds] - ID yang sebelumnya sudah dicentang
 * @param {string} [params.backendUrl]
 * @param {string} [params.token]
 * @param {Function} [params.axiosClient]
 * @returns {Promise<{ updatedMasterPersonel: Array, newSelectedPersonelIds: Array, summary: Object }>}
 */
export const processImportPesertaSesi = async ({
  parsedRows = [],
  currentMasterPersonel = [],
  existingSelectedIds = [],
  backendUrl = null,
  token = null,
  axiosClient = null,
}) => {
  // 1. Kategorikan peserta berdasarkan keberadaan NRP di database
  const { matchedExisting, unmatchedNew, invalidRows } = matchPesertaWithDatabase(
    parsedRows,
    currentMasterPersonel
  );

  // 2. Insert HANYA peserta baru ke database (peserta lama TIDAK di-insert ulang)
  const { insertedPersonel, failedRows } = await insertNewPesertaToDatabase({
    unmatchedNew,
    backendUrl,
    token,
    axiosClient,
  });

  // 3. Gabungkan master personel dengan peserta baru yang berhasil disimpan
  const updatedMasterPersonel = [...currentMasterPersonel, ...insertedPersonel];

  // 4. Kumpulkan ID peserta dari file Excel untuk otomatis dipilih di sesi latihan
  // Ambil ID peserta yang sudah ada di database
  const existingIds = matchedExisting
    .map((r) => r.existingId)
    .filter((id) => id !== null && id !== undefined);

  // Ambil ID peserta baru yang berhasil di-insert
  const newInsertedIds = insertedPersonel
    .map((p) => p.id || p.id_personel_penembak)
    .filter((id) => id !== null && id !== undefined);

  // Satukan seluruh ID peserta yang diimpor dari Excel (ditambah pilihan sebelumnya)
  const selectedSet = new Set([
    ...existingSelectedIds,
    ...existingIds,
    ...newInsertedIds,
  ]);
  const newSelectedPersonelIds = Array.from(selectedSet);

  const summary = {
    totalExcelRows: parsedRows.length,
    validRowsCount: matchedExisting.length + unmatchedNew.length,
    alreadyInDbCount: matchedExisting.length,
    newInsertedCount: insertedPersonel.length,
    failedCount: failedRows.length,
    invalidCount: invalidRows.length,
    message: `Berhasil memproses ${matchedExisting.length + insertedPersonel.length} peserta: ${
      matchedExisting.length
    } peserta sudah terdaftar di database & ${
      insertedPersonel.length
    } peserta baru ditambahkan ke database.`,
  };

  return {
    updatedMasterPersonel,
    newSelectedPersonelIds,
    matchedExisting,
    insertedPersonel,
    failedRows,
    summary,
  };
};

