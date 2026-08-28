"use client";

import { useState, useEffect } from "react";

const navLinks = [
  { href: "#home",     label: "Beranda" },
  { href: "#about",    label: "Tentang" },
  { href: "#products", label: "Produk" },
  { href: "#features", label: "Keunggulan" },
];

type LandingNavbarProps = {
  store?: {
    whatsappUrl: string;
  };
};

export default function LandingNavbar({ store }: LandingNavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const whatsappUrl = store?.whatsappUrl || "https://wa.me/6282261128316?text=Halo%20Telur%20Jagoan,%20saya%20ingin%20memesan%20telur%20segar.";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-[1000] transition-all duration-300 flex justify-between items-center ${
        scrolled ? "navbar-scrolled" : "bg-transparent"
      }`}
      style={{ padding: scrolled ? "15px 5%" : "20px 5%" }}
    >
      {/* Logo */}
      <a
        href="#home"
        className="flex items-center gap-2.5 font-extrabold no-underline animate-egg-slide-left"
        style={{ fontSize: "1.5rem", color: "#FF6B35" }}
      >
        <i className="fas fa-egg animate-egg-bounce" style={{ fontSize: "2rem" }}></i>
        Telur Jagoan
      </a>

      {/* Desktop nav */}
      <ul className="hidden md:flex items-center gap-8 list-none m-0 p-0">
        {navLinks.map((link, index) => (
          <li key={link.href}>
            <a
              href={link.href}
              className={`font-semibold no-underline relative hero-nav-link-${index + 1}`}
              style={{
                color: "#2C1810",
                transition: "color 0.3s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#FF6B35";
                const line = e.currentTarget.querySelector(".nav-underline") as HTMLElement;
                if (line) line.style.width = "100%";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#2C1810";
                const line = e.currentTarget.querySelector(".nav-underline") as HTMLElement;
                if (line) line.style.width = "0";
              }}
            >
              {link.label}
              <span
                className="nav-underline"
                style={{
                  position:      "absolute",
                  bottom:        "-5px",
                  left:          0,
                  width:         0,
                  height:        "3px",
                  background:    "#FF6B35",
                  transition:    "width 0.3s ease",
                  borderRadius:  "2px",
                  display:       "block",
                }}
              />
            </a>
          </li>
        ))}
        <li>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hero-nav-link-5 font-semibold no-underline rounded-full transition-all duration-300"
            style={{
              background:    "#FF6B35",
              color:         "white",
              padding:       "10px 25px",
              borderRadius:  "30px",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background    = "#F7931E";
              (e.currentTarget as HTMLElement).style.transform     = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.boxShadow     = "0 5px 15px rgba(255, 107, 53, 0.3)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background    = "#FF6B35";
              (e.currentTarget as HTMLElement).style.transform     = "";
              (e.currentTarget as HTMLElement).style.boxShadow     = "";
            }}
          >
            Pesan Sekarang
          </a>
        </li>
      </ul>

      {/* Mobile menu button */}
      <button
        className="md:hidden bg-transparent border-none cursor-pointer"
        style={{ fontSize: "1.5rem", color: "#2C1810" }}
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle Menu"
      >
        <i className={`fas ${mobileMenuOpen ? "fa-times" : "fa-bars"}`}></i>
      </button>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden absolute top-full left-0 w-full shadow-lg p-4"
          style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(10px)" }}
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block py-3 px-4 font-semibold no-underline transition-colors duration-300"
              style={{ color: "#2C1810" }}
              onClick={() => setMobileMenuOpen(false)}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#FF6B35")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#2C1810")}
            >
              {link.label}
            </a>
          ))}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block py-3 px-4 text-white text-center font-semibold no-underline mt-2"
            style={{ background: "#FF6B35", borderRadius: "30px" }}
            onClick={() => setMobileMenuOpen(false)}
          >
            Pesan Sekarang
          </a>
        </div>
      )}
    </nav>
  );
}
