import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, CheckCircle2, Egg, PackageCheck, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = {
  title: "Masuk | Telur Jagoan",
  description: "Masuk ke dashboard operasional Telur Jagoan",
};

const benefits = [
  { icon: BarChart3, text: "Pantau penjualan secara real-time" },
  { icon: PackageCheck, text: "Kelola stok dan pesanan dalam satu tempat" },
  { icon: ShieldCheck, text: "Data operasional aman dan terkontrol" },
];

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string | string[];
    error?: string | string[];
  }>;
};

function getSafeCallbackUrl(value: string | string[] | undefined) {
  const callbackUrl = Array.isArray(value) ? value[0] : value;

  // Tolak jika bukan path relatif, atau jika path adalah landing page (/)
  if (!callbackUrl?.startsWith("/") || callbackUrl.startsWith("//") || callbackUrl === "/") {
    return "/dashboard";
  }

  return callbackUrl;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = getSafeCallbackUrl(params.callbackUrl);
  const errorParam = Array.isArray(params.error) ? params.error[0] : params.error;

  return (
    <main className="grid min-h-screen bg-card lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#2C1810] via-[#3A1E14] to-[#1C0E08] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-28 -top-28 size-[420px] rounded-full border border-white/10" />
        <div className="absolute -right-10 -top-10 size-64 rounded-full border border-white/10" />
        <div className="absolute -bottom-40 -left-32 size-[460px] rounded-full bg-[#FF6B35]/20 blur-3xl" />
        <div className="absolute top-1/3 right-0 size-72 rounded-full bg-[#F7931E]/15 blur-2xl" />

        <Link href="/" className="relative z-10 flex w-fit items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-[#FF6B35] to-[#F7931E] text-white shadow-lg shadow-[#FF6B35]/25">
            <Egg size={21} />
          </span>
          <span>
            <span className="block text-base font-bold leading-tight">Telur Jagoan</span>
            <span className="block text-xs text-white/70">Admin Dashboard</span>
          </span>
        </Link>

        <div className="relative z-10 max-w-xl">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#FF6B35]/30 bg-[#FF6B35]/15 px-3 py-1.5 text-xs font-medium text-[#FFD23F] backdrop-blur">
            <CheckCircle2 size={14} className="text-[#FFD23F]" /> Operasional lebih mudah
          </span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Kendalikan bisnis telur Anda dari satu dashboard.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-white/75">
            Kelola penjualan, persediaan, pelanggan, dan aktivitas tim dengan informasi yang selalu terbarui.
          </p>
          <div className="mt-9 grid gap-4">
            {benefits.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-white/85">
                <span className="grid size-8 place-items-center rounded-lg border border-[#FF6B35]/25 bg-[#FF6B35]/15 text-[#FFD23F]">
                  <Icon size={16} />
                </span>
                {text}
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/50">
          © 2026 Telur Jagoan. Semua hak dilindungi.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-background px-5 py-10 sm:px-8">
        <div className="w-full max-w-md animate-rise">
          <Link href="/" className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
              <Egg size={21} />
            </span>
            <span className="font-bold text-foreground">Telur Jagoan</span>
          </Link>

          <div>
            <p className="mb-2 text-sm font-semibold text-primary">Selamat datang kembali</p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Masuk ke akun Anda</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Masukkan email dan kata sandi untuk melanjutkan ke dashboard.
            </p>
          </div>

          <LoginForm redirectTo={callbackUrl} errorParam={errorParam} />

          <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">
            Dengan masuk, Anda menyetujui{" "}
            <Link href="/login#terms" className="underline underline-offset-2 hover:text-foreground">Ketentuan Layanan</Link>
            {" "}dan{" "}
            <Link href="/login#privacy" className="underline underline-offset-2 hover:text-foreground">Kebijakan Privasi</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
