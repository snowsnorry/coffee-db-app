export type HealthResponse = {
  status: "ok";
  service: "coffee-db-server";
};

export async function fetchHealth(
  signal?: AbortSignal,
): Promise<HealthResponse> {
  const response = await fetch("/api/health", signal ? { signal } : undefined);
  if (!response.ok) {
    throw new Error(`Health request failed with status ${response.status}`);
  }

  return (await response.json()) as HealthResponse;
}
