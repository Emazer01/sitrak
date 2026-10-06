import * as React from "react";
import { Navbar } from "../component/Navbar";
import { Sidebar } from "../component/Sidebar";

export const Pengaturan = () => {
    document.title = "Pengaturan Parameter - SITRAK-AI";

    const [activeTab, setActiveTab] = React.useState("personel");
    const [searchQuery, setSearchQuery] = React.useState("");

    // 1. State Master Personel
    const [personelList, setPersonelList] = React.useState([
        { id: 1, nrp: "219800112", nama: "Lettu Inf. Pratama", pangkat: "Lettu", satuan: "Batalyon A", regu: "Tim Alfa" },
        { id: 2, nrp: "219900234", nama: "Serda Budi Santoso", pangkat: "Serda", satuan: "Batalyon B", regu: "Tim Bravo" },
        { id: 3, nrp: "219900567", nama: "Praka Dimas Setiawan", pangkat: "Praka", satuan: "Batalyon A", regu: "Tim Alfa" },
        { id: 4, nrp: "220100889", nama: "Sertu Agus Haryanto", pangkat: "Sertu", satuan: "Batalyon C", regu: "Tim Charlie" },
        { id: 5, nrp: "220200101", nama: "Koptu Hendra Gunawan", pangkat: "Koptu", satuan: "Batalyon A", regu: "Tim Bravo" },
        { id: 6, nrp: "220300455", nama: "Prada Ilham Maulana", pangkat: "Prada", satuan: "Batalyon B", regu: "Tim Alfa" },
    ]);
    const [newPersonel, setNewPersonel] = React.useState({ nrp: "", nama: "", pangkat: "Prada", satuan: "", regu: "" });

    // 2. State Master Senjata
    const [senjataList, setSenjataList] = React.useState([
        { id: 1, kode: "WPN-SS2-01", model: "Pindad SS2-V4", jenis: "Senapan Serbu", pabrikan: "PT Pindad" },
        { id: 2, kode: "WPN-G2C-02", model: "Pindad G2 Combat", jenis: "Pistol", pabrikan: "PT Pindad" },
        { id: 3, kode: "WPN-G2E-03", model: "Pindad G2 Elite", jenis: "Pistol", pabrikan: "PT Pindad" },
        { id: 4, kode: "WPN-MP5-04", model: "H&K MP5", jenis: "Submachine Gun", pabrikan: "Heckler & Koch" },
        { id: 5, kode: "WPN-SPR-05", model: "Pindad SPR-3", jenis: "Sniper / SPR", pabrikan: "PT Pindad" },
    ]);
    const [newSenjata, setNewSenjata] = React.useState({ kode: "", model: "", jenis: "Senapan Serbu", pabrikan: "PT Pindad" });

    // 3. State Master Jenis Senjata
    const [jenisSenjataList, setJenisSenjataList] = React.useState([
        { id: 1, nama: "Senapan Serbu", keterangan: "Senjata laras panjang otomatis / semi otomatis perorangan" },
        { id: 2, nama: "Pistol", keterangan: "Senjata laras pendek genggam jarak dekat" },
        { id: 3, nama: "Submachine Gun", keterangan: "Senjata otomatis kaliber pistol untuk jarak dekat - sedang" },
        { id: 4, nama: "Sniper / SPR", keterangan: "Senapan penembak runduk presisi tinggi jarak jauh" },
        { id: 5, nama: "Shotgun", keterangan: "Senjata laras licin peluru sebar untuk taktis pertempuran jarak dekat" },
    ]);
    const [newJenisSenjata, setNewJenisSenjata] = React.useState({ nama: "", keterangan: "" });

    // 4. State Master Tipe Target / Sasaran
    const [targetList, setTargetList] = React.useState([
        { id: 1, nama: "Bullseye", bentuk: "Lingkaran Konsentris", ring: 10, skorMax: 100, keterangan: "Target standar tembak presisi 10 cincin konsentris" },
        { id: 2, nama: "Siluet L1", bentuk: "Siluet Tubuh Lengkap", ring: 5, skorMax: 100, keterangan: "Target siluet badan standar penilaian militer" },
        { id: 3, nama: "Siluet Setengah Badan", bentuk: "Siluet Tubuh Atas", ring: 5, skorMax: 100, keterangan: "Target tembak taktis reaksi separuh badan" },
        { id: 4, nama: "Plat Baja / Popper", bentuk: "Plat Logam Reaksi", ring: 1, skorMax: 10, keterangan: "Target reaktif jatuh seketika saat terkena tembakan" },
        { id: 5, nama: "Custom", bentuk: "Kustom / Khusus", ring: 10, skorMax: 100, keterangan: "Target sasaran latihan dengan zona perkenaan khusus" },
    ]);
    const [newTarget, setNewTarget] = React.useState({ nama: "", bentuk: "Lingkaran Konsentris", ring: 10, skorMax: 100, keterangan: "" });

    // 5. State Master Mode Tembakan
    const [modeList, setModeList] = React.useState([
        { id: 1, nama: "Presisi", ritme: "Slow Fire", deskripsi: "Tembakan fokus ketepatan bidik dengan waktu tembak longgar" },
        { id: 2, nama: "Reaksi", ritme: "Rapid Fire", deskripsi: "Tembakan kecepatan respon perkenaan sasaran dalam batasan waktu singkat" },
        { id: 3, nama: "Double Tap", ritme: "2 Tembakan Beruntun", deskripsi: "Dua tembakan cepat berturut-turut pada satu sasaran yang sama" },
        { id: 4, nama: "Penilaian", ritme: "Ujian Standar", deskripsi: "Sesi penilaian kualifikasi berkala personel militer" },
    ]);
    const [newMode, setNewMode] = React.useState({ nama: "", ritme: "Slow Fire", deskripsi: "" });

    // 6. State Master Sikap Menembak
    const [sikapList, setSikapList] = React.useState([
        { id: 1, nama: "Berdiri", kode: "Standing", deskripsi: "Posisi berdiri tegak bertumpu pada kedua kaki" },
        { id: 2, nama: "Berlutut", kode: "Kneeling", deskripsi: "Posisi berlutut dengan satu lutut menumpu tanah" },
        { id: 3, nama: "Tiarap", kode: "Prone", deskripsi: "Posisi tubuh merebah tengkurap, paling stabil untuk tembak jauh" },
        { id: 4, deskripsi: "Kombinasi bergantian antara sikap tiarap, berlutut, dan berdiri", nama: "Kombinasi", kode: "3 Sikap" },
    ]);
    const [newSikap, setNewSikap] = React.useState({ nama: "", kode: "", deskripsi: "" });

    React.useEffect(() => {
        document.getElementById("btn-dashboard")?.classList.remove("sidebar-active");
        document.getElementById("btn-latihan")?.classList.remove("sidebar-active");
        document.getElementById("btn-pengaturan")?.classList.add("sidebar-active");

        document.getElementById("nav-btn-dashboard")?.classList.remove("sidebar-active");
        document.getElementById("nav-btn-latihan")?.classList.remove("sidebar-active");
        document.getElementById("nav-btn-pengaturan")?.classList.add("sidebar-active");
    }, []);

    // Handlers Tambah Data
    const handleAddPersonel = (e) => {
        e.preventDefault();
        if (!newPersonel.nrp || !newPersonel.nama) return;
        setPersonelList([...personelList, { ...newPersonel, id: Date.now() }]);
        setNewPersonel({ nrp: "", nama: "", pangkat: "Prada", satuan: "", regu: "" });
    };

    const handleAddSenjata = (e) => {
        e.preventDefault();
        if (!newSenjata.kode || !newSenjata.model) return;
        setSenjataList([...senjataList, { ...newSenjata, id: Date.now() }]);
        setNewSenjata({ kode: "", model: "", jenis: "Senapan Serbu", pabrikan: "PT Pindad" });
    };

    const handleAddJenisSenjata = (e) => {
        e.preventDefault();
        if (!newJenisSenjata.nama) return;
        setJenisSenjataList([...jenisSenjataList, { ...newJenisSenjata, id: Date.now() }]);
        setNewJenisSenjata({ nama: "", keterangan: "" });
    };

    const handleAddTarget = (e) => {
        e.preventDefault();
        if (!newTarget.nama) return;
        setTargetList([...targetList, { ...newTarget, id: Date.now() }]);
        setNewTarget({ nama: "", bentuk: "Lingkaran Konsentris", ring: 10, skorMax: 100, keterangan: "" });
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
            <div className="d-flex">
                <Sidebar />
                <div className="font-poppins w-100">
                    <div className="bg-body-secondary p-1">
                        Dir : sitrak/{document.URL.split("/").slice(3).join("/") || "pengaturan"}
                    </div>

                    <div className="p-2 p-md-4">
                        {/* Header Pengaturan */}
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div>
                                <h2 className="fw-bold mb-1">
                                    <i className="bi bi-sliders me-2 text-primary"></i>Pengaturan Parameter & Data Dukung
                                </h2>
                                <p className="text-secondary mb-0">
                                    Kelola master data personel, senjata, target, mode tembakan, dan sikap menembak aplikasi SITRAK
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
                                <ul className="nav nav-pills nav-fill gap-1">
                                    <li className="nav-item">
                                        <button
                                            type="button"
                                            className={`nav-link py-2 d-flex align-items-center justify-content-center gap-2 ${
                                                activeTab === "personel" ? "active shadow-sm" : "text-secondary"
                                            }`}
                                            onClick={() => { setActiveTab("personel"); setSearchQuery(""); }}
                                        >
                                            <i className="bi bi-people-fill"></i>
                                            <span>Data Personel</span>
                                            <span className="badge bg-light text-dark rounded-pill">{personelList.length}</span>
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            type="button"
                                            className={`nav-link py-2 d-flex align-items-center justify-content-center gap-2 ${
                                                activeTab === "senjata" ? "active shadow-sm" : "text-secondary"
                                            }`}
                                            onClick={() => { setActiveTab("senjata"); setSearchQuery(""); }}
                                        >
                                            <i className="bi bi-shield-fill"></i>
                                            <span>Senjata</span>
                                            <span className="badge bg-light text-dark rounded-pill">{senjataList.length}</span>
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            type="button"
                                            className={`nav-link py-2 d-flex align-items-center justify-content-center gap-2 ${
                                                activeTab === "jenisSenjata" ? "active shadow-sm" : "text-secondary"
                                            }`}
                                            onClick={() => { setActiveTab("jenisSenjata"); setSearchQuery(""); }}
                                        >
                                            <i className="bi bi-tags-fill"></i>
                                            <span>Jenis Senjata</span>
                                            <span className="badge bg-light text-dark rounded-pill">{jenisSenjataList.length}</span>
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            type="button"
                                            className={`nav-link py-2 d-flex align-items-center justify-content-center gap-2 ${
                                                activeTab === "tipeTarget" ? "active shadow-sm" : "text-secondary"
                                            }`}
                                            onClick={() => { setActiveTab("tipeTarget"); setSearchQuery(""); }}
                                        >
                                            <i className="bi bi-bullseye"></i>
                                            <span>Tipe Target</span>
                                            <span className="badge bg-light text-dark rounded-pill">{targetList.length}</span>
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            type="button"
                                            className={`nav-link py-2 d-flex align-items-center justify-content-center gap-2 ${
                                                activeTab === "modeTembak" ? "active shadow-sm" : "text-secondary"
                                            }`}
                                            onClick={() => { setActiveTab("modeTembak"); setSearchQuery(""); }}
                                        >
                                            <i className="bi bi-stopwatch-fill"></i>
                                            <span>Mode Tembakan</span>
                                            <span className="badge bg-light text-dark rounded-pill">{modeList.length}</span>
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            type="button"
                                            className={`nav-link py-2 d-flex align-items-center justify-content-center gap-2 ${
                                                activeTab === "sikapMenembak" ? "active shadow-sm" : "text-secondary"
                                            }`}
                                            onClick={() => { setActiveTab("sikapMenembak"); setSearchQuery(""); }}
                                        >
                                            <i className="bi bi-person-arms-up"></i>
                                            <span>Sikap Menembak</span>
                                            <span className="badge bg-light text-dark rounded-pill">{sikapList.length}</span>
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
                                        <div className="card-header bg-transparent border-0 pt-3 px-3 d-flex justify-content-between align-items-center">
                                            <h5 className="fw-bold mb-0">
                                                <i className="bi bi-people-fill me-2 text-primary"></i>Daftar Personel Penembak
                                            </h5>
                                            <div className="input-group input-group-sm" style={{ maxWidth: "220px" }}>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Cari nama/NRP..."
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
                                                            <th>NRP</th>
                                                            <th>Nama Lengkap</th>
                                                            <th>Pangkat</th>
                                                            <th>Satuan / Regu</th>
                                                            <th className="text-center">Aksi</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {personelList
                                                            .filter((p) => p.nama.toLowerCase().includes(searchQuery.toLowerCase()) || p.nrp.includes(searchQuery))
                                                            .map((p) => (
                                                                <tr key={p.id}>
                                                                    <td className="fw-bold text-primary">{p.nrp}</td>
                                                                    <td className="fw-semibold">{p.nama}</td>
                                                                    <td>
                                                                        <span className="badge bg-secondary-subtle text-secondary border">
                                                                            {p.pangkat}
                                                                        </span>
                                                                    </td>
                                                                    <td>{p.satuan} • {p.regu}</td>
                                                                    <td className="text-center">
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm btn-link text-danger p-0"
                                                                            onClick={() => setPersonelList(personelList.filter((x) => x.id !== p.id))}
                                                                            title="Hapus Personel"
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
                                                <i className="bi bi-person-plus-fill me-2 text-primary"></i>Tambah Personel
                                            </h5>
                                        </div>
                                        <div className="card-body p-3">
                                            <form onSubmit={handleAddPersonel}>
                                                <div className="mb-2">
                                                    <label className="form-label small fw-semibold">NRP</label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Contoh: 220400123"
                                                        value={newPersonel.nrp}
                                                        onChange={(e) => setNewPersonel({ ...newPersonel, nrp: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div className="mb-2">
                                                    <label className="form-label small fw-semibold">Nama Lengkap</label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Contoh: Kapten Inf. Arya"
                                                        value={newPersonel.nama}
                                                        onChange={(e) => setNewPersonel({ ...newPersonel, nama: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div className="mb-2">
                                                    <label className="form-label small fw-semibold">Pangkat</label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Contoh: Letda / Serda / Praka"
                                                        value={newPersonel.pangkat}
                                                        onChange={(e) => setNewPersonel({ ...newPersonel, pangkat: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div className="mb-2">
                                                    <label className="form-label small fw-semibold">Satuan</label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Contoh: Batalyon A"
                                                        value={newPersonel.satuan}
                                                        onChange={(e) => setNewPersonel({ ...newPersonel, satuan: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label small fw-semibold">Divisi / Regu</label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Contoh: Tim Alfa"
                                                        value={newPersonel.regu}
                                                        onChange={(e) => setNewPersonel({ ...newPersonel, regu: e.target.value })}
                                                    />
                                                </div>
                                                <button type="submit" className="btn btn-primary btn-sm w-100">
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
                                                <i className="bi bi-shield-fill me-2 text-primary"></i>Master Data Senjata Latihan
                                            </h5>
                                            <div className="input-group input-group-sm" style={{ maxWidth: "220px" }}>
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
                                                            <th>Kode Senjata</th>
                                                            <th>Model Senjata</th>
                                                            <th>Jenis Senjata</th>
                                                            <th>Pabrikan</th>
                                                            <th className="text-center">Aksi</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {senjataList
                                                            .filter((s) => s.model.toLowerCase().includes(searchQuery.toLowerCase()) || s.kode.includes(searchQuery))
                                                            .map((s) => (
                                                                <tr key={s.id}>
                                                                    <td className="fw-bold text-primary">{s.kode}</td>
                                                                    <td className="fw-semibold">{s.model}</td>
                                                                    <td>
                                                                        <span className="badge bg-secondary-subtle text-secondary border">
                                                                            {s.jenis}
                                                                        </span>
                                                                    </td>
                                                                    <td>{s.pabrikan}</td>
                                                                    <td className="text-center">
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm btn-link text-danger p-0"
                                                                            onClick={() => setSenjataList(senjataList.filter((x) => x.id !== s.id))}
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
                                                <i className="bi bi-plus-circle-fill me-2 text-primary"></i>Tambah Senjata
                                            </h5>
                                        </div>
                                        <div className="card-body p-3">
                                            <form onSubmit={handleAddSenjata}>
                                                <div className="mb-2">
                                                    <label className="form-label small fw-semibold">Kode Senjata</label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Contoh: WPN-SS2-06"
                                                        value={newSenjata.kode}
                                                        onChange={(e) => setNewSenjata({ ...newSenjata, kode: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div className="mb-2">
                                                    <label className="form-label small fw-semibold">Model Senjata</label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Contoh: Pindad SS2-V5 A1"
                                                        value={newSenjata.model}
                                                        onChange={(e) => setNewSenjata({ ...newSenjata, model: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div className="mb-2">
                                                    <label className="form-label small fw-semibold">Jenis Senjata</label>
                                                    <select
                                                        className="form-select form-select-sm"
                                                        value={newSenjata.jenis}
                                                        onChange={(e) => setNewSenjata({ ...newSenjata, jenis: e.target.value })}
                                                    >
                                                        {jenisSenjataList.map((j) => (
                                                            <option key={j.id} value={j.nama}>{j.nama}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label small fw-semibold">Pabrikan</label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Contoh: PT Pindad"
                                                        value={newSenjata.pabrikan}
                                                        onChange={(e) => setNewSenjata({ ...newSenjata, pabrikan: e.target.value })}
                                                    />
                                                </div>
                                                <button type="submit" className="btn btn-primary btn-sm w-100">
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
                                                <i className="bi bi-tags-fill me-2 text-primary"></i>Kategori Jenis Senjata
                                            </h5>
                                        </div>
                                        <div className="card-body p-3">
                                            <div className="table-responsive">
                                                <table className="table table-hover align-middle mb-0">
                                                    <thead className="table-light">
                                                        <tr>
                                                            <th>#</th>
                                                            <th>Nama Kategori Jenis</th>
                                                            <th>Deskripsi / Penggunaan</th>
                                                            <th className="text-center">Aksi</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {jenisSenjataList.map((j, idx) => (
                                                            <tr key={j.id}>
                                                                <td className="text-secondary">{idx + 1}</td>
                                                                <td className="fw-bold text-dark">{j.nama}</td>
                                                                <td className="text-secondary small">{j.keterangan}</td>
                                                                <td className="text-center">
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-link text-danger p-0"
                                                                        onClick={() => setJenisSenjataList(jenisSenjataList.filter((x) => x.id !== j.id))}
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
                                                <i className="bi bi-plus-circle-fill me-2 text-primary"></i>Tambah Jenis Senjata
                                            </h5>
                                        </div>
                                        <div className="card-body p-3">
                                            <form onSubmit={handleAddJenisSenjata}>
                                                <div className="mb-2">
                                                    <label className="form-label small fw-semibold">Nama Jenis Senjata</label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Contoh: Senapan Runduk Presisi"
                                                        value={newJenisSenjata.nama}
                                                        onChange={(e) => setNewJenisSenjata({ ...newJenisSenjata, nama: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label small fw-semibold">Keterangan</label>
                                                    <textarea
                                                        className="form-control form-control-sm"
                                                        rows="2"
                                                        placeholder="Deskripsi penggunaan..."
                                                        value={newJenisSenjata.keterangan}
                                                        onChange={(e) => setNewJenisSenjata({ ...newJenisSenjata, keterangan: e.target.value })}
                                                    ></textarea>
                                                </div>
                                                <button type="submit" className="btn btn-primary btn-sm w-100">
                                                    <i className="bi bi-plus-lg me-1"></i> Simpan Jenis Senjata
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
                                                <i className="bi bi-bullseye me-2 text-primary"></i>Master Tipe Sasaran / Target Tembak
                                            </h5>
                                        </div>
                                        <div className="card-body p-3">
                                            <div className="table-responsive">
                                                <table className="table table-hover align-middle mb-0">
                                                    <thead className="table-light">
                                                        <tr>
                                                            <th>Nama Target</th>
                                                            <th>Bentuk Geometri</th>
                                                            <th>Ring / Zona</th>
                                                            <th>Skor Maks.</th>
                                                            <th>Keterangan</th>
                                                            <th className="text-center">Aksi</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {targetList.map((t) => (
                                                            <tr key={t.id}>
                                                                <td className="fw-bold text-dark">{t.nama}</td>
                                                                <td>
                                                                    <span className="badge bg-secondary-subtle text-secondary border">
                                                                        {t.bentuk}
                                                                    </span>
                                                                </td>
                                                                <td>{t.ring} Zona</td>
                                                                <td className="fw-semibold text-primary">{t.skorMax} Poin</td>
                                                                <td className="text-secondary small">{t.keterangan}</td>
                                                                <td className="text-center">
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-link text-danger p-0"
                                                                        onClick={() => setTargetList(targetList.filter((x) => x.id !== t.id))}
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
                                                <i className="bi bi-plus-circle-fill me-2 text-primary"></i>Tambah Tipe Target
                                            </h5>
                                        </div>
                                        <div className="card-body p-3">
                                            <form onSubmit={handleAddTarget}>
                                                <div className="mb-2">
                                                    <label className="form-label small fw-semibold">Nama Target</label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Contoh: Siluet Reaksi Taktis"
                                                        value={newTarget.nama}
                                                        onChange={(e) => setNewTarget({ ...newTarget, nama: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div className="mb-2">
                                                    <label className="form-label small fw-semibold">Bentuk Sasaran</label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Contoh: Lingkaran / Plat Baja"
                                                        value={newTarget.bentuk}
                                                        onChange={(e) => setNewTarget({ ...newTarget, bentuk: e.target.value })}
                                                    />
                                                </div>
                                                <div className="row g-2 mb-2">
                                                    <div className="col-6">
                                                        <label className="form-label small fw-semibold">Jumlah Ring</label>
                                                        <input
                                                            type="number"
                                                            className="form-control form-control-sm"
                                                            value={newTarget.ring}
                                                            onChange={(e) => setNewTarget({ ...newTarget, ring: parseInt(e.target.value) || 1 })}
                                                        />
                                                    </div>
                                                    <div className="col-6">
                                                        <label className="form-label small fw-semibold">Skor Maksimal</label>
                                                        <input
                                                            type="number"
                                                            className="form-control form-control-sm"
                                                            value={newTarget.skorMax}
                                                            onChange={(e) => setNewTarget({ ...newTarget, skorMax: parseInt(e.target.value) || 100 })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label small fw-semibold">Keterangan</label>
                                                    <textarea
                                                        className="form-control form-control-sm"
                                                        rows="2"
                                                        placeholder="Deskripsi target..."
                                                        value={newTarget.keterangan}
                                                        onChange={(e) => setNewTarget({ ...newTarget, keterangan: e.target.value })}
                                                    ></textarea>
                                                </div>
                                                <button type="submit" className="btn btn-primary btn-sm w-100">
                                                    <i className="bi bi-plus-lg me-1"></i> Simpan Tipe Target
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
                                                <i className="bi bi-stopwatch-fill me-2 text-primary"></i>Master Mode Tembakan
                                            </h5>
                                        </div>
                                        <div className="card-body p-3">
                                            <div className="table-responsive">
                                                <table className="table table-hover align-middle mb-0">
                                                    <thead className="table-light">
                                                        <tr>
                                                            <th>Mode Tembakan</th>
                                                            <th>Karakter Ritme</th>
                                                            <th>Deskripsi Aturan</th>
                                                            <th className="text-center">Aksi</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {modeList.map((m) => (
                                                            <tr key={m.id}>
                                                                <td className="fw-bold text-dark">{m.nama}</td>
                                                                <td>
                                                                    <span className="badge bg-primary-subtle text-primary border border-primary">
                                                                        {m.ritme}
                                                                    </span>
                                                                </td>
                                                                <td className="text-secondary small">{m.deskripsi}</td>
                                                                <td className="text-center">
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-link text-danger p-0"
                                                                        onClick={() => setModeList(modeList.filter((x) => x.id !== m.id))}
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
                                                <i className="bi bi-plus-circle-fill me-2 text-primary"></i>Tambah Mode Tembakan
                                            </h5>
                                        </div>
                                        <div className="card-body p-3">
                                            <form onSubmit={handleAddMode}>
                                                <div className="mb-2">
                                                    <label className="form-label small fw-semibold">Nama Mode</label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Contoh: Tembak Reaksi Cepat"
                                                        value={newMode.nama}
                                                        onChange={(e) => setNewMode({ ...newMode, nama: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div className="mb-2">
                                                    <label className="form-label small fw-semibold">Karakter Ritme</label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Contoh: Rapid Fire / Double Tap"
                                                        value={newMode.ritme}
                                                        onChange={(e) => setNewMode({ ...newMode, ritme: e.target.value })}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label small fw-semibold">Deskripsi</label>
                                                    <textarea
                                                        className="form-control form-control-sm"
                                                        rows="2"
                                                        placeholder="Penjelasan aturan mode..."
                                                        value={newMode.deskripsi}
                                                        onChange={(e) => setNewMode({ ...newMode, deskripsi: e.target.value })}
                                                    ></textarea>
                                                </div>
                                                <button type="submit" className="btn btn-primary btn-sm w-100">
                                                    <i className="bi bi-plus-lg me-1"></i> Simpan Mode Tembakan
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
                                                <i className="bi bi-person-arms-up me-2 text-primary"></i>Master Sikap Menembak
                                            </h5>
                                        </div>
                                        <div className="card-body p-3">
                                            <div className="table-responsive">
                                                <table className="table table-hover align-middle mb-0">
                                                    <thead className="table-light">
                                                        <tr>
                                                            <th>Sikap Menembak</th>
                                                            <th>Istilah / Kode</th>
                                                            <th>Deskripsi Sikap</th>
                                                            <th className="text-center">Aksi</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {sikapList.map((s) => (
                                                            <tr key={s.id}>
                                                                <td className="fw-bold text-dark">{s.nama}</td>
                                                                <td>
                                                                    <span className="badge bg-secondary-subtle text-secondary border">
                                                                        {s.kode}
                                                                    </span>
                                                                </td>
                                                                <td className="text-secondary small">{s.deskripsi}</td>
                                                                <td className="text-center">
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-link text-danger p-0"
                                                                        onClick={() => setSikapList(sikapList.filter((x) => x.id !== s.id))}
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
                                                <i className="bi bi-plus-circle-fill me-2 text-primary"></i>Tambah Sikap Menembak
                                            </h5>
                                        </div>
                                        <div className="card-body p-3">
                                            <form onSubmit={handleAddSikap}>
                                                <div className="mb-2">
                                                    <label className="form-label small fw-semibold">Nama Sikap</label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Contoh: Berdiri Menopang"
                                                        value={newSikap.nama}
                                                        onChange={(e) => setNewSikap({ ...newSikap, nama: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div className="mb-2">
                                                    <label className="form-label small fw-semibold">Kode / Istilah</label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Contoh: Supported Standing"
                                                        value={newSikap.kode}
                                                        onChange={(e) => setNewSikap({ ...newSikap, kode: e.target.value })}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label small fw-semibold">Deskripsi</label>
                                                    <textarea
                                                        className="form-control form-control-sm"
                                                        rows="2"
                                                        placeholder="Uraian posisi dan tumpuan..."
                                                        value={newSikap.deskripsi}
                                                        onChange={(e) => setNewSikap({ ...newSikap, deskripsi: e.target.value })}
                                                    ></textarea>
                                                </div>
                                                <button type="submit" className="btn btn-primary btn-sm w-100">
                                                    <i className="bi bi-plus-lg me-1"></i> Simpan Sikap Menembak
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
