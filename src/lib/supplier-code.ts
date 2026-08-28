export function getNextSupplierCode(existingCodes: string[]) {
  const highestNumber = existingCodes.reduce((highest, code) => {
    const match = /^SUP-(\d+)$/.exec(code);
    const value = match ? Number(match[1]) : 0;
    return Number.isSafeInteger(value) ? Math.max(highest, value) : highest;
  }, 0);

  return `SUP-${String(highestNumber + 1).padStart(4, "0")}`;
}
