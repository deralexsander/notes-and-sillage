// Configuración e integración de Firebase Cloud Firestore para Notes & Sillage
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Credenciales del proyecto en Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyCjiuDt7kSE90Mvi0MEmJiZOpA8Ax-R9Fo",
  authDomain: "notesandsillage.firebaseapp.com",
  projectId: "notesandsillage",
  storageBucket: "notesandsillage.firebasestorage.app",
  messagingSenderId: "999317713654",
  appId: "1:999317713654:web:ed8c994a705e01522d32d7"
};

// Inicializar servicios
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

window.firebaseApp = app;
window.firebaseDb = db;

const CACHE_KEY = "notes_catalog_cache_v1";

// 1. Cargar caché previo de inmediato para render ultra rápido
try {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
      window.CatalogData = parsed;
      window.dispatchEvent(new CustomEvent("catalog:ready", { detail: parsed }));
    }
  }
} catch (e) {
  console.warn("No se pudo leer la caché local del catálogo:", e);
}

// 2. Función para obtener catálogo en vivo desde Firestore
export async function loadCatalogFromFirestore() {
  try {
    let vendedorWhatsApp = "56968787862";
    let standardPrices = { "100ml": 17000, "50ml": 11000, "20ml": 6500 };

    // A. Obtener configuración general
    try {
      const configRef = doc(db, "config", "catalogo");
      const configSnap = await getDoc(configRef);
      if (configSnap.exists()) {
        const cfgData = configSnap.data();
        if (cfgData.vendedorWhatsApp) vendedorWhatsApp = cfgData.vendedorWhatsApp;
        if (cfgData.standardPrices) standardPrices = cfgData.standardPrices;
      }
    } catch (cfgErr) {
      console.warn("No se pudo obtener config/catalogo:", cfgErr);
    }

    // B. Obtener lista de productos ordenados
    const prodCol = collection(db, "productos");
    const q = query(prodCol, orderBy("order", "asc"));
    const querySnapshot = await getDocs(q);

    const products = [];
    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.active !== false) {
        products.push(data);
      }
    });

    if (products.length > 0) {
      const catalogData = {
        vendedorWhatsApp,
        standardPrices,
        products
      };

      window.CatalogData = catalogData;

      // Guardar en caché local
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(catalogData));
      } catch (cacheErr) {
        console.warn("No se pudo guardar la caché:", cacheErr);
      }

      window.dispatchEvent(new CustomEvent("catalog:ready", { detail: catalogData }));
      window.dispatchEvent(new CustomEvent("catalog:updated", { detail: catalogData }));
      return catalogData;
    }
  } catch (err) {
    console.error("Error al cargar productos desde Firestore:", err);
  }

  return window.CatalogData || null;
}

// Helper para calcular costos y ganancias unitarias según tarifas del negocio
export function getUnitFinancials(code, size, unitPrice) {
  const normCode = (code || "").toUpperCase().trim();
  const cleanSize = (size || "").toLowerCase().replace(/\s+/g, "");

  // Cremas
  if (normCode === "T-03") return { unitCost: 8000, unitProfit: 5600 };
  if (normCode === "T-04") return { unitCost: 4500, unitProfit: 3150 };

  // Body Splash
  if (normCode.startsWith("SPLASH")) return { unitCost: 3300, unitProfit: 3300 };

  // Colonias Familiares S-400
  if (/^S-?0[1-6]/.test(normCode)) return { unitCost: 3000, unitProfit: 3000 };

  // Alta Gama / Nicho Q
  if (normCode.startsWith("Q")) return { unitCost: 13000, unitProfit: 13000 };

  // Línea Juvenil J
  if (normCode.startsWith("J")) return { unitCost: 4000, unitProfit: 4000 };

  // Perfumería Tradicional F y H
  if (cleanSize === "100ml") return { unitCost: 8500, unitProfit: 8500 };
  if (cleanSize === "50ml") return { unitCost: 5500, unitProfit: 5500 };
  if (cleanSize === "20ml") return { unitCost: 3250, unitProfit: 3250 };

  // Estimación genérica de 50% de margen si no coincide
  const cost = Math.round(unitPrice * 0.5);
  return { unitCost: cost, unitProfit: unitPrice - cost };
}

// 3. Registrar venta en Firestore (Colección 'ventas' y 'pedidos')
export async function recordSale(saleData) {
  try {
    const { customerName, customerPhone, items, origin = "WhatsApp / Catálogo Web", notes = "" } = saleData;

    let totalVenta = 0;
    let totalCosto = 0;
    let totalGanancia = 0;
    let totalUnidades = 0;

    const enrichedItems = (items || []).map(item => {
      const qty = Number(item.qty) || 1;
      const unitPrice = Number(item.unitPrice) || 0;
      const { unitCost, unitProfit } = getUnitFinancials(item.code, item.size, unitPrice);
      
      const subtotal = unitPrice * qty;
      const subtotalCosto = unitCost * qty;
      const subtotalGanancia = unitProfit * qty;

      totalVenta += subtotal;
      totalCosto += subtotalCosto;
      totalGanancia += subtotalGanancia;
      totalUnidades += qty;

      return {
        code: item.code || "",
        name: item.name || "",
        size: item.size || "",
        qty: qty,
        unitPrice: unitPrice,
        unitCost: unitCost,
        unitProfit: unitProfit,
        subtotal: subtotal,
        subtotalCosto: subtotalCosto,
        subtotalGanancia: subtotalGanancia
      };
    });

    const now = new Date();
    const codigoVenta = `VTA-${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

    const ventaDoc = {
      codigoVenta: codigoVenta,
      cliente: {
        nombre: (customerName || "Cliente").trim(),
        telefono: (customerPhone || "").trim()
      },
      items: enrichedItems,
      totales: {
        totalVenta: totalVenta,
        totalCosto: totalCosto,
        totalGanancia: totalGanancia,
        totalUnidades: totalUnidades,
        margenPorcentaje: totalVenta > 0 ? Number(((totalGanancia / totalVenta) * 100).toFixed(1)) : 50.0
      },
      estado: "Enviado por WhatsApp",
      origen: origin,
      notas: notes,
      createdAt: serverTimestamp(),
      fechaISO: now.toISOString(),
      fechaLegible: now.toLocaleString("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    };

    // Guardar en la colección 'ventas' (Historial de ventas principal)
    const ventasRef = collection(db, "ventas");
    const docRef = await addDoc(ventasRef, ventaDoc);

    // Guardar en 'pedidos' para compatibilidad
    try {
      const pedidosRef = collection(db, "pedidos");
      await addDoc(pedidosRef, {
        ...ventaDoc,
        idVenta: docRef.id
      });
    } catch (e) {}

    const result = { id: docRef.id, ...ventaDoc };
    window.dispatchEvent(new CustomEvent("sale:recorded", { detail: result }));
    return result;
  } catch (err) {
    console.error("Error al registrar venta en Firestore:", err);
    throw err;
  }
}

// 4. Obtener historial completo de ventas desde Firestore
export async function getSalesHistory() {
  try {
    const ventasRef = collection(db, "ventas");
    const snap = await getDocs(ventasRef);

    const sales = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const date = d.createdAt?.toDate ? d.createdAt.toDate() : (d.fechaISO ? new Date(d.fechaISO) : new Date());
      sales.push({
        id: docSnap.id,
        ...d,
        createdAtDate: date
      });
    });

    // Ordenar de más reciente a más antiguo
    sales.sort((a, b) => b.createdAtDate - a.createdAtDate);
    return sales;
  } catch (err) {
    console.error("Error al consultar historial de ventas:", err);
    return [];
  }
}

// 5. Métricas financieras acumuladas
export async function getSalesSummary() {
  const sales = await getSalesHistory();
  return sales.reduce((acc, sale) => {
    const t = sale.totales || {};
    acc.totalIngresos += Number(t.totalVenta) || 0;
    acc.totalCostos += Number(t.totalCosto) || 0;
    acc.totalGanancias += Number(t.totalGanancia) || 0;
    acc.totalUnidades += Number(t.totalUnidades) || 0;
    acc.totalVentasCount += 1;
    return acc;
  }, {
    totalIngresos: 0,
    totalCostos: 0,
    totalGanancias: 0,
    totalUnidades: 0,
    totalVentasCount: 0
  });
}

// 6. Actualizar campos de una venta en Firestore (estado, pagado, confirmado)
export async function updateSaleRow(saleId, itemCode, changes) {
  try {
    const docRef = doc(db, "ventas", saleId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return false;

    const data = snap.data();
    const updateObj = { ...changes };

    if (Array.isArray(data.items)) {
      const updatedItems = data.items.map(it => {
        if (!itemCode || it.code === itemCode) {
          return { ...it, ...changes };
        }
        return it;
      });
      updateObj.items = updatedItems;
    }

    await updateDoc(docRef, updateObj);
    return true;
  } catch (err) {
    console.error("Error al actualizar venta en Firestore:", err);
    throw err;
  }
}

// 7. Eliminar venta o ítem de venta en Firestore
export async function deleteSaleRow(saleId, itemCode) {
  try {
    const docRef = doc(db, "ventas", saleId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return true;

    const data = snap.data();
    if (!Array.isArray(data.items) || data.items.length <= 1) {
      await deleteDoc(docRef);
      return true;
    }

    const remainingItems = data.items.filter(it => it.code !== itemCode);
    if (remainingItems.length === 0) {
      await deleteDoc(docRef);
      return true;
    }

    let totalVenta = 0;
    let totalCosto = 0;
    let totalGanancia = 0;
    let totalUnidades = 0;

    remainingItems.forEach(it => {
      const q = Number(it.qty) || 1;
      totalVenta += (Number(it.unitPrice) || 0) * q;
      totalCosto += (Number(it.unitCost) || 0) * q;
      totalGanancia += (Number(it.unitProfit) || 0) * q;
      totalUnidades += q;
    });

    const margenPorcentaje = totalVenta > 0 ? Number(((totalGanancia / totalVenta) * 100).toFixed(1)) : 50.0;

    await updateDoc(docRef, {
      items: remainingItems,
      totales: {
        totalVenta,
        totalCosto,
        totalGanancia,
        totalUnidades,
        margenPorcentaje
      }
    });

    return true;
  } catch (err) {
    console.error("Error al eliminar venta en Firestore:", err);
    throw err;
  }
}

// 8. Actualizar completamente una fila/venta editada (fecha, cliente, producto, ml, cant, precio, estado)
export async function updateFullSaleRow(saleId, oldCode, updatedData) {
  try {
    const docRef = doc(db, "ventas", saleId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error(`La venta ${saleId} no existe en Firestore`);
    }

    const currentData = snap.data();
    const {
      dateVal,
      customerName,
      customerPhone = "",
      institution = "",
      product,
      size,
      qty,
      unitPrice,
      unitCost,
      unitProfit,
      estado,
      pagado,
      confirmado
    } = updatedData;

    // Fechas
    const fechaISO = dateVal ? new Date(`${dateVal}T12:00:00.000Z`).toISOString() : (currentData.fechaISO || new Date().toISOString());
    let fechaLegible = currentData.fechaLegible || "";
    if (dateVal && dateVal.includes("-")) {
      const parts = dateVal.split("-");
      if (parts.length === 3) {
        fechaLegible = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    // Cliente
    const cliente = {
      nombre: customerName,
      telefono: customerPhone || "",
      institucion: institution || ""
    };

    const origen = institution ? `Venta Directa (${institution})` : (currentData.origen || "Venta Directa");
    const notes = institution ? `Institución: ${institution}` : (currentData.notes || "");

    // Actualizar ítems
    let currentItems = Array.isArray(currentData.items) && currentData.items.length > 0 ? [...currentData.items] : [];
    let itemReplaced = false;

    const updatedItems = currentItems.map(it => {
      if (!itemReplaced && (!oldCode || it.code === oldCode)) {
        itemReplaced = true;
        return {
          ...it,
          code: product.code || oldCode || "S/C",
          name: product.name || it.name || "Perfume",
          size: size,
          qty: qty,
          unitPrice: unitPrice,
          unitCost: unitCost,
          unitProfit: unitProfit,
          subtotal: unitPrice * qty,
          subtotalCosto: unitCost * qty,
          subtotalGanancia: unitProfit * qty,
          estado: estado,
          pagado: pagado,
          confirmado: confirmado
        };
      }
      return it;
    });

    if (!itemReplaced) {
      updatedItems.push({
        code: product.code || oldCode || "S/C",
        name: product.name || "Perfume",
        size: size,
        qty: qty,
        unitPrice: unitPrice,
        unitCost: unitCost,
        unitProfit: unitProfit,
        subtotal: unitPrice * qty,
        subtotalCosto: unitCost * qty,
        subtotalGanancia: unitProfit * qty,
        estado: estado,
        pagado: pagado,
        confirmado: confirmado
      });
    }

    // Recalcular totales generales
    let totalVenta = 0;
    let totalCosto = 0;
    let totalGanancia = 0;
    let totalUnidades = 0;
    let allPagado = true;
    let allConfirmado = true;

    updatedItems.forEach(it => {
      const q = Number(it.qty) || 1;
      const up = Number(it.unitPrice) || 0;
      const uc = Number(it.unitCost) || 0;
      const ug = Number(it.unitProfit) || (up - uc);

      totalVenta += up * q;
      totalCosto += uc * q;
      totalGanancia += ug * q;
      totalUnidades += q;

      if (!it.pagado) allPagado = false;
      if (!it.confirmado) allConfirmado = false;
    });

    const margenPorcentaje = totalVenta > 0 ? Number(((totalGanancia / totalVenta) * 100).toFixed(1)) : 50.0;

    await updateDoc(docRef, {
      fechaISO,
      fechaLegible,
      cliente,
      origen,
      notes,
      items: updatedItems,
      totales: {
        totalVenta,
        totalCosto,
        totalGanancia,
        totalUnidades,
        margenPorcentaje
      },
      estado: updatedItems.length === 1 ? estado : (currentData.estado || estado),
      pagado: allPagado,
      confirmado: allConfirmado
    });

    return true;
  } catch (err) {
    console.error("Error al actualizar venta completa en Firestore:", err);
    throw err;
  }
}

// Compatibilidad
export const saveOrderToFirestore = recordSale;
window.saveOrderToFirestore = recordSale;
window.recordSaleInFirestore = recordSale;
window.getSalesHistory = getSalesHistory;
window.getSalesSummary = getSalesSummary;
window.updateSaleRow = updateSaleRow;
window.updateFullSaleRow = updateFullSaleRow;
window.deleteSaleRow = deleteSaleRow;
window.getUnitFinancials = getUnitFinancials;
window.loadCatalogFromFirestore = loadCatalogFromFirestore;

// Sincronizar catálogo
loadCatalogFromFirestore();
