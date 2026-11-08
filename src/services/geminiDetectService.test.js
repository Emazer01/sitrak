import axios from "axios";
import { testGeminiApiKey } from "./geminiDetectService";

describe("geminiDetectService - Isolation from SITRAK JWT Auth Header", () => {
  const originalDefaults = { ...axios.defaults.headers.common };

  afterEach(() => {
    axios.defaults.headers.common = { ...originalDefaults };
    jest.restoreAllMocks();
  });

  test("mengembalikan error jika API Key kosong", async () => {
    const res = await testGeminiApiKey("");
    expect(res.valid).toBe(false);
    expect(res.message).toContain("API Key belum diisi");
  });

  test("berhasil melakukan uji koneksi ke Google Gemini API meskipun Authorization Bearer SITRAK aktif di global axios", async () => {
    // Simulasikan keadaan user sudah login di SITRAK (header Authorization terpasang di global axios)
    axios.defaults.headers.common["Authorization"] = "Bearer sitrak_real_operator_jwt_token_12345";

    // Panggil testGeminiApiKey dengan API Key dari .env
    const res = await testGeminiApiKey();
    
    // Pastikan tidak ada lagi error konflik header otentikasi Google:
    // 'API key for authentication is used with other authentication credentials. Expected only one form of authentication.'
    expect(res.message).not.toContain("API key for authentication is used with other authentication credentials");
    expect(res.valid).toBe(true);
    expect(res.models).toBeDefined();
    expect(res.models.length).toBeGreaterThan(0);
  });
});
