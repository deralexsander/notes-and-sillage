// Configuración e integración de Firebase Cloud Firestore y Auth para Notes & Sillage
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
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

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
export const auth = getAuth(app);

window.firebaseApp = app;
window.firebaseDb = db;
window.firebaseAuth = auth;

// Helper de autenticación con Firebase (Email / Password)
export async function loginWithEmail(email, password) {
  try {
    const cleanEmail = (email || "").trim();
    if (!cleanEmail || !password) {
      return { success: false, message: "Por favor ingresa tu correo y contraseña." };
    }
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.warn("Fallo de autenticación Firebase:", error.code, error.message);
    let message = "No fue posible iniciar sesión. Verifica tus datos.";
    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        message = "El correo o la contraseña ingresada son incorrectos.";
        break;
      case "auth/invalid-email":
        message = "El correo electrónico no tiene un formato válido.";
        break;
      case "auth/user-disabled":
        message = "Esta cuenta ha sido inhabilitada en Firebase.";
        break;
      case "auth/too-many-requests":
        message = "Demasiados intentos fallidos. Inténtalo de nuevo en unos minutos.";
        break;
      case "auth/network-request-failed":
        message = "Error de conexión. Verifica tu conexión a internet.";
        break;
      default:
        message = error.message || message;
    }
    return { success: false, code: error.code, message };
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    return { success: false, message: error.message };
  }
}

export function onAuthStatusChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

const CACHE_KEY = "notes_catalog_cache_v3";

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

  let unitCost = 0;

  // Cremas
  if (normCode === "T-03") {
    unitCost = 8000;
  } else if (normCode === "T-04") {
    unitCost = 4500;
  }
  // Body Splash
  else if (normCode.startsWith("SPLASH") || normCode === "B101" || normCode === "B-101") {
    unitCost = 3300;
  }
  // Colonias Corporales S-400
  else if (/^S-?\d+/.test(normCode)) {
    unitCost = 3000;
  }
  // Alta Gama / Nicho Q
  else if (normCode.startsWith("Q")) {
    if (cleanSize === "50ml") unitCost = 8500;
    else if (cleanSize === "20ml") unitCost = 4750;
    else unitCost = 13000;
  }
  // Línea Juvenil J
  else if (normCode.startsWith("J")) {
    if (cleanSize === "20ml") unitCost = 2500;
    else unitCost = 4000;
  }
  // Perfumería Tradicional F y H
  else if (cleanSize === "100ml") {
    unitCost = 8500;
  } else if (cleanSize === "50ml") {
    unitCost = 5500;
  } else if (cleanSize === "20ml") {
    unitCost = 3250;
  } else {
    // Estimación genérica de 50% de margen si no coincide
    unitCost = Math.round((Number(unitPrice) || 0) * 0.5);
  }

  const priceNum = Number(unitPrice) || 0;
  // La ganancia real es el precio de venta cobrado menos el costo del producto
  const unitProfit = Math.max(0, priceNum - unitCost);

  return { unitCost, unitProfit };
}

// 3. Registrar venta en Firestore (Colección 'ventas' y 'pedidos')
export async function recordSale(saleData) {
  try {
    const {
      customerName,
      customerPhone,
      institution = "",
      items,
      origin = "WhatsApp / Catálogo Web",
      notes = "",
      estado = "Pendiente",
      pagado,
      confirmado
    } = saleData;

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
        subtotalGanancia: subtotalGanancia,
        estado: item.estado || estado || "Pendiente",
        pagado: typeof item.pagado === "boolean" ? item.pagado : (typeof pagado === "boolean" ? pagado : false),
        confirmado: typeof item.confirmado === "boolean" ? item.confirmado : (typeof confirmado === "boolean" ? confirmado : false)
      };
    });

    const now = new Date();
    const codigoVenta = `VTA-${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

    const ventaDoc = {
      codigoVenta: codigoVenta,
      cliente: {
        nombre: (customerName || "Cliente").trim(),
        telefono: (customerPhone || "").trim(),
        institucion: (institution || saleData.institution || "").trim()
      },
      items: enrichedItems,
      totales: {
        totalVenta: totalVenta,
        totalCosto: totalCosto,
        totalGanancia: totalGanancia,
        totalUnidades: totalUnidades,
        margenPorcentaje: totalVenta > 0 ? Number(((totalGanancia / totalVenta) * 100).toFixed(1)) : 50.0
      },
      estado: estado || "Pendiente",
      origen: origin,
      notas: notes,
      pagado: typeof pagado === "boolean" ? pagado : false,
      confirmado: typeof confirmado === "boolean" ? confirmado : false,
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
      const ug = typeof it.unitProfit === "number" ? it.unitProfit : (up - uc);

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

// 9. Sincronizar y actualizar retroactivamente pedidos anteriores de un cliente si faltaba teléfono o institución
export async function syncCustomerInfoToPastSales(customerName, phone, institution) {
  const cleanName = (customerName || "").trim();
  const cleanPhone = (phone || "").trim();
  const cleanInst = (institution || "").trim();

  if (!cleanName || (!cleanPhone && !cleanInst)) {
    return { updatedCount: 0 };
  }

  const normalizedTarget = cleanName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  let updatedCount = 0;
  const updatePromises = [];

  try {
    const ventasRef = collection(db, "ventas");
    const snap = await getDocs(ventasRef);

    snap.forEach(docSnap => {
      const data = docSnap.data();
      const existingName = data.cliente?.nombre || "";
      const normalizedExisting = existingName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (normalizedExisting && normalizedExisting === normalizedTarget) {
        const existingPhone = (data.cliente?.telefono || "").trim();
        const existingInst = (data.cliente?.institucion || "").trim();

        const needsPhone = cleanPhone && (!existingPhone || existingPhone === "0" || existingPhone.length < 5);
        const needsInst = cleanInst && (!existingInst || existingInst.toLowerCase() === "venta directa");

        if (needsPhone || needsInst) {
          const docRef = doc(db, "ventas", docSnap.id);
          const updates = {};

          if (needsPhone) {
            updates["cliente.telefono"] = cleanPhone;
          }
          if (needsInst) {
            updates["cliente.institucion"] = cleanInst;
            if (!data.origen || data.origen === "Venta Directa") {
              updates.origen = `Venta Directa (${cleanInst})`;
            }
            if (!data.notas || !data.notas.includes("Institución")) {
              updates.notas = data.notas ? `${data.notas} | Institución: ${cleanInst}` : `Institución: ${cleanInst}`;
            }
          }

          updatedCount++;
          updatePromises.push(updateDoc(docRef, updates));
        }
      }
    });

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
  } catch (err) {
    console.error("Error sincronizando pedidos anteriores:", err);
    throw err;
  }

  return { updatedCount };
}

// Compatibilidad y APIs Globales
export const saveOrderToFirestore = recordSale;
window.saveOrderToFirestore = recordSale;
window.recordSaleInFirestore = recordSale;
window.getSalesHistory = getSalesHistory;
window.getSalesSummary = getSalesSummary;
window.updateSaleRow = updateSaleRow;
window.updateFullSaleRow = updateFullSaleRow;
window.deleteSaleRow = deleteSaleRow;
window.syncCustomerInfoToPastSales = syncCustomerInfoToPastSales;
window.getUnitFinancials = getUnitFinancials;
window.loadCatalogFromFirestore = loadCatalogFromFirestore;
window.loginWithEmail = loginWithEmail;
window.logoutUser = logoutUser;
window.onAuthStatusChange = onAuthStatusChange;
window.getCurrentUser = getCurrentUser;

// Sincronizar catálogo
loadCatalogFromFirestore();
