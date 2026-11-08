import * as React from "react";
import axios from "axios";
import { Navbar } from "../component/Navbar";
import { Sidebar } from "../component/Sidebar";
import { Breadcrumb } from "../component/Breadcrumb";
import { getBackendUrl, getDetectApiUrl, getGeminiApiKey } from "../services/apiConfig";
import { ModalImportExcelPersonel } from "../component/modal/ModalImportExcelPersonel";
import { ModalTambahUser } from "../component/modal/ModalTambahUser";
import { ModalEditUser } from "../component/modal/ModalEditUser";
import {
  ROLES,
  ROLE_METADATA,
  ROLES_LIST,
  getRegisteredAccounts,
  fetchUsersFromBackend,
  deleteUserInBackend,
  getCurrentUser,
} from "../services/authService";

export const Pengaturan = () => {
  document.title = "Pengaturan Parameter - SITRAK-AI";

  const [activeTab, setActiveTab] = React.useState("personel");
  const [searchQuery, setSearchQuery] = React.useState("");

  // State Modal Import Excel Personel
  const [showImportPersonelModal, setShowImportPersonelModal] = React.useState(false);

  // State Feedback Notifikasi & Loading Penambahan
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [alertFeedback, setAlertFeedback] = React.useState(null);

  // State Pagination & Search Personel
  const [personelPage, setPersonelPage] = React.useState(1);
  const [personelLimit] = React.useState(10);
  const [personelTotal, setPersonelTotal] = React.useState(0);
  const [personelTotalPages, setPersonelTotalPages] = React.useState(1);
  const [personelLoading, setPersonelLoading] = React.useState(false);
  const [searchPersonel, setSearchPersonel] = React.useState("");

  // 1. State Master Personel
  const [personelList, setPersonelList] = React.useState([]);
  const [newPersonel, setNewPersonel] = React.useState({
    nrp: "",
    nama: "",
    satuan: "",
  });

  // 2. State Master Senjata
  const [senjataList, setSenjataList] = React.useState([]);
  const [newSenjata, setNewSenjata] = React.useState({
    model: "",
    jenis: "",
    kaliber: "9 x 19 mm",
    pabrikan: "PT Pindad",
  });

  // 3. State Master Jenis Senjata
  const [jenisSenjataList, setJenisSenjataList] = React.useState([]);
  const [newJenisSenjata, setNewJenisSenjata] = React.useState({
    nama: "",
  });

  // 4. State Master Tipe Target / Sasaran
  const [targetList, setTargetList] = React.useState([]);
  const [newTarget, setNewTarget] = React.useState({
    nama: "",
  });

  // 5. State Master Mode Tembakan
  const [modeList, setModeList] = React.useState([]);
  const [newMode, setNewMode] = React.useState({
    nama: "",
  });

  // 6. State Master Sikap Menembak
  const [sikapList, setSikapList] = React.useState([]);
  const [newSikap, setNewSikap] = React.useState({
    nama: "",
  });

  // 7. State Manajemen Akun & Role (Administrator - Tabel users PostgreSQL)
  const [accountsList, setAccountsList] = React.useState(() =>
    getRegisteredAccounts()
  );
  const [accountsLoading, setAccountsLoading] = React.useState(false);
  const [showTambahUserModal, setShowTambahUserModal] = React.useState(false);
  const [showEditUserModal, setShowEditUserModal] = React.useState(false);
  const [selectedEditUser, setSelectedEditUser] = React.useState(null);
  const [filterRoleAccount, setFilterRoleAccount] = React.useState("semua");
  const [searchAccountQuery, setSearchAccountQuery] = React.useState("");

  const loadUsersFromDatabase = React.useCallback(async () => {
    setAccountsLoading(true);
    try {
      const users = await fetchUsersFromBackend();
      setAccountsList(users);
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  // 8. State Pemeriksaan Konektivitas Layanan & Server (Administrator)
  const [serviceStatus, setServiceStatus] = React.useState({
    backend: { status: "idle", latencyMs: null, message: "Belum diperiksa" },
    detectCv: { status: "idle", latencyMs: null, message: "Belum diperiksa" },
    geminiAi: {
      status: getGeminiApiKey() ? "configured" : "missing",
      message: getGeminiApiKey()
        ? "API Key Gemini terkonfigurasi di environment (.env)"
        : "API Key Gemini belum diatur di .env",
    },
    lastCheckedAt: null,
    checking: false,
  });

  const handleCheckServicesConnectivity = React.useCallback(async () => {
    setServiceStatus((prev) => ({ ...prev, checking: true }));
    const nowStr = new Date().toLocaleTimeString("id-ID");

    // 1. Cek Backend API
    let backendRes = {
      status: "offline",
      latencyMs: null,
      message: "Tidak dapat terhubung ke SITRAK-Backend",
    };
    const t0Backend = performance.now();
    try {
      const res = await axios.get(`${getBackendUrl()}/atribut`, {
        timeout: 5000,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      const latency = Math.round(performance.now() - t0Backend);
      if (res.status >= 200 && res.status < 300) {
        backendRes = {
          status: "online",
          latencyMs: latency,
          message: `Terhubung normal (HTTP ${res.status})`,
        };
      }
    } catch (err) {
      const latency = Math.round(performance.now() - t0Backend);
      backendRes = {
        status: "offline",
        latencyMs: latency,
        message:
          err.response?.status
            ? `Merenspons dengan HTTP ${err.response.status}`
            : `Koneksi gagal (${err.message || "Network Error"})`,
      };
    }

    // 2. Cek SITRAK-Detect CV API
    let detectRes = {
      status: "offline",
      latencyMs: null,
      message: "Tidak dapat terhubung ke SITRAK-Detect CV",
    };
    const t0Detect = performance.now();
    try {
      const res = await axios.get(`${getDetectApiUrl()}/`, {
        timeout: 5000,
      });
      const latency = Math.round(performance.now() - t0Detect);
      if (res.status >= 200 && res.status < 400) {
        detectRes = {
          status: "online",
          latencyMs: latency,
          message: `Service CV aktif (HTTP ${res.status})`,
        };
      }
    } catch (err) {
      const latency = Math.round(performance.now() - t0Detect);
      if (err.response && err.response.status) {
        detectRes = {
          status: "online",
          latencyMs: latency,
          message: `Endpoint aktif (HTTP ${err.response.status})`,
        };
      } else {
        detectRes = {
          status: "offline",
          latencyMs: latency,
          message: `Service tidak terjangkau (${err.message || "Network Error"})`,
        };
      }
    }

    // 3. Cek konfigurasi Gemini AI
    const geminiKey = getGeminiApiKey();
    const geminiRes = {
      status: geminiKey ? "online" : "missing",
      message: geminiKey
        ? `Terkonfigurasi (${geminiKey.slice(0, 6)}...${geminiKey.slice(-4)})`
        : "Variabel REACT_APP_GEMINI_API_KEY belum diatur pada server",
    };

    setServiceStatus({
      backend: backendRes,
      detectCv: detectRes,
      geminiAi: geminiRes,
      lastCheckedAt: nowStr,
      checking: false,
    });
  }, []);

  const handleRemoveAccount = async (id, nama) => {
    const currentUser = getCurrentUser();
    if (currentUser && (String(currentUser.id_user) === String(id) || String(currentUser.id) === String(id))) {
      setAlertFeedback({
        type: "warning",
        message: "Anda tidak dapat menghapus akun Anda sendiri saat sedang aktif login.",
      });
      return;
    }
    if (!window.confirm(`Yakin ingin menghapus akun "${nama}" dari database PostgreSQL?`)) return;
    setAlertFeedback(null);
    const res = await deleteUserInBackend(id);
    if (!res.success) {
      setAlertFeedback({
        type: "danger",
        message: res.message,
      });
      return;
    }
    await loadUsersFromDatabase();
    setAlertFeedback({
      type: "success",
      message: `Akun "${nama}" berhasil dihapus dari database PostgreSQL.`,
    });
  };

  const filteredAccountsList = React.useMemo(() => {
    return accountsList.filter((acc) => {
      if (filterRoleAccount !== "semua" && acc.role !== filterRoleAccount) {
        return false;
      }
      if (searchAccountQuery && searchAccountQuery.trim()) {
        const q = searchAccountQuery.trim().toLowerCase();
        const matchName = String(acc.nama || acc.nama_lengkap || "").toLowerCase().includes(q);
        const matchUser = String(acc.username || "").toLowerCase().includes(q);
        const matchNrp = String(acc.nrp || "").toLowerCase().includes(q);
        const matchUnit = String(acc.satuan || "").toLowerCase().includes(q);
        return matchName || matchUser || matchNrp || matchUnit;
      }
      return true;
    });
  }, [accountsList, filterRoleAccount, searchAccountQuery]);
  // Fungsi memanggil API /atribut dengan metode GET
  const getAtribut = async () => {
    try {
      const response = await axios.get(`${getBackendUrl()}/atribut`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (response.status === 200) {
        const atribut = response.data;
        if (atribut.jenis_senjata && Array.isArray(atribut.jenis_senjata)) {
          setJenisSenjataList(atribut.jenis_senjata);
          setNewSenjata((prev) => ({
            ...prev,
            jenis: prev.jenis || (atribut.jenis_senjata[0]?.id_jenis_senjata ?? ""),
          }));
        }
        if (atribut.mode_tembakan && Array.isArray(atribut.mode_tembakan)) {
          setModeList(atribut.mode_tembakan);
        }
        if (atribut.sikap_menembak && Array.isArray(atribut.sikap_menembak)) {
          setSikapList(atribut.sikap_menembak);
        }
        if (atribut.tipe_target && Array.isArray(atribut.tipe_target)) {
          setTargetList(atribut.tipe_target);
        }
        if (atribut.senjata && Array.isArray(atribut.senjata)) {
          setSenjataList(atribut.senjata);
        }
        return atribut;
      }
    } catch (error) {
      console.error("Error GET /atribut:", error);
    }
    return {};
  };

  // Fungsi memanggil API /personel dengan metode GET, pagination, dan filter pencarian
  const getPersonel = async (page = 1, limit = 10, search = "") => {
    setPersonelLoading(true);
    var personelData = [];
    try {
      let url = `${getBackendUrl()}/personel?page=${page}&limit=${limit}`;
      if (search && search.trim() !== "") {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (response.status === 200) {
        const resData = response.data;
        personelData = resData;

        if (Array.isArray(resData)) {
          setPersonelList(resData);
          setPersonelTotal((prev) => Math.max(prev, resData.length));
          setPersonelTotalPages(resData.length >= limit ? page + 1 : page);
        } else if (resData && Array.isArray(resData.data)) {
          setPersonelList(resData.data);
          const total =
            resData.total !== undefined
              ? resData.total
              : resData.count !== undefined
              ? resData.count
              : resData.data.length;
          setPersonelTotal(total);
          const totalPages =
            resData.totalPages ||
            resData.total_pages ||
            Math.ceil(total / limit) ||
            1;
          setPersonelTotalPages(totalPages);
        } else if (resData && Array.isArray(resData.personel)) {
          setPersonelList(resData.personel);
          const total =
            resData.total !== undefined
              ? resData.total
              : resData.personel.length;
          setPersonelTotal(total);
          const totalPages =
            resData.totalPages ||
            resData.total_pages ||
            Math.ceil(total / limit) ||
            1;
          setPersonelTotalPages(totalPages);
        }
      }
    } catch (error) {
      console.error("Error GET /personel:", error);
    } finally {
      setPersonelLoading(false);
    }
    return personelData;
  };

  React.useEffect(() => {
    document
      .getElementById("btn-dashboard")
      ?.classList.remove("sidebar-active");
    document.getElementById("btn-latihan")?.classList.remove("sidebar-active");
    document.getElementById("btn-pengaturan")?.classList.add("sidebar-active");

    document
      .getElementById("nav-btn-dashboard")
      ?.classList.remove("sidebar-active");
    document
      .getElementById("nav-btn-latihan")
      ?.classList.remove("sidebar-active");
    document
      .getElementById("nav-btn-pengaturan")
      ?.classList.add("sidebar-active");

    getAtribut();
    loadUsersFromDatabase();
  }, [loadUsersFromDatabase]);

  // Effect untuk menjalankan getPersonel saat page atau searchPersonel berubah
  React.useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      getPersonel(personelPage, personelLimit, searchPersonel);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [personelPage, searchPersonel, personelLimit]);

  // ========================================================
  // HANDLERS TAMBAH & HAPUS MASTER DATA VIA API BACKEND
  // ========================================================

  // 1. Personel
  const handleAddPersonel = async (e) => {
    e.preventDefault();
    if (!newPersonel.nrp || !newPersonel.nama) return;

    setIsSubmitting(true);
    setAlertFeedback(null);
    try {
      const payload = {
        nrp: newPersonel.nrp.trim(),
        nama_personel_penembak: newPersonel.nama.trim(),
        satuan: (newPersonel.satuan || "").trim() || "-",
      };

      const response = await axios.post(`${getBackendUrl()}/personel`, payload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (response.status === 201 || response.status === 200) {
        setAlertFeedback({
          type: "success",
          message: `Personel "${newPersonel.nama}" berhasil disimpan ke database.`,
        });
        setNewPersonel({
          nrp: "",
          nama: "",
          satuan: "",
        });
        getPersonel(personelPage, personelLimit, searchPersonel);
      }
    } catch (error) {
      console.error("Error handleAddPersonel:", error);
      setAlertFeedback({
        type: "danger",
        message:
          error.response?.data?.message ||
          (typeof error.response?.data === "string" ? error.response.data : "") ||
          "Gagal menyimpan data personel ke backend/database.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePersonel = async (id, nama) => {
    if (!window.confirm(`Yakin ingin menghapus personel "${nama || id}" dari database?`)) {
      return;
    }
    setAlertFeedback(null);
    try {
      const response = await axios.delete(`${getBackendUrl()}/personel/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      if (response.status === 200) {
        setAlertFeedback({
          type: "success",
          message: `Personel "${nama || id}" berhasil dihapus dari database.`,
        });
        getPersonel(personelPage, personelLimit, searchPersonel);
      }
    } catch (error) {
      console.error("Error handleDeletePersonel:", error);
      setAlertFeedback({
        type: "danger",
        message:
          error.response?.data?.message ||
          (typeof error.response?.data === "string" ? error.response.data : "") ||
          "Gagal menghapus personel dari database.",
      });
    }
  };

  // 2. Senjata
  const handleAddSenjata = async (e) => {
    e.preventDefault();
    if (!newSenjata.model) return;

    setIsSubmitting(true);
    setAlertFeedback(null);
    try {
      const defaultJenis = jenisSenjataList[0]?.id_jenis_senjata || 1;
      const payload = {
        model_senjata: newSenjata.model.trim(),
        id_jenis_senjata: parseInt(newSenjata.jenis) || defaultJenis,
        kaliber: (newSenjata.kaliber || "9 x 19 mm").trim(),
        pabrikan: (newSenjata.pabrikan || "PT Pindad").trim(),
      };

      const response = await axios.post(`${getBackendUrl()}/senjata`, payload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (response.status === 201 || response.status === 200) {
        setAlertFeedback({
          type: "success",
          message: `Senjata "${newSenjata.model}" berhasil disimpan ke database.`,
        });
        setNewSenjata({
          model: "",
          jenis: jenisSenjataList[0]?.id_jenis_senjata || "",
          kaliber: "9 x 19 mm",
          pabrikan: "PT Pindad",
        });
        getAtribut();
      }
    } catch (error) {
      console.error("Error handleAddSenjata:", error);
      setAlertFeedback({
        type: "danger",
        message:
          error.response?.data?.message ||
          (typeof error.response?.data === "string" ? error.response.data : "") ||
          "Gagal menyimpan data senjata ke backend/database.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSenjata = async (id, model) => {
    if (!window.confirm(`Yakin ingin menghapus senjata "${model || id}" dari database?`)) {
      return;
    }
    setAlertFeedback(null);
    try {
      const response = await axios.delete(`${getBackendUrl()}/senjata/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      if (response.status === 200) {
        setAlertFeedback({
          type: "success",
          message: `Senjata "${model || id}" berhasil dihapus dari database.`,
        });
        getAtribut();
      }
    } catch (error) {
      console.error("Error handleDeleteSenjata:", error);
      setAlertFeedback({
        type: "danger",
        message:
          error.response?.data?.message ||
          (typeof error.response?.data === "string" ? error.response.data : "") ||
          "Gagal menghapus senjata. Senjata mungkin sedang dipakai pada riwayat sesi latihan.",
      });
    }
  };

  // 3. Jenis Senjata
  const handleAddJenisSenjata = async (e) => {
    e.preventDefault();
    if (!newJenisSenjata.nama) return;

    setIsSubmitting(true);
    setAlertFeedback(null);
    try {
      const payload = {
        nama_jenis_senjata: newJenisSenjata.nama.trim(),
      };

      const response = await axios.post(
        `${getBackendUrl()}/jenis-senjata`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (response.status === 201 || response.status === 200) {
        setAlertFeedback({
          type: "success",
          message: `Kategori jenis senjata "${newJenisSenjata.nama}" berhasil disimpan ke database.`,
        });
        setNewJenisSenjata({ nama: "" });
        getAtribut();
      }
    } catch (error) {
      console.error("Error handleAddJenisSenjata:", error);
      setAlertFeedback({
        type: "danger",
        message:
          error.response?.data?.message ||
          (typeof error.response?.data === "string" ? error.response.data : "") ||
          "Gagal menyimpan kategori jenis senjata ke backend/database.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteJenisSenjata = async (id, nama) => {
    if (!window.confirm(`Yakin ingin menghapus jenis senjata "${nama || id}"?`)) {
      return;
    }
    setAlertFeedback(null);
    try {
      const response = await axios.delete(
        `${getBackendUrl()}/jenis-senjata/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      if (response.status === 200) {
        setAlertFeedback({
          type: "success",
          message: `Jenis senjata "${nama || id}" berhasil dihapus dari database.`,
        });
        getAtribut();
      }
    } catch (error) {
      console.error("Error handleDeleteJenisSenjata:", error);
      setAlertFeedback({
        type: "danger",
        message:
          error.response?.data?.message ||
          (typeof error.response?.data === "string" ? error.response.data : "") ||
          "Gagal menghapus jenis senjata. Masih ada senjata yang terhubung ke jenis ini.",
      });
    }
  };

  // 4. Tipe Target / Sasaran
  const handleAddTarget = async (e) => {
    e.preventDefault();
    if (!newTarget.nama) return;

    setIsSubmitting(true);
    setAlertFeedback(null);
    try {
      const payload = {
        nama_tipe_target: newTarget.nama.trim(),
      };

      const response = await axios.post(
        `${getBackendUrl()}/tipe-target`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (response.status === 201 || response.status === 200) {
        setAlertFeedback({
          type: "success",
          message: `Tipe target "${newTarget.nama}" berhasil disimpan ke database.`,
        });
        setNewTarget({ nama: "" });
        getAtribut();
      }
    } catch (error) {
      console.error("Error handleAddTarget:", error);
      setAlertFeedback({
        type: "danger",
        message:
          error.response?.data?.message ||
          (typeof error.response?.data === "string" ? error.response.data : "") ||
          "Gagal menyimpan tipe target ke backend/database.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTarget = async (id, nama) => {
    if (!window.confirm(`Yakin ingin menghapus tipe target "${nama || id}"?`)) {
      return;
    }
    setAlertFeedback(null);
    try {
      const response = await axios.delete(
        `${getBackendUrl()}/tipe-target/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      if (response.status === 200) {
        setAlertFeedback({
          type: "success",
          message: `Tipe target "${nama || id}" berhasil dihapus dari database.`,
        });
        getAtribut();
      }
    } catch (error) {
      console.error("Error handleDeleteTarget:", error);
      setAlertFeedback({
        type: "danger",
        message:
          error.response?.data?.message ||
          (typeof error.response?.data === "string" ? error.response.data : "") ||
          "Gagal menghapus tipe target. Target mungkin sedang dipakai pada riwayat latihan.",
      });
    }
  };

  // 5. Mode Tembakan
  const handleAddMode = async (e) => {
    e.preventDefault();
    if (!newMode.nama) return;

    setIsSubmitting(true);
    setAlertFeedback(null);
    try {
      const payload = {
        nama_mode_tembakan: newMode.nama.trim(),
      };

      const response = await axios.post(
        `${getBackendUrl()}/mode-tembakan`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (response.status === 201 || response.status === 200) {
        setAlertFeedback({
          type: "success",
          message: `Mode tembakan "${newMode.nama}" berhasil disimpan ke database.`,
        });
        setNewMode({ nama: "" });
        getAtribut();
      }
    } catch (error) {
      console.error("Error handleAddMode:", error);
      setAlertFeedback({
        type: "danger",
        message:
          error.response?.data?.message ||
          (typeof error.response?.data === "string" ? error.response.data : "") ||
          "Gagal menyimpan mode tembakan ke backend/database.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMode = async (id, nama) => {
    if (!window.confirm(`Yakin ingin menghapus mode tembakan "${nama || id}"?`)) {
      return;
    }
    setAlertFeedback(null);
    try {
      const response = await axios.delete(
        `${getBackendUrl()}/mode-tembakan/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      if (response.status === 200) {
        setAlertFeedback({
          type: "success",
          message: `Mode tembakan "${nama || id}" berhasil dihapus dari database.`,
        });
        getAtribut();
      }
    } catch (error) {
      console.error("Error handleDeleteMode:", error);
      setAlertFeedback({
        type: "danger",
        message:
          error.response?.data?.message ||
          (typeof error.response?.data === "string" ? error.response.data : "") ||
          "Gagal menghapus mode tembakan.",
      });
    }
  };

  // 6. Sikap Menembak
  const handleAddSikap = async (e) => {
    e.preventDefault();
    if (!newSikap.nama) return;

    setIsSubmitting(true);
    setAlertFeedback(null);
    try {
      const payload = {
        nama_sikap_menembak: newSikap.nama.trim(),
      };

      const response = await axios.post(
        `${getBackendUrl()}/sikap-menembak`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (response.status === 201 || response.status === 200) {
        setAlertFeedback({
          type: "success",
          message: `Sikap menembak "${newSikap.nama}" berhasil disimpan ke database.`,
        });
        setNewSikap({ nama: "" });
        getAtribut();
      }
    } catch (error) {
      console.error("Error handleAddSikap:", error);
      setAlertFeedback({
        type: "danger",
        message:
          error.response?.data?.message ||
          (typeof error.response?.data === "string" ? error.response.data : "") ||
          "Gagal menyimpan sikap menembak ke backend/database.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSikap = async (id, nama) => {
    if (!window.confirm(`Yakin ingin menghapus sikap menembak "${nama || id}"?`)) {
      return;
    }
    setAlertFeedback(null);
    try {
      const response = await axios.delete(
        `${getBackendUrl()}/sikap-menembak/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      if (response.status === 200) {
        setAlertFeedback({
          type: "success",
          message: `Sikap menembak "${nama || id}" berhasil dihapus dari database.`,
        });
        getAtribut();
      }
    } catch (error) {
      console.error("Error handleDeleteSikap:", error);
      setAlertFeedback({
        type: "danger",
        message:
          error.response?.data?.message ||
          (typeof error.response?.data === "string" ? error.response.data : "") ||
          "Gagal menghapus sikap menembak.",
      });
    }
  };

  return (
    <div>
      <Navbar />
      <div className="d-flex min-vh-100">
        <Sidebar />
        <div className="font-poppins w-100 overflow-x-hidden">
          {/* Breadcrumb Path Bar Terstandarisasi */}
          <Breadcrumb
            items={[
              { label: "Pengaturan & Parameter", active: true, icon: "bi bi-gear-fill" },
            ]}
            rightContent={
              <span className="badge bg-body-tertiary text-secondary border px-2 py-1 d-flex align-items-center">
                <i className="bi bi-sliders text-primary me-1"></i>
                Data Master & Parameter
              </span>
            }
          />

          <div className="p-2 p-sm-3 p-md-4">
            {/* Header Pengaturan */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-4">
              <div>
                <h2 className="fw-bold mb-1 fs-3 fs-md-2">
                  <i className="bi bi-sliders me-2 text-primary"></i> Pengaturan 
                </h2>
                <p className="text-secondary mb-0 small">
                  Kelola master data personel, senjata, target, mode tembakan,
                  dan sikap menembak aplikasi SITRAK
                </p>
              </div>
              <div>
                <span className="badge bg-primary-subtle text-primary border border-primary px-3 py-2 fs-6">
                  <i className="bi bi-database-check me-1"></i> Master Data Siap
                </span>
              </div>
            </div>

            {/* Navigasi Kategori Parameter */}
            <div className="card border-0 shadow-sm bg-body-tertiary mb-4">
              <div className="card-body p-2">
                <ul className="nav nav-pills flex-nowrap overflow-x-auto gap-1 pb-1" style={{ scrollbarWidth: "thin" }}>
                  <li className="nav-item flex-shrink-0">
                    <button
                      type="button"
                      className={`nav-link py-2 text-nowrap d-flex align-items-center justify-content-center gap-2 ${
                        activeTab === "personel"
                          ? "active shadow-sm"
                          : "text-secondary"
                      }`}
                      onClick={() => {
                        setActiveTab("personel");
                        setSearchQuery("");
                      }}
                    >
                      <i className="bi bi-people-fill"></i>
                      <span>Data Personel</span>
                      <span className="badge bg-light text-dark rounded-pill">
                        {personelTotal > 0 ? personelTotal : personelList.length}
                      </span>
                    </button>
                  </li>
                  <li className="nav-item flex-shrink-0">
                    <button
                      type="button"
                      className={`nav-link py-2 text-nowrap d-flex align-items-center justify-content-center gap-2 ${
                        activeTab === "senjata"
                          ? "active shadow-sm"
                          : "text-secondary"
                      }`}
                      onClick={() => {
                        setActiveTab("senjata");
                        setSearchQuery("");
                      }}
                    >
                      <i className="bi bi-shield-fill"></i>
                      <span>Senjata</span>
                      <span className="badge bg-light text-dark rounded-pill">
                        {senjataList.length}
                      </span>
                    </button>
                  </li>
                  <li className="nav-item flex-shrink-0">
                    <button
                      type="button"
                      className={`nav-link py-2 text-nowrap d-flex align-items-center justify-content-center gap-2 ${
                        activeTab === "jenisSenjata"
                          ? "active shadow-sm"
                          : "text-secondary"
                      }`}
                      onClick={() => {
                        setActiveTab("jenisSenjata");
                        setSearchQuery("");
                      }}
                    >
                      <i className="bi bi-tags-fill"></i>
                      <span>Jenis Senjata</span>
                      <span className="badge bg-light text-dark rounded-pill">
                        {jenisSenjataList.length}
                      </span>
                    </button>
                  </li>
                  <li className="nav-item flex-shrink-0">
                    <button
                      type="button"
                      className={`nav-link py-2 text-nowrap d-flex align-items-center justify-content-center gap-2 ${
                        activeTab === "tipeTarget"
                          ? "active shadow-sm"
                          : "text-secondary"
                      }`}
                      onClick={() => {
                        setActiveTab("tipeTarget");
                        setSearchQuery("");
                      }}
                    >
                      <i className="bi bi-bullseye"></i>
                      <span>Tipe Target</span>
                      <span className="badge bg-light text-dark rounded-pill">
                        {targetList.length}
                      </span>
                    </button>
                  </li>
                  <li className="nav-item flex-shrink-0">
                    <button
                      type="button"
                      className={`nav-link py-2 text-nowrap d-flex align-items-center justify-content-center gap-2 ${
                        activeTab === "modeTembak"
                          ? "active shadow-sm"
                          : "text-secondary"
                      }`}
                      onClick={() => {
                        setActiveTab("modeTembak");
                        setSearchQuery("");
                      }}
                    >
                      <i className="bi bi-stopwatch-fill"></i>
                      <span>Mode Tembakan</span>
                      <span className="badge bg-light text-dark rounded-pill">
                        {modeList.length}
                      </span>
                    </button>
                  </li>
                  <li className="nav-item flex-shrink-0">
                    <button
                      type="button"
                      className={`nav-link py-2 text-nowrap d-flex align-items-center justify-content-center gap-2 ${
                        activeTab === "sikapMenembak"
                          ? "active shadow-sm"
                          : "text-secondary"
                      }`}
                      onClick={() => {
                        setActiveTab("sikapMenembak");
                        setSearchQuery("");
                      }}
                    >
                      <i className="bi bi-person-arms-up"></i>
                      <span>Sikap Menembak</span>
                      <span className="badge bg-light text-dark rounded-pill">
                        {sikapList.length}
                      </span>
                    </button>
                  </li>
                  <li className="nav-item flex-shrink-0">
                    <button
                      type="button"
                      className={`nav-link py-2 text-nowrap d-flex align-items-center justify-content-center gap-2 ${
                        activeTab === "akunRole"
                          ? "active shadow-sm"
                          : "text-secondary"
                      }`}
                      onClick={() => {
                        setActiveTab("akunRole");
                        setSearchQuery("");
                      }}
                    >
                      <i className="bi bi-person-badge-fill"></i>
                      <span>Akun & Role</span>
                      <span className="badge bg-light text-dark rounded-pill">
                        {accountsList.length}
                      </span>
                    </button>
                  </li>
                  <li className="nav-item flex-shrink-0">
                    <button
                      type="button"
                      className={`nav-link py-2 text-nowrap d-flex align-items-center justify-content-center gap-2 ${
                        activeTab === "konektivitas"
                          ? "active shadow-sm"
                          : "text-secondary"
                      }`}
                      onClick={() => {
                        setActiveTab("konektivitas");
                        setSearchQuery("");
                        if (serviceStatus.backend.status === "idle") {
                          handleCheckServicesConnectivity();
                        }
                      }}
                    >
                      <i className="bi bi-hdd-network-fill"></i>
                      <span>Konektivitas & Server</span>
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            {/* Alert Notifikasi Status Aksi Backend */}
            {alertFeedback && (
              <div
                className={`alert alert-${alertFeedback.type} alert-dismissible fade show d-flex align-items-center mb-4 shadow-sm`}
                role="alert"
              >
                <i
                  className={`bi ${
                    alertFeedback.type === "success"
                      ? "bi-check-circle-fill text-success"
                      : "bi-exclamation-triangle-fill text-danger"
                  } fs-5 me-2`}
                ></i>
                <div className="flex-grow-1">{alertFeedback.message}</div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setAlertFeedback(null)}
                  aria-label="Close"
                ></button>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 1: DATA PERSONEL */}
            {/* ======================================================== */}
            {activeTab === "personel" && (
              <div className="row g-4">
                <div className="col-12 col-lg-8">
                  <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                    <div className="card-header bg-transparent border-0 pt-3 px-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                      <h5 className="fw-bold mb-0">
                        <i className="bi bi-people-fill me-2 text-primary"></i>
                        Daftar Personel Penembak
                      </h5>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success d-flex align-items-center gap-1 shadow-sm"
                          onClick={() => setShowImportPersonelModal(true)}
                          title="Import data personel secara massal via file Excel"
                        >
                          <i className="bi bi-file-earmark-excel-fill text-success"></i>
                          <span className="fw-semibold">Import Excel</span>
                        </button>
                        <div
                          className="input-group input-group-sm"
                          style={{ maxWidth: "230px" }}
                        >
                          <span className="input-group-text bg-body border-end-0 text-muted">
                            <i className="bi bi-search"></i>
                          </span>
                          <input
                            type="text"
                            className="form-control border-start-0"
                            placeholder="Cari nama/NRP..."
                            value={searchPersonel}
                            onChange={(e) => {
                              setSearchPersonel(e.target.value);
                              setPersonelPage(1);
                            }}
                          />
                          {searchPersonel && (
                            <button
                              className="btn btn-outline-secondary"
                              type="button"
                              onClick={() => {
                                setSearchPersonel("");
                                setPersonelPage(1);
                              }}
                              title="Reset Pencarian"
                            >
                              <i className="bi bi-x"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="card-body p-3">
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>#</th>
                              <th>NRP</th>
                              <th>Pangkat, Nama Lengkap</th>
                              <th>Satuan</th>
                              <th className="text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {personelLoading ? (
                              <tr>
                                <td colSpan="5" className="text-center py-4 text-muted">
                                  <div
                                    className="spinner-border spinner-border-sm text-primary me-2"
                                    role="status"
                                  ></div>
                                  Memuat data personel dari database...
                                </td>
                              </tr>
                            ) : personelList.length === 0 ? (
                              <tr>
                                <td colSpan="5" className="text-center py-4 text-muted">
                                  <i className="bi bi-inbox fs-4 d-block mb-1"></i>
                                  Tidak ada data personel ditemukan
                                </td>
                              </tr>
                            ) : (
                              personelList.map((p, idx) => (
                                <tr key={p.id_personel_penembak || p.id || idx}>
                                  <td className="fw-bold text-secondary">
                                    {(personelPage - 1) * personelLimit + idx + 1}
                                  </td>
                                  <td className="fw-bold text-primary">
                                    {p.nrp}
                                  </td>
                                  <td className="fw-semibold">
                                    {p.nama_personel_penembak || p.nama}
                                  </td>
                                  <td>{p.satuan || "-"}</td>
                                  <td className="text-center">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-link text-danger p-0"
                                      onClick={() =>
                                        handleDeletePersonel(
                                          p.id_personel_penembak || p.id,
                                          p.nama_personel_penembak || p.nama
                                        )
                                      }
                                      title="Hapus Personel dari Database"
                                    >
                                      <i className="bi bi-trash"></i>
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Pagination Footer */}
                    <div className="card-footer bg-transparent border-0 px-3 py-3 d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
                      <div className="small text-muted">
                        {personelTotal > 0 ? (
                          <>
                            Menampilkan{" "}
                            <span className="fw-bold text-body">
                              {(personelPage - 1) * personelLimit + 1}
                            </span>{" "}
                            -{" "}
                            <span className="fw-bold text-body">
                              {Math.min(
                                personelPage * personelLimit,
                                personelTotal
                              )}
                            </span>{" "}
                            dari{" "}
                            <span className="fw-bold text-body">
                              {personelTotal}
                            </span>{" "}
                            personel
                          </>
                        ) : (
                          <>
                            Halaman{" "}
                            <span className="fw-bold text-body">
                              {personelPage}
                            </span>
                            {personelTotalPages > 1 && (
                              <span> dari {personelTotalPages}</span>
                            )}
                          </>
                        )}
                      </div>

                      <nav aria-label="Navigasi Halaman Personel">
                        <ul className="pagination pagination-sm mb-0">
                          <li
                            className={`page-item ${
                              personelPage <= 1 ? "disabled" : ""
                            }`}
                          >
                            <button
                              className="page-link"
                              type="button"
                              onClick={() =>
                                setPersonelPage((prev) => Math.max(prev - 1, 1))
                              }
                              disabled={personelPage <= 1}
                            >
                              <i className="bi bi-chevron-left me-1"></i> Prev
                            </button>
                          </li>

                          {Array.from(
                            { length: Math.max(personelTotalPages, 1) },
                            (_, i) => i + 1
                          )
                            .filter((page) => {
                              if (personelTotalPages <= 5) return true;
                              return (
                                Math.abs(page - personelPage) <= 2 ||
                                page === 1 ||
                                page === personelTotalPages
                              );
                            })
                            .map((page, index, array) => {
                              const prevPage = array[index - 1];
                              const showEllipsis =
                                prevPage && page - prevPage > 1;

                              return (
                                <React.Fragment key={page}>
                                  {showEllipsis && (
                                    <li className="page-item disabled">
                                      <span className="page-link">...</span>
                                    </li>
                                  )}
                                  <li
                                    className={`page-item ${
                                      personelPage === page ? "active" : ""
                                    }`}
                                  >
                                    <button
                                      className="page-link"
                                      type="button"
                                      onClick={() => setPersonelPage(page)}
                                    >
                                      {page}
                                    </button>
                                  </li>
                                </React.Fragment>
                              );
                            })}

                          <li
                            className={`page-item ${
                              personelPage >= personelTotalPages ||
                              (personelList.length < personelLimit &&
                                personelTotal <= personelPage * personelLimit)
                                ? "disabled"
                                : ""
                            }`}
                          >
                            <button
                              className="page-link"
                              type="button"
                              onClick={() => setPersonelPage((prev) => prev + 1)}
                              disabled={
                                personelPage >= personelTotalPages ||
                                (personelList.length < personelLimit &&
                                  personelTotal <= personelPage * personelLimit)
                              }
                            >
                              Next <i className="bi bi-chevron-right ms-1"></i>
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-lg-4">
                  <div className="card border-0 shadow-sm bg-body-tertiary">
                    <div className="card-header bg-transparent border-0 pt-3 px-3 d-flex justify-content-between align-items-center">
                      <h5 className="fw-bold mb-0">
                        <i className="bi bi-person-plus-fill me-2 text-primary"></i>
                        Tambah Personel
                      </h5>
                      <button
                        type="button"
                        className="btn btn-sm btn-link text-success text-decoration-none p-0 fw-semibold"
                        onClick={() => setShowImportPersonelModal(true)}
                        title="Import banyak data personel via Excel"
                      >
                        <i className="bi bi-file-earmark-excel me-1"></i> Via Excel
                      </button>
                    </div>
                    <div className="card-body p-3">
                      <form onSubmit={handleAddPersonel}>
                        <div className="mb-2">
                          <label className="form-label small fw-semibold">
                            NRP
                          </label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Contoh: 220400123"
                            value={newPersonel.nrp}
                            onChange={(e) =>
                              setNewPersonel({
                                ...newPersonel,
                                nrp: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="mb-2">
                          <label className="form-label small fw-semibold">
                            Pangkat, Nama Lengkap
                          </label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Contoh: Kapten Inf. Arya"
                            value={newPersonel.nama}
                            onChange={(e) =>
                              setNewPersonel({
                                ...newPersonel,
                                nama: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label small fw-semibold">
                            Satuan
                          </label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Contoh: Batalyon A"
                            value={newPersonel.satuan}
                            onChange={(e) =>
                              setNewPersonel({
                                ...newPersonel,
                                satuan: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          className="btn btn-primary btn-sm w-100"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <span
                                className="spinner-border spinner-border-sm me-1"
                                role="status"
                                aria-hidden="true"
                              ></span>
                              Menyimpan ke Database...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-plus-lg me-1"></i> Simpan Personel
                            </>
                          )}
                        </button>
                      </form>

                      {/* Opsi Tambah Banyak via Excel */}
                      <div className="mt-3 pt-3 border-top text-center">
                        <small className="text-secondary d-block mb-2">
                          Punya daftar personel banyak dalam dokumen Excel?
                        </small>
                        <button
                          type="button"
                          className="btn btn-outline-success btn-sm w-100 d-flex align-items-center justify-content-center gap-1 shadow-sm"
                          onClick={() => setShowImportPersonelModal(true)}
                        >
                          <i className="bi bi-file-earmark-excel-fill"></i>
                          <span>Bulk Insert via Excel (.xlsx)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: DATA SENJATA */}
            {/* ======================================================== */}
            {activeTab === "senjata" && (
              <div className="row g-4">
                <div className="col-12 col-lg-8">
                  <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                    <div className="card-header bg-transparent border-0 pt-3 px-3 d-flex justify-content-between align-items-center">
                      <h5 className="fw-bold mb-0">
                        <i className="bi bi-shield-fill me-2 text-primary"></i>
                        Master Data Senjata Latihan
                      </h5>
                      <div
                        className="input-group input-group-sm"
                        style={{ maxWidth: "220px" }}
                      >
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Cari senjata..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="card-body p-3">
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>#</th>
                              <th>Model Senjata</th>
                              <th>Jenis Senjata</th>
                              <th>Kaliber</th>
                              <th>Pabrikan</th>
                              <th className="text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {senjataList.length === 0 ? (
                              <tr>
                                <td colSpan="6" className="text-center py-4 text-muted">
                                  <i className="bi bi-inbox fs-4 d-block mb-1"></i>
                                  Tidak ada data senjata ditemukan
                                </td>
                              </tr>
                            ) : (
                              senjataList
                                .filter((s) => {
                                  if (!searchQuery.trim()) return true;
                                  const q = searchQuery.toLowerCase();
                                  return (
                                    (s.model_senjata || s.model || "").toLowerCase().includes(q) ||
                                    (s.nama_jenis_senjata || "").toLowerCase().includes(q) ||
                                    (s.kaliber || "").toLowerCase().includes(q) ||
                                    (s.pabrikan || "").toLowerCase().includes(q)
                                  );
                                })
                                .map((s, idx) => (
                                  <tr key={s.id_senjata || s.id || idx}>
                                    <td className="fw-bold text-secondary">{idx + 1}</td>
                                    <td className="fw-semibold">{s.model_senjata || s.model}</td>
                                    <td>
                                      <span className="badge bg-secondary-subtle text-secondary border">
                                        {s.nama_jenis_senjata || "-"}
                                      </span>
                                    </td>
                                    <td>
                                      <span className="badge bg-body-tertiary text-dark border">
                                        {s.kaliber || "-"}
                                      </span>
                                    </td>
                                    <td>{s.pabrikan || "-"}</td>
                                    <td className="text-center">
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-link text-danger p-0"
                                        onClick={() =>
                                          handleDeleteSenjata(
                                            s.id_senjata || s.id,
                                            s.model_senjata || s.model
                                          )
                                        }
                                        title="Hapus Senjata dari Database"
                                      >
                                        <i className="bi bi-trash"></i>
                                      </button>
                                    </td>
                                  </tr>
                                ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-lg-4">
                  <div className="card border-0 shadow-sm bg-body-tertiary">
                    <div className="card-header bg-transparent border-0 pt-3 px-3">
                      <h5 className="fw-bold mb-0">
                        <i className="bi bi-plus-circle-fill me-2 text-primary"></i>
                        Tambah Senjata
                      </h5>
                    </div>
                    <div className="card-body p-3">
                      <form onSubmit={handleAddSenjata}>
                        <div className="mb-2">
                          <label className="form-label small fw-semibold">
                            Model Senjata
                          </label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Contoh: Pindad SS2-V5 A1"
                            value={newSenjata.model}
                            onChange={(e) =>
                              setNewSenjata({
                                ...newSenjata,
                                model: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="mb-2">
                          <label className="form-label small fw-semibold">
                            Jenis Senjata
                          </label>
                          <select
                            className="form-select form-select-sm"
                            value={newSenjata.jenis || (jenisSenjataList[0]?.id_jenis_senjata ?? "")}
                            onChange={(e) =>
                              setNewSenjata({
                                ...newSenjata,
                                jenis: e.target.value,
                              })
                            }
                          >
                            {jenisSenjataList.map((j) => (
                              <option key={j.id_jenis_senjata || j.id} value={j.id_jenis_senjata || j.id}>
                                {j.nama_jenis_senjata || j.nama}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="mb-2">
                          <label className="form-label small fw-semibold">
                            Kaliber
                          </label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Contoh: 9 x 19 mm / 5.56 x 45 mm"
                            value={newSenjata.kaliber}
                            onChange={(e) =>
                              setNewSenjata({
                                ...newSenjata,
                                kaliber: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label small fw-semibold">
                            Pabrikan
                          </label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Contoh: PT Pindad"
                            value={newSenjata.pabrikan}
                            onChange={(e) =>
                              setNewSenjata({
                                ...newSenjata,
                                pabrikan: e.target.value,
                              })
                            }
                          />
                        </div>
                        <button
                          type="submit"
                          className="btn btn-primary btn-sm w-100"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <span
                                className="spinner-border spinner-border-sm me-1"
                                role="status"
                                aria-hidden="true"
                              ></span>
                              Menyimpan ke Database...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-plus-lg me-1"></i> Simpan Senjata
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 3: MASTER JENIS SENJATA */}
            {/* ======================================================== */}
            {activeTab === "jenisSenjata" && (
              <div className="row g-4">
                <div className="col-12 col-lg-8">
                  <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                    <div className="card-header bg-transparent border-0 pt-3 px-3">
                      <h5 className="fw-bold mb-0">
                        <i className="bi bi-tags-fill me-2 text-primary"></i>
                        Kategori Jenis Senjata
                      </h5>
                    </div>
                    <div className="card-body p-3">
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>#</th>
                              <th>Nama Kategori Jenis</th>
                              <th className="text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {jenisSenjataList.length === 0 ? (
                              <tr>
                                <td colSpan="3" className="text-center py-4 text-muted">
                                  <i className="bi bi-inbox fs-4 d-block mb-1"></i>
                                  Tidak ada data jenis senjata ditemukan
                                </td>
                              </tr>
                            ) : (
                              jenisSenjataList.map((j, idx) => (
                                <tr key={j.id_jenis_senjata || j.id || idx}>
                                  <td className="text-secondary">{idx + 1}</td>
                                  <td className="fw-bold">{j.nama_jenis_senjata || j.nama}</td>
                                  <td className="text-center">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-link text-danger p-0"
                                      onClick={() =>
                                        handleDeleteJenisSenjata(
                                          j.id_jenis_senjata || j.id,
                                          j.nama_jenis_senjata || j.nama
                                        )
                                      }
                                      title="Hapus Jenis Senjata dari Database"
                                    >
                                      <i className="bi bi-trash"></i>
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-lg-4">
                  <div className="card border-0 shadow-sm bg-body-tertiary">
                    <div className="card-header bg-transparent border-0 pt-3 px-3">
                      <h5 className="fw-bold mb-0">
                        <i className="bi bi-plus-circle-fill me-2 text-primary"></i>
                        Tambah Jenis Senjata
                      </h5>
                    </div>
                    <div className="card-body p-3">
                      <form onSubmit={handleAddJenisSenjata}>
                        <div className="mb-3">
                          <label className="form-label small fw-semibold">
                            Nama Jenis Senjata
                          </label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Contoh: Senapan Runduk Presisi"
                            value={newJenisSenjata.nama}
                            onChange={(e) =>
                              setNewJenisSenjata({
                                ...newJenisSenjata,
                                nama: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          className="btn btn-primary btn-sm w-100"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <span
                                className="spinner-border spinner-border-sm me-1"
                                role="status"
                                aria-hidden="true"
                              ></span>
                              Menyimpan ke Database...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-plus-lg me-1"></i> Simpan Jenis Senjata
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 4: TIPE SASARAN / TARGET */}
            {/* ======================================================== */}
            {activeTab === "tipeTarget" && (
              <div className="row g-4">
                <div className="col-12 col-lg-8">
                  <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                    <div className="card-header bg-transparent border-0 pt-3 px-3">
                      <h5 className="fw-bold mb-0">
                        <i className="bi bi-bullseye me-2 text-primary"></i>
                        Master Tipe Sasaran / Target Tembak
                      </h5>
                    </div>
                    <div className="card-body p-3">
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>#</th>
                              <th>Nama Target</th>
                              <th className="text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {targetList.length === 0 ? (
                              <tr>
                                <td colSpan="3" className="text-center py-4 text-muted">
                                  <i className="bi bi-inbox fs-4 d-block mb-1"></i>
                                  Tidak ada data tipe target ditemukan
                                </td>
                              </tr>
                            ) : (
                              targetList.map((t, idx) => (
                                <tr key={t.id_tipe_target || t.id || idx}>
                                  <td className="text-secondary">{idx + 1}</td>
                                  <td className="fw-bold">{t.nama_tipe_target || t.nama}</td>
                                  <td className="text-center">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-link text-danger p-0"
                                      onClick={() =>
                                        handleDeleteTarget(
                                          t.id_tipe_target || t.id,
                                          t.nama_tipe_target || t.nama
                                        )
                                      }
                                      title="Hapus Tipe Target dari Database"
                                    >
                                      <i className="bi bi-trash"></i>
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-lg-4">
                  <div className="card border-0 shadow-sm bg-body-tertiary">
                    <div className="card-header bg-transparent border-0 pt-3 px-3">
                      <h5 className="fw-bold mb-0">
                        <i className="bi bi-plus-circle-fill me-2 text-primary"></i>
                        Tambah Tipe Target
                      </h5>
                    </div>
                    <div className="card-body p-3">
                      <form onSubmit={handleAddTarget}>
                        <div className="mb-3">
                          <label className="form-label small fw-semibold">
                            Nama Target
                          </label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Contoh: Siluet Reaksi Taktis"
                            value={newTarget.nama}
                            onChange={(e) =>
                              setNewTarget({
                                ...newTarget,
                                nama: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          className="btn btn-primary btn-sm w-100"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <span
                                className="spinner-border spinner-border-sm me-1"
                                role="status"
                                aria-hidden="true"
                              ></span>
                              Menyimpan ke Database...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-plus-lg me-1"></i> Simpan Tipe Target
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 5: MODE TEMBAKAN */}
            {/* ======================================================== */}
            {activeTab === "modeTembak" && (
              <div className="row g-4">
                <div className="col-12 col-lg-8">
                  <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                    <div className="card-header bg-transparent border-0 pt-3 px-3">
                      <h5 className="fw-bold mb-0">
                        <i className="bi bi-stopwatch-fill me-2 text-primary"></i>
                        Master Mode Tembakan
                      </h5>
                    </div>
                    <div className="card-body p-3">
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>#</th>
                              <th>Mode Tembakan</th>
                              <th className="text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {modeList.length === 0 ? (
                              <tr>
                                <td colSpan="3" className="text-center py-4 text-muted">
                                  <i className="bi bi-inbox fs-4 d-block mb-1"></i>
                                  Tidak ada data mode tembakan ditemukan
                                </td>
                              </tr>
                            ) : (
                              modeList.map((m, idx) => (
                                <tr key={m.id_mode_tembakan || m.id || idx}>
                                  <td className="text-secondary">{idx + 1}</td>
                                  <td className="fw-bold">{m.nama_mode_tembakan || m.nama}</td>
                                  <td className="text-center">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-link text-danger p-0"
                                      onClick={() =>
                                        handleDeleteMode(
                                          m.id_mode_tembakan || m.id,
                                          m.nama_mode_tembakan || m.nama
                                        )
                                      }
                                      title="Hapus Mode Tembakan dari Database"
                                    >
                                      <i className="bi bi-trash"></i>
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-lg-4">
                  <div className="card border-0 shadow-sm bg-body-tertiary">
                    <div className="card-header bg-transparent border-0 pt-3 px-3">
                      <h5 className="fw-bold mb-0">
                        <i className="bi bi-plus-circle-fill me-2 text-primary"></i>
                        Tambah Mode Tembakan
                      </h5>
                    </div>
                    <div className="card-body p-3">
                      <form onSubmit={handleAddMode}>
                        <div className="mb-3">
                          <label className="form-label small fw-semibold">
                            Nama Mode
                          </label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Contoh: Tembak Reaksi Cepat"
                            value={newMode.nama}
                            onChange={(e) =>
                              setNewMode({ ...newMode, nama: e.target.value })
                            }
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          className="btn btn-primary btn-sm w-100"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <span
                                className="spinner-border spinner-border-sm me-1"
                                role="status"
                                aria-hidden="true"
                              ></span>
                              Menyimpan ke Database...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-plus-lg me-1"></i> Simpan Mode Tembakan
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 6: SIKAP MENEMBAK */}
            {/* ======================================================== */}
            {activeTab === "sikapMenembak" && (
              <div className="row g-4">
                <div className="col-12 col-lg-8">
                  <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                    <div className="card-header bg-transparent border-0 pt-3 px-3">
                      <h5 className="fw-bold mb-0">
                        <i className="bi bi-person-arms-up me-2 text-primary"></i>
                        Master Sikap Menembak
                      </h5>
                    </div>
                    <div className="card-body p-3">
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>#</th>
                              <th>Sikap Menembak</th>
                              <th className="text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sikapList.length === 0 ? (
                              <tr>
                                <td colSpan="3" className="text-center py-4 text-muted">
                                  <i className="bi bi-inbox fs-4 d-block mb-1"></i>
                                  Tidak ada data sikap menembak ditemukan
                                </td>
                              </tr>
                            ) : (
                              sikapList.map((s, idx) => (
                                <tr key={s.id_sikap_menembak || s.id || idx}>
                                  <td className="text-secondary">{idx + 1}</td>
                                  <td className="fw-bold">{s.nama_sikap_menembak || s.nama}</td>
                                  <td className="text-center">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-link text-danger p-0"
                                      onClick={() =>
                                        handleDeleteSikap(
                                          s.id_sikap_menembak || s.id,
                                          s.nama_sikap_menembak || s.nama
                                        )
                                      }
                                      title="Hapus Sikap Menembak dari Database"
                                    >
                                      <i className="bi bi-trash"></i>
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-lg-4">
                  <div className="card border-0 shadow-sm bg-body-tertiary">
                    <div className="card-header bg-transparent border-0 pt-3 px-3">
                      <h5 className="fw-bold mb-0">
                        <i className="bi bi-plus-circle-fill me-2 text-primary"></i>
                        Tambah Sikap Menembak
                      </h5>
                    </div>
                    <div className="card-body p-3">
                      <form onSubmit={handleAddSikap}>
                        <div className="mb-3">
                          <label className="form-label small fw-semibold">
                            Nama Sikap
                          </label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Contoh: Berdiri Menopang"
                            value={newSikap.nama}
                            onChange={(e) =>
                              setNewSikap({ ...newSikap, nama: e.target.value })
                            }
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          className="btn btn-primary btn-sm w-100"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <span
                                className="spinner-border spinner-border-sm me-1"
                                role="status"
                                aria-hidden="true"
                              ></span>
                              Menyimpan ke Database...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-plus-lg me-1"></i> Simpan Sikap Menembak
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 7: AKUN & ROLE PENGGUNA (ADMINISTRATOR) */}
            {/* ======================================================== */}
            {activeTab === "akunRole" && (
              <div className="row g-4">
                <div className="col-12">
                  <div className="card border-0 shadow-sm bg-body-tertiary">
                    {/* Header Card */}
                    <div className="card-header bg-transparent border-0 pt-3 px-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <div>
                        <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                          <i className="bi bi-person-badge-fill text-primary"></i>
                          Manajemen Akun & Otoritas Role Pengguna
                        </h5>
                        <small className="text-secondary">
                          Kelola kredensial, hak akses peran, status akun, dan reset sandi pengguna di basis data PostgreSQL
                        </small>
                      </div>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 shadow-sm"
                          onClick={loadUsersFromDatabase}
                          disabled={accountsLoading}
                          title="Segarkan daftar akun dari PostgreSQL"
                        >
                          <i className={`bi bi-arrow-repeat ${accountsLoading ? "spin" : ""}`}></i>
                          <span>Segarkan</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm fw-semibold"
                          onClick={() => setShowTambahUserModal(true)}
                          title="Tambah akun pengguna baru"
                        >
                          <i className="bi bi-person-plus-fill me-1"></i>
                          <span>Tambah Akun Baru</span>
                        </button>
                      </div>
                    </div>

                    {/* Toolbar Pencarian & Filter Role */}
                    <div className="card-body p-3 pt-0">
                      <div className="p-3 mb-3 rounded-3 bg-body border border-secondary border-opacity-10 d-flex flex-column flex-md-row justify-content-between align-items-stretch align-items-md-center gap-3">
                        <div className="d-flex align-items-center gap-2 flex-wrap flex-grow-1">
                          <div className="input-group input-group-sm" style={{ maxWidth: "320px" }}>
                            <span className="input-group-text bg-body-tertiary text-muted">
                              <i className="bi bi-search"></i>
                            </span>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Cari nama, NRP, username..."
                              value={searchAccountQuery}
                              onChange={(e) => setSearchAccountQuery(e.target.value)}
                            />
                            {searchAccountQuery && (
                              <button
                                className="btn btn-outline-secondary"
                                type="button"
                                onClick={() => setSearchAccountQuery("")}
                              >
                                <i className="bi bi-x"></i>
                              </button>
                            )}
                          </div>

                          <div className="d-flex align-items-center gap-1">
                            <span className="small text-secondary me-1">Filter Role:</span>
                            <select
                              className="form-select form-select-sm"
                              style={{ width: "auto" }}
                              value={filterRoleAccount}
                              onChange={(e) => setFilterRoleAccount(e.target.value)}
                            >
                              <option value="semua">Semua Role</option>
                              <option value={ROLES.OPERATOR}>Operator Latihan</option>
                              <option value={ROLES.ADMINISTRATOR}>Administrator</option>
                              <option value={ROLES.PELATIH}>Pelatih / Juri / Pimpinan</option>
                            </select>
                          </div>
                        </div>

                        {/* Statistik Singkat */}
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <span className="badge bg-secondary-subtle text-secondary border">
                            Total: <strong>{accountsList.length}</strong>
                          </span>
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                            Operator: <strong>{accountsList.filter((a) => a.role === ROLES.OPERATOR).length}</strong>
                          </span>
                          <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                            Admin: <strong>{accountsList.filter((a) => a.role === ROLES.ADMINISTRATOR).length}</strong>
                          </span>
                          <span className="badge bg-success-subtle text-success border border-success-subtle">
                            Pelatih: <strong>{accountsList.filter((a) => a.role === ROLES.PELATIH).length}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Tabel Akun Pengguna */}
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                          <thead className="table-light">
                            <tr>
                              <th style={{ width: "60px" }}>ID</th>
                              <th>Username</th>
                              <th>Pangkat, Nama Lengkap</th>
                              <th>NRP & Satuan</th>
                              <th>Role & Wewenang</th>
                              <th className="text-center">Status</th>
                              <th>Login Terakhir</th>
                              <th className="text-center" style={{ width: "130px" }}>Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {accountsLoading ? (
                              <tr>
                                <td colSpan="8" className="text-center py-4 text-muted">
                                  <span
                                    className="spinner-border spinner-border-sm text-primary me-2"
                                    role="status"
                                  ></span>
                                  Memuat akun dari tabel users PostgreSQL...
                                </td>
                              </tr>
                            ) : filteredAccountsList.length === 0 ? (
                              <tr>
                                <td colSpan="8" className="text-center py-4 text-muted">
                                  <i className="bi bi-inbox fs-3 d-block mb-1 text-secondary opacity-50"></i>
                                  Tidak ada akun pengguna yang cocok dengan kriteria pencarian.
                                </td>
                              </tr>
                            ) : (
                              filteredAccountsList.map((acc) => {
                                const meta =
                                  ROLE_METADATA[acc.role] || ROLE_METADATA[ROLES.OPERATOR];
                                const isSelf =
                                  getCurrentUser() &&
                                  (String(getCurrentUser().id_user) === String(acc.id_user || acc.id) ||
                                    String(getCurrentUser().id) === String(acc.id_user || acc.id));

                                return (
                                  <tr key={acc.id_user || acc.id || acc.username}>
                                    <td className="text-secondary fw-bold">
                                      #{acc.id_user || acc.id}
                                    </td>
                                    <td>
                                      <code className="fw-bold text-primary fs-7">
                                        {acc.username}
                                      </code>
                                      {isSelf && (
                                        <span className="badge bg-info-subtle text-info ms-1" style={{ fontSize: "10px" }}>
                                          Anda
                                        </span>
                                      )}
                                    </td>
                                    <td>
                                      <div className="fw-semibold">
                                        {acc.pangkat && acc.pangkat !== "-" ? `${acc.pangkat} ` : ""}
                                        {acc.nama || acc.nama_lengkap}
                                      </div>
                                      <small className="text-secondary">
                                        {acc.jabatan || "-"}
                                      </small>
                                    </td>
                                    <td>
                                      <div className="small fw-medium">
                                        NRP: <span className="font-monospace">{acc.nrp || "-"}</span>
                                      </div>
                                      <small className="text-secondary">
                                        {acc.satuan || "-"}
                                      </small>
                                    </td>
                                    <td>
                                      <span
                                        className={`badge ${meta.badgeClass} d-inline-flex align-items-center gap-1 mb-1`}
                                      >
                                        <i className={meta.icon}></i>
                                        {meta.label}
                                      </span>
                                      <div
                                        className="text-secondary"
                                        style={{ fontSize: "0.75rem", maxWidth: "240px" }}
                                      >
                                        {meta.description}
                                      </div>
                                    </td>
                                    <td className="text-center">
                                      <span
                                        className={`badge ${
                                          (acc.status || "Aktif").toLowerCase() === "aktif"
                                            ? "bg-success-subtle text-success border border-success-subtle"
                                            : "bg-secondary-subtle text-secondary border border-secondary-subtle"
                                        }`}
                                      >
                                        {acc.status || "Aktif"}
                                      </span>
                                    </td>
                                    <td>
                                      <small className="text-secondary">
                                        {acc.last_login
                                          ? new Date(acc.last_login).toLocaleString("id-ID")
                                          : "Belum pernah"}
                                      </small>
                                    </td>
                                    <td className="text-center">
                                      <div className="d-flex align-items-center justify-content-center gap-1">
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline-primary py-1 px-2"
                                          onClick={() => {
                                            setSelectedEditUser(acc);
                                            setShowEditUserModal(true);
                                          }}
                                          title="Ubah data profil / reset kata sandi"
                                        >
                                          <i className="bi bi-pencil-square me-1"></i>
                                          Ubah
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline-danger py-1 px-2"
                                          onClick={() =>
                                            handleRemoveAccount(
                                              acc.id_user || acc.id,
                                              acc.nama || acc.nama_lengkap
                                            )
                                          }
                                          disabled={isSelf}
                                          title={
                                            isSelf
                                              ? "Akun Anda sendiri tidak dapat dihapus saat sedang login"
                                              : "Hapus akun dari PostgreSQL"
                                          }
                                        >
                                          <i className="bi bi-trash"></i>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 8: KONEKTIVITAS LAYANAN & SERVER (ADMINISTRATOR) */}
            {/* ======================================================== */}
            {activeTab === "konektivitas" && (
              <div className="row g-4">
                <div className="col-12 col-lg-8">
                  <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                    <div className="card-header bg-transparent border-0 pt-3 px-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <div>
                        <h5 className="fw-bold mb-0">
                          <i className="bi bi-hdd-network-fill me-2 text-primary"></i>
                          Status Konektivitas Layanan SITRAK
                        </h5>
                        <small className="text-secondary">
                          Memeriksa ketersediaan layanan Backend Database, Computer Vision Server, dan AI Engine
                        </small>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                        onClick={handleCheckServicesConnectivity}
                        disabled={serviceStatus.checking}
                      >
                        {serviceStatus.checking ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm"
                              role="status"
                            ></span>
                            <span>Memeriksa...</span>
                          </>
                        ) : (
                          <>
                            <i className="bi bi-arrow-repeat"></i>
                            <span>Uji Konektivitas Sekarang</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="card-body p-3">
                      <div className="d-flex flex-column gap-3">
                        {/* 1. SITRAK-Backend Database API */}
                        <div className="p-3 rounded-3 border bg-body d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
                          <div>
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-database-fill-gear text-primary fs-5"></i>
                              <span className="fw-bold">
                                SITRAK-Backend API & Database
                              </span>
                            </div>
                            <div className="small text-secondary mt-1">
                              Endpoint: <code>{getBackendUrl()}</code>
                            </div>
                            <div className="small text-muted">
                              {serviceStatus.backend.message}
                            </div>
                          </div>
                          <div className="text-sm-end">
                            <span
                              className={`badge ${
                                serviceStatus.backend.status === "online"
                                  ? "bg-success"
                                  : serviceStatus.backend.status === "offline"
                                  ? "bg-danger"
                                  : "bg-secondary"
                              }`}
                            >
                              {serviceStatus.backend.status === "online"
                                ? "TERHUBUNG"
                                : serviceStatus.backend.status === "offline"
                                ? "TERPUTUS"
                                : "BELUM DICEK"}
                            </span>
                            {serviceStatus.backend.latencyMs !== null && (
                              <div className="small text-secondary mt-1">
                                Latensi: <strong>{serviceStatus.backend.latencyMs} ms</strong>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 2. SITRAK-Detect CV Engine */}
                        <div className="p-3 rounded-3 border bg-body d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
                          <div>
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-cpu-fill text-info fs-5"></i>
                              <span className="fw-bold">
                                SITRAK-Detect Computer Vision Service
                              </span>
                            </div>
                            <div className="small text-secondary mt-1">
                              Endpoint: <code>{getDetectApiUrl()}</code>
                            </div>
                            <div className="small text-muted">
                              {serviceStatus.detectCv.message}
                            </div>
                          </div>
                          <div className="text-sm-end">
                            <span
                              className={`badge ${
                                serviceStatus.detectCv.status === "online"
                                  ? "bg-success"
                                  : serviceStatus.detectCv.status === "offline"
                                  ? "bg-danger"
                                  : "bg-secondary"
                              }`}
                            >
                              {serviceStatus.detectCv.status === "online"
                                ? "TERHUBUNG"
                                : serviceStatus.detectCv.status === "offline"
                                ? "TERPUTUS"
                                : "BELUM DICEK"}
                            </span>
                            {serviceStatus.detectCv.latencyMs !== null && (
                              <div className="small text-secondary mt-1">
                                Latensi: <strong>{serviceStatus.detectCv.latencyMs} ms</strong>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 3. Google Gemini Vision AI */}
                        <div className="p-3 rounded-3 border bg-body d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
                          <div>
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-stars text-warning fs-5"></i>
                              <span className="fw-bold">
                                Google Gemini Vision AI (Cloud Detection)
                              </span>
                            </div>
                            <div className="small text-muted mt-1">
                              {serviceStatus.geminiAi.message}
                            </div>
                          </div>
                          <div className="text-sm-end">
                            <span
                              className={`badge ${
                                serviceStatus.geminiAi.status === "online" ||
                                serviceStatus.geminiAi.status === "configured"
                                  ? "bg-success"
                                  : "bg-warning text-dark"
                              }`}
                            >
                              {serviceStatus.geminiAi.status === "online" ||
                              serviceStatus.geminiAi.status === "configured"
                                ? "SIAP DIGUNAKAN"
                                : "BELUM DIATUR"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {serviceStatus.lastCheckedAt && (
                        <div className="small text-secondary mt-3 text-end">
                          <i className="bi bi-clock me-1"></i>
                          Pemeriksaan terakhir pukul {serviceStatus.lastCheckedAt}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-lg-4">
                  <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                    <div className="card-header bg-transparent border-0 pt-3 px-3">
                      <h5 className="fw-bold mb-0">
                        <i className="bi bi-terminal-fill me-2 text-primary"></i>
                        Koordinasi Pengelola Server
                      </h5>
                    </div>
                    <div className="card-body p-3">
                      <p className="small text-secondary">
                        Informasi diagnostik konfigurasi di bawah ini dapat disalin oleh{" "}
                        <strong>Administrator</strong> untuk berkoordinasi dengan tim pengelola server / jaringan:
                      </p>
                      <div className="p-2 rounded bg-dark text-light font-monospace small mb-3">
                        <div>FRONTEND_HOST: {window.location.origin}</div>
                        <div>BACKEND_API: {getBackendUrl()}</div>
                        <div>DETECT_CV_API: {getDetectApiUrl()}</div>
                        <div>
                          GEMINI_KEY: {getGeminiApiKey() ? "CONFIGURED" : "MISSING"}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm w-100"
                        onClick={() => {
                          const diagText = [
                            `[DIAGNOSTIK KONFIGURASI SERVER SITRAK]`,
                            `Waktu: ${new Date().toLocaleString("id-ID")}`,
                            `Frontend Origin: ${window.location.origin}`,
                            `Backend API: ${getBackendUrl()} (${serviceStatus.backend.status})`,
                            `Detect CV API: ${getDetectApiUrl()} (${serviceStatus.detectCv.status})`,
                            `Gemini AI Key: ${getGeminiApiKey() ? "Configured" : "Missing"}`,
                          ].join("\n");
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(diagText);
                          }
                          setAlertFeedback({
                            type: "success",
                            message:
                              "Ringkasan diagnostik server berhasil disalin ke clipboard untuk koordinasi pengelola server.",
                          });
                        }}
                      >
                        <i className="bi bi-clipboard-check me-1"></i>
                        Salin Ringkasan Diagnostik Server
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Bulk Insert Personel via File Excel */}
          <ModalImportExcelPersonel
            show={showImportPersonelModal}
            onHide={() => setShowImportPersonelModal(false)}
            onImportSuccess={(summaryMsg) => {
              setAlertFeedback({
                type: "success",
                message: summaryMsg,
              });
              getPersonel(1, personelLimit, searchPersonel);
            }}
          />

          {/* Modal Tambah Akun Pengguna Baru (PostgreSQL) */}
          <ModalTambahUser
            show={showTambahUserModal}
            onHide={() => setShowTambahUserModal(false)}
            onUserAdded={(newAcc) => {
              setAlertFeedback({
                type: "success",
                message: `Akun "${newAcc.nama}" (${newAcc.username}) berhasil disimpan ke database PostgreSQL.`,
              });
              loadUsersFromDatabase();
            }}
          />

          {/* Modal Ubah Akun / Reset Password Pengguna (PostgreSQL) */}
          <ModalEditUser
            show={showEditUserModal}
            user={selectedEditUser}
            onHide={() => {
              setShowEditUserModal(false);
              setSelectedEditUser(null);
            }}
            onUserUpdated={(updAcc) => {
              setAlertFeedback({
                type: "success",
                message: `Data akun "${updAcc.nama}" (${updAcc.username}) berhasil diperbarui di database PostgreSQL.`,
              });
              loadUsersFromDatabase();
            }}
          />
        </div>
      </div>
    </div>
  );
};
