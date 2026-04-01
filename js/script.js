document.addEventListener("DOMContentLoaded", () => {
  // Selección de inputs
  const inputs = [
    "tasaBCV",
    "tasaUSDt",
    "montoUSD",
    "comisionPct",
    "f1",
    "f2",
    "tasaMayor50",
  ];
  const fields = {};
  inputs.forEach((id) => (fields[id] = document.getElementById(id)));

  const tasaPromedioDisp = document.getElementById("tasaPromedio");
  const tasaEstimadaDisp = document.getElementById("tasaEstimada");
  const tasaMenor50Disp = document.getElementById("tasaMenor50");
  const btnCalcular = document.getElementById("btnCalcular");

  // Función para actualizar cálculos automáticos mientras se escribe
  const updateAutomatedFields = () => {
    const bcv = parseFloat(fields.tasaBCV.value) || 0;
    const usdt = parseFloat(fields.tasaUSDt.value) || 0;
    const f1 = parseFloat(fields.f1.value) || 0;
    const f2 = parseFloat(fields.f2.value) || 0;
    const mayor50 = parseFloat(fields.tasaMayor50.value) || 0;

    // 1. Tasa Promedio
    const promedio = (bcv + usdt) / 2;
    tasaPromedioDisp.value = promedio.toFixed(4);

    // 2. Tasa Estimada
    if (promedio > 0) {
      const diferenciaPct = (Math.abs(usdt - bcv) / promedio) * 100;
      let estimada = 0;

      if (diferenciaPct < 0.5) {
        estimada = promedio + (usdt - promedio) * f1;
      } else {
        estimada = promedio + (usdt - promedio) * f2;
      }
      tasaEstimadaDisp.value = estimada.toFixed(4);
    }

    // 3. Tasa < 50$
    if (mayor50 > 0) {
      tasaMenor50Disp.value = (mayor50 - 15).toFixed(2);
    } else {
      tasaMenor50Disp.value = "";
    }
  };

  // Escuchar cambios en los inputs para actualizar automáticos
  inputs.forEach((id) => {
    fields[id].addEventListener("input", updateAutomatedFields);
  });

  // Lógica del botón Calcular
  btnCalcular.addEventListener("click", () => {
    const montoUSD = parseFloat(fields.montoUSD.value) || 0;
    const comisionPct = parseFloat(fields.comisionPct.value) || 0;
    const mayor50 = parseFloat(fields.tasaMayor50.value) || 0;
    const menor50 = parseFloat(tasaMenor50Disp.value) || 0;

    if (montoUSD <= 0 || mayor50 <= 0) {
      alert("Por favor, ingrese el Monto $ y la Tasa >= 50$");
      return;
    }

    // Determinar Tasa a usar
    const tasaFinal = montoUSD >= 50 ? mayor50 : menor50;

    // Cálculos finales
    const montoBs = montoUSD * tasaFinal;
    const comisionBs = montoBs * (comisionPct / 100);
    const totalBs = montoBs + comisionBs;

    // Mostrar resultados
    document.getElementById("resMontoBs").innerText = montoBs.toLocaleString(
      "es-VE",
      { minimumFractionDigits: 2 },
    );
    document.getElementById("resComisionBs").innerText =
      comisionBs.toLocaleString("es-VE", { minimumFractionDigits: 2 });
    document.getElementById("resTotalBs").innerText = totalBs.toLocaleString(
      "es-VE",
      { minimumFractionDigits: 2 },
    );

    document.getElementById("resultado").style.display = "block";
  });
});

// --- LÓGICA DE REGISTROS Y GANANCIA ---

const btnRegistrar = document.getElementById("btn-registrar");
const btnBorrarTodo = document.getElementById("btn-borrar-todo");
const listaRegistros = document.getElementById("lista-registros");

// Cargar datos guardados al iniciar
renderTabla();

btnRegistrar.addEventListener("click", () => {
  // Captura de datos de la sección superior e inferior
  const montoUSD = parseFloat(document.getElementById("montoUSD").value) || 0;
  const tasaMayor50 =
    parseFloat(document.getElementById("tasaMayor50").value) || 0;
  const tasaMenor50 =
    parseFloat(document.getElementById("tasaMenor50").value) || 0;

  // Captura de datos de ganancia
  const tasaZelle = parseFloat(document.getElementById("tasaZelle").value) || 0;
  const tasaBsUsdt =
    parseFloat(document.getElementById("tasaBsUsdt").value) || 0;
  const comisionUsdt =
    parseFloat(document.getElementById("comisionUsdt").value) || 0;

  if (montoUSD === 0 || tasaBsUsdt === 0) {
    alert("Faltan datos para procesar el registro (Monto $ o Tasas)");
    return;
  }

  // Cálculos requeridos
  const tasaUsada = montoUSD >= 50 ? tasaMayor50 : tasaMenor50;
  const montoTotalBs = montoUSD * tasaUsada; // Simplificado para el registro

  const montoUSDt = montoUSD * tasaZelle;
  const cambioUSDt = montoTotalBs / tasaBsUsdt;
  const gananciaUSDt = montoUSDt - cambioUSDt - comisionUsdt;
  const gananciaPct = montoUSDt !== 0 ? (gananciaUSDt / montoUSDt) * 100 : 0;

  // Crear objeto de registro
  const registro = {
    fecha: new Date().toLocaleString(),
    monto: montoUSD,
    tasa: tasaUsada,
    totalBs: montoTotalBs,
    montoUsdt: montoUSDt,
    cambioUsdt: cambioUSDt,
    ganancia: gananciaUSDt,
    pct: gananciaPct,
  };

  // Guardar en localStorage
  const historial = JSON.parse(
    localStorage.getItem("historial_cambios") || "[]",
  );
  historial.push(registro);
  localStorage.setItem("historial_cambios", JSON.stringify(historial));

  renderTabla();
});

// Función para renderizar la tabla desde LocalStorage
function renderTabla() {
  const listaRegistros = document.getElementById("lista-registros");
  // Obtenemos el historial (sin revertir aún para mantener los índices originales)
  const historial = JSON.parse(
    localStorage.getItem("historial_cambios") || "[]",
  );

  listaRegistros.innerHTML = "";

  // Usamos reverse para mostrar el último arriba, pero guardamos el índice real
  const historialReverse = [...historial]
    .map((data, index) => ({ ...data, originalIndex: index }))
    .reverse();

  historialReverse.forEach((reg) => {
    const colorGanancia = reg.ganancia >= 0 ? "#2ecc71" : "#e74c3c";

    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${reg.fecha}</td>
            <td>${reg.monto.toFixed(2)}</td>
            <td>${reg.tasa.toFixed(2)}</td>
            <td>${reg.totalBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</td>
            <td>${reg.montoUsdt.toFixed(2)}</td>
            <td>${reg.cambioUsdt.toFixed(2)}</td>
            <td style="color: ${colorGanancia}; font-weight: bold;">${reg.ganancia.toFixed(2)}</td>
            <td style="color: ${colorGanancia}">${reg.pct.toFixed(2)}%</td>
            <td>
                <button class="btn-del" onclick="eliminarRegistro(${reg.originalIndex})">X</button>
            </td>
        `;
    listaRegistros.appendChild(tr);
  });
}

// Nueva función para borrar uno a uno
function eliminarRegistro(index) {
  if (confirm("¿Deseas eliminar este registro?")) {
    let historial = JSON.parse(
      localStorage.getItem("historial_cambios") || "[]",
    );

    // Eliminamos el elemento en la posición específica
    historial.splice(index, 1);

    // Guardamos el nuevo arreglo en localStorage
    localStorage.setItem("historial_cambios", JSON.stringify(historial));

    // Refrescamos la tabla
    renderTabla();
  }
}
