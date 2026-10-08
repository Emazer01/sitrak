import React, { useState, useEffect } from "react";
import axios from "axios";

export const ModalTambahSesi = ({ modalId = "modalTambahSesi", onStartSession }) => {
    // 1. Informasi Sesi & Lokasi
    const [namaSesi, setNamaSesi] = useState("");
    const [namaTempatMenembak, setNamaTempatMenembak] = useState("");
    const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);

    // 2. Jumlah Jalur
    const [jumlahJalur, setJumlahJalur] = useState(3);

    // 3. Daftar Master Personel yang Sudah Ada (Di-fetch dari API /personel)
    const [masterPersonel, setMasterPersonel] = useState([]);

    // Opsi Data Dukung Dinamis dari API /atribut
    const [senjataOptions, setSenjataOptions] = useState([
        { id_senjata: 1, model_senjata: "Pindad G2 Combat"}
    ]);

    const [modeOptions, setModeOptions] = useState([
        { id: 1, nama: "Presisi", ritme: "Slow Fire" },
        { id: 2, nama: "Reaksi", ritme: "Rapid Fire" },
        { id: 3, nama: "Double Tap", ritme: "2 Beruntun" },
        { id: 4, nama: "Penilaian", ritme: "Standar" },
    ]);

    const [sikapOptions, setSikapOptions] = useState([
        { id: 1, nama: "Berdiri", kode: "Standing" },
        { id: 2, nama: "Berlutut", kode: "Kneeling" },
        { id: 3, nama: "Tiarap", kode: "Prone" },
        { id: 4, nama: "Kombinasi", kode: "3 Sikap" },
    ]);

    const [sasaranOptions, setSasaranOptions] = useState([
        { id: 1, nama: "Bullseye", bentuk: "Lingkaran Konsentris" },
        { id: 2, nama: "Siluet L1", bentuk: "Badan Penuh" },
        { id: 3, nama: "Siluet Setengah Badan", bentuk: "Siluet Setengah Badan" },
        { id: 4, nama: "Plat Baja / Popper", bentuk: "Reaksi" },
        { id: 5, nama: "Custom", bentuk: "Custom Target" },
    ]);

    // Personel yang dipilih ikut menembak
    const [selectedPersonelIds, setSelectedPersonelIds] = useState([]);
    const [searchPersonel, setSearchPersonel] = useState("");

    // 4. Konfigurasi Babak & Peluru
    const [jumlahBabak, setJumlahBabak] = useState(2);
    const [babakList, setBabakList] = useState([
        { id: 1, nomor: 1, jenis: "Perkenaan (Koreksi)", peluru: 3 },
        { id: 2, nomor: 2, jenis: "Penilaian (Scoring)", peluru: 10 },
    ]);

    // 5. Jenis Senjata (Tanpa Kaliber)
    const [jenisSenjata, setJenisSenjata] = useState(senjataOptions[0]?.id_senjata); // Default ke ID senjata pertama dari senjataOptions

    // 6. Mode Tembakan, Jarak, Sikap Menembak, Tipe Sasaran
    const [modeTembakan, setModeTembakan] = useState(1);
    const [jarakTembak, setJarakTembak] = useState(25);
    const [sikapMenembak, setSikapMenembak] = useState(1);
    const [tipeSasaran, setTipeSasaran] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fungsi memanggil API /atribut untuk data dukung modal
    const getAtribut = async () => {
        try {
            const response = await axios.get(
                `${process.env.REACT_APP_BACKEND_URL}/atribut`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                    },
                }
            );

            if (response.status === 200 || response.status == 200) {
                const atribut = response.data;
                console.log("Data Atribut Modal Tambah Sesi:", atribut);

                if (atribut.senjata && Array.isArray(atribut.senjata) && atribut.senjata.length > 0) {
                    setSenjataOptions(atribut.senjata);
                }
                if (atribut.mode_tembakan && Array.isArray(atribut.mode_tembakan) && atribut.mode_tembakan.length > 0) {
                    setModeOptions(atribut.mode_tembakan);
                }
                if (atribut.sikap_menembak && Array.isArray(atribut.sikap_menembak) && atribut.sikap_menembak.length > 0) {
                    setSikapOptions(atribut.sikap_menembak);
                }
                if (atribut.tipe_target && Array.isArray(atribut.tipe_target) && atribut.tipe_target.length > 0) {
                    setSasaranOptions(atribut.tipe_target);
                }
            }
        } catch (error) {
            console.log("Error mengambil data atribut modal:", error);
        }
    };

    // Fungsi memanggil API /personel untuk data dukung personel penembak
    const getPersonel = async (page = 1, limit = 100, search = "") => {
        try {
            let url = `${process.env.REACT_APP_BACKEND_URL}/personel?page=${page}&limit=${limit}`;
            if (search && search.trim() !== "") {
                url += `&search=${encodeURIComponent(search.trim())}`;
            }

            const response = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });

            if (response.status === 200 || response.status == 200) {
                const resData = response.data;
                console.log("Data Personel Modal Tambah Sesi:", resData);

                let rawList = [];
                if (Array.isArray(resData)) {
                    rawList = resData;
                } else if (resData && Array.isArray(resData.data)) {
                    rawList = resData.data;
                } else if (resData && Array.isArray(resData.personel)) {
                    rawList = resData.personel;
                }

                if (rawList.length > 0) {
                    const normalized = rawList.map((p, idx) => ({
                        id: p.id_personel_penembak || p.id || (idx + 1),
                        nrp: p.nrp,
                        nama: p.nama_personel_penembak || p.nama,
                        pangkat: p.pangkat || (p.nama_personel_penembak || p.nama || "").split(" ")[0] || "",
                        satuan: p.satuan || "-",
                    }));
                    setMasterPersonel(normalized);
                }
            }
        } catch (error) {
            console.log("Error mengambil data personel modal:", error);
        }
    };

    // Panggil API saat modal dimuat
    useEffect(() => {
        getAtribut();
        getPersonel(1, 100, "");
    }, []);

    // Perhitungan Jalur & Gelombang Otomatis
    const totalJalurAktif = Math.max(1, parseInt(jumlahJalur) || 1);

    const alokasiPersonel = selectedPersonelIds
        .map((id) => masterPersonel.find((p) => p.id === id || p.id_personel_penembak === id))
        .filter(Boolean)
        .map((p, index) => {
            const gelombang = Math.floor(index / totalJalurAktif) + 1;
            const laneNo = (index % totalJalurAktif) + 1;
            return {
                id_personel_penembak: p.id_personel_penembak || p.id,
                nama_personel_penembak: p.nama_personel_penembak || p.nama,
                nrp: p.nrp || "-",
                satuan: p.satuan || "-",gelombang,
                lane: laneNo
            };
        });

    const totalGelombang = Math.ceil(alokasiPersonel.length / totalJalurAktif) || 1;

    // State & Handler Accordion Gelombang
    const [expandedWaves, setExpandedWaves] = useState({});

    const toggleWaveAccordion = (waveNo) => {
        setExpandedWaves((prev) => ({
            ...prev,
            [waveNo]: prev[waveNo] !== undefined ? !prev[waveNo] : false,
        }));
    };

    const bukaSemuaGelombang = () => {
        const allOpen = {};
        for (let i = 1; i <= totalGelombang; i++) {
            allOpen[i] = true;
        }
        setExpandedWaves(allOpen);
    };

    const tutupSemuaGelombang = () => {
        const allClosed = {};
        for (let i = 1; i <= totalGelombang; i++) {
            allClosed[i] = false;
        }
        setExpandedWaves(allClosed);
    };

    // Toggle pilih personel
    const togglePersonelSelection = (id) => {
        if (selectedPersonelIds.includes(id)) {
            setSelectedPersonelIds(selectedPersonelIds.filter((pId) => pId !== id));
        } else {
            setSelectedPersonelIds([...selectedPersonelIds, id]);
        }
    };

    const pilihSemuaPersonel = () => {
        setSelectedPersonelIds(masterPersonel.map((p) => p.id_personel_penembak || p.id));
    };

    const kosongkanPersonel = () => {
        setSelectedPersonelIds([]);
    };

    // Filter daftar master personel
    const filteredMaster = masterPersonel.filter(
        (p) =>
            (p.nama_personel_penembak || p.nama || "").toLowerCase().includes(searchPersonel.toLowerCase()) ||
            (p.nrp || "").includes(searchPersonel) ||
            (p.satuan || "").toLowerCase().includes(searchPersonel.toLowerCase())
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
                jenis: "Penilaian (Scoring)",
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

    const handleStartSession = async () => {
        setIsSubmitting(true);

        const payload = {
            nama_sesi: namaSesi,
            nama_tempat_menembak: namaTempatMenembak,
            tanggal: tanggal,
            jumlah_jalur: totalJalurAktif,
            total_gelombang: totalGelombang,
            jarak_meter: parseInt(jarakTembak) || 25,
            id_senjata: parseInt(jenisSenjata),
            id_mode_tembakan: parseInt(modeTembakan),
            id_sikap_menembak: parseInt(sikapMenembak),
            id_tipe_target: parseInt(tipeSasaran),
            status: "Menunggu",
            personel: alokasiPersonel.map((p) => ({
                gelombang: p.gelombang,
                id_personel_penembak: p.id_personel_penembak || p.id,
                lane: p.lane,
            })),
            babak: babakList.map((b) => ({
                nomor_babak: b.nomor,
                nama_babak: b.jenis,
                jumlah_peluru: parseInt(b.peluru) || 0,
            })),
            total_peluru_per_personel: totalPeluruPerPersonel,
        };

        console.log("Mengirim payload data sesi ke /sesi:", payload);

        try {
            const response = await axios.post(
                `${process.env.REACT_APP_BACKEND_URL}/sesi`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            console.log("Respon berhasil simpan sesi:", response.data);
            alert(`Sesi Latihan "${namaSesi}" berhasil disimpan!`);

            if (onStartSession) {
                onStartSession(response.data || payload);
            }

            // Tutup modal secara otomatis jika bootstrap modal tersedia
            const modalEl = document.getElementById(modalId);
            if (modalEl && window.bootstrap) {
                const modalInstance = window.bootstrap.Modal.getInstance(modalEl);
                if (modalInstance) {
                    modalInstance.hide();
                }
            }
            window.location.reload();
        } catch (error) {
            console.error("Gagal menyimpan sesi ke API:", error);
            const errorMsg =
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                "Terjadi kesalahan saat menyimpan sesi.";
            alert(`Gagal menyimpan sesi latihan: ${errorMsg}`);
        } finally {
            setIsSubmitting(false);
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
                    <div className="modal-body p-3 p-md-4">
                        <form id="formSesiLatihan">
                            {/* 1. NAMA SESI & TEMPAT MENEMBAK */}
                            <div className="card border-0 p-3 mb-4">
                                <h6 className="fw-bold text-primary mb-3">
                                    <i className="bi bi-info-circle-fill me-2"></i>
                                    1. Informasi Sesi & Lokasi Lapangan Tembak
                                </h6>
                                <div className="row g-3">
                                    <div className="col-md-5">
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
                                    <div className="col-md-4">
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
                                    <div className="col-md-3">
                                        <label className="form-label fw-semibold">
                                            Tanggal Latihan <span className="text-danger">*</span>
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text">
                                                <i className="bi bi-calendar-event text-primary"></i>
                                            </span>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={tanggal}
                                                onChange={(e) => setTanggal(e.target.value)}
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
                                                                : "border-light-subtle"
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
                                                                NRP {p.nrp}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Tabel Hasil Penentuan Lane & Gelombang Otomatis - Format Dropdown / Accordion */}
                                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                                    <div>
                                        <label className="form-label fw-bold mb-0 text-dark">
                                            <i className="bi bi-diagram-3-fill me-2 text-primary"></i>
                                            Alokasi Gelombang & Jalur Otomatis
                                        </label>
                                        <div className="small text-muted">
                                            Total: <span className="fw-semibold text-primary">{alokasiPersonel.length}</span> Personel terbagi dalam <span className="fw-semibold text-primary">{totalGelombang}</span> Gelombang ({totalJalurAktif} Jalur per Gelombang)
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-center gap-1">
                                        {totalGelombang > 1 && (
                                            <>
                                                <button
                                                    type="button"
                                                    className="btn btn-xs py-1 px-2 btn-outline-secondary small"
                                                    style={{ fontSize: "12px" }}
                                                    onClick={bukaSemuaGelombang}
                                                    title="Buka semua accordion gelombang"
                                                >
                                                    <i className="bi bi-arrows-expand me-1"></i>Buka Semua
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-xs py-1 px-2 btn-outline-secondary small"
                                                    style={{ fontSize: "12px" }}
                                                    onClick={tutupSemuaGelombang}
                                                    title="Tutup semua accordion gelombang"
                                                >
                                                    <i className="bi bi-arrows-collapse me-1"></i>Tutup Semua
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {alokasiPersonel.length === 0 ? (
                                    <div className="alert alert-warning py-3 mb-0 small text-center">
                                        <i className="bi bi-exclamation-triangle-fill fs-5 d-block mb-1 text-warning"></i>
                                        Belum ada personel yang dipilih. Silakan centang personel pada daftar di atas untuk melakukan alokasi gelombang dan jalur secara otomatis.
                                    </div>
                                ) : (
                                    <div className="accordion" id="accordionGelombang">
                                        {Array.from({ length: totalGelombang }, (_, i) => i + 1).map((gelombangNo) => {
                                            const penembakGelombang = alokasiPersonel.filter(
                                                (p) => p.gelombang === gelombangNo
                                            );
                                            const sisaJalur = totalJalurAktif - penembakGelombang.length;
                                            const isExpanded = expandedWaves[gelombangNo] !== false; // Default terbuka

                                            return (
                                                <div
                                                    key={gelombangNo}
                                                    className="accordion-item border rounded-2 mb-2 overflow-hidden shadow-sm"
                                                >
                                                    <h2 className="accordion-header" id={`headingGelombang${gelombangNo}`}>
                                                        <button
                                                            className={`accordion-button ${isExpanded ? "" : "collapsed"} py-2 px-3 bg-body-tertiary`}
                                                            type="button"
                                                            onClick={() => toggleWaveAccordion(gelombangNo)}
                                                            aria-expanded={isExpanded}
                                                            aria-controls={`collapseGelombang${gelombangNo}`}
                                                        >
                                                            <div className="d-flex flex-wrap justify-content-between align-items-center w-100 me-2 gap-2">
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <span
                                                                        className={`badge px-2 py-1 ${
                                                                            gelombangNo % 3 === 1
                                                                                ? "bg-primary text-white"
                                                                                : gelombangNo % 3 === 2
                                                                                ? "bg-warning text-dark"
                                                                                : "bg-success text-white"
                                                                        }`}
                                                                    >
                                                                        <i className="bi bi-layers-fill me-1"></i>
                                                                        GELOMBANG {gelombangNo}
                                                                    </span>
                                                                    <span className="fw-semibold small text-body">
                                                                        {penembakGelombang.length} Penembak
                                                                    </span>
                                                                </div>
                                                                <div className="d-flex align-items-center gap-2">
                                                                    {sisaJalur === 0 ? (
                                                                        <span className="badge bg-success-subtle text-success border border-success small fw-normal">
                                                                            <i className="bi bi-check2-circle me-1"></i>
                                                                            Semua Jalur Terisi ({totalJalurAktif}/{totalJalurAktif})
                                                                        </span>
                                                                    ) : (
                                                                        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning small fw-normal">
                                                                            <i className="bi bi-info-circle me-1"></i>
                                                                            {penembakGelombang.length} Terisi • {sisaJalur} Jalur Kosong
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    </h2>

                                                    {isExpanded && (
                                                        <div
                                                            id={`collapseGelombang${gelombangNo}`}
                                                            className="accordion-collapse collapse show"
                                                        >
                                                            <div className="accordion-body p-0">
                                                                <div className="table-responsive">
                                                                    <table className="table table-hover align-middle mb-0">
                                                                        <tbody>
                                                                            {penembakGelombang.map((p) => (
                                                                                <tr key={`${gelombangNo}-${p.id}-${p.lane}`}>
                                                                                    <td>
                                                                                        <span className="badge bg-dark text-white px-2 py-1 font-monospace">
                                                                                            <i className="bi bi-crosshair me-1 text-warning"></i>
                                                                                            {p.laneFormatted || `Lane ${String(p.lane).padStart(2, "0")}`}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td>
                                                                                        <div className="fw-semibold">
                                                                                            {p.nama_personel_penembak || p.nama}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td>
                                                                                        <span className="font-monospace fw-semibold text-primary">
                                                                                            {p.nrp || "-"}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td>
                                                                                        <span className="text-secondary small">
                                                                                            {p.satuan || "-"}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="text-center">
                                                                                        <button
                                                                                            type="button"
                                                                                            className="btn btn-sm btn-link text-danger p-0"
                                                                                            onClick={() => togglePersonelSelection(p.id)}
                                                                                            title="Keluarkan dari sesi latihan"
                                                                                        >
                                                                                            <i className="bi bi-x-circle-fill fs-6"></i>
                                                                                        </button>
                                                                                    </td>
                                                                                </tr>
                                                                            ))}

                                                                            {/* Baris Jalur Kosong jika ada pada gelombang terakhir */}
                                                                            {sisaJalur > 0 &&
                                                                                Array.from({ length: sisaJalur }, (_, idx) => {
                                                                                    const emptyLaneNo = penembakGelombang.length + idx + 1;
                                                                                    return (
                                                                                        <tr
                                                                                            key={`empty-${gelombangNo}-${emptyLaneNo}`}
                                                                                            className="text-muted table-light"
                                                                                            style={{ opacity: 0.65 }}
                                                                                        >
                                                                                            <td>
                                                                                                <span className="badge bg-secondary-subtle text-secondary border font-monospace px-2 py-1">
                                                                                                    Lane {String(emptyLaneNo).padStart(2, "0")}
                                                                                                </span>
                                                                                            </td>
                                                                                            <td colSpan="3" className="text-secondary small fst-italic">
                                                                                                <i className="bi bi-dash-circle me-1"></i>
                                                                                                (Jalur Kosong / Tidak Digunakan pada Gelombang ini)
                                                                                            </td>
                                                                                            <td className="text-center text-muted small">
                                                                                                -
                                                                                            </td>
                                                                                        </tr>
                                                                                    );
                                                                                })}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
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
                                                                Tembak Perkenaan (Koreksi)
                                                            </option>
                                                            <option value="Penilaian (Scoring)">
                                                                Tembak Penilaian (Scoring)
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
                                        onChange={(e) => setJenisSenjata(parseInt(e.target.value))}
                                    >
                                        {senjataOptions.map((s, idx) => {
                                            return (
                                                <option key={s.id_senjata || idx} value={s.id_senjata}>
                                                    {s.model_senjata} ({s.kaliber})
                                                </option>
                                            );
                                        })}
                                        <option value="99">Model Lainnya...</option>
                                    </select>
                                </div>
                            </div>

                            {/* 6. MODE TEMBAKAN, JARAK, SIKAP MENEMBAK, & TIPE SASARAN */}
                            <div className="card border-0 p-3">
                                <h6 className="fw-bold text-primary mb-3">
                                    <i className="bi bi-bullseye me-2"></i>
                                    6. Mode Tembakan, Jarak, Sikap Menembak, & Tipe Sasaran
                                </h6>
                                <div className="row g-3">
                                    <div className="col-12 col-sm-6 col-xl-3">
                                        <label className="form-label fw-semibold">
                                            Mode Tembakan <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            className="form-select"
                                            onChange={(e) => setModeTembakan(parseInt(e.target.value))}
                                        >
                                            {modeOptions.map((m, idx) => {
                                                return (
                                                    <option key={m.id_mode_tembakan || idx} value={m.id_mode_tembakan}>
                                                        {m.nama_mode_tembakan}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    <div className="col-12 col-sm-6 col-xl-3">
                                        <label className="form-label fw-semibold">
                                            Jarak Tembak <span className="text-danger">*</span>
                                        </label>
                                        <div className="input-group">
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={jarakTembak}
                                                onChange={(e) => setJarakTembak(parseInt(e.target.value))}
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

                                    <div className="col-12 col-sm-6 col-xl-3">
                                        <label className="form-label fw-semibold">
                                            Sikap Menembak <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            className="form-select"
                                            value={sikapMenembak}
                                            onChange={(e) => setSikapMenembak(parseInt(e.target.value))}
                                        >
                                            {sikapOptions.map((sk, idx) => {
                                                const val = sk.id_sikap_menembak
                                                return (
                                                    <option key={sk.id || sk.id_sikap_menembak || idx} value={val}>
                                                        {sk.nama_sikap_menembak || sk.nama || sk}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    <div className="col-12 col-sm-6 col-xl-3">
                                        <label className="form-label fw-semibold">
                                            Tipe Sasaran / Target <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            className="form-select"
                                            value={tipeSasaran}
                                            onChange={(e) => setTipeSasaran(parseInt(e.target.value))}
                                        >
                                            {sasaranOptions.map((ts, idx) => {
                                                const val = ts.id_tipe_target
                                                return (
                                                    <option key={ts.id || ts.id_tipe_target || idx} value={val}>
                                                        {ts.nama_tipe_target || ts.nama || ts}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div className="modal-footer d-flex flex-column flex-md-row justify-content-between align-items-stretch align-items-md-center gap-2">
                        <div className="text-secondary small text-center text-md-start">
                            <i className="bi bi-info-circle me-1"></i>
                            <span className="badge bg-primary-subtle text-primary me-2">{modeTembakan}</span>
                            {alokasiPersonel.length} Personel • {totalGelombang} Gelombang • {totalJalurAktif} Jalur • {totalPeluruPerPersonel} Butir/Personel ({alokasiPersonel.length * totalPeluruPerPersonel} Total Amunisi)
                        </div>
                        <div className="d-flex justify-content-end gap-2 w-100 w-md-auto">
                            <button
                                type="button"
                                className="btn btn-secondary flex-grow-1 flex-md-grow-0"
                                data-bs-dismiss="modal"
                            >
                                <i className="bi bi-x-lg me-1"></i> Batal
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary shadow-sm flex-grow-1 flex-md-grow-0"
                                disabled={alokasiPersonel.length === 0 || isSubmitting}
                                onClick={handleStartSession}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span
                                            className="spinner-border spinner-border-sm me-2"
                                            role="status"
                                            aria-hidden="true"
                                        ></span>
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-play-fill me-1"></i> Simpan Sesi Latihan
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

