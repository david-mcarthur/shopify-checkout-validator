import React, { useState, useEffect } from "react";
import {
  reactExtension,
  useBillingAddress,
  Banner,
  BlockStack,
  Text,
  useApplyBillingAddressChange,
  useExtensionCapability,
  useBuyerJourneyIntercept,
} from "@shopify/ui-extensions-react/checkout";

// This extension renders after the billing address section in checkout.
// It validates that the billing country is Australia (AU).
export default reactExtension(
  "purchase.checkout.billing-address.render-after",
  () => <BillingAddressValidator />
);

const ALLOWED_COUNTRY = "AU";
const ALLOWED_COUNTRY_NAME = "Australia";

function BillingAddressValidator() {
  const billingAddress = useBillingAddress();
  const country = billingAddress?.countryCode ?? "";
  const isAustralia = country === "" || country === ALLOWED_COUNTRY;

  // Block the buyer journey (prevent proceeding to next step) when invalid
  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    if (canBlockProgress && !isAustralia) {
      return {
        behavior: "block",
        reason: `Billing address must be in ${ALLOWED_COUNTRY_NAME}.`,
        errors: [
          {
            message: `We only accept orders with an Australian billing address. Please update your billing country to ${ALLOWED_COUNTRY_NAME} (${ALLOWED_COUNTRY}) to continue.`,
            target: "$.cart.billingAddress.countryCode",
          },
        ],
      };
    }
    return { behavior: "allow" };
  });

  // Only show the banner when a non-AU country is explicitly selected
  if (isAustralia) {
    return null;
  }

  return (
    <BlockStack spacing="tight">
      <Banner status="critical">
        <BlockStack spacing="extraTight">
          <Text size="medium" emphasis="bold">
            Australian billing address required
          </Text>
          <Text size="base">
            We only accept orders with an Australian billing address. Please
            update your billing country to {ALLOWED_COUNTRY_NAME} (
            {ALLOWED_COUNTRY}) to continue.
          </Text>
        </BlockStack>
      </Banner>
    </BlockStack>
  );
}
