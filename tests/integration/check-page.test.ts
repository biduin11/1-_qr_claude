/**
 * Интеграционный тест страницы /check (src/app/check/page.tsx) — реальная
 * БД. Server Component возвращает элемент React — проверяем напрямую .type
 * и .props, без рендера в DOM (эффекты IndexedDB всё равно не выполняются
 * при обычном вызове функции, они специфичны для CheckRequirementScreen,
 * уже покрытого отдельными jsdom-тестами).
 * Требует реальный Postgres — см. заголовок env-guard.test.ts.
 */
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const { CheckErrorScreen } = await import("@/components/worker/CheckErrorScreen");
const { CheckRequirementScreen } = await import("@/components/worker/CheckRequirementScreen");
const CheckPage = (await import("@/app/check/page")).default;

const prisma = new PrismaClient();

function searchParams(params: Record<string, string>) {
  return Promise.resolve(params);
}

describe("/check (интеграционный)", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL не задан — см. заголовок env-guard.test.ts.");
    }
  });

  beforeEach(async () => {
    await prisma.coil.deleteMany();
    await prisma.color.deleteMany();
    await prisma.thickness.deleteMany();
    await prisma.manufacturer.deleteMany();
    await prisma.coating.deleteMany();

    await prisma.color.create({ data: { code: "7024", displayName: "RAL 7024" } });
    await prisma.thickness.create({ data: { valueHundredths: 50, displayName: "0,50 мм" } });
    await prisma.manufacturer.create({
      data: { code: "UZBEKISTAN", displayName: "Узбекистан", aliases: ["uzbekistan"] },
    });
    await prisma.coating.create({ data: { code: "VIKING", displayName: "Viking", aliases: ["viking"] } });
  });

  afterAll(async () => {
    await prisma.coil.deleteMany();
    await prisma.color.deleteMany();
    await prisma.thickness.deleteMany();
    await prisma.manufacturer.deleteMany();
    await prisma.coating.deleteMany();
    await prisma.$disconnect();
  });

  it("все 4 параметра корректны -> CheckRequirementScreen с разрешёнными данными", async () => {
    const element = await CheckPage({
      searchParams: searchParams({ ral: "7024", thickness: "0.50", manufacturer: "uzbekistan", coating: "viking" }),
    });

    expect(element.type).toBe(CheckRequirementScreen);
    expect(element.props.incoming).toEqual({
      ral: "7024",
      ralDisplayName: "RAL 7024",
      thicknessHundredths: 50,
      thicknessDisplayName: "0,50 мм",
      manufacturer: "UZBEKISTAN",
      manufacturerDisplayName: "Узбекистан",
      coating: "VIKING",
      coatingDisplayName: "Viking",
    });
  });

  it("толщина через запятую и производитель в другом регистре — всё равно распознаются", async () => {
    const element = await CheckPage({
      searchParams: searchParams({ ral: "7024", thickness: "0,50", manufacturer: "UZBEKISTAN", coating: "Viking" }),
    });

    expect(element.type).toBe(CheckRequirementScreen);
  });

  it("отсутствующий параметр -> CheckErrorScreen с ошибкой по конкретному полю", async () => {
    const element = await CheckPage({
      searchParams: searchParams({ ral: "7024", thickness: "0.50", manufacturer: "uzbekistan" }),
    });

    expect(element.type).toBe(CheckErrorScreen);
    expect(element.props.errors).toHaveLength(1);
    expect(element.props.errors[0]).toMatch(/покрытие/);
  });

  it("неизвестное значение -> CheckErrorScreen с указанием конкретного значения", async () => {
    const element = await CheckPage({
      searchParams: searchParams({
        ral: "7024",
        thickness: "0.50",
        manufacturer: "uzbekistan",
        coating: "rooftop_barhat",
      }),
    });

    expect(element.type).toBe(CheckErrorScreen);
    expect(element.props.errors).toEqual([expect.stringContaining("rooftop_barhat")]);
  });

  it("деактивированный справочник -> CheckErrorScreen", async () => {
    await prisma.manufacturer.update({ where: { code: "UZBEKISTAN" }, data: { active: false } });

    const element = await CheckPage({
      searchParams: searchParams({ ral: "7024", thickness: "0.50", manufacturer: "uzbekistan", coating: "viking" }),
    });

    expect(element.type).toBe(CheckErrorScreen);
    expect(element.props.errors[0]).toMatch(/производитель/);
  });

  it("все 4 параметра неверны -> CheckErrorScreen со всеми 4 ошибками", async () => {
    const element = await CheckPage({
      searchParams: searchParams({ ral: "0000", thickness: "abc", manufacturer: "no", coating: "" }),
    });

    expect(element.type).toBe(CheckErrorScreen);
    expect(element.props.errors).toHaveLength(4);
  });
});
