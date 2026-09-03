import type { MailingAddress } from "@shopify/ui-extensions/checkout";

export const DEFAULT_ALLOWED_COUNTRIES: readonly string[] = ["AU"];

const UNSUPPORTED_CHARACTER_PATTERN = /[^\x20-\x7E]/;

const COUNTRY_NAMES: Record<string, string> = {
  AU: "Australia",
  NZ: "New Zealand",
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  IE: "Ireland",
};

export type BillingAddressIssue = "country" | "characters";

export function hasUnsupportedCharacters(
  values: ReadonlyArray<string | undefined>,
) {
  return values.some((value) =>
    UNSUPPORTED_CHARACTER_PATTERN.test(value ?? ""),
  );
}

// Parses a merchant-supplied comma/space-separated ISO code list; empty or invalid falls back to AU.
export function parseAllowedCountries(raw: string | undefined): string[] {
  if (!raw) return [...DEFAULT_ALLOWED_COUNTRIES];
  const codes = raw
    .split(/[\s,]+/)
    .map((code) => code.trim().toUpperCase())
    .filter((code) => /^[A-Z]{2}$/.test(code));
  if (codes.length === 0) return [...DEFAULT_ALLOWED_COUNTRIES];
  return Array.from(new Set(codes));
}

export function getCountryName(code: string): string {
  return COUNTRY_NAMES[code] ?? code;
}

export function formatAllowedCountries(codes: readonly string[]): string {
  const names = codes.map(getCountryName);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} or ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, or ${names[names.length - 1]}`;
}

export function getBillingAddressIssue(
  billingAddress: MailingAddress | undefined,
  allowedCountries: readonly string[] = DEFAULT_ALLOWED_COUNTRIES,
): BillingAddressIssue | null {
  const countryCode = billingAddress?.countryCode;

  if (countryCode && !allowedCountries.includes(countryCode)) {
    return "country";
  }

  if (
    hasUnsupportedCharacters([
      billingAddress?.name,
      billingAddress?.firstName,
      billingAddress?.lastName,
      billingAddress?.company,
      billingAddress?.address1,
      billingAddress?.address2,
      billingAddress?.city,
      billingAddress?.zip,
      billingAddress?.provinceCode,
      billingAddress?.phone,
    ])
  ) {
    return "characters";
  }

  return null;
}
