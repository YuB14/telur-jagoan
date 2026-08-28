import type { Metadata } from "next";

import { createManualBackupAction } from "@/server/actions/settings";
import { getLastBackup } from "@/server/services/settings";

export const metadata: Metadata = { title: "Backup Data | Telur Jagoan" };

type BackupPageProps = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

const sizeFormatter = new Intl.NumberFormat("id-ID");
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function BackupPage({ searchParams }: BackupPageProps) {
  const [lastBackup, params] = await Promise.all([getLastBackup(), searchParams]);

  return (
    <div className="mx-auto max-w-3xl animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Pengaturan</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Backup Data</h1>
        <p className="mt-2 text-sm text-muted-foreground">Trigger backup manual database dan unduh backup terakhir.</p>
      </header>
      {params.success === "created" && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Backup baru berhasil dibuat.</p>}
      {params.error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p>}
      <section className="space-y-5 rounded-xl border bg-card p-6">
        <form action={createManualBackupAction}>
          <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90" type="submit">Buat Backup Manual</button>
        </form>
        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <p className="font-semibold">Backup terakhir</p>
          {lastBackup ? (
            <div className="mt-2 space-y-1 text-muted-foreground">
              <p>{lastBackup.file}</p>
              <p>{dateFormatter.format(lastBackup.createdAt)} · {sizeFormatter.format(lastBackup.size)} byte</p>
              <a className="inline-block font-medium text-primary hover:underline" href={`/pengaturan/backup/download?file=${encodeURIComponent(lastBackup.file)}`}>Unduh backup terakhir</a>
            </div>
          ) : (
            <p className="mt-2 text-muted-foreground">Belum ada backup manual.</p>
          )}
        </div>
      </section>
    </div>
  );
}
