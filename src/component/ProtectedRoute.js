import React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

/**
 * Komponen pelindung rute (ProtectedRoute) berbasis autentikasi & Role-Based Access Control (RBAC).
 * - Jika belum login: otomatis diarahkan ke halaman /login.
 * - Jika role tidak memiliki izin pada rute tertentu: menampilkan pesan pembatasan kewenangan.
 */
export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();

  // 1. Jika belum login, arahkan ke /login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Jika halaman membutuhkan role tertentu dan role user tidak termasuk di dalamnya
  if (
    Array.isArray(allowedRoles) &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role)
  ) {
    return (
      <div>
        <Navbar />
        <div className="d-flex min-vh-100">
          <Sidebar />
          <div className="w-100 d-flex align-items-center justify-content-center p-4 font-poppins bg-body-tertiary">
            <div
              className="card border-0 shadow-sm p-4 p-md-5 text-center rounded-4"
              style={{ maxWidth: "540px" }}
            >
              <div className="mb-3">
                <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-danger-subtle text-danger p-3">
                  <i className="bi bi-shield-lock-fill display-5"></i>
                </span>
              </div>
              <h4 className="fw-bold text-dark mb-2">
                Akses Dibatasi Sesuai Kewenangan Role
              </h4>
              <p className="text-secondary small mb-3">
                Anda saat ini masuk sebagai{" "}
                <strong className="text-dark">{user.nama}</strong> dengan peran{" "}
                <span className={`badge ${user.badgeClass}`}>
                  {user.roleLabel}
                </span>
                . Halaman ini hanya dapat diakses oleh{" "}
                <strong>Administrator</strong>.
              </p>

              <div className="bg-body-tertiary border rounded-3 p-3 text-start mb-4 small">
                <div className="fw-bold text-dark mb-1">
                  <i className="bi bi-info-circle-fill text-primary me-1"></i>
                  Kewenangan Akun Anda ({user.roleLabel}):
                </div>
                <p className="text-secondary mb-0">{user.roleDescription}</p>
              </div>

              <div className="d-flex justify-content-center gap-2">
                <button
                  type="button"
                  className="btn btn-primary px-4 shadow-sm"
                  onClick={() => navigate("/")}
                >
                  <i className="bi bi-house-door-fill me-1"></i> Kembali ke
                  Dashboard
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary px-3"
                  onClick={() => navigate("/latihan")}
                >
                  <i className="bi bi-bullseye me-1"></i> Sesi Latihan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

