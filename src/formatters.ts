function elementToValue(element: Element): unknown {
  const children = Array.from(element.children);
  const attributes = Object.fromEntries(
    Array.from(element.attributes).map((attribute) => [`@${attribute.name}`, attribute.value]),
  );

  if (!children.length) {
    const value = element.textContent?.trim() ?? "";
    return Object.keys(attributes).length ? { ...attributes, "#text": value } : value;
  }

  const result: Record<string, unknown> = { ...attributes };
  for (const child of children) {
    const value = elementToValue(child);
    if (child.tagName in result) {
      const current = result[child.tagName];
      result[child.tagName] = Array.isArray(current) ? [...current, value] : [current, value];
    } else {
      result[child.tagName] = value;
    }
  }
  return result;
}

export function xmlToJson(xml: string): string {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const error = document.querySelector("parsererror");
  if (error || !document.documentElement) {
    throw new Error("El XML recibido no es válido.");
  }
  return JSON.stringify({ [document.documentElement.tagName]: elementToValue(document.documentElement) }, null, 2);
}

export function formatBody(body: string, contentType = ""): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  if (contentType.includes("json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  if (contentType.includes("xml") || trimmed.startsWith("<")) {
    try {
      return new XMLSerializer().serializeToString(new DOMParser().parseFromString(body, "application/xml"));
    } catch {
      return body;
    }
  }
  return body;
}

export function validateJson(value: string): string | null {
  if (!value.trim()) return null;
  try {
    JSON.parse(value);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "JSON inválido";
  }
}
