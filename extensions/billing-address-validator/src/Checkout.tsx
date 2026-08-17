import "@shopify/ui-extensions/preact";
import { render } from "preact";
import {
  useBuyerJourneyIntercept,
  useBillingAddress,
  useExtensionCapability,
  useExtensionEditor,
} from "@shopify/ui-extensions/checkout/preact";

// This extension renders after the payment method list in checkout.
// It validates that the billing country is Australia (AU).
export default function extension() {
  render(<BillingAddressValidator />, document.body);
}

const ALLOWED_COUNTRY = "AU";
const ALLOWED_COUNTRY_NAME = "Australia";

function BillingAddressValidator() {
  const billingAddress = useBillingAddress();
  const canBlockProgress = useExtensionCapability("block_progress");
  const editorType = useExtensionEditor()?.type;
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
          },
        ],
      };
    }
    return { behavior: "allow" };
  });

  if (editorType === "checkout" && !canBlockProgress) {
    return (
      <s-banner tone="warning" heading="Checkout blocking is not enabled">
        Enable this extension under Checkout behavior so it can prevent buyers
        with non-Australian billing addresses from continuing.
      </s-banner>
    );
  }

  // Only show the banner when a non-AU country is explicitly selected
  if (isAustralia) {
    return null;
  }

  return (
    <s-banner tone="critical" heading="Australian billing address required">
      We only accept orders with an Australian billing address. Please update
      your billing country to {ALLOWED_COUNTRY_NAME} ({ALLOWED_COUNTRY}) to
      continue.
    </s-banner>
  );
}
