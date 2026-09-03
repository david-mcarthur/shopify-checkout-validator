import "@shopify/ui-extensions/preact";
import { render } from "preact";
import {
  useBuyerJourneyIntercept,
  useBillingAddress,
  useExtensionCapability,
  useExtensionEditor,
  useSettings,
} from "@shopify/ui-extensions/checkout/preact";
import {
  formatAllowedCountries,
  getBillingAddressIssue,
  parseAllowedCountries,
} from "./validation";

// Merchant-configured setting from shopify.extension.toml, edited in the checkout editor.
type BillingAddressValidatorSettings = {
  allowed_countries?: string;
};

// This extension renders after the payment method list in checkout.
// It validates the billing country and address character set.
export default function extension() {
  render(<BillingAddressValidator />, document.body);
}

function BillingAddressValidator() {
  const billingAddress = useBillingAddress();
  const canBlockProgress = useExtensionCapability("block_progress");
  const editorType = useExtensionEditor()?.type;
  const settings = useSettings<BillingAddressValidatorSettings>();

  const allowedCountries = parseAllowedCountries(settings.allowed_countries);
  const allowedCountriesLabel = formatAllowedCountries(allowedCountries);
  const billingAddressIssue = getBillingAddressIssue(
    billingAddress,
    allowedCountries,
  );

  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    if (canBlockProgress && billingAddressIssue === "country") {
      return {
        behavior: "block",
        reason: `Billing address must be in ${allowedCountriesLabel}.`,
        errors: [
          {
            message: `We only accept orders billed to ${allowedCountriesLabel}. Please update your billing country to continue.`,
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
        with unsupported billing addresses from continuing.
      </s-banner>
    );
  }

  if (billingAddressIssue === "country") {
    return (
      <s-banner
        tone="critical"
        heading={`Billing address in ${allowedCountriesLabel} required`}
      >
        We only accept orders billed to {allowedCountriesLabel}. Please update
        your billing country to continue.
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
