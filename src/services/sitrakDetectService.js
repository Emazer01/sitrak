import axios from "axios";
import {
  getDetectApiUrl as getUrlFromConfig,
  hasGeminiApiKey,
  getGeminiModel,
} from "./apiConfig";
import {
  detectTargetViaGemini,
  testGeminiApiKey,
} from "./geminiDetectService";

export { detectTargetViaGemini, testGeminiApiKey };


/**
 * Mendapatkan Base URL sitrak-detect murni dari environment variable (.env)
 * Tidak pernah disimpan atau dibaca dari localStorage
 */
export const getDetectApiUrl = () => {
  return getUrlFromConfig();
};

/**
 * Deprecated / No-op: URL service dikunci sesuai konfigurasi .env
 * dan tidak diperbolehkan disimpan ke localStorage
 */
export const saveDetectApiUrl = () => {
  // sengaja tidak melakukan penyimpanan ke localStorage
};

/**
 * Peta terjemahan directional bias dari Computer Vision ke Bahasa Indonesia
 */
const BIAS_TRANSLATION_MAP = {
  "top-left": "Condong ke Kiri Atas",
  "top-right": "Condong ke Kanan Atas",
  "bottom-left": "Condong ke Kiri Bawah",
  "bottom-right": "Condong ke Kanan Bawah",
  top: "Condong ke Atas",
  bottom: "Condong ke Bawah",
  left: "Condong ke Kiri",
  right: "Condong ke Kanan",
  centered: "Tepat di Tengah (Presisi)",
  centre: "Tepat di Tengah (Presisi)",
};

/**
 * Menghasilkan saran & rekomendasi taktis pelatih berdasarkan analisis balistik
 */
export const generateTacticalAdvice = (biasKey, groupingDiameterMm, accuracy) => {
  const normalizedBias = (biasKey || "").toLowerCase().trim();
  const saranList = [];

  switch (normalizedBias) {
    case "bottom-left":
    case "condong ke kiri bawah":
      saranList.push(
        "Koreksi Penarikan Picu (Trigger Jerking): Tarik pelatuk secara perlahan lurus ke belakang menggunakan ruas pertama jari telunjuk tanpa menyentak."
      );
      saranList.push(
        "Stabilisasi Genggaman: Hindari meremas grip pistol/senapan terlalu kuat saat picu ditekan."
      );
      saranList.push(
        "Pengaturan Napas: Tahan napas pada jeda alami sebelum melepas tembakan."
      );
      break;
    case "bottom-right":
    case "condong ke kanan bawah":
      saranList.push(
        "Koreksi Penekanan Jari (Thumbing): Hindari tekanan ibu jari berlebih pada sisi pegangan saat menekan picu."
      );
      saranList.push(
        "Koreksi Pergelangan Tangan: Kunci pergelangan tangan agar tidak menurun (breaking wrist down) sesaat sebelum tembakan meletus."
      );
      break;
    case "top-left":
    case "condong ke kiri atas":
      saranList.push(
        "Antisipasi Hentakan (Pushing / Recoil Anticipation): Hindari mendorong senjata ke depan atau mengangkat moncong saat menembak."
      );
      saranList.push(
        "Koreksi Pejera (Sight Alignment): Pastikan pejera depan sejajar rata dengan celah pejera belakang."
      );
      break;
    case "top-right":
    case "condong ke kanan atas":
      saranList.push(
        "Koreksi Tumit Telapak Tangan (Heeling): Jangan menekan bagian bawah pegangan ke depan saat hentakan."
      );
      saranList.push(
        "Relaksasi Bahu: Turunkan ketegangan bahu penembak untuk menjaga kestabilan poros bidik."
      );
      break;
    case "left":
    case "condong ke kiri":
      saranList.push(
        "Posisi Jari pada Picu: Masukkan atau keluarkan jari telunjuk sedikit agar tarikan picu benar-benar lurus 90 derajat."
      );
      break;
    case "right":
    case "condong ke kanan":
      saranList.push(
        "Tekanan Jari Kanan: Kurangi tekanan jari tengah, manis, dan kelingking pada rangka senjata."
      );
      break;
    case "top":
    case "condong ke atas":
      saranList.push(
        "Koreksi Pejera: Pejera depan terlalu naik di atas celah pejera belakang, turunkan bidikan pejera."
      );
      break;
    case "bottom":
    case "condong ke bawah":
      saranList.push(
        "Koreksi Menurunkan Moncong: Jangan menundukkan moncong senjata sesaat sebelum meletus."
      );
      break;
    default:
      saranList.push(
        "Pertahankan Ritme & Konsistensi: Titik bidik dan perkenaan sudah stabil di sektor pusat sasaran."
      );
      saranList.push(
        "Tingkatkan kecepatan transisi bidikan dengan tetap menjaga kerapatan grouping."
      );
      break;
  }

  if (groupingDiameterMm > 60) {
    saranList.push(
      "Evaluasi Kerapatan: Sebaran tembakan masih cukup lebar (>60mm). Fokuskan latihan pada penembakan lambat presisi (slow fire)."
    );
  } else if (groupingDiameterMm <= 35) {
    saranList.push(
      "Konsistensi Sangat Baik: Kelompok tembakan sangat rapat, pertahankan posisi penembakan yang sama."
    );
  }

  return saranList;
};

/**
 * Memilih tembakan terbaik jika jumlah tembakan terdeteksi melebihi alokasi peluru babak.
 * Kriteria seleksi:
 * 1. Skor poin tertinggi (10 > 9 > 8 ...)
 * 2. Jarak terdekat ke pusat lesan (distance mm terkecil lebih unggul)
 * 3. Nilai kepercayaan (confidence score)
 *
 * @param {Array} rawShots - Daftar seluruh lubang tembakan terdeteksi
 * @param {number} quota - Jumlah kuota butir peluru babak
 * @returns {Object} Hasil pemilihan tembakan terbaik dan status kelebihan
 */
export const selectBestShots = (rawShots = [], quota = 10) => {
  const bulletQuota = parseInt(quota) || 10;
  if (!Array.isArray(rawShots) || rawShots.length === 0) {
    return {
      allShots: [],
      bestShots: [],
      excessShots: [],
      isQuotaExceeded: false,
      excessCount: 0,
      totalScore: 0,
      maxScore: bulletQuota * 10,
      accuracyPercent: 0,
    };
  }

  // Buat salinan dan urutkan berdasarkan tembakan terbaik
  const sorted = [...rawShots].sort((a, b) => {
    const scoreA = parseFloat(
      a.decimal_score ?? a.poin ?? a.skor_poin ?? a.ring ?? a.score ?? 0
    );
    const scoreB = parseFloat(
      b.decimal_score ?? b.poin ?? b.skor_poin ?? b.ring ?? b.score ?? 0
    );
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    const distA = parseFloat(
      a.distance_mm ??
        a.jarak_dari_pusat_mm ??
        a.distance_from_center_mm ??
        a.distance_from_center ??
        9999
    );
    const distB = parseFloat(
      b.distance_mm ??
        b.jarak_dari_pusat_mm ??
        b.distance_from_center_mm ??
        b.distance_from_center ??
        9999
    );
    if (distA !== distB) {
      return distA - distB;
    }

    const confA = parseFloat(a.confidence ?? a.confidence_score ?? 1);
    const confB = parseFloat(b.confidence ?? b.confidence_score ?? 1);
    return confB - confA;
  });

  const isQuotaExceeded = sorted.length > bulletQuota;
  const excessCount = isQuotaExceeded ? sorted.length - bulletQuota : 0;

  // Himpunan referensi tembakan terbaik (top N)
  const bestSlice = sorted.slice(0, bulletQuota);
  const bestSet = new Set(bestSlice);

  // Tandai seluruh tembakan dengan status seleksi kuota
  const allShots = rawShots.map((s, idx) => {
    const isSelected = bestSet.has(s);
    const bestRank = isSelected ? bestSlice.indexOf(s) + 1 : null;
    return {
      ...s,
      is_selected: isSelected,
      status_seleksi: isSelected ? "terpilih" : "diabaikan_kelebihan",
      rank_terbaik: bestRank,
      nomor_tampil: s.nomor || idx + 1,
    };
  });

  const bestShots = bestSlice.map((s, idx) => ({
    ...s,
    nomor: idx + 1, // Nomor urut terdaftar 1..quota
    nomor_asli: s.nomor || idx + 1,
    is_selected: true,
    status_seleksi: "terpilih",
    rank_terbaik: idx + 1,
  }));

  const excessShots = sorted.slice(bulletQuota).map((s, idx) => ({
    ...s,
    is_selected: false,
    status_seleksi: "diabaikan_kelebihan",
    rank_kelebihan: idx + 1,
  }));

  const totalScore = bestShots.reduce(
    (acc, s) =>
      acc + parseFloat(s.poin ?? s.skor_poin ?? s.ring ?? s.score ?? 0),
    0
  );
  const maxScore = bulletQuota * 10;
  const accuracyPercent =
    maxScore > 0 ? Number(((totalScore / maxScore) * 100).toFixed(1)) : 0;

  return {
    allShots,
    bestShots,
    excessShots,
    isQuotaExceeded,
    excessCount,
    totalScore,
    maxScore,
    accuracyPercent,
    bulletQuota,
  };
};

/**
 * Memeriksa status kesehatan layanan sitrak-detect
 */
export const checkDetectHealth = async (customBaseUrl = null) => {
  const baseUrl = customBaseUrl || getDetectApiUrl();
  try {
    const res = await axios.get(`${baseUrl}/api/v1/healthcheck`, {
      timeout: 5000,
    });
    return {
      online: true,
      data: res.data,
    };
  } catch (error) {
    return {
      online: false,
      error: error.message || "Layanan sitrak-detect tidak dapat dijangkau",
    };
  }
};

/**
 * Mengambil daftar detection engine yang tersedia dari layanan sitrak-detect
 * Endpoint: GET /api/v1/detect/engines
 */
export const fetchAvailableEngines = async (customBaseUrl = null) => {
  const baseUrl = customBaseUrl || getDetectApiUrl();
  const hasKey = hasGeminiApiKey();
  const geminiModel = getGeminiModel();

  const geminiEngineObj = {
    id: "gemini",
    name: "Google Gemini Cloud AI",
    type: "cloud_multimodal_ai",
    model: geminiModel,
    is_available: true,
    has_api_key: hasKey,
    description: hasKey
      ? `Model multimodal vision Google Gemini (${geminiModel}) untuk deteksi sasaran tembak berbasis cloud (API Key terpasang).`
      : "Model multimodal vision Google Gemini untuk deteksi sasaran tembak berbasis cloud (Tambahkan REACT_APP_GEMINI_API_KEY di .env).",
  };

  try {
    const res = await axios.get(`${baseUrl}/api/v1/detect/engines`, {
      timeout: 5000,
    });
    if (
      res.data &&
      res.data.status === "success" &&
      Array.isArray(res.data.engines)
    ) {
      const engines = [...res.data.engines];
      const existingGeminiIdx = engines.findIndex((e) => e.id === "gemini");
      if (existingGeminiIdx >= 0) {
        engines[existingGeminiIdx] = {
          ...engines[existingGeminiIdx],
          ...geminiEngineObj,
        };
      } else {
        engines.push(geminiEngineObj);
      }

      return {
        defaultEngine: res.data.default_engine || "model_sendiri",
        engines,
      };
    }
  } catch (err) {
    console.warn(
      "Gagal mengambil engine dari sitrak-detect, menggunakan fallback bawaan:",
      err
    );
  }

  // Fallback standar engine yang tersedia pada sitrak-detect
  return {
    defaultEngine: "model_sendiri",
    engines: [
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
      geminiEngineObj,
    ],
  };
};

/**
 * Mengunggah dan menganalisis foto sasaran tembak ke sitrak-detect atau Google Gemini
 *
 * @param {File|Blob} imageFile - File gambar target
 * @param {Object} metadata - Metadata penembakan
 * @param {string} [customBaseUrl] - URL opsional backend detect
 * @returns {Promise<Object>} Hasil deteksi yang dinormalisasi
 */
export const detectTargetViaUpload = async (
  imageFile,
  metadata = {},
  customBaseUrl = null
) => {
  if (!imageFile) {
    throw new Error("Berkas foto target tembakan wajib dipilih.");
  }

  // Jika mesin yang dipilih adalah Google Gemini Cloud AI, jalankan inferensi via Gemini API
  if (metadata.engine === "gemini") {
    return await detectTargetViaGemini(imageFile, metadata);
  }

  const baseUrl = customBaseUrl || getDetectApiUrl();

  const formData = new FormData();
  formData.append("file", imageFile);

  if (metadata.tipeTarget) {
    formData.append("target_type", metadata.tipeTarget);
  } else {
    formData.append("target_type", "issf_standard_10_ring");
  }

  if (metadata.kaliber) {
    formData.append("caliber_mm", String(metadata.kaliber));
  } else {
    formData.append("caliber_mm", "4.5");
  }

  if (metadata.namaPenembak) {
    formData.append("shooter_name", metadata.namaPenembak);
  }

  if (metadata.nomorBabak) {
    formData.append("babak_number", String(metadata.nomorBabak));
  }

  if (metadata.engine) {
    formData.append("engine", String(metadata.engine));
  }

  try {
    const response = await axios.post(
      `${baseUrl}/api/v1/detect/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 45000,
      }
    );

    const data = response.data;

    if (!data || data.status !== "success") {
      throw new Error(
        data?.message || "Layanan sitrak-detect gagal mendeteksi target."
      );
    }

    // Normalisasi data tembakan untuk visualizer SITRAK
    const shotsList = data.shots || [];
    const normalizedShots = shotsList.map((s, idx) => {
      // sitrak-detect menggunakan skala kanonikal 800x800 px (pusat 400, 400)
      // visualizer SITRAK menggunakan skala 0-100% (pusat 50, 50)
      const xPercent =
        typeof s.x === "number"
          ? s.x > 100
            ? Number(((s.x / 800) * 100).toFixed(1))
            : Number(s.x.toFixed(1))
          : 50;

      const yPercent =
        typeof s.y === "number"
          ? s.y > 100
            ? Number(((s.y / 800) * 100).toFixed(1))
            : Number(s.y.toFixed(1))
          : 50;

      const scoreVal = typeof s.score === "number" ? s.score : s.poin || 0;

      return {
        nomor: s.id || idx + 1,
        x: Math.max(0, Math.min(100, xPercent)),
        y: Math.max(0, Math.min(100, yPercent)),
        ring: String(scoreVal),
        poin: scoreVal,
        decimal_score: s.decimal_score || scoreVal,
        is_bullseye: scoreVal === 10,
        distance_mm: s.distance_from_center || 0,
      };
    });

    // Analitik balistik
    const analytics = data.analytics || {};
    const groupingDiameterMm =
      typeof analytics.grouping_diameter_mm === "number"
        ? analytics.grouping_diameter_mm
        : 35.0;

    const rawBias = analytics.directional_bias || "centered";
    const directionalBias =
      BIAS_TRANSLATION_MAP[rawBias.toLowerCase()] ||
      rawBias ||
      "Tepat di Tengah (Presisi)";

    const accuracyPercent =
      typeof data.accuracy_percentage === "number"
        ? data.accuracy_percentage
        : data.max_possible_score > 0
        ? Number(((data.total_score / data.max_possible_score) * 100).toFixed(1))
        : 0;

    // Evaluasi kelulusan
    const qualification =
      accuracyPercent >= 90
        ? "Istimewa"
        : accuracyPercent >= 80
        ? "Mahir"
        : accuracyPercent >= 70
        ? "Cukup"
        : "Perlu Pembinaan";

    // Rekomendasi & saran instruktur
    const saranList = generateTacticalAdvice(
      rawBias,
      groupingDiameterMm,
      accuracyPercent
    );

    // URL gambar beranotasi lengkap
    let annotatedImageUrl = "";
    if (data.annotated_image_url) {
      if (data.annotated_image_url.startsWith("http")) {
        annotatedImageUrl = data.annotated_image_url;
      } else {
        annotatedImageUrl = `${baseUrl}${data.annotated_image_url}`;
      }
    }

    return {
      success: true,
      target_detected: data.target_detected !== false,
      total_score: data.total_score || 0,
      max_score: data.max_possible_score || (metadata.jumlahPeluru || 10) * 10,
      shots_detected: data.shots_count || normalizedShots.length,
      average_score:
        normalizedShots.length > 0
          ? Number((data.total_score / normalizedShots.length).toFixed(1))
          : 0,
      accuracy_percent: accuracyPercent,
      qualification: qualification,
      grouping_diameter_mm: groupingDiameterMm,
      directional_bias: directionalBias,
      mean_point_of_impact_x: analytics.mean_point_of_impact_x || 0,
      mean_point_of_impact_y: analytics.mean_point_of_impact_y || 0,
      dispersion_radius_px: analytics.dispersion_radius_px || 0,
      consistency_level:
        groupingDiameterMm <= 30
          ? "Sangat Rapat (Tinggi)"
          : groupingDiameterMm <= 50
          ? "Cukup Rapat (Sedang)"
          : "Menyebar Luas (Perlu Pembinaan)",
      analisa_sebaran: `Perkenaan terdeteksi sebanyak ${
        data.shots_count || normalizedShots.length
      } butir dengan dispersi ${groupingDiameterMm} mm dan bias ${directionalBias}.`,
      saran: saranList,
      rekomendasi_utama: saranList[0] || "Pertahankan ritme penembakan.",
      shots: normalizedShots,
      annotated_image_url: annotatedImageUrl,
      metadata: data.metadata || {},
      detection_engine_used:
        data.detection_engine_used || metadata.engine || "model_sendiri",
      model_used:
        data.detection_engine_used ||
        data.metadata?.requested_engine ||
        "SITRAK-Detect (OpenCV Computer Vision)",
      analyzed_at: new Date().toISOString(),
    };
  } catch (error) {
    const errorMsg =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "Gagal menghubungi layanan sitrak-detect.";

    throw new Error(`Kesalahan Layanan SITRAK-Detect: ${errorMsg}`);
  }
};

/**
 * Helper untuk mengurai dan membersihkan teks catatan analisis & rekomendasi tembakan
 * Menghilangkan duplikasi kalimat dan memisahkan butir-butir rekomendasi secara rapi
 *
 * @param {string} raw - Teks mentah catatan analisis
 * @returns {{ warning: string|null, items: string[] }}
 */
export const parseCatatanAnalisis = (raw) => {
  if (!raw || typeof raw !== "string") return { warning: null, items: [] };

  let text = raw.trim();
  let warning = null;

  // 1. Ekstrak teks peringatan kuota peluru jika ada
  const warningMatch = text.match(/\[Peringatan Kuota Peluru:[^\]]+\]/i);
  if (warningMatch) {
    warning = warningMatch[0]
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .trim();
    text = text
      .replace(warningMatch[0], "")
      .replace(/^\s*[.-:]\s*/, "")
      .trim();
  }

  // 2. Pisahkan segmentasi jika ada penggabungan ' - '
  const primarySplits = text.split(/\s*-\s*/);
  const rawItems = [];

  primarySplits.forEach((segment) => {
    // Pisahkan baris baru
    const lines = segment.split(/\r?\n/);
    lines.forEach((line) => {
      // Pisahkan jika ada array yang tergabung koma tanpa spasi
      const subSegments = line.split(
        /,(?=[A-Z][a-z]+|\b(?:Koreksi|Relaksasi|Evaluasi|Pertahankan|Antisipasi|Posisi|Tekanan)\b)/
      );
      subSegments.forEach((sub) => {
        const clean = sub
          .trim()
          .replace(/^[.,\-•*\d)]+\s*/, "")
          .replace(/[.,]+$/, ".")
          .trim();
        if (clean && clean.length > 3) {
          rawItems.push(clean);
        }
      });
    });
  });

  // 3. Deduplikasi secara cerdas
  const uniqueItems = [];
  const seen = new Set();

  rawItems.forEach((item) => {
    const key = item.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!seen.has(key)) {
      seen.add(key);
      uniqueItems.push(item);
    }
  });

  return { warning, items: uniqueItems };
};

