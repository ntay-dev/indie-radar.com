import { describe, it, expect, vi } from "vitest";

import plugin from "~/plugins/supabase.client";

// Mock createClient before importing the plugin
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn((cb: any) => {
        // Store the callback for testing
        (globalThis as any).__authCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
    from: vi.fn(),
  })),
}));

describe("supabase.client plugin", () => {
  it("is a function (defineNuxtPlugin returns the setup function)", () => {
    expect(typeof plugin).toBe("function");
  });

  it("returns provide object with supabase, supabaseUser, supabaseSession", () => {
    const result = plugin() as any;
    expect(result).toBeDefined();
    expect(result.provide).toBeDefined();
    expect(result.provide).toHaveProperty("supabase");
    expect(result.provide).toHaveProperty("supabaseUser");
    expect(result.provide).toHaveProperty("supabaseSession");
  });

  it("initializes supabaseUser as null ref", () => {
    const result = plugin() as any;
    expect(result.provide.supabaseUser.value).toBeNull();
  });

  it("initializes supabaseSession as null ref", () => {
    const result = plugin() as any;
    expect(result.provide.supabaseSession.value).toBeNull();
  });

  it("creates a supabase client object with auth methods", () => {
    const result = plugin() as any;
    const client = result.provide.supabase;
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(client.auth.getSession).toBeDefined();
    expect(client.auth.onAuthStateChange).toBeDefined();
  });

  it("still creates client when supabaseUrl is empty (no console.error)", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const origConfig = (globalThis as any).useRuntimeConfig;
    (globalThis as any).useRuntimeConfig = () => ({
      public: { supabaseUrl: "", supabaseKey: "key" },
    });

    const result = plugin() as any;
    // Plugin creates client regardless — no error logged
    expect(result.provide).toHaveProperty("supabase");
    (globalThis as any).useRuntimeConfig = origConfig;
    consoleSpy.mockRestore();
  });

  it("still creates client when supabaseKey is empty (no console.error)", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const origConfig = (globalThis as any).useRuntimeConfig;
    (globalThis as any).useRuntimeConfig = () => ({
      public: { supabaseUrl: "https://test.supabase.co", supabaseKey: "" },
    });

    const result = plugin() as any;
    // Plugin creates client regardless — no error logged
    expect(result.provide).toHaveProperty("supabase");
    (globalThis as any).useRuntimeConfig = origConfig;
    consoleSpy.mockRestore();
  });

  it("updates user and session refs on SIGNED_IN auth state change", () => {
    const result = plugin() as any;
    const user = result.provide.supabaseUser;
    const session = result.provide.supabaseSession;

    const callback = (globalThis as any).__authCallback;
    expect(callback).toBeDefined();

    const mockSession = {
      user: { id: "user-1", email: "test@test.com" },
      access_token: "tok",
    };
    callback("SIGNED_IN", mockSession);

    expect(session.value).toEqual(mockSession);
    expect(user.value).toEqual(mockSession.user);
  });

  it("clears user and session refs on SIGNED_OUT auth state change", () => {
    const result = plugin() as any;
    const user = result.provide.supabaseUser;
    const session = result.provide.supabaseSession;

    const callback = (globalThis as any).__authCallback;
    expect(callback).toBeDefined();

    // First sign in
    const mockSession = {
      user: { id: "user-1", email: "test@test.com" },
      access_token: "tok",
    };
    callback("SIGNED_IN", mockSession);
    expect(user.value).toEqual(mockSession.user);

    // Then sign out
    callback("SIGNED_OUT", null);
    expect(session.value).toBeNull();
    expect(user.value).toBeNull();
  });

  it("does not log error when both URL and Key are provided", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    plugin();
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
