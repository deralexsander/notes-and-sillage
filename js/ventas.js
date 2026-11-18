// Lógica de la Planilla y Tabla Detallada de Ventas - Notes & Sillage
import {
  getSalesHistory,
  recordSale,
  updateSaleRow,
  updateMultipleSaleRows,
  updateFullSaleRow,
  deleteSaleRow,
  syncCustomerInfoToPastSales,
  getUnitFinancials,
  loadCatalogFromFirestore,
  loginWithEmail,
  logoutUser,
  onAuthStatusChange,
  getCurrentUser,
  getBalancesConfig,
  saveBalancesConfig,
  getGastos,
  saveGasto,
  deleteGasto,
  DEFAULT_BALANCES_CONFIG
} from "./firebase-config.js";

let allSaleRows = [];
let catalogProducts = [];
let modalMode = "new"; // "new" | "edit"
let currentEditSaleId = null;
let currentEditCode = null;

const isSupplierGroupingEnabled = true;
try {
  localStorage.removeItem("notes_supplier_grouping");
  localStorage.removeItem("notes_sales_summary_view");
} catch (e) {}
let isUnpaidViewActive = false;
let currentBalancesConfig = { ...DEFAULT_BALANCES_CONFIG };
let currentExpenses = [];

// Carga y guardado persistente de lotes colapsados en el navegador (localStorage)
function getSavedCollapsedBatches() {
  try {
    const raw = localStorage.getItem("notes_collapsed_batches");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch (e) {}
  return new Set();
}

function persistCollapsedBatches() {
  try {
    localStorage.setItem("notes_collapsed_batches", JSON.stringify([...collapsedSupplierBatches]));
  } catch (e) {}
}

const collapsedSupplierBatches = getSavedCollapsedBatches();

// Control de lotes con Descuento de Proveedor los Martes (10%)
function getSavedTuesdayBatches() {
  try {
    const raw = localStorage.getItem("notes_tuesday_batches");
    return new Set(raw ? JSON.parse(raw) : ["2026-11-18", "2026-11-17"]);
  } catch (e) {
    return new Set(["2026-11-18", "2026-11-17"]);
  }
}

function persistTuesdayBatches() {
  try {
    localStorage.setItem("notes_tuesday_batches", JSON.stringify([...tuesdayBatches]));
  } catch (e) {}
}

const tuesdayBatches = getSavedTuesdayBatches();

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

// Monto de compra mayorista al proveedor
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
  if (slug === "pendiente" || slug === "encarrito" || slug === "faltante") {
    return { isPending: true, batchKey: "PENDIENTE", title: "PENDIENTES" };
  }

  // Obtener fecha de la venta en formato YYYY-MM-DD
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

  // 1. Las ventas históricas (hasta el 08-11-2026) pertenecen SIEMPRE a uno de los 6 pedidos oficiales de PEDIDOS.TXT
  if (dateStr && dateStr <= "2026-11-08") {
    for (const b of HISTORICAL_SUPPLIER_BATCHES) {
      if (dateStr <= b.cutoff) {
        return { isPending: false, batchKey: b.key, title: b.title };
      }
    }
  }

  // 2. Para ventas posteriores al 08-11-2026:
  // Si se le asignó un lote específico mediante el botón/modal "Pasar a Pedido Proveedor"
  if (row.fechaPedidoProveedor) {
    const customDate = row.fechaPedidoProveedor;
    const histMatch = HISTORICAL_SUPPLIER_BATCHES.find(b => b.key === customDate);
    if (histMatch) {
      return { isPending: false, batchKey: histMatch.key, title: histMatch.title };
    }
    return { isPending: false, batchKey: customDate, title: getSupplierBatchTitle(customDate) };
  }

  // 3. Ventas posteriores al 08-11-2026 que ya están en pedido/entregado pero sin lote explícito
  if (dateStr) {
    return { isPending: false, batchKey: dateStr, title: getSupplierBatchTitle(dateStr) };
  }

  // Por defecto, si no tiene fecha ni lote y está pendiente
  return { isPending: true, batchKey: "PENDIENTE", title: "PENDIENTES" };
}

// Elementos del DOM
const tableBody = document.getElementById("salesTableBody");
const emptyState = document.getElementById("tableEmptyState");
const tableEmptyStateDesc = document.getElementById("tableEmptyStateDesc");
const tableEmptyStateSuggestion = document.getElementById("tableEmptyStateSuggestion");
const searchSuggestionBanner = document.getElementById("searchSuggestionBanner");
const searchInput = document.getElementById("searchInput");
const btnClearSearch = document.getElementById("btnClearSearch");
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
const manualProductSearch = document.getElementById("manualProductSearch");
const manualProductMatchBadge = document.getElementById("manualProductMatchBadge");
const manualProductSelect = document.getElementById("manualProductSelect");
const manualSizeSelect = document.getElementById("manualSizeSelect");
const manualQty = document.getElementById("manualQty");
const manualStatus = document.getElementById("manualStatus");
const manualPaid = document.getElementById("manualPaid");
const manualConfirmed = document.getElementById("manualConfirmed");
const manualUnitPrice = document.getElementById("manualUnitPrice");
const manualUnitCost = document.getElementById("manualUnitCost");
const manualAtCost = document.getElementById("manualAtCost");
const manualZeroCost = document.getElementById("manualZeroCost");
const manualClientGift = document.getElementById("manualClientGift");
const btnSetAtCost = document.getElementById("btnSetAtCost");
const btnSetZeroCost = document.getElementById("btnSetZeroCost");
const btnSetClientGift = document.getElementById("btnSetClientGift");
const btnResetCost = document.getElementById("btnResetCost");
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

// Comprobar si dos filas de venta pertenecen exactamente al mismo cliente
function isSameCustomer(r1, r2) {
  if (!r1 || !r2) return false;
  if (r1 === r2) return true;

  const name1 = normalizeCustomerName(r1.clientName);
  const name2 = normalizeCustomerName(r2.clientName);

  // Si ambos tienen nombres válidos y no coinciden, NO son el mismo cliente
  if (name1 && name2 && name1 !== "cliente" && name2 !== "cliente") {
    if (name1 !== name2) {
      return false;
    }
  }

  // 1. Mismo saleId (pertenecen a la misma venta registrada en Firestore)
  if (r1.saleId && r2.saleId && r1.saleId === r2.saleId) {
    return true;
  }

  // 2. Coincidencia por teléfono (si ambos tienen dígitos válidos y no es el teléfono del vendedor)
  const phone1 = (r1.clientPhone || "").replace(/[^0-9]/g, "");
  const phone2 = (r2.clientPhone || "").replace(/[^0-9]/g, "");
  const ownerTail = "68787862"; // Teléfono del dueño / vendedor por defecto de la tienda

  if (phone1.length >= 8 && phone2.length >= 8) {
    const tail1 = phone1.slice(-8);
    const tail2 = phone2.slice(-8);

    // Si el teléfono es el del vendedor, solo agrupar si el nombre coincide exactamente
    if (tail1 === ownerTail || tail2 === ownerTail) {
      return name1 && name2 && name1 === name2;
    }

    if (tail1 === tail2) {
      return true;
    }
  }

  // 3. Coincidencia por nombre normalizado
  if (name1 && name2 && name1 !== "cliente" && name1.length >= 3) {
    return name1 === name2;
  }

  return false;
}

// Obtener todas las líneas de pedidos entregados y sin pagar del mismo cliente
function getCustomerUnpaidOrders(targetRow) {
  if (!targetRow) return [];
  const pool = Array.isArray(allSaleRows) && allSaleRows.length > 0 ? allSaleRows : [targetRow];

  let matches = pool.filter(r => {
    const isUnpaidDelivered = !r.pagado && (r.estado || "").toLowerCase().trim() === "entregado";
    return isUnpaidDelivered && isSameCustomer(r, targetRow);
  });

  if (matches.length === 0 && !targetRow.pagado && (targetRow.estado || "").toLowerCase().trim() === "entregado") {
    matches = [targetRow];
  }

  // Eliminar posibles referencias duplicadas
  const seen = new Set();
  const uniqueMatches = [];
  matches.forEach(m => {
    const key = `${m.saleId || ""}_${m.code || ""}_${m.fragrance || ""}_${m.size || ""}_${m.precioVenta || 0}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueMatches.push(m);
    }
  });

  return uniqueMatches;
}

function buildPaymentReminderText(row, unpaidList) {
  const bank = currentBalancesConfig?.datosBancarios || DEFAULT_BALANCES_CONFIG.datosBancarios;
  const firstName = (row.clientName || "Estimado/a").trim().split(" ")[0];
  const unpaidOrders = (unpaidList && unpaidList.length > 0) ? unpaidList : getCustomerUnpaidOrders(row);

  if (unpaidOrders.length <= 1) {
    const target = unpaidOrders[0] || row;
    const totalStr = formatCLP(target.precioVenta || 0);
    const codeStr = (target.code && target.code !== "-") ? `[${target.code}] ` : "";
    const sizeStr = target.size ? ` (${target.size})` : "";
    const qtyStr = (target.qty && target.qty > 1) ? ` x${target.qty}` : "";
    const perfumeInfo = target.fragrance ? `• ${codeStr}${target.fragrance}${sizeStr}${qtyStr}` : "• Tu pedido de perfume";

    return `¡Hola ${firstName}! 👋🌸 Te saludamos de Notes & Sillage.

Te escribimos con mucho agrado respecto a tu pedido entregado:
${perfumeInfo}

El total pendiente de transferencia es: ${totalStr}

Puedes transferir directamente a los siguientes datos de cuenta:
🏦 Banco / Billetera: ${bank.banco}
📋 Tipo de cuenta: ${bank.tipoCuenta}
🔢 N° de cuenta: ${bank.numeroCuenta}
👤 Titular: ${bank.titular}
🆔 RUT: ${bank.rut}
📧 Correo: ${bank.email}

Una vez realizada la transferencia, por favor envíanos el comprobante por este medio. ¡Muchas gracias por tu preferencia y que disfrutes muchísimo tu perfume! ✨`;
  }

  // Si hay 2 o más pedidos sin pagar: resumen agrupado y total acumulado
  const grandTotal = unpaidOrders.reduce((sum, item) => sum + (Number(item.precioVenta) || 0), 0);
  const totalUnits = unpaidOrders.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
  const totalStr = formatCLP(grandTotal);

  const linesList = unpaidOrders.map(item => {
    const codeStr = (item.code && item.code !== "-") ? `[${item.code}] ` : "";
    const sizeStr = item.size ? ` (${item.size})` : "";
    const qtyStr = (item.qty && item.qty > 1) ? ` x${item.qty}` : "";
    const priceStr = formatCLP(item.precioVenta || 0);
    return `• ${codeStr}${item.fragrance}${sizeStr}${qtyStr} — ${priceStr}`;
  }).join("\n");

  const countLabel = totalUnits > unpaidOrders.length
    ? `${unpaidOrders.length} pedidos (${totalUnits} perfumes)`
    : `${unpaidOrders.length} pedidos`;

  return `¡Hola ${firstName}! 👋🌸 Te saludamos de Notes & Sillage.

Te escribimos con mucho agrado respecto a tus pedidos entregados pendientes de pago (${countLabel}):
${linesList}

El total acumulado a transferir es: ${totalStr}

Puedes transferir directamente a los siguientes datos de cuenta:
🏦 Banco / Billetera: ${bank.banco}
📋 Tipo de cuenta: ${bank.tipoCuenta}
🔢 N° de cuenta: ${bank.numeroCuenta}
👤 Titular: ${bank.titular}
🆔 RUT: ${bank.rut}
📧 Correo: ${bank.email}

Una vez realizada la transferencia, por favor envíanos el comprobante por este medio. ¡Muchas gracias por tu preferencia y que disfrutes muchísimo tus perfumes! ✨`;
}

function renderPhoneCell(phone, row) {
  if (!phone || !phone.trim()) {
    return `<span class="phone-empty">-</span>`;
  }
  const cleanDigits = phone.replace(/[^0-9]/g, "");
  const shortDisplay = phone.replace(/^\+56\s*/, "");
  if (!cleanDigits || cleanDigits.length < 8) {
    return `<span class="phone-text">${shortDisplay}</span>`;
  }

  const isDeliveredAndUnpaid = row && !row.pagado && (row.estado || "").toLowerCase().trim() === "entregado";

  if (isDeliveredAndUnpaid) {
    const unpaidOrders = getCustomerUnpaidOrders(row);
    const reminderText = buildPaymentReminderText(row, unpaidOrders);
    const waUrl = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(reminderText)}`;

    let btnTitle = `Cobrar por WhatsApp: faltante de pago entregado (${shortDisplay})`;
    if (unpaidOrders.length >= 2) {
      const grandTotal = unpaidOrders.reduce((sum, item) => sum + (Number(item.precioVenta) || 0), 0);
      btnTitle = `Cobrar por WhatsApp: resumen de ${unpaidOrders.length} pedidos entregados sin pagar (${formatCLP(grandTotal)})`;
    }

    return `
      <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-wa-reminder" title="${btnTitle}">
        <i data-lucide="message-circle" aria-hidden="true" style="width: 14px; height: 14px;"></i>
      </a>
    `;
  }

  const waUrl = `https://wa.me/${cleanDigits}`;
  return `
    <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="phone-link" title="Abrir WhatsApp con ${phone}">
      <i data-lucide="message-circle" aria-hidden="true"></i>
      <span>${shortDisplay}</span>
    </a>
  `;
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

  // Si el cliente es el dueño (Alexander Muñoz), autoconfigurar al costo por defecto
  const isOwner = norm.includes("alexander") || (match.phone && match.phone.replace(/\D/g, "").includes("68787862"));
  if (isOwner && modalMode === "new") {
    if (manualAtCost && !manualAtCost.checked) {
      manualAtCost.checked = true;
      updateModalFinancialPreview(false);
    }
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
    const isMobile = window.innerWidth <= 768;
    const initialColspan = isMobile ? 6 : 15;
    tableBody.innerHTML = `<tr><td colspan="${initialColspan}" style="text-align:center; padding:35px; color:var(--text-muted);"><i data-lucide="loader" class="spin"></i> Sincronizando ventas desde Firestore...</td></tr>`;
    if (window.lucide) lucide.createIcons();

    const [sales, balancesCfg, expensesList] = await Promise.all([
      getSalesHistory(),
      getBalancesConfig(),
      getGastos()
    ]);

    if (balancesCfg) currentBalancesConfig = balancesCfg;
    if (expensesList) currentExpenses = expensesList;

    syncBalancesModalInputs();
    updateOctoberBalances();
    renderExpensesTable();

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
        const unitProfit = typeof item.unitProfit === "number" ? item.unitProfit : (unitPrice - unitCost);

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
          pagado: (typeof item.pagado === "boolean" ? item.pagado : pagadoGeneral) || (typeof item.montoPagado === "number" && item.montoPagado >= subtotalVenta && subtotalVenta > 0),
          montoPagado: typeof item.montoPagado === "number" ? item.montoPagado : ((typeof item.pagado === "boolean" ? item.pagado : pagadoGeneral) ? subtotalVenta : 0),
          saldoPendiente: typeof item.saldoPendiente === "number" ? item.saldoPendiente : Math.max(0, subtotalVenta - (typeof item.montoPagado === "number" ? item.montoPagado : ((typeof item.pagado === "boolean" ? item.pagado : pagadoGeneral) ? subtotalVenta : 0))),
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
    const errColspan = (window.innerWidth <= 768) ? 6 : 15;
    tableBody.innerHTML = `<tr><td colspan="${errColspan}" style="text-align:center; padding:30px; color:#ef4444;">Error al consultar Firestore: ${err.message}</td></tr>`;
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

// ==========================================================================
// FUNCIONES DE BÚSQUEDA Y TOLERANCIA A ERRORES TIPOGRÁFICOS (PORTADAS DE INDEX.HTML)
// ==========================================================================

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeProductCode(value) {
  return normalizeSearchText(value)
    .replace(/\s+/g, "")
    .replace(/([a-z]+)0+(\d+)/g, "$1$2");
}

function getProductCodeVariants(code) {
  return String(code || "").split(/[\/,;|]/).map(normalizeProductCode).filter(Boolean);
}

function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

function escapeAttr(value) {
  return String(value || "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function getAllAvailableProducts() {
  const list = [...catalogProducts];
  const seenCodes = new Set(catalogProducts.map(p => (p.code || "").toUpperCase().trim()));

  allSaleRows.forEach(r => {
    const code = (r.code || "").toUpperCase().trim();
    if (code && !seenCodes.has(code)) {
      seenCodes.add(code);
      list.push({
        id: r.code,
        code: r.code,
        name: r.fragrance || r.code,
        sub: "",
        notes: "",
        price: r.precioVenta || 17000
      });
    }
  });

  return list;
}

function productMatchesQuery(p, rawQuery, allProducts = null) {
  const query = normalizeSearchText(rawQuery);
  if (!query) return true;
  const compactQuery = query.replace(/\s+/g, "");
  const codeQuery = normalizeProductCode(rawQuery);
  const queryWords = query.split(/\s+/).filter(Boolean);
  const exactCodeQuery = /^[a-z]+\d+$/.test(codeQuery);

  const prodList = allProducts || getAllAvailableProducts();
  const hasExactCodeMatch = exactCodeQuery && prodList.some(item =>
    getProductCodeVariants(item.code).includes(codeQuery)
  );
  if (hasExactCodeMatch) return getProductCodeVariants(p.code).includes(codeQuery);

  const searchableText = normalizeSearchText([p.code, p.name, p.sub, p.notes].filter(Boolean).join(" "));
  const searchableWords = searchableText.split(" ");
  return searchableText.replace(/\s+/g, "").includes(compactQuery) ||
    queryWords.every(word => searchableWords.some(searchableWord => searchableWord.startsWith(word)));
}

// Sugiere el nombre de la base de datos o catálogo más parecido a lo escrito aunque tenga errores ortográficos
function findSearchSuggestion(rawQuery, allProducts = null) {
  const query = normalizeSearchText(rawQuery);
  if (query.length < 3) return "";
  const queryWords = query.split(/\s+/).filter(Boolean);
  const prodList = allProducts || getAllAvailableProducts();

  const vocabulary = new Set();
  prodList.forEach(p => {
    normalizeSearchText([p.name, p.sub, p.code].filter(Boolean).join(" ")).split(" ")
      .forEach(word => { if (word.length >= 3 || /^\d+$/.test(word)) vocabulary.add(word); });
  });

  const corrected = queryWords.map(word => {
    if (vocabulary.has(word) || /^\d+$/.test(word)) return word;
    const maxDistance = word.length <= 4 ? 1 : 2;
    let best = word, bestDistance = maxDistance + 1;
    vocabulary.forEach(candidate => {
      const distance = editDistance(word, candidate);
      if (distance < bestDistance) { best = candidate; bestDistance = distance; }
    });
    return best;
  });
  const correctedQuery = corrected.join(" ");
  if (correctedQuery !== query) {
    const match = prodList.find(p => productMatchesQuery(p, correctedQuery, prodList));
    if (match) return match.name;
  }

  // Comparación contra el nombre completo
  const compact = query.replace(/\s+/g, "");
  let bestName = "", bestDistance = Math.max(2, Math.floor(compact.length / 4)) + 1;
  prodList.forEach(p => {
    const distance = editDistance(compact, normalizeSearchText(p.name).replace(/\s+/g, ""));
    if (distance < bestDistance) { bestName = p.name; bestDistance = distance; }
  });
  return bestName;
}

// Comprueba si una fila de venta coincide directamente con la consulta (cliente, código, institución, fragancia, etc.)
function rowMatchesDirectly(row, rawQuery, allProducts) {
  const query = normalizeSearchText(rawQuery);
  if (!query) return true;

  const compactQuery = query.replace(/\s+/g, "");
  const codeQuery = normalizeProductCode(rawQuery);

  // 1. Coincidencia directa de código normalizado (ej: "f-12" con "f12", "j00" con "j-00")
  if (codeQuery && normalizeProductCode(row.code) === codeQuery) return true;

  // 2. Coincidencia por texto completo (cliente, fragancia, código, institución, teléfono, código venta)
  const fullTarget = normalizeSearchText(`${row.clientName} ${row.fragrance} ${row.code} ${row.institution} ${row.clientPhone} ${row.codigoVenta}`);
  if (fullTarget.includes(query) || fullTarget.replace(/\s+/g, "").includes(compactQuery)) return true;

  // 3. Coincidencia de producto usando productMatchesQuery (código, nombre, notas, sub)
  const productStub = { code: row.code, name: row.fragrance };
  if (productMatchesQuery(productStub, rawQuery, allProducts)) return true;

  // 4. Coincidencia si cada palabra de la búsqueda aparece en algún campo del registro
  const queryWords = query.split(/\s+/).filter(Boolean);
  if (queryWords.length > 1) {
    const rowWords = fullTarget.split(/\s+/).filter(Boolean);
    const allWordsMatch = queryWords.every(qWord => {
      if (rowWords.some(rWord => rWord.startsWith(qWord) || rWord.includes(qWord))) return true;
      if (normalizeProductCode(row.code) === normalizeProductCode(qWord)) return true;
      return false;
    });
    if (allWordsMatch) return true;
  }

  return false;
}

let currentFilteredRows = [];

// 4. Filtro de búsqueda en tiempo real con tolerancia a errores tipográficos
function applyFilters() {
  const rawQuery = (searchInput.value || "").trim();
  btnClearSearch.hidden = !rawQuery;

  const unpaidRows = allSaleRows.filter(r => !r.pagado && (r.estado || "").toLowerCase().trim() === "entregado");
  const badgeUnpaidCount = document.getElementById("badgeUnpaidCount");
  if (badgeUnpaidCount) badgeUnpaidCount.textContent = unpaidRows.length;

  const baseRows = isUnpaidViewActive ? unpaidRows : allSaleRows;
  const allProds = getAllAvailableProducts();

  // Reset de avisos de sugerencia
  if (searchSuggestionBanner) {
    searchSuggestionBanner.hidden = true;
    searchSuggestionBanner.innerHTML = "";
  }
  if (tableEmptyStateSuggestion) {
    tableEmptyStateSuggestion.hidden = true;
    tableEmptyStateSuggestion.innerHTML = "";
  }

  if (!rawQuery) {
    currentFilteredRows = baseRows;
    renderTable(currentFilteredRows);
    updateMetrics(currentFilteredRows);
    updateOctoberBalances();
    return;
  }

  // 1. Filtrado directo
  const directMatches = baseRows.filter(row => rowMatchesDirectly(row, rawQuery, allProds));

  if (directMatches.length > 0) {
    currentFilteredRows = directMatches;
    renderTable(currentFilteredRows);
    updateMetrics(currentFilteredRows);
    updateOctoberBalances();
    return;
  }

  // 2. Si no hay coincidencias directas, buscar si el perfume o término está mal escrito (función de index.html)
  const suggestion = findSearchSuggestion(rawQuery, allProds);

  if (suggestion) {
    // Buscar si hay filas con la fragancia sugerida corregida
    const suggestedMatches = baseRows.filter(row => rowMatchesDirectly(row, suggestion, allProds));

    if (suggestedMatches.length > 0) {
      currentFilteredRows = suggestedMatches;
      if (searchSuggestionBanner) {
        searchSuggestionBanner.innerHTML = `
          <div class="suggestion-info">
            <span class="search-suggestion-badge">¿Quisiste decir?</span>
            <span>Mostrando ventas de <strong>${escapeHTML(suggestion)}</strong></span>
            <span style="opacity: 0.75; font-size: 0.76rem;">(coincidencia aproximada para "<em>${escapeHTML(rawQuery)}</em>")</span>
          </div>
          <button type="button" class="search-suggestion-btn" data-action="apply-suggestion" data-suggestion="${escapeAttr(suggestion)}" title="Fijar búsqueda como ${escapeAttr(suggestion)}">
            Buscar "${escapeHTML(suggestion)}"
          </button>
        `;
        searchSuggestionBanner.hidden = false;
        if (window.lucide) lucide.createIcons();
      }

      renderTable(currentFilteredRows);
      updateMetrics(currentFilteredRows);
      updateOctoberBalances();
      return;
    } else {
      // La sugerencia existe en el catálogo pero no hay ventas de ese producto
      currentFilteredRows = [];
      renderTable([]);
      if (tableEmptyStateDesc) {
        tableEmptyStateDesc.textContent = `No se encontraron ventas para "${rawQuery}".`;
      }
      if (tableEmptyStateSuggestion) {
        tableEmptyStateSuggestion.innerHTML = `¿Quisiste decir <button type="button" class="search-suggestion-btn" data-action="apply-suggestion" data-suggestion="${escapeAttr(suggestion)}">${escapeAttr(suggestion)}</button>?`;
        tableEmptyStateSuggestion.hidden = false;
      }
      return;
    }
  }

  // 3. Sin coincidencias ni sugerencias
  currentFilteredRows = [];
  renderTable([]);
  if (tableEmptyStateDesc) {
    tableEmptyStateDesc.textContent = `No se encontraron ventas coincidentes con "${rawQuery}".`;
  }
}

// ==========================================================================
// REGISTRO DE FILAS FUSIONADAS POR CLIENTE (PEDIDOS MULTI-PRODUCTO)
// ==========================================================================
const activeFusedRowsMap = new Map();

function normalizeCustomerPhone(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(-9) : digits;
}

function normalizeCustomerString(str) {
  if (!str) return "";
  return String(str).trim().toLowerCase();
}

function formatCustomerProductsSummary(products) {
  if (!Array.isArray(products) || products.length === 0) return "";
  if (products.length === 1) {
    return products[0].fragrance;
  }
  const map = new Map();
  products.forEach(p => {
    const key = `${p.fragrance} (${p.size})`;
    map.set(key, (map.get(key) || 0) + (Number(p.qty) || 1));
  });
  return Array.from(map.entries())
    .map(([desc, q]) => q > 1 ? `${desc} [x${q}]` : desc)
    .join(" + ");
}

function fuseRowsByCustomer(rowsList, batchKey = "") {
  if (!Array.isArray(rowsList) || rowsList.length === 0) return [];

  const groupsMap = new Map();
  const order = [];

  rowsList.forEach((row, originalIdx) => {
    const normName = normalizeCustomerString(row.clientName);
    const normPhone = normalizeCustomerPhone(row.clientPhone);
    const normInst = normalizeCustomerString(row.institution);

    const canFuse = normName && normName !== "-" && normName !== "cliente" && normName !== "sin cliente";
    const fusionKey = canFuse ? `${batchKey}__${normName}__${normPhone}__${normInst}` : `solo_${originalIdx}_${row.saleId}_${row.code}`;

    if (!groupsMap.has(fusionKey)) {
      groupsMap.set(fusionKey, []);
      order.push(fusionKey);
    }
    groupsMap.get(fusionKey).push(row);
  });

  const result = [];

  order.forEach(fusionKey => {
    const items = groupsMap.get(fusionKey);
    if (items.length === 1) {
      const r = items[0];
      const isSolo = fusionKey.startsWith("solo_");
      const fKey = isSolo ? `${r.saleId}__${r.code}` : fusionKey;
      const fusedObj = {
        ...r,
        isFused: false,
        fusionKey: fKey,
        items: [r],
        products: [{
          code: r.code,
          fragrance: r.fragrance,
          size: r.size,
          qty: r.qty,
          precioVenta: r.precioVenta,
          costo: r.costo,
          ganancia: r.ganancia,
          estado: r.estado,
          pagado: r.pagado,
          montoPagado: r.montoPagado,
          saldoPendiente: r.saldoPendiente
        }]
      };
      result.push(fusedObj);
      activeFusedRowsMap.set(fKey, fusedObj);
      activeFusedRowsMap.set(`${r.saleId}__${r.code}`, fusedObj);
    } else {
      const primary = items[0];
      const totalQty = items.reduce((sum, it) => sum + (Number(it.qty) || 1), 0);
      const totalVenta = items.reduce((sum, it) => sum + (Number(it.precioVenta) || 0), 0);
      const totalCosto = items.reduce((sum, it) => sum + (Number(it.costo) || 0), 0);
      const totalGanancia = items.reduce((sum, it) => sum + (Number(it.ganancia) || 0), 0);
      const totalMontoPagado = items.reduce((sum, it) => sum + (Number(it.montoPagado) || 0), 0);
      const totalSaldoPendiente = Math.max(0, totalVenta - totalMontoPagado);
      const isAllPaid = (totalMontoPagado >= totalVenta && totalVenta > 0) || items.every(it => it.pagado);

      const products = items.map(it => ({
        code: it.code,
        fragrance: it.fragrance,
        size: it.size,
        qty: it.qty,
        precioVenta: it.precioVenta,
        costo: it.costo,
        ganancia: it.ganancia,
        estado: it.estado,
        pagado: it.pagado,
        montoPagado: it.montoPagado,
        saldoPendiente: it.saldoPendiente
      }));

      const fusedObj = {
        ...primary,
        isFused: true,
        fusionKey: fusionKey,
        items: items,
        products: products,
        qty: totalQty,
        precioVenta: totalVenta,
        costo: totalCosto,
        ganancia: totalGanancia,
        montoPagado: totalMontoPagado,
        saldoPendiente: totalSaldoPendiente,
        pagado: isAllPaid,
        estado: primary.estado
      };

      result.push(fusedObj);
      activeFusedRowsMap.set(fusionKey, fusedObj);
      items.forEach(it => {
        activeFusedRowsMap.set(`${it.saleId}__${it.code}`, fusedObj);
      });
    }
  });

  return result;
}

// Helper para renderizar una fila individual
function renderTableRow(row, rowNum, isPending) {
  const statusSlug = getStatusSlug(row.estado);
  const hasAbono = !row.pagado && (row.montoPagado > 0) && (row.montoPagado < row.precioVenta);
  const products = row.products && row.products.length > 0 ? row.products : [{
    code: row.code,
    fragrance: row.fragrance,
    size: row.size,
    qty: row.qty,
    precioVenta: row.precioVenta,
    costo: row.costo,
    ganancia: row.ganancia
  }];

  const isMulti = products.length > 1;

  // Renderizado para móviles: listado de perfumes ordenado y total
  const mobilePerfumeSummary = isMulti
    ? formatCustomerProductsSummary(products)
    : row.fragrance;
  const mobilePerfumeDetails = isMulti
    ? `${formatCLP(row.precioVenta)} • ${row.qty} un.`
    : `(${row.size}) • ${row.precioVenta === 0 ? 'Regalo' : formatCLP(row.precioVenta)}`;

  // En Desktop: stack si hay múltiples productos
  const desktopCodeHtml = isMulti
    ? `<div style="display: flex; flex-direction: column; gap: 3px;">
         ${products.map(p => `<span class="code-chip">${p.code}</span>`).join("")}
       </div>`
    : `<span class="code-chip">${row.code}</span>`;

  const desktopFragranceHtml = isMulti
    ? `<div style="display: flex; flex-direction: column; gap: 4px;">
         ${products.map(p => `
           <div class="fragrance-name" title="${escapeAttr(p.fragrance)}">
             ${p.costo === 0 && p.precioVenta > 0 ? '<span class="badge-zero-cost" style="font-size: 0.65rem; padding: 0 4px; margin-right: 4px; line-height: 1.4;">PUNTOS</span>' : ''}
             ${p.precioVenta === 0 ? '<span class="badge-client-gift" style="font-size: 0.65rem; padding: 0 4px; margin-right: 4px; line-height: 1.4;">REGALO</span>' : ''}
             ${escapeAttr(p.fragrance)}
           </div>
         `).join("")}
       </div>`
    : `<div class="fragrance-name" title="${escapeAttr(row.fragrance)}">
         ${row.costo === 0 && row.precioVenta > 0 ? '<span class="badge-zero-cost" style="font-size: 0.65rem; padding: 0 4px; margin-right: 4px; line-height: 1.4;">PUNTOS</span>' : ''}
         ${row.precioVenta === 0 ? '<span class="badge-client-gift" style="font-size: 0.65rem; padding: 0 4px; margin-right: 4px; line-height: 1.4;">REGALO</span>' : ''}
         ${escapeAttr(row.fragrance)}
       </div>`;

  const desktopSizeHtml = isMulti
    ? `<div style="display: flex; flex-direction: column; gap: 3px;">
         ${products.map(p => `<span class="size-tag">${escapeAttr(p.size)}</span>`).join("")}
       </div>`
    : `<span class="size-tag">${escapeAttr(row.size)}</span>`;

  const fusionAttr = row.fusionKey ? `data-fusion-key="${escapeAttr(row.fusionKey)}"` : '';

  return `
    <tr data-sale-id="${row.saleId}" data-code="${row.code}" ${fusionAttr}>
      <td class="td-num">
        <span>${rowNum}</span>
      </td>
      <td class="td-date">${row.fecha || "-"}</td>
      <td class="td-code">
        ${desktopCodeHtml}
      </td>
      <td class="td-name">
        ${desktopFragranceHtml}
      </td>
      <td class="td-size">
        ${desktopSizeHtml}
      </td>
      <td class="qty-val">${row.qty}</td>
      <td class="td-client">
        <span class="client-name" title="${escapeAttr(row.clientName)}">${escapeAttr(row.clientName)}</span>
      </td>
      <td class="td-phone">
        ${renderPhoneCell(row.clientPhone, row)}
      </td>
      <td class="td-inst">
        <span class="inst-name" title="${escapeAttr(row.institution || "-")}">${escapeAttr(row.institution || "-")}</span>
      </td>
      <td class="price-cell">
        ${row.precioVenta === 0 ? '<span class="badge-client-gift">$0 (Regalo)</span>' : formatCLP(row.precioVenta)}
      </td>
      <td class="cost-cell">
        ${row.costo === 0 ? '<span class="badge-zero-cost" title="Sin costo para nosotros (Canje de puntos o regalo del proveedor)">$0 (Canje)</span>' : formatCLP(row.costo)}
      </td>
      <td class="profit-cell ${row.ganancia === 0 ? 'profit-zero' : ''}">${row.ganancia > 0 ? '+' : ''}${formatCLP(row.ganancia)}</td>
      <td class="td-status">
        <div class="status-select-wrap">
          <span class="status-dot dot-${statusSlug}"></span>
          <select class="status-dropdown opt-${statusSlug}" data-action="change-status" data-sale-id="${row.saleId}" data-code="${row.code}" ${fusionAttr}>
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
      <td class="cell-check td-paid">
        <button type="button" class="btn-pay-status ${row.pagado ? 'status-paid' : (hasAbono ? 'status-partial' : 'status-unpaid')}" data-action="open-payment-modal" data-sale-id="${row.saleId}" data-code="${row.code}" ${fusionAttr} title="${row.pagado ? 'Pagado al 100% (Click para editar o gestionar cuotas)' : (hasAbono ? 'Abono: ' + formatCLP(row.montoPagado) + ' (Resta: ' + formatCLP(row.saldoPendiente) + ')' : 'Pendiente de pago (Click para pagar o abonar)')}">
          <i data-lucide="${row.pagado ? 'check' : (hasAbono ? 'clock' : 'circle')}" style="width: 13px; height: 13px;"></i>
        </button>
      </td>
      ${!isUnpaidViewActive ? `
        <td class="td-action" style="text-align: center; white-space: nowrap;">
          <button class="btn-edit-row" data-action="edit-row" data-sale-id="${row.saleId}" data-code="${row.code}" title="Editar venta o eliminar">
            <i data-lucide="pencil" aria-hidden="true"></i>
          </button>
        </td>
      ` : ''}
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
  activeFusedRowsMap.clear();

  document.body.classList.toggle("view-unpaid-active", isUnpaidViewActive);
  const thAction = document.querySelector(".spreadsheet-table thead .th-action");
  if (thAction) {
    thAction.hidden = isUnpaidViewActive;
    thAction.style.display = isUnpaidViewActive ? "none" : "";
  }

  const isMobileScreen = window.innerWidth <= 768;
  const headerColspan = isMobileScreen ? (isUnpaidViewActive ? 5 : 6) : (isUnpaidViewActive ? 14 : 15);

  // Si estamos en la vista de Faltantes por Pagar
  if (isUnpaidViewActive) {
    const totalUnpaidAmount = rows.reduce((sum, r) => sum + (typeof r.saldoPendiente === "number" ? r.saldoPendiente : r.precioVenta), 0);
    const fusedUnpaid = fuseRowsByCustomer(rows, "FALTANTES");

    let html = `
      <tr class="tr-supplier-header" style="background: rgba(239, 68, 68, 0.12); border-left: 4px solid #ef4444;">
        <td colspan="${headerColspan}">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="supplier-status-icon" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%;" title="Faltantes por pagar (${rows.length} perfumes)">
                <i data-lucide="receipt" style="width: 15px; height: 15px;"></i>
              </span>
            </div>
            <div>
              <span class="badge-supplier-tag" style="background: rgba(239, 68, 68, 0.2); color: #dc2626; font-weight: 700;">
                Total a Cobrar: ${formatCLP(totalUnpaidAmount)}
              </span>
            </div>
          </div>
        </td>
      </tr>
    `;
    let idx = fusedUnpaid.length;
    fusedUnpaid.forEach(r => {
      html += renderTableRow(r, idx--, false);
    });
    tableBody.innerHTML = html;
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

  // 2. Grupos de Lotes de Pedidos Proveedor (Ordenados por fecha descendente)
  const sortedBatchKeys = Object.keys(orderedBatches).sort((a, b) => b.localeCompare(a));

  // Fusionar por cliente dentro de cada lote o sección
  const fusedPendingRows = pendingRows.length > 0 ? fuseRowsByCustomer(pendingRows, "PENDIENTE") : [];
  const fusedBatchMap = {};
  let totalFusedCount = fusedPendingRows.length;

  sortedBatchKeys.forEach(bKey => {
    fusedBatchMap[bKey] = fuseRowsByCustomer(orderedBatches[bKey].rows, bKey);
    totalFusedCount += fusedBatchMap[bKey].length;
  });

  let html = "";
  let overallIndex = totalFusedCount;

  // 1. Sección PENDIENTES POR PEDIR AL PROVEEDOR
  if (pendingRows.length > 0) {
    const pendingUnits = pendingRows.reduce((sum, r) => sum + r.qty, 0);
    const pendingCost = pendingRows.reduce((sum, r) => sum + r.costo, 0);
    const pendingSale = pendingRows.reduce((sum, r) => sum + r.precioVenta, 0);
    const pendingProfit = pendingSale - pendingCost;

    const minShipping = Number(currentBalancesConfig?.envioGratisMinimo) || 120000;
    const shippingFeeAmt = Number(currentBalancesConfig?.costoEnvioFijo) || 6000;
    const diffShipping = Math.max(0, minShipping - pendingCost);
    const progressShipping = Math.min(100, Math.round((pendingCost / minShipping) * 100));
    const isPendingCollapsed = collapsedSupplierBatches.has("PENDIENTE");
    const shippingTag = diffShipping > 0
      ? `<span class="badge-supplier-tag tag-shipping-pending" title="Meta para envío gratis: ${formatCLP(minShipping)} (Falta: ${formatCLP(diffShipping)} - ${progressShipping}%. Flete: ${formatCLP(shippingFeeAmt)})" data-action="show-shipping-info" data-shipping-info="🚚 Falta ${formatCLP(diffShipping)} para envío gratis (Meta: ${formatCLP(minShipping)}). Flete: ${formatCLP(shippingFeeAmt)}" style="cursor: pointer;">
           <i data-lucide="truck" style="width: 13px; height: 13px;"></i>
         </span>`
      : `<span class="badge-supplier-tag tag-shipping-reached" title="¡Meta de envío gratis superada! (${formatCLP(pendingCost)} / ${formatCLP(minShipping)})" data-action="show-shipping-info" data-shipping-info="🎉 ¡Envío gratis alcanzado! (${formatCLP(pendingCost)} / ${formatCLP(minShipping)})" style="cursor: pointer;">
           <i data-lucide="check-circle" style="width: 13px; height: 13px;"></i>
         </span>`;

    html += `
      <tr class="tr-batches-section-divider section-pending">
        <td colspan="${headerColspan}">
          <div class="batches-section-divider-content">
            <span class="batches-divider-line line-pending"></span>
            <div class="batches-divider-badge badge-pending">
              <i data-lucide="clock" style="width: 14px; height: 14px;"></i>
              <span>Por Pedir al Proveedor</span>
              <span class="batches-count-pill pill-pending">${pendingUnits} un.</span>
            </div>
            <span class="batches-divider-line line-pending"></span>
          </div>
        </td>
      </tr>
      <tr class="tr-supplier-header group-pending" data-batch-key="PENDIENTE">
        <td colspan="${headerColspan}">
          <div class="supplier-header-content">
            <div class="supplier-header-top">
              <div class="supplier-header-title">
                <span class="supplier-status-icon pending-icon">
                  <i data-lucide="clock" style="width: 15px; height: 15px;"></i>
                </span>
                <strong style="color: #b45309; font-size: 0.90rem;">PENDIENTES</strong>
                <span class="badge-supplier-tag badge-units" style="background: rgba(245, 158, 11, 0.2); color: #b45309;">
                  ${pendingUnits} un.
                </span>
              </div>
              <div class="supplier-header-actions">
                ${shippingTag}
                <button type="button" class="btn-create-supplier-batch" id="btnOpenBatchModal" title="Abrir resumen y preparar pedido al proveedor">
                  <i data-lucide="package-plus" style="width: 14px; height: 14px;"></i>
                  <span>Pasar a Pedido</span>
                </button>
                <button type="button" class="btn-toggle-batch" data-action="toggle-batch-collapse" data-batch-key="PENDIENTE" title="Contraer o desplegar perfumes pendientes">
                  <i data-lucide="${isPendingCollapsed ? 'chevron-right' : 'chevron-down'}" style="width: 14px; height: 14px;"></i>
                  <span>${isPendingCollapsed ? 'Desplegar' : 'Contraer'}</span>
                </button>
              </div>
            </div>

            <!-- Resumen Financiero: Tarjeta limpia de 3 columnas -->
            <div class="batch-summary-grid">
              <div class="batch-mobile-stat">
                <span class="stat-label">Venta</span>
                <span class="stat-value">${formatCLP(pendingSale)}</span>
              </div>
              <div class="batch-mobile-stat" title="Costo estimado a pagar al proveedor">
                <span class="stat-label">Costo Est.</span>
                <span class="stat-value val-cost">${formatCLP(pendingCost)}</span>
              </div>
              <div class="batch-mobile-stat stat-highlight" title="Ganancia Real (Venta - Costo)">
                <span class="stat-label">Ganancia</span>
                <span class="stat-value val-profit">${pendingProfit > 0 ? '+' : ''}${formatCLP(pendingProfit)}</span>
              </div>
            </div>
          </div>
        </td>
      </tr>
    `;

    fusedPendingRows.forEach(r => {
      let rHtml = renderTableRow(r, overallIndex--, true);
      if (isPendingCollapsed) {
        rHtml = rHtml.replace('<tr ', '<tr data-batch-row="PENDIENTE" class="batch-collapsed-row row-pending-item" ');
      } else {
        rHtml = rHtml.replace('<tr ', '<tr data-batch-row="PENDIENTE" class="row-pending-item" ');
      }
      html += rHtml;
    });
  }

  // Separador de sección entre Pendientes y Pedidos Realizados
  if (sortedBatchKeys.length > 0) {
    html += `
      <tr class="tr-batches-section-divider">
        <td colspan="${headerColspan}">
          <div class="batches-section-divider-content">
            <span class="batches-divider-line"></span>
            <div class="batches-divider-badge">
              <i data-lucide="package-check" style="width: 15px; height: 15px;"></i>
              <span>Pedidos al Proveedor</span>
              <span class="batches-count-pill">${sortedBatchKeys.length} lotes</span>
            </div>
            <span class="batches-divider-line"></span>
          </div>
        </td>
      </tr>
    `;
  }

  sortedBatchKeys.forEach(batchKey => {
    const batchObj = orderedBatches[batchKey];
    const bRows = batchObj.rows;
    const bFusedRows = fusedBatchMap[batchKey] || [];
    const bUnits = bRows.reduce((sum, r) => sum + r.qty, 0);
    const bCost = bRows.reduce((sum, r) => sum + r.costo, 0);
    const bSale = bRows.reduce((sum, r) => sum + r.precioVenta, 0);
    const bTitle = batchObj.title || getSupplierBatchTitle(batchKey);
    const isCollapsed = collapsedSupplierBatches.has(batchKey);

    // Cálculos de Descuento Martes (10%) y Costo de Envío ($6.000 si < meta $120.000)
    const isTuesdayDiscountActive = tuesdayBatches.has(batchKey);
    const discountPct = Number(currentBalancesConfig?.descuentoMartesPorcentaje) || 10;
    const discountAmt = isTuesdayDiscountActive ? Math.round(bCost * (discountPct / 100)) : 0;
    const costAfterDiscount = bCost - discountAmt;

    const minShipping = Number(currentBalancesConfig?.envioGratisMinimo) || 120000;
    const shippingFeeAmt = Number(currentBalancesConfig?.costoEnvioFijo) || 6000;
    const hasFreeShipping = costAfterDiscount >= minShipping;
    const shippingFee = (bCost > 0 && !hasFreeShipping) ? shippingFeeAmt : 0;

    const totalCostoFinal = costAfterDiscount + shippingFee;
    const bProfit = bSale - totalCostoFinal;

    html += `
      <tr class="tr-supplier-header group-ordered" data-batch-key="${batchKey}">
        <td colspan="${headerColspan}">
          <div class="supplier-header-content">
            <div class="supplier-header-top">
              <div class="supplier-header-title">
                <span class="supplier-status-icon ordered-icon" title="${escapeAttr(bTitle)}">
                  <i data-lucide="package-check" style="width: 15px; height: 15px;"></i>
                </span>
                <span class="badge-supplier-tag badge-units">
                  ${bUnits} un.
                </span>
              </div>
              <div class="supplier-header-actions">
                <a href="pedidos.html?batch=${batchKey}" class="badge-supplier-tag" style="text-decoration: none; color: var(--gold-primary); display: inline-flex; align-items: center; gap: 3px;" title="Ver en Historial de Pedidos">
                  <i data-lucide="external-link" style="width: 12px; height: 12px;"></i>
                </a>
                <span class="badge-supplier-tag tag-locked" title="Pedido Cerrado">
                  <i data-lucide="lock" style="width: 13px; height: 13px;"></i>
                </span>
                <button type="button" class="btn-toggle-batch" data-action="toggle-batch-collapse" data-batch-key="${batchKey}">
                  <i data-lucide="${isCollapsed ? 'chevron-right' : 'chevron-down'}" style="width: 14px; height: 14px;"></i>
                  <span>${isCollapsed ? 'Desplegar' : 'Contraer'}</span>
                </button>
              </div>
            </div>

            <!-- Resumen Financiero: Tarjeta limpia de 3 columnas -->
            <div class="batch-summary-grid">
              <div class="batch-mobile-stat">
                <span class="stat-label">Venta</span>
                <span class="stat-value">${formatCLP(bSale)}</span>
              </div>
              <div class="batch-mobile-stat" title="Total a pagar al proveedor (${isTuesdayDiscountActive ? `Desc Martes: -${formatCLP(discountAmt)}. ` : ''}${shippingFee > 0 ? `Flete: +${formatCLP(shippingFee)}. ` : (hasFreeShipping ? 'Envío Gratis. ' : '')}Costo base: ${formatCLP(bCost)})">
                <span class="stat-label">Total Prov</span>
                <span class="stat-value val-cost">${formatCLP(totalCostoFinal)}</span>
              </div>
              <div class="batch-mobile-stat stat-highlight" title="Ganancia Real (Venta - Total Proveedor)">
                <span class="stat-label">Ganancia</span>
                <span class="stat-value val-profit">${bProfit > 0 ? '+' : ''}${formatCLP(bProfit)}</span>
              </div>
            </div>
          </div>
        </td>
      </tr>
    `;

    bFusedRows.forEach(r => {
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
  const analyticsSection = document.getElementById("analyticsSection");
  const analyticsBody = document.getElementById("analyticsBody");
  const analyticsGrid = document.getElementById("analyticsGrid");
  const btnToggleAnalyticsText = document.getElementById("btnToggleAnalyticsText");
  const iconToggleAnalytics = document.getElementById("iconToggleAnalytics");

  if (btnToggleAnalytics && (analyticsBody || analyticsGrid)) {
    const isMobile = window.innerWidth <= 768;
    const savedState = localStorage.getItem("notes_analytics_collapsed");
    let isCollapsedInitially;

    if (savedState !== null) {
      // Si el usuario ya eligió contraer o desplegar, respetamos su elección guardada en el navegador
      isCollapsedInitially = savedState === "true";
    } else {
      // Si nunca ha interactuado, en celular inicia minimizado y en computadora abierto
      isCollapsedInitially = isMobile;
    }

    const applyCollapseState = (collapsed) => {
      if (analyticsBody) analyticsBody.classList.toggle("is-collapsed", collapsed);
      if (analyticsGrid) analyticsGrid.classList.toggle("is-collapsed", collapsed);
      if (analyticsSection) analyticsSection.classList.toggle("is-collapsed", collapsed);
      btnToggleAnalytics.setAttribute("aria-expanded", collapsed ? "false" : "true");
      if (btnToggleAnalyticsText) {
        btnToggleAnalyticsText.textContent = collapsed ? "Mostrar análisis" : "Ocultar análisis";
      }
      if (iconToggleAnalytics) {
        iconToggleAnalytics.setAttribute("data-lucide", collapsed ? "chevron-down" : "chevron-up");
      }
      if (window.lucide) lucide.createIcons();
    };

    applyCollapseState(isCollapsedInitially);

    btnToggleAnalytics.addEventListener("click", () => {
      const isCurrentlyCollapsed = analyticsBody
        ? analyticsBody.classList.contains("is-collapsed")
        : analyticsGrid.classList.contains("is-collapsed");
      const nextCollapsed = !isCurrentlyCollapsed;
      applyCollapseState(nextCollapsed);

      // Guardar permanentemente la preferencia de contraer en el navegador
      localStorage.setItem("notes_analytics_collapsed", nextCollapsed ? "true" : "false");

      if (!nextCollapsed) {
        setTimeout(() => {
          if (chartTopProductsInstance) chartTopProductsInstance.resize();
          if (chartTopInstitutionsInstance) chartTopInstitutionsInstance.resize();
          if (chartTopCustomersInstance) chartTopCustomersInstance.resize();
        }, 80);
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
    if (e.key === "notes_tuesday_batches" || e.key === "notes_sales_updated") {
      const fresh = getSavedTuesdayBatches();
      tuesdayBatches.clear();
      fresh.forEach(k => tuesdayBatches.add(k));
      applyFilters();
    }
  });

  window.addEventListener("focus", () => {
    const fresh = getSavedTuesdayBatches();
    let hasChanged = fresh.size !== tuesdayBatches.size;
    if (!hasChanged) {
      for (const k of fresh) {
        if (!tuesdayBatches.has(k)) { hasChanged = true; break; }
      }
    }
    if (hasChanged) {
      tuesdayBatches.clear();
      fresh.forEach(k => tuesdayBatches.add(k));
      applyFilters();
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
    const fusionKey = target.dataset.fusionKey;

    // Actualizar aspecto visual inmediatamente
    target.className = `status-dropdown opt-${newSlug}`;
    const dot = target.parentElement.querySelector(".status-dot");
    if (dot) dot.className = `status-dot dot-${newSlug}`;

    if (fusionKey && activeFusedRowsMap.has(fusionKey)) {
      const fusedGroup = activeFusedRowsMap.get(fusionKey);
      const items = fusedGroup.items || [];
      const updates = [];

      items.forEach(it => {
        let updateFields = { estado: newStatus };
        if (newSlug === "pedido" && !it.fechaPedidoProveedor) {
          const siblingWithBatch = allSaleRows.find(r => r.saleId === it.saleId && r.fechaPedidoProveedor);
          if (siblingWithBatch) {
            it.fechaPedidoProveedor = siblingWithBatch.fechaPedidoProveedor;
            it.idPedidoProveedor = siblingWithBatch.idPedidoProveedor;
            updateFields.fechaPedidoProveedor = siblingWithBatch.fechaPedidoProveedor;
            updateFields.idPedidoProveedor = siblingWithBatch.idPedidoProveedor;
          }
        }
        it.estado = newStatus;
        const inAll = allSaleRows.find(r => r.saleId === it.saleId && r.code === it.code);
        if (inAll) {
          inAll.estado = newStatus;
          if (updateFields.fechaPedidoProveedor) {
            inAll.fechaPedidoProveedor = updateFields.fechaPedidoProveedor;
            inAll.idPedidoProveedor = updateFields.idPedidoProveedor;
          }
        }
        updates.push({
          saleId: it.saleId,
          code: it.code,
          changes: updateFields
        });
      });

      renderAnalyticsDashboard(allSaleRows);
      try {
        localStorage.setItem("notes_sales_updated", Date.now().toString());
      } catch (e) {}

      try {
        await updateMultipleSaleRows(updates);
        showToast(newSlug === "faltante" ? `Estado cambiado a "Faltante" en ${items.length} productos ✓` : `Estado cambiado a "${newStatus}" en ${items.length} productos ✓`);
        applyFilters();
      } catch (err) {
        alert("Error al actualizar estado en Firestore: " + err.message);
      }
      return;
    }

    let updateFields = { estado: newStatus };

    // Si se pasa a Pedido y no tiene fechaPedidoProveedor, heredar lote de algún ítem hermano de la misma venta
    if (newSlug === "pedido") {
      const targetRow = allSaleRows.find(r => r.saleId === saleId && r.code === code);
      if (targetRow && !targetRow.fechaPedidoProveedor) {
        const siblingWithBatch = allSaleRows.find(r => r.saleId === saleId && r.fechaPedidoProveedor);
        if (siblingWithBatch) {
          targetRow.fechaPedidoProveedor = siblingWithBatch.fechaPedidoProveedor;
          targetRow.idPedidoProveedor = siblingWithBatch.idPedidoProveedor;
          updateFields.fechaPedidoProveedor = siblingWithBatch.fechaPedidoProveedor;
          updateFields.idPedidoProveedor = siblingWithBatch.idPedidoProveedor;
        }
      }
    }

    // Actualizar en el modelo local
    allSaleRows.forEach(r => {
      if (r.saleId === saleId && r.code === code) {
        r.estado = newStatus;
        if (updateFields.fechaPedidoProveedor) {
          r.fechaPedidoProveedor = updateFields.fechaPedidoProveedor;
          r.idPedidoProveedor = updateFields.idPedidoProveedor;
        }
      }
    });

    renderAnalyticsDashboard(allSaleRows);
    try {
      localStorage.setItem("notes_sales_updated", Date.now().toString());
    } catch (e) {}

    try {
      await updateSaleRow(saleId, code, updateFields);
      showToast(newSlug === "faltante" ? `Estado cambiado a "Faltante" (excluido del pedido y mantenido en Pendientes) ✓` : `Estado cambiado a "${newStatus}" ✓`);
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
      applyFilters();
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
      showToast(isConfirmed ? "Pago Interno marcado (True) ✓" : "Pago Interno desmarcado (False)");
    } catch (err) {
      alert("Error al actualizar pago interno en Firestore: " + err.message);
      target.checked = !isConfirmed;
    }
  } else if (action === "mark-paid-direct") {
    const fusionKey = target.dataset.fusionKey;
    if (fusionKey && activeFusedRowsMap.has(fusionKey)) {
      const fused = activeFusedRowsMap.get(fusionKey);
      const items = fused.items || [];
      const updates = [];
      items.forEach(it => {
        it.pagado = true;
        it.montoPagado = it.precioVenta;
        it.saldoPendiente = 0;
        const inAll = allSaleRows.find(r => r.saleId === it.saleId && r.code === it.code);
        if (inAll) {
          inAll.pagado = true;
          inAll.montoPagado = inAll.precioVenta;
          inAll.saldoPendiente = 0;
        }
        updates.push({
          saleId: it.saleId,
          code: it.code,
          changes: { pagado: true, montoPagado: it.precioVenta, saldoPendiente: 0 }
        });
      });
      fused.pagado = true;
      fused.montoPagado = fused.precioVenta;
      fused.saldoPendiente = 0;
      applyFilters();
      showToast("¡Venta marcada como Pagada! Retirada de faltantes ✓");
      try {
        await updateMultipleSaleRows(updates);
        localStorage.setItem("notes_sales_updated", Date.now().toString());
      } catch (err) {
        alert("Error al actualizar pago en Firestore: " + err.message);
      }
      return;
    }

    allSaleRows.forEach(r => {
      if (r.saleId === saleId && r.code === code) {
        r.pagado = true;
        r.montoPagado = r.precioVenta;
        r.saldoPendiente = 0;
      }
    });

    try {
      await updateSaleRow(saleId, code, { pagado: true, montoPagado: allSaleRows.find(r => r.saleId === saleId && r.code === code)?.precioVenta || 0, saldoPendiente: 0 });
      showToast("¡Venta marcada como Pagada! Eliminada de la lista de faltantes ✓");
      applyFilters();
    } catch (err) {
      alert("Error al actualizar pago en Firestore: " + err.message);
    }
  }
});

// ==========================================================================
// 7.1 CONTROL Y GESTIÓN DE LOTES / PEDIDOS AL PROVEEDOR
// ==========================================================================

// Extrae el resumen de perfumes pendientes agrupados únicamente por Código y Formato (ml)
function getPendingSummaryItems() {
  const pendingRows = allSaleRows.filter(r => resolveSupplierBatch(r).isPending);
  const summaryMap = new Map();

  pendingRows.forEach(r => {
    const key = `${r.code}___${r.size}`;
    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        key: key,
        code: r.code,
        size: r.size,
        fragrance: r.fragrance || "",
        totalQty: 0,
        rows: []
      });
    }
    const item = summaryMap.get(key);
    item.totalQty += Number(r.qty) || 1;
    item.rows.push(r);
  });

  const items = Array.from(summaryMap.values()).map(item => {
    const inCart = item.rows.length > 0 && item.rows.every(r => getStatusSlug(r.estado) === "encarrito");
    return {
      ...item,
      inCart: inCart
    };
  });

  // Ordenar alfabéticamente y numéricamente por código
  items.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  return items;
}

// Renderizar el modal interactivo con el resumen de perfumes pendientes
function renderSupplierBatchModal() {
  const modalEl = document.getElementById("modalSupplierBatch");
  if (!modalEl) return;

  const summaryItems = getPendingSummaryItems();
  const totalUnitsEl = document.getElementById("batchModalTotalUnits");
  const cartUnitsEl = document.getElementById("batchModalCartUnits");
  const pendingUnitsEl = document.getElementById("batchModalPendingUnits");
  const listEl = document.getElementById("batchModalItemsList");
  const btnFinalizeText = document.getElementById("btnConfirmBatchText");

  const totalUnits = summaryItems.reduce((acc, it) => acc + it.totalQty, 0);
  const cartUnits = summaryItems.filter(it => it.inCart).reduce((acc, it) => acc + it.totalQty, 0);
  const pendingUnits = totalUnits - cartUnits;

  if (totalUnitsEl) totalUnitsEl.textContent = `${totalUnits} un.`;
  if (cartUnitsEl) cartUnitsEl.textContent = `${cartUnits} un.`;
  if (pendingUnitsEl) pendingUnitsEl.textContent = `${pendingUnits} un.`;

  if (btnFinalizeText) {
    if (cartUnits > 0) {
      btnFinalizeText.textContent = `Finalizar (${cartUnits} un.)`;
    } else {
      btnFinalizeText.textContent = "Finalizar";
    }
  }

  // Sincronizar estado del checkbox y etiqueta de descuento martes
  const dateInput = document.getElementById("batchSupplierDate");
  const chosenDate = (dateInput && dateInput.value) ? dateInput.value : new Date().toISOString().split("T")[0];
  const d = new Date(chosenDate + "T12:00:00");
  const isTue = (d.getDay() === 2);
  const cbTuesday = document.getElementById("batchModalTuesdayDiscount");
  if (cbTuesday) {
    cbTuesday.checked = isTue || tuesdayBatches.has(chosenDate);
  }
  const discountPct = Number(currentBalancesConfig?.descuentoMartesPorcentaje) || 10;
  const badgeDiscount = document.getElementById("batchModalDiscountBadge");
  if (badgeDiscount) {
    badgeDiscount.textContent = `-${discountPct}% proveedor`;
  }

  if (listEl) {
    if (summaryItems.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 30px 15px; color: var(--text-muted); font-size: 0.86rem;">
          No hay perfumes pendientes por pedir al proveedor.
        </div>
      `;
    } else {
      listEl.innerHTML = summaryItems.map(item => {
        const isFaltante = item.rows.some(r => getStatusSlug(r.estado) === "faltante");
        return `
        <div class="batch-item-row ${item.inCart ? 'in-cart' : 'is-pending'}" data-key="${item.key}">
          <div class="batch-col-code">
            <span class="code-chip" title="${item.fragrance}">${item.code}</span>
          </div>
          <div class="batch-col-name" style="flex: 1; min-width: 130px;">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <strong class="item-name" style="font-size: 0.85rem; color: var(--text-title);" title="${item.fragrance}">${item.fragrance}</strong>
              ${isFaltante ? `<span class="badge-faltante-item" style="font-size: 0.68rem; color: #dc2626; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.25); padding: 1px 6px; border-radius: 4px; font-weight: 700;">Faltante anterior</span>` : ''}
            </div>
          </div>
          <div class="batch-col-size">
            <span class="size-tag">${item.size}</span>
          </div>
          <div class="batch-col-qty">
            <strong class="qty-badge">${item.totalQty} un.</strong>
          </div>
          <div class="batch-col-action">
            <button type="button" class="btn-cart-toggle ${item.inCart ? 'state-cart' : 'state-pending'}" data-action="toggle-item-cart" data-key="${item.key}" title="${item.inCart ? 'En Carrito (clic para volver a Pendiente)' : 'Pendiente (clic para pasar a Carrito)'}">
              ${item.inCart ? `
                <i data-lucide="shopping-cart" style="width: 13px; height: 13px;"></i>
                <span>En Carrito ✓</span>
              ` : `
                <i data-lucide="clock" style="width: 13px; height: 13px;"></i>
                <span>Pendiente</span>
                <i data-lucide="arrow-right" style="width: 11px; height: 11px;"></i>
                <i data-lucide="shopping-cart" style="width: 13px; height: 13px;"></i>
              `}
            </button>
          </div>
        </div>
      `;
      }).join("");
    }
  }

  if (window.lucide) lucide.createIcons();
}

// Abrir modal de resumen al presionar el botón "Pasar a Pedido Proveedor"
document.addEventListener("click", event => {
  const btn = event.target.closest("#btnOpenBatchModal");
  if (!btn) return;

  const pendingRows = allSaleRows.filter(r => resolveSupplierBatch(r).isPending);
  if (pendingRows.length === 0) {
    showToast("No hay perfumes pendientes por pedir al proveedor");
    return;
  }

  const dateInput = document.getElementById("batchSupplierDate");
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split("T")[0];
  }

  renderSupplierBatchModal();

  const modalEl = document.getElementById("modalSupplierBatch");
  if (modalEl) modalEl.hidden = false;
  if (window.lucide) lucide.createIcons();
});

// Mostrar detalle de flete y envío gratis al hacer clic/tap en la insignia móvil
document.addEventListener("click", event => {
  const badge = event.target.closest('[data-action="show-shipping-info"]');
  if (!badge) return;
  const msg = badge.dataset.shippingInfo;
  if (msg) showToast(msg);
});

// Listener de cambio de fecha en el modal de pedido proveedor para auto-detectar martes
const batchSupplierDateInput = document.getElementById("batchSupplierDate");
if (batchSupplierDateInput) {
  batchSupplierDateInput.addEventListener("change", () => {
    const chosenVal = batchSupplierDateInput.value;
    if (chosenVal) {
      const d = new Date(chosenVal + "T12:00:00");
      const isTue = (d.getDay() === 2);
      const cb = document.getElementById("batchModalTuesdayDiscount");
      if (cb) cb.checked = isTue || tuesdayBatches.has(chosenVal);
    }
  });
}

// Modificar el estado de un perfume individual (Pendiente <-> En Carrito)
document.addEventListener("click", async event => {
  const btn = event.target.closest('[data-action="toggle-item-cart"]');
  if (!btn) return;

  const key = btn.dataset.key;
  const summaryItems = getPendingSummaryItems();
  const targetItem = summaryItems.find(it => it.key === key);
  if (!targetItem) return;

  const nextStatus = targetItem.inCart ? "Pendiente" : "en carrito";

  // Actualizar en memoria local
  targetItem.rows.forEach(r => {
    r.estado = nextStatus;
  });

  // Re-renderizar modal y actualizar la tabla principal
  renderSupplierBatchModal();
  applyFilters();

  // Guardar en Firestore atómicamente por saleId
  try {
    const rowUpdates = targetItem.rows.map(r => ({
      saleId: r.saleId,
      code: r.code,
      changes: { estado: nextStatus }
    }));
    await updateMultipleSaleRows(rowUpdates);
  } catch (err) {
    console.error("Error al actualizar estado en Firestore:", err);
    showToast("Error al sincronizar con Firestore: " + err.message);
  }
});

// Botón rápido: Pasar todos los perfumes a Carrito
document.addEventListener("click", async event => {
  if (!event.target.closest("#btnBatchMarkAllCart")) return;

  const summaryItems = getPendingSummaryItems();
  const rowUpdates = [];

  summaryItems.forEach(it => {
    it.rows.forEach(r => {
      if (getStatusSlug(r.estado) !== "encarrito") {
        r.estado = "en carrito";
        rowUpdates.push({
          saleId: r.saleId,
          code: r.code,
          changes: { estado: "en carrito" }
        });
      }
    });
  });

  renderSupplierBatchModal();
  applyFilters();

  if (rowUpdates.length > 0) {
    try {
      await updateMultipleSaleRows(rowUpdates);
      showToast("Todos los perfumes marcados en Carrito ✓");
    } catch (err) {
      console.error("Error al sincronizar:", err);
    }
  }
});

// Botón rápido: Pasar todos los perfumes a Pendiente
document.addEventListener("click", async event => {
  if (!event.target.closest("#btnBatchMarkAllPending")) return;

  const summaryItems = getPendingSummaryItems();
  const rowUpdates = [];

  summaryItems.forEach(it => {
    it.rows.forEach(r => {
      if (getStatusSlug(r.estado) === "encarrito") {
        r.estado = "Pendiente";
        rowUpdates.push({
          saleId: r.saleId,
          code: r.code,
          changes: { estado: "Pendiente" }
        });
      }
    });
  });

  renderSupplierBatchModal();
  applyFilters();

  if (rowUpdates.length > 0) {
    try {
      await updateMultipleSaleRows(rowUpdates);
      showToast("Todos los perfumes vueltos a Pendiente ✓");
    } catch (err) {
      console.error("Error al sincronizar:", err);
    }
  }
});

// Botón Finalizar: Guarda como nuevo pedido en el historial en modo Pedido
const btnConfirmBatch = document.getElementById("btnConfirmSupplierBatch");
if (btnConfirmBatch) {
  btnConfirmBatch.addEventListener("click", async () => {
    const pendingRows = allSaleRows.filter(r => resolveSupplierBatch(r).isPending);
    if (pendingRows.length === 0) {
      const m = document.getElementById("modalSupplierBatch");
      if (m) m.hidden = true;
      return;
    }

    // Identificar qué filas van al nuevo pedido (las que están en carrito)
    let rowsToFinalize = pendingRows.filter(r => getStatusSlug(r.estado) === "encarrito");

    // Si no hay ninguna marcada en carrito, consultar si desea pasar todos los pendientes
    if (rowsToFinalize.length === 0) {
      const confirmAll = confirm(`No has marcado perfumes en carrito. ¿Deseas finalizar y pasar TODOS los ${pendingRows.length} perfumes pendientes al nuevo Pedido Proveedor?`);
      if (!confirmAll) return;
      rowsToFinalize = pendingRows;
    }

    const dateInput = document.getElementById("batchSupplierDate");
    const chosenDate = (dateInput && dateInput.value) ? dateInput.value : new Date().toISOString().split("T")[0];
    const batchId = "PROV-" + chosenDate;

    btnConfirmBatch.disabled = true;
    btnConfirmBatch.innerHTML = `<i data-lucide="loader" class="spin"></i> Guardando nuevo pedido...`;
    if (window.lucide) lucide.createIcons();

    try {
      const rowUpdates = [];
      const seenConfirmKeys = new Set();

      rowsToFinalize.forEach(r => {
        const key = `${r.saleId}_${r.code}`;
        if (seenConfirmKeys.has(key)) return;
        seenConfirmKeys.add(key);

        // Actualizar en memoria local: en el historial como todos en modo pedido
        r.estado = "Pedido";
        r.fechaPedidoProveedor = chosenDate;
        r.idPedidoProveedor = batchId;

        rowUpdates.push({
          saleId: r.saleId,
          code: r.code,
          changes: {
            estado: "Pedido",
            fechaPedidoProveedor: chosenDate,
            idPedidoProveedor: batchId
          }
        });
      });

      await updateMultipleSaleRows(rowUpdates);

      // Persistir descuento martes si estaba marcado en el modal
      const cbTuesday = document.getElementById("batchModalTuesdayDiscount");
      if (cbTuesday && cbTuesday.checked) {
        tuesdayBatches.add(chosenDate);
      } else {
        tuesdayBatches.delete(chosenDate);
      }
      persistTuesdayBatches();

      const m = document.getElementById("modalSupplierBatch");
      if (m) m.hidden = true;

      showToast(`¡Nuevo pedido finalizado! (${rowsToFinalize.length} productos guardados en el historial en modo Pedido para el ${chosenDate}) ✓`);
      applyFilters();
    } catch (err) {
      alert("Error al finalizar el pedido al proveedor: " + err.message);
    } finally {
      btnConfirmBatch.disabled = false;
      btnConfirmBatch.innerHTML = `<i data-lucide="check" aria-hidden="true"></i> <span id="btnConfirmBatchText">Finalizar</span>`;
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

// Botón para activar/desactivar la vista de faltantes por pagar
const btnToggleUnpaid = document.getElementById("btnToggleUnpaidView");
if (btnToggleUnpaid) {
  btnToggleUnpaid.addEventListener("click", () => {
    isUnpaidViewActive = !isUnpaidViewActive;
    btnToggleUnpaid.classList.toggle("is-active-filter", isUnpaidViewActive);
    applyFilters();
    showToast(isUnpaidViewActive ? "Mostrando solo pedidos entregados pendientes de pago" : "Mostrando todas las ventas");
  });
}

// ==========================================================================
// 7.15 GESTIÓN DE PAGOS, ABONOS Y CUOTAS INTERACTIVAS
// ==========================================================================
let currentPaymentSaleId = null;
let currentPaymentCode = null;
let currentPaymentRow = null;

const modalPayment = document.getElementById("modalPaymentManagement");
const payModalClient = document.getElementById("payModalClient");
const payModalFragrance = document.getElementById("payModalFragrance");
const payModalTotal = document.getElementById("payModalTotal");
const btnQuickFullPay = document.getElementById("btnQuickFullPay");
const btnQuickFullPayAmt = document.getElementById("btnQuickFullPayAmt");
const payInputAbono = document.getElementById("payInputAbono");
const btnPreset50 = document.getElementById("btnPreset50");
const txtPreset50 = document.getElementById("txtPreset50");
const payBalancePendingVal = document.getElementById("payBalancePendingVal");
const btnSaveAbono = document.getElementById("btnSaveAbono");
const btnResetUnpaid = document.getElementById("btnResetUnpaid");

function openPaymentModal(saleId, code, fusionKey = null) {
  let row = null;
  if (fusionKey && activeFusedRowsMap.has(fusionKey)) {
    row = activeFusedRowsMap.get(fusionKey);
  } else if (saleId && code && activeFusedRowsMap.has(`${saleId}__${code}`)) {
    row = activeFusedRowsMap.get(`${saleId}__${code}`);
  } else if (saleId && code) {
    const single = allSaleRows.find(r => r.saleId === saleId && r.code === code);
    if (single) {
      row = {
        ...single,
        isFused: false,
        items: [single],
        products: [{ ...single }]
      };
    }
  }

  if (!row) return;

  currentPaymentSaleId = saleId;
  currentPaymentCode = code;
  currentPaymentRow = row;

  if (payModalClient) payModalClient.textContent = row.clientName;

  if (payModalFragrance) {
    if (row.products && row.products.length > 1) {
      payModalFragrance.innerHTML = row.products.map(p => `
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 4px; font-size: 0.82rem; padding: 2px 0; border-bottom: 1px dashed rgba(255,255,255,0.08);">
          <span>• ${escapeAttr(p.fragrance)} (${escapeAttr(p.size)})</span>
          <span style="font-weight: 700; color: var(--gold-primary);">${formatCLP(p.precioVenta)}</span>
        </div>
      `).join("");
    } else {
      payModalFragrance.textContent = `${row.fragrance} (${row.size})`;
    }
  }

  if (payModalTotal) payModalTotal.textContent = formatCLP(row.precioVenta);
  if (btnQuickFullPayAmt) btnQuickFullPayAmt.textContent = formatCLP(row.precioVenta);

  const half50 = Math.round(row.precioVenta / 2);
  if (txtPreset50) txtPreset50.textContent = formatCLP(half50);

  // Cargar abono existente o monto completo si ya está pagado
  if (payInputAbono) {
    if (row.montoPagado > 0 && !row.pagado) {
      payInputAbono.value = row.montoPagado;
    } else if (row.pagado) {
      payInputAbono.value = row.precioVenta;
    } else {
      payInputAbono.value = "";
    }
  }

  updateLivePaymentBalance();

  if (modalPayment) modalPayment.hidden = false;
  if (window.lucide) lucide.createIcons();
}

function updateLivePaymentBalance() {
  if (!currentPaymentRow) return;
  if (!payInputAbono || !payBalancePendingVal) return;

  const entered = Number(payInputAbono.value) || 0;
  const total = currentPaymentRow.precioVenta || 0;
  const pending = Math.max(0, total - entered);

  if (entered >= total && total > 0) {
    payBalancePendingVal.style.color = "#16a34a";
    payBalancePendingVal.textContent = "0";
  } else {
    payBalancePendingVal.style.color = "#ef4444";
    payBalancePendingVal.textContent = formatCLP(pending);
  }
}

function closePaymentModal() {
  if (modalPayment) modalPayment.hidden = true;
  currentPaymentSaleId = null;
  currentPaymentCode = null;
  currentPaymentRow = null;
}

if (payInputAbono) {
  payInputAbono.addEventListener("input", updateLivePaymentBalance);
}

if (btnPreset50) {
  btnPreset50.addEventListener("click", () => {
    if (!currentPaymentRow) return;
    const half = Math.round(currentPaymentRow.precioVenta / 2);
    if (payInputAbono) {
      payInputAbono.value = half;
      updateLivePaymentBalance();
    }
  });
}

// Botones presets (+10k, +15k, +20k)
document.addEventListener("click", event => {
  const btn = event.target.closest("[data-preset]");
  if (!btn) return;
  const val = Number(btn.dataset.preset);
  if (val && payInputAbono) {
    const cur = Number(payInputAbono.value) || 0;
    payInputAbono.value = cur + val;
    updateLivePaymentBalance();
  }
});

// Cerrar modal de pago
document.addEventListener("click", event => {
  if (event.target.closest('[data-action="close-payment-modal"]')) {
    closePaymentModal();
  }
});

// 1. Marcar Pago Total (1 toque)
if (btnQuickFullPay) {
  btnQuickFullPay.addEventListener("click", async () => {
    if (!currentPaymentRow) return;
    const items = currentPaymentRow.items || [currentPaymentRow];
    const total = currentPaymentRow.precioVenta;

    currentPaymentRow.pagado = true;
    currentPaymentRow.montoPagado = total;
    currentPaymentRow.saldoPendiente = 0;

    const updates = [];
    items.forEach(it => {
      it.pagado = true;
      it.montoPagado = it.precioVenta;
      it.saldoPendiente = 0;

      const inAll = allSaleRows.find(r => r.saleId === it.saleId && r.code === it.code);
      if (inAll) {
        inAll.pagado = true;
        inAll.montoPagado = inAll.precioVenta;
        inAll.saldoPendiente = 0;
      }

      updates.push({
        saleId: it.saleId,
        code: it.code,
        changes: {
          pagado: true,
          montoPagado: it.precioVenta,
          saldoPendiente: 0
        }
      });
    });

    closePaymentModal();
    applyFilters();
    showToast(`¡Marcado como Pagado Total (${formatCLP(total)})! ✓`);

    try {
      await updateMultipleSaleRows(updates);
      localStorage.setItem("notes_sales_updated", Date.now().toString());
    } catch (err) {
      alert("Error al actualizar pago en Firestore: " + err.message);
    }
  });
}

// 2. Guardar Abono / Cuotas
if (btnSaveAbono) {
  btnSaveAbono.addEventListener("click", async () => {
    if (!currentPaymentRow) return;
    const items = currentPaymentRow.items || [currentPaymentRow];
    const total = currentPaymentRow.precioVenta;
    const entered = Number(payInputAbono ? payInputAbono.value : 0) || 0;

    if (entered <= 0) {
      alert("Por favor ingresa un monto de abono mayor a $0, o presiona 'Marcar como No Pagado'.");
      return;
    }

    const isFull = entered >= total;
    const pendingTotal = Math.max(0, total - entered);

    currentPaymentRow.pagado = isFull;
    currentPaymentRow.montoPagado = entered;
    currentPaymentRow.saldoPendiente = pendingTotal;

    // Distribuir el abono entre los ítems (FIFO)
    let remainingAbono = entered;
    const updates = [];

    items.forEach((it) => {
      const itPrice = it.precioVenta || 0;
      let itPaid = 0;

      if (isFull) {
        itPaid = itPrice;
      } else {
        if (remainingAbono >= itPrice) {
          itPaid = itPrice;
          remainingAbono -= itPrice;
        } else {
          itPaid = remainingAbono;
          remainingAbono = 0;
        }
      }

      const itPending = Math.max(0, itPrice - itPaid);
      const itIsPaid = (itPaid >= itPrice && itPrice > 0);

      it.pagado = itIsPaid;
      it.montoPagado = itPaid;
      it.saldoPendiente = itPending;

      const inAll = allSaleRows.find(r => r.saleId === it.saleId && r.code === it.code);
      if (inAll) {
        inAll.pagado = itIsPaid;
        inAll.montoPagado = itPaid;
        inAll.saldoPendiente = itPending;
      }

      updates.push({
        saleId: it.saleId,
        code: it.code,
        changes: {
          pagado: itIsPaid,
          montoPagado: itPaid,
          saldoPendiente: itPending
        }
      });
    });

    closePaymentModal();
    applyFilters();

    if (isFull) {
      showToast(`¡El abono completó el total! Marcado como Pagado (${formatCLP(entered)}) ✓`);
    } else {
      showToast(`Abono de ${formatCLP(entered)} registrado. Saldo pendiente: ${formatCLP(pendingTotal)} ✓`);
    }

    try {
      await updateMultipleSaleRows(updates);
      localStorage.setItem("notes_sales_updated", Date.now().toString());
    } catch (err) {
      alert("Error al guardar abono en Firestore: " + err.message);
    }
  });
}

// 3. Marcar como No Pagado ($0)
if (btnResetUnpaid) {
  btnResetUnpaid.addEventListener("click", async () => {
    if (!currentPaymentRow) return;
    const items = currentPaymentRow.items || [currentPaymentRow];
    const total = currentPaymentRow.precioVenta;

    currentPaymentRow.pagado = false;
    currentPaymentRow.montoPagado = 0;
    currentPaymentRow.saldoPendiente = total;

    const updates = [];
    items.forEach(it => {
      it.pagado = false;
      it.montoPagado = 0;
      it.saldoPendiente = it.precioVenta;

      const inAll = allSaleRows.find(r => r.saleId === it.saleId && r.code === it.code);
      if (inAll) {
        inAll.pagado = false;
        inAll.montoPagado = 0;
        inAll.saldoPendiente = inAll.precioVenta;
      }

      updates.push({
        saleId: it.saleId,
        code: it.code,
        changes: {
          pagado: false,
          montoPagado: 0,
          saldoPendiente: it.precioVenta
        }
      });
    });

    closePaymentModal();
    applyFilters();
    showToast("Marcado como No Pagado ($0 pagado)");

    try {
      await updateMultipleSaleRows(updates);
      localStorage.setItem("notes_sales_updated", Date.now().toString());
    } catch (err) {
      alert("Error al actualizar pago en Firestore: " + err.message);
    }
  });
}

// ==========================================================================
// 7.2 GESTIÓN DE GASTOS, BALANCES Y CONFIGURACIÓN (AJUSTES)
// ==========================================================================
const modalBalances = document.getElementById("modalBalances");
const btnOpenBalances = document.getElementById("btnOpenBalancesModal");
const btnOpenSettingsModal = document.getElementById("btnOpenSettingsModal");

function openSettingsModal() {
  if (!modalBalances) return;
  modalBalances.hidden = false;
  syncBalancesModalInputs();
  updateOctoberBalances();
  renderExpensesTable();
  if (window.lucide) lucide.createIcons();
}

if (btnOpenBalances) btnOpenBalances.addEventListener("click", openSettingsModal);
if (btnOpenSettingsModal) btnOpenSettingsModal.addEventListener("click", openSettingsModal);

document.addEventListener("click", event => {
  if (event.target.closest('[data-action="close-balances-modal"]')) {
    if (modalBalances) modalBalances.hidden = true;
  } else if (event.target === modalBalances) {
    modalBalances.hidden = true;
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && modalBalances && !modalBalances.hidden) {
    modalBalances.hidden = true;
  }
});

// Abrir modal automáticamente si viene con parámetro de configuración en la URL
try {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("config") || urlParams.get("settings")) {
    setTimeout(openSettingsModal, 200);
  }
} catch (e) {}

// Pestañas internas de Gastos, Balances y Tamaño de Letra
document.addEventListener("click", event => {
  const tabBtn = event.target.closest(".btn-balance-tab");
  if (!tabBtn) return;
  const targetId = tabBtn.dataset.tab;
  document.querySelectorAll(".btn-balance-tab").forEach(b => b.classList.toggle("is-active", b === tabBtn));
  document.querySelectorAll(".balance-tab-content").forEach(content => {
    content.hidden = (content.id !== targetId);
  });
  if (window.lucide) lucide.createIcons();
});

// ==========================================================================
// CONTROL DE TAMAÑO DE LETRA EN AJUSTES (LOCALSTORAGE)
// ==========================================================================
const FONT_SIZE_STORAGE_KEY = "notes_font_size";
const FONT_SCALE_STORAGE_KEY = "notes_font_scale";

function getScaleDescription(scale) {
  if (scale <= 92) return "Pequeño";
  if (scale <= 105) return "Normal (Predeterminado)";
  if (scale <= 120) return "Grande (+15%)";
  if (scale <= 135) return "Muy Grande (+30%)";
  return "Gigante (+45%)";
}

function applyAppFontSize(scale, showFeedback = false) {
  scale = Math.min(150, Math.max(85, Math.round(Number(scale) || 100)));
  const percentageStr = `${scale}%`;
  document.documentElement.style.fontSize = percentageStr;

  try {
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, percentageStr);
    localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(scale));
  } catch (e) {}

  const slider = document.getElementById("rangeFontSize");
  const numDisplay = document.getElementById("txtFontScalePercent");
  const descDisplay = document.getElementById("txtFontScaleName");
  const savedPill = document.getElementById("fontSavedIndicator");

  if (slider && Number(slider.value) !== scale) slider.value = scale;
  if (numDisplay) numDisplay.textContent = percentageStr;
  if (descDisplay) descDisplay.textContent = getScaleDescription(scale);

  document.querySelectorAll(".btn-font-preset").forEach(btn => {
    const btnScale = Number(btn.dataset.scale);
    btn.classList.toggle("is-active", btnScale === scale);
  });

  if (showFeedback && savedPill) {
    savedPill.hidden = false;
    savedPill.style.opacity = "1";
    clearTimeout(window.__fontSavedTimeout);
    window.__fontSavedTimeout = setTimeout(() => {
      savedPill.style.opacity = "0";
      setTimeout(() => { savedPill.hidden = true; }, 300);
    }, 2000);
  }
}

function initFontSizeControls() {
  let savedScale = 100;
  try {
    const raw = localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    if (raw) savedScale = Number(raw) || 100;
  } catch (e) {}

  applyAppFontSize(savedScale, false);

  const slider = document.getElementById("rangeFontSize");
  if (slider) {
    slider.addEventListener("input", e => {
      applyAppFontSize(Number(e.target.value), false);
    });
    slider.addEventListener("change", e => {
      applyAppFontSize(Number(e.target.value), true);
    });
  }

  const btnInc = document.getElementById("btnFontInc");
  if (btnInc) {
    btnInc.addEventListener("click", () => {
      const cur = Number(localStorage.getItem(FONT_SCALE_STORAGE_KEY)) || 100;
      applyAppFontSize(cur + 5, true);
    });
  }

  const btnDec = document.getElementById("btnFontDec");
  if (btnDec) {
    btnDec.addEventListener("click", () => {
      const cur = Number(localStorage.getItem(FONT_SCALE_STORAGE_KEY)) || 100;
      applyAppFontSize(cur - 5, true);
    });
  }

  document.addEventListener("click", e => {
    const presetBtn = e.target.closest(".btn-font-preset");
    if (presetBtn && presetBtn.dataset.scale) {
      applyAppFontSize(Number(presetBtn.dataset.scale), true);
      return;
    }

    const resetBtn = e.target.closest("#btnResetFontSize");
    if (resetBtn) {
      applyAppFontSize(100, true);
      return;
    }
  });
}

function syncBalancesModalInputs() {
  const cfg = currentBalancesConfig || DEFAULT_BALANCES_CONFIG;
  const inputShipping = document.getElementById("cfgEnvioGratisMinimo");
  if (inputShipping) inputShipping.value = cfg.envioGratisMinimo || 120000;

  const inputCostoEnvio = document.getElementById("cfgCostoEnvioFijo");
  if (inputCostoEnvio) inputCostoEnvio.value = (cfg.costoEnvioFijo !== undefined) ? cfg.costoEnvioFijo : 6000;

  const inputDescuentoMartes = document.getElementById("cfgDescuentoMartes");
  if (inputDescuentoMartes) inputDescuentoMartes.value = (cfg.descuentoMartesPorcentaje !== undefined) ? cfg.descuentoMartesPorcentaje : 10;

  const bank = cfg.datosBancarios || DEFAULT_BALANCES_CONFIG.datosBancarios;
  const bankTitular = document.getElementById("bankTitular");
  const bankRut = document.getElementById("bankRut");
  const bankBanco = document.getElementById("bankBanco");
  const bankTipoCuenta = document.getElementById("bankTipoCuenta");
  const bankNumeroCuenta = document.getElementById("bankNumeroCuenta");
  const bankEmail = document.getElementById("bankEmail");

  if (bankTitular) bankTitular.value = bank.titular || "";
  if (bankRut) bankRut.value = bank.rut || "";
  if (bankBanco) bankBanco.value = bank.banco || "";
  if (bankTipoCuenta) bankTipoCuenta.value = bank.tipoCuenta || "";
  if (bankNumeroCuenta) bankNumeroCuenta.value = bank.numeroCuenta || "";
  if (bankEmail) bankEmail.value = bank.email || "";

  const expenseDateInput = document.getElementById("expenseDate");
  if (expenseDateInput && !expenseDateInput.value) {
    expenseDateInput.value = new Date().toISOString().split("T")[0];
  }
}

function updateOctoberBalances() {
  const octRows = allSaleRows.filter(r => (r.fecha || "").startsWith("2026-10"));
  const octVentas = octRows.reduce((sum, r) => sum + r.precioVenta, 0);
  const octCostos = octRows.reduce((sum, r) => sum + r.costo, 0);

  // Capital de 150.000 generado en octubre que se resta del total y se agrega a gastos
  const capitalOctubre = Number(currentBalancesConfig?.capitalOctubre) || 150000;

  const otherOctExpenses = currentExpenses
    .filter(g => (g.fecha || "").startsWith("2026-10"))
    .reduce((sum, g) => sum + (Number(g.monto) || 0), 0);

  const totalGastosOctubre = capitalOctubre + otherOctExpenses;
  const gananciaNetaOctubre = (octVentas - octCostos) - totalGastosOctubre;

  const elVentas = document.getElementById("balanceOctVentas");
  const elCosto = document.getElementById("balanceOctCosto");
  const elGastos = document.getElementById("balanceOctGastos");
  const elGanancia = document.getElementById("balanceOctGananciaNeta");

  if (elVentas) elVentas.textContent = formatCLP(octVentas);
  if (elCosto) elCosto.textContent = formatCLP(octCostos);
  if (elGastos) elGastos.textContent = formatCLP(totalGastosOctubre);
  if (elGanancia) {
    elGanancia.textContent = formatCLP(gananciaNetaOctubre);
    elGanancia.style.color = gananciaNetaOctubre >= 0 ? "#16a34a" : "#dc2626";
  }
}

function renderExpensesTable() {
  const tbody = document.getElementById("expensesTableBody");
  if (!tbody) return;

  if (currentExpenses.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:12px;">No hay gastos adicionales registrados</td></tr>`;
    return;
  }

  tbody.innerHTML = currentExpenses.map(g => `
    <tr>
      <td>${g.fecha || "-"}</td>
      <td><span class="code-chip">${g.categoria || "Gasto"}</span></td>
      <td>${g.descripcion || "-"}</td>
      <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: #dc2626;">-${formatCLP(g.monto)}</td>
      <td style="text-align: center;">
        <button type="button" class="btn-edit-row" data-action="delete-expense" data-expense-id="${g.id}" title="Eliminar gasto" style="color: #ef4444;">
          <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
        </button>
      </td>
    </tr>
  `).join("");
}

// Guardar configuración de envío gratis, flete y descuentos
const formShippingConfig = document.getElementById("formShippingConfig");
if (formShippingConfig) {
  formShippingConfig.addEventListener("submit", async e => {
    e.preventDefault();
    const val = Number(document.getElementById("cfgEnvioGratisMinimo").value) || 120000;
    const costoEnvioFijo = Number(document.getElementById("cfgCostoEnvioFijo")?.value) ?? 6000;
    const descuentoMartesPorcentaje = Number(document.getElementById("cfgDescuentoMartes")?.value) ?? 10;
    try {
      await saveBalancesConfig({
        envioGratisMinimo: val,
        costoEnvioFijo,
        descuentoMartesPorcentaje
      });
      currentBalancesConfig.envioGratisMinimo = val;
      currentBalancesConfig.costoEnvioFijo = costoEnvioFijo;
      currentBalancesConfig.descuentoMartesPorcentaje = descuentoMartesPorcentaje;
      showToast("Ajustes de envíos y descuento martes guardados en Firestore ✓");
      applyFilters();
    } catch (err) {
      alert("Error al guardar ajustes de envío y descuento: " + err.message);
    }
  });
}

// Guardar datos bancarios
const formBankConfig = document.getElementById("formBankConfig");
if (formBankConfig) {
  formBankConfig.addEventListener("submit", async e => {
    e.preventDefault();
    const titular = document.getElementById("bankTitular").value.trim();
    const rut = document.getElementById("bankRut").value.trim();
    const banco = document.getElementById("bankBanco").value.trim();
    const tipoCuenta = document.getElementById("bankTipoCuenta").value.trim();
    const numeroCuenta = document.getElementById("bankNumeroCuenta").value.trim();
    const email = document.getElementById("bankEmail").value.trim();

    const datosBancarios = { titular, rut, banco, tipoCuenta, numeroCuenta, email };
    try {
      await saveBalancesConfig({ datosBancarios });
      currentBalancesConfig.datosBancarios = datosBancarios;
      showToast("Datos de cuenta bancaria guardados ✓");
      applyFilters();
    } catch (err) {
      alert("Error al guardar datos de cuenta: " + err.message);
    }
  });
}

// Agregar nuevo gasto
const formNewExpense = document.getElementById("formNewExpense");
if (formNewExpense) {
  formNewExpense.addEventListener("submit", async e => {
    e.preventDefault();
    const fecha = document.getElementById("expenseDate").value;
    const categoria = document.getElementById("expenseCategory").value;
    const descripcion = document.getElementById("expenseDescription").value.trim();
    const monto = Number(document.getElementById("expenseAmount").value) || 0;

    if (!fecha || !descripcion || monto <= 0) {
      alert("Por favor completa los campos del gasto correctamente.");
      return;
    }

    try {
      const res = await saveGasto({ fecha, categoria, descripcion, monto });
      currentExpenses.unshift({ id: res.id, fecha, categoria, descripcion, monto });
      document.getElementById("expenseDescription").value = "";
      document.getElementById("expenseAmount").value = "";
      renderExpensesTable();
      updateOctoberBalances();
      showToast("Gasto registrado exitosamente ✓");
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      alert("Error al registrar gasto: " + err.message);
    }
  });
}

// Eliminar gasto
document.addEventListener("click", async event => {
  const btn = event.target.closest('[data-action="delete-expense"]');
  if (!btn) return;
  const expenseId = btn.dataset.expenseId;
  if (!confirm("¿Seguro que deseas eliminar este gasto registrado?")) return;

  try {
    await deleteGasto(expenseId);
    currentExpenses = currentExpenses.filter(g => g.id !== expenseId);
    renderExpensesTable();
    updateOctoberBalances();
    showToast("Gasto eliminado ✓");
    if (window.lucide) lucide.createIcons();
  } catch (err) {
    alert("Error al eliminar gasto: " + err.message);
  }
});

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
  persistCollapsedBatches();

  const isNowCollapsed = collapsedSupplierBatches.has(batchKey);
  const rows = document.querySelectorAll(`tr[data-batch-row="${batchKey}"]`);
  rows.forEach(r => r.classList.toggle("batch-collapsed-row", isNowCollapsed));

  btn.innerHTML = `
    <i data-lucide="${isNowCollapsed ? 'chevron-right' : 'chevron-down'}" style="width: 14px; height: 14px;"></i>
    <span>${isNowCollapsed ? 'Desplegar' : 'Contraer'}</span>
  `;
  if (window.lucide) lucide.createIcons();
});

// Mostrar detalle de flete y envío gratis al hacer clic/tap en la insignia móvil
document.addEventListener("click", event => {
  const badge = event.target.closest('[data-action="show-shipping-info"]');
  if (!badge) return;
  const msg = badge.dataset.shippingInfo;
  if (msg) showToast(msg);
});

// Toggle descuento martes en un lote
document.addEventListener("change", event => {
  const toggle = event.target.closest(".check-tuesday-toggle");
  if (!toggle) return;

  const batchKey = toggle.dataset.batchKey;
  if (!batchKey) return;

  if (toggle.checked) {
    tuesdayBatches.add(batchKey);
  } else {
    tuesdayBatches.delete(batchKey);
  }
  persistTuesdayBatches();
  applyFilters();
});

// 8. Exportar a CSV compatible con Excel
function exportToCSV() {
  const query = (searchInput.value || "").trim();
  const filtered = (query || isUnpaidViewActive) ? currentFilteredRows : allSaleRows;

  if (filtered.length === 0) {
    alert("No hay filas para exportar.");
    return;
  }

  const headers = ["Fecha", "Código", "Fragancia", "Formato", "Cantidad", "Cliente", "Teléfono", "Institución", "Precio Venta", "Costo", "Ganancia", "Estado", "Pagado"];
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
      r.pagado ? "PAGADO" : (r.montoPagado > 0 ? `"ABONO ($${r.montoPagado.toLocaleString("es-CL")}, Debe $${r.saldoPendiente.toLocaleString("es-CL")})"` : "PENDIENTE")
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
function calculateItemPricing(code, size, product, overridePrice = null, overrideCost = null) {
  const normCode = (code || "").toUpperCase().trim();
  const cleanSize = (size || "").toLowerCase().replace(/\s+/g, "");

  let defaultPrice = 17000;

  if (product) {
    if (product.tiered) {
      if (cleanSize === "50ml") defaultPrice = 11000;
      else if (cleanSize === "20ml") defaultPrice = 6500;
      else defaultPrice = 17000;
    } else if (normCode.startsWith("Q")) {
      if (cleanSize === "50ml") defaultPrice = 17000;
      else if (cleanSize === "20ml") defaultPrice = 9500;
      else defaultPrice = product.price || 26000;
    } else if (normCode.startsWith("J")) {
      if (cleanSize === "20ml") defaultPrice = 5000;
      else defaultPrice = product.price || 8000;
    } else if (/^S-?0[1-6]/.test(normCode)) {
      if (cleanSize === "500ml") defaultPrice = 7000;
      else defaultPrice = product.price || 6000;
    } else {
      defaultPrice = product.price || 17000;
    }
  } else {
    // Estimación por código si es producto histórico
    if (normCode.startsWith("Q")) {
      if (cleanSize === "50ml") defaultPrice = 17000;
      else if (cleanSize === "20ml") defaultPrice = 9500;
      else defaultPrice = 26000;
    } else if (normCode.startsWith("J")) {
      if (cleanSize === "20ml") defaultPrice = 5000;
      else defaultPrice = 8000;
    } else if (normCode === "T-03") {
      defaultPrice = 13600;
    } else if (normCode === "T-04") {
      defaultPrice = 7650;
    } else if (normCode.startsWith("SPLASH") || normCode === "B101" || normCode === "B-101") {
      defaultPrice = 6600;
    } else if (/^S-?\d+/.test(normCode)) {
      if (cleanSize === "500ml") defaultPrice = 7000;
      else defaultPrice = 6000;
    } else {
      if (cleanSize === "50ml") defaultPrice = 11000;
      else if (cleanSize === "20ml") defaultPrice = 6500;
      else defaultPrice = 17000;
    }
  }

  // Costo base unitario del producto según catálogo o financials
  let defaultCost = Math.round(defaultPrice * 0.5);
  if (typeof getUnitFinancials === "function") {
    const fin = getUnitFinancials(normCode, cleanSize, defaultPrice);
    if (fin) {
      defaultCost = fin.unitCost;
    }
  }

  const hasOverridePrice = overridePrice !== null && overridePrice !== "" && !isNaN(Number(overridePrice));
  const unitPrice = hasOverridePrice ? Math.max(0, Number(overridePrice)) : defaultPrice;

  const hasOverrideCost = overrideCost !== null && overrideCost !== "" && !isNaN(Number(overrideCost));
  const unitCost = hasOverrideCost ? Math.max(0, Number(overrideCost)) : defaultCost;

  // Ganancia real: precio de venta menos costo del producto (si costo es 0, todo es ganancia)
  const unitProfit = Math.max(0, unitPrice - unitCost);

  return { unitPrice, unitCost, unitProfit, defaultPrice, defaultCost };
}

function updateModalFinancialPreview(forceResetPrice = false) {
  const prodVal = manualProductSelect.value;
  const p = catalogProducts.find(x => x.id === prodVal || x.code === prodVal);
  const size = manualSizeSelect.value || "100 ml";
  const qty = Math.max(1, parseInt(manualQty.value, 10) || 1);
  const code = p ? p.code : (prodVal || "");

  // Precios y costos base sin override
  const basePricing = calculateItemPricing(code, size, p);

  // Manejo de valores forzados o restablecidos
  if (forceResetPrice) {
    if (manualZeroCost && manualZeroCost.checked) {
      if (manualUnitCost) manualUnitCost.value = 0;
    } else {
      if (manualUnitCost) manualUnitCost.value = basePricing.defaultCost;
    }

    if (manualClientGift && manualClientGift.checked) {
      if (manualUnitPrice) manualUnitPrice.value = 0;
    } else if (manualAtCost && manualAtCost.checked) {
      const currentCost = (manualUnitCost && manualUnitCost.value !== "") ? Number(manualUnitCost.value) : basePricing.defaultCost;
      if (manualUnitPrice) manualUnitPrice.value = currentCost;
    } else {
      if (manualUnitPrice) manualUnitPrice.value = basePricing.defaultPrice;
    }
  } else {
    // Si los inputs están vacíos, rellenar con valores base según corresponda
    if (manualUnitCost && manualUnitCost.value === "") {
      manualUnitCost.value = (manualZeroCost && manualZeroCost.checked) ? 0 : basePricing.defaultCost;
    }
    if (manualUnitPrice && manualUnitPrice.value === "") {
      if (manualClientGift && manualClientGift.checked) {
        manualUnitPrice.value = 0;
      } else if (manualAtCost && manualAtCost.checked) {
        manualUnitPrice.value = manualUnitCost ? manualUnitCost.value : basePricing.defaultCost;
      } else {
        manualUnitPrice.value = basePricing.defaultPrice;
      }
    }
  }

  const rawUserPrice = manualUnitPrice ? manualUnitPrice.value.trim() : "";
  const overridePriceVal = rawUserPrice !== "" ? parseFloat(rawUserPrice) : null;

  const rawUserCost = manualUnitCost ? manualUnitCost.value.trim() : "";
  const overrideCostVal = rawUserCost !== "" ? parseFloat(rawUserCost) : null;

  const pricing = calculateItemPricing(code, size, p, overridePriceVal, overrideCostVal);

  const subtotalVenta = pricing.unitPrice * qty;
  const subtotalCosto = pricing.unitCost * qty;
  const subtotalGanancia = pricing.unitProfit * qty;

  if (calcUnitPrice) calcUnitPrice.textContent = formatCLP(pricing.unitPrice);
  if (calcTotalPrice) calcTotalPrice.textContent = formatCLP(subtotalVenta);
  if (calcTotalCost) calcTotalCost.textContent = formatCLP(subtotalCosto);

  if (calcTotalProfit) {
    if (subtotalGanancia > 0) {
      calcTotalProfit.textContent = `+${formatCLP(subtotalGanancia)}`;
      calcTotalProfit.classList.remove("profit-zero");
    } else {
      calcTotalProfit.textContent = formatCLP(0);
      calcTotalProfit.classList.add("profit-zero");
    }
  }

  // Sincronizar botones de acceso rápido y visualización
  const isZeroCost = pricing.unitCost === 0;
  const isClientGift = pricing.unitPrice === 0;
  const isAtCost = (manualAtCost && manualAtCost.checked) || (pricing.unitProfit === 0 && !isZeroCost && !isClientGift);

  if (btnSetZeroCost) btnSetZeroCost.classList.toggle("active", isZeroCost);
  if (btnSetClientGift) btnSetClientGift.classList.toggle("active", isClientGift);
  if (btnSetAtCost) btnSetAtCost.classList.toggle("active", isAtCost);

  if (manualZeroCost) manualZeroCost.checked = isZeroCost;
  if (manualClientGift) manualClientGift.checked = isClientGift;
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
  if (manualConfirmed) manualConfirmed.checked = true;
  if (manualAtCost) manualAtCost.checked = false;
  if (manualZeroCost) manualZeroCost.checked = false;
  if (manualClientGift) manualClientGift.checked = false;
  if (manualUnitPrice) manualUnitPrice.value = "";
  if (manualUnitCost) manualUnitCost.value = "";
  if (manualProductSearch) manualProductSearch.value = "";
  if (manualProductMatchBadge) manualProductMatchBadge.hidden = true;

  updateModalFinancialPreview(true);
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
    matchedProduct = catalogProducts.find(x => normalizeProductCode(x.code) === normalizeProductCode(row.code));
  }
  if (!matchedProduct) {
    matchedProduct = catalogProducts.find(x => x.name.toLowerCase() === row.fragrance.toLowerCase());
  }
  if (!matchedProduct) {
    const sug = findSearchSuggestion(row.fragrance, catalogProducts);
    if (sug) {
      matchedProduct = catalogProducts.find(x => x.name.toLowerCase() === sug.toLowerCase() || productMatchesQuery(x, sug, catalogProducts));
    }
  }

  if (manualProductSearch) {
    manualProductSearch.value = matchedProduct ? matchedProduct.name : (row.fragrance || "");
  }
  if (manualProductMatchBadge) manualProductMatchBadge.hidden = true;

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
  if (manualConfirmed) manualConfirmed.checked = Boolean(row.confirmado);

  const unitPriceFromRow = (row.qty > 0) ? Math.round(row.precioVenta / row.qty) : row.precioVenta;
  const unitCostFromRow = (row.qty > 0) ? Math.round(row.costo / row.qty) : row.costo;

  if (manualUnitPrice) {
    manualUnitPrice.value = unitPriceFromRow;
  }
  if (manualUnitCost) {
    manualUnitCost.value = unitCostFromRow;
  }
  if (manualZeroCost) {
    manualZeroCost.checked = (unitCostFromRow === 0);
  }
  if (manualClientGift) {
    manualClientGift.checked = (unitPriceFromRow === 0);
  }
  if (manualAtCost) {
    manualAtCost.checked = (row.ganancia === 0 && unitPriceFromRow > 0 && unitPriceFromRow === unitCostFromRow);
  }

  updateModalFinancialPreview(false);
  modalNewSale.hidden = false;
  if (window.lucide) lucide.createIcons();
}

if (btnNewManualSale) {
  btnNewManualSale.addEventListener("click", openNewSaleModal);
}

manualProductSelect.addEventListener("change", () => {
  const prodVal = manualProductSelect.value;
  const p = catalogProducts.find(x => x.id === prodVal || x.code === prodVal);
  if (manualProductSearch && p) {
    manualProductSearch.value = p.name;
    if (manualProductMatchBadge) manualProductMatchBadge.hidden = true;
  }
  populateSizeSelectForProduct(p, manualSizeSelect.value);
  updateModalFinancialPreview(true);
});

// Autocompletado inteligente de perfume en el modal con tolerancia a errores tipográficos (index.html)
if (manualProductSearch) {
  manualProductSearch.addEventListener("input", () => {
    const term = manualProductSearch.value.trim();
    if (!term) {
      if (manualProductMatchBadge) manualProductMatchBadge.hidden = true;
      return;
    }

    const allProds = getAllAvailableProducts();

    // 1. Coincidencia directa por código o productMatchesQuery
    let matched = allProds.find(p => productMatchesQuery(p, term, allProds));
    let isTypo = false;

    // 2. Si no encuentra directo, buscar por sugerencia (editDistance / Levenshtein de index.html)
    if (!matched) {
      const sug = findSearchSuggestion(term, allProds);
      if (sug) {
        matched = allProds.find(p => (p.name || "").toLowerCase() === sug.toLowerCase() || productMatchesQuery(p, sug, allProds));
        isTypo = Boolean(matched);
      }
    }

    // 3. Búsqueda por similitud de caracteres (distancia de edición en nombre compacto)
    if (!matched && term.length >= 3) {
      const normTerm = normalizeSearchText(term).replace(/\s+/g, "");
      let bestDistance = Math.max(2, Math.floor(normTerm.length / 3)) + 1;
      allProds.forEach(p => {
        const pNorm = normalizeSearchText(p.name || "").replace(/\s+/g, "");
        const d = editDistance(normTerm, pNorm);
        if (d < bestDistance) {
          bestDistance = d;
          matched = p;
          isTypo = true;
        }
      });
    }

    if (matched) {
      let opt = Array.from(manualProductSelect.options).find(o => o.value === matched.id || o.value === matched.code);
      if (!opt) {
        opt = document.createElement("option");
        opt.value = matched.code;
        opt.textContent = `[${matched.code}] ${matched.name}`;
        manualProductSelect.appendChild(opt);
      }
      manualProductSelect.value = opt.value;
      populateSizeSelectForProduct(matched, manualSizeSelect.value);
      updateModalFinancialPreview(true);

      if (manualProductMatchBadge) {
        manualProductMatchBadge.textContent = isTypo
          ? `✓ Sugerido: [${matched.code}] ${matched.name}`
          : `✓ Seleccionado: [${matched.code}] ${matched.name}`;
        manualProductMatchBadge.style.color = isTypo ? "#9333ea" : "#16a34a";
        manualProductMatchBadge.hidden = false;
      }
    } else {
      if (manualProductMatchBadge) {
        manualProductMatchBadge.textContent = "Sin coincidencia en catálogo";
        manualProductMatchBadge.style.color = "#dc2626";
        manualProductMatchBadge.hidden = false;
      }
    }
  });
}

manualSizeSelect.addEventListener("change", () => updateModalFinancialPreview(true));
manualQty.addEventListener("input", () => updateModalFinancialPreview(false));
manualQty.addEventListener("change", () => updateModalFinancialPreview(false));

if (manualUnitPrice) {
  manualUnitPrice.addEventListener("input", () => {
    const val = Number(manualUnitPrice.value);
    if (manualClientGift) manualClientGift.checked = (val === 0 && manualUnitPrice.value !== "");
    if (manualAtCost && manualAtCost.checked) {
      const currentCost = manualUnitCost ? Number(manualUnitCost.value) : null;
      if (currentCost !== null && val !== currentCost) {
        manualAtCost.checked = false;
      }
    }
    updateModalFinancialPreview(false);
  });
}

if (manualUnitCost) {
  manualUnitCost.addEventListener("input", () => {
    const val = Number(manualUnitCost.value);
    if (manualZeroCost) manualZeroCost.checked = (val === 0 && manualUnitCost.value !== "");
    if (manualAtCost && manualAtCost.checked) {
      if (manualUnitPrice) manualUnitPrice.value = val;
    }
    updateModalFinancialPreview(false);
  });
}

if (manualZeroCost) {
  manualZeroCost.addEventListener("change", () => {
    if (manualZeroCost.checked) {
      if (manualUnitCost) manualUnitCost.value = 0;
    } else {
      const prodVal = manualProductSelect.value;
      const p = catalogProducts.find(x => x.id === prodVal || x.code === prodVal);
      const size = manualSizeSelect.value || "100 ml";
      const code = p ? p.code : (prodVal || "");
      const base = calculateItemPricing(code, size, p);
      if (manualUnitCost) manualUnitCost.value = base.defaultCost;
    }
    updateModalFinancialPreview(false);
  });
}

if (manualClientGift) {
  manualClientGift.addEventListener("change", () => {
    if (manualClientGift.checked) {
      if (manualUnitPrice) manualUnitPrice.value = 0;
      if (manualAtCost) manualAtCost.checked = false;
    } else {
      const prodVal = manualProductSelect.value;
      const p = catalogProducts.find(x => x.id === prodVal || x.code === prodVal);
      const size = manualSizeSelect.value || "100 ml";
      const code = p ? p.code : (prodVal || "");
      const base = calculateItemPricing(code, size, p);
      if (manualUnitPrice) manualUnitPrice.value = base.defaultPrice;
    }
    updateModalFinancialPreview(false);
  });
}

if (manualAtCost) {
  manualAtCost.addEventListener("change", () => {
    if (manualAtCost.checked) {
      if (manualClientGift) manualClientGift.checked = false;
      const currentCost = (manualUnitCost && manualUnitCost.value !== "") ? manualUnitCost.value : null;
      if (currentCost !== null) {
        if (manualUnitPrice) manualUnitPrice.value = currentCost;
      }
    }
    updateModalFinancialPreview(false);
  });
}

if (btnSetZeroCost) {
  btnSetZeroCost.addEventListener("click", () => {
    const isCurrentlyZero = (manualUnitCost && Number(manualUnitCost.value) === 0 && manualUnitCost.value !== "");
    if (isCurrentlyZero) {
      const prodVal = manualProductSelect.value;
      const p = catalogProducts.find(x => x.id === prodVal || x.code === prodVal);
      const size = manualSizeSelect.value || "100 ml";
      const code = p ? p.code : (prodVal || "");
      const base = calculateItemPricing(code, size, p);
      if (manualUnitCost) manualUnitCost.value = base.defaultCost;
      if (manualZeroCost) manualZeroCost.checked = false;
    } else {
      if (manualUnitCost) manualUnitCost.value = 0;
      if (manualZeroCost) manualZeroCost.checked = true;
    }
    updateModalFinancialPreview(false);
  });
}

if (btnSetClientGift) {
  btnSetClientGift.addEventListener("click", () => {
    const isCurrentlyGift = (manualUnitPrice && Number(manualUnitPrice.value) === 0 && manualUnitPrice.value !== "");
    if (isCurrentlyGift) {
      const prodVal = manualProductSelect.value;
      const p = catalogProducts.find(x => x.id === prodVal || x.code === prodVal);
      const size = manualSizeSelect.value || "100 ml";
      const code = p ? p.code : (prodVal || "");
      const base = calculateItemPricing(code, size, p);
      if (manualUnitPrice) manualUnitPrice.value = base.defaultPrice;
      if (manualClientGift) manualClientGift.checked = false;
    } else {
      if (manualUnitPrice) manualUnitPrice.value = 0;
      if (manualClientGift) manualClientGift.checked = true;
      if (manualAtCost) manualAtCost.checked = false;
    }
    updateModalFinancialPreview(false);
  });
}

if (btnSetAtCost) {
  btnSetAtCost.addEventListener("click", () => {
    const isCurrentlyAtCost = (manualAtCost && manualAtCost.checked);
    if (isCurrentlyAtCost) {
      if (manualAtCost) manualAtCost.checked = false;
      const prodVal = manualProductSelect.value;
      const p = catalogProducts.find(x => x.id === prodVal || x.code === prodVal);
      const size = manualSizeSelect.value || "100 ml";
      const code = p ? p.code : (prodVal || "");
      const base = calculateItemPricing(code, size, p);
      if (manualUnitPrice) manualUnitPrice.value = base.defaultPrice;
    } else {
      if (manualAtCost) manualAtCost.checked = true;
      if (manualClientGift) manualClientGift.checked = false;
      const prodVal = manualProductSelect.value;
      const p = catalogProducts.find(x => x.id === prodVal || x.code === prodVal);
      const size = manualSizeSelect.value || "100 ml";
      const code = p ? p.code : (prodVal || "");
      const base = calculateItemPricing(code, size, p);
      const currentCost = (manualUnitCost && manualUnitCost.value !== "") ? manualUnitCost.value : base.defaultCost;
      if (manualUnitPrice) manualUnitPrice.value = currentCost;
    }
    updateModalFinancialPreview(false);
  });
}

if (btnResetCost) {
  btnResetCost.addEventListener("click", () => {
    if (manualZeroCost) manualZeroCost.checked = false;
    if (manualClientGift) manualClientGift.checked = false;
    if (manualAtCost) manualAtCost.checked = false;
    updateModalFinancialPreview(true);
  });
}

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
  const pagado = document.getElementById("manualPaid")?.checked || false;
  const confirmado = document.getElementById("manualConfirmed")?.checked || true;

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

  const rawUserPrice = manualUnitPrice ? manualUnitPrice.value.trim() : "";
  const overridePriceVal = rawUserPrice !== "" ? parseFloat(rawUserPrice) : null;
  const rawUserCost = manualUnitCost ? manualUnitCost.value.trim() : "";
  const overrideCostVal = rawUserCost !== "" ? parseFloat(rawUserCost) : null;
  const { unitPrice, unitCost, unitProfit } = calculateItemPricing(p.code, size, p, overridePriceVal, overrideCostVal);

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

// Abrir edición o gestión de pago al hacer clic en los controles de la fila
tableBody.addEventListener("click", async e => {
  const btnEdit = e.target.closest('[data-action="edit-row"]');
  if (btnEdit) {
    const saleId = btnEdit.dataset.saleId;
    const code = btnEdit.dataset.code;
    openEditSaleModal(saleId, code);
    return;
  }

  const btnPay = e.target.closest('[data-action="open-payment-modal"]');
  if (btnPay) {
    const saleId = btnPay.dataset.saleId;
    const code = btnPay.dataset.code;
    const fusionKey = btnPay.dataset.fusionKey;
    openPaymentModal(saleId, code, fusionKey);
    return;
  }

  const btnMarkPaid = e.target.closest('[data-action="mark-paid-direct"]');
  if (btnMarkPaid) {
    const saleId = btnMarkPaid.dataset.saleId;
    const code = btnMarkPaid.dataset.code;
    const fusionKey = btnMarkPaid.dataset.fusionKey;

    if (fusionKey && activeFusedRowsMap.has(fusionKey)) {
      const fused = activeFusedRowsMap.get(fusionKey);
      const items = fused.items || [];
      const updates = [];
      items.forEach(it => {
        it.pagado = true;
        it.montoPagado = it.precioVenta;
        it.saldoPendiente = 0;
        const inAll = allSaleRows.find(r => r.saleId === it.saleId && r.code === it.code);
        if (inAll) {
          inAll.pagado = true;
          inAll.montoPagado = inAll.precioVenta;
          inAll.saldoPendiente = 0;
        }
        updates.push({
          saleId: it.saleId,
          code: it.code,
          changes: { pagado: true, montoPagado: it.precioVenta, saldoPendiente: 0 }
        });
      });
      fused.pagado = true;
      fused.montoPagado = fused.precioVenta;
      fused.saldoPendiente = 0;
      applyFilters();
      showToast("¡Venta marcada como Pagada! Retirada de faltantes ✓");
      try {
        await updateMultipleSaleRows(updates);
        localStorage.setItem("notes_sales_updated", Date.now().toString());
      } catch (err) {
        alert("Error al actualizar pago en Firestore: " + err.message);
      }
      return;
    }

    allSaleRows.forEach(r => {
      if (r.saleId === saleId && r.code === code) {
        r.pagado = true;
        r.montoPagado = r.precioVenta;
        r.saldoPendiente = 0;
      }
    });
    applyFilters();
    showToast("¡Venta marcada como Pagada! Retirada de faltantes ✓");
    try {
      await updateSaleRow(saleId, code, { pagado: true, montoPagado: allSaleRows.find(r => r.saleId === saleId && r.code === code)?.precioVenta || 0, saldoPendiente: 0 });
      localStorage.setItem("notes_sales_updated", Date.now().toString());
    } catch (err) {
      alert("Error al actualizar pago en Firestore: " + err.message);
    }
    return;
  }
});

// Event listeners de controles de búsqueda y sincronización
searchInput.addEventListener("input", applyFilters);
btnClearSearch.addEventListener("click", () => {
  searchInput.value = "";
  applyFilters();
});
if (btnExportCSV) btnExportCSV.addEventListener("click", exportToCSV);

// Aplicar sugerencia de búsqueda inteligente al hacer clic en "¿Quisiste decir...?"
document.addEventListener("click", event => {
  const btn = event.target.closest('[data-action="apply-suggestion"]');
  if (!btn) return;
  const suggestion = btn.dataset.suggestion;
  if (!suggestion) return;
  searchInput.value = suggestion;
  applyFilters();
  searchInput.focus();
});

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
initFontSizeControls();

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
