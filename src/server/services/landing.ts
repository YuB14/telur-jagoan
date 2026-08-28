import "server-only";

import { db } from "@/lib/db";

export type LandingPageData = {
  stats: {
    eggsSold: number;
    satisfiedCustomers: number;
    partnerFarms: number;
    totalSalesCount: number;
  };
  products: Array<{
    id: string;
    name: string;
    description: string;
    imageUrl: string | null;
    badge: string;
    price: string;
    unit: string;
    whatsappUrl: string;
  }>;
  store: {
    name: string;
    logoUrl: string | null;
    address: string;
    phone: string;
    email: string;
    whatsappUrl: string;
  };
};

export async function getLandingPageData(): Promise<LandingPageData> {
  const [
    saleItemAgg,
    totalSalesCount,
    supplierCount,
    allActiveProducts,
    salesAgg,
    storeSetting,
  ] = await Promise.all([
    // 2. Jumlah angka telur terjual dihitung dari total semua penjualan
    db.saleItem.aggregate({
      where: {
        sale: {
          status: { not: "CANCELLED" },
        },
      },
      _sum: {
        quantity: true,
      },
    }),
    // 3. Jumlah angka pelanggan puas dihitung dari total 80% semua penjualan
    db.sale.count({
      where: {
        status: { not: "CANCELLED" },
      },
    }),
    // Mitra Peternak (Banyaknya Supplier)
    db.supplier.count(),
    // Produk Aktif
    db.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        productCode: true,
        name: true,
        description: true,
        imageUrl: true,
        baseUnitName: true,
        isFeatured: true,
        createdAt: true,
        category: {
          select: { name: true },
        },
        units: {
          where: { isBaseUnit: true },
          select: { sellingPrice: true, unitName: true },
          take: 1,
        },
      },
    }),
    // Total penjualan per produk untuk menentukan Best Seller
    db.saleItem.groupBy({
      by: ["productId"],
      where: {
        sale: {
          status: { not: "CANCELLED" },
        },
      },
      _sum: {
        quantity: true,
      },
    }),
    // Informasi toko
    db.storeSetting.findFirst({
      orderBy: { createdAt: "asc" },
      select: {
        storeName: true,
        logoUrl: true,
        address: true,
        phone: true,
        email: true,
        tagline: true,
        receiptFooter: true,
      },
    }),
  ]);

  const totalQuantitySold = Number(saleItemAgg._sum.quantity ?? 0);
  const eggsSold = Math.round(totalQuantitySold);
  const satisfiedCustomers = Math.round(totalSalesCount * 0.8);

  const currencyFormatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

  // Map sales quantity
  const salesMap = new Map<string, number>();
  salesAgg.forEach((item) => {
    salesMap.set(item.productId, Number(item._sum.quantity ?? 0));
  });

  // Map products with price and sales count
  const productsWithMeta = allActiveProducts.map((product) => {
    const unit = product.units[0];
    const price = unit ? Number(unit.sellingPrice) : 0;
    const qtySold = salesMap.get(product.id) ?? 0;
    return {
      product,
      price,
      qtySold,
    };
  });

  const featuredList: Array<{
    product: typeof allActiveProducts[0];
    price: number;
    badge: string;
  }> = [];

  if (productsWithMeta.length > 0) {
    const selectedIds = new Set<string>();

    // 1. Best Seller (paling banyak dibeli)
    const sortedBySales = [...productsWithMeta].sort((a, b) => b.qtySold - a.qtySold || b.price - a.price);
    const bestSellerItem = sortedBySales[0];
    if (bestSellerItem) {
      selectedIds.add(bestSellerItem.product.id);
      featuredList.push({ product: bestSellerItem.product, price: bestSellerItem.price, badge: "Best Seller" });
    }

    // 2. Premium (paling mahal harganya) dari produk yang tersisa
    const remainingForPremium = productsWithMeta.filter(p => !selectedIds.has(p.product.id));
    if (remainingForPremium.length > 0) {
      const sortedByPriceDesc = [...remainingForPremium].sort((a, b) => b.price - a.price);
      const premiumItem = sortedByPriceDesc[0];
      if (premiumItem) {
        selectedIds.add(premiumItem.product.id);
        featuredList.push({ product: premiumItem.product, price: premiumItem.price, badge: "Premium" });
      }
    }

    // 3. Cheaper (paling murah harganya) dari produk yang tersisa
    const remainingForCheaper = productsWithMeta.filter(p => !selectedIds.has(p.product.id));
    if (remainingForCheaper.length > 0) {
      const sortedByPriceAsc = [...remainingForCheaper].sort((a, b) => a.price - b.price);
      const cheaperItem = sortedByPriceAsc[0];
      if (cheaperItem) {
        selectedIds.add(cheaperItem.product.id);
        featuredList.push({ product: cheaperItem.product, price: cheaperItem.price, badge: "Cheaper" });
      }
    }

    // Ambil produk sisa untuk melengkapi jumlah 6 produk, diurutkan berdasarkan tanggal buat terbaru
    const remainingSlots = 6 - featuredList.length;
    if (remainingSlots > 0) {
      const others = productsWithMeta
        .filter(p => !selectedIds.has(p.product.id))
        .sort((a, b) => b.product.createdAt.getTime() - a.product.createdAt.getTime())
        .slice(0, remainingSlots);

      others.forEach((item) => {
        featuredList.push({
          product: item.product,
          price: item.price,
          badge: item.product.category?.name || "Segar",
        });
      });
    }
  }

  const storeName = storeSetting?.storeName || "Telur Jagoan";
  const whatsappPhone = "082261128316";
  const cleanPhone = whatsappPhone.replace(/[^0-9]/g, "").replace(/^0/, "62");
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(storeName)},%20saya%20ingin%20memesan%20telur%20segar.`;

  const formattedProducts = featuredList.length > 0
    ? featuredList.map(({ product, price, badge }) => {
        const unit = product.units[0];
        return {
          id: product.id,
          name: product.name,
          description: product.description || "Telur segar berkualitas langsung dari peternakan.",
          imageUrl: product.imageUrl,
          badge,
          price: currencyFormatter.format(price),
          unit: unit ? `/ ${unit.unitName}` : `/ ${product.baseUnitName}`,
          whatsappUrl: `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(storeName)},%20saya%20ingin%20memesan%20${encodeURIComponent(product.name)}.%20Apakah%20stoknya%20tersedia?`,
        };
      })
    : [
        {
          id: "default-1",
          name: "Telur Ayam Negri",
          description: "Telur ayam negri segar berkualitas, ukuran standar dan bersih.",
          imageUrl: null,
          badge: "Best Seller",
          price: "Rp 28.000",
          unit: "/ kg",
          whatsappUrl: `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(storeName)},%20saya%20ingin%20memesan%20Telur%20Ayam%20Negri.%20Apakah%20stoknya%20tersedia?`,
        },
        {
          id: "default-2",
          name: "Telur Ayam Kampung",
          description: "Telur ayam kampung organik, bernutrisi tinggi untuk keluarga.",
          imageUrl: null,
          badge: "Premium",
          price: "Rp 45.000",
          unit: "/ kg",
          whatsappUrl: `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(storeName)},%20saya%20ingin%20memesan%20Telur%20Ayam%20Kampung.%20Apakah%20stoknya%20tersedia?`,
        },
        {
          id: "default-3",
          name: "Telur Puyuh",
          description: "Telur puyuh segar berukuran kecil, cocok untuk cemilan dan masakan.",
          imageUrl: null,
          badge: "Cheaper",
          price: "Rp 20.000",
          unit: "/ kg",
          whatsappUrl: `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(storeName)},%20saya%20ingin%20memesan%20Telur%20Puyuh.%20Apakah%20stoknya%20tersedia?`,
        },
        {
          id: "default-4",
          name: "Telur Omega-3",
          description: "Telur kaya Omega-3 dan nutrisi penting untuk kesehatan jantung.",
          imageUrl: null,
          badge: "Sehat",
          price: "Rp 38.000",
          unit: "/ kg",
          whatsappUrl: `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(storeName)},%20saya%20ingin%20memesan%20Telur%20Omega-3.%20Apakah%20stoknya%20tersedia?`,
        },
        {
          id: "default-5",
          name: "Telur Bebek",
          description: "Telur bebek segar berukuran besar, kuning telur lebih merah dan gurih.",
          imageUrl: null,
          badge: "Segar",
          price: "Rp 35.000",
          unit: "/ kg",
          whatsappUrl: `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(storeName)},%20saya%20ingin%20memesan%20Telur%20Bebek.%20Apakah%20stoknya%20tersedia?`,
        },
        {
          id: "default-6",
          name: "Telur Asin",
          description: "Telur asin berkualitas rasa gurih dan masir, matang siap saji.",
          imageUrl: null,
          badge: "Gurih",
          price: "Rp 32.000",
          unit: "/ mika",
          whatsappUrl: `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(storeName)},%20saya%20ingin%20memesan%20Telur%20Asin.%20Apakah%20stoknya%20tersedia?`,
        },
      ];

  const rawPhone = storeSetting?.phone || "082261128316";

  return {
    stats: {
      eggsSold,
      satisfiedCustomers,
      partnerFarms: supplierCount,
      totalSalesCount,
    },
    products: formattedProducts,
    store: {
      name: storeName,
      logoUrl: storeSetting?.logoUrl || null,
      address: storeSetting?.address || "Perum GRAND ROSE REGENCY Blok.B No.2 Kemiri Sidoarjo, RT.24 RW.12",
      phone: rawPhone,
      email: storeSetting?.email || "telurjagoan@gmail.com",
      whatsappUrl,
    },
  };
}
