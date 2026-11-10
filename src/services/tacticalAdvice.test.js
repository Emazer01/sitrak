import {
  generateTacticalAdvice,
  resolveWeaponCategory,
} from "./sitrakDetectService";

describe("Weapon-Specific Tactical Advice & Ballistics Evaluation", () => {
  test("resolves weapon categories accurately", () => {
    expect(resolveWeaponCategory("Pindad G2 Elite")).toBe("pistol");
    expect(resolveWeaponCategory("Glock 17")).toBe("pistol");
    expect(resolveWeaponCategory({ model_senjata: "SS2-V4", kaliber: "5.56" })).toBe("senapan_serbu");
    expect(resolveWeaponCategory({ model_senjata: "SPR-2", jenis_senjata: "Senapan Runduk" })).toBe("sniper");
    expect(resolveWeaponCategory({ model_senjata: "PM2-V1", jenis_senjata: "Submachine Gun" })).toBe("smg");
  });

  test("generates weapon-specific and biomechanical advice for Pistol G2 in Standing stance", () => {
    const advice = generateTacticalAdvice(
      "bottom-left",
      24.0,
      94.0,
      { model_senjata: "Pindad G2 Combat", jenis_senjata: "Pistol", kaliber: 9.0 },
      "Berdiri"
    );

    expect(Array.isArray(advice)).toBe(true);
    expect(advice.length).toBeGreaterThanOrEqual(4);

    // Biomechanical trigger jerking
    expect(advice.some((s) => s.includes("Trigger Jerking") || s.includes("sentakan pelatuk"))).toBe(true);

    // Weapon specific note for pistol
    expect(advice.some((s) => s.includes("Pindad G2 Combat") && s.includes("60-70%"))).toBe(true);

    // Stance note for standing
    expect(advice.some((s) => s.includes("Sikap Berdiri") && s.includes("athletic forward lean"))).toBe(true);

    // Remedial drill for pistol flinch
    expect(advice.some((s) => s.includes("Ball & Dummy Drill"))).toBe(true);
  });

  test("generates weapon-specific advice for Assault Rifle SS2 in Prone stance", () => {
    const advice = generateTacticalAdvice(
      "top-left",
      55.0,
      78.0,
      { model_senjata: "Pindad SS2-V1", jenis_senjata: "Senapan Serbu", kaliber: 5.56 },
      "Tiarap"
    );

    expect(Array.isArray(advice)).toBe(true);

    // Recoil anticipation pushing
    expect(advice.some((s) => s.includes("Antisipasi Hentakan") || s.includes("mendorong moncong"))).toBe(true);

    // Weapon specific note for assault rifle cheek weld & shoulder pocket
    expect(advice.some((s) => s.includes("Pindad SS2-V1") && s.includes("cheek weld"))).toBe(true);

    // Stance note for prone
    expect(advice.some((s) => s.includes("Sikap Tiarap") && s.includes("segitiga piramida"))).toBe(true);
  });

  test("generates weapon-specific advice for Sniper SPR in Kneeling stance", () => {
    const advice = generateTacticalAdvice(
      "right",
      18.0,
      96.0,
      { model_senjata: "Pindad SPR-3", jenis_senjata: "Senapan Runduk", kaliber: 7.62 },
      "Berlutut"
    );

    expect(Array.isArray(advice)).toBe(true);
    expect(advice.some((s) => s.includes("Pindad SPR-3") && s.includes("paralaks"))).toBe(true);
    expect(advice.some((s) => s.includes("Sikap Berlutut"))).toBe(true);
    expect(advice.some((s) => s.includes("Konsistensi Sangat Baik"))).toBe(true);
  });
});
