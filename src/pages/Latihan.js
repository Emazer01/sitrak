import * as React from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../component/Navbar";
import { Sidebar } from "../component/Sidebar";
import { ModalTambahSesi } from "../component/modal/ModalTambahSesi";

export const Latihan = () => {
    document.title = "Latihan - SITRAK-AI";
    const navigate = useNavigate();

    // State Sesi Latihan & Pagination
    const [sesiList, setSesiList] = React.useState([]);
    const [sesiPage, setSesiPage] = React.useState(1);
    const [sesiLimit, setSesiLimit] = React.useState(5);
    const [sesiTotal, setSesiTotal] = React.useState(0);
    const [sesiTotalPages, setSesiTotalPages] = React.useState(1);
    const [sesiLoading, setSesiLoading] = React.useState(false);
    const [searchSesi, setSearchSesi] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState("");

    React.useEffect(() => {
        document.getElementById("btn-dashboard")?.classList.remove("sidebar-active");
        document.getElementById("btn-latihan")?.classList.add("sidebar-active");

        document
            .getElementById("nav-btn-dashboard")
            ?.classList.remove("sidebar-active");
        document.getElementById("nav-btn-latihan")?.classList.add("sidebar-active");
    }, []);

    // Fungsi memanggil API /sesi dengan pagination, filter status, dan pencarian
    const getSesi = async (page = 1, limit = 5, search = "", status = "") => {
        setSesiLoading(true);
        try {
            let url = `${process.env.REACT_APP_BACKEND_URL}/sesi?page=${page}&limit=${limit}`;
            if (search && search.trim() !== "") {
                url += `&search=${encodeURIComponent(search.trim())}`;
            }
            if (status && status.trim() !== "") {
                url += `&status=${encodeURIComponent(status.trim())}`;
            }

            const response = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
            });

            if (response.status === 200 || response.status == 200) {
                console.log("Response GET /sesi:", response.data);
                const resData = response.data;

                let list = [];
                let total = 0;
                let totalPages = 1;

                if (Array.isArray(resData)) {
                    list = resData;
                    total = resData.length;
                    totalPages = Math.ceil(total / limit) || 1;
                } else if (resData && Array.isArray(resData.data)) {
                    list = resData.data;
                    total =
                        resData.total !== undefined
                            ? resData.total
                            : resData.count !== undefined
                            ? resData.count
                            : list.length;
                    totalPages =
                        resData.totalPages ||
                        resData.total_pages ||
                        Math.ceil(total / limit) ||
                        1;
                } else if (resData && Array.isArray(resData.sesi)) {
                    list = resData.sesi;
                    total = resData.total !== undefined ? resData.total : list.length;
                    totalPages =
                        resData.totalPages ||
                        resData.total_pages ||
                        Math.ceil(total / limit) ||
                        1;
                }

                if (list.length > 0) {
                    setSesiList(list);
                    setSesiTotal(total);
                    setSesiTotalPages(totalPages);
                }
            }
        } catch (error) {
            console.error("Gagal mengambil data sesi dari API:", error);
        } finally {
            setSesiLoading(false);
        }
    };

    // Effect debounce untuk menjalankan getSesi saat page, limit, search, atau status berubah
    React.useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            getSesi(sesiPage, sesiLimit, searchSesi, statusFilter);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [sesiPage, sesiLimit, searchSesi, statusFilter]);

    const handleStartSession = (sessionData) => {
        console.log("Sesi latihan baru berhasil dibuat:", sessionData);
        // Refresh ke halaman pertama agar data sesi terbaru langsung terlihat
        setSesiPage(1);
        getSesi(1, sesiLimit, searchSesi, statusFilter);
    };

    const renderStatusBadge = (status) => {
        const s = (status || "").toLowerCase();
        if (s === "berlangsung") {
            return (
                <span className="badge bg-success-subtle text-success border border-success">
                    <i className="bi bi-record-circle me-1"></i>
                </span>
            );
        }
        if (s === "selesai") {
            return (
                <span className="badge bg-secondary-subtle text-secondary border">
                    <i className="bi bi-check-circle me-1"></i>
                </span>
            );
        }
        if (s === "menunggu") {
            return (
                <span className="badge bg-warning-subtle text-warning border border-warning">
                    <i className="bi bi-clock me-1"></i>
                </span>
            );
        }
        if (s === "dibatalkan") {
            return (
                <span className="badge bg-danger-subtle text-danger border border-danger">
                    <i className="bi bi-x-circle me-1"></i>Dibatalkan
                </span>
            );
        }
        return (
            <span className="badge bg-light text-dark border">
                {status || "Menunggu"}
            </span>
        );
    };

    const formatTanggal = (dateStr) => {
        if (!dateStr) return "-";
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
        } catch {
            return dateStr;
        }
    };


    return (
        <div>
            <Navbar />
            <div className="d-flex min-vh-100">
                <Sidebar />
                <div className="font-poppins w-100 overflow-x-hidden">
                    <div className="bg-body-secondary p-1 small text-truncate">
                        Dir : sitrak/{document.URL.split("/").slice(3).join("/") || "latihan"}
                    </div>

                    <div className="p-2 p-sm-3 p-md-4">
                        {/* Header Latihan */}
                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
                            <div className="col">
                                <h2 className="fw-bold mb-1 fs-3 fs-md-2">
                                    <i className="bi bi-bullseye me-2 text-primary"></i>Sesi Latihan Menembak
                                </h2>
                                <p className="text-secondary mb-0 small">
                                    Kelola, pantau real-time, dan mulai sesi latihan menembak taktis
                                </p>
                            </div>
                            <div className="w-100 w-sm-auto col">
                                <button
                                    type="button"
                                    className="btn btn-primary px-3 py-2 shadow-sm w-100 w-sm-auto"
                                    data-bs-toggle="modal"
                                    data-bs-target="#modalTambahSesi"
                                >
                                    <i className="bi bi-plus-lg me-1"></i> Tambahkan Sesi
                                </button>
                            </div>
                        </div>

                        {/* Metric KPI Cards Latihan */}
                        <div className="row g-3 mb-4">
                            <div className="col-12 col-sm-6 col-xl-3">
                                <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                                    <div className="card-body d-flex align-items-center">
                                        <div
                                            className="bg-primary text-white rounded-3 p-3 me-3 fs-3 d-flex align-items-center justify-content-center"
                                            style={{ width: "55px", height: "55px" }}
                                        >
                                            <i className="bi bi-play-circle-fill"></i>
                                        </div>
                                        <div>
                                            <small className="text-secondary fw-semibold">Sesi Aktif</small>
                                            <h4 className="fw-bold mb-0">
                                                {sesiList.filter((s) => (s.status || "").toLowerCase() === "berlangsung").length} Berlangsung
                                            </h4>
                                            <small className="text-success">

                                                <i className="bi bi-broadcast me-1"></i>Real-time Tracking
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-sm-6 col-xl-3">
                                <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                                    <div className="card-body d-flex align-items-center">
                                        <div
                                            className="bg-success text-white rounded-3 p-3 me-3 fs-3 d-flex align-items-center justify-content-center"
                                            style={{ width: "55px", height: "55px" }}
                                        >
                                            <i className="bi bi-people-fill"></i>
                                        </div>
                                        <div>
                                            <small className="text-secondary fw-semibold">Personel Berlatih</small>
                                            <h4 className="fw-bold mb-0">24 Personel</h4>
                                            <small className="text-success">
                                                <i className="bi bi-check-circle me-1"></i>Terjadwal Hari Ini
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-sm-6 col-xl-3">
                                <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                                    <div className="card-body d-flex align-items-center">
                                        <div
                                            className="bg-warning text-dark rounded-3 p-3 me-3 fs-3 d-flex align-items-center justify-content-center"
                                            style={{ width: "55px", height: "55px" }}
                                        >
                                            <i className="bi bi-geo-alt-fill"></i>
                                        </div>
                                        <div>
                                            <small className="text-secondary fw-semibold">Kapasitas Lane</small>
                                            <h4 className="fw-bold mb-0">5 / 8 Lane</h4>
                                            <small className="text-muted">3 Lane Siap Pakai</small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-sm-6 col-xl-3">
                                <div className="card border-0 shadow-sm bg-body-tertiary h-100">
                                    <div className="card-body d-flex align-items-center">
                                        <div
                                            className="bg-info text-white rounded-3 p-3 me-3 fs-3 d-flex align-items-center justify-content-center"
                                            style={{ width: "55px", height: "55px" }}
                                        >
                                            <i className="bi bi-award-fill"></i>
                                        </div>
                                        <div>
                                            <small className="text-secondary fw-semibold">Rata-rata Skor Sesi</small>
                                            <h4 className="fw-bold mb-0">89.6 / 100</h4>
                                            <small className="text-success">
                                                <i className="bi bi-arrow-up-short"></i>Performa Stabil
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabel & Daftar Sesi Latihan */}
                        <div className="card border-0 shadow-sm bg-body-tertiary mb-4">
                            <div className="card-header bg-transparent border-0 pt-3 px-3 d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
                                <div className="col">
                                    <h5 className="fw-bold mb-0">
                                        <i className="bi bi-list-task me-2 text-primary"></i>Daftar Sesi Latihan
                                    </h5>
                                </div>
                                <div className="col d-flex flex-wrap gap-2 w-100 w-md-auto justify-content-start justify-content-md-end">
                                    <div className="input-group input-group-sm flex-grow-1 flex-md-grow-0" style={{ minWidth: "180px", maxWidth: "260px" }}>
                                        <span className="input-group-text bg-body border-end-0">
                                            <i className="bi bi-search text-secondary"></i>
                                        </span>
                                        <input
                                            type="text"
                                            className="form-control border-start-0"
                                            placeholder="Cari sesi atau tempat..."
                                            value={searchSesi}
                                            onChange={(e) => {
                                                setSearchSesi(e.target.value);
                                                setSesiPage(1);
                                            }}
                                        />
                                        {searchSesi && (
                                            <button
                                                className="btn btn-outline-secondary border-start-0"
                                                type="button"
                                                onClick={() => {
                                                    setSearchSesi("");
                                                    setSesiPage(1);
                                                }}
                                            >
                                                <i className="bi bi-x-lg"></i>
                                            </button>
                                        )}
                                    </div>
                                    <select
                                        className="form-select form-select-sm w-auto"
                                        value={statusFilter}
                                        onChange={(e) => {
                                            setStatusFilter(e.target.value);
                                            setSesiPage(1);
                                        }}
                                    >
                                        <option value="">Semua Status</option>
                                        <option value="Berlangsung">Berlangsung</option>
                                        <option value="Menunggu">Menunggu</option>
                                        <option value="Selesai">Selesai</option>
                                        <option value="Dibatalkan">Dibatalkan</option>
                                    </select>
                                </div>
                            </div>

                            <div className="card-body p-3">
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Kode & Sesi</th>
                                                <th>Tanggal</th>
                                                <th>Tempat Menembak</th>
                                                <th>Senjata</th>
                                                <th>Jarak & Sikap</th>
                                                <th>Detail</th>
                                                <th>Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sesiLoading ? (
                                                <tr>
                                                    <td colSpan="8" className="text-center py-4 text-muted">
                                                        <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                                        Memuat data sesi latihan...
                                                    </td>
                                                </tr>
                                            ) : sesiList.length === 0 ? (
                                                <tr>
                                                    <td colSpan="8" className="text-center py-4 text-muted">
                                                        <i className="bi bi-inbox fs-3 d-block mb-1"></i>
                                                        Tidak ada sesi latihan ditemukan
                                                    </td>
                                                </tr>
                                            ) : (
                                                sesiList.map((item, idx) => {
                                                    const kode =
                                                        item.kode_sesi ||
                                                        (item.id_sesi
                                                            ? `SESI-${String(item.id_sesi).padStart(4, "0")}`
                                                            : "-");
                                                    const senjataText =
                                                        item.model_senjata ||
                                                        item.nama_senjata ||
                                                        item.senjata ||
                                                        "-";
                                                    const jarakText = item.jarak_meter || item.jarak || 25;
                                                    const sikapText =
                                                        item.nama_sikap_menembak ||
                                                        item.sikap_menembak ||
                                                        item.sikap ||
                                                        "Berdiri";
                                                    const gelombangCount =
                                                        item.total_gelombang || item.totalGelombang || 1;
                                                    const laneCount =
                                                        item.jumlah_jalur || item.jumlahJalur || 1;
                                                    const isSelesai =
                                                        (item.status || "").toLowerCase() === "selesai";

                                                    const targetId = item.id_sesi || item.id;

                                                    return (
                                                        <tr key={item.id_sesi || item.id || idx}>
                                                            <td>
                                                                <div
                                                                    className="fw-bold text-primary"
                                                                    style={{ cursor: "pointer" }}
                                                                    onClick={() => navigate(`/latihan/${targetId}`)}
                                                                    title="Lihat Detail Sesi"
                                                                >
                                                                    {kode}
                                                                </div>
                                                                <small className="text-secondary">
                                                                    {item.nama_sesi || item.namaSesi || "Sesi Latihan"}
                                                                </small>
                                                            </td>
                                                            <td>
                                                                <div className="text-nowrap small fw-medium">
                                                                    <i className="bi bi-calendar3 me-1 text-primary"></i>
                                                                    {formatTanggal(item.tanggal || item.created_at)}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="fw-semibold">
                                                                    {item.nama_tempat_menembak ||
                                                                        item.namaTempatMenembak ||
                                                                        "-"}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span className="badge bg-secondary-subtle text-secondary">
                                                                    {senjataText}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                {jarakText}m • {sikapText}
                                                            </td>
                                                            <td>
                                                                <span
                                                                    className="badge bg-primary-subtle text-primary border border-primary me-1"
                                                                    title={`${gelombangCount} Gelombang`}
                                                                >
                                                                    <i className="bi bi-water me-1"></i>
                                                                    {gelombangCount}
                                                                </span>
                                                                <span
                                                                    className="badge bg-light text-dark border"
                                                                    title={`${laneCount} Lane`}
                                                                >
                                                                    <i className="bi bi-layout-three-columns me-1"></i>
                                                                    {laneCount}
                                                                </span>
                                                                <span className="ms-1">{renderStatusBadge(item.status)}</span>
                                                            </td>
                                                            <td>
                                                                {isSelesai ? (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-outline-secondary me-1"
                                                                        onClick={() => navigate(`/latihan/${targetId}`)}
                                                                        title="Lihat Rekap Hasil Sesi"
                                                                    >
                                                                        <i className="bi bi-file-earmark-bar-graph me-1"></i> Hasil
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-primary me-1"
                                                                        onClick={() => navigate(`/latihan/${targetId}`)}
                                                                        title="Pantau Jalannya Sesi Latihan"
                                                                    >
                                                                        <i className="bi bi-eye me-1"></i> Pantau
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Pagination Footer */}
                            <div className="card-footer bg-transparent border-0 px-3 py-3 d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
                                <div className="small text-muted">
                                    {sesiTotal > 0 ? (
                                        <>
                                            Menampilkan{" "}
                                            <span className="fw-bold text-body">
                                                {(sesiPage - 1) * sesiLimit + 1}
                                            </span>{" "}
                                            -{" "}
                                            <span className="fw-bold text-body">
                                                {Math.min(sesiPage * sesiLimit, sesiTotal)}
                                            </span>{" "}
                                            dari{" "}
                                            <span className="fw-bold text-body">{sesiTotal}</span> sesi
                                        </>
                                    ) : (
                                        "Tidak ada data sesi"
                                    )}
                                </div>

                                <div className="d-flex align-items-center gap-2">
                                    <select
                                        className="form-select form-select-sm"
                                        style={{ width: "auto" }}
                                        value={sesiLimit}
                                        onChange={(e) => {
                                            setSesiLimit(parseInt(e.target.value));
                                            setSesiPage(1);
                                        }}
                                    >
                                        <option value={5}>5 / halaman</option>
                                        <option value={10}>10 / halaman</option>
                                        <option value={20}>20 / halaman</option>
                                    </select>

                                    <nav aria-label="Page navigation">
                                        <ul className="pagination pagination-sm mb-0">
                                            <li className={`page-item ${sesiPage <= 1 ? "disabled" : ""}`}>
                                                <button
                                                    className="page-link"
                                                    type="button"
                                                    onClick={() => setSesiPage((prev) => Math.max(prev - 1, 1))}
                                                    disabled={sesiPage <= 1 || sesiLoading}
                                                >
                                                    <i className="bi bi-chevron-left me-1"></i> Prev
                                                </button>
                                            </li>

                                            {Array.from({ length: sesiTotalPages }, (_, i) => i + 1).map((pNum) => (
                                                <li
                                                    key={pNum}
                                                    className={`page-item ${sesiPage === pNum ? "active" : ""}`}
                                                >
                                                    <button
                                                        className="page-link"
                                                        type="button"
                                                        onClick={() => setSesiPage(pNum)}
                                                        disabled={sesiLoading}
                                                    >
                                                        {pNum}
                                                    </button>
                                                </li>
                                            ))}

                                            <li
                                                className={`page-item ${
                                                    sesiPage >= sesiTotalPages ? "disabled" : ""
                                                }`}
                                            >
                                                <button
                                                    className="page-link"
                                                    type="button"
                                                    onClick={() =>
                                                        setSesiPage((prev) => Math.min(prev + 1, sesiTotalPages))
                                                    }
                                                    disabled={sesiPage >= sesiTotalPages || sesiLoading}
                                                >
                                                    Next <i className="bi bi-chevron-right ms-1"></i>
                                                </button>
                                            </li>
                                        </ul>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Komponen Modal Tambah Sesi */}
            <ModalTambahSesi
                modalId="modalTambahSesi"
                onStartSession={handleStartSession}
            />
        </div>
    );
};
