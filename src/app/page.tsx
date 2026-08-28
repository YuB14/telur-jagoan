import LandingNavbar from "@/components/layout/landing-navbar";
import LandingFooter from "@/components/layout/landing-footer";
import HeroSection from "@/components/landing/hero-section";
import AboutSection from "@/components/landing/about-section";
import ProductsSection from "@/components/landing/products-section";
import FeaturesSection from "@/components/landing/features-section";
import TestimonialsSection from "@/components/landing/testimonials-section";
import MapSection from "@/components/landing/map-section";
import CtaSection from "@/components/landing/cta-section";
import { getLandingPageData } from "@/server/services/landing";

export const metadata = {
  title: "Telur Jagoan - Telur Segar Berkualitas",
  description: "Telur Jagoan menyediakan telur ayam segar berkualitas tinggi langsung dari peternakan. Dipilih dengan teliti untuk memastikan kualitas terbaik di setiap butirnya.",
};

export const revalidate = 60; // Refresh dynamic landing data every 60 seconds

export default async function LandingPage() {
  const { stats, products, store } = await getLandingPageData();

  return (
    <div className="landing-page min-h-screen">
      <LandingNavbar store={store} />
      <main>
        <HeroSection stats={stats} store={store} />
        <AboutSection />
        <ProductsSection products={products} />
        <FeaturesSection />
        <TestimonialsSection />
        <MapSection />
        <CtaSection store={store} />
      </main>
      <LandingFooter store={store} products={products} />
    </div>
  );
}
