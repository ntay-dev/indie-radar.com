import { describe, it, expect } from "vitest";

// Import actual composables
import {
  useSupabaseClient,
  useSupabaseUser,
  useSupabaseSession,
} from "~/composables/useSupabase";

describe("useSupabaseClient", () => {
  it("returns the supabase client from nuxt app", () => {
    const client = useSupabaseClient();
    expect(client).toBeDefined();
    expect(client).toHaveProperty("from");
    expect(client).toHaveProperty("auth");
  });
});

describe("useSupabaseUser", () => {
  it("returns a ref", () => {
    const user = useSupabaseUser();
    expect(user).toBeDefined();
    expect(user).toHaveProperty("value");
  });

  it("initially has null value", () => {
    const user = useSupabaseUser();
    expect(user.value).toBeNull();
  });
});

describe("useSupabaseSession", () => {
  it("returns a ref", () => {
    const session = useSupabaseSession();
    expect(session).toBeDefined();
    expect(session).toHaveProperty("value");
  });

  it("initially has null value", () => {
    const session = useSupabaseSession();
    expect(session.value).toBeNull();
  });
});
