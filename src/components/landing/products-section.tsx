"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

type ProductItem = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  badge: string;
  price: string;
  unit: string;
  whatsappUrl?: string;
};

type ProductsSectionProps = {
  products?: ProductItem[];
};

export default function ProductsSection({ products = [] }: ProductsSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("active");
        });
      },
      { threshold: 0.1 }
    );

    const cards = sectionRef.current?.querySelectorAll(".product-card");
    cards?.forEach((card, index) => {
      (card as HTMLElement).style.transitionDelay = `${index * 0.15}s`;
      observer.observe(card);
    });

    const reveals = sectionRef.current?.querySelectorAll(".reveal");
    reveals?.forEach((el) => revealObserver.observe(el));

    return () => {
      observer.disconnect();
      revealObserver.disconnect();
    };
  }, [products]);

  return (
    <section
      id="products"
      ref={sectionRef}
      style={{ padding: "100px 5%", background: "linear-gradient(180deg, #FFF5E6 0%, white 100%)" }}
    >
      {/* Section header */}
      <div className="text-center reveal" style={{ marginBottom: "60px" }}>
        <h2
          className="relative inline-block"
          style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "15px" }}
        >
          Produk Kami
          <span className="section-underline" />
        </h2>
        <p style={{ color: "#888", fontSize: "1.1rem", marginTop: "20px" }}>
          Pilihan telur segar berkualitas tinggi langsung dari peternakan
        </p>
      </div>

      {/* Products grid */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        style={{ maxWidth: "1200px", margin: "0 auto" }}
      >
        {products.map((product) => (
          <div key={product.id} className="product-card">
            {/* Product image area */}
            <div
              style={{
                height:         "210px",
                background:     "linear-gradient(135deg, #FFF5E6, #FFE4C4)",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                position:       "relative",
                overflow:       "hidden",
              }}
            >
              {product.imageUrl ? (
                <div className="relative size-full">
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 380px"
                    className="object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              ) : (
                <i
                  className="fas fa-egg"
                  style={{ fontSize: "4.5rem", color: "#FF6B35", transition: "all 0.4s ease" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "scale(1.2) rotate(10deg)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "";
                  }}
                ></i>
              )}
              <span
                style={{
                  position:     "absolute",
                  top:          "15px",
                  right:        "15px",
                  background:   "#FF6B35",
                  color:        "white",
                  padding:      "5px 15px",
                  borderRadius: "20px",
                  fontSize:     "0.8rem",
                  fontWeight:   600,
                  boxShadow:    "0 4px 10px rgba(0,0,0,0.1)",
                  zIndex:       2,
                }}
              >
                {product.badge}
              </span>
            </div>

            {/* Product info */}
            <div style={{ padding: "25px" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "8px", color: "#2C1810" }}>
                {product.name}
              </h3>
              <p style={{ color: "#777", fontSize: "0.9rem", marginBottom: "15px", minHeight: "2.7rem", lineHeight: 1.5 }}>
                {product.description}
              </p>
              <div className="flex items-baseline justify-between pt-2 border-t border-gray-100">
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#FF6B35" }}>
                  {product.price}
                  <span style={{ fontSize: "0.85rem", color: "#888", fontWeight: 500, marginLeft: "4px" }}>
                    {product.unit}
                  </span>
                </div>
                <a
                  href={product.whatsappUrl || "https://wa.me/6282261128316"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-landing-primary hover:text-landing-secondary underline"
                >
                  Pesan &rarr;
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
