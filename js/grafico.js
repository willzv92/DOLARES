let chartInstance = null;

export function actualizarGrafico(registros) {
  if (typeof Chart === "undefined") return;
  const canvas = document.getElementById("graficoGanancias");
  if (!canvas) return;

  const gananciasPorMes = {};
  registros.forEach((reg) => {
    const fecha = new Date(reg.timestamp);
    const mesAnio = fecha.toLocaleString("es-ES", {
      month: "short",
      year: "2-digit",
    });
    gananciasPorMes[mesAnio] = (gananciasPorMes[mesAnio] || 0) + reg.ganancia;
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
