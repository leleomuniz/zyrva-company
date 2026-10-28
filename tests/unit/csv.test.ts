import { describe, expect, it } from "vitest";

import { csvCell } from "@/lib/csv";

describe("exportação CSV", () => {
  it("escapa aspas e neutraliza fórmulas de planilha", () => {
    expect(csvCell('Cliente "VIP"')).toBe('"Cliente ""VIP"""');
    expect(csvCell("=HYPERLINK(\"https://example.test\")")).toBe(
      '"\'=HYPERLINK(""https://example.test"")"',
    );
    expect(csvCell("  +1+1")).toBe('"\'  +1+1"');
  });
});
