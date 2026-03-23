import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock DuckDB WASM module ---
const mockQuery = vi.fn().mockResolvedValue({
  toArray: () => [],
});
const mockConnection = {
  query: mockQuery,
};
const mockInstantiate = vi.fn().mockResolvedValue(undefined);
const mockRegisterFileText = vi.fn().mockResolvedValue(undefined);
const mockConnect = vi.fn().mockResolvedValue(mockConnection);

const mockDb = {
  instantiate: mockInstantiate,
  connect: mockConnect,
  registerFileText: mockRegisterFileText,
};

vi.mock("@duckdb/duckdb-wasm", () => ({
  getJsDelivrBundles: vi.fn(() => ({})),
  selectBundle: vi.fn(async () => ({
    mainWorker: "https://cdn.jsdelivr.net/worker.js",
    mainModule: "https://cdn.jsdelivr.net/main.wasm",
    pthreadWorker: null,
  })),
  ConsoleLogger: vi.fn(function (this: any) {
    return {};
  }),
  AsyncDuckDB: vi.fn(function (this: any) {
    return mockDb;
  }),
}));

// --- Mock browser globals needed by init() ---
const _origURL = globalThis.URL;
const mockRevokeObjectURL = vi.fn();
const mockCreateObjectURL = vi.fn(() => "blob:mock-url");

// URL needs to be both a constructor and have static methods
class MockURL {
  constructor(
    public href: string,
    public base?: string,
  ) {}
  static createObjectURL = mockCreateObjectURL;
  static revokeObjectURL = mockRevokeObjectURL;
}
(globalThis as any).URL = MockURL;
(globalThis as any).Blob = class MockBlob {
  constructor(
    public parts: any[],
    public options: any,
  ) {}
};
(globalThis as any).Worker = class MockWorker {
  constructor(public url: string) {}
};

// --- Mock fetch ---
const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

// The module uses module-level singletons, so we need to import fresh for each describe block.
// We'll test the pure helper functions and the composable's public API.

describe("useDuckDB", () => {
  // We must reset modules to clear module-level singletons between test groups
  describe("fresh instance tests", () => {
    let useDuckDB: typeof import("~/composables/useDuckDB").useDuckDB;

    beforeEach(async () => {
      vi.clearAllMocks();
      vi.resetModules();

      // Re-set globals after module reset
      (globalThis as any).URL = MockURL;
      (globalThis as any).Blob = class MockBlob {
        constructor(
          public parts: any[],
          public options: any,
        ) {}
      };
      (globalThis as any).Worker = class MockWorker {
        constructor(public url: string) {}
      };
      (globalThis as any).fetch = mockFetch;

      // Reset mock return values
      mockQuery.mockResolvedValue({ toArray: () => [] });
      mockConnect.mockResolvedValue(mockConnection);

      const mod = await import("~/composables/useDuckDB");
      useDuckDB = mod.useDuckDB;
    });

    it("isReady returns false before initialization", () => {
      const duck = useDuckDB();
      expect(duck.isReady()).toBe(false);
    });

    it("isDataLoaded returns false before ensureData", () => {
      const duck = useDuckDB();
      expect(duck.isDataLoaded()).toBe(false);
    });

    it("query throws if not initialized", async () => {
      const duck = useDuckDB();
      await expect(duck.query("SELECT 1")).rejects.toThrow(
        "DuckDB not initialized",
      );
    });

    it("run throws if not initialized", async () => {
      const duck = useDuckDB();
      await expect(duck.run("CREATE TABLE t (id INT)")).rejects.toThrow(
        "DuckDB not initialized",
      );
    });

    it("insertJSON throws if not initialized", async () => {
      const duck = useDuckDB();
      await expect(duck.insertJSON("test", [{ a: 1 }])).rejects.toThrow(
        "DuckDB not initialized",
      );
    });

    it("initialize creates DuckDB instance and connection", async () => {
      const duck = useDuckDB();
      await duck.initialize();
      expect(mockInstantiate).toHaveBeenCalled();
      expect(mockConnect).toHaveBeenCalled();
      expect(duck.isReady()).toBe(true);
    });

    it("initialize is idempotent", async () => {
      const duck = useDuckDB();
      await duck.initialize();
      await duck.initialize();
      const duckdbMod = await import("@duckdb/duckdb-wasm");
      expect(duckdbMod.AsyncDuckDB).toHaveBeenCalledTimes(1);
    });

    it("initialize creates blob URL and revokes it", async () => {
      const duck = useDuckDB();
      await duck.initialize();
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });

    it("query executes SQL and returns mapped rows", async () => {
      const duck = useDuckDB();
      await duck.initialize();

      const mockRow = { toJSON: () => ({ id: "1", name: "Test" }) };
      mockQuery.mockResolvedValueOnce({ toArray: () => [mockRow] });

      const result = await duck.query("SELECT * FROM test");
      expect(result).toEqual([{ id: "1", name: "Test" }]);
      expect(mockQuery).toHaveBeenCalledWith("SELECT * FROM test");
    });

    it("run executes SQL without returning rows", async () => {
      const duck = useDuckDB();
      await duck.initialize();
      await duck.run("CREATE TABLE t (id INT)");
      expect(mockQuery).toHaveBeenCalledWith("CREATE TABLE t (id INT)");
    });

    it("insertJSON registers file and creates table", async () => {
      const duck = useDuckDB();
      await duck.initialize();

      const data = [{ id: "1", name: "Test" }];
      await duck.insertJSON("mytable", data);

      expect(mockRegisterFileText).toHaveBeenCalledWith(
        "mytable.json",
        JSON.stringify(data),
      );
      expect(mockQuery).toHaveBeenCalledWith(
        "CREATE OR REPLACE TABLE mytable AS SELECT * FROM read_json_auto('mytable.json')",
      );
    });
  });

  describe("ensureData", () => {
    let useDuckDB: typeof import("~/composables/useDuckDB").useDuckDB;

    beforeEach(async () => {
      vi.clearAllMocks();
      vi.resetModules();
      (globalThis as any).URL = MockURL;
      (globalThis as any).Blob = class MockBlob {
        constructor(
          public parts: any[],
          public options: any,
        ) {}
      };
      (globalThis as any).Worker = class MockWorker {
        constructor(public url: string) {}
      };
      (globalThis as any).fetch = mockFetch;
      mockQuery.mockResolvedValue({ toArray: () => [] });
      mockConnect.mockResolvedValue(mockConnection);

      const mod = await import("~/composables/useDuckDB");
      useDuckDB = mod.useDuckDB;
    });

    it("loads meta.json and products.json, creates tables", async () => {
      const duck = useDuckDB();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            categories: [{ name: "CRM" }],
            countries: [{ code: "US" }],
            sources: [{ name: "trustmrr" }],
            generatedAt: "2024-01-01",
            buildVersion: "abc123",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ i: "1", s: "notion", n: "Notion", m: 5000 }],
        });

      await duck.ensureData();
      expect(mockFetch).toHaveBeenCalledWith("/data/meta.json");
      expect(mockFetch).toHaveBeenCalledWith("/data/products.json?v=abc123");
      expect(duck.isDataLoaded()).toBe(true);
    });

    it("is idempotent", async () => {
      const duck = useDuckDB();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            categories: [],
            countries: [],
            sources: [],
            generatedAt: "2024-01-01",
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => [] });

      await duck.ensureData();
      await duck.ensureData();
      expect(mockFetch).toHaveBeenCalledTimes(2); // meta + products, not 4
    });

    it("throws when meta.json fails", async () => {
      const duck = useDuckDB();
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
      await expect(duck.ensureData()).rejects.toThrow(
        "Failed to load meta.json: 404",
      );
    });

    it("throws when products.json fails", async () => {
      const duck = useDuckDB();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            categories: [],
            countries: [],
            sources: [],
            generatedAt: "2024-01-01",
          }),
        })
        .mockResolvedValueOnce({ ok: false, status: 500 });
      await expect(duck.ensureData()).rejects.toThrow(
        "Failed to load products.json: 500",
      );
    });

    it("expands compact product keys to full names", async () => {
      const duck = useDuckDB();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            categories: [],
            countries: [],
            sources: [],
            generatedAt: "2024-01-01",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ i: "1", s: "notion", n: "Notion", m: 5000 }],
        });

      await duck.ensureData();

      const goldCall = mockRegisterFileText.mock.calls.find(
        (call: any[]) => call[0] === "gold.json",
      );
      expect(goldCall).toBeDefined();
      const parsed = JSON.parse(goldCall![1]);
      expect(parsed[0]).toEqual({
        id: "1",
        slug: "notion",
        name: "Notion",
        mrr: 5000,
      });
    });

    it("handles missing buildVersion gracefully", async () => {
      const duck = useDuckDB();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            categories: [],
            countries: [],
            sources: [],
            generatedAt: "2024-01-01",
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => [] });

      await duck.ensureData();
      expect(mockFetch).toHaveBeenCalledWith("/data/products.json");
    });
  });

  describe("ensureBronze", () => {
    let useDuckDB: typeof import("~/composables/useDuckDB").useDuckDB;

    beforeEach(async () => {
      vi.clearAllMocks();
      vi.resetModules();
      (globalThis as any).URL = MockURL;
      (globalThis as any).Blob = class MockBlob {
        constructor(
          public parts: any[],
          public options: any,
        ) {}
      };
      (globalThis as any).Worker = class MockWorker {
        constructor(public url: string) {}
      };
      (globalThis as any).fetch = mockFetch;
      mockQuery.mockResolvedValue({ toArray: () => [] });
      mockConnect.mockResolvedValue(mockConnection);

      const mod = await import("~/composables/useDuckDB");
      useDuckDB = mod.useDuckDB;
    });

    async function setupWithData(duck: any) {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            categories: [],
            countries: [],
            sources: [],
            generatedAt: "2024-01-01",
            buildVersion: "v1",
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => [] });
      await duck.ensureData();
      mockFetch.mockClear();
      mockRegisterFileText.mockClear();
    }

    it("loads bronze.json and creates bronze table", async () => {
      const duck = useDuckDB();
      await setupWithData(duck);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            i: "b1",
            sn: "trustmrr",
            ei: "notion",
            rd: {
              name: "Notion",
              mrr: 5000,
              category: "Productivity",
              country: "US",
              url: "https://notion.so",
            },
            fa: "2024-01-01",
          },
        ],
      });

      await duck.ensureBronze();
      expect(mockFetch).toHaveBeenCalledWith("/data/bronze.json?v=v1");

      const bronzeCall = mockRegisterFileText.mock.calls.find(
        (call: any[]) => call[0] === "bronze.json",
      );
      expect(bronzeCall).toBeDefined();
      const parsed = JSON.parse(bronzeCall![1]);
      expect(parsed[0].source_name).toBe("trustmrr");
      expect(parsed[0].name).toBe("Notion");
      expect(parsed[0].mrr).toBe(5000);
      expect(parsed[0].category).toBe("Productivity");
      expect(parsed[0].country).toBe("US");
      expect(parsed[0].url).toBe("https://notion.so");
    });

    it("is idempotent", async () => {
      const duck = useDuckDB();
      await setupWithData(duck);

      mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
      await duck.ensureBronze();
      await duck.ensureBronze();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("throws when bronze.json fetch fails", async () => {
      const duck = useDuckDB();
      await setupWithData(duck);

      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
      await expect(duck.ensureBronze()).rejects.toThrow(
        "Failed to load bronze.json: 404",
      );
    });

    it("extracts name from compact key 'n'", async () => {
      const duck = useDuckDB();
      await setupWithData(duck);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            i: "b1",
            sn: "src",
            ei: "ext-id",
            rd: { n: "CompactName" },
            fa: "2024-01-01",
          },
        ],
      });

      await duck.ensureBronze();
      const bronzeCall = mockRegisterFileText.mock.calls.find(
        (call: any[]) => call[0] === "bronze.json",
      );
      const parsed = JSON.parse(bronzeCall![1]);
      expect(parsed[0].name).toBe("CompactName");
    });

    it("extracts name from 'productName' (StarterStory)", async () => {
      const duck = useDuckDB();
      await setupWithData(duck);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            i: "b1",
            sn: "src",
            ei: "ext",
            rd: { productName: "StarterName" },
            fa: "2024-01-01",
          },
        ],
      });

      await duck.ensureBronze();
      const bronzeCall = mockRegisterFileText.mock.calls.find(
        (call: any[]) => call[0] === "bronze.json",
      );
      const parsed = JSON.parse(bronzeCall![1]);
      expect(parsed[0].name).toBe("StarterName");
    });

    it("extracts MRR from nested revenue.mrr", async () => {
      const duck = useDuckDB();
      await setupWithData(duck);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            i: "b1",
            sn: "src",
            ei: "ext",
            rd: { revenue: { mrr: 9999 } },
            fa: "2024-01-01",
          },
        ],
      });

      await duck.ensureBronze();
      const bronzeCall = mockRegisterFileText.mock.calls.find(
        (call: any[]) => call[0] === "bronze.json",
      );
      const parsed = JSON.parse(bronzeCall![1]);
      expect(parsed[0].mrr).toBe(9999);
    });

    it("extracts MRR from compact key 'm'", async () => {
      const duck = useDuckDB();
      await setupWithData(duck);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { i: "b1", sn: "src", ei: "ext", rd: { m: 3000 }, fa: "2024-01-01" },
        ],
      });

      await duck.ensureBronze();
      const bronzeCall = mockRegisterFileText.mock.calls.find(
        (call: any[]) => call[0] === "bronze.json",
      );
      const parsed = JSON.parse(bronzeCall![1]);
      expect(parsed[0].mrr).toBe(3000);
    });

    it("extracts MRR from 'monthlyRevenue'", async () => {
      const duck = useDuckDB();
      await setupWithData(duck);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            i: "b1",
            sn: "src",
            ei: "ext",
            rd: { monthlyRevenue: 7777 },
            fa: "2024-01-01",
          },
        ],
      });

      await duck.ensureBronze();
      const bronzeCall = mockRegisterFileText.mock.calls.find(
        (call: any[]) => call[0] === "bronze.json",
      );
      const parsed = JSON.parse(bronzeCall![1]);
      expect(parsed[0].mrr).toBe(7777);
    });

    it("skips MRR of 0 from nested revenue and falls back to monthlyRevenue", async () => {
      const duck = useDuckDB();
      await setupWithData(duck);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            i: "b1",
            sn: "src",
            ei: "ext",
            rd: { revenue: { mrr: 0 }, monthlyRevenue: 500 },
            fa: "2024-01-01",
          },
        ],
      });

      await duck.ensureBronze();
      const bronzeCall = mockRegisterFileText.mock.calls.find(
        (call: any[]) => call[0] === "bronze.json",
      );
      const parsed = JSON.parse(bronzeCall![1]);
      expect(parsed[0].mrr).toBe(500);
    });

    it("extracts category from compact key 'c'", async () => {
      const duck = useDuckDB();
      await setupWithData(duck);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            i: "b1",
            sn: "src",
            ei: "ext",
            rd: { c: "Analytics" },
            fa: "2024-01-01",
          },
        ],
      });

      await duck.ensureBronze();
      const bronzeCall = mockRegisterFileText.mock.calls.find(
        (call: any[]) => call[0] === "bronze.json",
      );
      const parsed = JSON.parse(bronzeCall![1]);
      expect(parsed[0].category).toBe("Analytics");
    });

    it("extracts country from compact key 'co'", async () => {
      const duck = useDuckDB();
      await setupWithData(duck);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            i: "b1",
            sn: "src",
            ei: "ext",
            rd: { co: "Germany" },
            fa: "2024-01-01",
          },
        ],
      });

      await duck.ensureBronze();
      const bronzeCall = mockRegisterFileText.mock.calls.find(
        (call: any[]) => call[0] === "bronze.json",
      );
      const parsed = JSON.parse(bronzeCall![1]);
      expect(parsed[0].country).toBe("Germany");
    });

    it("handles null raw_data gracefully", async () => {
      const duck = useDuckDB();
      await setupWithData(duck);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            i: "b1",
            sn: "src",
            ei: "fallback-name",
            rd: null,
            fa: "2024-01-01",
          },
        ],
      });

      await duck.ensureBronze();
      const bronzeCall = mockRegisterFileText.mock.calls.find(
        (call: any[]) => call[0] === "bronze.json",
      );
      const parsed = JSON.parse(bronzeCall![1]);
      expect(parsed[0].name).toBe("fallback-name");
      expect(parsed[0].mrr).toBeNull();
      expect(parsed[0].raw_json).toBe("{}");
    });

    it("extracts URL from 'website' field", async () => {
      const duck = useDuckDB();
      await setupWithData(duck);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            i: "b1",
            sn: "src",
            ei: "ext",
            rd: { website: "https://example.com" },
            fa: "2024-01-01",
          },
        ],
      });

      await duck.ensureBronze();
      const bronzeCall = mockRegisterFileText.mock.calls.find(
        (call: any[]) => call[0] === "bronze.json",
      );
      const parsed = JSON.parse(bronzeCall![1]);
      expect(parsed[0].url).toBe("https://example.com");
    });

    it("extracts URL from 'homepage' field", async () => {
      const duck = useDuckDB();
      await setupWithData(duck);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            i: "b1",
            sn: "src",
            ei: "ext",
            rd: { homepage: "https://home.com" },
            fa: "2024-01-01",
          },
        ],
      });

      await duck.ensureBronze();
      const bronzeCall = mockRegisterFileText.mock.calls.find(
        (call: any[]) => call[0] === "bronze.json",
      );
      const parsed = JSON.parse(bronzeCall![1]);
      expect(parsed[0].url).toBe("https://home.com");
    });
  });

  describe("ensureDatapoints", () => {
    let useDuckDB: typeof import("~/composables/useDuckDB").useDuckDB;

    beforeEach(async () => {
      vi.clearAllMocks();
      vi.resetModules();
      (globalThis as any).URL = MockURL;
      (globalThis as any).Blob = class MockBlob {
        constructor(
          public parts: any[],
          public options: any,
        ) {}
      };
      (globalThis as any).Worker = class MockWorker {
        constructor(public url: string) {}
      };
      (globalThis as any).fetch = mockFetch;
      mockQuery.mockResolvedValue({ toArray: () => [] });
      mockConnect.mockResolvedValue(mockConnection);

      const mod = await import("~/composables/useDuckDB");
      useDuckDB = mod.useDuckDB;
    });

    async function setupWithData(duck: any) {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            categories: [],
            countries: [],
            sources: [],
            generatedAt: "2024-01-01",
            buildVersion: "v2",
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => [] });
      await duck.ensureData();
      mockFetch.mockClear();
      mockRegisterFileText.mockClear();
    }

    it("loads single datapoints file when no manifest", async () => {
      const duck = useDuckDB();
      await setupWithData(duck);

      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404 }) // no manifest
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              i: "dp1",
              pi: "p1",
              fn: "mrr",
              fv: "5000",
              si: "s1",
              sa: "2024-01-01",
              da: "2024-01-01",
              ic: true,
            },
          ],
        });

      await duck.ensureDatapoints();
      expect(mockFetch).toHaveBeenCalledWith(
        "/data/datapoints-manifest.json?v=v2",
      );
      expect(mockFetch).toHaveBeenCalledWith("/data/datapoints.json?v=v2");

      const dpCall = mockRegisterFileText.mock.calls.find(
        (call: any[]) => call[0] === "data_points.json",
      );
      expect(dpCall).toBeDefined();
      const parsed = JSON.parse(dpCall![1]);
      expect(parsed[0].product_id).toBe("p1");
      expect(parsed[0].field_name).toBe("mrr");
    });

    it("loads chunked datapoints files when manifest exists", async () => {
      const duck = useDuckDB();
      await setupWithData(duck);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ chunks: 2 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ i: "dp1", pi: "p1", fn: "mrr", fv: "1000" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ i: "dp2", pi: "p2", fn: "mrr", fv: "2000" }],
        });

      await duck.ensureDatapoints();
      expect(mockFetch).toHaveBeenCalledWith("/data/datapoints-0.json?v=v2");
      expect(mockFetch).toHaveBeenCalledWith("/data/datapoints-1.json?v=v2");

      const dpCall = mockRegisterFileText.mock.calls.find(
        (call: any[]) => call[0] === "data_points.json",
      );
      const parsed = JSON.parse(dpCall![1]);
      expect(parsed).toHaveLength(2);
    });

    it("is idempotent", async () => {
      const duck = useDuckDB();
      await setupWithData(duck);

      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: true, json: async () => [] });

      await duck.ensureDatapoints();
      await duck.ensureDatapoints();
      expect(mockFetch).toHaveBeenCalledTimes(2); // manifest + datapoints
    });

    it("throws when chunk fetch fails", async () => {
      const duck = useDuckDB();
      await setupWithData(duck);

      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: false, status: 500 });

      await expect(duck.ensureDatapoints()).rejects.toThrow("Failed to load");
    });
  });
});
