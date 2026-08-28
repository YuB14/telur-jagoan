"use client";

import { useEffect, useRef } from "react";

export default function MapSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("active");
        });
      },
      { threshold: 0.1 }
    );

    const reveals = sectionRef.current?.querySelectorAll(".reveal");
    reveals?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="location"
      ref={sectionRef}
      style={{
        padding: "80px 5%",
        background: "linear-gradient(180deg, white 0%, #FFF5E6 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center reveal" style={{ marginBottom: "50px" }}>
          <h2
            className="relative inline-block"
            style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "15px", color: "#2C1810" }}
          >
            Lokasi Kami
            <span className="section-underline" />
          </h2>
          <p style={{ color: "#888", fontSize: "1.1rem", marginTop: "20px" }}>
            Kunjungi toko kami untuk mendapatkan telur segar langsung dari peternakan
          </p>
        </div>

        {/* Map Grid */}
        <div
          className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-stretch reveal"
          style={{ maxWidth: "1200px", margin: "0 auto" }}
        >
          {/* Information Card */}
          <div
            style={{
              background: "white",
              padding: "40px",
              borderRadius: "20px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              border: "1px solid rgba(255, 107, 53, 0.1)",
            }}
          >
            <div style={{ marginBottom: "30px" }}>
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "12px",
                  background: "rgba(255, 107, 53, 0.1)",
                  color: "#FF6B35",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                  marginBottom: "15px",
                }}
              >
                <i className="fas fa-map-marker-alt"></i>
              </div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#2C1810", marginBottom: "10px" }}>
                Alamat Toko
              </h3>
              <p style={{ color: "#666", lineHeight: 1.6, fontSize: "0.95rem" }}>
                Perum GRAND ROSE REGENCY Blok.B No.2 Kemiri Sidoarjo, RT.24 RW.12, Jawa Timur.
              </p>
            </div>

            <div style={{ marginBottom: "30px" }}>
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "12px",
                  background: "rgba(255, 107, 53, 0.1)",
                  color: "#FF6B35",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                  marginBottom: "15px",
                }}
              >
                <i className="fas fa-clock"></i>
              </div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#2C1810", marginBottom: "10px" }}>
                Jam Operasional
              </h3>
              <p style={{ color: "#666", lineHeight: 1.6, fontSize: "0.95rem" }}>
                Setiap Hari: 06.00 - 21.00 WIB
              </p>
            </div>

            <div>
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "12px",
                  background: "rgba(255, 107, 53, 0.1)",
                  color: "#FF6B35",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                  marginBottom: "15px",
                }}
              >
                <i className="fas fa-phone"></i>
              </div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#2C1810", marginBottom: "10px" }}>
                Hubungi Kami
              </h3>
              <p style={{ color: "#666", lineHeight: 1.6, fontSize: "0.95rem" }}>
                Telepon/WhatsApp: 0822-6112-8316<br />
                Email: telurjagoan@gmail.com
              </p>
            </div>
          </div>

          {/* Map Frame Card */}
          <div
            className="lg:col-span-2"
            style={{
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: "0 15px 35px rgba(0,0,0,0.1)",
              border: "1px solid rgba(255, 107, 53, 0.15)",
              background: "#eee",
              position: "relative",
              minHeight: "450px",
              height: "100%",
            }}
          >
            <iframe
              src="https://maps.google.com/maps?q=Perum%20GRAND%20ROSE%20REGENCY%20Kemiri%20Sidoarjo&t=&z=16&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0, display: "block" }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
}
