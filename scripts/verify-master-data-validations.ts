import { customerFormSchema } from "../src/server/validations/customer";
import { paymentMethodFormSchema } from "../src/server/validations/payment-method";
import { productFormSchema, productImageFileSchema } from "../src/server/validations/product";
import { productCategoryFormSchema } from "../src/server/validations/product-category";
import { productPriceFormSchema } from "../src/server/validations/product-price";
import { productUnitFormSchema } from "../src/server/validations/product-unit";
import { supplierFormSchema } from "../src/server/validations/supplier";

type ValidationCase = {
  name: string;
  expected: "accept" | "reject";
  result: { success: boolean };
};

const productId = "11111111-1111-4111-8111-111111111111";

const cases: ValidationCase[] = [
  {
    name: "Produk valid",
    expected: "accept",
    result: productFormSchema.safeParse({
      productCode: "TLR-001",
      barcode: "",
      categoryId: "",
      name: "Telur Ayam",
      description: "",
      baseUnitName: "BUTIR",
      minimumStock: "0.000",
      isFeatured: false,
      isActive: true,
      removeImage: false,
    }),
  },
  {
    name: "Produk tanpa stok minimum ditolak",
    expected: "reject",
    result: productFormSchema.safeParse({
      productCode: "TLR-001",
      barcode: "",
      categoryId: "",
      name: "Telur Ayam",
      description: "",
      baseUnitName: "BUTIR",
      minimumStock: "",
      isFeatured: false,
      isActive: true,
      removeImage: false,
    }),
  },
  {
    name: "Produk dengan stok minimum negatif ditolak",
    expected: "reject",
    result: productFormSchema.safeParse({
      productCode: "TLR-001",
      barcode: "",
      categoryId: "",
      name: "Telur Ayam",
      description: "",
      baseUnitName: "BUTIR",
      minimumStock: "-1",
      isFeatured: false,
      isActive: true,
      removeImage: false,
    }),
  },
  {
    name: "Gambar dengan MIME tidak didukung ditolak",
    expected: "reject",
    result: productImageFileSchema.safeParse(
      new File([new Uint8Array([1, 2, 3])], "produk.gif", { type: "image/gif" }),
    ),
  },
  {
    name: "Kategori valid",
    expected: "accept",
    result: productCategoryFormSchema.safeParse({
      categoryCode: "TELUR-AYAM",
      name: "Telur Ayam",
      description: "",
      isActive: true,
    }),
  },
  {
    name: "Kode kategori berspasi ditolak",
    expected: "reject",
    result: productCategoryFormSchema.safeParse({
      categoryCode: "TELUR AYAM",
      name: "Telur Ayam",
      description: "",
      isActive: true,
    }),
  },
  {
    name: "Satuan dengan konversi empat desimal valid",
    expected: "accept",
    result: productUnitFormSchema.safeParse({
      productId,
      unitName: "KG",
      conversionToBase: "1.0000",
      sellingPrice: "28000",
      wholesalePrice: "",
      barcode: "",
      isBaseUnit: true,
      isActive: true,
    }),
  },
  {
    name: "Satuan dengan konversi nol ditolak",
    expected: "reject",
    result: productUnitFormSchema.safeParse({
      productId,
      unitName: "TRAY",
      conversionToBase: "0",
      sellingPrice: "70000",
      wholesalePrice: "",
      barcode: "",
      isBaseUnit: false,
      isActive: true,
    }),
  },
  {
    name: "Harga jual valid",
    expected: "accept",
    result: productPriceFormSchema.safeParse({ sellingPrice: "28000", wholesalePrice: "27000" }),
  },
  {
    name: "Harga jual nol ditolak",
    expected: "reject",
    result: productPriceFormSchema.safeParse({ sellingPrice: "0", wholesalePrice: "" }),
  },
  {
    name: "Supplier dengan kontak valid",
    expected: "accept",
    result: supplierFormSchema.safeParse({
      name: "Supplier Telur",
      contactPerson: "Budi",
      phone: "+6281234567890",
      email: "supplier@example.com",
      address: "",
      notes: "",
      isActive: true,
    }),
  },
  {
    name: "Supplier dengan email tidak valid ditolak",
    expected: "reject",
    result: supplierFormSchema.safeParse({
      name: "Supplier Telur",
      contactPerson: "",
      phone: "",
      email: "bukan-email",
      address: "",
      notes: "",
      isActive: true,
    }),
  },
  {
    name: "Pelanggan valid",
    expected: "accept",
    result: customerFormSchema.safeParse({
      name: "Pelanggan Grosir",
      phone: "081234567890",
      address: "",
      customerType: "WHOLESALE",
      isActive: true,
    }),
  },
  {
    name: "Pelanggan dengan tipe tidak dikenal ditolak",
    expected: "reject",
    result: customerFormSchema.safeParse({
      name: "Pelanggan Kredit",
      phone: "",
      address: "",
      customerType: "CREDIT",
      isActive: true,
    }),
  },
  {
    name: "Metode pembayaran valid",
    expected: "accept",
    result: paymentMethodFormSchema.safeParse({
      code: "EDC-BCA",
      name: "Debit BCA",
      type: "DEBIT_CARD",
      isActive: true,
    }),
  },
  {
    name: "Metode pembayaran dengan tipe tidak dikenal ditolak",
    expected: "reject",
    result: paymentMethodFormSchema.safeParse({
      code: "CREDIT",
      name: "Kredit",
      type: "CREDIT",
      isActive: true,
    }),
  },
];

const failures = cases.filter(({ expected, result }) =>
  expected === "accept" ? !result.success : result.success,
);

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`GAGAL: ${failure.name}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Matriks validasi master data: ${cases.length}/${cases.length} kasus lulus.`);
}
