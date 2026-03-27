import { defineStore } from "pinia";
import type {
  ProductView,
  Category,
  Country,
  Source,
} from "~/types/database.types";

export interface ProductFilters {
  categories?: string[];
  countries?: string[];
  sources?: string[];
  primarySource?: string;
  search?: string;
  hideAnonymous?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  employeeMin?: number;
  employeeMax?: number;
  foundedFrom?: number;
  foundedTo?: number;
}

export const useProductsStore = defineStore("products", () => {
  // --- Raw data (loaded once from DuckDB) ---
  const allProducts = ref<ProductView[]>([]);
  const categories = ref<Category[]>([]);
  const countries = ref<Country[]>([]);
  const sources = ref<Source[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const filters = ref<ProductFilters>({ hideAnonymous: true });
  const initialized = ref(false);

  /** Loading progress for initial fetch (0–100) */
  const loadProgress = ref(0);
  const loadedCount = ref(0);

  // Pagination (client-side)
  const page = ref(1);
  const pageSize = ref(24);

  // --- Source filter: product IDs that belong to selected sources ---
  const sourceProductIds = ref<Set<string> | null>(null);

  // --- Client-side filtered + sorted products ---
  const filteredProducts = computed(() => {
    let result = allProducts.value;

    // Hide anonymous
    if (filters.value.hideAnonymous) {
      result = result.filter(
        (p) => !p.name?.toLowerCase().includes("anonymous"),
      );
    }

    // Search
    if (filters.value.search) {
      const term = filters.value.search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          p.company?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term),
      );
    }

    // Categories
    if (filters.value.categories && filters.value.categories.length > 0) {
      const cats = new Set(filters.value.categories);
      result = result.filter(
        (p) => p.category_slug && cats.has(p.category_slug),
      );
    }

    // Countries
    if (filters.value.countries && filters.value.countries.length > 0) {
      const codes = new Set(filters.value.countries);
      result = result.filter(
        (p) => p.country_code && codes.has(p.country_code),
      );
    }

    // Primary source (simple name-based filter)
    if (filters.value.primarySource) {
      const src = filters.value.primarySource;
      result = result.filter((p) => p.primary_source === src);
    }

    // Sources (via data_points query)
    if (sourceProductIds.value) {
      result = result.filter((p) => sourceProductIds.value!.has(p.id));
    }

    // Employees
    if (filters.value.employeeMin !== undefined) {
      result = result.filter(
        (p) =>
          p.employees !== null && p.employees >= filters.value.employeeMin!,
      );
    }
    if (filters.value.employeeMax !== undefined) {
      result = result.filter(
        (p) =>
          p.employees !== null && p.employees <= filters.value.employeeMax!,
      );
    }

    // Founded year
    if (filters.value.foundedFrom !== undefined) {
      result = result.filter(
        (p) =>
          p.founded_year !== null &&
          p.founded_year >= filters.value.foundedFrom!,
      );
    }
    if (filters.value.foundedTo !== undefined) {
      result = result.filter(
        (p) =>
          p.founded_year !== null && p.founded_year <= filters.value.foundedTo!,
      );
    }

    // Sort
    const sortBy = (filters.value.sortBy ?? "mrr") as keyof ProductView;
    const sortAsc = filters.value.sortOrder === "asc";

    result = [...result].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (
        typeof aVal === "number" ||
        typeof aVal === "bigint" ||
        typeof bVal === "number" ||
        typeof bVal === "bigint"
      ) {
        const diff = Number(aVal) - Number(bVal);
        return sortAsc ? diff : -diff;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortAsc ? cmp : -cmp;
    });

    return result;
  });

  // --- Paginated subset ---
  const products = computed(() =>
    filteredProducts.value.slice(0, page.value * pageSize.value),
  );

  const totalCount = computed(() => filteredProducts.value.length);
  const hasMore = computed(
    () => products.value.length < filteredProducts.value.length,
  );

  // --- Stats (from all filtered products) ---
  const totalProducts = computed(() => filteredProducts.value.length);
  const totalCategories = computed(() => categories.value.length);
  const uniqueCountries = computed(
    () =>
      new Set(filteredProducts.value.map((p) => p.country_code).filter(Boolean))
        .size,
  );
  const uniqueCompanies = computed(
    () =>
      new Set(filteredProducts.value.map((p) => p.company).filter(Boolean))
        .size,
  );
  const totalMRR = computed(() =>
    filteredProducts.value.reduce((sum, p) => sum + Number(p.mrr ?? 0), 0),
  );

  // --- Actions ---

  function setFilters(f: ProductFilters) {
    filters.value = { ...filters.value, ...f };
    page.value = 1;
  }

  function loadMore() {
    if (hasMore.value) {
      page.value += 1;
    }
  }

  /** Resolve source filter to product IDs (via DuckDB query on data_points) */
  async function resolveSourceFilter() {
    if (!filters.value.sources || filters.value.sources.length === 0) {
      sourceProductIds.value = null;
      return;
    }

    const duck = useDuckDB();
    await duck.ensureDatapoints();

    // Fetch all data points, filter client-side to avoid SQL injection
    const rows = await duck.query<{ product_id: string; source_id: string }>(
      "SELECT DISTINCT product_id, source_id FROM data_points",
    );

    const sourceSet = new Set(filters.value.sources);
    const matched = rows.filter((r) => sourceSet.has(r.source_id));

    sourceProductIds.value = new Set(matched.map((r) => r.product_id));
  }

  /**
   * Initialize store from DuckDB (which loads from static JSON).
   * No Supabase calls, no localStorage — all data comes from
   * build-time JSON loaded into DuckDB-WASM.
   */
  let initPromise: Promise<void> | null = null;

  async function initialize() {
    if (initialized.value) return;
    if (initPromise) return initPromise;

    initPromise = _doInitialize();
    return initPromise;
  }

  async function _doInitialize() {
    loading.value = true;
    error.value = null;
    loadProgress.value = 10;

    try {
      const duck = useDuckDB();

      loadProgress.value = 30;
      await duck.ensureData();

      loadProgress.value = 70;

      // Populate reactive refs from DuckDB
      const [productsData, categoriesData, countriesData, sourcesData] =
        await Promise.all([
          duck.query<ProductView>(
            "SELECT * FROM gold ORDER BY mrr DESC NULLS LAST",
          ),
          duck.query<Category>("SELECT * FROM categories ORDER BY name"),
          duck.query<Country>("SELECT * FROM countries ORDER BY name_de"),
          duck.query<Source>("SELECT * FROM sources ORDER BY name"),
        ]);

      allProducts.value = productsData;
      categories.value = categoriesData;
      countries.value = countriesData;
      sources.value = sourcesData;
      loadedCount.value = productsData.length;
      loadProgress.value = 100;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : "Failed to load products";
      console.error("Store initialization failed:", e);
    } finally {
      loading.value = false;
      initialized.value = true;
    }
  }

  return {
    // Data
    allProducts,
    products,
    filteredProducts,
    categories,
    countries,
    sources,
    // State
    loading,
    error,
    filters,
    initialized,
    loadProgress,
    loadedCount,
    page,
    pageSize,
    totalCount,
    // Stats
    totalProducts,
    totalCategories,
    uniqueCountries,
    uniqueCompanies,
    totalMRR,
    hasMore,
    // Actions
    setFilters,
    loadMore,
    resolveSourceFilter,
    initialize,
  };
});
