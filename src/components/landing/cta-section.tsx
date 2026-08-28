"use client";

import { useEffect, useRef } from "react";

type CtaSectionProps = {
  store?: {
    name: string;
    phone: string;
    whatsappUrl: string;
  };
};

export default function CtaSection({ store }: CtaSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("active"); }),
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    sectionRef.current?.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const whatsappLink = store?.whatsappUrl || "https://wa.me/6281234567890";

  return (
    <section
      id="contact"
      ref={sectionRef}
      style={{
        padding:    "100px 5%",
        background: "linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)",
        textAlign:  "center",
        position:   "relative",
        overflow:   "hidden",
      }}
    >
      {/* Rotating radial overlay */}
      <div
        style={{
          position:   "absolute",
          top:        "-50%",
          left:       "-50%",
          width:      "200%",
          height:     "200%",
          background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)",
          animation:  "egg-rotate 20s linear infinite",
        }}
      />

      <div className="reveal" style={{ position: "relative", zIndex: 1, maxWidth: "700px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "2.5rem", color: "white", marginBottom: "20px", fontWeight: 800 }}>
          Siap Memesan Telur Segar Berkualitas?
        </h2>
        <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "1.1rem", marginBottom: "30px" }}>
          Hubungi kami langsung melalui WhatsApp untuk pemesanan eceran maupun partai besar / grosir dengan jaminan kualitas terbaik.
        </p>
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background:     "white",
            color:          "#FF6B35",
            fontSize:       "1.1rem",
            padding:        "18px 40px",
            borderRadius:   "50px",
            fontWeight:     700,
            textDecoration: "none",
            display:        "inline-flex",
            alignItems:     "center",
            gap:            "10px",
            boxShadow:      "0 10px 25px rgba(0,0,0,0.15)",
            transition:     "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#2C1810";
            (e.currentTarget as HTMLElement).style.color = "white";
            (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "white";
            (e.currentTarget as HTMLElement).style.color = "#FF6B35";
            (e.currentTarget as HTMLElement).style.transform = "";
          }}
        >
          <i className="fab fa-whatsapp" style={{ fontSize: "1.3rem" }}></i>
          Pesan via WhatsApp Sekarang
        </a>
      </div>
    </section>
  );
}
