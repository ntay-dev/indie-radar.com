import { describe, it, expect } from "vitest";

// Test URL generation logic for category and country filter links
function categoryUrl(slug: string): string {
  return `/products?category=${slug}`;
}

function countryUrl(code: string): string {
  return `/products?country=${code}`;
}

function countryCodeToFlag(code: string): string {
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

describe("category pages", () => {
  it("generates correct URL from slug", () => {
    expect(categoryUrl("crm")).toBe("/products?category=crm");
    expect(categoryUrl("project-management")).toBe(
      "/products?category=project-management",
    );
    expect(categoryUrl("analytics")).toBe("/products?category=analytics");
  });
});

describe("country pages", () => {
  it("generates correct URL from code", () => {
    expect(countryUrl("US")).toBe("/products?country=US");
    expect(countryUrl("DE")).toBe("/products?country=DE");
    expect(countryUrl("GB")).toBe("/products?country=GB");
  });

  it("handles lowercase input", () => {
    expect(countryUrl("us")).toBe("/products?country=us");
  });
});

describe("country flag emoji", () => {
  it("converts US to flag", () => {
    const flag = countryCodeToFlag("US");
    expect(flag).toBe("🇺🇸");
  });

  it("converts DE to flag", () => {
    const flag = countryCodeToFlag("DE");
    expect(flag).toBe("🇩🇪");
  });

  it("converts GB to flag", () => {
    const flag = countryCodeToFlag("GB");
    expect(flag).toBe("🇬🇧");
  });

  it("handles lowercase input", () => {
    const flag = countryCodeToFlag("us");
    // Should still work since we call toUpperCase
    expect(flag).toBe("🇺🇸");
  });
});

describe("employee range parsing", () => {
  function parseRange(val: string | null): { min?: number; max?: number } {
    if (!val) return {};
    const [minStr, maxStr] = val.split("-");
    const min = minStr ? parseInt(minStr, 10) : undefined;
    const max = maxStr ? parseInt(maxStr, 10) : undefined;
    return {
      min: isNaN(min as number) ? undefined : min,
      max: isNaN(max as number) ? undefined : max,
    };
  }

  it("parses 1-50", () => {
    expect(parseRange("1-50")).toEqual({ min: 1, max: 50 });
  });

  it("parses 51-200", () => {
    expect(parseRange("51-200")).toEqual({ min: 51, max: 200 });
  });

  it("parses 201-1000", () => {
    expect(parseRange("201-1000")).toEqual({ min: 201, max: 1000 });
  });

  it("parses 1000- (open-ended)", () => {
    expect(parseRange("1000-")).toEqual({ min: 1000, max: undefined });
  });

  it("returns empty for null", () => {
    expect(parseRange(null)).toEqual({});
  });
});

describe("founded year range parsing", () => {
  function parseRange(val: string | null): { min?: number; max?: number } {
    if (!val) return {};
    const [minStr, maxStr] = val.split("-");
    const min = minStr ? parseInt(minStr, 10) : undefined;
    const max = maxStr ? parseInt(maxStr, 10) : undefined;
    return {
      min: isNaN(min as number) ? undefined : min,
      max: isNaN(max as number) ? undefined : max,
    };
  }

  it("parses 2024-2025", () => {
    expect(parseRange("2024-2025")).toEqual({ min: 2024, max: 2025 });
  });

  it("parses 0-2015 (before year)", () => {
    expect(parseRange("0-2015")).toEqual({ min: 0, max: 2015 });
  });

  it("returns empty for null", () => {
    expect(parseRange(null)).toEqual({});
  });
});
