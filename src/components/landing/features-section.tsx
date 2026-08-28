"use client";

import { useEffect, useRef } from "react";

const features = [
  { icon: "fas fa-certificate",      title: "Sertifikasi Halal",    description: "Telah tersertifikasi halal dan aman dikonsumsi" },
  { icon: "fas fa-temperature-low",  title: "Pendinginan Optimal",  description: "Disimpan dalam suhu terkontrol untuk kesegaran maksimal" },
  { icon: "fas fa-hand-holding-heart",title: "Kemasan Aman",        description: "Kemasan khusus anti guncangan untuk melindungi telur" },
  { icon: "fas fa-undo",             title: "Garansi Kepuasan",     description: "Uang kembali jika telur tidak sesuai standar kualitas" },
];

export default function FeaturesSection() {
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

    const items = sectionRef.current?.querySelectorAll(".feature-item");
    items?.forEach((item, index) => {
      (item as HTMLElement).style.transitionDelay = `${index * 0.1}s`;
      observer.observe(item);
    });

    const reveals = sectionRef.current?.querySelectorAll(".reveal");
    reveals?.forEach((el) => revealObserver.observe(el));

    return () => { observer.disconnect(); revealObserver.disconnect(); };
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      style={{ padding: "100px 5%", background: "#2C1810", color: "white", position: "relative", overflow: "hidden" }}
    >
      {/* SVG pattern overlay */}
      <div
        style={{
          position:        "absolute",
          top:             0,
          left:            0,
          width:           "100%",
          height:          "100%",
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          opacity:         0.5,
        }}
      />

      {/* Section header */}
      <div className="text-center reveal" style={{ marginBottom: "60px", position: "relative", zIndex: 1 }}>
        <h2
          className="relative inline-block text-3xl md:text-4xl lg:text-[2.5rem]"
          style={{ fontWeight: 800, marginBottom: "15px", color: "white" }}
        >
          Keunggulan Telur Jagoan
          <span className="section-underline" />
        </h2>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.1rem", marginTop: "20px" }}>
          Kami hadir dengan standar kualitas terbaik
        </p>
      </div>

      {/* Features grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
        style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 1 }}
      >
        {features.map((feature, index) => (
          <div key={index} className="feature-item">
            <div
              className="feature-icon-inner"
              style={{
                width:          "70px",
                height:         "70px",
                background:     "rgba(255, 107, 53, 0.2)",
                borderRadius:   "20px",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                margin:         "0 auto 20px",
                fontSize:       "1.8rem",
                color:          "#FFD23F",
              }}
            >
              <i className={feature.icon}></i>
            </div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "10px" }}>{feature.title}</h3>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem", lineHeight: 1.6 }}>{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
