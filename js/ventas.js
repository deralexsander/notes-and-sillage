// Lógica de la Planilla y Tabla Detallada de Ventas - Notes & Sillage
import {
  getSalesHistory,
  recordSale,
  updateSaleRow,
  updateFullSaleRow,
  deleteSaleRow,
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
      const institution = sale.cliente?.institucion || sale.origen || "";
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
          confirmado: typeof item.confirmado === "boolean" ? item.confirmado : confirmadoGeneral
        });
      });
    });

    // Ordenar de más reciente a más antigua
    rows.sort((a, b) => b.createdAtDate - a.createdAtDate);
    allSaleRows = rows;
    applyFilters();
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

// 5. Renderizar filas en la tabla con controles interactivos
function renderTable(rows) {
  if (rows.length === 0) {
    tableBody.innerHTML = "";
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  tableBody.innerHTML = rows.map((row, index) => {
    const statusSlug = getStatusSlug(row.estado);

    return `
      <tr data-sale-id="${row.saleId}" data-code="${row.code}">
        <td class="td-num">${rows.length - index}</td>
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
  }).join("");

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

    // Actualizar aspecto visual inmediatamente
    target.className = `status-dropdown opt-${newSlug}`;
    const dot = target.parentElement.querySelector(".status-dot");
    if (dot) dot.className = `status-dot dot-${newSlug}`;

    // Actualizar en el modelo local
    allSaleRows.forEach(r => {
      if (r.saleId === saleId && r.code === code) {
        r.estado = newStatus;
      }
    });

    try {
      await updateSaleRow(saleId, code, { estado: newStatus });
      showToast(`Estado cambiado a "${newStatus}" ✓`);
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

      modalNewSale.hidden = true;
      showToast("Venta actualizada con éxito ✓");
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
      modalNewSale.hidden = true;
      newSaleForm.reset();
      showToast("Venta agregada con éxito ✓");
      await loadSales();
    } catch (err) {
      alert("Error al registrar la venta en Firestore: " + err.message);
    } finally {
      btnSubmitModal.disabled = false;
      btnSubmitModal.textContent = "Guardar en Firestore";
    }
  }
});

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
