import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  getCurrentUser,
  getRolePermissions,
  logoutUser,
} from "../services/authService";

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname =
    location?.pathname ||
    (typeof window !== "undefined" ? window.location.pathname : "");

  const user = getCurrentUser();
  const permissions = getRolePermissions(user);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const isDashboardActive =
    pathname === "/" || pathname === "" || pathname === "/dashboard";
  const isLatihanActive =
    pathname.startsWith("/latihan") || pathname.startsWith("/detail-sesi");
  const isPengaturanActive = pathname.startsWith("/pengaturan");

  const handleLogout = () => {
    logoutUser();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <div
        className="d-flex flex-column flex-shrink-0 p-3 bg-dark text-white sidebar shadow sticky-top col-3 col-md-2 d-none d-md-flex border-end border-secondary border-opacity-25"
        style={{ height: "100vh" }}
      >
        {/* Emblem / Brand Header */}
        <Link
          to="/"
          className="d-flex align-items-center mb-3 text-white text-decoration-none p-2 rounded-3 bg-body-tertiary bg-opacity-10 border border-secondary border-opacity-25 shadow-sm"
        >
          <img
            src="/SITRAK Tactical Target Emblem.png"
            alt="SITRAK Emblem"
            className="img-fluid w-100 rounded"
          />
        </Link>

        {/* Badge Role Aktif */}
        {user && (
          <div className="px-2 py-2 mb-3 rounded-3 bg-black bg-opacity-25 border border-secondary border-opacity-25">
            <div className="d-flex align-items-center gap-2">
              <span
                className={`badge ${user.solidBadgeClass} p-1 px-2 rounded-2`}
              >
                <i className={`bi ${user.roleIcon}`}></i>
              </span>
              <div className="overflow-hidden">
                <div
                  className="text-uppercase fw-bold text-info text-truncate"
                  style={{ fontSize: "10.5px", letterSpacing: "0.5px" }}
                >
                  {user.roleLabel}
                </div>
                <div
                  className="text-white-50 text-truncate"
                  style={{ fontSize: "11px" }}
                >
                  {user.satuan}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Label Navigasi */}
        <div className="px-2 mb-2">
          <small
            className="text-secondary text-uppercase fw-bold"
            style={{ fontSize: "11px", letterSpacing: "1px" }}
          >
            Navigasi Utama
          </small>
        </div>

        {/* Menu Navigasi Berdasarkan Kewenangan Role */}
        <ul className="nav nav-pills flex-column mb-auto">
          <li className="mb-2">
            <Link
              to="/"
              id="btn-dashboard"
              className={`sidebar-link ${
                isDashboardActive ? "sidebar-active" : ""
              } p-2 text-decoration-none font-poppins d-flex align-items-center rounded-2`}
            >
              <i className="bi bi-house-door-fill px-2 text-primary fs-5" />
              <span className="fw-medium">Dashboard</span>
            </Link>
          </li>
          <li className="mb-2">
            <Link
              to="/latihan"
              id="btn-latihan"
              className={`sidebar-link ${
                isLatihanActive ? "sidebar-active" : ""
              } p-2 text-decoration-none font-poppins d-flex align-items-center rounded-2`}
            >
              <i className="bi bi-bullseye px-2 text-primary fs-5" />
              <span className="fw-medium">
                {permissions.isPelatih ? "Pantau Latihan" : "Latihan"}
              </span>
            </Link>
          </li>

          {/* Menu Pengaturan: Hanya ditampilkan untuk Administrator */}
          {permissions.canAccessPengaturan && (
            <li className="mb-2">
              <Link
                to="/pengaturan"
                id="btn-pengaturan"
                className={`sidebar-link ${
                  isPengaturanActive ? "sidebar-active" : ""
                } p-2 text-decoration-none font-poppins d-flex align-items-center rounded-2`}
              >
                <i className="bi bi-gear-fill px-2 text-primary fs-5" />
                <span className="fw-medium">Pengaturan</span>
              </Link>
            </li>
          )}
        </ul>

        {/* User Profile & Logout */}
        <div className="mt-auto pt-3 border-top border-secondary border-opacity-25">
          <button
            type="button"
            id="sidebar-username"
            onClick={() => setShowProfileModal(true)}
            className="sidebar-link w-100 p-2 mb-2 text-start text-decoration-none font-poppins text-white d-flex align-items-center rounded-2 bg-body-tertiary bg-opacity-10 border border-secondary border-opacity-25"
            title="Lihat detail profil & kewenangan akun"
          >
            <i className="bi bi-person-circle px-2 text-info fs-5" />
            <div className="overflow-hidden flex-grow-1 me-1">
              <div
                className="fw-semibold text-truncate small"
                id="isi-sidebar-username"
              >
                {user ? user.nama : "Pengguna"}
              </div>
              <div
                className="text-white-50 text-truncate"
                style={{ fontSize: "10.5px" }}
              >
                {user ? `@${user.username} • ${user.shortRoleLabel}` : "Online"}
              </div>
            </div>
            <span
              className="badge bg-success-subtle text-success border border-success"
              style={{ fontSize: "9px" }}
            >
              Aktif
            </span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-outline-danger w-100 p-2 d-flex align-items-center justify-content-center font-poppins rounded-2 shadow-sm"
          >
            <i className="bi bi-box-arrow-left me-2"></i>
            <span className="fw-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Modal Detail Profil & Kewenangan Akun */}
      {showProfileModal && user && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center font-poppins"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            zIndex: 1090,
            backdropFilter: "blur(4px)",
            padding: "1rem",
          }}
          onClick={() => setShowProfileModal(false)}
        >
          <div
            className="card border-0 shadow-lg rounded-4 overflow-hidden bg-body text-body"
            style={{ width: "100%", maxWidth: "480px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header bg-dark text-white p-3 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <span className={`badge ${user.solidBadgeClass} p-2`}>
                  <i className={`bi ${user.roleIcon} fs-5`}></i>
                </span>
                <div>
                  <h6 className="mb-0 fw-bold">{user.nama}</h6>
                  <small className="text-white-50">
                    NRP: {user.nrp} • {user.satuan}
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowProfileModal(false)}
              ></button>
            </div>
            <div className="card-body p-4">
              <div className="mb-3">
                <span className={`badge ${user.badgeClass} px-3 py-2 fs-6`}>
                  <i className={`bi ${user.roleIcon} me-1`}></i>
                  Role: {user.roleLabel}
                </span>
              </div>
              <p className="text-secondary small mb-3">
                {user.roleDescription}
              </p>
              <div className="bg-body-tertiary border rounded-3 p-3 small">
                <div className="fw-bold text-dark mb-2">
                  <i className="bi bi-check2-all text-primary me-1"></i>
                  Rincian Kewenangan Akun:
                </div>
                <ul className="mb-0 ps-3 text-secondary">
                  {(user.roleDuties || []).map((duty, i) => (
                    <li key={i} className="mb-1">
                      {duty}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="card-footer bg-body-tertiary p-3 d-flex justify-content-between">
              <button
                type="button"
                className="btn btn-secondary btn-sm px-3"
                onClick={() => setShowProfileModal(false)}
              >
                Tutup
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm px-3"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-left me-1"></i> Ganti Akun / Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
