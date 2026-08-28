"use client";

type LandingFooterProps = {
  store?: {
    name: string;
    logoUrl: string | null;
    address: string;
    phone: string;
    email?: string;
    whatsappUrl: string;
  };
  products?: Array<{
    id: string;
    name: string;
  }>;
};

const menuLinks = [
  { href: "#home",     label: "Beranda" },
  { href: "#about",    label: "Tentang Kami" },
  { href: "#products", label: "Produk" },
  { href: "#features", label: "Keunggulan" },
  { href: "/login",    label: "Dashboard Admin / Kasir" },
];

export default function LandingFooter({ store, products = [] }: LandingFooterProps) {
  const storeName = store?.name || "Telur Jagoan";
  const storeAddress = store?.address && store.address !== "Jakarta, Indonesia" 
    ? store.address 
    : "Perum GRAND ROSE REGENCY Blok.B No.2 Kemiri Sidoarjo, RT.24 RW.12";
  const storePhone = store?.phone && store.phone !== "0812-3456-7890" && store.phone !== "081234567890"
    ? store.phone 
    : "0822-6112-8316";
  const storeEmail = store?.email || "telurjagoan@gmail.com";

  const productList = products.length > 0
    ? products.slice(0, 6)
    : [
        { id: "default-1", name: "Telur Ayam Negri" },
        { id: "default-2", name: "Telur Ayam Kampung" },
        { id: "default-3", name: "Telur Puyuh" },
        { id: "default-4", name: "Telur Omega-3" },
        { id: "default-5", name: "Telur Bebek" },
        { id: "default-6", name: "Telur Asin" },
      ];

  return (
    <footer style={{ background: "#2C1810", color: "white", padding: "60px 5% 30px" }}>
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 max-w-7xl mx-auto mb-10"
      >
        {/* Brand */}
        <div>
          <h3 style={{ fontSize: "1.5rem", marginBottom: "15px", display: "flex", alignItems: "center", gap: "10px" }}>
            <i className="fas fa-egg" style={{ color: "#FF6B35" }}></i>
            Telur Jagoan
          </h3>
          <p style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.7, marginBottom: "20px", fontSize: "0.9rem" }}>
            Menyediakan telur ayam segar berkualitas tinggi langsung dari peternakan. Segar, higienis, dan terpercaya untuk seluruh keluarga Indonesia.
          </p>
          <div style={{ display: "flex", gap: "12px", marginTop: "15px" }}>
            <a
              href="#"
              style={{
                width:          "36px",
                height:         "36px",
                borderRadius:   "50%",
                background:     "rgba(255,255,255,0.08)",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                color:          "white",
                transition:     "all 0.3s ease",
                textDecoration: "none"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#FF6B35";
                e.currentTarget.style.transform = "translateY(-3px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.transform = "";
              }}
            >
              <i className="fab fa-facebook-f"></i>
            </a>
            <a
              href="https://www.instagram.com/telurjagoan"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width:          "36px",
                height:         "36px",
                borderRadius:   "50%",
                background:     "rgba(255,255,255,0.08)",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                color:          "white",
                transition:     "all 0.3s ease",
                textDecoration: "none"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#FF6B35";
                e.currentTarget.style.transform = "translateY(-3px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.transform = "";
              }}
            >
              <i className="fab fa-instagram"></i>
            </a>
            <a
              href="https://www.tiktok.com/@telurjagoan"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width:          "36px",
                height:         "36px",
                borderRadius:   "50%",
                background:     "rgba(255,255,255,0.08)",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                color:          "white",
                transition:     "all 0.3s ease",
                textDecoration: "none"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#FF6B35";
                e.currentTarget.style.transform = "translateY(-3px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.transform = "";
              }}
            >
              <i className="fab fa-tiktok"></i>
            </a>
          </div>
        </div>

        {/* Menu */}
        <div>
          <h4 style={{ fontSize: "1.1rem", marginBottom: "20px", color: "#FFD23F" }}>Navigasi</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {menuLinks.map((link, i) => (
              <li key={i} style={{ marginBottom: "10px" }}>
                <a
                  href={link.href}
                  style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", transition: "all 0.3s ease", display: "inline-block", fontSize: "0.9rem" }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.color     = "#FF6B35";
                    el.style.transform = "translateX(5px)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.color     = "rgba(255,255,255,0.7)";
                    el.style.transform = "";
                  }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Products */}
        <div>
          <h4 style={{ fontSize: "1.1rem", marginBottom: "20px", color: "#FFD23F" }}>Produk Kami</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {productList.map((prod) => (
              <li key={prod.id} style={{ marginBottom: "10px" }}>
                <a
                  href="#products"
                  style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", transition: "all 0.3s ease", display: "inline-block", fontSize: "0.9rem" }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.color     = "#FF6B35";
                    el.style.transform = "translateX(5px)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.color     = "rgba(255,255,255,0.7)";
                    el.style.transform = "";
                  }}
                >
                  {prod.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 style={{ fontSize: "1.1rem", marginBottom: "20px", color: "#FFD23F" }}>Kontak & Alamat</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.9rem" }}>
            <li style={{ marginBottom: "12px" }}>
              <a
                href={store?.whatsappUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}
              >
                <i className="fas fa-phone" style={{ color: "#FF6B35", width: "16px" }}></i>
                <span>{storePhone}</span>
              </a>
            </li>
            <li style={{ marginBottom: "12px" }}>
              <a
                href={`mailto:${storeEmail}`}
                style={{ color: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}
              >
                <i className="fas fa-envelope" style={{ color: "#FF6B35", width: "16px" }}></i>
                <span>{storeEmail}</span>
              </a>
            </li>
            <li style={{ marginBottom: "12px" }}>
              <span style={{ color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <i className="fas fa-map-marker-alt" style={{ color: "#FF6B35", width: "16px", marginTop: "4px" }}></i>
                <span>{storeAddress}</span>
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          borderTop:  "1px solid rgba(255,255,255,0.1)",
          paddingTop: "20px",
          textAlign:  "center",
          color:      "rgba(255,255,255,0.5)",
          fontSize:   "0.85rem",
        }}
      >
        <p>
          &copy; {new Date().getFullYear()} {storeName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
