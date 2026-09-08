import { useEffect, useState } from "react";
import { fetchJson } from "../api/catalog";
type Resource<T> = { data?: T; error?: string; loading: boolean };
export function useResource<T>(url: string, preserveData = false) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Resource<T> & { url: string }>({
    url: "",
    loading: true,
  });
  useEffect(() => {
    const controller = new AbortController();
    setResult((previous) => ({
      ...retainedData(previous, preserveData),
      url,
      loading: true,
    }));
    void fetchJson<T>(url, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setResult({ url, data, loading: false });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResult((previous) => ({
            ...retainedData(previous, preserveData),
            url,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load the catalogue.",
            loading: false,
          }));
      });
    return () => controller.abort();
  }, [url, attempt, preserveData]);
  const current: Resource<T> =
    result.url === url
      ? result
      : { ...retainedData(result, preserveData), loading: true };
  return { ...current, retry: () => setAttempt((value) => value + 1) };
}

function retainedData<T>(
  resource: Resource<T>,
  preserve: boolean,
): Pick<Resource<T>, "data"> {
  return preserve && resource.data !== undefined ? { data: resource.data } : {};
}
