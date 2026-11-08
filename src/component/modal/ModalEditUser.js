import React, { useState, useEffect } from "react";
import {
  ROLES,
  ROLE_METADATA,
  updateUserInBackend,
} from "../../services/authService";

/**
 * ModalEditUser
 * Modal formulir bagi Administrator untuk mengubah profil akun, hak akses role,
 * status aktif/nonaktif, serta opsi reset kata sandi pada basis data PostgreSQL.
 */
export const ModalEditUser = ({
  show = false,
  user = null,
  onHide,
  onUserUpdated,
}) => {
  const [form, setForm] = useState({
    nama: "",
    pangkat: "",
    nrp: "",
    jabatan: "",
    satuan: "",
    role: ROLES.OPERATOR,
    status: "Aktif",
    newPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        nama: user.nama || user.nama_lengkap || "",
        pangkat: user.pangkat || "",
        nrp: user.nrp || "",
        jabatan: user.jabatan || "",
        satuan: user.satuan || "",
        role: user.role || ROLES.OPERATOR,
        status: user.status || "Aktif",
        newPassword: "",
      });
      setErrorMessage("");
    }
  }, [user]);

  if (!show || !user) return null;

  const currentRoleMeta = ROLE_METADATA[form.role] || ROLE_METADATA[ROLES.OPERATOR];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!form.nama.trim()) {
      setErrorMessage("Nama lengkap personel wajib diisi.");
      return;
    }
    if (form.newPassword && form.newPassword.length < 6) {
      setErrorMessage("Kata sandi baru minimal 6 karakter.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nama: form.nama.trim(),
        pangkat: form.pangkat.trim() || "-",
        nrp: form.nrp.trim() || "-",
        jabatan: form.jabatan.trim() || currentRoleMeta.label,
        satuan: form.satuan.trim() || "Satuan SITRAK",
        role: form.role,
        status: form.status,
      };

      if (form.newPassword && form.newPassword.trim()) {
        payload.password = form.newPassword.trim();
      }

      const res = await updateUserInBackend(user.id_user || user.id, payload);

      if (res.success) {
        if (onUserUpdated) {
          onUserUpdated(res.account);
        }
        onHide();
      } else {
        setErrorMessage(res.message || "Gagal memperbarui akun pengguna.");
      }
    } catch (err) {
      setErrorMessage("Terjadi kesalahan koneksi saat memperbarui data akun.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.72)", zIndex: 1060 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg bg-body">
          {/* Modal Header */}
          <div className="modal-header border-bottom py-3 px-4 bg-primary text-white">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-pencil-square fs-5"></i>
              <div>
                <h5 className="modal-title fw-bold mb-0">Ubah Akun: {user.username}</h5>
                <small className="opacity-75">
                  ID #{user.id_user || user.id} • Perbarui profil, role, atau atur ulang kata sandi
                </small>
              </div>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onHide}
              disabled={isSubmitting}
              aria-label="Close"
            ></button>
          </div>

          {/* Modal Body */}
          <div className="modal-body p-4">
            {errorMessage && (
              <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 small rounded-3 mb-3">
                <i className="bi bi-exclamation-triangle-fill fs-6 flex-shrink-0"></i>
                <div>{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                {/* 1. Pemilihan Tingkat Role */}
                <div className="col-12">
                  <label className="form-label small fw-bold mb-1">
                    <i className="bi bi-shield-check text-primary me-1"></i>
                    Role & Hak Akses Pengguna
                  </label>
                  <div className="row g-2">
                    {[ROLES.OPERATOR, ROLES.ADMINISTRATOR, ROLES.PELATIH].map((rKey) => {
                      const rMeta = ROLE_METADATA[rKey];
                      const isSelected = form.role === rKey;
                      return (
                        <div key={rKey} className="col-12 col-md-4">
                          <div
                            className={`p-2 rounded-3 border h-100 cursor-pointer transition-all ${
                              isSelected
                                ? "border-primary bg-primary-subtle shadow-sm"
                                : "border-secondary-subtle bg-body-tertiary"
                            }`}
                            onClick={() => setForm((prev) => ({ ...prev, role: rKey }))}
                            style={{ cursor: "pointer" }}
                          >
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <span className={`badge ${rMeta.solidBadgeClass} p-1 rounded`}>
                                <i className={`bi ${rMeta.icon}`}></i>
                              </span>
                              <span className="fw-bold small">{rMeta.label}</span>
                            </div>
                            <p
                              className="text-secondary small mb-0"
                              style={{ fontSize: "11px", lineHeight: "1.3" }}
                            >
                              {rMeta.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Informasi Status & Reset Password */}
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-bold mb-1">Status Akun</label>
                  <select
                    className="form-select form-select-sm"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="Aktif">Aktif (Dapat Login)</option>
                    <option value="Nonaktif">Nonaktif (Dibekukan)</option>
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-bold mb-1">
                    Atur Ulang Kata Sandi (Opsional)
                  </label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-body-tertiary">
                      <i className="bi bi-key"></i>
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control"
                      placeholder="Kosongkan jika sandi tidak diubah"
                      value={form.newPassword}
                      onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex="-1"
                    >
                      <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                    </button>
                  </div>
                  <small className="text-muted" style={{ fontSize: "11px" }}>
                    Isi hanya jika ingin mengubah kata sandi pengguna ini.
                  </small>
                </div>

                {/* 3. Profil & Identitas Personel */}
                <div className="col-12">
                  <hr className="my-1 border-secondary border-opacity-25" />
                  <span className="badge bg-secondary-subtle text-secondary small fw-bold">
                    Identitas Personel Pemilik Akun
                  </span>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold mb-1">Pangkat</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Contoh: Serka / Kapten Inf"
                    value={form.pangkat}
                    onChange={(e) => setForm({ ...form, pangkat: e.target.value })}
                  />
                </div>

                <div className="col-12 col-md-8">
                  <label className="form-label small fw-semibold mb-1">
                    Nama Lengkap <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.nama}
                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                    required
                  />
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold mb-1">NRP / NIP</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.nrp}
                    onChange={(e) => setForm({ ...form, nrp: e.target.value })}
                  />
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold mb-1">Jabatan</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.jabatan}
                    onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                  />
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold mb-1">Satuan / Unit</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.satuan}
                    onChange={(e) => setForm({ ...form, satuan: e.target.value })}
                  />
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="d-flex justify-content-end align-items-center gap-2 mt-4 pt-3 border-top">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary px-3"
                  onClick={onHide}
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary px-4 fw-semibold shadow-sm d-flex align-items-center gap-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" />
                      <span>Memperbarui...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg"></i>
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

