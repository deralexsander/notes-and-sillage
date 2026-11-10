// Lógica de la Planilla y Tabla Detallada de Ventas - Notes & Sillage
import {
  getSalesHistory,
  recordSale,
  updateSaleRow,
  updateFullSaleRow,
  deleteSaleRow,
  syncCustomerInfoToPastSales,
  getUnitFinancials,
  loadCatalogFromFirestore,
  loginWithEmail,
  logoutUser,
  onAuthStatusChange,
  getCurrentUser
} from "./firebase-config.js";

let allSaleRows = [];
let catalogProducts = [];
let modalMode = "new"; // "new" | "edit"
let currentEditSaleId = null;
let currentEditCode = null;

let isSupplierGroupingEnabled = localStorage.getItem("notes_supplier_grouping") !== "false";
const collapsedSupplierBatches = new Set();

// Definición exacta de los 6 Pedidos Proveedor Históricos de PEDIDOS.TXT
const HISTORICAL_SUPPLIER_BATCHES = [
  {
    key: "2026-10-05",
    cutoff: "2026-10-05",
    title: "Pedido #1 de Octubre — 05 de Octubre 2026",
    orderNum: 1
  },
  {
    key: "2026-10-08",
    cutoff: "2026-10-08",
    title: "Pedido #2 de Octubre — 08 de Octubre 2026",
    orderNum: 2
  },
  {
    key: "2026-10-19",
    cutoff: "2026-10-19",
    title: "Pedido #3 de Octubre — 19 de Octubre 2026 (Web #860036)",
    orderNum: 3
  },
  {
    key: "2026-10-23",
    cutoff: "2026-10-23",
    title: "Pedido #4 de Octubre — 23 de Octubre 2026 (Web #861233)",
    orderNum: 4
  },
  {
    key: "2026-10-31",
    cutoff: "2026-10-31",
    title: "Pedido #5 de Octubre — 31 de Octubre 2026 (Web #863113)",
    orderNum: 5
  },
  {
    key: "2026-11-08",
    cutoff: "2026-11-08",
    title: "Pedido #1 de Noviembre — 08 de Noviembre 2026 (Web #865454)",
    orderNum: 6
  }
];

function getSupplierBatchTitle(dateStr) {
  if (!dateStr || dateStr === "ANTERIOR") return "Pedidos Anteriores / Sin fecha lote";

  const histMatch = HISTORICAL_SUPPLIER_BATCHES.find(b => b.key === dateStr);
  if (histMatch) return histMatch.title;

  const parts = dateStr.split("-");
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  let legibleDate = dateStr;
  if (parts.length === 3) {
    const day = parts[2].padStart(2, '0');
    const mIdx = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    if (mIdx >= 0 && mIdx < 12) {
      legibleDate = `${day} de ${monthNames[mIdx]} ${year}`;
    }
  }

  if (window.HISTORIAL_PEDIDOS && Array.isArray(window.HISTORIAL_PEDIDOS)) {
    const match = window.HISTORIAL_PEDIDOS.find(o => o.date === dateStr || (o.date && o.date.startsWith(dateStr)));
    if (match) {
      return `${match.title} — ${legibleDate}`;
    }
  }

  return `Pedido Proveedor — ${legibleDate}`;
}

// Resuelve de manera exacta a qué lote de proveedor pertenece cada fila de venta
function resolveSupplierBatch(row) {
  const slug = getStatusSlug(row.estado);
  if (slug === "pendiente" || slug === "encarrito") {
    return { isPending: true, batchKey: "PENDIENTE", title: "PENDIENTES POR PEDIR AL PROVEEDOR" };
  }

  // Si tiene un lote o fecha de pedido asignada explícitamente (ej: generado con el botón de lote)
  if (row.fechaPedidoProveedor) {
    const customDate = row.fechaPedidoProveedor;
    const histMatch = HISTORICAL_SUPPLIER_BATCHES.find(b => b.key === customDate);
    if (histMatch) {
      return { isPending: false, batchKey: histMatch.key, title: histMatch.title };
    }
    return { isPending: false, batchKey: customDate, title: getSupplierBatchTitle(customDate) };
  }

  // Mapear ventas históricas según su fecha a los 6 pedidos oficiales de PEDIDOS.TXT
  let dateStr = "";
  if (row.fechaISO) {
    dateStr = row.fechaISO.slice(0, 10);
  } else if (row.createdAtDate && row.createdAtDate.toISOString) {
    dateStr = row.createdAtDate.toISOString().slice(0, 10);
  } else if (row.fecha) {
    const cleaned = String(row.fecha).replace(/\//g, "-");
    const parts = cleaned.split("-");
    if (parts.length === 3 && parts[2].length === 4) {
      dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    } else {
      dateStr = cleaned.slice(0, 10);
    }
  }

  if (dateStr) {
    for (const b of HISTORICAL_SUPPLIER_BATCHES) {
      if (dateStr <= b.cutoff) {
        return { isPending: false, batchKey: b.key, title: b.title };
      }
    }
  }

  // Ventas posteriores al 08-11-2026 que aún no han sido pasadas a un nuevo pedido proveedor
  return { isPending: true, batchKey: "PENDIENTE", title: "PENDIENTES POR PEDIR AL PROVEEDOR" };
}

// Elementos del DOM
const tableBody = document.getElementById("salesTableBody");
const emptyState = document.getElementById("tableEmptyState");
const searchInput = document.getElementById("searchInput");
const btnClearSearch = document.getElementById("btnClearSearch");
const btnRefresh = document.getElementById("btnRefresh");
const btnExportCSV = document.getElementById("btnExportCSV");
const toastNotification = document.getElementById("toastNotification");
const toastMessage = document.getElementById("toastMessage");

// KPIs
const kpiTotalVenta = document.getElementById("kpiTotalVenta");
const kpiTotalGanancia = document.getElementById("kpiTotalGanancia");
const kpiTotalCosto = document.getElementById("kpiTotalCosto");
const kpiTotalUnidades = document.getElementById("kpiTotalUnidades");
const kpiMargenMedio = document.getElementById("kpiMargenMedio");
const kpiFilasMostradas = document.getElementById("kpiFilasMostradas");

// Modal Nueva Venta / Editar Venta
const modalNewSale = document.getElementById("modalNewSale");
const modalSaleTitle = document.getElementById("modalSaleTitle");
const modalSaleCodeBadge = document.getElementById("modalSaleCodeBadge");
const btnNewManualSale = document.getElementById("btnNewManualSale");
const newSaleForm = document.getElementById("newSaleForm");
const manualDate = document.getElementById("manualDate");
const manualCustomerName = document.getElementById("manualCustomerName");
const manualCustomerPhone = document.getElementById("manualCustomerPhone");
const manualInstitution = document.getElementById("manualInstitution");
const manualProductSelect = document.getElementById("manualProductSelect");
const manualSizeSelect = document.getElementById("manualSizeSelect");
const manualQty = document.getElementById("manualQty");
const manualStatus = document.getElementById("manualStatus");
const manualPaid = document.getElementById("manualPaid");
const manualConfirmed = document.getElementById("manualConfirmed");
const calcUnitPrice = document.getElementById("calcUnitPrice");
const calcTotalPrice = document.getElementById("calcTotalPrice");
const calcTotalCost = document.getElementById("calcTotalCost");
const calcTotalProfit = document.getElementById("calcTotalProfit");
const btnDeleteInModal = document.getElementById("btnDeleteInModal");
const btnSubmitModal = document.getElementById("btnSubmitModal");

let toastTimeout = null;
function showToast(msg) {
  if (toastTimeout) clearTimeout(toastTimeout);
  toastMessage.textContent = msg;
  toastNotification.hidden = false;
  toastTimeout = setTimeout(() => {
    toastNotification.hidden = true;
  }, 2500);
}

function formatCLP(num) {
  return `$${Number(num || 0).toLocaleString("es-CL")}`;
}

function renderPhoneCell(phone) {
  if (!phone || !phone.trim()) {
    return `<span class="phone-empty">-</span>`;
  }
  const cleanDigits = phone.replace(/[^0-9]/g, "");
  const waUrl = cleanDigits.length >= 8 ? `https://wa.me/${cleanDigits}` : null;
  if (waUrl) {
    return `
      <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="phone-link" title="Abrir chat de WhatsApp con ${phone}">
        <i data-lucide="message-circle" aria-hidden="true"></i>
        <span>${phone}</span>
      </a>
    `;
  }
  return `<span class="phone-text">${phone}</span>`;
}

// ==========================================================================
// RECONOCIMIENTO AUTOMÁTICO DE CLIENTES Y SUGERENCIAS
// ==========================================================================
let knownCustomers = new Map();
let lastAutoFilledPhone = "";
let lastAutoFilledInst = "";

function normalizeCustomerName(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function updateKnownCustomersDirectory(rows) {
  knownCustomers.clear();

  // rows viene ordenado de más reciente a más antiguo
  rows.forEach(row => {
    const rawName = (row.clientName || "").trim();
    if (!rawName || rawName.toLowerCase() === "cliente") return;

    const norm = normalizeCustomerName(rawName);
    if (!norm) return;

    const phone = (row.clientPhone || "").trim();
    const inst = (row.institution || "").trim();

    if (!knownCustomers.has(norm)) {
      knownCustomers.set(norm, {
        displayName: rawName,
        phone: phone,
        institution: inst,
        count: 1
      });
    } else {
      const existing = knownCustomers.get(norm);
      existing.count += 1;
      if (!existing.phone && phone) existing.phone = phone;
      if (!existing.institution && inst) existing.institution = inst;
    }
  });

  // Poblar datalist en el modal de ventas para autocompletado nativo
  const datalist = document.getElementById("customerSuggestions");
  if (datalist) {
    datalist.innerHTML = "";
    const sorted = Array.from(knownCustomers.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    );

    sorted.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.displayName;
      const details = [];
      if (c.phone) details.push(`Tel: ${c.phone}`);
      if (c.institution) details.push(`Inst: ${c.institution}`);
      if (details.length > 0) {
        opt.label = `${details.join(" | ")} (${c.count} ${c.count === 1 ? "pedido" : "pedidos"})`;
      }
      datalist.appendChild(opt);
    });
  }
}

function handleCustomerNameAutoRecognition() {
  const inputVal = manualCustomerName.value;
  const norm = normalizeCustomerName(inputVal);
  const badge = document.getElementById("customerMatchBadge");

  if (!norm || !knownCustomers.has(norm)) {
    if (badge) badge.hidden = true;
    return;
  }

  const match = knownCustomers.get(norm);

  // Autocompletar teléfono si está vacío o si mantenía el valor previo autocompletado
  if (match.phone && (!manualCustomerPhone.value.trim() || manualCustomerPhone.value.trim() === lastAutoFilledPhone)) {
    manualCustomerPhone.value = match.phone;
    lastAutoFilledPhone = match.phone;
  }

  // Autocompletar institución si está vacía o si mantenía el valor previo autocompletado
  if (match.institution && (!manualInstitution.value.trim() || manualInstitution.value.trim() === lastAutoFilledInst)) {
    manualInstitution.value = match.institution;
    lastAutoFilledInst = match.institution;
  }

  if (badge) {
    const textSpan = badge.querySelector("span");
    if (textSpan) {
      const orderWord = match.count === 1 ? "pedido previo" : "pedidos previos";
      textSpan.textContent = `Cliente reconocido (${match.count} ${orderWord})`;
    }
    badge.hidden = false;
    if (window.lucide) lucide.createIcons();
  }
}

// 1. Cargar catálogo de Firestore para el formulario manual
async function initCatalog() {
  const data = await loadCatalogFromFirestore();
  if (data && data.products) {
    catalogProducts = data.products;
    manualProductSelect.innerHTML = `<option value="">-- Elige un perfume del catálogo --</option>`;
    catalogProducts.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `[${p.code}] ${p.name} (${p.sub || p.cat})`;
      manualProductSelect.appendChild(opt);
    });
  }
}

// 2. Cargar historial y desglosar cada venta individual (fila por perfume)
async function loadSales() {
  try {
    tableBody.innerHTML = `<tr><td colspan="16" style="text-align:center; padding:35px; color:var(--text-muted);"><i data-lucide="loader" class="spin"></i> Sincronizando ventas desde Firestore...</td></tr>`;
    if (window.lucide) lucide.createIcons();

    const sales = await getSalesHistory();
    const rows = [];

    sales.forEach(sale => {
      const clientName = sale.cliente?.nombre || "Cliente";
      const clientPhone = sale.cliente?.telefono || "";
      let institution = (sale.cliente?.institucion || "").trim();
      if (!institution && sale.origen) {
        const orig = sale.origen.trim();
        if (orig.toLowerCase().startsWith("venta directa (") && orig.endsWith(")")) {
          institution = orig.slice(15, -1).trim();
        } else if (!orig.toLowerCase().includes("catálogo web") && orig.toLowerCase() !== "venta directa") {
          institution = orig;
        }
      }
      if (!institution && sale.notas && sale.notas.includes("Institución:")) {
        const match = sale.notas.match(/Institución:\s*([^|;\n]+)/i);
        if (match && match[1]) institution = match[1].trim();
      }
      const estadoGeneral = sale.estado || "Entregado";
      const pagadoGeneral = sale.pagado !== false;
      const confirmadoGeneral = sale.confirmado !== false;

      const items = sale.items && sale.items.length > 0 ? sale.items : [
        {
          code: sale.codigoVenta || "S/C",
          name: "Venta registrada",
          size: "100 ml",
          qty: sale.totales?.totalUnidades || 1,
          unitPrice: sale.totales?.totalVenta || 0,
          unitCost: sale.totales?.totalCosto || 0,
          unitProfit: sale.totales?.totalGanancia || 0
        }
      ];

      items.forEach(item => {
        const qty = Number(item.qty) || 1;
        const unitPrice = Number(item.unitPrice) || 0;
        const unitCost = Number(item.unitCost) || 0;
        const unitProfit = Number(item.unitProfit) || (unitPrice - unitCost);

        const subtotalVenta = unitPrice * qty;
        const subtotalCosto = unitCost * qty;
        const subtotalGanancia = unitProfit * qty;

        rows.push({
          saleId: sale.id,
          codigoVenta: sale.codigoVenta || "",
          fecha: sale.fechaLegible || "",
          fechaISO: sale.fechaISO || "",
          createdAtDate: sale.createdAtDate || new Date(sale.fechaISO || 0),
          code: item.code || "-",
          fragrance: item.name || "Sin nombre",
          size: item.size || "100 ml",
          qty: qty,
          clientName: clientName,
          clientPhone: clientPhone,
          institution: institution,
          precioVenta: subtotalVenta,
          costo: subtotalCosto,
          ganancia: subtotalGanancia,
          estado: item.estado || estadoGeneral,
          pagado: typeof item.pagado === "boolean" ? item.pagado : pagadoGeneral,
          confirmado: typeof item.confirmado === "boolean" ? item.confirmado : confirmadoGeneral,
          fechaPedidoProveedor: item.fechaPedidoProveedor || sale.fechaPedidoProveedor || null,
          idPedidoProveedor: item.idPedidoProveedor || sale.idPedidoProveedor || null
        });
      });
    });

    // Ordenar de más reciente a más antigua
    rows.sort((a, b) => b.createdAtDate - a.createdAtDate);
    allSaleRows = rows;
    updateKnownCustomersDirectory(rows);
    applyFilters();
    renderAnalyticsDashboard(allSaleRows);
    try {
      localStorage.setItem("notes_sales_updated", Date.now().toString());
    } catch (e) {}
  } catch (err) {
    console.error("Error al cargar ventas:", err);
    tableBody.innerHTML = `<tr><td colspan="16" style="text-align:center; padding:30px; color:#ef4444;">Error al consultar Firestore: ${err.message}</td></tr>`;
  }
}

// 3. Normalizar clase de estado para los colores del selector
function getStatusSlug(estado) {
  const e = (estado || "").toLowerCase().trim();
  if (e.includes("carrito")) return "encarrito";
  if (e.includes("recepcionado")) return "recepcionado";
  if (e.includes("pendiente")) return "pendiente";
  if (e.includes("entregado")) return "entregado";
  if (e.includes("cancelado")) return "cancelado";
  if (e.includes("faltante")) return "faltante";
  if (e.includes("pedido")) return "pedido";
  return "entregado";
}

// 4. Filtro de búsqueda en tiempo real
function applyFilters() {
  const query = (searchInput.value || "").toLowerCase().trim();

  btnClearSearch.hidden = !query;

  const filtered = allSaleRows.filter(row => {
    // Filtro Texto
    if (!query) return true;
    const matchTarget = `${row.clientName} ${row.fragrance} ${row.code} ${row.institution} ${row.clientPhone} ${row.codigoVenta}`.toLowerCase();
    return matchTarget.includes(query);
  });

  renderTable(filtered);
  updateMetrics(filtered);
}

// Helper para renderizar una fila individual
function renderTableRow(row, rowNum, isPending) {
  const statusSlug = getStatusSlug(row.estado);

  return `
    <tr data-sale-id="${row.saleId}" data-code="${row.code}">
      <td class="td-num">
        <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
          ${isPending ? `<input type="checkbox" class="pending-row-select" data-sale-id="${row.saleId}" data-code="${row.code}" title="Seleccionar para lote de compra al proveedor">` : ''}
          <span>${rowNum}</span>
        </div>
      </td>
      <td class="td-date">${row.fecha || "-"}</td>
      <td>
        <span class="code-chip">${row.code}</span>
      </td>
      <td>
        <div class="fragrance-name">${row.fragrance}</div>
      </td>
      <td>
        <span class="size-tag">${row.size}</span>
      </td>
      <td class="qty-val">${row.qty}</td>
      <td>
        <span class="client-name">${row.clientName}</span>
      </td>
      <td>
        ${renderPhoneCell(row.clientPhone)}
      </td>
      <td>
        <span class="inst-name">${row.institution || "-"}</span>
      </td>
      <td class="price-cell">${formatCLP(row.precioVenta)}</td>
      <td class="cost-cell">${formatCLP(row.costo)}</td>
      <td class="profit-cell">+${formatCLP(row.ganancia)}</td>
      <td>
        <div class="status-select-wrap">
          <span class="status-dot dot-${statusSlug}"></span>
          <select class="status-dropdown opt-${statusSlug}" data-action="change-status" data-sale-id="${row.saleId}" data-code="${row.code}">
            <option value="Pedido" ${statusSlug === "pedido" ? "selected" : ""}>Pedido</option>
            <option value="Recepcionado" ${statusSlug === "recepcionado" ? "selected" : ""}>Recepcionado</option>
            <option value="Pendiente" ${statusSlug === "pendiente" ? "selected" : ""}>Pendiente</option>
            <option value="Entregado" ${statusSlug === "entregado" ? "selected" : ""}>Entregado</option>
            <option value="Cancelado" ${statusSlug === "cancelado" ? "selected" : ""}>Cancelado</option>
            <option value="Faltante" ${statusSlug === "faltante" ? "selected" : ""}>Faltante</option>
            <option value="en carrito" ${statusSlug === "encarrito" ? "selected" : ""}>en carrito</option>
          </select>
        </div>
      </td>
      <td class="cell-check">
        <input type="checkbox" class="table-checkbox" data-action="toggle-paid" data-sale-id="${row.saleId}" data-code="${row.code}" ${row.pagado ? "checked" : ""} title="${row.pagado ? "Pagado (True)" : "Pendiente de pago (False)"}">
      </td>
      <td class="cell-check">
        <input type="checkbox" class="table-checkbox check-confirmed" data-action="toggle-confirmed" data-sale-id="${row.saleId}" data-code="${row.code}" ${row.confirmado ? "checked" : ""} title="${row.confirmado ? "Pedido Confirmado (True)" : "Sin confirmar (False)"}">
      </td>
      <td style="text-align: center;">
        <button class="btn-edit-row" data-action="edit-row" data-sale-id="${row.saleId}" data-code="${row.code}" title="Editar venta o eliminar">
          <i data-lucide="pencil" aria-hidden="true"></i>
        </button>
      </td>
    </tr>
  `;
}

// 5. Renderizar filas en la tabla con controles interactivos y agrupación por lotes proveedor
function renderTable(rows) {
  if (rows.length === 0) {
    tableBody.innerHTML = "";
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  // Si la separación por lotes está desactivada por el usuario
  if (!isSupplierGroupingEnabled) {
    tableBody.innerHTML = rows.map((row, index) => renderTableRow(row, rows.length - index, false)).join("");
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Agrupación de filas: Pendientes vs Lotes de Pedidos Proveedor
  const pendingRows = [];
  const orderedBatches = {};

  rows.forEach(r => {
    const batchInfo = resolveSupplierBatch(r);
    if (batchInfo.isPending) {
      pendingRows.push(r);
    } else {
      const bKey = batchInfo.batchKey;
      if (!orderedBatches[bKey]) {
        orderedBatches[bKey] = {
          batchKey: bKey,
          title: batchInfo.title,
          rows: []
        };
      }
      orderedBatches[bKey].rows.push(r);
    }
  });

  let html = "";
  let overallIndex = rows.length;

  // 1. Sección PENDIENTES POR PEDIR AL PROVEEDOR
  if (pendingRows.length > 0) {
    const pendingUnits = pendingRows.reduce((sum, r) => sum + r.qty, 0);
    const pendingCost = pendingRows.reduce((sum, r) => sum + r.costo, 0);
    const pendingSale = pendingRows.reduce((sum, r) => sum + r.precioVenta, 0);

    html += `
      <tr class="tr-supplier-header group-pending">
        <td colspan="16">
          <div class="supplier-header-content">
            <div class="supplier-header-title">
              <span class="supplier-status-icon pending-icon">
                <i data-lucide="clock" style="width: 16px; height: 16px;"></i>
              </span>
              <strong style="color: #b45309; font-size: 0.92rem;">PENDIENTES POR PEDIR AL PROVEEDOR</strong>
              <span class="badge-supplier-tag" style="background: rgba(245, 158, 11, 0.2); color: #b45309;">
                ${pendingUnits} perfumes (${pendingRows.length} líneas)
              </span>
              <span class="badge-supplier-tag tag-cost" title="Costo estimado a pagar al proveedor">
                Costo: ${formatCLP(pendingCost)}
              </span>
              <span class="badge-supplier-tag" style="color: var(--text-title);" title="Total ventas a cobrar">
                Venta: ${formatCLP(pendingSale)}
              </span>
            </div>
            <div class="supplier-header-actions">
              <label class="select-all-pending-label">
                <input type="checkbox" id="checkSelectAllPending" title="Seleccionar todos los pendientes">
                <span>Seleccionar todos</span>
              </label>
              <button type="button" class="btn-create-supplier-batch" id="btnOpenBatchModal" title="Marcar los perfumes seleccionados como Pedido Proveedor">
                <i data-lucide="package-plus" style="width: 14px; height: 14px;"></i>
                <span>Pasar a Pedido Proveedor</span>
              </button>
            </div>
          </div>
        </td>
      </tr>
    `;

    pendingRows.forEach(r => {
      html += renderTableRow(r, overallIndex--, true);
    });
  }

  // 2. Grupos de Lotes de Pedidos Proveedor (Ordenados por fecha descendente)
  const sortedBatchKeys = Object.keys(orderedBatches).sort((a, b) => b.localeCompare(a));

  sortedBatchKeys.forEach(batchKey => {
    const batchObj = orderedBatches[batchKey];
    const bRows = batchObj.rows;
    const bUnits = bRows.reduce((sum, r) => sum + r.qty, 0);
    const bCost = bRows.reduce((sum, r) => sum + r.costo, 0);
    const bSale = bRows.reduce((sum, r) => sum + r.precioVenta, 0);
    const bTitle = batchObj.title || getSupplierBatchTitle(batchKey);
    const isCollapsed = collapsedSupplierBatches.has(batchKey);

    html += `
      <tr class="tr-supplier-header group-ordered" data-batch-key="${batchKey}">
        <td colspan="16">
          <div class="supplier-header-content">
            <div class="supplier-header-title">
              <span class="supplier-status-icon ordered-icon">
                <i data-lucide="package-check" style="width: 16px; height: 16px;"></i>
              </span>
              <strong style="color: var(--text-title); font-size: 0.92rem;">${bTitle}</strong>
              <span class="badge-supplier-tag">
                ${bUnits} perfumes (${bRows.length} líneas)
              </span>
              <span class="badge-supplier-tag tag-cost">
                Costo: ${formatCLP(bCost)}
              </span>
              <span class="badge-supplier-tag" style="color: var(--text-title);">
                Venta: ${formatCLP(bSale)}
              </span>
              <span class="badge-supplier-tag tag-locked">
                <i data-lucide="lock" style="width: 12px; height: 12px;"></i> Pedido Cerrado
              </span>
              <a href="pedidos.html" class="badge-supplier-tag" style="text-decoration: none; color: var(--gold-primary); display: inline-flex; align-items: center; gap: 4px;" title="Ver detalle completo del comprobante en Historial de Pedidos">
                <i data-lucide="external-link" style="width: 12px; height: 12px;"></i> Ver en Historial
              </a>
            </div>
            <div class="supplier-header-actions">
              <button type="button" class="btn-toggle-batch" data-action="toggle-batch-collapse" data-batch-key="${batchKey}">
                <i data-lucide="${isCollapsed ? 'chevron-right' : 'chevron-down'}" style="width: 14px; height: 14px;"></i>
                <span>${isCollapsed ? 'Desplegar' : 'Contraer'}</span>
              </button>
            </div>
          </div>
        </td>
      </tr>
    `;

    bRows.forEach(r => {
      let rHtml = renderTableRow(r, overallIndex--, false);
      if (isCollapsed) {
        rHtml = rHtml.replace('<tr ', `<tr data-batch-row="${batchKey}" class="batch-collapsed-row" `);
      } else {
        rHtml = rHtml.replace('<tr ', `<tr data-batch-row="${batchKey}" `);
      }
      html += rHtml;
    });
  });

  tableBody.innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

// 6. Actualizar métricas totales
function updateMetrics(rows) {
  let totalVentas = 0;
  let totalCostos = 0;
  let totalGanancias = 0;
  let totalUnidades = 0;

  rows.forEach(r => {
    totalVentas += r.precioVenta;
    totalCostos += r.costo;
    totalGanancias += r.ganancia;
    totalUnidades += r.qty;
  });

  const margen = totalVentas > 0 ? ((totalGanancias / totalVentas) * 100).toFixed(1) : "50.0";

  kpiTotalVenta.textContent = formatCLP(totalVentas);
  kpiTotalGanancia.textContent = formatCLP(totalGanancias);
  kpiTotalCosto.textContent = formatCLP(totalCostos);
  kpiTotalUnidades.textContent = totalUnidades;
  kpiMargenMedio.textContent = `${margen}%`;
  kpiFilasMostradas.textContent = `${rows.length} / ${allSaleRows.length}`;
}

// ==========================================================================
// SECCIÓN DE GRÁFICOS Y ANALYTICS (Métricas, Instituciones y Clientes)
// ==========================================================================
let chartTopProductsInstance = null;
let chartTopInstitutionsInstance = null;
let chartTopCustomersInstance = null;

const badgeTotalPerfumes = document.getElementById("badgeTotalPerfumes");
const badgeTotalInstituciones = document.getElementById("badgeTotalInstituciones");
const badgeTotalClientes = document.getElementById("badgeTotalClientes");
const listTopProducts = document.getElementById("listTopProducts");
const listTopInstitutions = document.getElementById("listTopInstitutions");
const listTopCustomers = document.getElementById("listTopCustomers");

function getChartThemeColors() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  return {
    isDark,
    textColor: isDark ? "#cbd5e1" : "#475569",
    textMuted: isDark ? "#94a3b8" : "#64748b",
    gridColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
    tooltipBg: isDark ? "#1f242d" : "#0f172a",
    tooltipTitle: "#ffffff",
    tooltipBody: isDark ? "#e2e8f0" : "#f8fafc",
    borderCutoutBg: isDark ? "#181a20" : "#ffffff"
  };
}

function renderAnalyticsDashboard(rows) {
  if (!window.Chart) {
    setTimeout(() => renderAnalyticsDashboard(rows), 200);
    return;
  }

  // Filtrar pedidos no cancelados
  const activeRows = (rows || []).filter(r => {
    const st = (r.estado || "").toLowerCase().trim();
    return st !== "cancelado";
  });

  const theme = getChartThemeColors();

  renderTopProductsAnalytics(activeRows, theme);
  renderTopInstitutionsAnalytics(activeRows, theme);
  renderTopCustomersAnalytics(activeRows, theme);
}

// 1. Gráfico y Ranking: Perfumes Más Vendidos
function renderTopProductsAnalytics(rows, theme) {
  const canvas = document.getElementById("chartTopProducts");
  if (!canvas) return;

  const fragranceMap = new Map();
  rows.forEach(r => {
    const name = (r.fragrance || "Sin nombre").trim();
    const code = (r.code || "").trim();
    const key = name.toLowerCase();

    if (!fragranceMap.has(key)) {
      fragranceMap.set(key, {
        name,
        code,
        qty: 0,
        totalVenta: 0
      });
    }
    const entry = fragranceMap.get(key);
    entry.qty += (Number(r.qty) || 1);
    entry.totalVenta += (Number(r.precioVenta) || 0);
    if (!entry.code && code) entry.code = code;
  });

  const sorted = Array.from(fragranceMap.values()).sort((a, b) => b.qty - a.qty || b.totalVenta - a.totalVenta);

  if (badgeTotalPerfumes) {
    badgeTotalPerfumes.textContent = `${sorted.length} ${sorted.length === 1 ? "fragancia" : "fragancias"}`;
  }

  const topItems = sorted.slice(0, 5);
  const maxQty = sorted[0]?.qty || 1;

  if (listTopProducts) {
    if (topItems.length === 0) {
      listTopProducts.innerHTML = `<div class="ranking-empty">No hay ventas registradas aún</div>`;
    } else {
      listTopProducts.innerHTML = topItems.map((item, idx) => {
        const medalClass = idx === 0 ? "rank-gold" : idx === 1 ? "rank-silver" : idx === 2 ? "rank-bronze" : "";
        const pct = Math.min(100, Math.max(8, Math.round((item.qty / maxQty) * 100)));
        const codeDisplay = item.code && item.code !== "-" ? `(${item.code})` : "";
        return `
          <div class="ranking-row">
            <span class="ranking-pos ${medalClass}">${idx + 1}</span>
            <div class="ranking-details">
              <div class="ranking-label-wrap">
                <span class="ranking-name" title="${item.name}">${item.name} <span class="ranking-sub-label">${codeDisplay}</span></span>
                <span class="ranking-val">${item.qty} un. · ${formatCLP(item.totalVenta)}</span>
              </div>
              <div class="ranking-bar-track">
                <div class="ranking-bar-fill bar-gold" style="width: ${pct}%"></div>
              </div>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  if (chartTopProductsInstance) {
    chartTopProductsInstance.destroy();
    chartTopProductsInstance = null;
  }

  if (topItems.length === 0) return;

  const ctx = canvas.getContext("2d");
  chartTopProductsInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: topItems.map(p => p.name.length > 18 ? p.name.substring(0, 16) + "…" : p.name),
      datasets: [{
        label: "Unidades vendidas",
        data: topItems.map(p => p.qty),
        backgroundColor: theme.isDark ? "rgba(212, 175, 55, 0.85)" : "rgba(180, 83, 9, 0.85)",
        borderColor: theme.isDark ? "#d4af37" : "#b45309",
        borderWidth: 1,
        borderRadius: 5,
        maxBarThickness: 24
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipTitle,
          bodyColor: theme.tooltipBody,
          padding: 8,
          cornerRadius: 6,
          callbacks: {
            title: (items) => {
              const idx = items[0].dataIndex;
              return topItems[idx]?.name || "";
            },
            label: (item) => {
              const entry = topItems[item.dataIndex];
              return ` ${item.parsed.x} unidades vendidas (${formatCLP(entry?.totalVenta || 0)})`;
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            color: theme.textColor,
            stepSize: 1,
            precision: 0,
            font: { size: 10 }
          },
          grid: {
            color: theme.gridColor
          }
        },
        y: {
          ticks: {
            color: theme.textColor,
            font: { size: 10.5, weight: "500" }
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// 2. Gráfico y Ranking: Instituciones con Más Ventas
function renderTopInstitutionsAnalytics(rows, theme) {
  const canvas = document.getElementById("chartTopInstitutions");
  if (!canvas) return;

  const instMap = new Map();
  let totalInstUnits = 0;

  rows.forEach(r => {
    let inst = (r.institution || "").trim();
    if (!inst || inst === "-" || inst.toLowerCase() === "sin institución" || inst.toLowerCase() === "ninguna") {
      inst = "Venta Directa / Particulares";
    }
    const key = inst.toLowerCase();
    if (!instMap.has(key)) {
      instMap.set(key, {
        displayName: inst,
        qty: 0,
        totalVenta: 0
      });
    }
    const entry = instMap.get(key);
    const q = Number(r.qty) || 1;
    entry.qty += q;
    entry.totalVenta += (Number(r.precioVenta) || 0);
    totalInstUnits += q;
  });

  const sorted = Array.from(instMap.values()).sort((a, b) => b.qty - a.qty || b.totalVenta - a.totalVenta);

  if (badgeTotalInstituciones) {
    badgeTotalInstituciones.textContent = `${sorted.length} ${sorted.length === 1 ? "institución" : "instituciones"}`;
  }

  const topItems = sorted.slice(0, 5);
  const maxQty = sorted[0]?.qty || 1;

  if (listTopInstitutions) {
    if (topItems.length === 0) {
      listTopInstitutions.innerHTML = `<div class="ranking-empty">No hay instituciones registradas aún</div>`;
    } else {
      listTopInstitutions.innerHTML = topItems.map((item, idx) => {
        const medalClass = idx === 0 ? "rank-gold" : idx === 1 ? "rank-silver" : idx === 2 ? "rank-bronze" : "";
        const pctTotal = totalInstUnits > 0 ? Math.round((item.qty / totalInstUnits) * 100) : 0;
        const pctBar = Math.min(100, Math.max(8, Math.round((item.qty / maxQty) * 100)));
        return `
          <div class="ranking-row">
            <span class="ranking-pos ${medalClass}">${idx + 1}</span>
            <div class="ranking-details">
              <div class="ranking-label-wrap">
                <span class="ranking-name" title="${item.displayName}">${item.displayName}</span>
                <span class="ranking-val">${item.qty} un. (${pctTotal}%) · ${formatCLP(item.totalVenta)}</span>
              </div>
              <div class="ranking-bar-track">
                <div class="ranking-bar-fill bar-purple" style="width: ${pctBar}%"></div>
              </div>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  if (chartTopInstitutionsInstance) {
    chartTopInstitutionsInstance.destroy();
    chartTopInstitutionsInstance = null;
  }

  if (topItems.length === 0) return;

  const chartColors = [
    "#8b5cf6", // Morado
    "#d4af37", // Oro
    "#10b981", // Esmeralda
    "#3b82f6", // Azul
    "#ec4899", // Rosa
    "#f97316"  // Naranja
  ];

  const ctx = canvas.getContext("2d");
  chartTopInstitutionsInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: topItems.map(i => i.displayName.length > 20 ? i.displayName.substring(0, 18) + "…" : i.displayName),
      datasets: [{
        data: topItems.map(i => i.qty),
        backgroundColor: chartColors.slice(0, topItems.length),
        borderColor: theme.borderCutoutBg,
        borderWidth: 2,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "60%",
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            color: theme.textColor,
            boxWidth: 9,
            padding: 6,
            font: { size: 10 }
          }
        },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipTitle,
          bodyColor: theme.tooltipBody,
          padding: 8,
          cornerRadius: 6,
          callbacks: {
            title: (items) => {
              const idx = items[0].dataIndex;
              return topItems[idx]?.displayName || "";
            },
            label: (item) => {
              const entry = topItems[item.dataIndex];
              const pct = totalInstUnits > 0 ? Math.round((entry.qty / totalInstUnits) * 100) : 0;
              return ` ${entry.qty} perfumes (${pct}%) · ${formatCLP(entry.totalVenta)}`;
            }
          }
        }
      }
    }
  });
}

// 3. Gráfico y Ranking: Clientes con Más Pedidos
function renderTopCustomersAnalytics(rows, theme) {
  const canvas = document.getElementById("chartTopCustomers");
  if (!canvas) return;

  const clientMap = new Map();
  rows.forEach(r => {
    const rawName = (r.clientName || "").trim();
    if (!rawName || rawName.toLowerCase() === "cliente" || rawName === "-") return;
    const norm = normalizeCustomerName(rawName);
    if (!norm) return;

    if (!clientMap.has(norm)) {
      clientMap.set(norm, {
        displayName: rawName,
        phone: (r.clientPhone || "").trim(),
        institution: (r.institution || "").trim(),
        qty: 0,
        totalVenta: 0,
        orderIds: new Set()
      });
    }
    const entry = clientMap.get(norm);
    entry.qty += (Number(r.qty) || 1);
    entry.totalVenta += (Number(r.precioVenta) || 0);
    if (r.saleId) entry.orderIds.add(r.saleId);
    if (!entry.phone && r.clientPhone) entry.phone = r.clientPhone.trim();
    if (!entry.institution && r.institution) entry.institution = r.institution.trim();
  });

  const sorted = Array.from(clientMap.values()).sort((a, b) => b.qty - a.qty || b.totalVenta - a.totalVenta);

  if (badgeTotalClientes) {
    badgeTotalClientes.textContent = `${sorted.length} ${sorted.length === 1 ? "cliente" : "clientes"}`;
  }

  const topItems = sorted.slice(0, 5);
  const maxQty = sorted[0]?.qty || 1;

  if (listTopCustomers) {
    if (topItems.length === 0) {
      listTopCustomers.innerHTML = `<div class="ranking-empty">No hay clientes con pedidos registrados aún</div>`;
    } else {
      listTopCustomers.innerHTML = topItems.map((item, idx) => {
        const medalClass = idx === 0 ? "rank-gold" : idx === 1 ? "rank-silver" : idx === 2 ? "rank-bronze" : "";
        const pctBar = Math.min(100, Math.max(8, Math.round((item.qty / maxQty) * 100)));
        const extraLabel = item.institution ? `(${item.institution})` : (item.phone ? `(${item.phone})` : "");
        const ordersText = item.orderIds.size > 1 ? ` · ${item.orderIds.size} compras` : "";
        return `
          <div class="ranking-row">
            <span class="ranking-pos ${medalClass}">${idx + 1}</span>
            <div class="ranking-details">
              <div class="ranking-label-wrap">
                <span class="ranking-name" title="${item.displayName}">${item.displayName} <span class="ranking-sub-label">${extraLabel}</span></span>
                <span class="ranking-val">${item.qty} un.${ordersText} · ${formatCLP(item.totalVenta)}</span>
              </div>
              <div class="ranking-bar-track">
                <div class="ranking-bar-fill bar-green" style="width: ${pctBar}%"></div>
              </div>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  if (chartTopCustomersInstance) {
    chartTopCustomersInstance.destroy();
    chartTopCustomersInstance = null;
  }

  if (topItems.length === 0) return;

  const ctx = canvas.getContext("2d");
  chartTopCustomersInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: topItems.map(c => c.displayName.length > 18 ? c.displayName.substring(0, 16) + "…" : c.displayName),
      datasets: [{
        label: "Perfumes pedidos",
        data: topItems.map(c => c.qty),
        backgroundColor: theme.isDark ? "rgba(16, 185, 129, 0.85)" : "rgba(21, 128, 61, 0.85)",
        borderColor: theme.isDark ? "#10b981" : "#15803d",
        borderWidth: 1,
        borderRadius: 5,
        maxBarThickness: 24
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipTitle,
          bodyColor: theme.tooltipBody,
          padding: 8,
          cornerRadius: 6,
          callbacks: {
            title: (items) => {
              const idx = items[0].dataIndex;
              return topItems[idx]?.displayName || "";
            },
            label: (item) => {
              const entry = topItems[item.dataIndex];
              const instText = entry?.institution ? ` (${entry.institution})` : "";
              return ` ${item.parsed.x} perfumes pedidos${instText} · ${formatCLP(entry?.totalVenta || 0)}`;
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            color: theme.textColor,
            stepSize: 1,
            precision: 0,
            font: { size: 10 }
          },
          grid: {
            color: theme.gridColor
          }
        },
        y: {
          ticks: {
            color: theme.textColor,
            font: { size: 10.5, weight: "500" }
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// 4. Control de colapso y sincronización del dashboard
function initAnalyticsControls() {
  const btnToggleAnalytics = document.getElementById("btnToggleAnalytics");
  const analyticsGrid = document.getElementById("analyticsGrid");
  const btnToggleAnalyticsText = document.getElementById("btnToggleAnalyticsText");
  const iconToggleAnalytics = document.getElementById("iconToggleAnalytics");

  if (btnToggleAnalytics && analyticsGrid) {
    const savedState = localStorage.getItem("notes_analytics_visible");
    if (savedState === "hidden") {
      analyticsGrid.classList.add("is-collapsed");
      btnToggleAnalytics.setAttribute("aria-expanded", "false");
      if (btnToggleAnalyticsText) btnToggleAnalyticsText.textContent = "Mostrar análisis";
      if (iconToggleAnalytics) iconToggleAnalytics.setAttribute("data-lucide", "chevron-down");
    }

    btnToggleAnalytics.addEventListener("click", () => {
      const isCollapsed = analyticsGrid.classList.toggle("is-collapsed");
      btnToggleAnalytics.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
      if (btnToggleAnalyticsText) {
        btnToggleAnalyticsText.textContent = isCollapsed ? "Mostrar análisis" : "Ocultar análisis";
      }
      if (iconToggleAnalytics) {
        iconToggleAnalytics.setAttribute("data-lucide", isCollapsed ? "chevron-down" : "chevron-up");
      }
      localStorage.setItem("notes_analytics_visible", isCollapsed ? "hidden" : "visible");
      if (window.lucide) lucide.createIcons();
      if (!isCollapsed) {
        setTimeout(() => {
          if (chartTopProductsInstance) chartTopProductsInstance.resize();
          if (chartTopInstitutionsInstance) chartTopInstitutionsInstance.resize();
          if (chartTopCustomersInstance) chartTopCustomersInstance.resize();
        }, 60);
      }
    });
  }

  // Observer para cambios de tema (dark/light)
  const themeObserver = new MutationObserver(mutations => {
    mutations.forEach(m => {
      if (m.attributeName === "data-theme") {
        if (allSaleRows && allSaleRows.length > 0) {
          renderAnalyticsDashboard(allSaleRows);
        }
      }
    });
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  window.addEventListener("storage", e => {
    if (e.key === "notes_theme" && allSaleRows && allSaleRows.length > 0) {
      renderAnalyticsDashboard(allSaleRows);
    }
  });
}

// Inicializar controles de analíticas
initAnalyticsControls();

// 7. Manejo de cambios interactivos directos en la tabla
tableBody.addEventListener("change", async event => {
  const target = event.target;
  const action = target.dataset.action;
  if (!action) return;

  const saleId = target.dataset.saleId;
  const code = target.dataset.code;

  if (action === "change-status") {
    const newStatus = target.value;
    const newSlug = getStatusSlug(newStatus);
    const todayISO = new Date().toISOString().split("T")[0];

    // Actualizar aspecto visual inmediatamente
    target.className = `status-dropdown opt-${newSlug}`;
    const dot = target.parentElement.querySelector(".status-dot");
    if (dot) dot.className = `status-dot dot-${newSlug}`;

    let updateFields = { estado: newStatus };

    // Actualizar en el modelo local
    allSaleRows.forEach(r => {
      if (r.saleId === saleId && r.code === code) {
        r.estado = newStatus;
        if (newSlug === "pedido") {
          if (!r.fechaPedidoProveedor) {
            r.fechaPedidoProveedor = todayISO;
            r.idPedidoProveedor = "PROV-" + todayISO;
          }
          updateFields.fechaPedidoProveedor = r.fechaPedidoProveedor;
          updateFields.idPedidoProveedor = r.idPedidoProveedor;
        } else if (newSlug === "pendiente" || newSlug === "encarrito") {
          r.fechaPedidoProveedor = null;
          r.idPedidoProveedor = null;
          updateFields.fechaPedidoProveedor = null;
          updateFields.idPedidoProveedor = null;
        }
      }
    });

    renderAnalyticsDashboard(allSaleRows);
    try {
      localStorage.setItem("notes_sales_updated", Date.now().toString());
    } catch (e) {}

    try {
      await updateSaleRow(saleId, code, updateFields);
      showToast(`Estado cambiado a "${newStatus}" ✓`);
      applyFilters();
    } catch (err) {
      alert("Error al actualizar estado en Firestore: " + err.message);
    }
  } else if (action === "toggle-paid") {
    const isPaid = target.checked;

    allSaleRows.forEach(r => {
      if (r.saleId === saleId && r.code === code) {
        r.pagado = isPaid;
      }
    });

    try {
      await updateSaleRow(saleId, code, { pagado: isPaid });
      showToast(isPaid ? "Marcado como Pagado (True) ✓" : "Marcado como Por Cobrar (False)");
    } catch (err) {
      alert("Error al actualizar pago en Firestore: " + err.message);
      target.checked = !isPaid;
    }
  } else if (action === "toggle-confirmed") {
    const isConfirmed = target.checked;

    allSaleRows.forEach(r => {
      if (r.saleId === saleId && r.code === code) {
        r.confirmado = isConfirmed;
      }
    });

    try {
      await updateSaleRow(saleId, code, { confirmado: isConfirmed });
      showToast(isConfirmed ? "Pedido Confirmado (True) ✓" : "Pedido desmarcado (False)");
    } catch (err) {
      alert("Error al actualizar confirmación en Firestore: " + err.message);
      target.checked = !isConfirmed;
    }
  }
});

// ==========================================================================
// 7.1 CONTROL Y GESTIÓN DE LOTES / PEDIDOS AL PROVEEDOR
// ==========================================================================

// Alternar checkbox "Seleccionar todos los pendientes"
document.addEventListener("change", event => {
  if (event.target && event.target.id === "checkSelectAllPending") {
    const isChecked = event.target.checked;
    document.querySelectorAll(".pending-row-select").forEach(cb => {
      cb.checked = isChecked;
    });
  }
});

// Abrir modal de creación de lote con los pendientes seleccionados
document.addEventListener("click", event => {
  const btn = event.target.closest("#btnOpenBatchModal");
  if (!btn) return;

  const selectedCbs = Array.from(document.querySelectorAll(".pending-row-select:checked"));
  if (selectedCbs.length === 0) {
    showToast("Selecciona al menos un perfume pendiente para crear el pedido");
    return;
  }

  const selectedItems = [];
  let totalCost = 0;
  let totalQty = 0;

  selectedCbs.forEach(cb => {
    const saleId = cb.dataset.saleId;
    const code = cb.dataset.code;
    const row = allSaleRows.find(r => r.saleId === saleId && r.code === code);
    if (row) {
      selectedItems.push(row);
      totalCost += row.costo;
      totalQty += row.qty;
    }
  });

  const modalEl = document.getElementById("modalSupplierBatch");
  const countEl = document.getElementById("batchModalItemCount");
  const costEl = document.getElementById("batchModalTotalCost");
  const listEl = document.getElementById("batchModalItemsList");
  const dateInput = document.getElementById("batchSupplierDate");

  if (countEl) countEl.textContent = `${totalQty} perfumes (${selectedItems.length} líneas)`;
  if (costEl) costEl.textContent = formatCLP(totalCost);
  if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];

  if (listEl) {
    listEl.innerHTML = selectedItems.map(it => `
      <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed var(--border-subtle);">
        <span><strong>[${it.code}]</strong> ${it.fragrance} (${it.size}) x${it.qty}</span>
        <span style="font-family: var(--font-mono);">${formatCLP(it.costo)}</span>
      </div>
    `).join("");
  }

  if (modalEl) modalEl.hidden = false;
  if (window.lucide) lucide.createIcons();
});

// Confirmar creación de lote de Pedido Proveedor
const btnConfirmBatch = document.getElementById("btnConfirmSupplierBatch");
if (btnConfirmBatch) {
  btnConfirmBatch.addEventListener("click", async () => {
    const selectedCbs = Array.from(document.querySelectorAll(".pending-row-select:checked"));
    if (selectedCbs.length === 0) {
      const m = document.getElementById("modalSupplierBatch");
      if (m) m.hidden = true;
      return;
    }

    const dateInput = document.getElementById("batchSupplierDate");
    const chosenDate = (dateInput && dateInput.value) ? dateInput.value : new Date().toISOString().split("T")[0];
    const batchId = "PROV-" + chosenDate;

    btnConfirmBatch.disabled = true;
    btnConfirmBatch.textContent = "Guardando lote...";

    try {
      const updatePromises = [];
      selectedCbs.forEach(cb => {
        const saleId = cb.dataset.saleId;
        const code = cb.dataset.code;

        // Actualizar en memoria local
        allSaleRows.forEach(r => {
          if (r.saleId === saleId && r.code === code) {
            r.estado = "Pedido";
            r.fechaPedidoProveedor = chosenDate;
            r.idPedidoProveedor = batchId;
          }
        });

        // Guardar en Firestore
        updatePromises.push(updateSaleRow(saleId, code, {
          estado: "Pedido",
          fechaPedidoProveedor: chosenDate,
          idPedidoProveedor: batchId
        }));
      });

      await Promise.all(updatePromises);
      const m = document.getElementById("modalSupplierBatch");
      if (m) m.hidden = true;
      showToast(`¡Pedido Proveedor creado! (${selectedCbs.length} productos agrupados para el ${chosenDate}) ✓`);
      applyFilters();
    } catch (err) {
      alert("Error al crear el lote de pedido: " + err.message);
    } finally {
      btnConfirmBatch.disabled = false;
      btnConfirmBatch.innerHTML = `<i data-lucide="check" aria-hidden="true"></i> Confirmar Pedido Proveedor`;
      if (window.lucide) lucide.createIcons();
    }
  });
}

// Cerrar modal de lote
document.addEventListener("click", event => {
  if (event.target.closest('[data-action="close-batch-modal"]')) {
    const m = document.getElementById("modalSupplierBatch");
    if (m) m.hidden = true;
  }
});

// Botón para activar/desactivar la separación por lotes en la tabla
const btnToggleGrouping = document.getElementById("btnToggleSupplierGrouping");
if (btnToggleGrouping) {
  if (!isSupplierGroupingEnabled) {
    btnToggleGrouping.classList.remove("btn-grouping-active");
  }
  btnToggleGrouping.addEventListener("click", () => {
    isSupplierGroupingEnabled = !isSupplierGroupingEnabled;
    localStorage.setItem("notes_supplier_grouping", isSupplierGroupingEnabled.toString());
    btnToggleGrouping.classList.toggle("btn-grouping-active", isSupplierGroupingEnabled);
    applyFilters();
    showToast(isSupplierGroupingEnabled ? "Separación por lotes de proveedor activada" : "Vista corrida plana activada");
  });
}

// Botón de colapsar / desplegar un lote cerrado
document.addEventListener("click", event => {
  const btn = event.target.closest('[data-action="toggle-batch-collapse"]');
  if (!btn) return;

  const batchKey = btn.dataset.batchKey;
  if (!batchKey) return;

  if (collapsedSupplierBatches.has(batchKey)) {
    collapsedSupplierBatches.delete(batchKey);
  } else {
    collapsedSupplierBatches.add(batchKey);
  }

  const isNowCollapsed = collapsedSupplierBatches.has(batchKey);
  const rows = document.querySelectorAll(`tr[data-batch-row="${batchKey}"]`);
  rows.forEach(r => r.classList.toggle("batch-collapsed-row", isNowCollapsed));

  btn.innerHTML = `
    <i data-lucide="${isNowCollapsed ? 'chevron-right' : 'chevron-down'}" style="width: 14px; height: 14px;"></i>
    <span>${isNowCollapsed ? 'Desplegar' : 'Contraer'}</span>
  `;
  if (window.lucide) lucide.createIcons();
});

// 8. Exportar a CSV compatible con Excel
function exportToCSV() {
  const query = (searchInput.value || "").toLowerCase().trim();

  const filtered = allSaleRows.filter(row => {
    if (!query) return true;
    const matchTarget = `${row.clientName} ${row.fragrance} ${row.code} ${row.institution} ${row.clientPhone} ${row.codigoVenta}`.toLowerCase();
    return matchTarget.includes(query);
  });

  if (filtered.length === 0) {
    alert("No hay filas para exportar.");
    return;
  }

  const headers = ["Fecha", "Código", "Fragancia", "Formato", "Cantidad", "Cliente", "Teléfono", "Institución", "Precio Venta", "Costo", "Ganancia", "Estado", "Pagado", "Pedido Confirmado"];
  const csvRows = [headers.join(";")];

  filtered.forEach(r => {
    const rowData = [
      `"${r.fecha}"`,
      `"${r.code}"`,
      `"${r.fragrance.replace(/"/g, '""')}"`,
      `"${r.size}"`,
      r.qty,
      `"${r.clientName.replace(/"/g, '""')}"`,
      `"${r.clientPhone}"`,
      `"${r.institution.replace(/"/g, '""')}"`,
      r.precioVenta,
      r.costo,
      r.ganancia,
      `"${r.estado}"`,
      r.pagado ? "TRUE" : "FALSE",
      r.confirmado ? "TRUE" : "FALSE"
    ];
    csvRows.push(rowData.join(";"));
  });

  const csvContent = "\uFEFF" + csvRows.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Ventas_Notes_Sillage_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 9. Lógica de Precios, Costos y Cálculos Dinámicos
function calculateItemPricing(code, size, product) {
  const normCode = (code || "").toUpperCase().trim();
  const cleanSize = (size || "").toLowerCase().replace(/\s+/g, "");

  let unitPrice = 17000;

  if (product) {
    if (product.tiered) {
      if (cleanSize === "50ml") unitPrice = 11000;
      else if (cleanSize === "20ml") unitPrice = 6500;
      else unitPrice = 17000;
    } else if (normCode.startsWith("Q")) {
      if (cleanSize === "50ml") unitPrice = 17000;
      else if (cleanSize === "20ml") unitPrice = 9500;
      else unitPrice = product.price || 26000;
    } else if (normCode.startsWith("J")) {
      if (cleanSize === "20ml") unitPrice = 5000;
      else unitPrice = product.price || 8000;
    } else if (/^S-?0[1-6]/.test(normCode)) {
      if (cleanSize === "500ml") unitPrice = 7000;
      else unitPrice = product.price || 6000;
    } else {
      unitPrice = product.price || 17000;
    }
  } else {
    // Estimación por código si es producto histórico
    if (normCode.startsWith("Q")) {
      if (cleanSize === "50ml") unitPrice = 17000;
      else if (cleanSize === "20ml") unitPrice = 9500;
      else unitPrice = 26000;
    } else if (normCode.startsWith("J")) {
      if (cleanSize === "20ml") unitPrice = 5000;
      else unitPrice = 8000;
    } else if (normCode === "T-03") {
      unitPrice = 13600;
    } else if (normCode === "T-04") {
      unitPrice = 7650;
    } else if (normCode.startsWith("SPLASH") || normCode === "B101" || normCode === "B-101") {
      unitPrice = 6600;
    } else if (/^S-?\d+/.test(normCode)) {
      if (cleanSize === "500ml") unitPrice = 7000;
      else unitPrice = 6000;
    } else {
      if (cleanSize === "50ml") unitPrice = 11000;
      else if (cleanSize === "20ml") unitPrice = 6500;
      else unitPrice = 17000;
    }
  }

  // Costo y ganancia unitaria
  let unitCost = Math.round(unitPrice * 0.5);
  let unitProfit = unitPrice - unitCost;

  if (typeof getUnitFinancials === "function") {
    const fin = getUnitFinancials(normCode, cleanSize, unitPrice);
    if (fin) {
      unitCost = fin.unitCost;
      unitProfit = fin.unitProfit;
    }
  }

  return { unitPrice, unitCost, unitProfit };
}

function updateModalFinancialPreview() {
  const prodVal = manualProductSelect.value;
  const p = catalogProducts.find(x => x.id === prodVal || x.code === prodVal);
  const size = manualSizeSelect.value || "100 ml";
  const qty = Math.max(1, parseInt(manualQty.value, 10) || 1);

  const code = p ? p.code : (prodVal || "");
  const { unitPrice, unitCost, unitProfit } = calculateItemPricing(code, size, p);

  const subtotalVenta = unitPrice * qty;
  const subtotalCosto = unitCost * qty;
  const subtotalGanancia = unitProfit * qty;

  if (calcUnitPrice) calcUnitPrice.textContent = formatCLP(unitPrice);
  if (calcTotalPrice) calcTotalPrice.textContent = formatCLP(subtotalVenta);
  if (calcTotalCost) calcTotalCost.textContent = formatCLP(subtotalCosto);
  if (calcTotalProfit) calcTotalProfit.textContent = `+${formatCLP(subtotalGanancia)}`;
}

function populateSizeSelectForProduct(p, currentSelectedSize) {
  manualSizeSelect.innerHTML = "";
  let sizes = [];

  const normCode = (p?.code || "").toUpperCase().trim();

  if (p?.tiered) {
    sizes = [
      { size: "100 ml", label: "100 ml ($17.000)" },
      { size: "50 ml", label: "50 ml ($11.000)" },
      { size: "20 ml", label: "20 ml ($6.500)" }
    ];
  } else if (normCode.startsWith("Q")) {
    sizes = [
      { size: "100 ml", label: "100 ml ($26.000)" },
      { size: "50 ml", label: "50 ml ($17.000)" },
      { size: "20 ml", label: "20 ml ($9.500)" }
    ];
  } else if (normCode.startsWith("J")) {
    sizes = [
      { size: "50 ml", label: "50 ml ($8.000)" },
      { size: "20 ml", label: "20 ml ($5.000)" }
    ];
  } else if (/^S-?\d+/.test(normCode)) {
    sizes = [
      { size: "400 ml", label: "400 ml ($6.000)" },
      { size: "500 ml", label: "500 ml ($7.000)" }
    ];
  } else if (p?.fixedSize) {
    sizes = [
      { size: p.fixedSize, label: `${p.fixedSize} (${formatCLP(p.price)})` }
    ];
  } else {
    sizes = [
      { size: "100 ml", label: "100 ml ($17.000)" },
      { size: "50 ml", label: "50 ml ($11.000)" },
      { size: "20 ml", label: "20 ml ($6.500)" }
    ];
  }

  if (currentSelectedSize && !sizes.some(s => s.size.toLowerCase() === currentSelectedSize.toLowerCase())) {
    sizes.unshift({ size: currentSelectedSize, label: currentSelectedSize });
  }

  sizes.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.size;
    opt.textContent = s.label;
    if (currentSelectedSize && s.size.toLowerCase() === currentSelectedSize.toLowerCase()) {
      opt.selected = true;
    }
    manualSizeSelect.appendChild(opt);
  });
}

function toInputDateFormat(dateStr, isoStr) {
  if (isoStr && typeof isoStr === "string" && isoStr.length >= 10 && !isNaN(new Date(isoStr).getTime())) {
    return isoStr.slice(0, 10);
  }
  if (dateStr && typeof dateStr === "string" && dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return new Date().toISOString().slice(0, 10);
}

// 10. Abrir Modal en Modo "Nueva Venta"
function openNewSaleModal() {
  modalMode = "new";
  currentEditSaleId = null;
  currentEditCode = null;

  modalSaleTitle.textContent = "Registrar Nueva Venta en Firestore";
  modalSaleCodeBadge.hidden = true;
  btnDeleteInModal.hidden = true;
  btnSubmitModal.textContent = "Guardar en Firestore";

  manualDate.value = new Date().toISOString().slice(0, 10);
  manualCustomerName.value = "";
  manualCustomerPhone.value = "";
  manualInstitution.value = "";
  lastAutoFilledPhone = "";
  lastAutoFilledInst = "";

  const matchBadge = document.getElementById("customerMatchBadge");
  if (matchBadge) matchBadge.hidden = true;

  if (manualProductSelect.options.length > 1) {
    manualProductSelect.selectedIndex = 1;
    const p = catalogProducts.find(x => x.id === manualProductSelect.value);
    populateSizeSelectForProduct(p, "100 ml");
  }

  manualQty.value = "1";
  manualStatus.value = "Entregado";
  manualPaid.checked = true;
  manualConfirmed.checked = true;

  updateModalFinancialPreview();
  modalNewSale.hidden = false;
  if (window.lucide) lucide.createIcons();
}

// 11. Abrir Modal en Modo "Editar Venta"
function openEditSaleModal(saleId, code) {
  modalMode = "edit";
  currentEditSaleId = saleId;
  currentEditCode = code;

  const row = allSaleRows.find(r => r.saleId === saleId && r.code === code);
  if (!row) {
    alert("No se encontró el registro seleccionado en la tabla.");
    return;
  }

  modalSaleTitle.textContent = "Editar Venta";
  modalSaleCodeBadge.textContent = row.code;
  modalSaleCodeBadge.hidden = false;
  btnDeleteInModal.hidden = false;
  btnSubmitModal.textContent = "Guardar Cambios";

  manualDate.value = toInputDateFormat(row.fecha, row.fechaISO);
  manualCustomerName.value = row.clientName || "";
  manualCustomerPhone.value = row.clientPhone || "";
  manualInstitution.value = row.institution || "";
  lastAutoFilledPhone = "";
  lastAutoFilledInst = "";

  handleCustomerNameAutoRecognition();

  let matchedProduct = catalogProducts.find(x => x.code === row.code || x.id === row.code);
  if (!matchedProduct) {
    matchedProduct = catalogProducts.find(x => x.name.toLowerCase() === row.fragrance.toLowerCase());
  }

  if (matchedProduct) {
    manualProductSelect.value = matchedProduct.id;
    populateSizeSelectForProduct(matchedProduct, row.size);
  } else {
    let customOpt = manualProductSelect.querySelector(`option[value="${row.code}"]`);
    if (!customOpt) {
      customOpt = document.createElement("option");
      customOpt.value = row.code;
      customOpt.textContent = `[${row.code}] ${row.fragrance} (Histórico)`;
      manualProductSelect.appendChild(customOpt);
    }
    manualProductSelect.value = row.code;
    populateSizeSelectForProduct(null, row.size);
  }

  manualQty.value = row.qty || 1;
  manualStatus.value = row.estado || "Entregado";
  manualPaid.checked = Boolean(row.pagado);
  manualConfirmed.checked = Boolean(row.confirmado);

  updateModalFinancialPreview();
  modalNewSale.hidden = false;
  if (window.lucide) lucide.createIcons();
}

btnNewManualSale.addEventListener("click", openNewSaleModal);

manualProductSelect.addEventListener("change", () => {
  const prodVal = manualProductSelect.value;
  const p = catalogProducts.find(x => x.id === prodVal || x.code === prodVal);
  populateSizeSelectForProduct(p, manualSizeSelect.value);
  updateModalFinancialPreview();
});

manualSizeSelect.addEventListener("change", updateModalFinancialPreview);
manualQty.addEventListener("input", updateModalFinancialPreview);
manualQty.addEventListener("change", updateModalFinancialPreview);

// Guardar (Crear o Editar)
newSaleForm.addEventListener("submit", async e => {
  e.preventDefault();

  const prodVal = manualProductSelect.value;
  let p = catalogProducts.find(x => x.id === prodVal || x.code === prodVal);

  const dateVal = manualDate.value || new Date().toISOString().slice(0, 10);
  const customerName = document.getElementById("manualCustomerName").value.trim();
  const customerPhone = document.getElementById("manualCustomerPhone").value.trim();
  const institution = document.getElementById("manualInstitution").value.trim();
  const size = manualSizeSelect.value;
  const qty = parseInt(document.getElementById("manualQty").value, 10) || 1;
  const estado = document.getElementById("manualStatus").value;
  const pagado = document.getElementById("manualPaid").checked;
  const confirmado = document.getElementById("manualConfirmed").checked;

  if (!customerName) {
    alert("Por favor ingresa el nombre del cliente.");
    return;
  }

  if (!p) {
    const opt = manualProductSelect.options[manualProductSelect.selectedIndex];
    const nameMatch = opt ? opt.text.replace(/^\[.*?\]\s*/, "") : "Perfume";
    p = {
      code: prodVal || "S/C",
      name: nameMatch,
      price: 17000,
      tiered: true
    };
  }

  const { unitPrice, unitCost, unitProfit } = calculateItemPricing(p.code, size, p);

  if (modalMode === "edit" && currentEditSaleId) {
    try {
      btnSubmitModal.disabled = true;
      btnSubmitModal.textContent = "Guardando cambios...";

      await updateFullSaleRow(currentEditSaleId, currentEditCode, {
        dateVal,
        customerName,
        customerPhone,
        institution,
        product: p,
        size,
        qty,
        unitPrice,
        unitCost,
        unitProfit,
        estado,
        pagado,
        confirmado
      });

      // Sincronizar y actualizar retroactivamente pedidos anteriores si faltaba teléfono o institución
      let backfillCount = 0;
      if (customerPhone || institution) {
        try {
          const syncRes = await syncCustomerInfoToPastSales(customerName, customerPhone, institution);
          backfillCount = syncRes?.updatedCount || 0;
        } catch (errSync) {
          console.warn("Aviso actualizando pedidos anteriores del cliente:", errSync);
        }
      }

      modalNewSale.hidden = true;
      if (backfillCount > 0) {
        showToast(`Venta actualizada (y sincronizados ${backfillCount} pedidos anteriores de ${customerName}) ✓`);
      } else {
        showToast("Venta actualizada con éxito ✓");
      }
      await loadSales();
    } catch (err) {
      alert("Error al actualizar la venta: " + err.message);
    } finally {
      btnSubmitModal.disabled = false;
      btnSubmitModal.textContent = "Guardar Cambios";
    }
  } else {
    // Modo Nueva Venta
    const salePayload = {
      customerName,
      customerPhone,
      institution,
      origin: institution ? `Venta Directa (${institution})` : "Venta Directa",
      notes: institution ? `Institución: ${institution}` : "",
      estado,
      pagado,
      confirmado,
      items: [
        {
          code: p.code,
          name: p.name,
          size: size,
          qty: qty,
          unitPrice: unitPrice,
          unitCost: unitCost,
          unitProfit: unitProfit,
          estado: estado,
          pagado: pagado,
          confirmado: confirmado
        }
      ]
    };

    try {
      btnSubmitModal.disabled = true;
      btnSubmitModal.textContent = "Guardando...";

      await recordSale(salePayload);

      // Sincronizar y actualizar retroactivamente pedidos anteriores si faltaba teléfono o institución
      let backfillCount = 0;
      if (customerPhone || institution) {
        try {
          const syncRes = await syncCustomerInfoToPastSales(customerName, customerPhone, institution);
          backfillCount = syncRes?.updatedCount || 0;
        } catch (errSync) {
          console.warn("Aviso actualizando pedidos anteriores del cliente:", errSync);
        }
      }

      modalNewSale.hidden = true;
      newSaleForm.reset();
      if (backfillCount > 0) {
        showToast(`Venta agregada (y sincronizados ${backfillCount} pedidos anteriores de ${customerName}) ✓`);
      } else {
        showToast("Venta agregada con éxito ✓");
      }
      await loadSales();
    } catch (err) {
      alert("Error al registrar la venta en Firestore: " + err.message);
    } finally {
      btnSubmitModal.disabled = false;
      btnSubmitModal.textContent = "Guardar en Firestore";
    }
  }
});

// Event listeners para reconocimiento en tiempo real del cliente
manualCustomerName.addEventListener("input", handleCustomerNameAutoRecognition);
manualCustomerName.addEventListener("change", handleCustomerNameAutoRecognition);

// Eliminar venta desde el basurero dentro del Modal
btnDeleteInModal.addEventListener("click", async () => {
  if (!currentEditSaleId) return;

  const row = allSaleRows.find(r => r.saleId === currentEditSaleId && r.code === currentEditCode);
  const desc = row ? `[${row.code}] ${row.fragrance} para ${row.clientName}` : "esta venta";

  if (!confirm(`¿Eliminar permanentemente de Firestore ${desc}? Esta acción no se puede deshacer.`)) return;

  try {
    btnDeleteInModal.disabled = true;
    btnDeleteInModal.textContent = "Eliminando...";

    await deleteSaleRow(currentEditSaleId, currentEditCode);
    modalNewSale.hidden = true;
    showToast("Venta eliminada de Firestore ✓");
    await loadSales();
  } catch (err) {
    alert("Error al eliminar venta: " + err.message);
  } finally {
    btnDeleteInModal.disabled = false;
    btnDeleteInModal.innerHTML = `<i data-lucide="trash-2" aria-hidden="true"></i><span>Eliminar Venta</span>`;
    if (window.lucide) lucide.createIcons();
  }
});

// Abrir edición al hacer clic en el botón de edición de la fila
tableBody.addEventListener("click", e => {
  const btn = e.target.closest('[data-action="edit-row"]');
  if (!btn) return;
  const saleId = btn.dataset.saleId;
  const code = btn.dataset.code;
  openEditSaleModal(saleId, code);
});

// Event listeners de controles de búsqueda y sincronización
searchInput.addEventListener("input", applyFilters);
btnClearSearch.addEventListener("click", () => {
  searchInput.value = "";
  applyFilters();
});
btnRefresh.addEventListener("click", loadSales);
if (btnExportCSV) btnExportCSV.addEventListener("click", exportToCSV);

// Cerrar modal al hacer clic en fondo o botones
document.addEventListener("click", e => {
  if (e.target.closest('[data-action="close-modal"]')) {
    modalNewSale.hidden = true;
  } else if (e.target === modalNewSale) {
    modalNewSale.hidden = true;
  }
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !modalNewSale.hidden) {
    modalNewSale.hidden = true;
  }
});

// ==========================================================================
// CONTROL DE AUTENTICACIÓN Y PROTECCIÓN DE ACCESO (FIREBASE AUTH)
// ==========================================================================
const ventasAuthModalOverlay = document.getElementById("ventasAuthModalOverlay");
const authVentasUserBar = document.getElementById("authVentasUserBar");
const authVentasEmailText = document.getElementById("authVentasEmailText");
const btnVentasLogout = document.getElementById("btnVentasLogout");
const ventasAuthForm = document.getElementById("ventasAuthForm");
const ventasAuthEmail = document.getElementById("ventasAuthEmail");
const ventasAuthPassword = document.getElementById("ventasAuthPassword");
const btnToggleVentasAuthPassword = document.getElementById("btnToggleVentasAuthPassword");
const ventasEyeOpen = document.getElementById("ventasEyeOpen");
const ventasEyeClosed = document.getElementById("ventasEyeClosed");
const ventasAuthErrorAlert = document.getElementById("ventasAuthErrorAlert");
const ventasAuthErrorMsg = document.getElementById("ventasAuthErrorMsg");
const btnSubmitVentasAuth = document.getElementById("btnSubmitVentasAuth");
const ventasAuthSpinner = document.getElementById("ventasAuthSpinner");
const ventasAuthBtnText = document.getElementById("ventasAuthBtnText");

let isVentasAuthenticated = false;

function showVentasAuthError(msg) {
  if (ventasAuthErrorMsg) ventasAuthErrorMsg.textContent = msg;
  if (ventasAuthErrorAlert) ventasAuthErrorAlert.hidden = false;
  if (window.lucide) lucide.createIcons();
}

function clearVentasAuthError() {
  if (ventasAuthErrorAlert) ventasAuthErrorAlert.hidden = true;
  if (ventasAuthErrorMsg) ventasAuthErrorMsg.textContent = "";
}

function setVentasAuthState(user) {
  if (user && user.email) {
    isVentasAuthenticated = true;
    document.body.classList.remove("auth-checking");
    if (ventasAuthModalOverlay) ventasAuthModalOverlay.hidden = true;
    if (authVentasUserBar) authVentasUserBar.hidden = false;
    if (authVentasEmailText) {
      const short = user.displayName || user.email.split("@")[0];
      authVentasEmailText.textContent = short;
      if (authVentasEmailText.parentElement) {
        authVentasEmailText.parentElement.title = `Sesión activa: ${user.email}`;
      }
    }
    if (btnNewManualSale) btnNewManualSale.disabled = false;
    if (btnExportCSV) btnExportCSV.disabled = false;

    // Cargar datos una vez validada la autenticación
    initCatalog();
    loadSales();
    if (window.lucide) lucide.createIcons();
  } else {
    isVentasAuthenticated = false;
    // Si intenta ingresar por la URL sin sesión activa, redirige inmediatamente al inicio
    window.location.replace("index.html");
  }
}

// Toggle mostrar / ocultar contraseña en el modal de ventas
if (btnToggleVentasAuthPassword && ventasAuthPassword) {
  btnToggleVentasAuthPassword.addEventListener("click", () => {
    const isPass = ventasAuthPassword.type === "password";
    ventasAuthPassword.type = isPass ? "text" : "password";
    if (ventasEyeOpen && ventasEyeClosed) {
      ventasEyeOpen.style.display = isPass ? "none" : "";
      ventasEyeClosed.style.display = isPass ? "" : "none";
    }
    btnToggleVentasAuthPassword.setAttribute("title", isPass ? "Ocultar contraseña" : "Mostrar contraseña");
    if (window.lucide) lucide.createIcons();
  });
}

// Submit del formulario de inicio de sesión en ventas
if (ventasAuthForm) {
  ventasAuthForm.addEventListener("submit", async e => {
    e.preventDefault();
    clearVentasAuthError();

    const email = (ventasAuthEmail?.value || "").trim();
    const password = ventasAuthPassword?.value || "";

    if (!email || !password) {
      showVentasAuthError("Ingresa tu correo y contraseña.");
      return;
    }

    if (btnSubmitVentasAuth) btnSubmitVentasAuth.disabled = true;
    if (ventasAuthSpinner) ventasAuthSpinner.hidden = false;
    if (ventasAuthBtnText) ventasAuthBtnText.textContent = "Verificando...";

    try {
      const res = await loginWithEmail(email, password);
      if (res.success) {
        clearVentasAuthError();
        if (ventasAuthPassword) ventasAuthPassword.value = "";
        setVentasAuthState(res.user);
      } else {
        showVentasAuthError(res.message || "Error al iniciar sesión.");
      }
    } catch (err) {
      showVentasAuthError(err.message || "Ocurrió un error inesperado al conectar.");
    } finally {
      if (btnSubmitVentasAuth) btnSubmitVentasAuth.disabled = false;
      if (ventasAuthSpinner) ventasAuthSpinner.hidden = true;
      if (ventasAuthBtnText) ventasAuthBtnText.textContent = "Ingresar";
      if (window.lucide) lucide.createIcons();
    }
  });
}

// Cerrar sesión
if (btnVentasLogout) {
  btnVentasLogout.addEventListener("click", async () => {
    try {
      await logoutUser();
      setVentasAuthState(null);
    } catch (err) {
      console.error("Error al salir:", err);
    }
  });
}

// Control de Modo Claro / Modo Oscuro
function initVentasTheme() {
  const toggleBtn = document.getElementById("themeToggleBtn");
  if (!toggleBtn) return;

  const updateToggleLabels = () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    toggleBtn.setAttribute("aria-label", isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
    toggleBtn.setAttribute("title", isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
  };

  updateToggleLabels();

  toggleBtn.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    if (isDark) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("notes_theme", "light");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("notes_theme", "dark");
    }
    updateToggleLabels();
    if (window.lucide) lucide.createIcons();
  });
}

initVentasTheme();

// Timeout de resguardo: si en 2.5 segundos no hay sesión activa, redirigir al inicio
const authRedirectTimer = setTimeout(() => {
  if (!isVentasAuthenticated) {
    window.location.replace("index.html");
  }
}, 2500);

// Arranque reactivo protegido
onAuthStatusChange(user => {
  clearTimeout(authRedirectTimer);
  setVentasAuthState(user);
});
