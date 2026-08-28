"use client";

import { useEffect, useRef } from "react";

type HeroSectionProps = {
  stats?: {
    eggsSold: number;
    satisfiedCustomers: number;
    partnerFarms: number;
    totalSalesCount: number;
  };
  store?: {
    name: string;
    whatsappUrl: string;
  };
};

export default function HeroSection({ stats, store }: HeroSectionProps) {
  const statsRef = useRef<HTMLDivElement>(null);

  const eggsSold = stats?.eggsSold ?? 50000;
  const satisfiedCustomers = stats?.satisfiedCustomers ?? 1000;
  const partnerFarms = stats?.partnerFarms ?? 50;

  useEffect(() => {
    const animateCounters = () => {
      const counters = document.querySelectorAll(".stat-number");
      counters.forEach((counter) => {
        const target = parseInt(counter.getAttribute("data-target") || "0", 10);
        if (target <= 0) {
          counter.textContent = "0";
          return;
        }

        const duration = 1500;
        const frameDuration = 1000 / 60;
        const totalFrames = Math.round(duration / frameDuration);
        let frame = 0;

        const timer = setInterval(() => {
          frame++;
          const progress = frame / totalFrames;
          const currentCount = Math.round(target * Math.min(progress, 1));
          counter.textContent = currentCount.toLocaleString("id-ID");

          if (frame >= totalFrames) {
            clearInterval(timer);
            counter.textContent = target.toLocaleString("id-ID");
          }
        }, frameDuration);
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounters();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, [eggsSold, satisfiedCustomers, partnerFarms]);

  return (
    <section id="home" className="min-h-screen flex items-center pt-24 pb-12 relative overflow-hidden" style={{ background: "linear-gradient(135deg, var(--color-landing-cream) 0%, #fff 50%, var(--color-landing-cream) 100%)" }}>
      <div className="absolute -top-1/2 -right-1/5 w-[800px] h-[800px] rounded-full animate-egg-pulse" style={{ background: "radial-gradient(circle, rgba(255, 107, 53, 0.1) 0%, transparent 70%)" }}></div>

      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center w-full px-5" style={{ padding: "0 5%" }}>
        <div className="z-[2]">
          <div className="inline-flex items-center gap-2 bg-landing-primary/10 text-landing-primary px-5 py-2 rounded-full text-sm font-semibold mb-5 animate-egg-fade-up">
            <i className="fas fa-star animate-egg-spin"></i>
            Telur Segar Berkualitas Langsung dari Peternak
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-5 animate-egg-fade-up hero-content-1">
            Telur Segar{" "}
            <span className="text-landing-primary relative inline-block">
              Berkualitas
              <span className="absolute bottom-1 left-0 w-full h-3 bg-landing-accent opacity-40 z-[-1] rounded animate-egg-expand"></span>
            </span>{" "}
            untuk Keluarga Anda
          </h1>

          <p className="text-lg text-gray-500 mb-8 leading-relaxed animate-egg-fade-up hero-content-2">
            {store?.name || "Telur Jagoan"} menyediakan telur ayam segar pilihan berkualitas tinggi. Dipilih dan diperiksa secara higienis untuk memastikan mutu terbaik di setiap butirnya.
          </p>

          <div className="flex flex-wrap gap-4 mb-10 animate-egg-fade-up hero-content-3">
            <a href="#products" className="bg-landing-primary text-white px-9 py-4 rounded-full font-semibold no-underline inline-flex items-center gap-2.5 transition-all duration-300 shadow-xl hover:bg-landing-secondary hover:-translate-y-1 hover:shadow-2xl" style={{ boxShadow: "0 10px 30px rgba(255, 107, 53, 0.3)" }}>
              <i className="fas fa-shopping-cart"></i>
              Lihat Produk
            </a>
            <a href="#about" className="bg-transparent text-landing-dark border-2 border-landing-dark px-9 py-4 rounded-full font-semibold no-underline inline-flex items-center gap-2.5 transition-all duration-300 hover:bg-landing-dark hover:text-white hover:-translate-y-1">
              <i className="fas fa-play-circle"></i>
              Tentang Kami
            </a>
          </div>

          <div className="flex gap-10 animate-egg-fade-up hero-content-4" ref={statsRef}>
            <div className="text-center">
              <span className="text-4xl font-extrabold text-landing-primary block stat-number" data-target={eggsSold}>
                {eggsSold.toLocaleString("id-ID")}
              </span>
              <span className="text-sm text-gray-400">Telur Terjual (Kg/Butir)</span>
            </div>
            <div className="text-center">
              <span className="text-4xl font-extrabold text-landing-primary block stat-number" data-target={satisfiedCustomers}>
                {satisfiedCustomers.toLocaleString("id-ID")}
              </span>
              <span className="text-sm text-gray-400">Pelanggan Puas</span>
            </div>
            <div className="text-center">
              <span className="text-4xl font-extrabold text-landing-primary block stat-number" data-target={partnerFarms}>
                {partnerFarms.toLocaleString("id-ID")}
              </span>
              <span className="text-sm text-gray-400">Mitra Peternak</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center items-center animate-egg-fade-right">
          <div className="egg-container">
            <div className="egg-main"></div>
            <div className="egg-shadow"></div>
            <div className="floating-egg"></div>
            <div className="floating-egg"></div>
            <div className="floating-egg"></div>
            <div className="floating-egg"></div>
            <div className="sparkle"></div>
            <div className="sparkle"></div>
            <div className="sparkle"></div>
            <div className="sparkle"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
