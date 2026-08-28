import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { getReportData, isReportKey } from "@/server/services/reports";

type ReportExportRouteProps = {
  params: Promise<{ report: string; format: string }>;
};

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 16, marginBottom: 4, fontWeight: 700 },
  period: { fontSize: 9, marginBottom: 12, color: "#555" },
  table: { width: "100%" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#ddd" },
  header: { backgroundColor: "#f2f2f2", fontWeight: 700 },
  cell: { flex: 1, padding: 4 },
  summary: { marginTop: 12 },
});

function ReportPdfDocument({ data }: { data: Awaited<ReturnType<typeof getReportData>> }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.period}>Periode {data.startDate} s/d {data.endDate}</Text>
        <View style={styles.table}>
          <View style={[styles.row, styles.header]}>
            {data.columns.map((column) => (
              <Text key={column} style={styles.cell}>{column}</Text>
            ))}
          </View>
          {data.rows.map((row, index) => (
            <View key={index} style={styles.row}>
              {data.columns.map((column) => (
                <Text key={column} style={styles.cell}>{row[column] ?? ""}</Text>
              ))}
            </View>
          ))}
        </View>
        <View style={styles.summary}>
          {Object.entries(data.summary).map(([label, value]) => (
            <Text key={label}>{label}: {value}</Text>
          ))}
        </View>
      </Page>
    </Document>
  );
}

function safeFilename(value: string) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function GET(request: NextRequest, { params }: ReportExportRouteProps) {
  const { report, format } = await params;
  if (!isReportKey(report) || !["pdf", "excel"].includes(format)) {
    return new NextResponse("Laporan tidak ditemukan.", { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const data = await getReportData(report, {
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
  });
  const filename = `${safeFilename(data.title)}-${data.startDate}-${data.endDate}`;

  if (format === "excel") {
    const worksheet = XLSX.utils.json_to_sheet(data.rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  const buffer = await renderToBuffer(<ReportPdfDocument data={data} />);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${filename}.pdf"`,
    },
  });
}
