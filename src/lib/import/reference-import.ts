import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const FILE_CATEGORIES: Record<string, string> = {
  "Binder analysis.xlsx": "binder",
  "BRIQUETTE BLEND & ANALYSIS.xlsx": "briquette",
  "Raw Materials Analysis.xlsx": "raw_materials",
  "Reductant Analysis 1.xlsx": "reductant",
  "SAF - 03 Furnace detail.xlsx": "furnace",
  "SAF Metal analysis (7).xlsx": "metal_analysis",
};

export type UploadFile = { fileName: string; buffer: Buffer };

function rowToObject(headers: string[], row: unknown[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  headers.forEach((h, i) => {
    if (h) obj[h] = row[i] ?? null;
  });
  return obj;
}

function extractHeaders(data: unknown[][]): string[] {
  for (const row of data) {
    const headers = (row as unknown[]).map((h) =>
      h === null || h === undefined ? "" : String(h).trim()
    );
    if (headers.filter(Boolean).length >= 2) return headers;
  }
  return [];
}

function resolveCategory(fileName: string): string {
  const known = FILE_CATEGORIES[fileName];
  if (known) return known;
  const lower = fileName.toLowerCase();
  if (lower.includes("furnace")) return "furnace";
  if (lower.includes("metal")) return "metal_analysis";
  if (lower.includes("raw")) return "raw_materials";
  if (lower.includes("briquette")) return "briquette";
  if (lower.includes("reductant")) return "reductant";
  if (lower.includes("binder")) return "binder";
  return "general";
}

async function importExcelFromBuffer(
  fileName: string,
  companySlug: string,
  buffer: Buffer
): Promise<void> {
  const category = resolveCategory(fileName);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  const existing = await db.dataFile.findFirst({
    where: { fileName, companySlug },
  });
  if (existing) {
    await db.dataRecord.deleteMany({ where: { fileId: existing.id } });
    await db.dataSheet.deleteMany({ where: { fileId: existing.id } });
    await db.dataFile.delete({ where: { id: existing.id } });
  }

  let totalRows = 0;
  const dataFile = await db.dataFile.create({
    data: {
      companySlug,
      fileName,
      fileType: "xlsx",
      category,
      fileSize: buffer.length,
      sheetCount: workbook.SheetNames.length,
      description: `Reference data: ${category.replace(/_/g, " ")}`,
    },
  });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
    }) as unknown[][];

    const nonEmpty = data.filter((row) =>
      row.some((cell) => cell !== null && cell !== "")
    );
    const headers = extractHeaders(nonEmpty);
    const dataSheet = await db.dataSheet.create({
      data: {
        fileId: dataFile.id,
        sheetName,
        rowCount: nonEmpty.length,
        colCount: headers.length,
        headers: JSON.stringify(headers),
      },
    });

    for (let i = 1; i < nonEmpty.length; i++) {
      const row = nonEmpty[i] as unknown[];
      if (!row.some((cell) => cell !== null && cell !== "")) continue;

      await db.dataRecord.create({
        data: {
          fileId: dataFile.id,
          sheetId: dataSheet.id,
          rowIndex: i,
          category,
          data: JSON.stringify(rowToObject(headers, row)),
        },
      });
      totalRows++;
    }

    if (category === "furnace") {
      await db.furnaceSpec.deleteMany({ where: { companySlug, sourceFile: fileName } });
      for (const row of nonEmpty.slice(1)) {
        const cells = row as unknown[];
        if (cells[0] && cells[1]) {
          await db.furnaceSpec.create({
            data: {
              companySlug,
              furnaceNumber: "SAF-03",
              parameter: String(cells[0]).trim(),
              value: String(cells[1] ?? "").trim(),
              unit: cells[2] ? String(cells[2]).trim() : null,
              sourceFile: fileName,
            },
          });
        }
      }
    }
  }

  await db.dataFile.update({
    where: { id: dataFile.id },
    data: { rowCount: totalRows },
  });
}

async function importPdfFromBuffer(
  fileName: string,
  companySlug: string,
  buffer: Buffer
): Promise<void> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();

    await db.pdfDocument.deleteMany({ where: { fileName, companySlug } });
    await db.pdfDocument.create({
      data: {
        companySlug,
        fileName,
        pageCount: data.total ?? 0,
        content: data.text ?? "",
        summary: (data.text ?? "").slice(0, 500).replace(/\s+/g, " ").trim(),
      },
    });
  } catch {
    await db.pdfDocument.deleteMany({ where: { fileName, companySlug } });
    await db.pdfDocument.create({
      data: {
        companySlug,
        fileName,
        pageCount: 0,
        content: `[PDF ${fileName}, ${buffer.length} bytes]`,
        summary: fileName.replace(/\.pdf$/i, ""),
      },
    });
  }
}

async function importStats(companySlug: string) {
  return {
    files: await db.dataFile.count({ where: { companySlug } }),
    records: await db.dataRecord.count({ where: { file: { companySlug } } }),
    furnaceSpecs: await db.furnaceSpec.count({ where: { companySlug } }),
    insights: await db.dataInsight.count(),
    pdfs: await db.pdfDocument.count({ where: { companySlug } }),
  };
}

export async function runReferenceImportFromUploads(
  companySlug: string,
  files: UploadFile[]
): Promise<Awaited<ReturnType<typeof importStats>>> {
  if (files.length === 0) {
    throw new Error("No files uploaded");
  }

  for (const file of files) {
    const lower = file.fileName.toLowerCase();
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      await importExcelFromBuffer(file.fileName, companySlug, file.buffer);
    } else if (lower.endsWith(".pdf")) {
      await importPdfFromBuffer(file.fileName, companySlug, file.buffer);
    }
  }

  return importStats(companySlug);
}

export async function runReferenceImport(companySlug: string) {
  const dataDir = env().importDataDir;
  if (!dataDir) {
    throw new Error(
      "IMPORT_DATA_DIR is not set. Upload Excel/PDF files from Admin instead, or set IMPORT_DATA_DIR for local import."
    );
  }

  for (const fileName of Object.keys(FILE_CATEGORIES)) {
    const filePath = path.join(dataDir, fileName);
    if (!fs.existsSync(filePath)) continue;
    const buffer = fs.readFileSync(filePath);
    await importExcelFromBuffer(fileName, companySlug, buffer);
  }

  const pdfPath = path.join(dataDir, "27.6 Mva Complex.pdf");
  if (fs.existsSync(pdfPath)) {
    await importPdfFromBuffer("27.6 Mva Complex.pdf", companySlug, fs.readFileSync(pdfPath));
  }

  if (companySlug === "jsl") {
    await db.dataInsight.deleteMany({});
    await db.dataInsight.createMany({
      data: [
        {
          category: "furnace",
          title: "Dual SAF Furnace Operations",
          content:
            "SAF-3 and SAF-4 submerged arc furnaces. Monthly metal analysis tracks Cr%, Si%, C%, P%, S%, and Fe%.",
          priority: "high",
          tags: "SAF-3,SAF-4,metal-analysis",
        },
        {
          category: "gap",
          title: "Information Gaps Requiring Stakeholder Input",
          content:
            "Missing: SCADA parameters, charge mix rules, SAP mapping, approval hierarchies, Excel dependencies.",
          priority: "critical",
          tags: "gaps,stakeholder-interview,AURA",
        },
      ],
    });
  }

  return importStats(companySlug);
}
