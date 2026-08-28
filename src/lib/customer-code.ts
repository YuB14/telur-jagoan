export const DEFAULT_CUSTOMER_CODE = "CUS-0000";
export const DEFAULT_CUSTOMER_NAME = "Pelanggan Umum";

export function getNextCustomerCode(existingCodes: string[]) {
  const highestNumber = existingCodes.reduce((highest, code) => {
    const match = /^CUS-(\d+)$/.exec(code);
    const value = match ? Number(match[1]) : 0;
    return Number.isSafeInteger(value) ? Math.max(highest, value) : highest;
  }, 0);

  return `CUS-${String(Math.max(highestNumber + 1, 1)).padStart(4, "0")}`;
}
