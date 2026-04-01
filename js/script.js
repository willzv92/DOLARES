document.addEventListener("DOMContentLoaded", () => {
  const fields = {
    tasaBCV: document.getElementById("tasaBCV"),
    tasaUSDt: document.getElementById("tasaUSDt"),
    montoUSD: document.getElementById("montoUSD"),
    comisionPct: document.getElementById("comisionPct"),
    f1: document.getElementById("f1"),
    f2: document.getElementById("f2"),
    tasaPromedio: document.getElementById("tasaPromedio"),
    tasaEstimada: document.getElementById("tasaEstimada"),
    tasaMayor50: document.getElementById("tasaMayor50"),
    tasaMenor50: document.getElementById("tasaMenor50"),
  };

  const statusText = document.getElementById("load-status");
  const btnCalcular = document.getElementById("btn-calcular");
  const btnSync = document.getElementById("btn-sync");

  // --- NUEVA FUNCIÓN DE SINCRONIZACIÓN (Más estable) ---
  async function fetchTasas() {
    statusText.innerText = "Sincronizando tasas...";

    // Intentaremos con dos fuentes diferentes por si una falla
    const fuentes = [
      "https://pydolarve.org/api/v1/dollar?page=enparalelovzla",
      "https://criptodolar.net/api/v1/quotes/usd/veb",
    ];

    let exito = false;

    for (let url of fuentes) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Error en respuesta");
        const data = await response.json();

        // Lógica para pydolarve (Fuente 1)
        if (data.monitors) {
          fields.tasaBCV.value = data.monitors.bcv?.price || 0;
          fields.tasaUSDt.value = data.monitors.enparalelovzla?.price || 0;
        }
        // Lógica para CriptoDolar (Fuente 2)
        else if (Array.isArray(data)) {
          const bcv = data.find((m) => m.monitor.includes("BCV"));
          const paralelo = data.find((m) =>
            m.monitor.includes("EnParaleloVzla"),
          );
          if (bcv) fields.tasaBCV.value = bcv.price;
          if (paralelo) fields.tasaUSDt.value = paralelo.price;
        }

        statusText.innerText =
          "Sincronizado: " + new Date().toLocaleTimeString();
        exito = true;
        calculateAutoFields();
        break; // Si tuvo éxito, salimos del bucle
      } catch (e) {
        console.warn(`Fallo en fuente ${url}:`, e);
      }
    }

    if (!exito) {
      statusText.innerText = "Error de conexión. Ingrese tasas manualmente.";
      // Valores por defecto si falla todo para que no quede vacío
      if (!fields.tasaBCV.value) fields.tasaBCV.value = "";
      if (!fields.tasaUSDt.value) fields.tasaUSDt.value = "";
    }
  }

  // --- LÓGICA DE CÁLCULOS (Tu requerimiento original) ---
  function calculateAutoFields() {
    const bcv = parseFloat(fields.tasaBCV.value) || 0;
    const usdt = parseFloat(fields.tasaUSDt.value) || 0;
    const f1 = parseFloat(fields.f1.value) || 0;
    const f2 = parseFloat(fields.f2.value) || 0;
    const mayor50 = parseFloat(fields.tasaMayor50.value) || 0;

    // Tasa Promedio: (BCV + USDt) / 2
    const promedio = (bcv + usdt) / 2;
    fields.tasaPromedio.value = promedio > 0 ? promedio.toFixed(4) : "";

    // Tasa Estimada (Lógica condicional requerida)
    if (promedio > 0) {
      const diferenciaPct = (Math.abs(usdt - bcv) / promedio);
      let estimada;

      // Requerimiento c: Si % < 0.5 usa f1, sino f2
      if (diferenciaPct < 0.5) {
        estimada = promedio + (usdt - promedio) * f1;
      } else {
        estimada = promedio + (usdt - promedio) * f2;
      }
      fields.tasaEstimada.value = estimada.toFixed(4);
    }

    // Tasa < 50$ (Requerimiento d: Tasa >= 50$ - 15)
    if (mayor50 > 0) {
      fields.tasaMenor50.value = (mayor50 - 15).toFixed(2);
    } else {
      fields.tasaMenor50.value = "";
    }
  }

  // --- CÁLCULO AL PRESIONAR BOTÓN ---
  btnCalcular.addEventListener("click", () => {
    const montoUSD = parseFloat(fields.montoUSD.value) || 0;
    const comisionPct = parseFloat(fields.comisionPct.value) || 0;
    const mayor50 = parseFloat(fields.tasaMayor50.value) || 0;
    const menor50 = parseFloat(fields.tasaMenor50.value) || 0;

    if (montoUSD <= 0 || mayor50 <= 0) {
      alert("⚠️ Por favor ingresa el Monto $ y la Tasa >= 50$");
      return;
    }

    // Requerimiento e: Selección de Tasa según monto
    const tasaAplicada = montoUSD >= 50 ? mayor50 : menor50;

    // Requerimiento f: Cálculo de registro
    const montoBs = montoUSD * tasaAplicada;
    const comisionBancaria = montoBs * (comisionPct / 100);
    const montoTotalBs = montoBs + comisionBancaria;

    // Formateo y Salida
    document.getElementById("outMontoBs").innerText = montoBs.toLocaleString(
      "es-VE",
      { minimumFractionDigits: 2 },
    );
    document.getElementById("outComisionBs").innerText =
      comisionBancaria.toLocaleString("es-VE", { minimumFractionDigits: 2 });
    document.getElementById("outTotalBs").innerText =
      montoTotalBs.toLocaleString("es-VE", { minimumFractionDigits: 2 });

    document.getElementById("result-card").style.display = "block";
  });

  // Escuchadores de eventos
  [
    fields.tasaBCV,
    fields.tasaUSDt,
    fields.f1,
    fields.f2,
    fields.tasaMayor50,
  ].forEach((el) => {
    el.addEventListener("input", calculateAutoFields);
  });

  btnSync.addEventListener("click", fetchTasas);

  // Iniciar al cargar
  fetchTasas();
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

  const montoUSDt = montoUSD / tasaZelle;
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
// Nota: Asegúrate de llamar a renderTabla() dentro de tu lógica
// después de guardar un nuevo registro.
