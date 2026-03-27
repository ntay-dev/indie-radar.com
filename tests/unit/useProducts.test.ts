import { describe, it, expect, vi, beforeEach } from "vitest";

import { useProducts } from "~/composables/useProducts";

describe("useProducts", () => {
  let composable: ReturnType<typeof useProducts>;
  let mockDuck: any;

  beforeEach(() => {
    mockDuck = (globalThis as any).__mockDuckDB;
    mockDuck.query.mockResolvedValue([]);
    mockDuck.ensureData.mockResolvedValue(undefined);
    mockDuck.ensureDatapoints.mockResolvedValue(undefined);
    vi.clearAllMocks();
    composable = useProducts();
  });

  describe("initial state", () => {
    it("starts with loading false", () => {
      expect(composable.loading.value).toBe(false);
    });

    it("starts with no error", () => {
      expect(composable.error.value).toBeNull();
    });
  });

  describe("fetchProduct", () => {
    it("ensures DuckDB data is loaded", async () => {
      await composable.fetchProduct("notion");
      expect(mockDuck.ensureData).toHaveBeenCalled();
    });

    it("returns product data on success", async () => {
      const product = { slug: "notion", name: "Notion" };
      mockDuck.query.mockResolvedValueOnce([product]);
      const result = await composable.fetchProduct("notion");
      expect(result).toEqual(product);
    });

    it("queries gold table via DuckDB SQL", async () => {
      await composable.fetchProduct("notion");
      const sql = mockDuck.query.mock.calls[0][0] as string;
      expect(sql).toContain("gold");
    });

    it("returns null when product not found", async () => {
      mockDuck.query.mockResolvedValueOnce([]);
      const result = await composable.fetchProduct("nonexistent");
      expect(result).toBeNull();
    });

    it("returns null and sets error on failure", async () => {
      mockDuck.ensureData.mockRejectedValueOnce(new Error("DB error"));
      const result = await composable.fetchProduct("test");
      expect(result).toBeNull();
      expect(composable.error.value).toBe("DB error");
    });

    it("sets loading false after fetch", async () => {
      await composable.fetchProduct("test");
      expect(composable.loading.value).toBe(false);
    });

    it("filters client-side by slug (no SQL injection)", async () => {
      const product = { slug: "test's-product", name: "Test" };
      mockDuck.query.mockResolvedValueOnce([product]);
      const result = await composable.fetchProduct("test's-product");
      expect(result).toEqual(product);
      // SQL should NOT contain the slug (client-side filtering)
      const sql = mockDuck.query.mock.calls[0][0] as string;
      expect(sql).not.toContain("test");
    });
  });

  describe("fetchProductDataPoints", () => {
    it("loads datapoints from DuckDB with source join", async () => {
      mockDuck.query.mockResolvedValueOnce([]);
      await composable.fetchProductDataPoints("abc-123");
      expect(mockDuck.ensureDatapoints).toHaveBeenCalled();
      const sql = mockDuck.query.mock.calls[0][0] as string;
      expect(sql).toContain("data_points");
      expect(sql).toContain("sources");
      // Product ID is filtered client-side, not in SQL
      expect(sql).not.toContain("abc-123");
    });

    it("returns empty array on error", async () => {
      mockDuck.ensureDatapoints.mockRejectedValueOnce(new Error("fail"));
      const result = await composable.fetchProductDataPoints("abc-123");
      expect(result).toEqual([]);
    });

    it("reshapes rows with source data (s_id present)", async () => {
      mockDuck.query.mockResolvedValueOnce([
        {
          id: "dp1",
          product_id: "p1",
          field_name: "mrr",
          field_value: "5000",
          source_id: "s1",
          sourced_at: "2024-01-01",
          data_as_of: "2024-01-01",
          s_id: "s1",
          s_name: "TrustMRR",
          s_url: "https://trustmrr.com",
          s_type: "api",
          s_trust_level: 5,
          s_notes: "Verified",
        },
      ]);

      const result = await composable.fetchProductDataPoints("p1");
      expect(result).toHaveLength(1);
      expect(result[0].source).toEqual({
        id: "s1",
        name: "TrustMRR",
        url: "https://trustmrr.com",
        type: "api",
        trust_level: 5,
        notes: "Verified",
        created_at: "",
        updated_at: "",
      });
    });

    it("reshapes rows without source data (s_id null)", async () => {
      mockDuck.query.mockResolvedValueOnce([
        {
          id: "dp1",
          product_id: "p1",
          field_name: "mrr",
          field_value: "5000",
          source_id: null,
          sourced_at: "2024-01-01",
          data_as_of: null,
          s_id: null,
          s_name: null,
          s_url: null,
          s_type: null,
          s_trust_level: null,
          s_notes: null,
        },
      ]);

      const result = await composable.fetchProductDataPoints("p1");
      expect(result).toHaveLength(1);
      expect(result[0].source).toBeNull();
      expect(result[0].data_as_of).toBeNull();
    });
  });

  describe("fetchProduct edge cases", () => {
    it("sets generic error for non-Error throws", async () => {
      mockDuck.ensureData.mockRejectedValueOnce("string error");
      const result = await composable.fetchProduct("test");
      expect(result).toBeNull();
      expect(composable.error.value).toBe("Product not found");
    });
  });
});
