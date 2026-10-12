export type Connection = "loading" | "online" | "error";
export async function checkHealth(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<Connection> {
  try {
    const response = await fetcher(`${url}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return "error";
    return (await response.json()).status === "ok" ? "online" : "error";
  } catch {
    return "error";
  }
}
