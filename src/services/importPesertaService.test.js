import {
  normalizeNrp,
  parsePesertaFromSheetData,
  matchPesertaWithDatabase,
  insertNewPesertaToDatabase,
  processImportPesertaSesi,
} from "./importPesertaService";

describe("Fitur Import Peserta Latihan via Excel & Sinkronisasi Database", () => {
  describe("1. normalizeNrp", () => {
    test("menghapus spasi dan mengubah ke huruf kecil", () => {
      expect(normalizeNrp("  524250  ")).toBe("524250");
      expect(normalizeNrp("13483/P")).toBe("13483/p");
      expect(normalizeNrp("  13483/p  ")).toBe("13483/p");
      expect(normalizeNrp(524250)).toBe("524250");
      expect(normalizeNrp(null)).toBe("");
      expect(normalizeNrp(undefined)).toBe("");
    });
  });

  describe("2. parsePesertaFromSheetData", () => {
    test("mem-parsing baris sheet standar dengan kolom NRP, Nama Lengkap, Satuan", () => {
      const rawJson = [
        {
          NRP: "524250",
          "Nama Lengkap": "Kolonel Lek Kurniawan S., A.Md.",
          Satuan: "Kohanudnas",
        },
        {
          NRP: "13483/P",
          "Nama Lengkap": "Kolonel Laut (S) Mufidin, S.T.",
          Satuan: "Koarmada I",
        },
      ];

      const result = parsePesertaFromSheetData(rawJson);
      expect(result).toHaveLength(2);
      expect(result[0].nrp).toBe("524250");
      expect(result[0].nama).toBe("Kolonel Lek Kurniawan S., A.Md.");
      expect(result[0].satuan).toBe("Kohanudnas");
      expect(result[0].status).toBe("valid");

      expect(result[1].nrp).toBe("13483/P");
      expect(result[1].status).toBe("valid");
    });

    test("mendeteksi variasi nama kolom (NIP, Personel, Unit)", () => {
      const rawJson = [
        {
          nip: "11030036360882",
          personel: "Letkol Inf Tommy Firmansyah",
          unit: "Kopassus",
        },
      ];

      const result = parsePesertaFromSheetData(rawJson);
      expect(result).toHaveLength(1);
      expect(result[0].nrp).toBe("11030036360882");
      expect(result[0].nama).toBe("Letkol Inf Tommy Firmansyah");
      expect(result[0].satuan).toBe("Kopassus");
      expect(result[0].status).toBe("valid");
    });

    test("menandai baris tidak valid jika NRP atau Nama kosong", () => {
      const rawJson = [
        { NRP: "", "Nama Lengkap": "Prajurit Tanpa NRP", Satuan: "Sat A" },
        { NRP: "999888", "Nama Lengkap": "", Satuan: "Sat B" },
      ];

      const result = parsePesertaFromSheetData(rawJson);
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe("invalid");
      expect(result[0].errorNote).toContain("NRP");
      expect(result[1].status).toBe("invalid");
      expect(result[1].errorNote).toContain("Nama");
    });

    test("mencegah duplikasi NRP internal di dalam file Excel yang sama", () => {
      const rawJson = [
        { NRP: "524250", "Nama Lengkap": "Kolonel Lek Kurniawan", Satuan: "Sat A" },
        { NRP: "524250", "Nama Lengkap": "Kolonel Lek Kurniawan (Duplikat)", Satuan: "Sat A" },
      ];

      const result = parsePesertaFromSheetData(rawJson);
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe("valid");
      expect(result[1].status).toBe("duplicate_in_file");
    });
  });

  describe("3. matchPesertaWithDatabase (Pemisahan Peserta Lama vs Baru)", () => {
    const existingMaster = [
      { id: 101, nrp: "524250", nama: "Kolonel Lek Kurniawan", satuan: "Kohanudnas" },
      { id: 102, nrp: "13483/P", nama: "Kolonel Laut Mufidin", satuan: "Koarmada I" },
    ];

    test("mengidentifikasi peserta yang sudah ada di database dan yang belum ada", () => {
      const parsedRows = [
        { nrp: "524250", nama: "Kolonel Lek Kurniawan", satuan: "Kohanudnas", normalizedNrp: "524250", status: "valid" },
        { nrp: "999111", nama: "Peserta Baru Satu", satuan: "Kopassus", normalizedNrp: "999111", status: "valid" },
        { nrp: "13483/p", nama: "Kolonel Laut Mufidin", satuan: "Koarmada I", normalizedNrp: "13483/p", status: "valid" },
      ];

      const { matchedExisting, unmatchedNew, invalidRows } = matchPesertaWithDatabase(
        parsedRows,
        existingMaster
      );

      // 2 peserta sudah ada di database
      expect(matchedExisting).toHaveLength(2);
      expect(matchedExisting.map((p) => p.nrp)).toEqual(["524250", "13483/p"]);
      expect(matchedExisting[0].existingId).toBe(101);
      expect(matchedExisting[1].existingId).toBe(102);

      // 1 peserta baru belum ada di database
      expect(unmatchedNew).toHaveLength(1);
      expect(unmatchedNew[0].nrp).toBe("999111");

      expect(invalidRows).toHaveLength(0);
    });
  });

  describe("4. insertNewPesertaToDatabase (Aturan Insert Database)", () => {
    test("JIKA SEMUA PESERTA SUDAH ADA DI DATABASE: tidak melakukan pemanggilan API insert", async () => {
      const mockPost = jest.fn();
      const mockAxios = { post: mockPost };

      const result = await insertNewPesertaToDatabase({
        unmatchedNew: [],
        axiosClient: mockAxios,
      });

      expect(mockPost).not.toHaveBeenCalled();
      expect(result.insertedPersonel).toHaveLength(0);
      expect(result.failedRows).toHaveLength(0);
    });

    test("JIKA ADA PESERTA BARU: memanggil backend untuk menambahkan data personel baru", async () => {
      const mockPost = jest.fn().mockResolvedValue({
        status: 201,
        data: [
          { id_personel_penembak: 201, nrp: "888111", nama_personel_penembak: "Prada Joko" },
          { id_personel_penembak: 202, nrp: "888222", nama_personel_penembak: "Prada Slamet" },
        ],
      });
      const mockAxios = { post: mockPost };

      const unmatchedNew = [
        { nrp: "888111", nama: "Prada Joko", satuan: "Yon A" },
        { nrp: "888222", nama: "Prada Slamet", satuan: "Yon B" },
      ];

      const result = await insertNewPesertaToDatabase({
        unmatchedNew,
        backendUrl: "http://test-backend:1200",
        token: "fake-token",
        axiosClient: mockAxios,
      });

      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(result.insertedPersonel).toHaveLength(2);
      expect(result.insertedPersonel[0].id).toBe(201);
      expect(result.insertedPersonel[0].nrp).toBe("888111");
      expect(result.insertedPersonel[1].id).toBe(202);
      expect(result.insertedPersonel[1].nrp).toBe("888222");
    });
  });

  describe("5. processImportPesertaSesi (Skenario Penuh Sinkronisasi & Pemilihan)", () => {
    test("Skenario Campuran: Peserta lama dipilih (tanpa insert baru), peserta baru di-insert lalu dipilih", async () => {
      const currentMasterPersonel = [
        { id: 1, nrp: "NRP-001", nama: "Lettu A", satuan: "Kopassus" },
        { id: 2, nrp: "NRP-002", nama: "Lettu B", satuan: "Kostrad" },
      ];

      const parsedRows = [
        // Peserta Lama 1 (Sudah ada di DB id: 1)
        { nrp: "NRP-001", nama: "Lettu A", satuan: "Kopassus", normalizedNrp: "nrp-001", status: "valid" },
        // Peserta Baru 1 (Belum ada di DB)
        { nrp: "NRP-003", nama: "Lettu C (Baru)", satuan: "Marinir", normalizedNrp: "nrp-003", status: "valid" },
        // Peserta Lama 2 (Sudah ada di DB id: 2)
        { nrp: "NRP-002", nama: "Lettu B", satuan: "Kostrad", normalizedNrp: "nrp-002", status: "valid" },
      ];

      const mockPost = jest.fn().mockImplementation((url, payload) => {
        // Pastikan hanya peserta baru (NRP-003) yang dikirim ke backend!
        expect(payload).toHaveLength(1);
        expect(payload[0].nrp).toBe("NRP-003");

        return Promise.resolve({
          status: 201,
          data: [{ id_personel_penembak: 3, nrp: "NRP-003", nama_personel_penembak: "Lettu C (Baru)" }],
        });
      });

      const mockAxios = { post: mockPost };

      const result = await processImportPesertaSesi({
        parsedRows,
        currentMasterPersonel,
        existingSelectedIds: [],
        axiosClient: mockAxios,
      });

      // 1. Backend hanya dipanggil sekali untuk peserta baru (NRP-003)
      expect(mockPost).toHaveBeenCalledTimes(1);

      // 2. Master personel diperbarui mencakup peserta baru (total 3 personel)
      expect(result.updatedMasterPersonel).toHaveLength(3);
      expect(result.updatedMasterPersonel.map((p) => p.nrp)).toEqual(["NRP-001", "NRP-002", "NRP-003"]);

      // 3. Seluruh peserta dari file Excel (baik lama maupun baru) otomatis dipilih
      expect(result.newSelectedPersonelIds).toHaveLength(3);
      expect(result.newSelectedPersonelIds).toContain(1); // ID peserta lama 1
      expect(result.newSelectedPersonelIds).toContain(2); // ID peserta lama 2
      expect(result.newSelectedPersonelIds).toContain(3); // ID peserta baru 3

      // 4. Ringkasan hasil akurat
      expect(result.summary.alreadyInDbCount).toBe(2);
      expect(result.summary.newInsertedCount).toBe(1);
      expect(result.summary.validRowsCount).toBe(3);
    });
  });
});

