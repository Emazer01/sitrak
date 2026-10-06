import * as React from "react";
import { Navbar } from "../component/Navbar";
import { Sidebar } from "../component/Sidebar";
import { ModalTambahSesi } from "../component/modal/ModalTambahSesi";

export const Latihan = () => {
    document.title = "Latihan - SITRAK-AI";

    React.useEffect(() => {
        document.getElementById("btn-dashboard")?.classList.remove("sidebar-active");
        document.getElementById("btn-latihan")?.classList.add("sidebar-active");

        document
            .getElementById("nav-btn-dashboard")
            ?.classList.remove("sidebar-active");
        document.getElementById("nav-btn-latihan")?.classList.add("sidebar-active");
    }, []);

    const handleStartSession = (sessionData) => {
        alert(
            `Sesi Latihan "${sessionData.namaSesi}" di ${sessionData.namaTempatMenembak} siap dimulai dengan ${sessionData.personel.length} penembak terbagi dalam ${sessionData.totalGelombang} gelombang pada ${sessionData.jumlahJalur} jalur.`
        );
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
                                            <h4 className="fw-bold mb-0">3 Berlangsung</h4>
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
                                            placeholder="Cari sesi atau personel..."
                                        />
                                    </div>
                                    <button type="button" className="btn btn-sm btn-outline-secondary">
                                        <i className="bi bi-funnel me-1"></i> Filter
                                    </button>
                                </div>
                            </div>

                            <div className="card-body p-3">
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Kode & Sesi</th>
                                                <th>Tempat Menembak</th>
                                                <th>Senjata</th>
                                                <th>Jarak & Sikap</th>
                                                <th>Gelombang & Lane</th>
                                                <th>Status</th>
                                                <th className="text-end">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <div className="fw-bold">SESI-0104</div>
                                                    <small className="text-secondary">Latihan Presisi Gelombang 1</small>
                                                </td>
                                                <td>
                                                    <div className="fw-semibold">Lap. Tembak Utama</div>
                                                    <small className="text-muted">7 Penembak</small>
                                                </td>
                                                <td>
                                                    <span className="badge bg-secondary-subtle text-secondary">
                                                        Pindad SS2-V4
                                                    </span>
                                                </td>
                                                <td>25m • Berdiri</td>
                                                <td>
                                                    <span className="badge bg-primary-subtle text-primary border border-primary me-1">
                                                        3 Gelombang
                                                    </span>
                                                    <span className="badge bg-light text-dark border">
                                                        3 Lane
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="badge bg-success-subtle text-success border border-success">
                                                        <i className="bi bi-record-circle me-1"></i>Berlangsung
                                                    </span>
                                                </td>
                                                <td className="text-end">
                                                    <button type="button" className="btn btn-sm btn-primary me-1">
                                                        <i className="bi bi-eye me-1"></i> Pantau
                                                    </button>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <div className="fw-bold">SESI-0103</div>
                                                    <small className="text-secondary">Reaksi Rapid Fire</small>
                                                </td>
                                                <td>
                                                    <div className="fw-semibold">Lap. Tembak Reaksi</div>
                                                    <small className="text-muted">4 Penembak</small>
                                                </td>
                                                <td>
                                                    <span className="badge bg-secondary-subtle text-secondary">
                                                        Pindad G2 Combat
                                                    </span>
                                                </td>
                                                <td>15m • Berdiri</td>
                                                <td>
                                                    <span className="badge bg-primary-subtle text-primary border border-primary me-1">
                                                        2 Gelombang
                                                    </span>
                                                    <span className="badge bg-light text-dark border">
                                                        2 Lane
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="badge bg-success-subtle text-success border border-success">
                                                        <i className="bi bi-record-circle me-1"></i>Berlangsung
                                                    </span>
                                                </td>
                                                <td className="text-end">
                                                    <button type="button" className="btn btn-sm btn-primary me-1">
                                                        <i className="bi bi-eye me-1"></i> Pantau
                                                    </button>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <div className="fw-bold">SESI-0102</div>
                                                    <small className="text-secondary">Penilaian 3 Sikap</small>
                                                </td>
                                                <td>
                                                    <div className="fw-semibold">Lap. Tembak 300m</div>
                                                    <small className="text-muted">6 Penembak</small>
                                                </td>
                                                <td>
                                                    <span className="badge bg-secondary-subtle text-secondary">
                                                        Pindad SS2-V4
                                                    </span>
                                                </td>
                                                <td>50m • Kombinasi</td>
                                                <td>
                                                    <span className="badge bg-secondary-subtle text-secondary border me-1">
                                                        2 Gelombang
                                                    </span>
                                                    <span className="badge bg-light text-dark border">
                                                        3 Lane
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="badge bg-secondary-subtle text-secondary border">
                                                        Selesai
                                                    </span>
                                                </td>
                                                <td className="text-end">
                                                    <button type="button" className="btn btn-sm btn-outline-secondary me-1">
                                                        <i className="bi bi-file-earmark-bar-graph me-1"></i> Hasil
                                                    </button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
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
