/**
 * Lógica y Gestión de Gastos, Retiros y Balances de Ganancias
 * Notes & Sillage
 */

import {
  db,
  auth,
  getSalesHistory,
  onAuthStatusChange,
  logoutUser
} from "./firebase-config.js";

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Claves de LocalStorage para respaldo inmediato y offline
const STORAGE_KEY_MOVEMENTS = "notes_gastos_movements_v1";
const STORAGE_KEY_MONTHLY = "notes_gastos_monthly_settings_v1";

// Movimientos iniciales de ejemplo requeridos por el usuario
const INITIAL_MOVEMENTS = [
  {
    id: "mov-chanchis-nov-2026",
    fecha: "2026-11-10",
    mes: "2026-11",
    tipo: "retiro",
    concepto: "Chanchis sacó de las ganancias",
    persona: "Chanchis",
    monto: 100000,
    notas: "Retiro para restar de las ganancias al cierre de mes",
    createdAt: new Date("2026-11-10T12:00:00").toISOString()
  },
  {
    id: "mov-devolucion-2perfumes-nov-2026",
    fecha: "2026-11-09",
    mes: "2026-11",
    tipo: "devolucion",
    concepto: "Devolución de dinero por 2 perfumes",
    persona: "Cliente",
    monto: 16000,
    notas: "Reembolso por dos perfumes devueltos",
    createdAt: new Date("2026-11-09T14:30:00").toISOString()
  }
];

// Configuración de ganancias base por mes (Automático vs Manual)
const INITIAL_MONTHLY_SETTINGS = {
  "2026-10": {
    mode: "manual",
    manualProfit: 904750,
    notes: "Ganancia calculada inicial de pedidos históricos #1 al #5 de Octubre"
  },
  "2026-11": {
    mode: "auto",
    manualProfit: 0,
    notes: "Cálculo automático de pedidos de Noviembre (editable)"
  }
};

// Estado local
let movements = [];
let monthlySettings = {};
let currentMonthFilter = "2026-11"; // Mes actual por defecto
let currentTypeFilter = "ALL";
let searchQuery = "";
let salesRows = [];

// Formateador CLP
function formatCLP(val) {
  const num = Math.round(Number(val) || 0);
  return `$${num.toLocaleString("es-CL")}`;
}

// Inicializar almacenamiento local
function loadLocalData() {
  try {
    const rawMovs = localStorage.getItem(STORAGE_KEY_MOVEMENTS);
    if (rawMovs) {
      movements = JSON.parse(rawMovs);
    } else {
      movements = [...INITIAL_MOVEMENTS];
      saveLocalMovements();
    }
  } catch (e) {
    console.warn("Error leyendo movimientos locales:", e);
    movements = [...INITIAL_MOVEMENTS];
  }

  try {
    const rawMonthly = localStorage.getItem(STORAGE_KEY_MONTHLY);
    if (rawMonthly) {
      monthlySettings = JSON.parse(rawMonthly);
    } else {
      monthlySettings = { ...INITIAL_MONTHLY_SETTINGS };
      saveLocalMonthlySettings();
    }
  } catch (e) {
    console.warn("Error leyendo configuración mensual:", e);
    monthlySettings = { ...INITIAL_MONTHLY_SETTINGS };
  }
}

function saveLocalMovements() {
  try {
    localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify(movements));
  } catch (e) {
    console.error("Error guardando movimientos en localStorage:", e);
  }
}

function saveLocalMonthlySettings() {
  try {
    localStorage.setItem(STORAGE_KEY_MONTHLY, JSON.stringify(monthlySettings));
  } catch (e) {
    console.error("Error guardando configuraciones mensuales en localStorage:", e);
  }
}

// Sincronización con Firestore
async function syncFromFirestore() {
  try {
    const querySnapshot = await getDocs(collection(db, "gastos_movimientos"));
    if (!querySnapshot.empty) {
      const remoteMovs = [];
      querySnapshot.forEach(docSnap => {
        remoteMovs.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Si hay remotos, los usamos y respaldamos
      if (remoteMovs.length > 0) {
        movements = remoteMovs;
        saveLocalMovements();
      }
    }
  } catch (err) {
    console.info("Modo local o sin conexión a Firestore para gastos:", err.message);
  }
}

async function persistMovementToFirestore(movement) {
  try {
    const docRef = doc(db, "gastos_movimientos", movement.id);
    await setDoc(docRef, {
      ...movement,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn("No se pudo guardar en Firestore (se mantuvo en local):", err.message);
  }
}

async function deleteMovementFromFirestore(id) {
  try {
    await deleteDoc(doc(db, "gastos_movimientos", id));
  } catch (err) {
    console.warn("No se pudo eliminar en Firestore (eliminado en local):", err.message);
  }
}

// Cargar ventas de Firestore / pedidos locales para cálculo automático
async function loadSales() {
  try {
    if (typeof getSalesHistory === "function") {
      salesRows = await getSalesHistory();
    }
  } catch (e) {
    console.warn("Error cargando ventas para cálculo automático:", e);
    salesRows = [];
  }
}

// Calcular ganancia de ventas de un mes específico desde las ventas registradas
function getSalesProfitForMonth(monthKey) {
  if (!salesRows || salesRows.length === 0) {
    // Si no han cargado aún las filas de Firestore, usar estimaciones de respaldo
    if (monthKey === "2026-10") return 904750;
    if (monthKey === "2026-11") return 119000;
    return 0;
  }

  const matchingRows = salesRows.filter(r => {
    let dateStr = "";
    if (r.fechaISO) dateStr = r.fechaISO.slice(0, 7);
    else if (r.fecha) {
      const parts = String(r.fecha).replace(/\//g, "-").split("-");
      if (parts.length === 3 && parts[2].length === 4) {
        dateStr = `${parts[2]}-${parts[1].padStart(2, "0")}`;
      } else {
        dateStr = String(r.fecha).slice(0, 7);
      }
    }
    return monthKey === "ALL" || dateStr === monthKey;
  });

  return matchingRows.reduce((sum, r) => sum + (Number(r.ganancia) || 0), 0);
}

// Obtener la ganancia base para el mes actual (respetando modo manual si existe)
function resolveBaseProfit(monthKey) {
  const setting = monthlySettings[monthKey];
  if (setting && setting.mode === "manual" && typeof setting.manualProfit === "number") {
    return {
      profit: setting.manualProfit,
      isManual: true,
      notes: setting.notes || "Fijada manualmente"
    };
  }

  const autoProfit = getSalesProfitForMonth(monthKey);
  return {
    profit: autoProfit,
    isManual: false,
    notes: "Calculada automáticamente de ventas"
  };
}

// Calcular totales y balance del período filtrado
function calculatePeriodBalance() {
  const currentMovs = getFilteredMovements();

  let totalRetiros = 0;
  let totalDevoluciones = 0;
  let totalGastos = 0;
  let totalIngresos = 0;

  currentMovs.forEach(m => {
    const val = Number(m.monto) || 0;
    switch (m.tipo) {
      case "retiro":
        totalRetiros += val;
        break;
      case "devolucion":
        totalDevoluciones += val;
        break;
      case "gasto":
        totalGastos += val;
        break;
      case "ingreso":
        totalIngresos += val;
        break;
      case "ajuste":
        // Ajustes negativos restan, positivos suman
        if (val < 0) totalGastos += Math.abs(val);
        else totalIngresos += val;
        break;
    }
  });

  const baseProfitInfo = resolveBaseProfit(currentMonthFilter);
  const baseProfit = baseProfitInfo.profit;

  // Ganancia Líquida = Ganancia Base - Retiros - Devoluciones - Gastos + Ingresos
  const gananciaLiquida = baseProfit - totalRetiros - totalDevoluciones - totalGastos + totalIngresos;

  return {
    baseProfit,
    isManualBase: baseProfitInfo.isManual,
    baseNotes: baseProfitInfo.notes,
    totalRetiros,
    totalDevoluciones,
    totalGastos,
    totalIngresos,
    gananciaLiquida,
    movementCount: currentMovs.length
  };
}

// Filtrar movimientos según mes, tipo y búsqueda
function getFilteredMovements() {
  return movements.filter(m => {
    // Filtro de mes
    if (currentMonthFilter !== "ALL" && m.mes !== currentMonthFilter) {
      return false;
    }

    // Filtro de tipo
    if (currentTypeFilter !== "ALL" && m.tipo !== currentTypeFilter) {
      return false;
    }

    // Filtro de búsqueda
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchConcept = (m.concepto || "").toLowerCase().includes(q);
      const matchPerson = (m.persona || "").toLowerCase().includes(q);
      const matchNotes = (m.notas || "").toLowerCase().includes(q);
      const matchDate = (m.fecha || "").includes(q);
      if (!matchConcept && !matchPerson && !matchNotes && !matchDate) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
}

// Helpers de presentación de tipos
function getTypeBadge(type) {
  switch (type) {
    case "retiro":
      return `<span class="badge-movement-type badge-type-retiro"><i data-lucide="user-minus"></i> Retiro Ganancias</span>`;
    case "devolucion":
      return `<span class="badge-movement-type badge-type-devolucion"><i data-lucide="rotate-ccw"></i> Devolución</span>`;
    case "gasto":
      return `<span class="badge-movement-type badge-type-gasto"><i data-lucide="credit-card"></i> Gasto Operativo</span>`;
    case "ingreso":
      return `<span class="badge-movement-type badge-type-ingreso"><i data-lucide="trending-up"></i> Ingreso Extra</span>`;
    case "ajuste":
      return `<span class="badge-movement-type badge-type-ajuste"><i data-lucide="sliders"></i> Ajuste Ganancia</span>`;
    default:
      return `<span class="badge-movement-type">${type}</span>`;
  }
}

// Renderizado de la UI
function renderUI() {
  const balance = calculatePeriodBalance();

  // 1. Barra de Métricas Superiores
  const kpiBaseProfit = document.getElementById("kpiBaseProfit");
  const kpiTotalRetiros = document.getElementById("kpiTotalRetiros");
  const kpiTotalDevoluciones = document.getElementById("kpiTotalDevoluciones");
  const kpiTotalGastos = document.getElementById("kpiTotalGastos");
  const kpiGananciaLiquida = document.getElementById("kpiGananciaLiquida");

  if (kpiBaseProfit) kpiBaseProfit.textContent = formatCLP(balance.baseProfit);
  if (kpiTotalRetiros) kpiTotalRetiros.textContent = `-${formatCLP(balance.totalRetiros)}`;
  if (kpiTotalDevoluciones) kpiTotalDevoluciones.textContent = `-${formatCLP(balance.totalDevoluciones)}`;
  if (kpiTotalGastos) kpiTotalGastos.textContent = `-${formatCLP(balance.totalGastos)}`;

  if (kpiGananciaLiquida) {
    kpiGananciaLiquida.textContent = formatCLP(balance.gananciaLiquida);
    if (balance.gananciaLiquida < 0) {
      kpiGananciaLiquida.classList.add("highlight-red");
      kpiGananciaLiquida.classList.remove("highlight-green");
    } else {
      kpiGananciaLiquida.classList.add("highlight-green");
      kpiGananciaLiquida.classList.remove("highlight-red");
    }
  }

  // 2. Tarjeta de Liquidación y Desglose Visual
  const stepBaseProfitVal = document.getElementById("stepBaseProfitVal");
  const stepBaseProfitTag = document.getElementById("stepBaseProfitTag");
  const stepRetirosVal = document.getElementById("stepRetirosVal");
  const stepDevolucionesVal = document.getElementById("stepDevolucionesVal");
  const stepGastosVal = document.getElementById("stepGastosVal");
  const stepFinalVal = document.getElementById("stepFinalVal");
  const stepFinalCard = document.getElementById("stepFinalCard");
  const periodTitleEl = document.getElementById("balancePeriodTitle");

  if (stepBaseProfitVal) stepBaseProfitVal.textContent = formatCLP(balance.baseProfit);
  if (stepBaseProfitTag) {
    stepBaseProfitTag.textContent = balance.isManualBase ? "MANUAL" : "VENTAS";
    stepBaseProfitTag.className = `formula-step-tag ${balance.isManualBase ? 'badge-type-ajuste' : 'badge-type-ingreso'}`;
  }
  if (stepRetirosVal) stepRetirosVal.textContent = `-${formatCLP(balance.totalRetiros)}`;
  if (stepDevolucionesVal) stepDevolucionesVal.textContent = `-${formatCLP(balance.totalDevoluciones)}`;
  if (stepGastosVal) stepGastosVal.textContent = `-${formatCLP(balance.totalGastos)}`;

  if (stepFinalVal) {
    stepFinalVal.textContent = formatCLP(balance.gananciaLiquida);
  }
  if (stepFinalCard) {
    if (balance.gananciaLiquida < 0) {
      stepFinalCard.classList.add("negative-result");
    } else {
      stepFinalCard.classList.remove("negative-result");
    }
  }

  if (periodTitleEl) {
    if (currentMonthFilter === "ALL") {
      periodTitleEl.textContent = "Balance Consolidado Global (Todos los Períodos)";
    } else if (currentMonthFilter === "2026-11") {
      periodTitleEl.textContent = "Balance y Cierre de Noviembre 2026";
    } else if (currentMonthFilter === "2026-10") {
      periodTitleEl.textContent = "Balance y Cierre de Octubre 2026";
    } else {
      periodTitleEl.textContent = `Balance y Cierre de ${currentMonthFilter}`;
    }
  }

  // 3. Tabla de Movimientos
  renderMovementsTable();

  // Actualizar iconos de Lucide
  if (window.lucide) {
    lucide.createIcons();
  }
}

function renderMovementsTable() {
  const tableBody = document.getElementById("gastosTableBody");
  const emptyState = document.getElementById("gastosEmptyState");
  const counterEl = document.getElementById("gastosCountBadge");

  if (!tableBody) return;

  const currentMovs = getFilteredMovements();

  if (counterEl) {
    counterEl.textContent = `${currentMovs.length} movimientos`;
  }

  if (currentMovs.length === 0) {
    tableBody.innerHTML = "";
    if (emptyState) emptyState.hidden = false;
    return;
  }

  if (emptyState) emptyState.hidden = true;

  let html = "";
  currentMovs.forEach((m, idx) => {
    const isDeduction = m.tipo === "retiro" || m.tipo === "devolucion" || m.tipo === "gasto";
    const impactClass = isDeduction ? "impact-negative" : "impact-positive";
    const impactSign = isDeduction ? "-" : "+";

    html += `
      <tr class="mov-row" data-id="${m.id}">
        <td class="td-mov-index" style="text-align: center; color: var(--text-dim); font-family: var(--font-mono); font-size: 0.74rem;">${idx + 1}</td>
        <td class="td-mov-date" style="font-family: var(--font-mono); font-size: 0.76rem; color: var(--text-muted);">${m.fecha || "-"}</td>
        <td class="td-mov-type">${getTypeBadge(m.tipo)}</td>
        <td class="td-mov-concept" style="font-weight: 600; color: var(--text-title);">${escapeHtml(m.concepto || "Sin concepto")}</td>
        <td class="td-mov-person" style="font-size: 0.78rem;">
          ${m.persona ? `<span class="mov-person-badge"><i data-lucide="user" style="width: 11px; height: 11px;"></i> ${escapeHtml(m.persona)}</span>` : '<span style="color: var(--text-dim);">-</span>'}
        </td>
        <td class="td-mov-amount ${impactClass}" style="text-align: right; font-family: var(--font-mono); font-weight: 700; font-size: 0.85rem;">
          ${impactSign}${formatCLP(m.monto)}
        </td>
        <td class="td-mov-notes" style="font-size: 0.76rem; color: var(--text-muted); max-width: 220px; white-space: normal;">
          ${m.notas ? `<span class="mov-notes-text">${escapeHtml(m.notas)}</span>` : ''}
        </td>
        <td class="td-mov-actions" style="text-align: center;">
          <div class="action-btn-cell">
            <button type="button" class="btn-icon-action btn-edit-mov" data-id="${m.id}" title="Editar este movimiento">
              <i data-lucide="edit-3" style="width: 12px; height: 12px;"></i> <span>Editar</span>
            </button>
            <button type="button" class="btn-icon-action btn-delete btn-delete-mov" data-id="${m.id}" title="Eliminar este movimiento">
              <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i> <span>Eliminar</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================================================================
// MODAL: CREAR / EDITAR MOVIMIENTO
// ==========================================================================
const modalMovement = document.getElementById("modalMovement");
const formMovement = document.getElementById("formMovement");
const modalMovementTitle = document.getElementById("modalMovementTitle");
const inputMovId = document.getElementById("movId");
const inputMovFecha = document.getElementById("movFecha");
const selectMovTipo = document.getElementById("movTipo");
const inputMovConcepto = document.getElementById("movConcepto");
const inputMovPersona = document.getElementById("movPersona");
const inputMovMonto = document.getElementById("movMonto");
const inputMovMes = document.getElementById("movMes");
const inputMovNotas = document.getElementById("movNotas");

function openMovementModal(movToEdit = null) {
  if (!modalMovement) return;

  if (movToEdit) {
    if (modalMovementTitle) modalMovementTitle.textContent = "Editar Movimiento o Gasto";
    inputMovId.value = movToEdit.id;
    inputMovFecha.value = movToEdit.fecha || new Date().toISOString().split("T")[0];
    selectMovTipo.value = movToEdit.tipo || "retiro";
    inputMovConcepto.value = movToEdit.concepto || "";
    inputMovPersona.value = movToEdit.persona || "";
    inputMovMonto.value = movToEdit.monto || "";
    inputMovMes.value = movToEdit.mes || currentMonthFilter !== "ALL" ? currentMonthFilter : "2026-11";
    inputMovNotas.value = movToEdit.notas || "";
  } else {
    if (modalMovementTitle) modalMovementTitle.textContent = "Registrar Nuevo Movimiento o Gasto";
    inputMovId.value = "";
    inputMovFecha.value = new Date().toISOString().split("T")[0];
    selectMovTipo.value = "retiro";
    inputMovConcepto.value = "";
    inputMovPersona.value = "";
    inputMovMonto.value = "";
    inputMovMes.value = currentMonthFilter !== "ALL" ? currentMonthFilter : "2026-11";
    inputMovNotas.value = "";
  }

  modalMovement.hidden = false;
  if (inputMovConcepto) inputMovConcepto.focus();
  if (window.lucide) lucide.createIcons();
}

function closeMovementModal() {
  if (modalMovement) modalMovement.hidden = true;
}

// Guardar Movimiento (Crear o Actualizar)
if (formMovement) {
  formMovement.addEventListener("submit", async e => {
    e.preventDefault();

    const id = inputMovId.value || `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const fecha = inputMovFecha.value || new Date().toISOString().split("T")[0];
    const tipo = selectMovTipo.value;
    const concepto = inputMovConcepto.value.trim();
    const persona = inputMovPersona.value.trim();
    const monto = Math.round(Number(inputMovMonto.value) || 0);
    const mes = inputMovMes.value || fecha.slice(0, 7);
    const notas = inputMovNotas.value.trim();

    if (!concepto) {
      alert("Por favor ingresa un concepto o motivo para el movimiento.");
      return;
    }

    if (monto <= 0) {
      alert("Por favor ingresa un monto válido mayor a $0.");
      return;
    }

    const movementObj = {
      id,
      fecha,
      mes,
      tipo,
      concepto,
      persona,
      monto,
      notas,
      updatedAt: new Date().toISOString()
    };

    const existingIdx = movements.findIndex(m => m.id === id);
    if (existingIdx >= 0) {
      movements[existingIdx] = { ...movements[existingIdx], ...movementObj };
    } else {
      movementObj.createdAt = new Date().toISOString();
      movements.unshift(movementObj);
    }

    saveLocalMovements();
    persistMovementToFirestore(movementObj);

    closeMovementModal();
    renderUI();
  });
}

// ==========================================================================
// MODAL: GANANCIA BASE PERSONALIZADA DEL MES
// ==========================================================================
const modalBaseProfit = document.getElementById("modalBaseProfit");
const formBaseProfit = document.getElementById("formBaseProfit");
const modalBaseProfitPeriodLabel = document.getElementById("modalBaseProfitPeriodLabel");
const radioModeAuto = document.getElementById("radioModeAuto");
const radioModeManual = document.getElementById("radioModeManual");
const inputManualProfit = document.getElementById("inputManualProfit");
const inputBaseNotes = document.getElementById("inputBaseNotes");
const autoProfitPreviewVal = document.getElementById("autoProfitPreviewVal");

function openBaseProfitModal() {
  if (!modalBaseProfit) return;

  const targetMonth = currentMonthFilter === "ALL" ? "2026-11" : currentMonthFilter;
  const currentSetting = monthlySettings[targetMonth] || { mode: "auto", manualProfit: 0, notes: "" };
  const autoVal = getSalesProfitForMonth(targetMonth);

  if (modalBaseProfitPeriodLabel) {
    modalBaseProfitPeriodLabel.textContent = targetMonth;
  }

  if (autoProfitPreviewVal) {
    autoProfitPreviewVal.textContent = formatCLP(autoVal);
  }

  if (currentSetting.mode === "manual") {
    if (radioModeManual) radioModeManual.checked = true;
    if (inputManualProfit) inputManualProfit.value = currentSetting.manualProfit;
  } else {
    if (radioModeAuto) radioModeAuto.checked = true;
    if (inputManualProfit) inputManualProfit.value = autoVal;
  }

  if (inputBaseNotes) {
    inputBaseNotes.value = currentSetting.notes || "";
  }

  modalBaseProfit.hidden = false;
  if (window.lucide) lucide.createIcons();
}

function closeBaseProfitModal() {
  if (modalBaseProfit) modalBaseProfit.hidden = true;
}

if (formBaseProfit) {
  formBaseProfit.addEventListener("submit", e => {
    e.preventDefault();

    const targetMonth = currentMonthFilter === "ALL" ? "2026-11" : currentMonthFilter;
    const isManual = radioModeManual && radioModeManual.checked;
    const manualVal = Math.round(Number(inputManualProfit.value) || 0);
    const notes = inputBaseNotes ? inputBaseNotes.value.trim() : "";

    monthlySettings[targetMonth] = {
      mode: isManual ? "manual" : "auto",
      manualProfit: manualVal,
      notes: notes
    };

    saveLocalMonthlySettings();
    closeBaseProfitModal();
    renderUI();
  });
}

// ==========================================================================
// COMPARTIR RESUMEN POR WHATSAPP
// ==========================================================================
function copyWhatsAppSummary() {
  const balance = calculatePeriodBalance();
  const monthName = currentMonthFilter === "ALL" ? "HISTÓRICO GLOBAL" : currentMonthFilter;

  const currentMovs = getFilteredMovements();
  let movsText = "";

  if (currentMovs.length > 0) {
    movsText = "\n*Desglose de Movimientos:*\n";
    currentMovs.forEach(m => {
      const isDed = m.tipo === "retiro" || m.tipo === "devolucion" || m.tipo === "gasto";
      const icon = m.tipo === "retiro" ? "👤" : m.tipo === "devolucion" ? "🔄" : "📦";
      movsText += `${icon} ${m.concepto} (${m.persona || 'General'}): -${formatCLP(m.monto)}\n`;
    });
  }

  const text = `📊 *NOTES & SILLAGE — LIQUIDACIÓN DE GANANCIAS*
🗓️ *Período:* ${monthName}
------------------------------------------
💰 *Ganancia Ventas (Base):* ${formatCLP(balance.baseProfit)} ${balance.isManualBase ? '(Manual)' : '(Ventas)'}
👤 *Total Retiros Socios:* -${formatCLP(balance.totalRetiros)}
🔄 *Total Devoluciones:* -${formatCLP(balance.totalDevoluciones)}
📦 *Total Gastos Operativos:* -${formatCLP(balance.totalGastos)}
------------------------------------------
✨ *GANANCIA LÍQUIDA FINAL DISPONIBLE:* *${formatCLP(balance.gananciaLiquida)}*
------------------------------------------${movsText}
_Generado desde Notes & Sillage Portal_`;

  navigator.clipboard.writeText(text).then(() => {
    alert("¡Resumen de balance copiado al portapapeles! Listo para pegar en WhatsApp.");
  }).catch(() => {
    prompt("Copia este resumen para enviar por WhatsApp:", text);
  });
}

// ==========================================================================
// RESPALDO / EXPORTAR JSON
// ==========================================================================
function exportBackupJSON() {
  const data = {
    notes_export_version: 1,
    exportedAt: new Date().toISOString(),
    movements,
    monthlySettings
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `notes_sillage_gastos_backup_${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ==========================================================================
// EVENT LISTENERS GLOBALES
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
  // Cargar datos locales primero para renderizado instantáneo
  loadLocalData();
  renderUI();

  // Cargar ventas de Firestore y sincronizar remotos en segundo plano
  await loadSales();
  await syncFromFirestore();
  renderUI();

  // Alternar tema claro / oscuro
  const btnToggleTheme = document.getElementById("btnToggleTheme");
  if (btnToggleTheme) {
    btnToggleTheme.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "dark" ? "" : "dark";
      if (next === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("notes_theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("notes_theme", "light");
      }
    });
  }

  // Chips de selección de mes
  const monthChips = document.querySelectorAll(".filter-chip-btn[data-month]");
  const inputCustomMonth = document.getElementById("inputCustomMonth");

  monthChips.forEach(chip => {
    chip.addEventListener("click", () => {
      monthChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentMonthFilter = chip.dataset.month;
      if (inputCustomMonth) inputCustomMonth.value = "";
      renderUI();
    });
  });

  if (inputCustomMonth) {
    inputCustomMonth.addEventListener("change", e => {
      if (e.target.value) {
        monthChips.forEach(c => c.classList.remove("active"));
        currentMonthFilter = e.target.value;
        renderUI();
      }
    });
  }

  // Filtro de Categoría / Tipo
  const selectTypeFilter = document.getElementById("selectTypeFilter");
  if (selectTypeFilter) {
    selectTypeFilter.addEventListener("change", e => {
      currentTypeFilter = e.target.value;
      renderUI();
    });
  }

  // Buscador
  const searchInput = document.getElementById("searchGastosInput");
  if (searchInput) {
    searchInput.addEventListener("input", e => {
      searchQuery = e.target.value.trim();
      renderMovementsTable();
    });
  }

  // Botón: Abrir modal de nuevo movimiento
  const btnNewMovement = document.getElementById("btnNewMovement");
  if (btnNewMovement) {
    btnNewMovement.addEventListener("click", () => openMovementModal());
  }

  // Botón: Ajustar ganancia base
  const btnEditBaseProfit = document.getElementById("btnEditBaseProfit");
  if (btnEditBaseProfit) {
    btnEditBaseProfit.addEventListener("click", () => openBaseProfitModal());
  }

  // Botón: Compartir WhatsApp
  const btnShareWhatsApp = document.getElementById("btnShareWhatsApp");
  if (btnShareWhatsApp) {
    btnShareWhatsApp.addEventListener("click", copyWhatsAppSummary);
  }

  // Botón: Exportar Respaldo
  const btnExportBackup = document.getElementById("btnExportBackup");
  if (btnExportBackup) {
    btnExportBackup.addEventListener("click", exportBackupJSON);
  }

  // Cierre de modales
  document.querySelectorAll("[data-action='close-movement-modal']").forEach(btn => {
    btn.addEventListener("click", closeMovementModal);
  });

  document.querySelectorAll("[data-action='close-base-profit-modal']").forEach(btn => {
    btn.addEventListener("click", closeBaseProfitModal);
  });

  // Delegación de clics en la tabla (Editar / Eliminar)
  const tableBody = document.getElementById("gastosTableBody");
  if (tableBody) {
    tableBody.addEventListener("click", async e => {
      const btnEdit = e.target.closest(".btn-edit-mov");
      if (btnEdit) {
        const id = btnEdit.dataset.id;
        const mov = movements.find(m => m.id === id);
        if (mov) openMovementModal(mov);
        return;
      }

      const btnDelete = e.target.closest(".btn-delete-mov");
      if (btnDelete) {
        const id = btnDelete.dataset.id;
        const mov = movements.find(m => m.id === id);
        const confirmMsg = mov
          ? `¿Estás seguro de eliminar el movimiento "${mov.concepto}" por ${formatCLP(mov.monto)}?`
          : "¿Estás seguro de eliminar este movimiento?";

        if (confirm(confirmMsg)) {
          movements = movements.filter(m => m.id !== id);
          saveLocalMovements();
          await deleteMovementFromFirestore(id);
          renderUI();
        }
      }
    });
  }
});
