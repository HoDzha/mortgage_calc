// Рисуем интерактивный график структуры аннуитетного платежа по времени.

const CHART_COLORS = {
  principal: "rgba(139, 92, 246, 0.75)",
  interest: "rgba(250, 204, 21, 0.75)",
  grid: "rgba(180, 190, 200, 0.5)",
  text: "rgba(71, 85, 105, 0.8)",
  axis: "rgba(148, 163, 184, 0.8)",
  background: "rgba(236, 241, 247, 0.9)",
};

const formatMonthLabel = (isoDate) => {
  // Формируем подпись месяца для tooltip.
  const [year, month] = isoDate.split("-");
  return `${month}.${year}`;
};

const formatYearLabel = (isoDate) => {
  const [year] = isoDate.split("-");
  return year;
};

const formatMoney = (value) => {
  return value
    .toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(/\u00A0/g, " ");
};

const formatMoneyAxis = (value) => {
  return value
    .toLocaleString("ru-RU", { maximumFractionDigits: 0 })
    .replace(/\u00A0/g, " ");
};

const buildChart = () => {
  const dataElement = document.getElementById("schedule-data");
  const canvas = document.getElementById("payment-chart");

  if (!dataElement || !canvas) {
    return;
  }

  const schedule = JSON.parse(dataElement.textContent || "[]");
  if (!Array.isArray(schedule) || schedule.length === 0) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const tooltip = document.getElementById("chart-tooltip");
  const tooltipTitle = document.getElementById("tooltip-title");
  const tooltipPrincipal = document.getElementById("tooltip-principal");
  const tooltipInterest = document.getElementById("tooltip-interest");

  const state = {
    width: 0,
    height: 0,
    padding: { top: 12, right: 16, bottom: 46, left: 70 },
  };

  const resize = () => {
    // Подстраиваем canvas под размеры контейнера и плотность пикселей.
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    state.width = width;
    state.height = height;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawChart(ctx, schedule, state);
  };

  window.addEventListener("resize", resize);
  canvas.addEventListener("mousemove", (event) =>
    handleHover(event, schedule, state, tooltip, tooltipTitle, tooltipPrincipal, tooltipInterest)
  );
  canvas.addEventListener("mouseleave", () => {
    if (tooltip) {
      tooltip.style.opacity = "0";
    }
  });
  resize();
};

const drawChart = (ctx, schedule, state) => {
  // Очищаем холст перед отрисовкой.
  const width = state.width;
  const height = state.height;
  ctx.clearRect(0, 0, width, height);

  const { padding } = state;
  const plotWidth = state.width - padding.left - padding.right;
  const plotHeight = state.height - padding.top - padding.bottom;

  const maxPayment = Math.max(
    ...schedule.map((item) => item.interest + item.principal)
  );

  const xForIndex = (index) =>
    padding.left + (plotWidth * index) / Math.max(schedule.length - 1, 1);
  const yForValue = (value) => padding.top + plotHeight - value;

  // Фон и сетка.
  ctx.fillStyle = CHART_COLORS.background;
  ctx.fillRect(padding.left, padding.top, plotWidth, plotHeight);

  // Рисуем сетку по осям.
  const gridLines = 5;
  ctx.strokeStyle = CHART_COLORS.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= gridLines; i += 1) {
    const y = padding.top + (plotHeight * i) / gridLines;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  // Подписи по оси Y.
  ctx.fillStyle = CHART_COLORS.text;
  ctx.font = "11px 'Manrope', sans-serif";
  for (let i = 0; i <= gridLines; i += 1) {
    const value = maxPayment - (maxPayment * i) / gridLines;
    const y = padding.top + (plotHeight * i) / gridLines;
    const label = formatMoneyAxis(value);
    ctx.fillText(label, 4, y + 4);
  }

  const verticalStep = Math.max(1, Math.floor(schedule.length / 24));
  for (let i = 0; i < schedule.length; i += verticalStep) {
    const x = xForIndex(i);
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();
  }

  // Готовим массивы точек для процентов и тела долга.
  const interestPoints = schedule.map((item, index) => {
    const x = xForIndex(index);
    const heightValue = (item.interest / maxPayment) * plotHeight;
    return { x, y: yForValue(heightValue) };
  });

  const totalPoints = schedule.map((item, index) => {
    const x = xForIndex(index);
    const heightValue =
      ((item.interest + item.principal) / maxPayment) * plotHeight;
    return { x, y: yForValue(heightValue) };
  });

  // Рисуем область процентов (нижний слой).
  ctx.fillStyle = CHART_COLORS.interest;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top + plotHeight);
  interestPoints.forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.lineTo(padding.left + plotWidth, padding.top + plotHeight);
  ctx.closePath();
  ctx.fill();

  // Рисуем область тела долга поверх процентов.
  ctx.fillStyle = CHART_COLORS.principal;
  ctx.beginPath();
  ctx.moveTo(interestPoints[0].x, interestPoints[0].y);
  totalPoints.forEach((point) => ctx.lineTo(point.x, point.y));
  for (let i = interestPoints.length - 1; i >= 0; i -= 1) {
    ctx.lineTo(interestPoints[i].x, interestPoints[i].y);
  }
  ctx.closePath();
  ctx.fill();

  // Ось X.
  ctx.strokeStyle = CHART_COLORS.axis;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top + plotHeight);
  ctx.lineTo(padding.left + plotWidth, padding.top + plotHeight);
  ctx.stroke();

  // Подписи по оси X (годы).
  ctx.fillStyle = CHART_COLORS.text;
  ctx.font = "11px 'Manrope', sans-serif";
  const totalYears = Math.max(1, Math.ceil(schedule.length / 12));
  const yearStep = totalYears > 20 ? 4 : totalYears > 12 ? 3 : 2;
  for (let year = 1; year <= totalYears; year += yearStep) {
    const index = (year - 1) * 12;
    if (index >= schedule.length) {
      break;
    }
    const label = `${year} г.`;
    const x = xForIndex(index);
    ctx.save();
    ctx.translate(x, height - 6);
    ctx.rotate(-Math.PI / 6);
    ctx.fillText(label, -10, 0);
    ctx.restore();
  }
};

const handleHover = (
  event,
  schedule,
  state,
  tooltip,
  tooltipTitle,
  tooltipPrincipal,
  tooltipInterest
) => {
  if (!tooltip) {
    return;
  }

  const rect = event.target.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const { padding } = state;
  const plotWidth = state.width - padding.left - padding.right;
  const clampedX = Math.min(Math.max(x - padding.left, 0), plotWidth);
  const index = Math.round((clampedX / plotWidth) * (schedule.length - 1));
  const row = schedule[index];

  if (!row) {
    tooltip.style.opacity = "0";
    return;
  }

  tooltipTitle.textContent = formatMonthLabel(row.date);
  tooltipPrincipal.textContent = `${formatMoney(row.principal)} ₽`;
  tooltipInterest.textContent = `${formatMoney(row.interest)} ₽`;

  const chartRect = event.target.getBoundingClientRect();
  const tooltipWidth = tooltip.offsetWidth || 180;
  const tooltipHeight = tooltip.offsetHeight || 60;
  const margin = 8;
  const pointX = padding.left + (plotWidth * index) / Math.max(schedule.length - 1, 1);
  const pointY = padding.top + 10;

  const maxLeft = chartRect.width - tooltipWidth - margin;
  const maxTop = chartRect.height - tooltipHeight - margin;

  const left = Math.min(Math.max(pointX - tooltipWidth / 2, margin), maxLeft);
  const top = Math.min(Math.max(pointY - tooltipHeight, margin), maxTop);

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.style.opacity = "1";
};

document.addEventListener("DOMContentLoaded", buildChart);
