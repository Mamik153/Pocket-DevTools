export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

const isScalar = (value: JsonValue): value is JsonPrimitive =>
  typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null;

const escapeString = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");

const formatKey = (value: string) =>
  /^[A-Za-z_][A-Za-z0-9_-]*$/.test(value) ? value : `"${escapeString(value)}"`;

const formatScalar = (value: JsonPrimitive) => {
  if (typeof value === "string") return `"${escapeString(value)}"`;
  if (value === null) return "null";
  return String(value);
};

const renderObject = (value: { [key: string]: JsonValue }, indent: number): string => {
  const pad = "  ".repeat(indent);
  const entries = Object.entries(value);

  if (!entries.length) return `${pad}{}`;

  return entries
    .map(([key, item]) => {
      const label = `${pad}${formatKey(key)}:`;

      if (isScalar(item)) return `${label} ${formatScalar(item)}`;
      if (Array.isArray(item) && item.length === 0) return `${label} []`;
      if (!Array.isArray(item) && Object.keys(item).length === 0) return `${label} {}`;

      return `${label}\n${renderToToon(item, indent + 1)}`;
    })
    .join("\n");
};

const renderArray = (value: JsonValue[], indent: number): string => {
  const pad = "  ".repeat(indent);

  if (!value.length) return `${pad}[]`;

  return value
    .map((item) => {
      if (isScalar(item)) return `${pad}- ${formatScalar(item)}`;
      if (Array.isArray(item) && item.length === 0) return `${pad}- []`;
      if (!Array.isArray(item) && Object.keys(item).length === 0) return `${pad}- {}`;

      return `${pad}-\n${renderToToon(item, indent + 1)}`;
    })
    .join("\n");
};

export const renderToToon = (value: JsonValue, indent = 0): string => {
  if (isScalar(value)) return formatScalar(value);
  if (Array.isArray(value)) return renderArray(value, indent);
  return renderObject(value, indent);
};

export const convertJsonValueToToon = (value: unknown): string => {
  return renderToToon(value as JsonValue);
};

export const convertJsonToToon = (input: string): string => {
  const parsed = JSON.parse(input) as JsonValue;
  return renderToToon(parsed);
};
