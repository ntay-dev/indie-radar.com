import { vi } from "vitest";
import { ref, computed } from "vue";

// Make Vue reactivity available globally (Nuxt auto-imports these)
(globalThis as any).ref = ref;
(globalThis as any).computed = computed;

// Mock Supabase query builder used across composables and stores
function createChainableMock() {
  const mock: any = {
    _data: [] as any[],
    _error: null as any,
    select: vi.fn().mockImplementation(function (this: any) {
      return this;
    }),
    order: vi.fn().mockImplementation(function (this: any) {
      return this;
    }),
    eq: vi.fn().mockImplementation(function (this: any) {
      return this;
    }),
    in: vi.fn().mockImplementation(function (this: any) {
      return this;
    }),
    or: vi.fn().mockImplementation(function (this: any) {
      return this;
    }),
    not: vi.fn().mockImplementation(function (this: any) {
      return this;
    }),
    ilike: vi.fn().mockImplementation(function (this: any) {
      return this;
    }),
    gte: vi.fn().mockImplementation(function (this: any) {
      return this;
    }),
    lte: vi.fn().mockImplementation(function (this: any) {
      return this;
    }),
    range: vi.fn().mockImplementation(function (this: any) {
      return this;
    }),
    textSearch: vi.fn().mockImplementation(function (this: any) {
      return this;
    }),
    single: vi.fn().mockImplementation(function (this: any) {
      return Promise.resolve({ data: this._data, error: this._error });
    }),
    then: function (this: any, resolve: any, reject?: any) {
      return Promise.resolve({ data: this._data, error: this._error }).then(
        resolve,
        reject,
      );
    },
  };
  return mock;
}

const mockQueryBuilder = createChainableMock();
const mockSupabaseClient = {
  from: vi.fn().mockReturnValue(mockQueryBuilder),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi
      .fn()
      .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  },
};

// Store for test manipulation
(globalThis as any).__mockSupabaseClient = mockSupabaseClient;
(globalThis as any).__mockQueryBuilder = mockQueryBuilder;

// Mock useSupabaseClient (used in composables and store)
(globalThis as any).useSupabaseClient = () => mockSupabaseClient;

// Mock useNuxtApp (used in useSupabase.ts composable)
(globalThis as any).useNuxtApp = () => ({
  $supabase: mockSupabaseClient,
  $supabaseUser: ref(null),
  $supabaseSession: ref(null),
});

// Mock useRuntimeConfig (used in plugin)
(globalThis as any).useRuntimeConfig = () => ({
  public: {
    supabaseUrl: "https://test.supabase.co",
    supabaseKey: "test-anon-key",
  },
});

// Mock useState (used in plugin)
(globalThis as any).useState = <T>(key: string, init: () => T) => ref(init());

// Mock defineNuxtPlugin (used in plugin)
(globalThis as any).defineNuxtPlugin = (fn: any) => fn;

// Mock defineEventHandler and related Nitro/H3 functions (used in server routes)
(globalThis as any).defineEventHandler = (fn: any) => fn;
(globalThis as any).setResponseHeader = vi.fn();

// Mock useDuckDB (used in composables and store after DuckDB-only architecture)
const mockDuckDB = {
  initialize: vi.fn().mockResolvedValue(undefined),
  ensureData: vi.fn().mockResolvedValue(undefined),
  ensureBronze: vi.fn().mockResolvedValue(undefined),
  ensureDatapoints: vi.fn().mockResolvedValue(undefined),
  query: vi.fn().mockResolvedValue([]),
  run: vi.fn().mockResolvedValue(undefined),
  insertJSON: vi.fn().mockResolvedValue(undefined),
  isReady: vi.fn().mockReturnValue(true),
  isDataLoaded: vi.fn().mockReturnValue(true),
};
(globalThis as any).__mockDuckDB = mockDuckDB;
(globalThis as any).useDuckDB = () => mockDuckDB;

// Mock defineStore from pinia
(globalThis as any).defineStore = (id: string, setup: () => any) => {
  // Return a function that calls setup, mimicking Pinia's defineStore
  return () => setup();
};

// Mock localStorage for caching tests
let localStorageStore: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => {
    localStorageStore[key] = value;
  },
  removeItem: (key: string) => {
    const { [key]: _, ...rest } = localStorageStore;
    localStorageStore = rest;
  },
  clear: () => {
    localStorageStore = {};
  },
};
