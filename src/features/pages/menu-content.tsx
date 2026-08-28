import { Construction } from "lucide-react";

import { findNavigationItem } from "@/data/navigation";
import type { AppRole } from "@/lib/permissions";

type MenuContentProps = {
  path: string;
  role: AppRole;
};

export function MenuContent({ path, role }: MenuContentProps) {
  const pathname = `/${path}`;
  const item = findNavigationItem(role, pathname);
  const title = item?.title ?? path.split("/").at(-1)?.replaceAll("-", " ") ?? "Halaman";

  return (
    <div className="mx-auto max-w-[1500px] animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Telur Jagoan</p>
        <h1 className="text-2xl font-bold capitalize tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Kerangka halaman sudah tersedia dan fiturnya akan dikerjakan pada fase terkait.
        </p>
      </header>

      <section className="grid min-h-72 place-items-center rounded-xl border border-dashed bg-card p-8 text-center">
        <div>
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-muted text-primary">
            <Construction size={22} aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-semibold">Modul belum diimplementasikan</h2>
          <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
            Halaman ini sengaja disiapkan sebagai area konten dasar tanpa mendahului urutan fase pada roadmap.
          </p>
        </div>
      </section>
    </div>
  );
}
