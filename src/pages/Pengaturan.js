import * as React from "react";
import axios from "axios";
import { Navbar } from "../component/Navbar";
import { Sidebar } from "../component/Sidebar";

export const Pengaturan = () => {
  document.title = "Pengaturan Parameter - SITRAK-AI";

  const [activeTab, setActiveTab] = React.useState("personel");
  const [searchQuery, setSearchQuery] = React.useState("");

  // State Pagination & Search Personel
  const [personelPage, setPersonelPage] = React.useState(1);
  const [personelLimit] = React.useState(10);
  const [personelTotal, setPersonelTotal] = React.useState(0);
  const [personelTotalPages, setPersonelTotalPages] = React.useState(1);
  const [personelLoading, setPersonelLoading] = React.useState(false);
  const [searchPersonel, setSearchPersonel] = React.useState("");

  // 1. State Master Personel
  const [personelList, setPersonelList] = React.useState([
    {
      id: 1,
      nrp: "219800112",
      nama: "Lettu Inf. Pratama",
      pangkat: "Lettu",
      satuan: "Batalyon A",
      regu: "Tim Alfa",
    },
    {
      id: 2,
      nrp: "219900234",
      nama: "Serda Budi Santoso",
      pangkat: "Serda",
      satuan: "Batalyon B",
      regu: "Tim Bravo",
    },
    {
      id: 3,
      nrp: "219900567",
      nama: "Praka Dimas Setiawan",
      pangkat: "Praka",
      satuan: "Batalyon A",
      regu: "Tim Alfa",
    },
    {
      id: 4,
      nrp: "220100889",
      nama: "Sertu Agus Haryanto",
      pangkat: "Sertu",
      satuan: "Batalyon C",
      regu: "Tim Charlie",
    },
    {
      id: 5,
      nrp: "220200101",
      nama: "Koptu Hendra Gunawan",
      pangkat: "Koptu",
      satuan: "Batalyon A",
      regu: "Tim Bravo",
    },
    {
      id: 6,
      nrp: "220300455",
      nama: "Prada Ilham Maulana",
      pangkat: "Prada",
      satuan: "Batalyon B",
      regu: "Tim Alfa",
    },
  ]);
  const [newPersonel, setNewPersonel] = React.useState({
    nrp: "",
    nama: "",
    pangkat: "Prada",
    satuan: "",
    regu: "",
  });

  // 2. State Master Senjata
  const [senjataList, setSenjataList] = React.useState([
    {
      id: 1,
      kode: "WPN-SS2-01",
      model: "Pindad SS2-V4",
      jenis: "Senapan Serbu",
      pabrikan: "PT Pindad",
    },
    {
      id: 2,
      kode: "WPN-G2C-02",
      model: "Pindad G2 Combat",
      jenis: "Pistol",
      pabrikan: "PT Pindad",
    },
    {
      id: 3,
      kode: "WPN-G2E-03",
      model: "Pindad G2 Elite",
      jenis: "Pistol",
      pabrikan: "PT Pindad",
    },
    {
      id: 4,
      kode: "WPN-MP5-04",
      model: "H&K MP5",
      jenis: "Submachine Gun",
      pabrikan: "Heckler & Koch",
    },
    {
      id: 5,
      kode: "WPN-SPR-05",
      model: "Pindad SPR-3",
      jenis: "Sniper / SPR",
      pabrikan: "PT Pindad",
    },
  ]);
  const [newSenjata, setNewSenjata] = React.useState({
    kode: "",
    model: "",
    jenis: "Senapan Serbu",
    pabrikan: "PT Pindad",
  });

  // 3. State Master Jenis Senjata
  const [jenisSenjataList, setJenisSenjataList] = React.useState([
    {
      id: 1,
      nama: "Senapan Serbu",
      keterangan: "Senjata laras panjang otomatis / semi otomatis perorangan",
    },
    {
      id: 2,
      nama: "Pistol",
      keterangan: "Senjata laras pendek genggam jarak dekat",
    },
    {
      id: 3,
      nama: "Submachine Gun",
      keterangan: "Senjata otomatis kaliber pistol untuk jarak dekat - sedang",
    },
    {
      id: 4,
      nama: "Sniper / SPR",
      keterangan: "Senapan penembak runduk presisi tinggi jarak jauh",
    },
    {
      id: 5,
      nama: "Shotgun",
      keterangan:
        "Senjata laras licin peluru sebar untuk taktis pertempuran jarak dekat",
    },
  ]);
  const [newJenisSenjata, setNewJenisSenjata] = React.useState({
    nama: "",
    keterangan: "",
  });

  // 4. State Master Tipe Target / Sasaran
  const [targetList, setTargetList] = React.useState([
    {
      id: 1,
      nama: "Bullseye",
      bentuk: "Lingkaran Konsentris",
      ring: 10,
      skorMax: 100,
      keterangan: "Target standar tembak presisi 10 cincin konsentris",
    },
    {
      id: 2,
      nama: "Siluet L1",
      bentuk: "Siluet Tubuh Lengkap",
      ring: 5,
      skorMax: 100,
      keterangan: "Target siluet badan standar penilaian militer",
    },
    {
      id: 3,
      nama: "Siluet Setengah Badan",
      bentuk: "Siluet Tubuh Atas",
      ring: 5,
      skorMax: 100,
      keterangan: "Target tembak taktis reaksi separuh badan",
    },
    {
      id: 4,
      nama: "Plat Baja / Popper",
      bentuk: "Plat Logam Reaksi",
      ring: 1,
      skorMax: 10,
      keterangan: "Target reaktif jatuh seketika saat terkena tembakan",
    },
    {
      id: 5,
      nama: "Custom",
      bentuk: "Kustom / Khusus",
      ring: 10,
      skorMax: 100,
      keterangan: "Target sasaran latihan dengan zona perkenaan khusus",
    },
  ]);
  const [newTarget, setNewTarget] = React.useState({
    nama: "",
    bentuk: "Lingkaran Konsentris",
    ring: 10,
    skorMax: 100,
    keterangan: "",
  });

  // 5. State Master Mode Tembakan
  const [modeList, setModeList] = React.useState([
    {
      id: 1,
      nama: "Presisi",
      ritme: "Slow Fire",
      deskripsi: "Tembakan fokus ketepatan bidik dengan waktu tembak longgar",
    },
    {
      id: 2,
      nama: "Reaksi",
      ritme: "Rapid Fire",
      deskripsi:
        "Tembakan kecepatan respon perkenaan sasaran dalam batasan waktu singkat",
    },
    {
      id: 3,
      nama: "Double Tap",
      ritme: "2 Tembakan Beruntun",
      deskripsi:
        "Dua tembakan cepat berturut-turut pada satu sasaran yang sama",
    },
    {
      id: 4,
      nama: "Penilaian",
      ritme: "Ujian Standar",
      deskripsi: "Sesi penilaian kualifikasi berkala personel militer",
    },
  ]);
  const [newMode, setNewMode] = React.useState({
    nama: "",
    ritme: "Slow Fire",
    deskripsi: "",
  });

  // 6. State Master Sikap Menembak
  const [sikapList, setSikapList] = React.useState([
    {
      id: 1,
      nama: "Berdiri",
      kode: "Standing",
      deskripsi: "Posisi berdiri tegak bertumpu pada kedua kaki",
    },
    {
      id: 2,
      nama: "Berlutut",
      kode: "Kneeling",
      deskripsi: "Posisi berlutut dengan satu lutut menumpu tanah",
    },
    {
      id: 3,
      nama: "Tiarap",
      kode: "Prone",
      deskripsi:
        "Posisi tubuh merebah tengkurap, paling stabil untuk tembak jauh",
    },
    {
      id: 4,
      deskripsi:
        "Kombinasi bergantian antara sikap tiarap, berlutut, dan berdiri",
      nama: "Kombinasi",
      kode: "3 Sikap",
    },
  ]);
  const [newSikap, setNewSikap] = React.useState({
    nama: "",
    kode: "",
    deskripsi: "",
  });

  // Fungsi memanggil API /atribut dengan metode GET (tanpa personel)
  const getAtribut = async () => {
    var atribut = {};
    await axios
      .get(`${process.env.REACT_APP_BACKEND_URL}/atribut`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      })
      .then(function (response) {
        if (response.status === 200 || response.status == 200) {
          atribut = response.data;
          console.log(response.headers);
          console.log(response.data);
          // Update state berdasarkan data atribut yang didapat (jenis_senjata, mode_tembakan, sikap_menembak, tipe_target, senjata)
          if (atribut.jenis_senjata && Array.isArray(atribut.jenis_senjata)) {
            setJenisSenjataList(atribut.jenis_senjata);
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
        }
      })
      .catch(function (error) {
        console.log(error);
      });
    return atribut;
  };

  // Fungsi memanggil API /personel dengan metode GET, pagination, dan filter pencarian
  // Contoh pemanggilan:
  // - Halaman 1 (10 data pertama): GET /personel?page=1&limit=10
  // - Halaman 2 (10 data berikutnya): GET /personel?page=2&limit=10
  // - Pencarian Nama/NRP: GET /personel?page=1&limit=10&search=budi
  const getPersonel = async (page = 1, limit = 10, search = "") => {
    setPersonelLoading(true);
    var personelData = [];
    try {
      let url = `${process.env.REACT_APP_BACKEND_URL}/personel?page=${page}&limit=${limit}`;
      if (search && search.trim() !== "") {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }

      await axios
        .get(url, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        })
        .then(function (response) {
          if (response.status === 200 || response.status == 200) {
            console.log("Response GET /personel:", response.data);
            const resData = response.data;
            personelData = resData;

            // Mendukung berbagai bentuk response (array langsung, atau paginated wrapper { data: [...], total: ... })
            if (Array.isArray(resData)) {
              setPersonelList(resData);
              console.log(resData)
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
        })
        .catch(function (error) {
          console.log("Error GET /personel:", error);
        });
    } catch (error) {
      console.log(error);
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
  }, []);

  // Effect untuk menjalankan getPersonel saat page atau searchPersonel berubah
  React.useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      getPersonel(personelPage, personelLimit, searchPersonel);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [personelPage, searchPersonel, personelLimit]);

  // Handlers Tambah Data
  const handleAddPersonel = (e) => {
    e.preventDefault();
    if (!newPersonel.nrp || !newPersonel.nama) return;
    setPersonelList([
      {
        id: Date.now(),
        nrp: newPersonel.nrp,
        nama_personel_penembak: newPersonel.nama,
        nama: newPersonel.nama,
        satuan: newPersonel.satuan || "",
      },
      ...personelList,
    ]);
    setPersonelTotal((prev) => prev + 1);
    setNewPersonel({
      nrp: "",
      nama: "",
      satuan: "",
    });
  };

  const handleAddSenjata = (e) => {
    e.preventDefault();
    if (!newSenjata.kode || !newSenjata.model) return;
    setSenjataList([...senjataList, { ...newSenjata, id: Date.now() }]);
    setNewSenjata({
      kode: "",
      model: "",
      jenis: "Senapan Serbu",
      pabrikan: "PT Pindad",
    });
  };

  const handleAddJenisSenjata = (e) => {
    e.preventDefault();
    if (!newJenisSenjata.nama) return;
    setJenisSenjataList([
      ...jenisSenjataList,
      { ...newJenisSenjata, id: Date.now() },
    ]);
    setNewJenisSenjata({ nama: "", keterangan: "" });
  };

  const handleAddTarget = (e) => {
    e.preventDefault();
    if (!newTarget.nama) return;
    setTargetList([...targetList, { ...newTarget, id: Date.now() }]);
    setNewTarget({
      nama: "",
      bentuk: "Lingkaran Konsentris",
      ring: 10,
      skorMax: 100,
      keterangan: "",
    });
  };

  const handleAddMode = (e) => {
    e.preventDefault();
    if (!newMode.nama) return;
    setModeList([...modeList, { ...newMode, id: Date.now() }]);
    setNewMode({ nama: "", ritme: "Slow Fire", deskripsi: "" });
  };

  const handleAddSikap = (e) => {
    e.preventDefault();
    if (!newSikap.nama) return;
    setSikapList([...sikapList, { ...newSikap, id: Date.now() }]);
    setNewSikap({ nama: "", kode: "", deskripsi: "" });
  };

  return (
    <div>
      <Navbar />
      <div className="d-flex min-vh-100">
        <Sidebar />
        <div className="font-poppins w-100 overflow-x-hidden">
          <div className="bg-body-secondary p-1 small text-truncate">
            Dir : sitrak/
            {document.URL.split("/").slice(3).join("/") || "pengaturan"}
          </div>

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
                </ul>
              </div>
            </div>

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
                      <div
                        className="input-group input-group-sm"
                        style={{ maxWidth: "260px" }}
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
                                  Memuat data personel...
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
                                        setPersonelList(
                                          personelList.filter(
                                            (x) =>
                                              (x.id_personel_penembak || x.id) !==
                                              (p.id_personel_penembak || p.id)
                                          )
                                        )
                                      }
                                      title="Hapus Personel"
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
                    <div className="card-header bg-transparent border-0 pt-3 px-3">
                      <h5 className="fw-bold mb-0">
                        <i className="bi bi-person-plus-fill me-2 text-primary"></i>
                        Tambah Personel
                      </h5>
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
                        <div className="mb-2">
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
                        >
                          <i className="bi bi-plus-lg me-1"></i> Simpan Personel
                        </button>
                      </form>
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
                              <th>Pabrikan</th>
                              <th className="text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {senjataList.map((s,idx) => (
                                <tr key={s.id}>
                                  <td className="fw-bold text-secondary">{idx + 1}</td>
                                  <td className="fw-semibold">{s.model_senjata}</td>
                                  <td>
                                    <span className="badge bg-secondary-subtle text-secondary border">
                                      {s.nama_jenis_senjata}
                                    </span>
                                  </td>
                                  <td>{s.pabrikan}</td>
                                  <td className="text-center">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-link text-danger p-0"
                                      onClick={() =>
                                        setSenjataList(
                                          senjataList.filter(
                                            (x) => x.id !== s.id,
                                          ),
                                        )
                                      }
                                      title="Hapus Senjata"
                                    >
                                      <i className="bi bi-trash"></i>
                                    </button>
                                  </td>
                                </tr>
                              ))}
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
                            value={newSenjata.jenis}
                            onChange={(e) =>
                              setNewSenjata({
                                ...newSenjata,
                                jenis: e.target.value,
                              })
                            }
                          >
                            {jenisSenjataList.map((j) => (
                              <option key={j.id} value={j.id_jenis_senjata}>
                                {j.nama_jenis_senjata}
                              </option>
                            ))}
                          </select>
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
                        >
                          <i className="bi bi-plus-lg me-1"></i> Simpan Senjata
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
                            {jenisSenjataList.map((j, idx) => (
                              <tr key={j.id}>
                                <td className="text-secondary">{idx + 1}</td>
                                <td className="fw-bold">{j.nama_jenis_senjata}</td>
                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-link text-danger p-0"
                                    onClick={() =>
                                      setJenisSenjataList(
                                        jenisSenjataList.filter(
                                          (x) => x.id !== j.id,
                                        ),
                                      )
                                    }
                                    title="Hapus"
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))}
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
                        <div className="mb-2">
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
                        >
                          <i className="bi bi-plus-lg me-1"></i> Simpan Jenis
                          Senjata
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
                            {targetList.map((t, idx) => (
                              <tr key={t.id}>
                                <td className="text-secondary">{idx + 1}</td>
                                <td className="fw-bold">{t.nama_tipe_target}</td>
                                
                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-link text-danger p-0"
                                    onClick={() =>
                                      setTargetList(
                                        targetList.filter((x) => x.id !== t.id),
                                      )
                                    }
                                    title="Hapus"
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))}
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
                        <div className="mb-2">
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
                        >
                          <i className="bi bi-plus-lg me-1"></i> Simpan Tipe
                          Target
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
                            {modeList.map((m,idx) => (
                              <tr key={m.id}>
                                <td className="text-secondary">{idx + 1}</td>
                                <td className="fw-bold">{m.nama_mode_tembakan}</td>
                                
                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-link text-danger p-0"
                                    onClick={() =>
                                      setModeList(
                                        modeList.filter((x) => x.id !== m.id),
                                      )
                                    }
                                    title="Hapus"
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))}
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
                        <div className="mb-2">
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
                        >
                          <i className="bi bi-plus-lg me-1"></i> Simpan Mode
                          Tembakan
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
                            {sikapList.map((s,idx) => (
                              <tr key={s.id}>
                                <td className="text-secondary">{idx + 1}</td>
                                <td className="fw-bold">{s.nama_sikap_menembak}</td>
                                
                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-link text-danger p-0"
                                    onClick={() =>
                                      setSikapList(
                                        sikapList.filter((x) => x.id !== s.id),
                                      )
                                    }
                                    title="Hapus"
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))}
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
                        <div className="mb-2">
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
                        >
                          <i className="bi bi-plus-lg me-1"></i> Simpan Sikap
                          Menembak
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
