import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getReportData,
  isReportKey,
  REPORT_DEFINITIONS,
} from "@/server/services/reports";

export const metadata: Metadata = { title: "Laporan | Telur Jagoan" };

type ReportPageProps = {
  params: Promise<{ report: string }>;
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
};

export default async function ReportPage({ params, searchParams }: ReportPageProps) {
  const [{ report }, filters] = await Promise.all([params, searchParams]);
  if (!isReportKey(report)) notFound();

  const data = await getReportData(report, filters);
  const exportQuery = new URLSearchParams({
    startDate: data.startDate,
    endDate: data.endDate,
  }).toString();

  return (
    <div className="mx-auto max-w-[1300px] animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Laporan</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{REPORT_DEFINITIONS[report]}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Read-only. Perubahan data dilakukan dari menu operasional asal, bukan dari halaman laporan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted" href={`/laporan/${report}/export/pdf?${exportQuery}`}>
            Cetak/Ekspor PDF
          </a>
          <a className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90" href={`/laporan/${report}/export/excel?${exportQuery}`}>
            Ekspor Excel
          </a>
        </div>
      </header>

      <form className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-end" method="get">
        <label className="block flex-1 text-sm font-medium">
          <span className="mb-2 block">Dari tanggal</span>
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={data.startDate} name="startDate" type="date" />
        </label>
        <label className="block flex-1 text-sm font-medium">
          <span className="mb-2 block">Sampai tanggal</span>
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={data.endDate} name="endDate" type="date" />
        </label>
        <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90" type="submit">
          Terapkan Filter
        </button>
      </form>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(data.summary).map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-lg font-bold">{value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {data.columns.map((column) => (
                  <th key={column} className="px-5 py-3 font-medium">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, index) => (
                <tr key={index} className="border-t align-top hover:bg-muted/30">
                  {data.columns.map((column) => (
                    <td key={column} className="px-5 py-4">{row[column] ?? ""}</td>
                  ))}
                </tr>
              ))}
              {!data.rows.length && (
                <tr>
                  <td className="px-5 py-16 text-center text-muted-foreground" colSpan={data.columns.length}>
                    Tidak ada data laporan pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
