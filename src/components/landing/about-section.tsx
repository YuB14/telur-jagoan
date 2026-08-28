"use client";

import { useEffect, useRef } from "react";

const aboutCards = [
  {
    icon: "fas fa-leaf",
    title: "100% Alami",
    description: "Telur dari ayam yang diberi pakan alami tanpa hormon dan antibiotik berlebihan",
  },
  {
    icon: "fas fa-shield-alt",
    title: "Keamanan Terjamin",
    description: "Setiap telur melalui proses pemeriksaan kualitas dan kebersihan yang ketat",
  },
  {
    icon: "fas fa-truck-fast",
    title: "Pengiriman Cepat",
    description: "Dikirim fresh dalam waktu 24 jam langsung dari peternakan ke rumah Anda",
  },
];

export default function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const cardObserver = new IntersectionObserver(
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

    const cards = sectionRef.current?.querySelectorAll(".about-card");
    cards?.forEach((card, index) => {
      (card as HTMLElement).style.transitionDelay = `${index * 0.15}s`;
      cardObserver.observe(card);
    });

    const reveals = sectionRef.current?.querySelectorAll(".reveal");
    reveals?.forEach((el) => revealObserver.observe(el));

    return () => { cardObserver.disconnect(); revealObserver.disconnect(); };
  }, []);

  return (
    <section
      id="about"
      ref={sectionRef}
      style={{ padding: "100px 5%", background: "white", position: "relative" }}
    >
      {/* Section header */}
      <div className="text-center reveal" style={{ marginBottom: "60px" }}>
        <h2
          className="relative inline-block text-3xl md:text-4xl lg:text-[2.5rem]"
          style={{ fontWeight: 800, marginBottom: "15px" }}
        >
          Mengapa Memilih Kami?
          <span className="section-underline" />
        </h2>
        <p style={{ color: "#888", fontSize: "1.1rem", marginTop: "20px" }}>
          Kami berkomitmen memberikan telur terbaik untuk kesehatan keluarga Anda
        </p>
      </div>

      {/* Cards grid */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-8"
        style={{ maxWidth: "1200px", margin: "0 auto" }}
      >
        {aboutCards.map((card, index) => (
          <div key={index} className="about-card">
            <div className="about-card-bar" />
            <div
              className="about-icon-inner"
              style={{
                width:         "80px",
                height:        "80px",
                background:    "white",
                borderRadius:  "50%",
                display:       "flex",
                alignItems:    "center",
                justifyContent:"center",
                margin:        "0 auto 20px",
                fontSize:      "2rem",
                color:         "#FF6B35",
                boxShadow:     "0 5px 20px rgba(0,0,0,0.1)",
              }}
            >
              <i className={card.icon}></i>
            </div>
            <h3 style={{ fontSize: "1.3rem", marginBottom: "10px" }}>{card.title}</h3>
            <p style={{ color: "#666", lineHeight: 1.7 }}>{card.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
