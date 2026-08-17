import type { LoaderFunctionArgs } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  return null;
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs: any) => {
  return boundary.headers(headersArgs);
};

function useRouteError() {
  const { useRouteError } = require("@remix-run/react");
  return useRouteError();
}
