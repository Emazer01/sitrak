/**
 * Konfigurasi URL API Backend & SITRAK-Detect
 *
 * Seluruh endpoint URL dan konfigurasi API diambil langsung secara murni dari
 * Environment Variable (.env: REACT_APP_BACKEND_URL dan REACT_APP_DETECT_API_URL).
 *
 * Mendukung akses lintas perangkat (multi-device di jaringan LAN yang sama):
 * Jika aplikasi diakses dari perangkat lain (ponsel, tablet, atau laptop lain)
 * dan nilai .env tertulis localhost/127.0.0.1, hostname akan diselaraskan
 * secara otomatis dengan alamat host server frontend saat ini.
 *
 * KEAMANAN:
 * - URL API TIDAK PERNAH disimpan atau dibaca dari localStorage.
 * - API Key / Kredensial rahasia TIDAK PERNAH diletakkan atau disimpan di localStorage.
 */

// Default URL jika variabel .env tidak terdefinisi
const DEFAULT_BACKEND_URL = "http://172.16.8.240:1200";
const DEFAULT_DETECT_API_URL = "http://172.16.8.240:8000";

/**
 * Membersihkan nilai URL dari spasi, tanda kutip (' atau "), dan trailing slash
 * @param {string|undefined} val
 * @param {string} fallback
 * @returns {string}
 */
const sanitizeUrl = (val, fallback) => {
  if (!val) return fallback;
  const cleaned = String(val)
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .trim()
    .replace(/\/+$/, "");
  return cleaned || fallback;
};

/**
 * Mendapatkan URL API Backend SITRAK dari .env
 * @returns {string} Base URL backend tanpa trailing slash
 */
export const getBackendUrl = () => {
  let url = sanitizeUrl(process.env.REACT_APP_BACKEND_URL, DEFAULT_BACKEND_URL);

  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    const currentHost = window.location.hostname;
    if (currentHost && currentHost !== "localhost" && currentHost !== "127.0.0.1") {
      try {
        const parsed = new URL(url);
        if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
          parsed.hostname = currentHost;
          url = parsed.origin;
        }
      } catch (e) {
        // Abaikan bila bukan URL absolut
      }
    }
  }

  return url;
};

/**
 * Mendapatkan URL API Deteksi Sasaran (sitrak-detect CV) dari .env
 * @returns {string} Base URL detect service tanpa trailing slash
 */
export const getDetectApiUrl = () => {
  let url = sanitizeUrl(process.env.REACT_APP_DETECT_API_URL, DEFAULT_DETECT_API_URL);

  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    const currentHost = window.location.hostname;
    if (currentHost && currentHost !== "localhost" && currentHost !== "127.0.0.1") {
      try {
        const parsed = new URL(url);
        if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
          parsed.hostname = currentHost;
          url = parsed.origin;
        }
      } catch (e) {
        // Abaikan bila bukan URL absolut
      }
    }
  }

  return url;
};

// Export konstanta langsung
export const BACKEND_URL = getBackendUrl();
export const DETECT_API_URL = getDetectApiUrl();

/**
 * Mendapatkan API Key Google Gemini dari Environment Variable (.env)
 * Mendukung prefix REACT_APP_GEMINI_API_KEY, REACT_APP_GOOGLE_API_KEY, atau GEMINI_API_KEY
 * @returns {string} API Key yang sudah dibersihkan atau string kosong jika belum diatur
 */
export const getGeminiApiKey = () => {
  const key =
    process.env.REACT_APP_GEMINI_API_KEY ||
    process.env.REACT_APP_GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY ||
    "";
  return String(key).trim().replace(/^['"]+|['"]+$/g, "");
};

/**
 * Memeriksa apakah Gemini API Key telah dikonfigurasi di environment variable (.env)
 * @returns {boolean}
 */
export const hasGeminiApiKey = () => {
  return Boolean(getGeminiApiKey());
};

/**
 * Mendapatkan nama model Gemini yang akan digunakan dari .env
 * Default: gemini-2.5-flash
 * @returns {string}
 */
export const getGeminiModel = () => {
  const model =
    process.env.REACT_APP_GEMINI_MODEL ||
    process.env.GEMINI_MODEL ||
    "gemini-2.5-flash";
  return String(model).trim().replace(/^['"]+|['"]+$/g, "");
};

