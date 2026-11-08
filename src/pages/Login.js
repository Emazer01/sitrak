import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  loginWithCredentials,
  isAuthenticated,
  ROLES_LIST,
} from "../services/authService";

export const Login = () => {
  document.title = "Login Sistem - SITRAK-AI";
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Jika sudah login, arahkan ke halaman asal atau dashboard
  useEffect(() => {
    if (isAuthenticated()) {
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [navigate, location]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      const result = await loginWithCredentials(username, password);
      if (result.success) {
        const destination =
          location.state?.from?.pathname || result.redirectTo || "/";
        navigate(destination, { replace: true });
      } else {
        setErrorMsg(result.message || "Gagal masuk. Periksa kredensial Anda.");
      }
    } catch (err) {
      setErrorMsg("Gagal menghubungi server autentikasi SITRAK-Backend.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center font-poppins py-4 px-3"
      style={{
        background:
          "radial-gradient(circle at 20% 20%, #162238 0%, #0b111e 60%, #060a12 100%)",
        color: "#f8f9fa",
      }}
    >
      <div className="container" style={{ maxWidth: "1120px" }}>
        <div className="row g-4 align-items-stretch">
          {/* KOLOM KIRI: FORM LOGIN UTAMA */}
          <div className="col-12 col-lg-5 d-flex">
            <div
              className="card border-0 shadow-lg w-100 rounded-4 overflow-hidden"
              style={{
                backgroundColor: "rgba(22, 30, 46, 0.92)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div className="card-body p-4 p-sm-5 d-flex flex-column justify-content-between">
                <div>
                  {/* Brand Logo & Judul */}
                  <div className="text-center mb-4">
                    <div
                      className="d-inline-flex align-items-center justify-content-center p-2 rounded-3 mb-3 shadow"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                      }}
                    >
                      <img
                        src="/SITRAK Tactical Target Emblem.png"
                        alt="SITRAK Emblem"
                        style={{ maxHeight: "76px", objectFit: "contain" }}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                    <h4 className="fw-bold text-white mb-1">
                      PORTAL AKSES SITRAK-AI
                    </h4>
                    <p className="text-white-50 small mb-0">
                      Sistem Informasi Tembakan & Evaluasi Akurasi Taktis
                    </p>
                  </div>

                  {/* Pesan Error */}
                  {errorMsg && (
                    <div
                      className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 small rounded-3"
                      role="alert"
                    >
                      <i className="bi bi-exclamation-triangle-fill fs-6"></i>
                      <div>{errorMsg}</div>
                    </div>
                  )}

                  {/* Form Input Kredensial */}
                  <form onSubmit={handleLoginSubmit}>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-light">
                        <i className="bi bi-person-badge me-1 text-primary"></i>
                        Username Akun
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-dark border-secondary text-secondary">
                          <i className="bi bi-person-fill"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control bg-dark border-secondary text-white"
                          placeholder="Masukkan username akun Anda"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          autoComplete="username"
                          required
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="form-label small fw-semibold text-light">
                        <i className="bi bi-key-fill me-1 text-primary"></i>
                        Kata Sandi (Password)
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-dark border-secondary text-secondary">
                          <i className="bi bi-lock-fill"></i>
                        </span>
                        <input
                          type={showPassword ? "text" : "password"}
                          className="form-control bg-dark border-secondary text-white"
                          placeholder="Masukkan kata sandi"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="current-password"
                          required
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex="-1"
                          title={
                            showPassword
                              ? "Sembunyikan sandi"
                              : "Tampilkan sandi"
                          }
                        >
                          <i
                            className={`bi ${
                              showPassword ? "bi-eye-slash" : "bi-eye"
                            }`}
                          ></i>
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary w-100 py-2 fw-bold rounded-3 shadow d-flex align-items-center justify-content-center gap-2"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm"
                            role="status"
                          />
                          <span>Memverifikasi Otoritas...</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-box-arrow-in-right fs-5"></i>
                          <span>Masuk ke Sistem SITRAK</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Footer Info Keamanan */}
                <div className="mt-4 pt-3 border-top border-secondary border-opacity-25 text-center">
                  <small className="text-white-50 d-block" style={{ fontSize: "11.5px" }}>
                    <i className="bi bi-shield-check text-success me-1"></i>
                    Dilindungi Kontrol Akses Berbasis Peran (3-Role RBAC)
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* KOLOM KANAN: DAFTAR PERAN & KEWENANGAN SISTEM */}
          <div className="col-12 col-lg-7 d-flex">
            <div
              className="card border-0 shadow-lg w-100 rounded-4 overflow-hidden"
              style={{
                backgroundColor: "rgba(22, 30, 46, 0.78)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div className="card-body p-4 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-2 border-bottom border-secondary border-opacity-25">
                    <div>
                      <h5 className="fw-bold text-white mb-0 d-flex align-items-center gap-2">
                        <i className="bi bi-shield-check text-info"></i>
                        Daftar Peran & Otoritas 3 Role SITRAK
                      </h5>
                      <small className="text-white-50">
                        Hak akses dan kewenangan operasional sistem terbagi menjadi 3 tingkat peran
                      </small>
                    </div>
                    <span className="badge bg-info-subtle text-info border border-info px-2 py-1">
                      3 Role Terstandarisasi
                    </span>
                  </div>

                  {/* Daftar 3 Role & Kewenangan */}
                  <div className="d-flex flex-column gap-3">
                    {ROLES_LIST.map((meta, idx) => {
                      return (
                        <div
                          key={meta.id}
                          className="p-3 rounded-3 border border-secondary border-opacity-25 bg-dark bg-opacity-50"
                        >
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <span
                              className={`badge ${meta.solidBadgeClass} p-2 rounded-2`}
                            >
                              <i className={`bi ${meta.icon} fs-6`}></i>
                            </span>
                            <div>
                              <div className="fw-bold text-white d-flex align-items-center gap-2">
                                <span>
                                  {idx + 1}. {meta.label}
                                </span>
                              </div>
                              <small className="text-white-50">
                                Kode Role: <code className="text-info">{meta.id}</code>
                              </small>
                            </div>
                          </div>

                          {/* Deskripsi Pokok Wewenang */}
                          <p
                            className="text-light small mb-2"
                            style={{ fontSize: "12.5px", lineHeight: "1.45" }}
                          >
                            {meta.description}
                          </p>

                          {/* Rincian Butir Tugas & Kewenangan */}
                          <div className="pt-2 border-top border-secondary border-opacity-25">
                            <div className="row g-1">
                              {meta.duties.map((duty, dIdx) => (
                                <div key={dIdx} className="col-12 col-md-6">
                                  <div
                                    className="d-flex align-items-center gap-1 text-white-50"
                                    style={{ fontSize: "11px" }}
                                  >
                                    <i className="bi bi-check2 text-success flex-shrink-0"></i>
                                    <span className="text-truncate">{duty}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-top border-secondary border-opacity-25 d-flex justify-content-between align-items-center small text-white-50">
                  <span>
                    <i className="bi bi-check2-circle text-success me-1"></i>
                    Setiap akun diverifikasi langsung ke basis data PostgreSQL secara aman
                  </span>
                  <span className="font-monospace" style={{ fontSize: "11px" }}>
                    v2.4 RBAC
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

