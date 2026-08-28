import {
  addDecimalValues,
  calculateCartSubtotal,
  calculateLineSubtotal,
  formatIdDecimal,
  formatIdrDecimal,
} from "../src/lib/sale-calculation";

const subtotalCases = [
  ["satuan utuh", "1", "28000", "28000"],
  ["kilogram pecahan", "1.5", "28000", "42000"],
  ["tiga desimal", "1.234", "28000", "34552"],
  ["harga dua desimal", "2.5", "30000.50", "75001.25"],
  ["hasil lebih kecil dari satu sen", "0.001", "0.01", "0.00001"],
] as const;

for (const [name, quantity, unitPrice, expected] of subtotalCases) {
  const actual = calculateLineSubtotal(quantity, unitPrice);
  if (actual !== expected) {
    throw new Error(`Subtotal ${name} gagal: mengharapkan ${expected}, menerima ${actual}.`);
  }
}

const invalidCases = [
  ["jumlah negatif", "-1", "1000"],
  ["notasi eksponen", "1e3", "1000"],
] as const;

for (const [name, quantity, unitPrice] of invalidCases) {
  let rejected = false;
  try {
    calculateLineSubtotal(quantity, unitPrice);
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error(`Input subtotal ${name} seharusnya ditolak.`);
}

if (
  formatIdDecimal("123456789.125") !== "123.456.789,125" ||
  formatIdrDecimal("75001.25000") !== "Rp75.001,25"
) {
  throw new Error("Formatter desimal Indonesia mengubah presisi nilai.");
}

if (
  addDecimalValues(["1.25", "2.5"]) !== "3.75" ||
  addDecimalValues(["1.5", "0.75"]) !== "2.25"
) {
  throw new Error("Penjumlahan jumlah item keranjang gagal.");
}

const cart = [
  { quantity: "2", unitPrice: "1000" },
  { quantity: "1.5", unitPrice: "28000" },
];
if (
  calculateCartSubtotal(cart) !== "44000" ||
  calculateCartSubtotal([{ ...cart[0], quantity: "3" }, cart[1]]) !== "45000" ||
  calculateCartSubtotal(cart.filter((_, index) => index !== 0)) !== "42000" ||
  calculateCartSubtotal([]) !== "0"
) {
  throw new Error("Subtotal tambah, ubah, void, atau keranjang kosong gagal.");
}

const totalCases = subtotalCases.length + invalidCases.length + 8;
console.log(
  `Perhitungan POS: ${totalCases}/${totalCases} kasus subtotal lulus tanpa pembulatan berbasis Number.`,
);
