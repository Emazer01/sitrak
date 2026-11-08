import axios from "axios";
import {
  ROLES,
  ROLE_METADATA,
  ROLES_LIST,
  loginWithCredentials,
  logoutUser,
  getCurrentUser,
  isAuthenticated,
  getRolePermissions,
  createUserInBackend,
  updateUserInBackend,
  deleteUserInBackend,
} from "./authService";

jest.mock("axios", () => ({
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  defaults: {
    headers: {
      common: {},
    },
  },
}));

describe("authService - Real Backend & PostgreSQL Login Mechanism (3 Roles, No Hardcoded Accounts)", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test("mendefinisikan 3 role sistem terstandarisasi dengan deskripsi dan rincian tugas", () => {
    expect(ROLES_LIST.length).toBe(3);

    const roleIds = ROLES_LIST.map((r) => r.id);
    expect(roleIds).toContain(ROLES.OPERATOR);
    expect(roleIds).toContain(ROLES.ADMINISTRATOR);
    expect(roleIds).toContain(ROLES.PELATIH);

    ROLES_LIST.forEach((r) => {
      expect(r.label).toBeTruthy();
      expect(r.description).toBeTruthy();
      expect(Array.isArray(r.duties)).toBe(true);
      expect(r.duties.length).toBeGreaterThan(0);
    });
  });

  test("berhasil login sebagai Operator Latihan melalui endpoint POST /auth/login", async () => {
    axios.post.mockResolvedValueOnce({
      status: 200,
      data: {
        status: "success",
        access_token: "jwt_real_operator_token",
        user: {
          id_user: 1,
          username: "operator",
          nama_lengkap: "Serka Andi Pratama",
          nrp: "2115004821",
          satuan: "Denlat Menembak",
          role: ROLES.OPERATOR,
        },
      },
    });

    const res = await loginWithCredentials("operator", "dummy_pass_123");
    expect(res.success).toBe(true);
    expect(res.user.role).toBe(ROLES.OPERATOR);
    expect(localStorage.getItem("access_token")).toBe("jwt_real_operator_token");
    expect(isAuthenticated()).toBe(true);

    const perms = getRolePermissions(res.user);
    expect(perms.canCreateSession).toBe(true);
    expect(perms.canManageSessionStatus).toBe(true);
    expect(perms.canUploadTarget).toBe(true);
    expect(perms.canPrepareReport).toBe(true);
    expect(perms.canManageMasterData).toBe(false);
  });

  test("berhasil login sebagai Administrator melalui endpoint POST /auth/login", async () => {
    axios.post.mockResolvedValueOnce({
      status: 200,
      data: {
        status: "success",
        access_token: "jwt_real_admin_token",
        user: {
          id_user: 2,
          username: "admin",
          nama_lengkap: "Kapten Chb Budi Santoso",
          nrp: "1108002914",
          satuan: "Siskomlek & Data SITRAK",
          role: ROLES.ADMINISTRATOR,
        },
      },
    });

    const res = await loginWithCredentials("admin", "dummy_pass_123");
    expect(res.success).toBe(true);
    expect(res.user.role).toBe(ROLES.ADMINISTRATOR);

    const perms = getRolePermissions(res.user);
    expect(perms.canManageMasterData).toBe(true);
    expect(perms.canCheckServiceConnectivity).toBe(true);
    expect(perms.canManageAccountsAndConfig).toBe(true);
    expect(perms.canCoordinateServer).toBe(true);
  });

  test("berhasil login sebagai Pelatih/Juri/Pimpinan melalui endpoint POST /auth/login", async () => {
    axios.post.mockResolvedValueOnce({
      status: 200,
      data: {
        status: "success",
        access_token: "jwt_real_pelatih_token",
        user: {
          id_user: 3,
          username: "pelatih",
          nama_lengkap: "Mayor Inf Hendra Wijaya",
          nrp: "1102008471",
          satuan: "Tim Wasdal & Evaluasi",
          role: ROLES.PELATIH,
        },
      },
    });

    const res = await loginWithCredentials("pelatih", "dummy_pass_123");
    expect(res.success).toBe(true);
    expect(res.user.role).toBe(ROLES.PELATIH);

    const perms = getRolePermissions(res.user);
    expect(perms.canViewScoresAndRecap).toBe(true);
    expect(perms.canEvaluateReport).toBe(true);
    expect(perms.canPrepareReport).toBe(true);
    expect(perms.canCreateSession).toBe(false);
    expect(perms.canUploadTarget).toBe(false);
    expect(perms.canManageMasterData).toBe(false);
  });

  test("menolak login ketika backend mengembalikan HTTP 401 dan dapat logout dengan bersih", async () => {
    axios.post.mockRejectedValueOnce({
      response: {
        status: 401,
        data: {
          status: "error",
          message: "Username atau kata sandi tidak sesuai. Silakan periksa kembali.",
        },
      },
    });

    const failed = await loginWithCredentials("operator", "passwordsalah");
    expect(failed.success).toBe(false);
    expect(isAuthenticated()).toBe(false);

    logoutUser();
    expect(getCurrentUser()).toBeNull();
  });

  test("Administrator dapat menambahkan, memperbarui (reset password), dan menghapus akun di tabel users PostgreSQL via API", async () => {
    // 1. Tambah Akun
    axios.post.mockResolvedValueOnce({
      status: 201,
      data: {
        status: "success",
        user: {
          id_user: 4,
          username: "juri2",
          nama_lengkap: "Letkol Inf Ahmad",
          nrp: "1105001234",
          satuan: "Pussenif",
          role: ROLES.PELATIH,
        },
      },
    });

    const added = await createUserInBackend({
      username: "juri2",
      password: "passwordbaru123",
      nama: "Letkol Inf Ahmad",
      nrp: "1105001234",
      satuan: "Pussenif",
      role: ROLES.PELATIH,
    });
    expect(added.success).toBe(true);
    expect(added.account.id_user).toBe(4);

    // 2. Update Akun & Reset Password
    axios.put.mockResolvedValueOnce({
      status: 200,
      data: {
        status: "success",
        user: {
          id_user: 4,
          username: "juri2",
          nama_lengkap: "Letkol Inf Ahmad, M.Si.",
          nrp: "1105001234",
          satuan: "Pussenif",
          role: ROLES.PELATIH,
          status: "Aktif",
        },
      },
    });

    const updated = await updateUserInBackend(4, {
      nama: "Letkol Inf Ahmad, M.Si.",
      password: "passwordreset456",
    });
    expect(updated.success).toBe(true);
    expect(updated.account.nama).toBe("Letkol Inf Ahmad, M.Si.");

    // 3. Hapus Akun
    axios.delete.mockResolvedValueOnce({
      status: 200,
      data: {
        status: "success",
        message: "Akun pengguna berhasil dihapus dari database",
      },
    });

    const removed = await deleteUserInBackend(4);
    expect(removed.success).toBe(true);
  });
});
