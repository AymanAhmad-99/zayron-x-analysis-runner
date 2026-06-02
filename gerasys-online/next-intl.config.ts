import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeDetection: true,
});

export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];
