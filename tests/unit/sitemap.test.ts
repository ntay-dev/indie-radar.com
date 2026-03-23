import { describe, it, expect, vi, beforeEach } from "vitest";

import sitemapHandler from "../../server/routes/sitemap.xml";

// Mock @supabase/supabase-js before importing the route handler
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() =>
          Promise.resolve({
            data: [{ slug: "notion" }, { slug: "slack" }, { slug: "figma" }],
          }),
        ),
      })),
    })),
  })),
}));

describe("sitemap.xml route handler", () => {
  let mockEvent: any;

  beforeEach(() => {
    mockEvent = {};
    vi.clearAllMocks();
  });

  it("is a function", () => {
    expect(typeof sitemapHandler).toBe("function");
  });

  it("returns valid XML", async () => {
    const result = await sitemapHandler(mockEvent);
    expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(result).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
    expect(result).toContain("</urlset>");
  });

  it("includes homepage URL", async () => {
    const result = await sitemapHandler(mockEvent);
    expect(result).toContain("<loc>https://indie-radar.com/</loc>");
  });

  it("sets homepage priority to 1.0", async () => {
    const result = await sitemapHandler(mockEvent);
    // Homepage has weekly changefreq and priority 1.0
    expect(result).toContain(
      "<changefreq>weekly</changefreq>\n    <priority>1.0</priority>",
    );
  });

  it("includes impressum page", async () => {
    const result = await sitemapHandler(mockEvent);
    expect(result).toContain("<loc>https://indie-radar.com/impressum</loc>");
  });

  it("includes privacy page", async () => {
    const result = await sitemapHandler(mockEvent);
    expect(result).toContain("<loc>https://indie-radar.com/privacy</loc>");
  });

  it("includes terms page", async () => {
    const result = await sitemapHandler(mockEvent);
    expect(result).toContain("<loc>https://indie-radar.com/terms</loc>");
  });

  it("sets static page priority to 0.3", async () => {
    const result = await sitemapHandler(mockEvent);
    expect(result).toContain("<priority>0.3</priority>");
  });

  it("sets static pages changefreq to monthly", async () => {
    const result = await sitemapHandler(mockEvent);
    expect(result).toContain("<changefreq>monthly</changefreq>");
  });

  it("includes product URLs from database", async () => {
    const result = await sitemapHandler(mockEvent);
    expect(result).toContain(
      "<loc>https://indie-radar.com/products/notion</loc>",
    );
    expect(result).toContain(
      "<loc>https://indie-radar.com/products/slack</loc>",
    );
    expect(result).toContain(
      "<loc>https://indie-radar.com/products/figma</loc>",
    );
  });

  it("sets product priority to 0.7", async () => {
    const result = await sitemapHandler(mockEvent);
    expect(result).toContain("<priority>0.7</priority>");
  });

  it("sets content-type header to application/xml", async () => {
    await sitemapHandler(mockEvent);
    expect((globalThis as any).setResponseHeader).toHaveBeenCalledWith(
      mockEvent,
      "content-type",
      "application/xml",
    );
  });
});

describe("sitemap.xml with no products", () => {
  it("handles null products data gracefully", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const mockCreateClient = createClient as any;

    mockCreateClient.mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: null })),
        })),
      })),
    });

    const result = await sitemapHandler({});
    expect(result).toContain("</urlset>");
    // Static pages should still be present
    expect(result).toContain("<loc>https://indie-radar.com/</loc>");
    // No product URLs should appear
    expect(result).not.toContain("/products/notion");
  });
});

describe("sitemap.xml with updated_at", () => {
  it("uses product updated_at as lastmod when available", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const mockCreateClient = createClient as any;

    mockCreateClient.mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() =>
            Promise.resolve({
              data: [{ slug: "notion", updated_at: "2025-06-15T10:00:00Z" }],
            }),
          ),
        })),
      })),
    });

    const result = await sitemapHandler({});
    expect(result).toContain(
      "<loc>https://indie-radar.com/products/notion</loc>",
    );
    expect(result).toContain("<lastmod>2025-06-15</lastmod>");
  });
});

describe("sitemap.xml structure", () => {
  it("product URLs have weekly changefreq", async () => {
    const result = await sitemapHandler({});
    // Count occurrences of weekly - homepage + all products
    const weeklyMatches = result.match(/<changefreq>weekly<\/changefreq>/g);
    expect(weeklyMatches!.length).toBeGreaterThan(1); // homepage + products
  });

  it("generates well-formed XML with all url elements closed", async () => {
    const result = await sitemapHandler({});
    const openTags = result.match(/<url>/g);
    const closeTags = result.match(/<\/url>/g);
    expect(openTags!.length).toBe(closeTags!.length);
  });
});
