import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { format } from "date-fns";
import {
  DEVELOPMENT_AGE_BANDS,
  NEWBORN_SCREENINGS,
} from "@shared/health-catalog";

type VaccineReportItem = {
  name: string;
  dose: string;
  applicationDate: string;
};

type GrowthReportItem = {
  date: string;
  weight: string | null;
  height: string | null;
  headCircumference: string | null;
};

type NeonatalReportItem = {
  label: string;
  completedAt: string;
};

type DevelopmentReportItem = {
  ageBand: string;
  title: string;
  status: string;
  checkedAt: string | null;
};

type ClinicalReportItem = {
  date: string;
  category: string;
  title: string;
  description: string | null;
};

type ExamReportItem = {
  examDate: string;
  title: string;
  notes: string | null;
  followUpTitle: string;
  followUpDate: string;
};

export type HealthReportPdfData = {
  child: {
    name: string;
    birthDate: string;
  };
  includedSections: string[];
  period: {
    startDate?: string;
    endDate?: string;
  };
  generatedAt: string;
  sections: {
    vaccines: VaccineReportItem[];
    growth: GrowthReportItem[];
    neonatal: NeonatalReportItem[];
    development: DevelopmentReportItem[];
    clinical: ClinicalReportItem[];
    exams: ExamReportItem[];
  };
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return format(new Date(`${value}T00:00:00`), "dd/MM/yyyy");
}

function formatDecimal(value?: string | null, suffix?: string) {
  if (!value) return "-";
  return `${String(value).replace(".", ",")}${suffix ? ` ${suffix}` : ""}`;
}

function addDivider(doc: PDFKit.PDFDocument) {
  const y = doc.y + 4;
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .strokeColor("#e5e7eb")
    .lineWidth(1)
    .stroke();
  doc.moveDown(0.8);
}

function ensureSpace(doc: PDFKit.PDFDocument, needed = 72) {
  if (doc.y + needed < doc.page.height - doc.page.margins.bottom) return;
  doc.addPage();
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string, subtitle?: string) {
  ensureSpace(doc, 64);
  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .fillColor("#1f2937")
    .text(title);
  if (subtitle) {
    doc
      .moveDown(0.2)
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#6b7280")
      .text(subtitle);
  }
  doc.moveDown(0.5);
  addDivider(doc);
}

function infoLine(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#111827")
    .text(`${label}: `, { continued: true })
    .font("Helvetica")
    .fillColor("#374151")
    .text(value);
}

function itemBlock(
  doc: PDFKit.PDFDocument,
  title: string,
  meta: string[],
  body?: string | null,
) {
  ensureSpace(doc, 66);
  doc
    .roundedRect(doc.page.margins.left, doc.y, doc.page.width - 100, 0, 12)
    .fillOpacity(0);
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111827")
    .text(title);
  meta.forEach((line) => {
    doc
      .moveDown(0.15)
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#4b5563")
      .text(line);
  });
  if (body) {
    doc
      .moveDown(0.2)
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#374151")
      .text(body);
  }
  doc.moveDown(0.7);
  addDivider(doc);
}

function emptyState(doc: PDFKit.PDFDocument, text: string) {
  ensureSpace(doc, 40);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#6b7280")
    .text(text);
  doc.moveDown(0.8);
}

export async function buildHealthReportPdf(
  data: HealthReportPdfData,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    info: {
      Title: `Relatorio de saude - ${data.child.name}`,
      Author: "Filhos",
    },
  });

  const chunks: Buffer[] = [];
  const pdfBuffer = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const logoPath = path.join(process.cwd(), "client", "public", "icons", "icon-192x192.png");
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, doc.page.margins.left, doc.page.margins.top, {
      fit: [34, 34],
    });
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(22)
    .fillColor("#1d4ed8")
    .text("Filhos", 82, 42);
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor("#111827")
    .text("Relatorio para o pediatra", { align: "right" });
  doc.moveDown(1.6);

  infoLine(doc, "Crianca", data.child.name);
  infoLine(doc, "Nascimento", formatDate(data.child.birthDate));
  infoLine(
    doc,
    "Periodo",
    data.period.startDate || data.period.endDate
      ? `${formatDate(data.period.startDate)} a ${formatDate(data.period.endDate)}`
      : "Sem filtro de periodo",
  );
  infoLine(doc, "Emitido em", format(new Date(data.generatedAt), "dd/MM/yyyy HH:mm"));
  doc.moveDown(1);
  addDivider(doc);

  if (data.includedSections.includes("vaccines")) {
    sectionTitle(doc, "Vacinas aplicadas", "Somente doses com data de aplicacao registrada.");
    if (data.sections.vaccines.length === 0) {
      emptyState(doc, "Nenhuma vacina aplicada encontrada para o periodo selecionado.");
    } else {
      data.sections.vaccines.forEach((item) =>
        itemBlock(doc, `${item.name} - ${item.dose}`, [
          `Data de aplicacao: ${formatDate(item.applicationDate)}`,
        ]),
      );
    }
  }

  if (data.includedSections.includes("growth")) {
    sectionTitle(doc, "Crescimento", "Historico de medidas registradas.");
    if (data.sections.growth.length === 0) {
      emptyState(doc, "Nenhum registro de crescimento encontrado para o periodo selecionado.");
    } else {
      data.sections.growth.forEach((item) =>
        itemBlock(doc, formatDate(item.date), [
          `Peso: ${formatDecimal(item.weight, "kg")}`,
          `Altura: ${formatDecimal(item.height, "cm")}`,
          `Perimetro cefalico: ${formatDecimal(item.headCircumference, "cm")}`,
        ]),
      );
    }
  }

  if (data.includedSections.includes("neonatal")) {
    sectionTitle(doc, "Triagem neonatal", "Triagens realizadas ao nascer.");
    if (data.sections.neonatal.length === 0) {
      emptyState(doc, "Nenhuma triagem neonatal realizada encontrada para o periodo selecionado.");
    } else {
      data.sections.neonatal.forEach((item) =>
        itemBlock(doc, item.label, [`Realizado em: ${formatDate(item.completedAt)}`]),
      );
    }
  }

  if (data.includedSections.includes("development")) {
    sectionTitle(doc, "Marcos de desenvolvimento", "Marcos com avaliacao registrada.");
    if (data.sections.development.length === 0) {
      emptyState(
        doc,
        "Nenhum marco de desenvolvimento com avaliacao registrada para o periodo selecionado.",
      );
    } else {
      data.sections.development.forEach((item) =>
        itemBlock(doc, item.title, [
          `Faixa etaria: ${item.ageBand}`,
          `Status: ${item.status}`,
          `Data da avaliacao: ${formatDate(item.checkedAt)}`,
        ]),
      );
    }
  }

  if (data.includedSections.includes("clinical")) {
    sectionTitle(doc, "Consultas e intercorrencias", "Acompanhamentos clinicos do periodo.");
    if (data.sections.clinical.length === 0) {
      emptyState(doc, "Nenhum acompanhamento clinico encontrado para o periodo selecionado.");
    } else {
      data.sections.clinical.forEach((item) =>
        itemBlock(
          doc,
          item.title,
          [`Data: ${formatDate(item.date)}`, `Categoria: ${item.category}`],
          item.description,
        ),
      );
    }
  }

  if (data.includedSections.includes("exams")) {
    sectionTitle(doc, "Exames e anexos", "Exames vinculados aos acompanhamentos selecionados.");
    if (data.sections.exams.length === 0) {
      emptyState(doc, "Nenhum exame encontrado para o periodo selecionado.");
    } else {
      data.sections.exams.forEach((item) =>
        itemBlock(
          doc,
          item.title,
          [
            `Data do exame: ${formatDate(item.examDate)}`,
            `Vinculado a: ${item.followUpTitle} (${formatDate(item.followUpDate)})`,
          ],
          item.notes,
        ),
      );
    }
  }

  const screeningLabels = NEWBORN_SCREENINGS.map((item) => item.label).join(", ");
  const developmentAgeBands = DEVELOPMENT_AGE_BANDS.map((item) => item.label).join(", ");
  ensureSpace(doc, 100);
  doc
    .moveDown(0.5)
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#6b7280")
    .text(
      `Legenda interna: Triagens consideradas (${screeningLabels}). Faixas de desenvolvimento monitoradas (${developmentAgeBands}).`,
    );

  doc.end();
  return pdfBuffer;
}
