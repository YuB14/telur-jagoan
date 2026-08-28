"use client";

import { useState, useEffect, useRef } from "react";

const testimonials = [
  {
    text:   "Telurnya benar-benar segar! Kuning telurnya tebal dan warnanya cantik. Anak-anak saya jadi lebih suka makan telur setelah beli dari Telur Jagoan.",
    author: "Siti Aminah",
    role:   "Ibu Rumah Tangga, Jakarta",
    avatar: "S",
    stars:  5,
  },
  {
    text:   "Sebagai pemilik restoran, kualitas bahan baku sangat penting. Telur Jagoan selalu konsisten dalam kualitasnya. Sangat recommended!",
    author: "Budi Santoso",
    role:   "Pemilik Restoran, Bandung",
    avatar: "B",
    stars:  5,
  },
  {
    text:   "Pengirimannya cepat dan kemasannya sangat aman. Sampai rumah telurnya masih utuh semua. Pelayanannya juga ramah!",
    author: "Rina Wulandari",
    role:   "Chef Private, Surabaya",
    avatar: "R",
    stars:  4.5,
  },
];

export default function TestimonialsSection() {
  const [current, setCurrent] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  /* Auto-slide every 5 s */
  useEffect(() => {
    const id = setInterval(() => setCurrent((p) => (p + 1) % testimonials.length), 5000);
    return () => clearInterval(id);
  }, []);

  /* Reveal header */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("active"); }),
      { threshold: 0.1 }
    );
    sectionRef.current?.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} style={{ padding: "100px 5%", background: "white" }}>
      {/* Section header */}
      <div className="text-center reveal" style={{ marginBottom: "60px" }}>
        <h2
          className="relative inline-block"
          style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "15px" }}
        >
          Apa Kata Pelanggan?
          <span className="section-underline" />
        </h2>
        <p style={{ color: "#888", fontSize: "1.1rem", marginTop: "20px" }}>
          Testimoni dari pelanggan setia Telur Jagoan
        </p>
      </div>

      {/* Slider */}
      <div style={{ maxWidth: "800px", margin: "0 auto", position: "relative" }}>
        {testimonials.map((t, index) => (
          <div
            key={index}
            style={{
              background:    "#FFF5E6",
              padding:       "40px",
              borderRadius:  "20px",
              textAlign:     "center",
              position:      "relative",
              overflow:      "hidden",
              opacity:       index === current ? 1 : 0,
              transform:     index === current ? "translateX(0)" : "translateX(50px)",
              transition:    "all 0.5s ease",
              display:       index === current ? "block" : "none",
            }}
          >
            {/* Big quote mark */}
            <span
              style={{
                fontSize:   "6rem",
                color:      "#FF6B35",
                opacity:    0.2,
                position:   "absolute",
                top:        "-20px",
                left:       "20px",
                fontFamily: "Georgia, serif",
                lineHeight: 1,
              }}
            >
              &quot;
            </span>

            {/* Stars */}
            <div style={{ color: "#FFD23F", marginBottom: "15px", fontSize: "1.2rem" }}>
              {[...Array(Math.floor(t.stars))].map((_, i) => (
                <i key={i} className="fas fa-star"></i>
              ))}
              {t.stars % 1 !== 0 && <i className="fas fa-star-half-alt"></i>}
            </div>

            {/* Text */}
            <p style={{ fontSize: "1.1rem", lineHeight: 1.8, marginBottom: "20px", color: "#444", fontStyle: "italic" }}>
              &ldquo;{t.text}&rdquo;
            </p>

            {/* Author */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "15px" }}>
              <div
                style={{
                  width:          "50px",
                  height:         "50px",
                  background:     "#FF6B35",
                  borderRadius:   "50%",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  color:          "white",
                  fontWeight:     700,
                  fontSize:       "1.2rem",
                }}
              >
                {t.avatar}
              </div>
              <div style={{ textAlign: "left" }}>
                <h4 style={{ fontSize: "1rem", marginBottom: "3px" }}>{t.author}</h4>
                <span style={{ fontSize: "0.85rem", color: "#888" }}>{t.role}</span>
              </div>
            </div>
          </div>
        ))}

        {/* Dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "30px" }}>
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
              style={{
                width:        "12px",
                height:       "12px",
                borderRadius: "50%",
                background:   index === current ? "#FF6B35" : "#ddd",
                border:       "none",
                cursor:       "pointer",
                transform:    index === current ? "scale(1.2)" : "scale(1)",
                transition:   "all 0.3s ease",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
