import React from "react";
import { render, screen } from "@testing-library/react";
import {
  DokumenLaporanIndividu,
  ModalCetakLaporanIndividu,
} from "./ModalCetakLaporanIndividu";

describe("DokumenLaporanIndividu & ModalCetakLaporanIndividu", () => {
  const dummySesi = {
    id_sesi: 1,
    kode_sesi: "SESI-2026-TEST",
    nama_sesi: "Latihan Menembak Presisi Pistol 25M",
    tanggal: "2026-11-06",
    status: "Selesai",
    nama_tempat_menembak: "Lapangan Tembak Utama",
    model_senjata: "G2 Elite",
    kaliber: "9 mm",
    jarak_meter: 25,
    sikap_menembak: "Berdiri Dua Tangan",
    pelatih: "Tommy Firmansyah",
    gelombang_list: [
      {
        id_gelombang: 1,
        nomor_gelombang: 1,
        penembak: [
          {
            id_personel_penembak: 101,
            lane: 1,
            nama: "Kapten Inf Nurkipin",
            nrp: "3920204180270",
            satuan: "Paspampres",
            pangkat: "Kapten Inf",
            total_skor: 96,
            total_max: 130,
            akurasi_akhir: 73.8,
            kategori: "Cukup",
            babak_scores: [
              {
                id_babak: 1,
                nomor: 1,
                nama: "Perkenaan (Koreksi)",
                skor: 10,
                max_skor: 30,
                akurasi: 33.3,
                hits: [{ x: 50, y: 45, score: 7 }],
              },
              {
                id_babak: 2,
                nomor: 2,
                nama: "Penilaian (Scoring)",
                skor: 86,
                max_skor: 100,
                akurasi: 86.0,
                hits: [
                  { x: 51, y: 50, score: 10 },
                  { x: 50, y: 49, score: 9 },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const dummyPenembak = dummySesi.gelombang_list[0].penembak[0];

  test("merender lembar laporan individu dengan identitas personel dan nilai babak", () => {
    render(
      <DokumenLaporanIndividu
        sesi={dummySesi}
        penembak={dummyPenembak}
        isPrintMode={false}
      />
    );

    // Memeriksa KOP dan Judul Dokumen
    expect(
      screen.getByText(/LEMBAR HASIL & EVALUASI MENEMBAK PERORANGAN/i)
    ).toBeInTheDocument();

    // Memeriksa Identitas Penembak
    expect(screen.getAllByText(/Kapten Inf Nurkipin/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3920204180270/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Paspampres/i)).toBeInTheDocument();

    // Memeriksa Total Skor dan Akurasi
    expect(screen.getAllByText(/73.8%/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/96/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cukup/i).length).toBeGreaterThan(0);
  });

  test("merender modal cetak laporan individu saat dibuka", () => {
    render(
      <ModalCetakLaporanIndividu
        isOpen={true}
        onClose={() => {}}
        sesi={dummySesi}
        selectedPenembak={dummyPenembak}
      />
    );

    expect(
      screen.getByText(/Pratinjau & Cetak Laporan Menembak Individu/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Cetak Lembar Individu/i)
    ).toBeInTheDocument();
  });
});
