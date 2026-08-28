type ParsedDecimal = { coefficient: bigint; scale: number };

function parseUnsignedDecimal(value: string): ParsedDecimal {
  const normalized = value.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(normalized)) {
    throw new Error("Nilai desimal tidak valid.");
  }

  const [whole, fraction = ""] = normalized.split(".");
  return {
    coefficient: BigInt(`${whole}${fraction}`),
    scale: fraction.length,
  };
}

function formatDecimal(coefficient: bigint, scale: number) {
  if (scale === 0) return coefficient.toString();

  const padded = coefficient.toString().padStart(scale + 1, "0");
  const whole = padded.slice(0, -scale);
  const fraction = padded.slice(-scale).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function alignScale(value: ParsedDecimal, targetScale: number) {
  return value.coefficient * BigInt(10) ** BigInt(targetScale - value.scale);
}

export function calculateLineSubtotal(quantity: string, unitPrice: string) {
  const parsedQuantity = parseUnsignedDecimal(quantity);
  const parsedUnitPrice = parseUnsignedDecimal(unitPrice);
  return formatDecimal(
    parsedQuantity.coefficient * parsedUnitPrice.coefficient,
    parsedQuantity.scale + parsedUnitPrice.scale,
  );
}

export function addDecimalValues(values: string[]) {
  if (values.length === 0) return "0";
  const parsedValues = values.map(parseUnsignedDecimal);
  const scale = Math.max(...parsedValues.map((value) => value.scale));
  const total = parsedValues.reduce(
    (sum, value) => sum + alignScale(value, scale),
    BigInt(0),
  );
  return formatDecimal(total, scale);
}

export function calculateCartSubtotal(
  items: Array<{ quantity: string; unitPrice: string }>,
) {
  return addDecimalValues(
    items.map((item) => calculateLineSubtotal(item.quantity, item.unitPrice)),
  );
}

export function formatIdDecimal(value: string) {
  const parsed = parseUnsignedDecimal(value);
  const normalized = formatDecimal(parsed.coefficient, parsed.scale);
  const [whole, fraction] = normalized.split(".");
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return fraction ? `${groupedWhole},${fraction}` : groupedWhole;
}

export function formatIdrDecimal(value: string) {
  return `Rp${formatIdDecimal(value)}`;
}
