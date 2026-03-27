<template>
  <div>
    <!-- Back nav -->
    <div class="border-b border-(--color-border) bg-(--color-surface)">
      <div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-1.5 text-sm text-(--color-text-muted) transition-colors hover:text-(--color-text-secondary)"
        >
          <ArrowLeft class="size-4" />
          Back to Database
        </NuxtLink>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div class="grid gap-8 lg:grid-cols-3">
        <div class="lg:col-span-2 space-y-6">
          <div class="card p-6">
            <div class="flex items-start gap-4">
              <div class="skeleton h-14 w-14 rounded-xl" />
              <div class="space-y-2 flex-1">
                <div class="skeleton h-7 w-48" />
                <div class="skeleton h-4 w-32" />
              </div>
            </div>
            <div class="mt-6 space-y-2">
              <div class="skeleton h-4 w-full" />
              <div class="skeleton h-4 w-3/4" />
            </div>
            <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div v-for="n in 8" :key="n" class="skeleton h-20 rounded-xl" />
            </div>
          </div>
        </div>
        <div class="card p-6 space-y-4">
          <div class="skeleton h-6 w-40" />
          <div v-for="n in 5" :key="n" class="skeleton h-20 rounded-xl" />
        </div>
      </div>
    </div>

    <!-- Not found -->
    <div
      v-else-if="!product"
      class="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8"
    >
      <div class="mx-auto max-w-md">
        <Search
          class="mx-auto mb-4 size-12 text-(--color-text-muted) opacity-30"
        />
        <h2 class="text-xl font-semibold text-(--color-text-primary)">
          Product not found
        </h2>
        <p class="mt-2 text-sm text-(--color-text-muted)">
          This SaaS product doesn't exist in our database.
        </p>
        <NuxtLink
          to="/"
          class="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          <ArrowLeft class="size-4" />
          Back to Database
        </NuxtLink>
      </div>
    </div>

    <!-- Product detail -->
    <div v-else class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div class="grid gap-8 lg:grid-cols-3">
        <!-- Main info -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Header card -->
          <div class="card p-6">
            <div class="flex items-start gap-4">
              <div
                class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-xl font-bold text-emerald-400 ring-1 ring-white/5"
              >
                {{ product.name.charAt(0) }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-3">
                  <h1 class="text-2xl font-bold text-(--color-text-primary)">
                    {{ product.name }}
                  </h1>
                  <DataAge :sourced-at="product.latest_sourced_at" />
                </div>
                <p
                  v-if="product.company"
                  class="mt-0.5 text-sm text-(--color-text-secondary)"
                >
                  {{ product.company }}
                </p>
              </div>
              <!-- Links -->
              <div class="flex gap-2">
                <a
                  v-if="product.website_url"
                  :href="product.website_url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex h-9 w-9 items-center justify-center rounded-lg border border-(--color-border) text-(--color-text-muted) transition-all hover:border-blue-500/30 hover:text-blue-400"
                  title="Website"
                >
                  <ExternalLink class="size-3.5" />
                </a>
                <a
                  v-if="product.trustmrr_url"
                  :href="product.trustmrr_url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex h-9 w-9 items-center justify-center rounded-lg border border-(--color-border) text-(--color-text-muted) transition-all hover:border-green-500/30 hover:text-green-400"
                  title="TrustMRR"
                >
                  <BadgeCheck class="size-3.5" />
                </a>
              </div>
            </div>

            <p
              v-if="product.description"
              class="mt-5 text-sm leading-relaxed text-(--color-text-secondary)"
            >
              {{ product.description }}
            </p>

            <!-- Founders -->
            <div v-if="founders.length > 0" class="mt-6">
              <h3
                class="mb-3 text-xs font-medium uppercase tracking-wider text-(--color-text-muted)"
              >
                Founders
              </h3>
              <div class="flex flex-wrap gap-2">
                <FounderAvatar
                  v-for="founder in founders"
                  :key="founder.xHandle"
                  :founder="founder"
                />
              </div>
            </div>
          </div>

          <!-- Metrics grid -->
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div v-if="product.mrr" class="card stat-green p-4">
              <p class="text-xs text-(--color-text-muted)">MRR</p>
              <p class="mt-1 text-lg font-semibold tabular-nums text-green-400">
                {{ formatCurrency(product.mrr) }}
              </p>
            </div>
            <div v-if="product.revenue_last_30d" class="card stat-green p-4">
              <p class="text-xs text-(--color-text-muted)">Revenue (30d)</p>
              <p class="mt-1 text-lg font-semibold tabular-nums text-green-400">
                {{ formatCurrency(product.revenue_last_30d) }}
              </p>
            </div>
            <div class="card p-4">
              <p class="text-xs text-(--color-text-muted)">Country</p>
              <NuxtLink
                v-if="product.country_code"
                :to="`/products?country=${product.country_code}`"
                class="mt-1 text-sm font-medium text-(--color-text-primary) hover:text-blue-400"
              >
                {{ product.country_name || "—" }}
              </NuxtLink>
              <p
                v-else
                class="mt-1 text-sm font-medium text-(--color-text-primary)"
              >
                —
              </p>
            </div>
            <div class="card p-4">
              <p class="text-xs text-(--color-text-muted)">Category</p>
              <NuxtLink
                v-if="product.category_slug"
                :to="`/products?category=${product.category_slug}`"
                class="mt-1 text-sm font-medium text-(--color-text-primary) hover:text-blue-400"
              >
                {{ product.category || "—" }}
              </NuxtLink>
              <p
                v-else
                class="mt-1 text-sm font-medium text-(--color-text-primary)"
              >
                —
              </p>
            </div>
            <div class="card p-4">
              <p class="text-xs text-(--color-text-muted)">Founded</p>
              <p class="mt-1 text-sm font-medium text-(--color-text-primary)">
                {{ product.founded_year || "—" }}
              </p>
            </div>
            <div v-if="product.trustmrr_rank" class="card stat-purple p-4">
              <p class="text-xs text-(--color-text-muted)">TrustMRR Rank</p>
              <p
                class="mt-1 text-lg font-semibold tabular-nums text-purple-400"
              >
                #{{ product.trustmrr_rank }}
              </p>
            </div>
          </div>
        </div>

        <!-- Sources sidebar -->
        <div>
          <div class="card p-6">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-(--color-text-primary)">
                Sources & Provenance
              </h2>
              <span
                class="rounded-full bg-(--color-surface-elevated) px-2 py-0.5 text-xs tabular-nums text-(--color-text-muted)"
              >
                {{ dataPoints.length }}
              </span>
            </div>

            <div
              v-if="dataPoints.length === 0"
              class="mt-6 text-center text-sm text-(--color-text-muted)"
            >
              No sources available
            </div>

            <div v-else class="mt-4 space-y-2.5">
              <!-- Group data points by field -->
              <div
                v-for="(group, fieldName) in groupedDataPoints"
                :key="fieldName"
                class="rounded-xl border border-(--color-border) bg-(--color-surface-elevated) p-3"
              >
                <div class="flex items-center justify-between gap-2">
                  <span
                    class="text-[0.65rem] font-medium uppercase tracking-wider text-(--color-text-muted)"
                  >
                    {{ fieldLabels[fieldName] || fieldName }}
                  </span>
                  <div v-if="group.length > 1" class="flex items-center gap-1">
                    <span class="text-[0.6rem] text-(--color-text-muted)"
                      >{{ group.length }} sources</span
                    >
                  </div>
                </div>

                <!-- Show each source for this field -->
                <div
                  v-for="(dp, idx) in group"
                  :key="dp.id"
                  :class="
                    idx > 0
                      ? 'mt-2 border-t border-(--color-border) pt-2'
                      : 'mt-1'
                  "
                >
                  <p class="text-sm text-(--color-text-primary)">
                    {{ truncateValue(dp.field_value) }}
                  </p>
                  <div
                    v-if="dp.source"
                    class="mt-1.5 flex flex-wrap items-center gap-1.5 text-[0.65rem] text-(--color-text-muted)"
                  >
                    <TrustBadge
                      :level="dp.source.trust_level"
                      :show-level="true"
                    />
                    <a
                      v-if="dp.source.url"
                      :href="dp.source.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-blue-400/70 hover:text-blue-400 hover:underline"
                    >
                      {{ dp.source.name }}
                    </a>
                    <span v-else>{{ dp.source.name }}</span>
                    <span>&middot;</span>
                    <DataAge :sourced-at="dp.sourced_at" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Trust system info -->
            <div class="mt-4 border-t border-(--color-border) pt-4">
              <p class="text-xs text-(--color-text-muted)">
                Trust levels: 90+ official sources, 85+ verified APIs, 70+
                public platforms, &lt;70 community data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Search, ExternalLink, BadgeCheck } from "lucide-vue-next";
import type {
  ProductView,
  ProductDataPoint,
  Source,
} from "~/types/database.types";
import { formatCurrency } from "~/utils/format";

const route = useRoute();
const { fetchProduct, fetchProductDataPoints, loading } = useProducts();

interface Founder {
  name: string;
  xHandle: string;
  avatarUrl: string;
}

const product = ref<ProductView | null>(null);
const dataPoints = ref<(ProductDataPoint & { source: Source | null })[]>([]);

useHead(
  computed(() => {
    if (!product.value) return {};
    const name = product.value.name;
    const company = product.value.company;
    const slug = product.value.slug;
    const description =
      product.value.description ||
      `${name}${company ? ` by ${company}` : ""} — SaaS product with verified revenue, growth and source data.`;
    const pageUrl = `https://saasrevenuedb.com/products/${slug}`;
    return {
      title: `${name} — SaaS Products`,
      meta: [
        { name: "description", content: description },
        { property: "og:title", content: `${name} — SaaS Products` },
        { property: "og:description", content: description },
        { property: "og:url", content: pageUrl },
        { property: "og:type", content: "website" },
        {
          property: "og:image",
          content: "https://saasrevenuedb.com/og-image.png",
        },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: `${name} — SaaS Products` },
        { name: "twitter:description", content: description },
      ],
      link: [{ rel: "canonical", href: pageUrl }],
    };
  }),
);

useBreadcrumbSchema([
  { name: "Home", url: "/" },
  { name: "Products", url: "/products" },
  {
    name: product.value?.name || "Product",
    url: `/products/${route.params.slug}`,
  },
]);

useProductSchema(() => {
  const p = product.value;
  if (!p) return null;
  return {
    name: p.name,
    slug: p.slug,
    description: p.description,
    company: p.company,
    category: p.category,
    url: p.website_url,
    mrr: p.mrr,
    country: p.country_name,
    foundedYear: p.founded_year,
  };
});

const founders = computed<Founder[]>(() => {
  const raw = product.value?.founders;
  if (!raw || raw === "null" || raw === "undefined") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (f: Founder) =>
        f && f.name && f.name !== "null" && f.name !== "undefined",
    );
  } catch {
    return [];
  }
});

const fieldLabels: Record<string, string> = {
  company: "Company",
  country_code: "Country",
  employees: "Employees",
  category_id: "Category",
  category_name: "Category",
  description: "Description",
  founded_year: "Founded",
  mrr: "MRR (USD)",
  revenue_last_30d: "Revenue (30d)",
  growth_30d: "Growth (30d)",
  customers: "Customers",
  founders: "Founders",
  trustmrr_url: "TrustMRR",
  trustmrr_rank: "TrustMRR Rank",
};

// Group data points by field_name to show multiple sources per field
const groupedDataPoints = computed(() => {
  const groups: Record<
    string,
    (ProductDataPoint & { source: Source | null })[]
  > = {};
  for (const dp of dataPoints.value) {
    const key = dp.field_name;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key]!.push(dp);
  }
  // Sort each group by trust level (highest first)
  for (const key of Object.keys(groups)) {
    groups[key]!.sort(
      (a, b) => (b.source?.trust_level ?? 0) - (a.source?.trust_level ?? 0),
    );
  }
  return groups;
});

function truncateValue(value: string): string {
  if (value.length > 120) return value.slice(0, 120) + "...";
  return value;
}

onMounted(async () => {
  const slug = route.params.slug as string;
  product.value = await fetchProduct(slug);

  if (product.value) {
    dataPoints.value = await fetchProductDataPoints(
      (product.value as ProductView).id,
    );
  }
});
</script>
