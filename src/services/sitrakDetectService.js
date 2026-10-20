import axios from "axios";

/**
 * Service untuk memanggil API Layanan Deteksi Sasaran Tembak SITRAK (sitrak-detect)
 * Berbasis FastAPI, OpenCV, dan Computer Vision.
 */

import { getDetectApiUrl as getUrlFromConfig } from "./apiConfig";

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
 * Mengunggah dan menganalisis foto sasaran tembak ke sitrak-detect
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
  const baseUrl = customBaseUrl || getDetectApiUrl();

  if (!imageFile) {
    throw new Error("Berkas foto target tembakan wajib dipilih.");
  }

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
      model_used: "SITRAK-Detect (OpenCV Computer Vision)",
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
