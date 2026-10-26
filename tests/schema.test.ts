import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

// O esquema de produção (PostgreSQL) é gerado a partir do local (SQLite): os modelos devem ser idênticos.
const models = (path: string) =>
  readFileSync(path, "utf8")
    .replace(/\r/g, "")
    .replace(/datasource db \{[\s\S]*?\}/, "")
    .replace(/^\/\/.*$/gm, "")
    .replace(/\n{2,}/g, "\n")
    .trim();

describe("esquema de produção", () => {
  it("prisma/postgres/schema.prisma está em dia (rode npm run db:pg:sync)", () => {
    expect(models("prisma/postgres/schema.prisma")).toBe(models("prisma/schema.prisma"));
  });
  it("há migração inicial para PostgreSQL", () => {
    const dirs = readdirSync("prisma/postgres/migrations").filter((d) => /^\d+_/.test(d));
    expect(dirs.length).toBeGreaterThan(0);
    const sql = readFileSync(`prisma/postgres/migrations/${dirs[0]}/migration.sql`, "utf8");
    for (const t of ["User", "Account", "Subscription", "Product", "Listing", "Snapshot", "OrderLine", "Notification"]) expect(sql).toContain(`CREATE TABLE "${t}"`);
  });
});
