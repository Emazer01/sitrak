import React from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  getCurrentUser,
  getRolePermissions,
  logoutUser,
} from "../services/authService";

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname =
    location?.pathname ||
    (typeof window !== "undefined" ? window.location.pathname : "");

  const user = getCurrentUser();
  const permissions = getRolePermissions(user);

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
    <nav className="navbar navbar-expand-lg bg-dark navbar-dark d-block d-md-none font-poppins sticky-top border-bottom border-secondary border-opacity-25 shadow-sm">
      <div className="container-fluid px-3 py-1">
        {/* Brand / Logo */}
        <Link className="navbar-brand text-white d-flex align-items-center gap-2" to="/">
          <img
            src="/SITRAK Tactical Analytics Emblem.png"
            alt="SITRAK Logo"
            height="42"
            className="d-inline-block align-text-top rounded p-1 bg-body-tertiary bg-opacity-10 border border-secondary border-opacity-25"
          />
          {user && (
            <span className={`badge ${user.solidBadgeClass} small`}>
              <i className={`bi ${user.roleIcon} me-1`}></i>
              {user.shortRoleLabel}
            </span>
          )}
        </Link>

        {/* Mobile Toggler */}
        <button
          className="navbar-toggler border-secondary border-opacity-50 shadow-none"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent"
          aria-controls="navbarSupportedContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Collapsible Content */}
        <div
          className="collapse navbar-collapse mt-2 pt-2 border-top border-secondary border-opacity-25"
          id="navbarSupportedContent"
        >
          <div className="px-2 mb-2">
            <small
              className="text-secondary text-uppercase fw-bold"
              style={{ fontSize: "11px", letterSpacing: "1px" }}
            >
              Navigasi Menu
            </small>
          </div>

          <ul className="nav nav-pills flex-column mb-auto pb-2">
            <li className="mb-2">
              <Link
                to="/"
                id="nav-btn-dashboard"
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
                id="nav-btn-latihan"
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
            {permissions.canAccessPengaturan && (
              <li className="mb-2">
                <Link
                  to="/pengaturan"
                  id="nav-btn-pengaturan"
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
          <div className="pt-2 border-top border-secondary border-opacity-25 mb-2">
            <div
              id="navbar-username"
              className="sidebar-link p-2 mb-2 text-decoration-none font-poppins text-white d-flex align-items-center rounded-2 bg-body-tertiary bg-opacity-10 border border-secondary border-opacity-25"
            >
              <i className="bi bi-person-circle px-2 text-info fs-5" />
              <div className="overflow-hidden flex-grow-1">
                <div
                  className="fw-medium text-truncate small"
                  id="isi-navbar-username"
                >
                  {user ? user.nama : "Pengguna"}
                </div>
                <div
                  className="text-white-50 text-truncate"
                  style={{ fontSize: "11px" }}
                >
                  {user ? `${user.roleLabel} • ${user.satuan}` : "Online"}
                </div>
              </div>
              <span
                className="badge bg-success-subtle text-success border border-success me-1"
                style={{ fontSize: "10px" }}
              >
                Aktif
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-outline-danger w-100 p-2 d-flex align-items-center justify-content-center font-poppins rounded-2 shadow-sm mt-2"
            >
              <i className="bi bi-box-arrow-left me-2"></i>
              <span className="fw-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
