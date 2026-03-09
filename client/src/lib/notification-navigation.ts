export const NOTIFY_CHILD_PARAM = "notifyChildId";

function toValidChildId(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function extractNotifyChildFromPath(rawPath: string): {
  path: string;
  childId: number | null;
} {
  if (!rawPath.startsWith("/")) {
    return { path: rawPath, childId: null };
  }

  try {
    const url = new URL(rawPath, window.location.origin);
    const childId = toValidChildId(url.searchParams.get(NOTIFY_CHILD_PARAM));
    url.searchParams.delete(NOTIFY_CHILD_PARAM);
    return {
      path: `${url.pathname}${url.search}${url.hash}`,
      childId,
    };
  } catch {
    return { path: rawPath, childId: null };
  }
}

export function resolveNotifyChildId(value: unknown): number | null {
  return toValidChildId(value);
}
