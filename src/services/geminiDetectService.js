import axios from "axios";
import { getGeminiApiKey, getGeminiModel } from "./apiConfig";
import { generateTacticalAdvice } from "./sitrakDetectService";

/**
 * Peta terjemahan directional bias dari Computer Vision / Gemini ke Bahasa Indonesia
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
  center: "Tepat di Tengah (Presisi)",
};

/**
 * Mengubah file gambar (File / Blob) menjadi format Base64 dan mimeType.
 * Jika dimensi gambar terlalu besar (>1600px), gambar diperkecil secara proporsional
 * menggunakan HTML5 Canvas untuk mempercepat transmisi ke Gemini API.
 *
 * @param {File|Blob} file
 * @returns {Promise<{ mimeType: string, base64Data: string, dataUrl: string, imageEl: HTMLImageElement }>}
 */
export const fileToBase64Optimized = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const img = new Image();
      img.onerror = (err) => reject(err);
      img.onload = () => {
        const MAX_DIM = 1600;
        let { width, height } = img;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = "image/jpeg";
        const resizedDataUrl = canvas.toDataURL(mimeType, 0.92);
        const base64Data = resizedDataUrl.split(",")[1];

        // Buat image element baru dari hasil canvas untuk keperluan anotasi
        const finalImg = new Image();
        finalImg.onload = () => {
          resolve({
            mimeType,
            base64Data,
            dataUrl: resizedDataUrl,
            imageEl: finalImg,
            width,
            height,
          });
        };
        finalImg.src = resizedDataUrl;
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Menghasilkan citra beranotasi taktis (HUD Overlay) di sisi peramban (Client-Side Canvas)
 * Menggambar titik lubang perkenaan peluru, nomor tembakan, cincin skor, garis dispersi,
 * dan banner ringkasan performa balistik.
 *
 * @param {HTMLImageElement} imageEl - Objek gambar asli
 * @param {Array} shots - Daftar tembakan [{ x, y, score, nomor }]
 * @param {Object} analytics - Metrik balistik { total_score, max_score, grouping_mm, directional_bias, ... }
 * @returns {string} Data URL JPEG citra beranotasi
 */
export const generateClientAnnotatedImage = (imageEl, shots = [], analytics = {}) => {
  try {
    const canvas = document.createElement("canvas");
    const width = imageEl.naturalWidth || imageEl.width || 800;
    const height = imageEl.naturalHeight || imageEl.height || 800;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // 1. Gambar foto target asli
    ctx.drawImage(imageEl, 0, 0, width, height);

    // Skala visual berbasis ukuran kanvas
    const scale = Math.min(width, height) / 800;

    // 2. Gambar Crosshair Pusat Lesan Sasaran (Titik Pusat 50%, 50%)
    const centerX = width * 0.5;
    const centerY = height * 0.5;

    ctx.save();
    ctx.strokeStyle = "rgba(0, 242, 254, 0.4)";
    ctx.lineWidth = 1.5 * scale;
    ctx.setLineDash([4 * scale, 4 * scale]);
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Lingkaran bullseye tengah
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255, 59, 48, 0.6)";
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8 * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 3. Gambar Lingkaran Dispersi / Grouping jika terdapat >= 2 tembakan
    if (shots.length >= 2) {
      const pixelCoords = shots.map((s) => ({
        px: (s.x / 100) * width,
        py: (s.y / 100) * height,
      }));

      const avgX = pixelCoords.reduce((acc, p) => acc + p.px, 0) / pixelCoords.length;
      const avgY = pixelCoords.reduce((acc, p) => acc + p.py, 0) / pixelCoords.length;

      // Jarak terjauh dari titik pusat rata-rata
      let maxDistPx = 0;
      pixelCoords.forEach((p) => {
        const d = Math.hypot(p.px - avgX, p.py - avgY);
        if (d > maxDistPx) maxDistPx = d;
      });

      const groupingRadius = Math.max(maxDistPx + 10 * scale, 20 * scale);

      ctx.save();
      ctx.strokeStyle = "rgba(255, 193, 7, 0.75)";
      ctx.lineWidth = 2 * scale;
      ctx.setLineDash([6 * scale, 4 * scale]);
      ctx.beginPath();
      ctx.arc(avgX, avgY, groupingRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Titik MPI (Mean Point of Impact)
      ctx.fillStyle = "#ffc107";
      ctx.beginPath();
      ctx.arc(avgX, avgY, 4 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Gambar Setiap Titik Lubang Peluru
    shots.forEach((shot, idx) => {
      const px = (shot.x / 100) * width;
      const py = (shot.y / 100) * height;
      const nomor = shot.nomor || idx + 1;
      const score = shot.score ?? shot.poin ?? 0;
      const isBull = score === 10;

      ctx.save();

      // Warna tema berdasarkan skor ring
      let strokeColor = "#00f2fe";
      let fillColor = "rgba(0, 242, 254, 0.3)";
      let badgeBg = "#0288d1";

      if (isBull) {
        strokeColor = "#ff3b30";
        fillColor = "rgba(255, 59, 48, 0.35)";
        badgeBg = "#d32f2f";
      } else if (score >= 9) {
        strokeColor = "#ff9500";
        fillColor = "rgba(255, 149, 0, 0.3)";
        badgeBg = "#f57c00";
      } else if (score >= 8) {
        strokeColor = "#ffcc00";
        fillColor = "rgba(255, 204, 0, 0.25)";
        badgeBg = "#fbc02d";
      } else if (score >= 7) {
        strokeColor = "#34c759";
        fillColor = "rgba(52, 199, 89, 0.25)";
        badgeBg = "#388e3c";
      }

      // Lingkaran luar lubang
      const holeRadius = Math.max(12 * scale, 10);
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = fillColor;
      ctx.lineWidth = 2.5 * scale;
      ctx.beginPath();
      ctx.arc(px, py, holeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Titik tengah lubang proyektil
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(px, py, 3 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Garis bidik silang kecil pada perkenaan
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.2 * scale;
      ctx.beginPath();
      ctx.moveTo(px - holeRadius - 3 * scale, py);
      ctx.lineTo(px + holeRadius + 3 * scale, py);
      ctx.moveTo(px, py - holeRadius - 3 * scale);
      ctx.lineTo(px, py + holeRadius + 3 * scale);
      ctx.stroke();

      // Badge teks nomor urut & skor di atas lubang
      const badgeText = `#${nomor} (${score})`;
      const fontSize = Math.max(12 * scale, 11);
      ctx.font = `bold ${fontSize}px sans-serif`;
      const textMetrics = ctx.measureText(badgeText);
      const textWidth = textMetrics.width;
      const textHeight = fontSize;
      const paddingX = 6 * scale;
      const paddingY = 3 * scale;

      const badgeX = px - textWidth / 2 - paddingX;
      const badgeY = py - holeRadius - textHeight - paddingY * 2 - 2 * scale;
      const badgeW = textWidth + paddingX * 2;
      const badgeH = textHeight + paddingY * 2;

      // Kotak badge berlekuk
      ctx.fillStyle = badgeBg;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4 * scale)
        : ctx.rect(badgeX, badgeY, badgeW, badgeH);
      ctx.fill();
      ctx.stroke();

      // Teks label
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeText, badgeX + paddingX, badgeY + badgeH / 2);

      ctx.restore();
    });

    // 5. HUD Banner Informasi Balistik di Bagian Bawah Gambar
    ctx.save();
    const bannerH = Math.max(64 * scale, 54);
    const bannerY = height - bannerH;

    // Gradient bar transparan
    const grad = ctx.createLinearGradient(0, bannerY, 0, height);
    grad.addColorStop(0, "rgba(10, 15, 29, 0.7)");
    grad.addColorStop(1, "rgba(10, 15, 29, 0.95)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, bannerY, width, bannerH);

    // Garis aksen atas banner
    ctx.strokeStyle = "rgba(0, 242, 254, 0.7)";
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(0, bannerY);
    ctx.lineTo(width, bannerY);
    ctx.stroke();

    // Teks Header Banner
    const titleFontSize = Math.max(13 * scale, 12);
    ctx.font = `bold ${titleFontSize}px sans-serif`;
    ctx.fillStyle = "#00f2fe";
    ctx.textBaseline = "top";
    ctx.fillText("SITRAK AI • Google Gemini Multimodal Vision", 14 * scale, bannerY + 8 * scale);

    // Teks Metrik
    const bodyFontSize = Math.max(12 * scale, 11);
    ctx.font = `${bodyFontSize}px sans-serif`;
    ctx.fillStyle = "#ffffff";
    const totalScore = analytics.total_score ?? shots.reduce((acc, s) => acc + (s.score || 0), 0);
    const maxScore = analytics.max_score ?? 100;
    const groupingMm = analytics.grouping_diameter_mm ?? 0;
    const biasText = analytics.directional_bias || "Presisi";
    const accuracy = analytics.accuracy_percent ?? ((totalScore / maxScore) * 100).toFixed(1);

    const infoLine = `Skor: ${totalScore}/${maxScore} (${accuracy}%) | Tembakan: ${shots.length} butir | Grouping: ${groupingMm} mm | Bias: ${biasText}`;
    ctx.fillText(infoLine, 14 * scale, bannerY + 28 * scale);

    ctx.restore();

    return canvas.toDataURL("image/jpeg", 0.9);
  } catch (err) {
    console.warn("Gagal membuat anotasi canvas lokal:", err);
    return "";
  }
};

/**
 * Memanggil REST API Google Gemini untuk deteksi target tembak
 *
 * @param {string} apiKey - Kunci API Google Gemini
 * @param {string} modelName - Nama model Gemini (misal: gemini-2.5-flash)
 * @param {string} base64Data - Data citra murni base64
 * @param {string} mimeType - Tipe mime citra (misal: image/jpeg)
 * @param {Object} metadata - Metadata sesi latihan (target_type, kaliber, dll.)
 * @returns {Promise<Object>} JSON hasil respon dari Gemini
 */
const callGeminiGenerateContent = async (apiKey, modelName, base64Data, mimeType, metadata = {}) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    modelName
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const caliber = metadata.kaliber || 4.5;
  const quota = metadata.jumlahPeluru || 10;
  const targetType = metadata.tipeTarget || "issf_standard_10_ring";

  const systemPrompt = `You are a world-class ballistic analyst and computer vision specialist for the Indonesian Military / ISSF shooting target scoring system (SITRAK-AI).

TASK:
Analyze the provided shooting target photo with extreme precision.
Detect all bullet hole punctures, hits, or shot perforations made by projectiles on the target paper.

TARGET GEOMETRY & COORDINATES:
1. The target is a concentric circular target (e.g. ${targetType}, typically with black center circles for zones 7-10 or 8-10, and white outer rings 1-6).
2. The coordinate system must be normalized to percentages from 0.0 to 100.0:
   - x: horizontal position percentage (0.0 = extreme left edge of target, 50.0 = exact horizontal bullseye center, 100.0 = extreme right edge).
   - y: vertical position percentage (0.0 = extreme top edge of target, 50.0 = exact vertical bullseye center, 100.0 = extreme bottom edge).
   - The bullseye (Zone 10 / X) center is at (x=50.0, y=50.0).

SCORING RULES (ISSF INWARD-GAUGING):
- Zone 10 (Bullseye): innermost circle / crosshair. Poin = 10.
- Zone 9, 8, 7, 6, 5, 4, 3, 2, 1: outer concentric rings.
- Inward-gauging rule: If a bullet hole touches, breaks, or clips the inner dividing line of a higher scoring ring, ALWAYS award the HIGHER ring score.
- Missing target / completely outside ring 1 = 0.
- Caliber: ${caliber} mm. Round bullet quota expected: around ${quota} shots.

BALLISTIC ANALYTICS:
- grouping_diameter_mm: The extreme spread / diameter in millimeters between the two farthest bullet holes.
- directional_bias: One of ["centered", "top-left", "top-right", "bottom-left", "bottom-right", "top", "bottom", "left", "right"].
- mean_point_of_impact_x: The average X coordinate percentage of all hits.
- mean_point_of_impact_y: The average Y coordinate percentage of all hits.

OUTPUT FORMAT REQUIREMENTS:
Output strictly a valid JSON object without markdown formatting, code fences, or extra commentary.
The JSON must adhere to this exact structure:
{
  "target_detected": true,
  "shots_count": 10,
  "shots": [
    {
      "id": 1,
      "x": 50.8,
      "y": 49.2,
      "score": 10,
      "decimal_score": 10.5,
      "distance_from_center_mm": 3.4,
      "confidence": 0.96
    }
  ],
  "total_score": 96,
  "max_possible_score": 100,
  "grouping_diameter_mm": 28.5,
  "directional_bias": "top-right",
  "mean_point_of_impact_x": 51.2,
  "mean_point_of_impact_y": 48.7,
  "analysis_summary": "Perkenaan tembakan sangat rapat di zona 9 dan 10 dengan bias tipis ke kanan atas.",
  "tactical_advice": [
    "Koreksi Tumit Telapak Tangan: Hindari menekan bagian bawah pegangan ke depan saat hentakan.",
    "Pertahankan ritme penarikan picu yang stabil dan bertahap."
  ]
}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: systemPrompt },
          {
            inlineData: {
              mimeType: mimeType || "image/jpeg",
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      topP: 0.95,
      responseMimeType: "application/json",
    },
  };

  const response = await axios.post(url, requestBody, {
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 50000,
  });

  const candidates = response.data?.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("Google Gemini API tidak mengembalikan kandidat respon.");
  }

  const textPart = candidates[0]?.content?.parts?.[0]?.text;
  if (!textPart) {
    throw new Error("Google Gemini API tidak menghasilkan teks hasil analisis.");
  }

  // Bersihkan karakter markdown jika ada (```json ... ```)
  const cleanedJsonStr = textPart
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleanedJsonStr);
  } catch (parseErr) {
    console.error("Gagal mem-parsing output JSON Gemini:", textPart);
    throw new Error(`Respon Gemini bukan format JSON yang valid: ${parseErr.message}`);
  }
};

/**
 * Deteksi sasaran tembak menggunakan Google Gemini API Key secara mandiri di sisi klien.
 * Otomatis menangani fallback model jika model pertama tidak tersedia.
 *
 * @param {File|Blob} imageFile - Berkas foto sasaran tembak
 * @param {Object} metadata - Metadata latihan (tipeTarget, kaliber, namaPenembak, dll.)
 * @param {string} [customApiKey] - Kunci API opsional (jika tidak disediakan, diambil dari .env)
 * @returns {Promise<Object>} Struktur hasil deteksi terstandar yang kompatibel dengan SITRAK
 */
export const detectTargetViaGemini = async (
  imageFile,
  metadata = {},
  customApiKey = null
) => {
  const apiKey = (customApiKey || getGeminiApiKey() || "").trim();

  if (!apiKey) {
    throw new Error(
      "Kunci API Google Gemini belum diatur. Silakan tambahkan 'REACT_APP_GEMINI_API_KEY=kunci_anda' pada file .env lalu restart aplikasi."
    );
  }

  if (!imageFile) {
    throw new Error("Berkas foto target sasaran tembak wajib dipilih.");
  }

  // 1. Konversi & kompresi gambar ke base64 & muat objek gambar
  const { base64Data, mimeType, dataUrl, imageEl } = await fileToBase64Optimized(imageFile);

  // 2. Daftar prioritas model Gemini (fallback otomatis jika model tertentu tidak aktif)
  const preferredModel = getGeminiModel();
  const modelsToTry = [
    preferredModel,
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-3.8-flash",
  ].filter((v, i, a) => a.indexOf(v) === i && Boolean(v));

  let rawGeminiResult = null;
  let successfulModel = null;
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      rawGeminiResult = await callGeminiGenerateContent(
        apiKey,
        model,
        base64Data,
        mimeType,
        metadata
      );
      successfulModel = model;
      break;
    } catch (err) {
      console.warn(`[Gemini Detector] Model ${model} gagal atau tidak tersedia:`, err.message);
      lastError = err;
      // Lanjutkan ke model fallback berikutnya
    }
  }

  if (!rawGeminiResult) {
    const errorDetails =
      lastError?.response?.data?.error?.message ||
      lastError?.message ||
      "Gagal menghubungi server Google Gemini API.";
    throw new Error(`Deteksi Google Gemini Gagal: ${errorDetails}`);
  }

  // 3. Normalisasi tembakan hasil deteksi Gemini ke format standar visualizer SITRAK
  const rawShots = Array.isArray(rawGeminiResult.shots) ? rawGeminiResult.shots : [];
  const normalizedShots = rawShots.map((s, idx) => {
    // Normalisasi koordinat x dan y (persentase 0-100)
    let xPercent = typeof s.x === "number" ? s.x : 50;
    let yPercent = typeof s.y === "number" ? s.y : 50;

    // Jika Gemini mengembalikan skala kanonikal 800px
    if (xPercent > 100) xPercent = (xPercent / 800) * 100;
    if (yPercent > 100) yPercent = (yPercent / 800) * 100;

    xPercent = Math.max(0, Math.min(100, Number(xPercent.toFixed(1))));
    yPercent = Math.max(0, Math.min(100, Number(yPercent.toFixed(1))));

    const scoreVal = typeof s.score === "number" ? s.score : 0;
    const decimalScore =
      typeof s.decimal_score === "number" ? s.decimal_score : scoreVal;

    // Jarak dari titik pusat (50%, 50%) dalam mm
    let distMm = s.distance_from_center_mm;
    if (typeof distMm !== "number") {
      // Estimasi jarak jika tidak dihitung: radius target ~140mm
      const dx = ((xPercent - 50) / 50) * 140;
      const dy = ((yPercent - 50) / 50) * 140;
      distMm = Number(Math.hypot(dx, dy).toFixed(1));
    }

    return {
      nomor: s.id || idx + 1,
      x: xPercent,
      y: yPercent,
      ring: String(scoreVal),
      poin: scoreVal,
      decimal_score: decimalScore,
      is_bullseye: scoreVal === 10,
      distance_mm: Number(distMm.toFixed(1)),
      confidence: typeof s.confidence === "number" ? s.confidence : 0.95,
    };
  });

  // 4. Hitung metrik dispersi & balistik
  const totalScore =
    typeof rawGeminiResult.total_score === "number"
      ? rawGeminiResult.total_score
      : normalizedShots.reduce((acc, s) => acc + s.poin, 0);

  const bulletQuota = metadata.jumlahPeluru || 10;
  const maxScore =
    typeof rawGeminiResult.max_possible_score === "number"
      ? rawGeminiResult.max_possible_score
      : bulletQuota * 10;

  const accuracyPercent =
    maxScore > 0 ? Number(((totalScore / maxScore) * 100).toFixed(1)) : 0;

  const groupingDiameterMm =
    typeof rawGeminiResult.grouping_diameter_mm === "number"
      ? Number(rawGeminiResult.grouping_diameter_mm.toFixed(1))
      : 32.0;

  const rawBias = (rawGeminiResult.directional_bias || "centered").toLowerCase().trim();
  const directionalBias =
    BIAS_TRANSLATION_MAP[rawBias] ||
    rawGeminiResult.directional_bias ||
    "Tepat di Tengah (Presisi)";

  // Predikat kelulusan
  const qualification =
    accuracyPercent >= 90
      ? "Istimewa"
      : accuracyPercent >= 80
      ? "Mahir"
      : accuracyPercent >= 70
      ? "Cukup"
      : "Perlu Pembinaan";

  // Saran taktis pelatih
  let saranList = [];
  if (
    Array.isArray(rawGeminiResult.tactical_advice) &&
    rawGeminiResult.tactical_advice.length > 0
  ) {
    saranList = rawGeminiResult.tactical_advice;
  } else {
    saranList = generateTacticalAdvice(rawBias, groupingDiameterMm, accuracyPercent);
  }

  // 5. Generate Citra Beranotasi Menggunakan Client-Side Canvas
  const annotatedImageUrl = generateClientAnnotatedImage(imageEl, normalizedShots, {
    total_score: totalScore,
    max_score: maxScore,
    accuracy_percent: accuracyPercent,
    grouping_diameter_mm: groupingDiameterMm,
    directional_bias: directionalBias,
  });

  return {
    success: true,
    target_detected: rawGeminiResult.target_detected !== false,
    total_score: totalScore,
    max_score: maxScore,
    shots_detected: normalizedShots.length,
    average_score:
      normalizedShots.length > 0
        ? Number((totalScore / normalizedShots.length).toFixed(1))
        : 0,
    accuracy_percent: accuracyPercent,
    qualification: qualification,
    grouping_diameter_mm: groupingDiameterMm,
    directional_bias: directionalBias,
    mean_point_of_impact_x: rawGeminiResult.mean_point_of_impact_x || 50.0,
    mean_point_of_impact_y: rawGeminiResult.mean_point_of_impact_y || 50.0,
    dispersion_radius_px: Math.round(groupingDiameterMm * 2.85),
    consistency_level:
      groupingDiameterMm <= 30
        ? "Sangat Rapat (Tinggi)"
        : groupingDiameterMm <= 50
        ? "Cukup Rapat (Sedang)"
        : "Menyebar Luas (Perlu Pembinaan)",
    analisa_sebaran:
      rawGeminiResult.analysis_summary ||
      `Perkenaan terdeteksi sebanyak ${normalizedShots.length} butir dengan dispersi ${groupingDiameterMm} mm dan bias ${directionalBias}.`,
    saran: saranList,
    rekomendasi_utama: saranList[0] || "Pertahankan konsistensi penarikan picu.",
    shots: normalizedShots,
    annotated_image_url: annotatedImageUrl || dataUrl,
    metadata: {
      ...metadata,
      detection_source: "gemini_cloud_api",
      model: successfulModel,
    },
    detection_engine_used: "gemini",
    model_used: `Google Gemini Cloud AI (${successfulModel})`,
    analyzed_at: new Date().toISOString(),
  };
};

/**
 * Menguji validitas Google Gemini API Key dengan memanggil daftar model
 *
 * @param {string} [apiKey] - Kunci API untuk diuji
 * @returns {Promise<{ valid: boolean, message: string, models?: string[] }>}
 */
export const testGeminiApiKey = async (apiKey = null) => {
  const key = (apiKey || getGeminiApiKey() || "").trim();
  if (!key) {
    return {
      valid: false,
      message: "API Key belum diisi di .env (REACT_APP_GEMINI_API_KEY).",
    };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
      key
    )}`;
    const res = await axios.get(url, { timeout: 8000 });
    const models = res.data?.models || [];
    return {
      valid: true,
      message: `Terkoneksi ke Google Gemini API (${models.length} model tersedia)`,
      models: models.map((m) => m.name.replace("models/", "")),
    };
  } catch (err) {
    const msg =
      err.response?.data?.error?.message ||
      err.message ||
      "Gagal menghubungi Google Gemini API.";
    return {
      valid: false,
      message: `Kunci API tidak valid atau tidak dapat dijangkau: ${msg}`,
    };
  }
};

