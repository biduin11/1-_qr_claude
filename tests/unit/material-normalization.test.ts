import { describe, expect, it } from "vitest";

import {
  normalizeCoating,
  normalizeManufacturer,
  normalizeRal,
  normalizeThickness,
  validateMaterialRow,
} from "@/lib/material-normalization";
import type { ReferenceData } from "@/lib/material-normalization";

const colors = [
  { id: "color-1", code: "7024", displayName: "RAL 7024", active: true, createdAt: new Date(), updatedAt: new Date() },
  {
    id: "color-2",
    code: "9003",
    displayName: "RAL 9003",
    active: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const thicknesses = [
  {
    id: "thickness-1",
    valueHundredths: 50,
    displayName: "0,50 мм",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const manufacturers = [
  {
    id: "manufacturer-1",
    code: "UZBEKISTAN",
    displayName: "Узбекистан",
    aliases: ["uzbekistan", "uzb"],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const coatings = [
  {
    id: "coating-1",
    code: "VIKING",
    displayName: "Viking",
    aliases: ["viking"],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const refs: ReferenceData = { colors, thicknesses, manufacturers, coatings };

describe("normalizeRal", () => {
  it("находит по чистым цифрам", () => {
    const result = normalizeRal("7024", colors);
    expect(result).toEqual({ status: "ok", record: colors[0] });
  });

  it("убирает префикс RAL и внутренние/краевые пробелы", () => {
    expect(normalizeRal("RAL 7024", colors).status).toBe("ok");
    expect(normalizeRal(" 70 24 ", colors).status).toBe("ok");
  });

  it("пустая строка -> missing", () => {
    expect(normalizeRal("", colors)).toEqual({ status: "missing" });
    expect(normalizeRal("   ", colors)).toEqual({ status: "missing" });
  });

  it("буквы вместо цифр -> unknown", () => {
    expect(normalizeRal("abcd", colors)).toEqual({ status: "unknown" });
  });

  it("несуществующий код -> unknown", () => {
    expect(normalizeRal("1111", colors)).toEqual({ status: "unknown" });
  });

  it("деактивированная запись -> inactive", () => {
    expect(normalizeRal("9003", colors)).toEqual({ status: "inactive", record: colors[1] });
  });
});

describe("normalizeThickness", () => {
  it("принимает точку", () => {
    expect(normalizeThickness("0.50", thicknesses).status).toBe("ok");
  });

  it("принимает запятую", () => {
    expect(normalizeThickness("0,50", thicknesses).status).toBe("ok");
  });

  it("принимает без ведущего нуля и с суффиксом мм", () => {
    expect(normalizeThickness("0.5 мм", thicknesses).status).toBe("ok");
  });

  it("нечисловое значение -> unknown", () => {
    expect(normalizeThickness("толстая", thicknesses)).toEqual({ status: "unknown" });
  });

  it("отрицательное или нулевое -> unknown", () => {
    expect(normalizeThickness("0", thicknesses).status).toBe("unknown");
    expect(normalizeThickness("-0.5", thicknesses).status).toBe("unknown");
  });

  it("значение без соответствия в справочнике -> unknown", () => {
    expect(normalizeThickness("1.23", thicknesses)).toEqual({ status: "unknown" });
  });
});

describe("normalizeManufacturer / normalizeCoating — alias-lookup", () => {
  it("совпадение по коду, регистронезависимо", () => {
    expect(normalizeManufacturer("UZBEKISTAN", manufacturers).status).toBe("ok");
    expect(normalizeManufacturer("uzbekistan", manufacturers).status).toBe("ok");
  });

  it("совпадение по alias", () => {
    expect(normalizeManufacturer("uzb", manufacturers).status).toBe("ok");
  });

  it("без fuzzy matching — близкое, но не точное значение не совпадает", () => {
    expect(normalizeManufacturer("uzbekistann", manufacturers)).toEqual({ status: "unknown" });
    expect(normalizeCoating("vikingg", coatings)).toEqual({ status: "unknown" });
  });

  it("пустое значение -> missing", () => {
    expect(normalizeManufacturer("", manufacturers)).toEqual({ status: "missing" });
  });
});

describe("validateMaterialRow", () => {
  it("все 4 поля корректны -> valid с правильными id", () => {
    const result = validateMaterialRow(
      { ral: "7024", thickness: "0.50", manufacturer: "uzbekistan", coating: "viking" },
      refs,
    );
    expect(result).toEqual({
      status: "valid",
      colorId: "color-1",
      thicknessId: "thickness-1",
      manufacturerId: "manufacturer-1",
      coatingId: "coating-1",
    });
  });

  it("собирает ВСЕ ошибки, а не только первую (раздел 18 ТЗ)", () => {
    const result = validateMaterialRow(
      { ral: "9999", thickness: "999", manufacturer: "nowhere", coating: "" },
      refs,
    );
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors).toHaveLength(4);
    }
  });

  it("одно неверное поле -> invalid с одной ошибкой", () => {
    const result = validateMaterialRow(
      { ral: "9999", thickness: "0.50", manufacturer: "uzbekistan", coating: "viking" },
      refs,
    );
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/RAL/);
    }
  });

  it("деактивированный справочник делает строку невалидной", () => {
    const result = validateMaterialRow(
      { ral: "9003", thickness: "0.50", manufacturer: "uzbekistan", coating: "viking" },
      refs,
    );
    expect(result.status).toBe("invalid");
  });
});
