import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "../component/Navbar";
import { Sidebar } from "../component/Sidebar";

export const NotFound = () => {
    document.title = "404 - Data Tidak Ditemukan | SITRAK-AI";
    const navigate = useNavigate();

    return (
        <div>
            <Navbar />
            <div className="d-flex min-vh-100">
                <Sidebar />
                <div className="font-poppins w-100 p-4 p-md-5 d-flex flex-column justify-content-center align-items-center">
                    <div
                        className="card border-0 shadow-sm text-center p-4 p-md-5"
                        style={{ maxWidth: "560px", borderRadius: "16px" }}
                    >
                        <div className="mb-4">
                            <div
                                className="d-inline-flex justify-content-center align-items-center bg-danger-subtle text-danger rounded-circle mb-3"
                                style={{ width: "90px", height: "90px" }}
                            >
                                <i className="bi bi-crosshair fs-1"></i>
                            </div>
                            <h1 className="fw-bold text-dark display-4 mb-2">404</h1>
                            <h4 className="fw-bold text-secondary mb-2">Data Tidak Ditemukan</h4>
                            <p className="text-muted small mb-4">
                                Maaf, sesi latihan atau halaman yang Anda tuju tidak ditemukan dalam database
                                atau ID yang dimasukkan tidak valid.
                            </p>
                        </div>

                        <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
                            <button
                                type="button"
                                className="btn btn-outline-secondary px-4 py-2"
                                onClick={() => navigate(-1)}
                            >
                                <i className="bi bi-arrow-left me-2"></i>Kembali
                            </button>
                            <Link to="/latihan" className="btn btn-primary px-4 py-2">
                                <i className="bi bi-journal-text me-2"></i>Daftar Sesi Latihan
                            </Link>
                            <Link to="/" className="btn btn-light border px-4 py-2">
                                <i className="bi bi-house me-2"></i>Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFound;

