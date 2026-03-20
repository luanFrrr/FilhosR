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

export function normalizeNotificationTarget(rawTarget: string | null | undefined): {
  target: string;
  isInternal: boolean;
} {
  if (!rawTarget) {
    return { target: "/", isInternal: true };
  }

  const target = String(rawTarget).trim();
  if (!target) {
    return { target: "/", isInternal: true };
  }

  if (target.startsWith("/")) {
    return { target, isInternal: true };
  }

  try {
    const url = new URL(target, window.location.origin);
    if (url.origin === window.location.origin) {
      return {
        target: `${url.pathname}${url.search}${url.hash}`,
        isInternal: true,
      };
    }
    return { target: url.href, isInternal: false };
  } catch {
    return { target: "/", isInternal: true };
  }
}

export function appendNotifyChildId(
  rawPath: string,
  childId: number | null,
): string {
  if (!childId || !rawPath.startsWith("/")) return rawPath;

  try {
    const url = new URL(rawPath, window.location.origin);
    url.searchParams.set(NOTIFY_CHILD_PARAM, String(childId));
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return rawPath;
  }
}
