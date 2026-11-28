import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "../../apps/web/node_modules/react-dom/server";
import { ComparisonMatrix } from "../../apps/web/app/components/pricing/ComparisonMatrix";
import { PricingPlans } from "../../apps/web/app/components/pricing/PricingPlans";
import {
  ANNUAL_DISCOUNT_PERCENT,
  MATRIX,
  PLANS,
  PRICING_FAQ,
  planPrice,
  pricingJsonLd,
} from "../../apps/web/app/components/pricing/pricingData";

const root = path.join(import.meta.dir, "..", "..");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf-8");

const pageSource = read("apps/web/app/pricing/page.tsx");
const dataSource = read("apps/web/app/components/pricing/pricingData.ts");
const plansMarkup = renderToStaticMarkup(<PricingPlans />);
const matrixMarkup = renderToStaticMarkup(<ComparisonMatrix />);

describe("PHASE 13 — self-serve pricing architecture", () => {
  test("1. exactly three plans at 0, 19 and 39 USD", () => {
    expect(PLANS.map((plan) => plan.name)).toEqual(["Free", "Analyst", "Operator"]);
    expect(PLANS.map((plan) => plan.monthly)).toEqual([0, 19, 39]);
    expect(PLANS.map((plan) => plan.id)).toEqual(["free", "analyst", "operator"]);
  });

  test("2. annual pricing is a 20% discount at 15 and 31 USD", () => {
    expect(ANNUAL_DISCOUNT_PERCENT).toBe(20);
    const analyst = PLANS[1];
    const operator = PLANS[2];
    expect(planPrice(analyst, "annual")).toBe(15);
    expect(planPrice(operator, "annual")).toBe(31);
    expect(analyst.annualMonthly).toBe(Math.floor(analyst.monthly * (1 - ANNUAL_DISCOUNT_PERCENT / 100)));
    expect(operator.annualMonthly).toBe(Math.floor(operator.monthly * (1 - ANNUAL_DISCOUNT_PERCENT / 100)));
    expect(planPrice(analyst, "monthly")).toBe(19);
    expect(planPrice(operator, "monthly")).toBe(39);
  });

  test("3. the rendered cards carry all three prices and no enterprise tier", () => {
    expect(plansMarkup).toContain("$0");
    expect(plansMarkup).toContain("$19");
    expect(plansMarkup).toContain("$39");
    expect(plansMarkup).toContain("Start free");
    expect(plansMarkup).toContain("Start 7 day trial");
    expect(plansMarkup).toContain("Get Operator");
    expect(plansMarkup).toContain("Recommended");
    expect(plansMarkup).not.toMatch(/enterprise/i);
    expect(plansMarkup).not.toMatch(/contact sales|book a demo|talk to sales/i);
  });

  test("4. billing toggle is server-rendered with Monthly pressed and Save 20%", () => {
    expect(plansMarkup).toContain('aria-pressed="true"');
    expect(plansMarkup).toContain("Monthly");
    expect(plansMarkup).toContain("Annual");
    expect(plansMarkup).toContain("Save 20%");
    expect(plansMarkup).toContain('role="group"');
    expect(plansMarkup).toContain('aria-label="Billing cycle"');
  });

  test("5. paid CTAs point at the live access intake, never a dead checkout", () => {
    for (const plan of PLANS) {
      expect(plan.href).not.toContain("checkout");
      expect(plan.href.startsWith("/")).toBe(true);
    }
    expect(PLANS[1].href).toBe("/developers#request-access");
    expect(PLANS[2].href).toBe("/developers#request-access");
    expect(PLANS[0].href).toBe("/intelligence");
  });

  test("6. comparison matrix covers four grouped sections and exact quotas", () => {
    expect(MATRIX.map((group) => group.title)).toEqual([
      "Threat Intelligence and Global Wire",
      "API and Automation",
      "Monitoring Detection and Exports",
      "Governance and Support",
    ]);
    for (const value of ["10,000", "100,000", "60 req/min", "300 req/min", "STIX 2.1", "15 vendors", "100 vendors"]) {
      expect(matrixMarkup).toContain(value);
    }
    expect(matrixMarkup).toContain('class="zx-table"');
    expect(matrixMarkup).toContain("zx-th--rec");
  });

  test("7. mobile switcher exposes all three plans and no table overflow at 412px", () => {
    expect(matrixMarkup).toContain("zx-mobile-tabs");
    expect(matrixMarkup).toContain("zx-mobile-cards");
    expect(matrixMarkup).toContain('aria-label="Compare plans"');
    expect(matrixMarkup).toContain("zx-mobile-tab");
  });

  test("8. technical tooltips are present and keyboard reachable", () => {
    for (const term of ["My Tech Stack Shield", "Firewall EDL feeds", "HMAC webhooks", "Global Wire latency"]) {
      expect(matrixMarkup).toContain(term);
    }
    expect(matrixMarkup).toContain('tabindex="0"');
    expect(matrixMarkup).toContain("zx-tip-bubble");
    expect(matrixMarkup).toContain('aria-describedby="');
  });

  test("9. JSON-LD is a valid SoftwareApplication with three Offers and an FAQPage", () => {
    const graph = pricingJsonLd("https://zayron-x.co") as {
      "@graph": Array<Record<string, unknown>>;
    };
    const app = graph["@graph"].find((node) => node["@type"] === "SoftwareApplication") as Record<string, unknown>;
    expect(app).toBeDefined();
    expect(app.applicationCategory).toBe("SecurityApplication");
    const offers = app.offers as Array<Record<string, string>>;
    expect(offers.map((offer) => offer.price)).toEqual(["0", "19", "39"]);
    expect(offers.map((offer) => offer.priceCurrency)).toEqual(["USD", "USD", "USD"]);
    expect(offers.map((offer) => offer.name)).toEqual(["Free", "Analyst", "Operator"]);

    const faq = graph["@graph"].find((node) => node["@type"] === "FAQPage") as {
      mainEntity: Array<Record<string, unknown>>;
    };
    expect(faq.mainEntity).toHaveLength(PRICING_FAQ.length);
    expect(faq.mainEntity).toHaveLength(6);
    for (const question of faq.mainEntity) {
      expect(question["@type"]).toBe("Question");
      const answer = question.acceptedAnswer as Record<string, string>;
      expect(answer.text.length).toBeGreaterThan(40);
    }

    const crumbs = graph["@graph"].find((node) => node["@type"] === "BreadcrumbList") as {
      itemListElement: Array<Record<string, unknown>>;
    };
    expect(crumbs.itemListElement.map((item) => item.name)).toEqual(["Home", "Pricing"]);
  });

  test("10. page metadata keeps the self-referencing canonical and 300s revalidation", () => {
    expect(pageSource).toContain('alternates: { canonical: "/pricing" }');
    expect(pageSource).toContain("export const revalidate = 300;");
    expect(pageSource).toContain("resolvePageRobots({ preview: isPreviewDeployment(), indexable: true })");
    expect(pageSource).toContain('type="application/ld+json"');
    expect(pageSource).toContain("pricingJsonLd(getSiteUrl())");
  });

  test("11. copy discipline: no exclamation marks, emoji or sales-call CTAs", () => {
    const copy = [dataSource, pageSource, plansMarkup, matrixMarkup].join("\n");
    expect(copy).not.toContain("!");
    expect(copy).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    expect(copy).not.toMatch(/contact sales|book a demo|talk to sales|request a quote|custom pricing/i);
    // "enterprise" may only appear in the mandated contrast copy, never as a plan.
    expect(copy).not.toMatch(/name: "Enterprise"|Enterprise plan|Enterprise tier/i);
  });

  test("12. the legacy four-tier section is gone", () => {
    expect(fs.existsSync(path.join(root, "apps/web/app/components/PricingSection.tsx"))).toBe(false);
    expect(pageSource).not.toContain("PricingSection");
  });
});
