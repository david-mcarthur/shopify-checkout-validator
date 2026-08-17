import type { MailingAddress } from "@shopify/ui-extensions/checkout";

export const ALLOWED_COUNTRY = "AU";
export const ALLOWED_COUNTRY_NAME = "Australia";

const UNSUPPORTED_CHARACTER_PATTERN = /[^\x20-\x7E]/;

export type BillingAddressIssue = "country" | "characters";

export function hasUnsupportedCharacters(
  values: ReadonlyArray<string | undefined>,
) {
  return values.some((value) =>
    UNSUPPORTED_CHARACTER_PATTERN.test(value ?? ""),
  );
}

export function getBillingAddressIssue(
  billingAddress: MailingAddress | undefined,
): BillingAddressIssue | null {
  const countryCode = billingAddress?.countryCode;

  if (countryCode && countryCode !== ALLOWED_COUNTRY) {
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