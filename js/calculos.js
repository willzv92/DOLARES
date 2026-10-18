export function calcularBrecha(bcv, usdt) {
  if (bcv <= 0) return null;
  return (Math.abs(usdt - bcv) / bcv) * 100;
}

export function calcularTasaPromedio(bcv, usdt) {
  return (bcv + usdt) / 2;
}

export function calcularTasaEstimada(bcv, usdt, f1, f2) {
  const brecha = calcularBrecha(bcv, usdt);
  if (brecha === null) return null;
  const promedio = calcularTasaPromedio(bcv, usdt);
  const factor = brecha < 50 ? f1 : f2;
  return promedio + (usdt - promedio) * factor;
}

export function calcularTasaMenor50(mayor50) {
  return mayor50 > 0 ? mayor50 - 15 : null;
}

export function tasaAplicable(montoUSD, mayor50, menor50) {
  return montoUSD >= 50 ? mayor50 : menor50;
}

export function calcularResumenBs(montoUSD, tasa, comisionPct) {
  const montoBs = montoUSD * tasa;
  const comisionBs = montoBs * (comisionPct / 100);
  const totalBs = montoBs + comisionBs;
  return { montoBs, comisionBs, totalBs };
}

export function calcularOperacion({
  montoUSD,
  tasaUsada,
  tasaZelle,
  tasaBsUsdt,
  comisionUsdt,
  comisionPct,
}) {
  const totalBs = montoUSD * tasaUsada;
  const comisionBs = totalBs * (comisionPct / 100);
  const montoUsdt = montoUSD / tasaZelle;
  const cambioUsdt = (totalBs + comisionBs) / tasaBsUsdt;
  const ganancia = montoUsdt - cambioUsdt - comisionUsdt;
  const pct = montoUsdt !== 0 ? (ganancia / montoUsdt) * 100 : 0;
  return { totalBs, montoUsdt, cambioUsdt, ganancia, pct };
}
