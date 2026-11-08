/**
 * Layanan Autentikasi & Role-Based Access Control (RBAC) SITRAK-AI
 * Terintegrasi penuh dengan SITRAK-Backend & Database PostgreSQL (tabel `users`)
 *
 * Mendukung 3 Role Utama:
 * 1. Operator Latihan (operator):
 *    Membuat/mengelola sesi, mengunggah target, memeriksa hasil, memantau skor, dan menyiapkan laporan.
 * 2. Administrator (administrator):
 *    Mengelola master data, memeriksa konektivitas layanan, memastikan akun dan konfigurasi tersedia,
 *    serta berkoordinasi dengan pengelola server.
 * 3. Pelatih / Juri / Pimpinan (pelatih):
 *    Memantau hasil, meninjau rekapitulasi, dan menggunakan laporan sebagai bahan evaluasi sesuai kewenangan.
 */

import axios from "axios";
import { getBackendUrl } from "./apiConfig";

export const ROLES = {
  OPERATOR: "operator",
  ADMINISTRATOR: "administrator",
  PELATIH: "pelatih",
};

export const ROLE_METADATA = {
  [ROLES.OPERATOR]: {
    id: ROLES.OPERATOR,
    label: "Operator Latihan",
    shortLabel: "Operator",
    badgeClass: "bg-primary-subtle text-primary border border-primary",
    solidBadgeClass: "bg-primary text-white",
    icon: "bi-crosshair",
    description:
      "Membuat/mengelola sesi, mengunggah target, memeriksa hasil, memantau skor, dan menyiapkan laporan.",
    duties: [
      "Membuat dan mengelola jalannya sesi latihan menembak",
      "Mengunggah foto sasaran tembak & menjalankan deteksi skor",
      "Memeriksa hasil perkenaan dan memantau skor real-time",
      "Menyiapkan dan mencetak dokumen laporan hasil latihan",
    ],
    defaultRoute: "/latihan",
  },
  [ROLES.ADMINISTRATOR]: {
    id: ROLES.ADMINISTRATOR,
    label: "Administrator",
    shortLabel: "Admin",
    badgeClass: "bg-danger-subtle text-danger border border-danger",
    solidBadgeClass: "bg-danger text-white",
    icon: "bi-shield-lock-fill",
    description:
      "Mengelola master data, memeriksa konektivitas layanan, memastikan akun dan konfigurasi tersedia, serta berkoordinasi dengan pengelola server.",
    duties: [
      "Mengelola seluruh master data (Personel, Senjata, Target, Mode, Sikap)",
      "Memeriksa konektivitas layanan Backend, SITRAK-Detect CV, dan Gemini AI",
      "Memastikan ketersediaan akun pengguna dan konfigurasi sistem",
      "Berkoordinasi teknis dengan pengelola server dan jaringan",
    ],
    defaultRoute: "/pengaturan",
  },
  [ROLES.PELATIH]: {
    id: ROLES.PELATIH,
    label: "Pelatih / Juri / Pimpinan",
    shortLabel: "Pelatih / Juri",
    badgeClass: "bg-success-subtle text-success border border-success",
    solidBadgeClass: "bg-success text-white",
    icon: "bi-award-fill",
    description:
      "Memantau hasil, meninjau rekapitulasi, dan menggunakan laporan sebagai bahan evaluasi sesuai kewenangan.",
    duties: [
      "Memantau hasil tembakan secara langsung (Dashboard & Live Scoring)",
      "Meninjau rekapitulasi skor, akurasi, dan analisis sebaran perkenaan",
      "Menggunakan dan mencetak laporan resmi sebagai bahan evaluasi",
      "Memberikan penilaian dan rekomendasi pembinaan prajurit",
    ],
    defaultRoute: "/",
  },
};

export const ROLES_LIST = [
  ROLE_METADATA[ROLES.OPERATOR],
  ROLE_METADATA[ROLES.ADMINISTRATOR],
  ROLE_METADATA[ROLES.PELATIH],
];

const STORAGE_KEY_USER = "sitrak_active_user";
const STORAGE_KEY_TOKEN = "access_token";
const STORAGE_KEY_ACCOUNTS = "sitrak_accounts_list";

/**
 * Memperkaya objek user dari database dengan metadata role untuk UI
 */
export const enrichUserWithRoleMetadata = (rawUser) => {
  if (!rawUser) return null;
  const role = ROLE_METADATA[rawUser.role] ? rawUser.role : ROLES.OPERATOR;
  const roleMeta = ROLE_METADATA[role];

  return {
    id: rawUser.id_user || rawUser.id,
    id_user: rawUser.id_user || rawUser.id,
    username: rawUser.username,
    nama: rawUser.nama_lengkap || rawUser.nama,
    nama_lengkap: rawUser.nama_lengkap || rawUser.nama,
    pangkat: rawUser.pangkat || "-",
    nrp: rawUser.nrp || "-",
    jabatan: rawUser.jabatan || roleMeta.label,
    satuan: rawUser.satuan || "-",
    role,
    roleLabel: roleMeta.label,
    shortRoleLabel: roleMeta.shortLabel,
    badgeClass: roleMeta.badgeClass,
    solidBadgeClass: roleMeta.solidBadgeClass,
    roleIcon: roleMeta.icon,
    roleDescription: roleMeta.description,
    roleDuties: roleMeta.duties,
    isDefault: Boolean(rawUser.is_default ?? rawUser.isDefault),
    status: rawUser.status || "Aktif",
    last_login: rawUser.last_login || null,
    loginAt: rawUser.loginAt || new Date().toISOString(),
  };
};

/**
 * Mengatur header Authorization default pada Axios
 */
export const syncAxiosAuthHeader = () => {
  const token = localStorage.getItem(STORAGE_KEY_TOKEN);
  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common["Authorization"];
  }
};

// Inisialisasi header saat modul dimuat
syncAxiosAuthHeader();

// Lindungi request keluar: jangan pernah menyertakan header Authorization Bearer SITRAK
// pada pemanggilan domain pihak ketiga seperti Google Gemini API (generativelanguage.googleapis.com)
if (
  axios.interceptors &&
  axios.interceptors.request &&
  typeof axios.interceptors.request.use === "function"
) {
  axios.interceptors.request.use((config) => {
    const url = String(config.url || "");
    const isGoogleApi =
      url.includes("generativelanguage.googleapis.com") ||
      url.includes("googleapis.com");

    if (isGoogleApi) {
      if (config.headers) {
        delete config.headers["Authorization"];
        delete config.headers["authorization"];
        if (config.headers.common) {
          delete config.headers.common["Authorization"];
          delete config.headers.common["authorization"];
        }
      }
    }
    return config;
  });
}

/**
 * Melakukan autentikasi login ke SITRAK-Backend (PostgreSQL tabel `users`)
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ success: boolean, user?: Object, token?: string, redirectTo?: string, message?: string }>}
 */
export const loginWithCredentials = async (username, password) => {
  const cleanUser = String(username || "").trim().toLowerCase();
  const cleanPass = String(password || "");

  if (!cleanUser || !cleanPass) {
    return {
      success: false,
      message: "Username dan kata sandi wajib diisi.",
    };
  }

  try {
    const response = await axios.post(
      `${getBackendUrl()}/auth/login`,
      {
        username: cleanUser,
        password: cleanPass,
      },
      {
        timeout: 10000,
      }
    );

    const data = response.data || {};
    const accessToken = data.access_token || data.token;
    const rawUser = data.user;

    if (!accessToken || !rawUser) {
      return {
        success: false,
        message: "Respons autentikasi dari server tidak lengkap.",
      };
    }

    const userSession = enrichUserWithRoleMetadata(rawUser);
    const roleMeta = ROLE_METADATA[userSession.role] || ROLE_METADATA[ROLES.OPERATOR];

    localStorage.setItem(STORAGE_KEY_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userSession));
    syncAxiosAuthHeader();

    return {
      success: true,
      user: userSession,
      token: accessToken,
      redirectTo: roleMeta.defaultRoute || "/",
      source: "backend",
    };
  } catch (error) {
    if (error.response && error.response.data) {
      const serverMsg =
        typeof error.response.data === "string"
          ? error.response.data
          : error.response.data.message || "Username atau kata sandi tidak sesuai.";
      return {
        success: false,
        message: serverMsg,
      };
    }

    return {
      success: false,
      message: `Gagal terhubung ke server autentikasi SITRAK-Backend (${getBackendUrl()}). Pastikan layanan backend dan database PostgreSQL aktif.`,
    };
  }
};

/**
 * Memverifikasi token JWT aktif ke endpoint GET /auth/me di SITRAK-Backend
 * @returns {Promise<Object|null>}
 */
export const verifySessionWithBackend = async () => {
  const token = localStorage.getItem(STORAGE_KEY_TOKEN);
  if (!token) return null;

  try {
    const response = await axios.get(`${getBackendUrl()}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 8000,
    });

    if (response.status === 200 && response.data?.user) {
      const enriched = enrichUserWithRoleMetadata(response.data.user);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(enriched));
      return enriched;
    }
  } catch (error) {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      logoutUser();
      return null;
    }
  }

  return getCurrentUser();
};

/**
 * Mengambil seluruh daftar akun dari tabel `users` PostgreSQL di SITRAK-Backend
 * @returns {Promise<Array<Object>>}
 */
export const fetchUsersFromBackend = async () => {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const response = await axios.get(`${getBackendUrl()}/users`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 8000,
    });

    const rawList = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.data?.data)
      ? response.data.data
      : [];

    if (rawList.length > 0) {
      const formatted = rawList.map((u) => enrichUserWithRoleMetadata(u));
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(formatted));
      return formatted;
    }
  } catch (error) {
    console.error("Error fetchUsersFromBackend:", error);
  }
  return getRegisteredAccounts();
};

/**
 * Menambahkan akun pengguna baru ke tabel `users` PostgreSQL melalui SITRAK-Backend
 * @param {Object} accountData
 * @returns {Promise<{ success: boolean, account?: Object, message?: string }>}
 */
export const createUserInBackend = async (accountData) => {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const payload = {
      username: String(accountData.username || "").trim().toLowerCase(),
      password: String(accountData.password || ""),
      nama_lengkap: String(accountData.nama || accountData.nama_lengkap || "").trim(),
      pangkat: String(accountData.pangkat || "-").trim(),
      nrp: String(accountData.nrp || "-").trim(),
      jabatan: String(
        accountData.jabatan ||
          ROLE_METADATA[accountData.role]?.label ||
          "Operator Latihan"
      ).trim(),
      satuan: String(accountData.satuan || "Satuan SITRAK").trim(),
      role: accountData.role || ROLES.OPERATOR,
    };

    const response = await axios.post(`${getBackendUrl()}/users`, payload, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const createdUser = enrichUserWithRoleMetadata(
      response.data?.user || response.data
    );
    return {
      success: true,
      account: createdUser,
      message:
        response.data?.message ||
        "Akun pengguna berhasil disimpan ke database PostgreSQL.",
    };
  } catch (error) {
    const errMsg =
      error.response?.data?.message ||
      (typeof error.response?.data === "string" ? error.response.data : "") ||
      "Gagal menyimpan akun baru ke database PostgreSQL.";
    return {
      success: false,
      message: errMsg,
    };
  }
};

/**
 * Memperbarui akun pengguna di tabel `users` PostgreSQL melalui SITRAK-Backend
 * @param {number|string} userId
 * @param {Object} accountData
 * @returns {Promise<{ success: boolean, account?: Object, message?: string }>}
 */
export const updateUserInBackend = async (userId, accountData) => {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const payload = {};
    if (accountData.nama || accountData.nama_lengkap) {
      payload.nama_lengkap = String(accountData.nama || accountData.nama_lengkap).trim();
    }
    if (accountData.pangkat !== undefined) payload.pangkat = String(accountData.pangkat).trim();
    if (accountData.nrp !== undefined) payload.nrp = String(accountData.nrp).trim();
    if (accountData.satuan !== undefined) payload.satuan = String(accountData.satuan).trim();
    if (accountData.jabatan !== undefined) payload.jabatan = String(accountData.jabatan).trim();
    if (accountData.role) payload.role = accountData.role;
    if (accountData.status) payload.status = accountData.status;
    if (accountData.password && String(accountData.password).trim()) {
      payload.password = String(accountData.password).trim();
    }

    const response = await axios.put(`${getBackendUrl()}/users/${userId}`, payload, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const updatedUser = enrichUserWithRoleMetadata(
      response.data?.user || response.data
    );
    return {
      success: true,
      account: updatedUser,
      message:
        response.data?.message ||
        "Data akun berhasil diperbarui di database PostgreSQL.",
    };
  } catch (error) {
    const errMsg =
      error.response?.data?.message ||
      (typeof error.response?.data === "string" ? error.response.data : "") ||
      "Gagal memperbarui data akun di database PostgreSQL.";
    return {
      success: false,
      message: errMsg,
    };
  }
};

/**
 * Menghapus akun pengguna dari tabel `users` PostgreSQL melalui SITRAK-Backend
 * @param {number|string} userId
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export const deleteUserInBackend = async (userId) => {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const response = await axios.delete(`${getBackendUrl()}/users/${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    return {
      success: true,
      message:
        response.data?.message ||
        "Akun berhasil dihapus dari database PostgreSQL.",
    };
  } catch (error) {
    const errMsg =
      error.response?.data?.message ||
      (typeof error.response?.data === "string" ? error.response.data : "") ||
      "Gagal menghapus akun dari database PostgreSQL.";
    return {
      success: false,
      message: errMsg,
    };
  }
};

/**
 * Mengambil daftar akun yang tersimpan di cache lokal (fallback awal sebelum fetch selesai)
 * @returns {Array<Object>}
 */
export const getRegisteredAccounts = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

/**
 * Mengambil data pengguna yang sedang login
 * @returns {Object|null}
 */
export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (!raw || !token) return null;

    const user = JSON.parse(raw);
    if (!user || !user.username || !user.role) return null;

    return enrichUserWithRoleMetadata(user);
  } catch (e) {
    return null;
  }
};

/**
 * Memeriksa apakah pengguna sudah terautentikasi
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return Boolean(getCurrentUser());
};

/**
 * Logout dan bersihkan sesi pengguna serta header Authorization
 */
export const logoutUser = () => {
  localStorage.removeItem(STORAGE_KEY_USER);
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  syncAxiosAuthHeader();
};

/**
 * Helper Pemeriksaan Kewenangan (RBAC Permissions)
 */
export const getRolePermissions = (user = getCurrentUser()) => {
  const role = user?.role || null;

  return {
    isLoggedIn: Boolean(role),
    role,
    isOperator: role === ROLES.OPERATOR,
    isAdmin: role === ROLES.ADMINISTRATOR,
    isPelatih: role === ROLES.PELATIH,

    // 1. Kewenangan Sesi & Target (Operator & Administrator)
    canCreateSession: role === ROLES.OPERATOR || role === ROLES.ADMINISTRATOR,
    canManageSessionStatus: role === ROLES.OPERATOR || role === ROLES.ADMINISTRATOR,
    canUploadTarget: role === ROLES.OPERATOR || role === ROLES.ADMINISTRATOR,

    // 2. Kewenangan Pemantauan, Evaluasi & Laporan (Semua Role)
    canMonitorScores: Boolean(role),
    canViewRecap: Boolean(role),
    canViewScoresAndRecap: Boolean(role),
    canPrepareReport:
      role === ROLES.OPERATOR ||
      role === ROLES.PELATIH ||
      role === ROLES.ADMINISTRATOR,
    canEvaluateReport:
      role === ROLES.PELATIH || role === ROLES.ADMINISTRATOR,
    canPrintEvaluationReport:
      role === ROLES.OPERATOR ||
      role === ROLES.PELATIH ||
      role === ROLES.ADMINISTRATOR,

    // 3. Kewenangan Administrator (Master Data, Konektivitas, Akun & Server)
    canManageMasterData: role === ROLES.ADMINISTRATOR,
    canCheckServiceConnectivity: role === ROLES.ADMINISTRATOR,
    canManageAccounts: role === ROLES.ADMINISTRATOR,
    canManageAccountsAndConfig: role === ROLES.ADMINISTRATOR,
    canCoordinateServer: role === ROLES.ADMINISTRATOR,
    canAccessPengaturan: role === ROLES.ADMINISTRATOR,
  };
};
