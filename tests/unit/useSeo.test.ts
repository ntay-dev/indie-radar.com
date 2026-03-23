import { describe, it, expect, beforeEach } from "vitest";

// Track calls to useHead and useJsonLd
let capturedHeadCalls: any[] = [];

// Mock useHead globally
(globalThis as any).useHead = (config: any) => {
  capturedHeadCalls.push(config);
};

import {
  useJsonLd,
  useOrganizationSchema,
  useWebSiteSchema,
  useBreadcrumbSchema,
  useProductSchema,
  useCanonical,
} from "~/composables/useSeo";

describe("useSeo", () => {
  beforeEach(() => {
    capturedHeadCalls = [];
  });

  describe("useJsonLd", () => {
    it("adds a script tag with application/ld+json type for plain object", () => {
      useJsonLd({ "@context": "https://schema.org", "@type": "Thing" });
      expect(capturedHeadCalls).toHaveLength(1);
      const script = capturedHeadCalls[0].script[0];
      expect(script.type).toBe("application/ld+json");
      expect(script.innerHTML).toContain('"@context"');
      expect(script.innerHTML).toContain('"@type":"Thing"');
    });

    it("uses computed for function data", () => {
      useJsonLd(() => ({ "@type": "Test" }));
      const script = capturedHeadCalls[0].script[0];
      expect(script.type).toBe("application/ld+json");
      // innerHTML should be a computed ref
      expect(script.innerHTML).toBeDefined();
    });

    it("returns empty string from computed when function returns null", () => {
      useJsonLd(() => null);
      const script = capturedHeadCalls[0].script[0];
      // The innerHTML is a computed — extract its value
      expect(script.innerHTML.value).toBe("");
    });

    it("returns JSON string from computed when function returns data", () => {
      useJsonLd(() => ({ "@type": "Test" }));
      const script = capturedHeadCalls[0].script[0];
      const value = script.innerHTML.value;
      expect(value).toContain('"@type":"Test"');
    });
  });

  describe("useOrganizationSchema", () => {
    it("injects Organization JSON-LD", () => {
      useOrganizationSchema();
      expect(capturedHeadCalls).toHaveLength(1);
      const json = capturedHeadCalls[0].script[0].innerHTML;
      expect(json).toContain('"@type":"Organization"');
      expect(json).toContain("IndieRadar");
      expect(json).toContain("https://indie-radar.com");
    });
  });

  describe("useWebSiteSchema", () => {
    it("injects WebSite JSON-LD with search action", () => {
      useWebSiteSchema();
      expect(capturedHeadCalls).toHaveLength(1);
      const json = capturedHeadCalls[0].script[0].innerHTML;
      expect(json).toContain('"@type":"WebSite"');
      expect(json).toContain("SearchAction");
      expect(json).toContain("search_term_string");
    });
  });

  describe("useBreadcrumbSchema", () => {
    it("injects BreadcrumbList JSON-LD", () => {
      useBreadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Products", url: "/products" },
      ]);
      const json = capturedHeadCalls[0].script[0].innerHTML;
      expect(json).toContain('"@type":"BreadcrumbList"');
      expect(json).toContain('"position":1');
      expect(json).toContain('"position":2');
    });

    it("prepends base URL for relative paths", () => {
      useBreadcrumbSchema([{ name: "Home", url: "/" }]);
      const json = capturedHeadCalls[0].script[0].innerHTML;
      expect(json).toContain("https://indie-radar.com/");
    });

    it("keeps absolute URLs as-is", () => {
      useBreadcrumbSchema([
        { name: "External", url: "https://example.com/page" },
      ]);
      const json = capturedHeadCalls[0].script[0].innerHTML;
      expect(json).toContain("https://example.com/page");
      // Should NOT double-prefix
      expect(json).not.toContain("https://indie-radar.comhttps://example.com");
    });
  });

  describe("useProductSchema", () => {
    it("injects SoftwareApplication JSON-LD from getter function", () => {
      useProductSchema(() => ({
        name: "TestApp",
        slug: "testapp",
        description: "A test app",
        company: "TestCo",
        category: "CRM",
        url: "https://testapp.com",
        mrr: 5000,
        country: "US",
        foundedYear: 2020,
      }));
      const script = capturedHeadCalls[0].script[0];
      const value = script.innerHTML.value;
      expect(value).toContain('"@type":"SoftwareApplication"');
      expect(value).toContain("TestApp");
      expect(value).toContain("TestCo");
      expect(value).toContain("CRM");
    });

    it("returns empty string when getter returns null", () => {
      useProductSchema(() => null);
      const script = capturedHeadCalls[0].script[0];
      expect(script.innerHTML.value).toBe("");
    });

    it("uses default URL when product URL is not provided", () => {
      useProductSchema(() => ({
        name: "NoUrl",
        slug: "nourl",
      }));
      const script = capturedHeadCalls[0].script[0];
      const value = script.innerHTML.value;
      expect(value).toContain("https://indie-radar.com/products/nourl");
    });

    it("uses default category SaaS when not provided", () => {
      useProductSchema(() => ({
        name: "NoCat",
        slug: "nocat",
      }));
      const script = capturedHeadCalls[0].script[0];
      const parsed = JSON.parse(script.innerHTML.value);
      expect(parsed.applicationCategory).toBe("SaaS");
    });

    it("generates fallback description with company", () => {
      useProductSchema(() => ({
        name: "MyApp",
        slug: "myapp",
        company: "MyCo",
      }));
      const script = capturedHeadCalls[0].script[0];
      const value = script.innerHTML.value;
      expect(value).toContain("MyApp");
      expect(value).toContain("MyCo");
      expect(value).toContain("SaaS product");
    });

    it("generates fallback description without company", () => {
      useProductSchema(() => ({
        name: "MyApp",
        slug: "myapp",
      }));
      const script = capturedHeadCalls[0].script[0];
      const value = script.innerHTML.value;
      expect(value).toContain("MyApp");
      expect(value).toContain("SaaS product");
    });

    it("includes author when company is provided", () => {
      useProductSchema(() => ({
        name: "WithCo",
        slug: "withco",
        company: "TheCompany",
      }));
      const script = capturedHeadCalls[0].script[0];
      const value = script.innerHTML.value;
      const parsed = JSON.parse(value);
      expect(parsed.author).toEqual({
        "@type": "Organization",
        name: "TheCompany",
      });
    });

    it("excludes author when company is not provided", () => {
      useProductSchema(() => ({
        name: "NoCo",
        slug: "noco",
      }));
      const script = capturedHeadCalls[0].script[0];
      const value = script.innerHTML.value;
      const parsed = JSON.parse(value);
      expect(parsed.author).toBeUndefined();
    });

    it("includes countryOfOrigin when country is provided", () => {
      useProductSchema(() => ({
        name: "WithCountry",
        slug: "withcountry",
        country: "Germany",
      }));
      const script = capturedHeadCalls[0].script[0];
      const parsed = JSON.parse(script.innerHTML.value);
      expect(parsed.countryOfOrigin).toBe("Germany");
    });

    it("includes datePublished when foundedYear is provided", () => {
      useProductSchema(() => ({
        name: "WithYear",
        slug: "withyear",
        foundedYear: 2015,
      }));
      const script = capturedHeadCalls[0].script[0];
      const parsed = JSON.parse(script.innerHTML.value);
      expect(parsed.datePublished).toBe("2015");
    });
  });

  describe("useCanonical", () => {
    it("adds canonical link with absolute URL for relative path", () => {
      useCanonical("/products");
      const link = capturedHeadCalls[0].link[0];
      expect(link.rel).toBe("canonical");
      expect(link.href).toBe("https://indie-radar.com/products");
    });

    it("keeps absolute URL as-is", () => {
      useCanonical("https://example.com/page");
      const link = capturedHeadCalls[0].link[0];
      expect(link.href).toBe("https://example.com/page");
    });

    it("handles function path with computed", () => {
      useCanonical(() => "/dynamic-path");
      const link = capturedHeadCalls[0].link[0];
      // href should be a computed ref
      expect(link.href.value).toBe("https://indie-radar.com/dynamic-path");
    });

    it("handles function path returning absolute URL", () => {
      useCanonical(() => "https://other.com/page");
      const link = capturedHeadCalls[0].link[0];
      expect(link.href.value).toBe("https://other.com/page");
    });
  });
});
