function getHighestSequence(existingNumbers: string[], prefix: string) {
  return existingNumbers.reduce((highest, number) => {
    if (!number.startsWith(prefix)) return highest;
    const sequence = Number(number.slice(prefix.length));
    return Number.isInteger(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);
}

type DatedNumberKind =
  | "BAT"
  | "STK"
  | "PAY"
  | "SAL"
  | "SES"
  | "SRT"
  | "PRT"
  | "DMG"
  | "EXP"
  | "INC";

export function getDatedNumberPrefix(kind: DatedNumberKind, dateKey: string) {
  return `TJ-${kind}-${dateKey}-`;
}

export function getNextDatedSequence(
  existingNumbers: string[],
  kind: DatedNumberKind,
  dateKey: string,
) {
  const prefix = getDatedNumberPrefix(kind, dateKey);
  return getHighestSequence(existingNumbers, prefix) + 1;
}

export function formatDatedNumber(
  kind: DatedNumberKind,
  dateKey: string,
  sequence: number,
) {
  return `${getDatedNumberPrefix(kind, dateKey)}${String(sequence).padStart(4, "0")}`;
}
