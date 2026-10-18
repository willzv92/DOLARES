import { ensurePdfLibs } from "./pdfLibs.js";
import { fechaLegible, formatearSoloFecha } from "./fechas.js";

const AZUL_OSCURO = [10, 25, 47];
const DORADO = [197, 160, 89];
const DORADO_CLARO = [243, 207, 122];
const TEXTO_CLARO = [230, 241, 255];

export async function exportarInformePDF(registros) {
  if (!registros.length) {
    throw new Error("No hay registros para exportar");
  }

  // jsPDF + AutoTable: se descargan ahora, en orden y con espejos de CDN.
  // Si falla, pdfLibs ya dejó el detalle (URL, motivo) en la consola.
  await ensurePdfLibs();

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();

  // --- Encabezado con banda de color ---
  doc.setFillColor(...AZUL_OSCURO);
  doc.rect(0, 0, anchoPagina, 34, "F");
  doc.setDrawColor(...DORADO);
  doc.setLineWidth(0.5);
  doc.line(0, 34, anchoPagina, 34);

  doc.setTextColor(...DORADO);
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("Historial de Operaciones - " + new Date().getFullYear(), 14, 16);

  doc.setTextColor(...TEXTO_CLARO);
  doc.setFont(undefined, "normal");
  doc.setFontSize(9);
  // Periodo del informe: recorrido simple, sin depender de que todos tengan timestamp
  let primeraMs = Infinity;
  let ultimaMs = -Infinity;
  for (const reg of registros) {
    const ms = Number(reg.timestamp);
    if (!Number.isFinite(ms)) continue;
    if (ms < primeraMs) primeraMs = ms;
    if (ms > ultimaMs) ultimaMs = ms;
  }
  const primera = Number.isFinite(primeraMs) ? formatearSoloFecha(primeraMs) : "—";
  const ultima = Number.isFinite(ultimaMs) ? formatearSoloFecha(ultimaMs) : "—";
  doc.text(`Periodo: ${primera} - ${ultima}`, 14, 23);
  doc.text(`Generado: ${formatearSoloFecha(Date.now())}`, 14, 28);

  // --- Gráfico capturado del canvas ---
  const canvas = document.getElementById("graficoGanancias");
  let yCursor = 40;
  if (canvas) {
    doc.setFont(undefined, "bold");
    doc.setTextColor(...AZUL_OSCURO);
    doc.setFontSize(11);
    doc.text("Ganancias Mensuales (USDt)", 14, yCursor);
    yCursor += 3;

    const imgData = canvas.toDataURL("image/png", 1.0);
    const imgAncho = anchoPagina - 28;
    const imgAlto = Math.min((canvas.height / canvas.width) * imgAncho, 70);
    doc.addImage(imgData, "PNG", 14, yCursor, imgAncho, imgAlto);
    yCursor += imgAlto + 8;
  }

  // --- Tabla de registros ---
  doc.setFont(undefined, "bold");
  doc.setTextColor(...AZUL_OSCURO);
  doc.setFontSize(11);
  doc.text(`Registros (${registros.length})`, 14, yCursor);
  yCursor += 2;

  const body = registros.map((r) => [
    fechaLegible(r),
    r.monto.toFixed(2),
    r.tasa.toFixed(2),
    r.totalBs.toLocaleString("es-VE", { minimumFractionDigits: 2 }),
    r.montoUsdt.toFixed(2),
    r.cambioUsdt.toFixed(2),
    r.ganancia.toFixed(2),
    r.pct.toFixed(2) + "%",
  ]);

  doc.autoTable({
    startY: yCursor,
    head: [
      [
        "Fecha / Hora",
        "Monto $",
        "Tasa",
        "Total Bs",
        "Monto USDt",
        "Cambio USDt",
        "Ganancia",
        "%",
      ],
    ],
    body,
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 1.6, textColor: [20, 30, 50] },
    headStyles: { fillColor: AZUL_OSCURO, textColor: DORADO_CLARO, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [236, 242, 255] },
    columnStyles: {
      0: { cellWidth: 32 },
      6: { fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 6) {
        const valor = parseFloat(data.cell.raw);
        data.cell.styles.textColor = valor >= 0 ? [46, 204, 113] : [231, 76, 60];
      }
    },
    margin: { left: 14, right: 14 },
  });

  // --- Totales ---
  const gananciaTotal = registros.reduce((s, r) => s + r.ganancia, 0);
  const montoTotalBs = registros.reduce((s, r) => s + r.totalBs, 0);
  const montoTotalUSD = registros.reduce((s, r) => s + r.monto, 0);
  let yTotales = doc.lastAutoTable.finalY + 6;

  if (yTotales > altoPagina - 25) {
    doc.addPage();
    yTotales = 20;
  }

  doc.setFillColor(...AZUL_OSCURO);
  doc.rect(14, yTotales, anchoPagina - 28, 14, "F");
  doc.setDrawColor(...DORADO);
  doc.rect(14, yTotales, anchoPagina - 28, 14, "S");

  doc.setTextColor(...DORADO_CLARO);
  doc.setFont(undefined, "bold");
  doc.setFontSize(9);
  doc.text(`Total $: ${montoTotalUSD.toFixed(2)}`, 18, yTotales + 6);
  doc.text(`Total Bs: ${montoTotalBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`, 18, yTotales + 11);

  const colorGanancia = gananciaTotal >= 0 ? [46, 204, 113] : [231, 76, 60];
  doc.setTextColor(...colorGanancia);
  doc.text(`Ganancia total: ${gananciaTotal.toFixed(2)} USDt`, anchoPagina - 18, yTotales + 8, {
    align: "right",
  });

  // --- Pie de página en todas las hojas ---
  const totalPaginas = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setTextColor(140, 150, 170);
    doc.setFontSize(7.5);
    doc.setFont(undefined, "normal");
    doc.text(
      `Calculadora de Divisas - Página ${i} de ${totalPaginas}`,
      anchoPagina / 2,
      altoPagina - 6,
      { align: "center" },
    );
  }

  doc.save(`informe_dolares_${new Date().getFullYear()}.pdf`);
  return true;
}
