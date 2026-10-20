import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "../component/Navbar";
import { Sidebar } from "../component/Sidebar";
import { Breadcrumb } from "../component/Breadcrumb";

export const NotFound = () => {
  document.title = "404 - Data Tidak Ditemukan | SITRAK-AI";
  const navigate = useNavigate();

  return (
    <div>
      {/* Breadcrumb Path Bar Terstandarisasi */}
      <Breadcrumb
        items={[
          {
            label: "404 - Data Tidak Ditemukan",
            active: true,
            icon: "bi bi-exclamation-triangle",
          },
        ]}
        rightContent={
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary py-1 px-2 d-flex align-items-center"
            onClick={() => navigate(-1)}
          >
            <i className="bi bi-arrow-left me-1"></i> Kembali
          </button>
        }
      />

      <div className="p-4 p-md-5 d-flex flex-column justify-content-center align-items-center">
        <div
          className="card border-0 shadow-sm text-center p-4 p-md-5"
          style={{ maxWidth: "560px", borderRadius: "16px" }}
        >
          <div className="mb-4">
            <div
              className="d-inline-flex justify-content-center align-items-center p-0 mb-3 mx-auto"
              style={{ maxWidth: "140px" }}
            >
              <img
                src="/SITRAK Tactical Target Emblem.png"
                className="w-100 rounded"
                alt="Crosshair"
              />
            </div>
            <h1 className="fw-bold display-5 mb-2 text-danger">404</h1>
            <h4 className="fw-bold text-secondary mb-2">
              Data Tidak Ditemukan
            </h4>
            <p className="text-muted small mb-4">
              Maaf, sesi latihan atau halaman yang Anda tuju tidak ditemukan
              dalam database atau ID/parameter yang dipilih sudah tidak
              tersedia.
            </p>
          </div>

          <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary px-3 py-2"
              onClick={() => navigate(-1)}
            >
              <i className="bi bi-arrow-left me-2"></i>Kembali
            </button>
            <Link to="/latihan" className="btn btn-primary px-3 py-2">
              <i className="bi bi-journal-text me-2"></i>Daftar Sesi Latihan
            </Link>
            <Link to="/" className="btn btn-light border px-3 py-2">
              <i className="bi bi-house me-2"></i>Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
