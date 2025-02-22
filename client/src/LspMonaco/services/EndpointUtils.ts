/*
 * Copyright (c) Eric Traut
 * Utility functions used for accessing network endpoints.
 */

export async function endpointRequest(
  method: "GET" | "POST" | "PUT" | "DELETE",
  endpoint: string,
  body?: object,
) {
  const response = await fetch(endpoint, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) {
    throw data;
  }

  return data;
}
