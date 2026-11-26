/**
 * Lógica y renderizado interactivo del Historial de Pedidos al Proveedor (Parfums)
 * Con sincronización en tiempo real desde Firestore y la Planilla de Ventas
 * Notes & Sillage
 */

import {
  getSalesHistory,
  subscribeToSales,
  getBalancesConfig
} from "./firebase-config.js";

// Dataset base oficial extraído de PEDIDOS.TXT (Pedidos 1 al 6, hasta 08-11-2026)
const BASE_HISTORIAL_PEDIDOS = Array.isArray(window.HISTORIAL_PEDIDOS)
  ? [...window.HISTORIAL_PEDIDOS]
  : [];

// Estado global de pedidos
let pedidosData = [...BASE_HISTORIAL_PEDIDOS];
let currentMonthFilter = "ALL"; // 'ALL', '2026-10', '2026-11', etc.
let currentBalancesConfig = null;
let liveSalesList = [];

// Elementos DOM
const kpiTotalInversionEl = document.getElementById("kpiTotalInversion");
const kpiTotalPedidosEl = document.getElementById("kpiTotalPedidos");
const kpiTotalUnidadesEl = document.getElementById("kpiTotalUnidades");
const kpiTotalRegalosEl = document.getElementById("kpiTotalRegalos");
const kpiPromedioPedidoEl = document.getElementById("kpiPromedioPedido");

const monthFilterChipsEl = document.getElementById("monthFilterChips");
const containerOrdersView = document.getElementById("containerOrdersView");
const themeToggleBtn = document.getElementById("btnToggleTheme");

// Elementos de colapso de métricas
const btnTogglePedidosKpi = document.getElementById("btnTogglePedidosKpi");
const btnTogglePedidosKpiText = document.getElementById("btnTogglePedidosKpiText");
const iconTogglePedidosKpi = document.getElementById("iconTogglePedidosKpi");
const pedidosKpiBody = document.getElementById("pedidosKpiBody");
const pedidosKpiSection = document.getElementById("pedidosKpiSection");

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const dayNames = [
  "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"
];

// Control de lotes con Descuento de Proveedor los Martes (10%)
function getSavedTuesdayBatches() {
  try {
    const raw = localStorage.getItem("notes_tuesday_batches");
    return new Set(raw ? JSON.parse(raw) : ["2026-11-18", "2026-11-17"]);
  } catch (e) {
    return new Set(["2026-11-18", "2026-11-17"]);
  }
}

function persistTuesdayBatches(batchesSet) {
  try {
    localStorage.setItem("notes_tuesday_batches", JSON.stringify([...batchesSet]));
  } catch (e) {}
}

// Control de acordeones colapsados / expandidos por interacción del usuario
const userExpandedCards = new Set();
const userCollapsedCards = new Set();

function isOrderCardExpanded(orderId) {
  if (userExpandedCards.has(orderId)) return true;
  if (userCollapsedCards.has(orderId)) return false;

  // Por defecto: Si está en celular (<= 768px) aparece colapsado, si está en PC (> 768px) aparece abierto
  const isMobile = window.innerWidth <= 768;
  return !isMobile;
}

// Normaliza el slug del estado de cada perfume en la venta
function getStatusSlug(estado) {
  const norm = String(estado || "").toLowerCase().trim();
  if (norm.includes("carrito") || norm.includes("carro")) return "encarrito";
  if (norm.includes("faltante") || norm.includes("sin stock") || norm.includes("agotado")) return "faltante";
  if (norm.includes("cancelad")) return "cancelado";
  if (norm.includes("entreg")) return "entregado";
  if (norm.includes("recep")) return "recepcionado";
  if (norm.includes("recib") || norm.includes("listo")) return "recibido";
  if (norm.includes("camino") || norm.includes("despach") || norm.includes("enviado")) return "encamino";
  if (norm.includes("pedid") || norm.includes("solicit") || norm.includes("comprad")) return "pedido";
  return "pendiente";
}

// Formatea montos en pesos chilenos
function formatCLP(val) {
  return `$${Math.round(Number(val) || 0).toLocaleString("es-CL")}`;
}

// Limpia el estado del pedido para que sea una sola palabra clara
function getCleanStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("recep")) return "Recepcionado";
  if (s.includes("recib")) return "Recibido";
  if (s.includes("entreg")) return "Entregado";
  if (s.includes("factur")) return "Facturado";
  if (s.includes("pedid")) return "Pedido";
  return "Facturado";
}

// Extrae el título de fecha y el día de la semana de forma limpia y sin duplicados
function getOrderDateInfo(order) {
  let dayOfWeek = "";
  let legibleDate = "";

  if (order.date) {
    const parts = String(order.date).split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const mIdx = parseInt(parts[1], 10) - 1;
      const day = parts[2].padStart(2, '0');
      const dObj = new Date(Number(year), mIdx, Number(day), 12, 0, 0);
      dayOfWeek = dayNames[dObj.getDay()] || "";
      const mName = monthNames[mIdx] || "";
      legibleDate = `${parseInt(day, 10)} de ${mName} ${year}`;
    }
  }

  if (!legibleDate && order.dateFull) {
    const splitFull = order.dateFull.split("(")[0].trim();
    legibleDate = splitFull;
  }

  return {
    dayOfWeek: dayOfWeek || (order.dateFull ? order.dateFull.split(",")[0].trim() : ""),
    dateTitle: legibleDate || order.title || "Pedido"
  };
}

/**
 * Procesa las ventas registradas en Firestore y construye los lotes
 * de pedidos al proveedor realizados desde el 09-11-2026 en adelante.
 */
function buildOrdersFromSales(salesList) {
  if (!Array.isArray(salesList) || salesList.length === 0) return [];

  const rows = [];
  salesList.forEach(sale => {
    const clientName = sale.cliente?.nombre || "";
    const items = sale.items && sale.items.length > 0 ? sale.items : [
      {
        code: sale.codigoVenta || "S/C",
        name: "Venta registrada",
        size: "100 ml",
        qty: sale.totales?.totalUnidades || 1,
        unitPrice: sale.totales?.totalVenta || 0,
        unitCost: sale.totales?.totalCosto || 0
      }
    ];

    items.forEach(item => {
      const slug = getStatusSlug(item.estado || sale.estado);
      // Solo perfumes que efectivamente fueron pedidos, recepcionados o entregados
      const isOrdered = slug === "pedido" || slug === "entregado" || slug === "recibido" || slug === "recepcionado" || slug === "encamino";
      if (!isOrdered) return;

      // Extraer fecha original de la venta para respetar el corte histórico (<= 2026-11-08)
      let saleDateStr = "";
      if (sale.fechaISO) {
        saleDateStr = sale.fechaISO.slice(0, 10);
      } else if (sale.createdAtDate && sale.createdAtDate.toISOString) {
        saleDateStr = sale.createdAtDate.toISOString().slice(0, 10);
      } else if (sale.fechaLegible) {
        const parts = String(sale.fechaLegible).split(",")[0].trim().replace(/\//g, "-").split("-");
        if (parts.length === 3 && parts[2].length === 4) {
          saleDateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      if (saleDateStr && saleDateStr <= "2026-11-08") return;

      // Obtener fecha del lote o de la venta
      const batchDate = item.fechaPedidoProveedor || sale.fechaPedidoProveedor || saleDateStr;

      // Las ventas del 08-11-2026 hacia atrás ya están registradas en BASE_HISTORIAL_PEDIDOS
      if (!batchDate || batchDate <= "2026-11-08") return;

      const qty = Number(item.qty) || 1;
      const unitCost = Number(item.unitCost) || 0;
      const isGift = Boolean(
        item.isGift ||
        unitCost === 0 ||
        (item.name && item.name.toLowerCase().includes("[regalo]")) ||
        (item.name && item.name.toLowerCase().includes("[puntos]"))
      );

      // Normalizar formato de tamaño (ej. "50 ML")
      let sizeStr = (item.size || "100 ml").toUpperCase().trim();
      if (!sizeStr.includes(" ") && sizeStr.endsWith("ML")) {
        sizeStr = sizeStr.replace("ML", " ML");
      }

      rows.push({
        saleId: sale.id,
        codigoVenta: sale.codigoVenta || "",
        clientName: clientName,
        code: item.code || "-",
        name: item.name || "Sin nombre",
        size: sizeStr,
        qty: qty,
        unitCost: isGift ? 0 : unitCost,
        subtotal: isGift ? 0 : (unitCost * qty),
        isGift: isGift,
        estado: item.estado || sale.estado || "Pedido",
        batchDate: batchDate
      });
    });
  });

  if (rows.length === 0) return [];

  // Agrupar filas por batchDate
  const batchesMap = {};
  rows.forEach(r => {
    if (!batchesMap[r.batchDate]) {
      batchesMap[r.batchDate] = [];
    }
    batchesMap[r.batchDate].push(r);
  });

  const tuesdayBatches = getSavedTuesdayBatches();
  const getNumCfg = (v, fb) => (v !== undefined && v !== null && v !== "" && Number.isFinite(Number(v))) ? Number(v) : fb;
  const discountPct = getNumCfg(currentBalancesConfig?.descuentoMartesPorcentaje, 10);
  const minShipping = getNumCfg(currentBalancesConfig?.envioGratisMinimo, 120000);
  const shippingFeeAmt = getNumCfg(currentBalancesConfig?.costoEnvioFijo, 6000);

  // Determinar número correlativo de pedidos por mes partiendo de los base
  const baseCountByMonth = {};
  BASE_HISTORIAL_PEDIDOS.forEach(o => {
    baseCountByMonth[o.monthKey] = Math.max(baseCountByMonth[o.monthKey] || 0, o.orderNumber || 0);
  });

  const sortedDates = Object.keys(batchesMap).sort(); // Orden cronológico para numeración
  const newOrders = [];

  sortedDates.forEach(dateStr => {
    const bRows = batchesMap[dateStr];
    const parts = dateStr.split("-");
    const year = parts[0];
    const mIdx = parseInt(parts[1], 10) - 1;
    const day = parts[2];
    const monthKey = `${year}-${parts[1]}`;
    const monthName = `${monthNames[mIdx]} ${year}`;

    // Incrementar correlativo
    baseCountByMonth[monthKey] = (baseCountByMonth[monthKey] || 0) + 1;
    const orderNum = baseCountByMonth[monthKey];

    // Día de la semana y fecha completa
    const dObj = new Date(Number(year), mIdx, Number(day), 12, 0, 0);
    const dayOfWeek = dayNames[dObj.getDay()];
    const dateFull = `${dayOfWeek}, ${day} de ${monthNames[mIdx]} ${year}`;

    // Consolidar ítems del lote
    const itemsMap = {};
    bRows.forEach(r => {
      const key = `${r.code}___${r.size}___${r.isGift ? 'GIFT' : r.unitCost}`;
      if (!itemsMap[key]) {
        itemsMap[key] = {
          sku: r.code,
          code: r.code,
          name: r.name,
          size: r.size,
          qty: 0,
          unitPrice: r.unitCost,
          subtotal: 0,
          isGift: r.isGift,
          status: r.isGift ? "Regalo ($0)" : (r.estado || "Facturado"),
          clients: []
        };
      }
      itemsMap[key].qty += r.qty;
      itemsMap[key].subtotal += r.subtotal;
      if (r.clientName) {
        itemsMap[key].clients.push(r.clientName + (r.codigoVenta ? ` (#${r.codigoVenta})` : ''));
      }
    });

    const items = Object.values(itemsMap).map(it => ({
      ...it,
      clientsText: it.clients.join(", ")
    }));

    const totalItems = items.reduce((sum, it) => sum + it.qty, 0);
    const giftItems = items.filter(it => it.isGift).reduce((sum, it) => sum + it.qty, 0);
    const totalCostBase = items.reduce((sum, it) => sum + it.subtotal, 0);

    // Calcular descuento de martes (editable mediante checkbox de usuario)
    const isTuesday = tuesdayBatches.has(dateStr);
    const discountAmt = isTuesday ? Math.round(totalCostBase * (discountPct / 100)) : 0;
    const costAfterDiscount = totalCostBase - discountAmt;

    // Calcular flete
    const hasFreeShipping = costAfterDiscount >= minShipping;
    const shippingFee = (totalCostBase > 0 && !hasFreeShipping) ? shippingFeeAmt : 0;
    const totalPaid = costAfterDiscount + shippingFee;

    // Notas explicativas
    const notesArr = [];
    if (isTuesday) {
      notesArr.push(`Descuento Martes -${discountPct}% (-$${discountAmt.toLocaleString("es-CL")})`);
    }
    if (shippingFee > 0) {
      notesArr.push(`Flete: +$${shippingFee.toLocaleString("es-CL")} (compra menor a $${minShipping.toLocaleString("es-CL")})`);
    } else if (totalCostBase > 0) {
      notesArr.push("Envío gratis alcanzado ✓");
    }
    notesArr.push("Pedido generado y sincronizado automáticamente desde Planilla de Ventas");

    const orderObj = {
      id: `PED-VENTAS-${dateStr}`,
      orderNumber: orderNum,
      webOrderId: null,
      monthKey: monthKey,
      monthName: monthName,
      title: `Pedido #${orderNum} de ${monthNames[mIdx]} — ${day} de ${monthNames[mIdx]} ${year}`,
      date: dateStr,
      time: "12:00",
      dateFull: dateFull,
      method: "Planilla de Ventas / Proveedor",
      totalPaid: totalPaid,
      totalItems: totalItems,
      giftItems: giftItems,
      totalCostBase: totalCostBase,
      discountAmt: discountAmt,
      discountPct: discountPct,
      isTuesdayDiscountActive: isTuesday,
      shippingFee: shippingFee,
      hasFreeShipping: hasFreeShipping,
      status: "Pedido / Facturado",
      notes: notesArr.join(". "),
      items: items,
      isLiveOrder: true
    };

    newOrders.push(orderObj);
  });

  return newOrders;
}

/**
 * Combina los pedidos base con los generados desde ventas y los ordena
 * de más reciente a más antiguo por fecha.
 */
function mergeAndSortOrders(baseOrders, liveOrders) {
  const combined = [...baseOrders, ...liveOrders];
  combined.sort((a, b) => {
    const dateComp = (b.date || "").localeCompare(a.date || "");
    if (dateComp !== 0) return dateComp;
    return (b.orderNumber || 0) - (a.orderNumber || 0);
  });
  return combined;
}

// Inicializar y actualizar Métricas Generales (KPIs)
function initMetrics() {
  let totalSpent = 0;
  let totalItems = 0;
  let totalGifts = 0;

  pedidosData.forEach(p => {
    totalSpent += p.totalPaid;
    totalItems += p.totalItems;
    totalGifts += p.giftItems;
  });

  const avgPerOrder = pedidosData.length > 0 ? Math.round(totalSpent / pedidosData.length) : 0;

  if (kpiTotalInversionEl) kpiTotalInversionEl.textContent = `$${totalSpent.toLocaleString("es-CL")}`;
  if (kpiTotalPedidosEl) kpiTotalPedidosEl.textContent = `${pedidosData.length}`;
  if (kpiTotalUnidadesEl) kpiTotalUnidadesEl.textContent = `${totalItems} un.`;
  if (kpiTotalRegalosEl) kpiTotalRegalosEl.textContent = `${totalGifts} un. ($0)`;
  if (kpiPromedioPedidoEl) kpiPromedioPedidoEl.textContent = `$${avgPerOrder.toLocaleString("es-CL")}`;
}

// Control de Colapso del Panel de Métricas (igual que en ventas.html)
function initPedidosKpiControls() {
  if (!btnTogglePedidosKpi || !pedidosKpiBody || !pedidosKpiSection) return;

  const isMobile = window.innerWidth <= 768;
  const savedState = localStorage.getItem("notes_pedidos_kpi_collapsed");
  let isCollapsedInitially;

  if (savedState !== null) {
    isCollapsedInitially = savedState === "true";
  } else {
    isCollapsedInitially = isMobile;
  }

  const applyCollapseState = (collapsed) => {
    pedidosKpiBody.classList.toggle("is-collapsed", collapsed);
    pedidosKpiSection.classList.toggle("is-collapsed", collapsed);
    btnTogglePedidosKpi.setAttribute("aria-expanded", collapsed ? "false" : "true");
    if (btnTogglePedidosKpiText) {
      btnTogglePedidosKpiText.textContent = collapsed ? "Mostrar métricas" : "Ocultar métricas";
    }
    if (iconTogglePedidosKpi) {
      iconTogglePedidosKpi.setAttribute("data-lucide", collapsed ? "chevron-down" : "chevron-up");
    }
    renderIcons();
  };

  applyCollapseState(isCollapsedInitially);

  btnTogglePedidosKpi.addEventListener("click", () => {
    const isCurrentlyCollapsed = pedidosKpiBody.classList.contains("is-collapsed");
    const nextCollapsed = !isCurrentlyCollapsed;
    applyCollapseState(nextCollapsed);
    localStorage.setItem("notes_pedidos_kpi_collapsed", nextCollapsed ? "true" : "false");
  });
}

// Renderizar Botones / Chips de Filtro por Mes
function renderMonthFilters() {
  if (!monthFilterChipsEl) return;

  const countsByMonth = {};
  pedidosData.forEach(o => {
    countsByMonth[o.monthKey] = (countsByMonth[o.monthKey] || 0) + 1;
  });

  // Ordenar meses de más reciente a más antiguo
  const sortedMonthKeys = Object.keys(countsByMonth).sort((a, b) => b.localeCompare(a));

  let html = `
    <button type="button" class="filter-chip-btn ${currentMonthFilter === 'ALL' ? 'is-active' : ''}" data-month-filter="ALL">
      <i data-lucide="layers" style="width: 14px; height: 14px;"></i>
      <span>Todos los Pedidos</span>
      <span class="filter-chip-count">${pedidosData.length}</span>
    </button>
  `;

  sortedMonthKeys.forEach(mKey => {
    const sample = pedidosData.find(o => o.monthKey === mKey);
    const mName = sample ? sample.monthName : mKey;
    html += `
      <button type="button" class="filter-chip-btn ${currentMonthFilter === mKey ? 'is-active' : ''}" data-month-filter="${mKey}">
        <i data-lucide="calendar" style="width: 14px; height: 14px;"></i>
        <span>${mName}</span>
        <span class="filter-chip-count">${countsByMonth[mKey]}</span>
      </button>
    `;
  });

  monthFilterChipsEl.innerHTML = html;
  renderIcons();
}

// Filtrar Pedidos según mes seleccionado
function getFilteredOrders() {
  if (currentMonthFilter === "ALL") return pedidosData;
  return pedidosData.filter(order => order.monthKey === currentMonthFilter);
}

// Renderizar Vista: Historial de Pedidos Agrupados por Mes
function renderOrdersView() {
  if (!containerOrdersView) return;
  containerOrdersView.innerHTML = "";
  const filteredOrders = getFilteredOrders();

  if (filteredOrders.length === 0) {
    containerOrdersView.innerHTML = `
      <div style="text-align: center; padding: 48px 20px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
        <i data-lucide="package" style="width: 48px; height: 48px; color: var(--text-dim); margin-bottom: 12px;"></i>
        <h3 style="margin: 0 0 6px 0; color: var(--text-title);">No hay pedidos en este período</h3>
        <p style="color: var(--text-muted); margin: 0; font-size: 0.9rem;">Selecciona otro mes o revisa la planilla de ventas.</p>
      </div>
    `;
    renderIcons();
    return;
  }

  // Agrupar pedidos por mes respetando el orden descendente
  const monthGroups = {};
  filteredOrders.forEach(order => {
    if (!monthGroups[order.monthKey]) {
      monthGroups[order.monthKey] = {
        name: order.monthName,
        key: order.monthKey,
        orders: []
      };
    }
    monthGroups[order.monthKey].orders.push(order);
  });

  // Ordenar bloques de meses descendente (más nuevo arriba)
  const sortedMonthKeys = Object.keys(monthGroups).sort((a, b) => b.localeCompare(a));

  sortedMonthKeys.forEach(mKey => {
    const group = monthGroups[mKey];

    const monthBlock = document.createElement("div");
    monthBlock.className = "month-section-block";

    // Cabecera limpia del mes (sin la etiqueta de pedidos/unidades/monto)
    monthBlock.innerHTML = `
      <div class="month-section-header">
        <div class="month-section-title-wrap">
          <i data-lucide="calendar" style="color: var(--gold-primary);" aria-hidden="true"></i>
          <h2 class="month-section-title">${group.name}</h2>
        </div>
      </div>
      <div class="month-orders-list" id="monthList_${group.key}"></div>
    `;

    const listContainer = monthBlock.querySelector(`#monthList_${group.key}`);

    group.orders.forEach((order) => {
      const orderCard = document.createElement("div");
      const isExpanded = isOrderCardExpanded(order.id);
      orderCard.className = `order-accordion-card ${isExpanded ? 'is-expanded' : ''}`;
      orderCard.dataset.orderId = order.id;

      const dateInfo = getOrderDateInfo(order);
      const cleanStatus = getCleanStatus(order.status);

      const totalBase = order.totalCostBase !== undefined
        ? order.totalCostBase
        : (order.items || []).reduce((sum, it) => sum + (it.isGift ? 0 : (it.subtotal || 0)), 0);
      const discountAmt = order.discountAmt || 0;
      const isTue = Boolean(order.isTuesdayDiscountActive);
      const shippingFee = order.shippingFee || 0;
      const totalPaid = order.totalPaid;
      const batchKey = order.date || order.id;

      const tableRowsHtml = order.items.map((item, itemIdx) => {
        let statusClass = "status-facturado";
        if (item.isGift) statusClass = "status-regalo";
        else if (item.status.includes("Sin Stock")) statusClass = "status-sinstock";
        else if (item.status.includes("Faltante")) statusClass = "status-faltante";

        return `
          <tr>
            <td style="color: var(--text-dim); font-size: 0.78rem;">#${itemIdx + 1}</td>
            <td style="font-size: 0.82rem; color: var(--text-muted);">${order.dateFull.split('(')[0].trim()}</td>
            <td><span class="code-cell-badge">${item.code}</span></td>
            <td>
              <strong style="color: var(--text-title);">${item.name}</strong>
              ${item.isGift ? '<span class="item-status-badge status-regalo" style="margin-left: 6px;">🎁 REGALO</span>' : ''}
              ${item.clientsText ? `<div style="font-size: 0.73rem; color: var(--text-muted); margin-top: 2px;">Para: ${item.clientsText}</div>` : ''}
            </td>
            <td><span class="size-pill">${item.size}</span></td>
            <td><span class="qty-badge">${item.qty}</span></td>
            <td style="font-family: var(--font-mono);">$${item.unitPrice.toLocaleString("es-CL")}</td>
            <td style="font-family: var(--font-mono); font-weight: 700; color: var(--text-title);">$${item.subtotal.toLocaleString("es-CL")}</td>
            <td><span class="item-status-badge ${statusClass}">${item.status}</span></td>
          </tr>
        `;
      }).join("");

      orderCard.innerHTML = `
        <div class="order-card-header" data-action="toggle-accordion">
          <div class="order-main-meta">
            <span class="order-number-badge">Pedido #${order.orderNumber}</span>
            <div class="order-title-info">
              <h3>
                ${dateInfo.dateTitle}
                ${order.webOrderId ? `<span style="font-weight: 400; color: var(--text-muted); font-size: 0.85rem;">(Web #${order.webOrderId})</span>` : ''}
              </h3>
              <div class="order-subtitle">
                ${dateInfo.dayOfWeek ? `
                  <span class="order-subtitle-item">
                    <i data-lucide="calendar" style="width: 13px; height: 13px;"></i>
                    ${dateInfo.dayOfWeek}
                  </span>
                ` : ''}
                <span class="item-status-badge status-facturado">${cleanStatus}</span>
              </div>
            </div>
          </div>
          <div class="order-header-right">
            <div class="order-summary-pills">
              <span class="order-items-counter">${order.totalItems} un.${order.giftItems > 0 ? ` (${order.giftItems} regalo)` : ''}</span>
              <span class="order-price-val">$${totalPaid.toLocaleString("es-CL")}</span>
            </div>
            <div class="accordion-chevron-icon" title="Expandir / Contraer">
              <i data-lucide="chevron-down" style="width: 18px; height: 18px;"></i>
            </div>
          </div>
        </div>
        <div class="order-card-body">
          <!-- Desglose Financiero con Editor de Descuento Martes 10% -->
          <div class="order-financial-breakdown-bar">
            <div class="order-breakdown-item">
              <span class="breakdown-label">Base</span>
              <span class="breakdown-val">${formatCLP(totalBase)}</span>
            </div>
            <div class="order-breakdown-item">
              <span class="breakdown-label">Descuento</span>
              <div class="breakdown-tuesday-wrap">
                ${order.isLiveOrder ? `
                  <label class="check-tuesday-label ${isTue ? 'is-active' : ''}" style="cursor: pointer;" title="Activar/desactivar descuento del 10% de proveedor">
                    <input type="checkbox" class="check-tuesday-toggle" data-batch-key="${batchKey}" ${isTue ? 'checked' : ''}>
                    <i data-lucide="${isTue ? 'check' : 'tag'}" style="width: 12px; height: 12px;"></i>
                    <span>10%</span>
                  </label>
                ` : ''}
                <span class="breakdown-val breakdown-discount ${isTue ? 'has-discount' : ''}">
                  ${isTue ? `-${formatCLP(discountAmt)}` : '$0'}
                </span>
              </div>
            </div>
            <div class="order-breakdown-item">
              <span class="breakdown-label">Flete / Envío</span>
              <span class="breakdown-val ${shippingFee > 0 ? 'breakdown-shipping' : 'breakdown-free-shipping'}">
                ${shippingFee > 0 ? `+${formatCLP(shippingFee)}` : (totalBase > 0 ? 'Gratis ✓' : '$0')}
              </span>
            </div>
            <div class="order-breakdown-item breakdown-item-total">
              <span class="breakdown-label">Total Proveedor</span>
              <span class="breakdown-val breakdown-total-val">${formatCLP(totalPaid)}</span>
            </div>
          </div>

          ${order.notes ? `
            <div class="order-notes-callout">
              <i data-lucide="info" style="width: 18px; height: 18px;"></i>
              <div>
                <strong>Detalle / Observación:</strong> ${order.notes}
              </div>
            </div>
          ` : ''}
          <div class="order-table-container">
            <table class="order-items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha Pedido</th>
                  <th>Código</th>
                  <th>Perfume / Producto</th>
                  <th>Formato</th>
                  <th>Cant.</th>
                  <th>Precio Unit.</th>
                  <th>Subtotal</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      `;

      listContainer.appendChild(orderCard);
    });

    containerOrdersView.appendChild(monthBlock);
  });

  renderIcons();
}

// Inicializar Lucide Icons
function renderIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

/**
 * Reconstruye y sincroniza todos los pedidos combinando el historial base
 * con los pedidos realizados en ventas.
 */
function refreshAllOrders(salesList) {
  liveSalesList = salesList || [];
  const liveOrders = buildOrdersFromSales(liveSalesList);
  pedidosData = mergeAndSortOrders(BASE_HISTORIAL_PEDIDOS, liveOrders);

  initMetrics();
  renderMonthFilters();
  renderOrdersView();

  // Si se ingresó con un parámetro ?batch= desde ventas, resaltar dicho pedido
  const urlParams = new URLSearchParams(window.location.search);
  const targetBatch = urlParams.get("batch");
  if (targetBatch && !window.__hasScrolledToBatch) {
    window.__hasScrolledToBatch = true;
    const matchOrder = pedidosData.find(o => o.date === targetBatch || o.id.includes(targetBatch));
    if (matchOrder) {
      userExpandedCards.add(matchOrder.id);
      currentMonthFilter = matchOrder.monthKey;
      renderMonthFilters();
      renderOrdersView();
      setTimeout(() => {
        const card = document.querySelector(`[data-order-id="${matchOrder.id}"]`);
        if (card) {
          card.classList.add("is-expanded");
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.style.outline = "2px solid var(--gold-primary)";
          card.style.borderRadius = "var(--radius-lg)";
        }
      }, 350);
    }
  }
}

// ==========================================================================
// INICIALIZACIÓN Y EVENT LISTENERS
// ==========================================================================

// 1. Carga inicial inmediata con los datos disponibles
initMetrics();
initPedidosKpiControls();
renderMonthFilters();
renderOrdersView();

// 2. Conectar con Firestore: Configuración de Balances y Suscripción en Vivo a Ventas
(async function initLiveSync() {
  try {
    currentBalancesConfig = await getBalancesConfig();
    const initialSales = await getSalesHistory();
    refreshAllOrders(initialSales);

    // Suscripción reactiva en tiempo real a cambios en Firestore
    subscribeToSales((updatedSales) => {
      refreshAllOrders(updatedSales);
    });

  } catch (err) {
    console.warn("Fallo al sincronizar pedidos en vivo:", err);
  }
})();

// 3. Sincronización cruzada por eventos locales (si ventas.html actualiza en otra pestaña)
window.addEventListener("storage", (e) => {
  if (e.key === "notes_sales_updated" || e.key === "notes_tuesday_batches") {
    getSalesHistory().then(sales => refreshAllOrders(sales));
  }
});

window.addEventListener("focus", () => {
  getSalesHistory().then(sales => refreshAllOrders(sales));
});

// Event Listeners: Filtros de Mes
if (monthFilterChipsEl) {
  monthFilterChipsEl.addEventListener("click", e => {
    const btn = e.target.closest("[data-month-filter]");
    if (!btn) return;

    monthFilterChipsEl.querySelectorAll("[data-month-filter]").forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");

    currentMonthFilter = btn.dataset.monthFilter;
    renderOrdersView();
  });
}

// Event Listener: Editor de Check Descuento Martes 10%
document.addEventListener("change", (e) => {
  const toggle = e.target.closest(".check-tuesday-toggle");
  if (!toggle) return;

  const batchKey = toggle.dataset.batchKey;
  if (!batchKey) return;

  const tuesdayBatches = getSavedTuesdayBatches();
  if (toggle.checked) {
    tuesdayBatches.add(batchKey);
  } else {
    tuesdayBatches.delete(batchKey);
  }
  persistTuesdayBatches(tuesdayBatches);

  // Sincronizar con otras pestañas
  try {
    localStorage.setItem("notes_sales_updated", Date.now().toString());
  } catch (err) {}

  // Recalcular y re-renderizar manteniendo datos
  refreshAllOrders(liveSalesList);
});

// Event Listener: Acordeones de pedidos (colapsar / desplegar tarjeta)
document.addEventListener("click", e => {
  const header = e.target.closest('[data-action="toggle-accordion"]');
  if (!header) return;

  const card = header.closest(".order-accordion-card");
  if (card) {
    const isNowExpanded = card.classList.toggle("is-expanded");
    const orderId = card.dataset.orderId;
    if (orderId) {
      if (isNowExpanded) {
        userExpandedCards.add(orderId);
        userCollapsedCards.delete(orderId);
      } else {
        userCollapsedCards.add(orderId);
        userExpandedCards.delete(orderId);
      }
    }
  }
});

// Tema Claro / Oscuro
if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    if (isDark) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("notes_theme", "light");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("notes_theme", "dark");
    }
  });
}
