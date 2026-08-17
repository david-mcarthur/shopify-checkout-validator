import "@shopify/ui-extensions/preact";
import { render } from "preact";
import {
  useBuyerJourneyIntercept,
  useBillingAddress,
  useExtensionCapability,
  useExtensionEditor,
} from "@shopify/ui-extensions/checkout/preact";
import {
  ALLOWED_COUNTRY,
  ALLOWED_COUNTRY_NAME,
  getBillingAddressIssue,
} from "./validation";

// This extension renders after the payment method list in checkout.
// It validates the billing country and address character set.
export default function extension() {
  render(<BillingAddressValidator />, document.body);
}

function BillingAddressValidator() {
  const billingAddress = useBillingAddress();
  const canBlockProgress = useExtensionCapability("block_progress");
  const editorType = useExtensionEditor()?.type;
  const billingAddressIssue = getBillingAddressIssue(billingAddress);

  // Block the buyer journey (prevent proceeding to next step) when invalid
  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    if (canBlockProgress && billingAddressIssue === "country") {
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

    if (canBlockProgress && billingAddressIssue === "characters") {
      return {
        behavior: "block",
        reason: "Billing address contains unsupported characters.",
        errors: [
          {
            message:
              "Please enter your billing address using English letters (A-Z), numbers, and standard punctuation only.",
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

  if (billingAddressIssue === "country") {
    return (
      <s-banner tone="critical" heading="Australian billing address required">
        We only accept orders with an Australian billing address. Please update
        your billing country to {ALLOWED_COUNTRY_NAME} ({ALLOWED_COUNTRY}) to
        continue.
      </s-banner>
    );
  }

  if (billingAddressIssue === "characters") {
    return (
      <s-banner tone="critical" heading="English characters required">
        Please enter your billing address using English letters (A-Z), numbers,
        and standard punctuation only.
      </s-banner>
    );
  }

  return null;
}
