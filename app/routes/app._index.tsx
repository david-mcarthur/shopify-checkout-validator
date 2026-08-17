import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Badge,
  Box,
  InlineStack,
  Icon,
  Divider,
  Banner,
  List,
} from "@shopify/polaris";
import { CheckCircleIcon, AlertCircleIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Fetch shop info
  const shopResponse = await admin.graphql(`
    query {
      shop {
        name
        email
        myshopifyDomain
        plan {
          displayName
        }
        checkoutApiSupported
      }
    }
  `);
  const shopData = await shopResponse.json();
  const shop = shopData.data.shop;

  return json({
    shop,
    extensionStatus: "active",
    validationRule: "AU",
    blockedCountries: "All countries except Australia (AU)",
  });
};

export default function Index() {
  const { shop, extensionStatus, validationRule, blockedCountries } =
    useLoaderData<typeof loader>();

  return (
    <Page
      title="Billing Address Blocker"
      subtitle="Restrict checkout to Australian billing addresses only"
    >
      <Layout>
        {/* Status Banner */}
        <Layout.Section>
          <Banner
            title="Extension Active"
            tone="success"
          >
            <p>
              The checkout UI extension is enforcing Australian billing
              addresses. Customers who enter a non-AU billing country will see
              an error and cannot proceed.
            </p>
          </Banner>
        </Layout.Section>

        {/* Shop Info */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Store Information
              </Text>
              <Divider />
              <InlineStack gap="600" wrap>
                <BlockStack gap="100">
                  <Text variant="bodySm" tone="subdued" as="p">
                    Store Name
                  </Text>
                  <Text variant="bodyMd" fontWeight="semibold" as="p">
                    {shop.name}
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text variant="bodySm" tone="subdued" as="p">
                    Domain
                  </Text>
                  <Text variant="bodyMd" fontWeight="semibold" as="p">
                    {shop.myshopifyDomain}
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text variant="bodySm" tone="subdued" as="p">
                    Plan
                  </Text>
                  <Text variant="bodyMd" fontWeight="semibold" as="p">
                    {shop.plan?.displayName ?? "—"}
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text variant="bodySm" tone="subdued" as="p">
                    Checkout API
                  </Text>
                  <Badge tone={shop.checkoutApiSupported ? "success" : "critical"}>
                    {shop.checkoutApiSupported ? "Supported" : "Not Supported"}
                  </Badge>
                </BlockStack>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Validation Config */}
        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd" as="h2">
                  Validation Rule
                </Text>
                <Badge tone="success">Active</Badge>
              </InlineStack>
              <Divider />
              <BlockStack gap="300">
                <InlineStack gap="200" align="start">
                  <Box>
                    <Text variant="bodySm" tone="subdued" as="p">
                      Allowed Country
                    </Text>
                    <InlineStack gap="200" blockAlign="center">
                      <Text variant="bodyLg" fontWeight="bold" as="p">
                        🇦🇺 Australia (AU)
                      </Text>
                    </InlineStack>
                  </Box>
                </InlineStack>
                <BlockStack gap="100">
                  <Text variant="bodySm" tone="subdued" as="p">
                    Blocked
                  </Text>
                  <Text variant="bodyMd" as="p">
                    {blockedCountries}
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text variant="bodySm" tone="subdued" as="p">
                    Error Message Shown to Customer
                  </Text>
                  <Box
                    background="bg-surface-critical-subdued"
                    padding="300"
                    borderRadius="200"
                    borderColor="border-critical"
                    borderWidth="025"
                  >
                    <Text variant="bodyMd" tone="critical" as="p">
                      "We only accept orders with an Australian billing address.
                      Please update your billing country to Australia (AU) to
                      continue."
                    </Text>
                  </Box>
                </BlockStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Extension Status */}
        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Extension Status
              </Text>
              <Divider />
              <BlockStack gap="300">
                <InlineStack gap="200" blockAlign="center">
                  <Badge tone="success">Deployed</Badge>
                  <Text variant="bodyMd" as="p">
                    billing-address-validator
                  </Text>
                </InlineStack>
                <BlockStack gap="100">
                  <Text variant="bodySm" tone="subdued" as="p">
                    Extension Type
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Checkout UI Extension
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text variant="bodySm" tone="subdued" as="p">
                    Validation Point
                  </Text>
                  <Text variant="bodyMd" as="p">
                    purchase.checkout.billing-address.render-after
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text variant="bodySm" tone="subdued" as="p">
                    Blocks Checkout Progress
                  </Text>
                  <Badge tone="warning">Yes — via checkout validation</Badge>
                </BlockStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* How It Works */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                How It Works
              </Text>
              <Divider />
              <List type="number">
                <List.Item>
                  Customer reaches the billing address step in Shopify checkout.
                </List.Item>
                <List.Item>
                  The checkout UI extension reads the selected billing country
                  in real time.
                </List.Item>
                <List.Item>
                  If the country is <strong>not Australia (AU)</strong>, a
                  prominent error banner is displayed explaining that only
                  Australian billing addresses are accepted.
                </List.Item>
                <List.Item>
                  The checkout validation function also blocks server-side
                  submission, preventing any workarounds.
                </List.Item>
                <List.Item>
                  Once the customer corrects the billing country to{" "}
                  <strong>Australia</strong>, the error clears and they can
                  complete checkout.
                </List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
