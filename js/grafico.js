import { LOCALE_FECHAS } from "./fechas.js";

let chartInstance = null;

// Se construye una sola vez y con locale explícito, igual que en la tabla y el PDF
const fmtMes = new Intl.DateTimeFormat(LOCALE_FECHAS, {
  month: "short",
  year: "2-digit",
});

export function actualizarGrafico(registros) {
  if (typeof Chart === "undefined") return;
  const canvas = document.getElementById("graficoGanancias");
  if (!canvas) return;

  const gananciasPorMes = {};
  registros.forEach((reg) => {
    const ms = Number(reg.timestamp);
    if (!Number.isFinite(ms)) return; // registro sin fecha válida: no ensuciar el eje
    const mesAnio = fmtMes.format(new Date(ms));
    gananciasPorMes[mesAnio] = (gananciasPorMes[mesAnio] || 0) + (reg.ganancia || 0);
  });

  const etiquetas = Object.keys(gananciasPorMes).reverse();
  const datos = Object.values(gananciasPorMes).reverse();

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: etiquetas,
      datasets: [
        {
          label: "Ganancia USDt",
          data: datos,
          backgroundColor: "#c5a059",
          borderRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, grid: { color: "#233554" } },
        x: { grid: { display: false } },
      },
      plugins: { legend: { display: false } },
    },
  });
}
