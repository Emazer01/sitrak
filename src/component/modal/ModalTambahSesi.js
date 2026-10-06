import React, { useState } from "react";

export const ModalTambahSesi = ({ modalId = "modalTambahSesi", onStartSession }) => {
    // 1. Informasi Sesi & Lokasi
    const [namaSesi, setNamaSesi] = useState("Latihan Presisi - Gelombang 1");
    const [namaTempatMenembak, setNamaTempatMenembak] = useState("Lapangan Tembak Utama 100m");

    // 2. Jumlah Jalur
    const [jumlahJalur, setJumlahJalur] = useState(3);

    // 3. Daftar Master Personel yang Sudah Ada
    const masterPersonel = [
        { id: 1, nrp: "219800112", nama: "Lettu Inf. Pratama", pangkat: "Lettu", satuan: "Batalyon A / Tim Alfa" },
        { id: 2, nrp: "219900234", nama: "Serda Budi Santoso", pangkat: "Serda", satuan: "Batalyon B / Tim Bravo" },
        { id: 3, nrp: "219900567", nama: "Praka Dimas Setiawan", pangkat: "Praka", satuan: "Batalyon A / Tim Alfa" },
        { id: 4, nrp: "220100889", nama: "Sertu Agus Haryanto", pangkat: "Sertu", satuan: "Batalyon C / Tim Charlie" },
        { id: 5, nrp: "220200101", nama: "Koptu Hendra Gunawan", pangkat: "Koptu", satuan: "Batalyon A / Tim Bravo" },
        { id: 6, nrp: "220300455", nama: "Prada Ilham Maulana", pangkat: "Prada", satuan: "Batalyon B / Tim Alfa" },
        { id: 7, nrp: "219600788", nama: "Serka Ridwan Kamil", pangkat: "Serka", satuan: "Batalyon C / Tim Delta" },
        { id: 8, nrp: "220000312", nama: "Letda Inf. Fajar Nugraha", pangkat: "Letda", satuan: "Batalyon A / Tim Charlie" },
    ];

    // Personel yang dipilih ikut menembak
    const [selectedPersonelIds, setSelectedPersonelIds] = useState([1, 2, 3, 4, 5, 6, 7]);
    const [searchPersonel, setSearchPersonel] = useState("");

    // 4. Konfigurasi Babak & Peluru
    const [jumlahBabak, setJumlahBabak] = useState(2);
    const [babakList, setBabakList] = useState([
        { id: 1, nomor: 1, jenis: "Perkenaan (Koreksi)", peluru: 3 },
        { id: 2, nomor: 2, jenis: "Penilaian", peluru: 10 },
    ]);

    // 5. Jenis Senjata (Tanpa Kaliber)
    const [jenisSenjata, setJenisSenjata] = useState("Pindad SS2-V4");

    // 6. Jarak, Sikap Menembak, Tipe Sasaran
    const [jarakTembak, setJarakTembak] = useState(25);
    const [sikapMenembak, setSikapMenembak] = useState("Berdiri");
    const [tipeSasaran, setTipeSasaran] = useState("Bullseye");

    // Perhitungan Jalur & Gelombang Otomatis
    const totalJalurAktif = Math.max(1, parseInt(jumlahJalur) || 1);

    const alokasiPersonel = selectedPersonelIds
        .map((id) => masterPersonel.find((p) => p.id === id))
        .filter(Boolean)
        .map((p, index) => {
            const gelombang = Math.floor(index / totalJalurAktif) + 1;
            const laneNo = (index % totalJalurAktif) + 1;
            return {
                ...p,
                gelombang,
                lane: `Lane ${String(laneNo).padStart(2, "0")}`,
            };
        });

    const totalGelombang = Math.ceil(alokasiPersonel.length / totalJalurAktif) || 1;

    // Toggle pilih personel
    const togglePersonelSelection = (id) => {
        if (selectedPersonelIds.includes(id)) {
            setSelectedPersonelIds(selectedPersonelIds.filter((pId) => pId !== id));
        } else {
            setSelectedPersonelIds([...selectedPersonelIds, id]);
        }
    };

    const pilihSemuaPersonel = () => {
        setSelectedPersonelIds(masterPersonel.map((p) => p.id));
    };

    const kosongkanPersonel = () => {
        setSelectedPersonelIds([]);
    };

    // Filter daftar master personel
    const filteredMaster = masterPersonel.filter(
        (p) =>
            p.nama.toLowerCase().includes(searchPersonel.toLowerCase()) ||
            p.nrp.includes(searchPersonel) ||
            p.satuan.toLowerCase().includes(searchPersonel.toLowerCase())
    );

    // Handler Babak
    const handleJumlahBabakChange = (e) => {
        const val = Math.max(1, parseInt(e.target.value) || 1);
        setJumlahBabak(val);
        setBabakList((prev) => {
            const newList = [...prev];
            if (val > newList.length) {
                for (let i = newList.length; i < val; i++) {
                    newList.push({
                        id: i + 1,
                        nomor: i + 1,
                        jenis: i === 0 ? "Perkenaan (Koreksi)" : "Penilaian",
                        peluru: i === 0 ? 3 : 10,
                    });
                }
            } else {
                return newList.slice(0, val);
            }
            return newList;
        });
    };

    const handleBabakFieldChange = (index, field, value) => {
        const updated = [...babakList];
        updated[index][field] = value;
        setBabakList(updated);
    };

    const tambahBabakManual = () => {
        const newCount = babakList.length + 1;
        setJumlahBabak(newCount);
        setBabakList([
            ...babakList,
            {
                id: newCount,
                nomor: newCount,
                jenis: "Penilaian",
                peluru: 10,
            },
        ]);
    };

    const hapusBabakManual = (index) => {
        if (babakList.length <= 1) return;
        const updated = babakList.filter((_, i) => i !== index);
        setBabakList(updated);
        setJumlahBabak(updated.length);
    };

    const totalPeluruPerPersonel = babakList.reduce(
        (acc, curr) => acc + (parseInt(curr.peluru) || 0),
        0
    );

    const handleStartSession = () => {
        const sessionData = {
            namaSesi,
            namaTempatMenembak,
            jumlahJalur: totalJalurAktif,
            totalGelombang,
            personel: alokasiPersonel,
            babak: babakList,
            totalPeluruPerPersonel,
            senjata: jenisSenjata,
            jarak: jarakTembak,
            sikap: sikapMenembak,
            sasaran: tipeSasaran,
        };

        if (onStartSession) {
            onStartSession(sessionData);
        } else {
            alert(
                `Sesi Latihan "${namaSesi}" di ${namaTempatMenembak} siap dimulai dengan ${alokasiPersonel.length} penembak terbagi dalam ${totalGelombang} gelombang pada ${totalJalurAktif} jalur.`
            );
        }
    };

    return (
        <div
            className="modal fade"
            id={modalId}
            tabIndex="-1"
            aria-labelledby={`${modalId}Label`}
            aria-hidden="true"
        >
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header bg-dark text-white">
                        <h5 className="modal-title" id={`${modalId}Label`}>
                            <i className="bi bi-crosshair me-2 text-warning"></i>
                            Konfigurasi & Mulai Sesi Latihan Menembak
                        </h5>
                        <button
                            type="button"
                            className="btn-close btn-close-white"
                            data-bs-dismiss="modal"
                            aria-label="Close"
                        ></button>
                    </div>
                    <div className="modal-body p-4">
                        <form id="formSesiLatihan">
                            {/* 1. NAMA SESI & TEMPAT MENEMBAK */}
                            <div className="card border-0 p-3 mb-4">
                                <h6 className="fw-bold text-primary mb-3">
                                    <i className="bi bi-info-circle-fill me-2"></i>
                                    1. Informasi Sesi & Lokasi Lapangan Tembak
                                </h6>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">
                                            Nama Sesi / Kode Latihan <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={namaSesi}
                                            onChange={(e) => setNamaSesi(e.target.value)}
                                            placeholder="Contoh: Latihan Tembak Reaksi Batalyon A"
                                            required
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">
                                            Nama Tempat Menembak / Lapangan <span className="text-danger">*</span>
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text">
                                                <i className="bi bi-geo-alt-fill text-danger"></i>
                                            </span>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={namaTempatMenembak}
                                                onChange={(e) => setNamaTempatMenembak(e.target.value)}
                                                placeholder="Contoh: Lapangan Tembak 100m Sudirman"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. JALUR & MEKANISME GELOMBANG OTOMATIS */}
                            <div className="card border-0 p-3 mb-4">
                                <h6 className="fw-bold text-primary mb-3">
                                    <i className="bi bi-layout-split me-2"></i>
                                    2. Kapasitas Jalur (Lane) & Mekanisme Gelombang
                                </h6>
                                <div className="row g-3 align-items-center">
                                    <div className="col-md-5">
                                        <label className="form-label fw-semibold">
                                            Jumlah Jalur (Lane) yang Digunakan <span className="text-danger">*</span>
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text">
                                                <i className="bi bi-border-width"></i>
                                            </span>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={jumlahJalur}
                                                onChange={(e) =>
                                                    setJumlahJalur(Math.max(1, parseInt(e.target.value) || 1))
                                                }
                                                min="1"
                                                max="20"
                                            />
                                            <span className="input-group-text">Jalur Aktif</span>
                                        </div>
                                    </div>
                                    <div className="col-md-7">
                                        <div className="p-3  rounded-3 border">
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <span className="small text-secondary fw-semibold">
                                                    Status Pembagian Gelombang Otomatis:
                                                </span>
                                                <span className="badge bg-primary px-2 py-1">
                                                    {totalGelombang} Gelombang Terbentuk
                                                </span>
                                            </div>
                                            <p className="mb-0 small text-muted">
                                                Kapasitas <strong>{totalJalurAktif} jalur</strong> per gelombang. Total{" "}
                                                <strong>{alokasiPersonel.length} personel</strong> otomatis terbagi ke dalam{" "}
                                                <strong>{totalGelombang} gelombang</strong> secara berurutan.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. PILIH PERSONEL DARI DAFTAR YANG SUDAH ADA */}
                            <div className="card border-0 p-3 mb-4">
                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
                                    <div>
                                        <h6 className="fw-bold text-primary mb-0">
                                            <i className="bi bi-people-fill me-2"></i>
                                            3. Pilih Personel yang Ikut Menembak
                                        </h6>
                                        <small className="text-secondary">
                                            Pilih personel dari daftar master. Lane & gelombang ditentukan otomatis.
                                        </small>
                                    </div>
                                    <div className="d-flex gap-2 align-items-center">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={pilihSemuaPersonel}
                                        >
                                            Pilih Semua ({masterPersonel.length})
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-secondary"
                                            onClick={kosongkanPersonel}
                                        >
                                            Kosongkan
                                        </button>
                                    </div>
                                </div>

                                {/* Selector Checkbox Personel */}
                                <div className=" p-3 rounded-2 border mb-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <label className="form-label fw-semibold mb-0 small">
                                            Daftar Personel Tersedia:
                                        </label>
                                        <div className="input-group input-group-sm" style={{ maxWidth: "240px" }}>
                                            <span className="input-group-text border-end-0">
                                                <i className="bi bi-search"></i>
                                            </span>
                                            <input
                                                type="text"
                                                className="form-control border-start-0"
                                                placeholder="Cari nama / NRP..."
                                                value={searchPersonel}
                                                onChange={(e) => setSearchPersonel(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="row g-2" style={{ maxHeight: "160px", overflowY: "auto" }}>
                                        {filteredMaster.map((p) => {
                                            const isSelected = selectedPersonelIds.includes(p.id);
                                            return (
                                                <div key={p.id} className="col-12 col-md-6 col-lg-3">
                                                    <div
                                                        className={`p-2 rounded-2 border d-flex align-items-center cursor-pointer transition ${
                                                            isSelected
                                                                ? "border-primary bg-primary-subtle text-primary"
                                                                : "border-light-subtle text-dark"
                                                        }`}
                                                        style={{ cursor: "pointer" }}
                                                        onClick={() => togglePersonelSelection(p.id)}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input me-2 mt-0"
                                                            checked={isSelected}
                                                            onChange={() => {}}
                                                        />
                                                        <div className="small text-truncate">
                                                            <div className="fw-bold text-truncate">{p.nama}</div>
                                                            <div className="text-secondary" style={{ fontSize: "11px" }}>
                                                                NRP: {p.nrp} • {p.pangkat}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Tabel Hasil Penentuan Lane & Gelombang Otomatis */}
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <label className="form-label fw-semibold mb-0 small">
                                        Alokasi Gelombang & Jalur Otomatis ({alokasiPersonel.length} Personel Terpilih):
                                    </label>
                                    <span className="badge bg-secondary-subtle text-secondary border">
                                        Sistem Alokasi Otomatis
                                    </span>
                                </div>

                                {alokasiPersonel.length === 0 ? (
                                    <div className="alert alert-warning py-2 mb-0 small">
                                        <i className="bi bi-exclamation-triangle me-1"></i> Belum ada personel yang dipilih. Silakan centang personel di atas.
                                    </div>
                                ) : (
                                    <div className="table-responsive  rounded-2 border">
                                        <table className="table table-sm table-hover align-middle mb-0">
                                            <thead className="">
                                                <tr>
                                                    <th style={{ width: "16%" }}>Gelombang (Otomatis)</th>
                                                    <th style={{ width: "14%" }}>Jalur (Lane)</th>
                                                    <th style={{ width: "35%" }}>Nama Personel</th>
                                                    <th style={{ width: "25%" }}>NRP / Satuan</th>
                                                    <th style={{ width: "10%" }} className="text-center">Batal</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {alokasiPersonel.map((p) => (
                                                    <tr key={p.id}>
                                                        <td>
                                                            <span
                                                                className={`badge px-2 py-1 ${
                                                                    p.gelombang % 3 === 1
                                                                        ? "bg-primary text-white"
                                                                        : p.gelombang % 3 === 2
                                                                        ? "bg-warning text-dark"
                                                                        : "bg-success text-white"
                                                                }`}
                                                            >
                                                                <i className="bi bi-layers me-1"></i>Gelombang {p.gelombang}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className="badge bg-dark-subtle text-secondary border px-2 py-1">
                                                                {p.lane}
                                                            </span>
                                                        </td>
                                                        <td className="fw-semibold">{p.nama}</td>
                                                        <td className="small text-secondary">
                                                            {p.nrp} • {p.satuan}
                                                        </td>
                                                        <td className="text-center">
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-link text-danger p-0"
                                                                onClick={() => togglePersonelSelection(p.id)}
                                                                title="Hapus dari sesi"
                                                            >
                                                                <i className="bi bi-x-circle-fill"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* 4. KONFIGURASI BABAK & PELURU */}
                            <div className="card border-0 p-3 mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6 className="fw-bold text-primary mb-0">
                                        <i className="bi bi-layers-fill me-2"></i>
                                        4. Konfigurasi Babak & Peluru
                                    </h6>
                                    <div className="d-flex align-items-center gap-2">
                                        <label className="form-label fw-semibold mb-0 small text-secondary">
                                            Jumlah Babak:
                                        </label>
                                        <input
                                            type="number"
                                            className="form-control form-control-sm text-center"
                                            style={{ width: "70px" }}
                                            value={jumlahBabak}
                                            onChange={handleJumlahBabakChange}
                                            min="1"
                                            max="10"
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={tambahBabakManual}
                                        >
                                            <i className="bi bi-plus-lg me-1"></i> Tambah Babak
                                        </button>
                                    </div>
                                </div>

                                <div className="table-responsive  rounded-2 border mb-2">
                                    <table className="table table-sm table-borderless align-middle mb-0">
                                        <thead className="border-bottom">
                                            <tr>
                                                <th style={{ width: "15%" }}>Babak</th>
                                                <th style={{ width: "45%" }}>Jenis Babak</th>
                                                <th style={{ width: "30%" }}>Peluru Per Personel</th>
                                                <th style={{ width: "10%" }} className="text-center">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {babakList.map((b, idx) => (
                                                <tr key={idx} className="border-bottom">
                                                    <td className="fw-semibold ps-3">
                                                        <span className="badge bg-primary-subtle text-primary border border-primary px-2 py-1">
                                                            Babak {idx + 1}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <select
                                                            className="form-select form-select-sm"
                                                            value={b.jenis}
                                                            onChange={(e) =>
                                                                handleBabakFieldChange(idx, "jenis", e.target.value)
                                                            }
                                                        >
                                                            <option value="Perkenaan (Koreksi)">
                                                                Tembak Perkenaan / Koreksi
                                                            </option>
                                                            <option value="Penilaian">
                                                                Tembak Penilaian (Scoring)
                                                            </option>
                                                            <option value="Pengelompokan">
                                                                Tembak Pengelompokan (Grouping)
                                                            </option>
                                                            <option value="Reaksi / Cepat">
                                                                Tembak Reaksi / Cepat (Rapid Fire)
                                                            </option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <div className="input-group input-group-sm">
                                                            <input
                                                                type="number"
                                                                className="form-control"
                                                                value={b.peluru}
                                                                onChange={(e) =>
                                                                    handleBabakFieldChange(
                                                                        idx,
                                                                        "peluru",
                                                                        Math.max(1, parseInt(e.target.value) || 1)
                                                                    )
                                                                }
                                                                min="1"
                                                            />
                                                            <span className="input-group-text">butir</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        {babakList.length > 1 && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-link text-danger p-0"
                                                                onClick={() => hapusBabakManual(idx)}
                                                                title="Hapus Babak"
                                                            >
                                                                <i className="bi bi-trash"></i>
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="d-flex justify-content-between align-items-center px-1">
                                    <small className="text-secondary">
                                        Amunisi dihitung otomatis per babak untuk setiap personel.
                                    </small>
                                    <span className="badge bg-dark text-white px-3 py-2">
                                        Total Amunisi / Personel: {totalPeluruPerPersonel} Butir
                                    </span>
                                </div>
                            </div>

                            {/* 5. JENIS SENJATA (TANPA KALIBER) */}
                            <div className="card border-0 p-3 mb-4">
                                <h6 className="fw-bold text-primary mb-3">
                                    <i className="bi bi-shield-fill me-2"></i>
                                    5. Jenis Senjata
                                </h6>
                                <div>
                                    <label className="form-label fw-semibold">
                                        Pilih Jenis / Model Senjata <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        className="form-select"
                                        value={jenisSenjata}
                                        onChange={(e) => setJenisSenjata(e.target.value)}
                                    >
                                        <option value="Pindad SS2-V4">Pindad SS2-V4 (Senapan Serbu)</option>
                                        <option value="Pindad G2 Combat">Pindad G2 Combat (Pistol)</option>
                                        <option value="Pindad G2 Elite">Pindad G2 Elite (Pistol)</option>
                                        <option value="H&K MP5">H&K MP5 (Submachine Gun)</option>
                                        <option value="Pindad SPR-3">Pindad SPR-3 (Sniper / SPR)</option>
                                        <option value="Model Lainnya">Model Lainnya...</option>
                                    </select>
                                </div>
                            </div>

                            {/* 6. JARAK, SIKAP MENEMBAK, & TIPE SASARAN */}
                            <div className="card border-0 p-3">
                                <h6 className="fw-bold text-primary mb-3">
                                    <i className="bi bi-bullseye me-2"></i>
                                    6. Jarak, Sikap Menembak, & Tipe Sasaran
                                </h6>
                                <div className="row g-3">
                                    <div className="col-md-4">
                                        <label className="form-label fw-semibold">
                                            Jarak Tembak <span className="text-danger">*</span>
                                        </label>
                                        <div className="input-group">
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={jarakTembak}
                                                onChange={(e) => setJarakTembak(e.target.value)}
                                                min="5"
                                                max="1000"
                                            />
                                            <span className="input-group-text">meter</span>
                                        </div>
                                        <div className="d-flex gap-1 mt-1">
                                            {[15, 25, 50, 100].map((jarak) => (
                                                <button
                                                    type="button"
                                                    key={jarak}
                                                    className={`btn btn-xs py-0 px-2 btn-outline-secondary ${
                                                        parseInt(jarakTembak) === jarak ? "active" : ""
                                                    }`}
                                                    style={{ fontSize: "11px" }}
                                                    onClick={() => setJarakTembak(jarak)}
                                                >
                                                    {jarak}m
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label fw-semibold">
                                            Sikap Menembak <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            className="form-select"
                                            value={sikapMenembak}
                                            onChange={(e) => setSikapMenembak(e.target.value)}
                                        >
                                            <option value="Berdiri">Berdiri (Standing)</option>
                                            <option value="Berlutut">Berlutut (Kneeling)</option>
                                            <option value="Tiarap">Tiarap (Prone)</option>
                                            <option value="Kombinasi">Kombinasi (3 Sikap)</option>
                                        </select>
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label fw-semibold">
                                            Tipe Sasaran / Target <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            className="form-select"
                                            value={tipeSasaran}
                                            onChange={(e) => setTipeSasaran(e.target.value)}
                                        >
                                            <option value="Bullseye">Bullseye (Lingkaran Konsentris)</option>
                                            <option value="Siluet L1">Siluet L1 (Badan Penuh)</option>
                                            <option value="Siluet Setengah Badan">Siluet Setengah Badan</option>
                                            <option value="Plat Baja / Popper">Plat Baja / Popper (Reaksi)</option>
                                            <option value="Custom">Custom Target</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div className="modal-footer d-flex justify-content-between">
                        <div className="text-secondary small">
                            <i className="bi bi-info-circle me-1"></i>
                            {alokasiPersonel.length} Personel • {totalGelombang} Gelombang • {totalJalurAktif} Jalur • {totalPeluruPerPersonel} Butir/Personel ({alokasiPersonel.length * totalPeluruPerPersonel} Total Amunisi)
                        </div>
                        <div className="d-flex gap-2">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                data-bs-dismiss="modal"
                            >
                                <i className="bi bi-x-lg me-1"></i> Batal
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary shadow-sm"
                                disabled={alokasiPersonel.length === 0}
                                onClick={handleStartSession}
                            >
                                <i className="bi bi-play-fill me-1"></i> Mulai Sesi Latihan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

