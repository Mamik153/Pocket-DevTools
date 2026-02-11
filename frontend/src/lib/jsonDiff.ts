export interface JsonDifference {
  path: string;
  left: string;
  right: string;
}

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const formatValue = (value: unknown): string => {
  if (typeof value === "undefined") {
    return "(missing)";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export function diffJsonValues(left: unknown, right: unknown, path = "$"): JsonDifference[] {
  if (Array.isArray(left) && Array.isArray(right)) {
    const maxLength = Math.max(left.length, right.length);
    const differences: JsonDifference[] = [];

    for (let index = 0; index < maxLength; index += 1) {
      differences.push(...diffJsonValues(left[index], right[index], `${path}[${index}]`));
    }

    return differences;
  }

  if (isObject(left) && isObject(right)) {
    const keys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).sort();
    const differences: JsonDifference[] = [];

    for (const key of keys) {
      differences.push(...diffJsonValues(left[key], right[key], `${path}.${key}`));
    }

    return differences;
  }

  if (!Object.is(left, right)) {
    return [{ path, left: formatValue(left), right: formatValue(right) }];
  }

  return [];
}
