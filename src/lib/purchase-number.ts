const PURCHASE_NUMBER_PATTERN = /^TJ-PUR-(\d{8})-(\d{4,})$/;

export function getPurchaseNumberPrefix(purchaseDate: string) {
  return `TJ-PUR-${purchaseDate.replaceAll("-", "")}-`;
}

export function getNextPurchaseNumber(
  existingNumbers: string[],
  purchaseDate: string,
) {
  const datePart = purchaseDate.replaceAll("-", "");
  const highestSequence = existingNumbers.reduce((highest, number) => {
    const match = PURCHASE_NUMBER_PATTERN.exec(number);

    if (!match || match[1] !== datePart) {
      return highest;
    }

    return Math.max(highest, Number(match[2]));
  }, 0);

  return `${getPurchaseNumberPrefix(purchaseDate)}${String(highestSequence + 1).padStart(4, "0")}`;
}
