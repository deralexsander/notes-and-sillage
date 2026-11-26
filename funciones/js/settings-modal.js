/**
 * settings-modal.js - Modal unificado de Ajustes, Configuración y Tamaño de Letra
 * Funciona de forma autónoma en ventas.html, pedidos.html y gastos.html.
 */

import {
  saveBalancesConfig,
  getBalancesConfig,
  DEFAULT_BALANCES_CONFIG,
  onAuthStatusChange,
  logoutUser
} from "./firebase-config.js";

const FONT_SIZE_STORAGE_KEY = "notes_font_size";
const FONT_SCALE_STORAGE_KEY = "notes_font_scale";

function ensureLucideIconsReady() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    if (window.lucide.icons) {
      if (!window.lucide.icons.CheckCheck && window.lucide.icons.Check) {
        window.lucide.icons.CheckCheck = window.lucide.icons.Check;
      }
      if (!window.lucide.icons.Pencil && window.lucide.icons.Edit3) {
        window.lucide.icons.Pencil = window.lucide.icons.Edit3;
      } else if (!window.lucide.icons.Pencil && window.lucide.icons.Edit) {
        window.lucide.icons.Pencil = window.lucide.icons.Edit;
      }
      if (!window.lucide.icons.Layers && window.lucide.icons.Square) {
        window.lucide.icons.Layers = window.lucide.icons.Square;
      }
    }
    try {
      window.lucide.createIcons();
    } catch (e) {
      console.warn("Lucide warning:", e);
    }
  }
}

function getScaleDescription(scale) {
  if (scale <= 92) return "Pequeño";
  if (scale <= 105) return "Normal (Predeterminado)";
  if (scale <= 120) return "Grande (+15%)";
  if (scale <= 135) return "Muy Grande (+30%)";
  return "Gigante (+45%)";
}

export function applyAppFontSize(scale, showFeedback = false) {
  scale = Math.min(150, Math.max(85, Math.round(Number(scale) || 100)));
  const percentageStr = `${scale}%`;

  const isMobile = window.innerWidth <= 768;
  if (!isMobile) {
    document.documentElement.style.fontSize = percentageStr;
  } else {
    document.documentElement.style.fontSize = "";
  }

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

const SETTINGS_MODAL_HTML = `
  <div id="modalBalances" class="modal-overlay" hidden>
    <div class="modal-content modal-settings-content">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="supplier-status-icon ordered-icon"><i data-lucide="settings"></i></span>
          <h3 style="margin: 0; font-size: 1.05rem;">Ajustes y Configuración</h3>
        </div>
        <button type="button" class="modal-close" data-action="close-balances-modal">&times;</button>
      </div>

      <div class="balances-modal-body">
        <!-- Barra de Sesión de Usuario con Botón de Salir -->
        <div class="modal-settings-session-bar" id="authVentasUserBar">
          <div class="modal-session-info">
            <span class="supplier-status-icon session-icon">
              <i data-lucide="user-check"></i>
            </span>
            <div class="modal-session-text">
              <strong>Sesión Administrador</strong>
              <span id="authVentasEmailText">Administrador activo</span>
            </div>
          </div>
          <button type="button" id="btnVentasLogout" class="btn-secondary btn-logout-action" title="Cerrar sesión de Notes & Sillage">
            <i data-lucide="log-out"></i>
            <span>Salir</span>
          </button>
        </div>

        <!-- Pestañas internas -->
        <div class="balances-tabs">
          <button type="button" class="btn-balance-tab is-active" data-tab="tabBalancesConfig">
            <i data-lucide="settings"></i> Configuración & Envíos
          </button>
          <button type="button" class="btn-balance-tab" data-tab="tabBalancesBank">
            <i data-lucide="credit-card"></i> Datos de Cobro
          </button>
          <button type="button" class="btn-balance-tab" data-tab="tabBalancesFontSize">
            <i data-lucide="type"></i> Tamaño de Letra
          </button>
        </div>

        <!-- Tab 1: Configuración & Envíos -->
        <div id="tabBalancesConfig" class="balance-tab-content">
          <form id="formShippingConfig">
            <div class="form-group" style="margin-bottom: 14px;">
              <label for="cfgEnvioGratisMinimo" style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 5px;">
                Monto Mínimo para Envío Gratis Proveedor ($ CLP):
              </label>
              <input type="number" id="cfgEnvioGratisMinimo" class="form-control" value="120000" min="0" step="1000" required>
              <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 4px; line-height: 1.4;">
                Monto mínimo de compra al proveedor para no pagar envío (Predeterminado: $120.000).
              </small>
            </div>

            <div class="form-group" style="margin-bottom: 14px;">
              <label for="cfgCostoEnvioFijo" style="font-weight: 600; font-size: 0.85rem; display: block; margin-bottom: 5px;">
                Costo de Envío si no se cumple la meta ($ CLP):
              </label>
              <input type="number" id="cfgCostoEnvioFijo" class="form-control" value="6000" min="0" step="500" required>
              <small style="color: var(--text-muted); font-size: 0.78rem; display: block; margin-top: 4px; line-height: 1.4;">
                Costo de flete cobrado por el proveedor cuando la compra no alcanza la meta de envío gratis ($6.000).
              </small>
            </div>

            <div class="modal-form-actions">
              <button type="submit" class="btn-primary" id="btnSaveShippingConfig">
                <i data-lucide="save"></i> Guardar Configuración
              </button>
            </div>
          </form>
        </div>

        <!-- Tab 2: Datos de Cobro Transferencia -->
        <div id="tabBalancesBank" class="balance-tab-content" hidden>
          <form id="formBankConfig">
            <div class="bank-config-grid">
              <div class="form-group">
                <label for="bankTitular" style="font-size: 0.82rem; font-weight: 600;">Nombre del Titular:</label>
                <input type="text" id="bankTitular" class="form-control" value="Christian Eduardo Fuentealba Reyes" required>
              </div>
              <div class="form-group">
                <label for="bankRut" style="font-size: 0.82rem; font-weight: 600;">RUT:</label>
                <input type="text" id="bankRut" class="form-control" value="169688192" required>
              </div>
              <div class="form-group">
                <label for="bankBanco" style="font-size: 0.82rem; font-weight: 600;">Banco / Entidad:</label>
                <input type="text" id="bankBanco" class="form-control" value="Mercado Pago" required>
              </div>
              <div class="form-group">
                <label for="bankTipoCuenta" style="font-size: 0.82rem; font-weight: 600;">Tipo de Cuenta:</label>
                <input type="text" id="bankTipoCuenta" class="form-control" value="Cuenta Vista" required>
              </div>
              <div class="form-group">
                <label for="bankNumeroCuenta" style="font-size: 0.82rem; font-weight: 600;">Número de Cuenta:</label>
                <input type="text" id="bankNumeroCuenta" class="form-control" value="1040936214" required>
              </div>
              <div class="form-group">
                <label for="bankEmail" style="font-size: 0.82rem; font-weight: 600;">Correo Electrónico:</label>
                <input type="email" id="bankEmail" class="form-control" value="christianfuentealba@gmail.com" required>
              </div>
            </div>
            <div class="modal-form-actions">
              <button type="submit" class="btn-primary" id="btnSaveBankConfig">
                <i data-lucide="save"></i> Guardar Datos de Cuenta
              </button>
            </div>
          </form>
        </div>

        <!-- Tab 3: Tamaño de Letra y Visualización -->
        <div id="tabBalancesFontSize" class="balance-tab-content" hidden>
          <div class="font-size-settings-box">
            <div class="font-size-header-info">
              <h4>
                <span class="supplier-status-icon ordered-icon" style="width: 24px; height: 24px;">
                  <i data-lucide="type"></i>
                </span>
                Tamaño de Letra en la Aplicación
              </h4>
              <p>Aumenta o reduce el tamaño de las letras y números de toda la planilla. Tu preferencia se guardará automáticamente en este navegador.</p>
            </div>

            <!-- Tarjeta de Controles: Stepper y Slider -->
            <div class="font-size-controls-card">
              <div class="font-size-stepper-row">
                <button type="button" id="btnFontDec" class="btn-font-step" title="Disminuir tamaño de letra">
                  <i data-lucide="minus"></i>
                  <span>A-</span>
                </button>

                <div class="font-size-display-wrap">
                  <span id="txtFontScalePercent" class="font-scale-number">100%</span>
                  <span id="txtFontScaleName" class="font-scale-desc">Normal (Predeterminado)</span>
                </div>

                <button type="button" id="btnFontInc" class="btn-font-step" title="Aumentar tamaño de letra">
                  <span>A+</span>
                  <i data-lucide="plus"></i>
                </button>
              </div>

              <div class="font-slider-container">
                <span class="slider-end-label">A</span>
                <input type="range" id="rangeFontSize" min="85" max="150" step="5" value="100" class="font-size-slider" aria-label="Ajustar tamaño de texto">
                <span class="slider-end-label large">A</span>
              </div>
            </div>

            <!-- Selector Rápido de Presets -->
            <div class="font-presets-section">
              <label class="font-presets-label">O elige un tamaño predefinido:</label>
              <div class="font-presets-grid">
                <button type="button" class="btn-font-preset" data-scale="90">
                  <span class="preset-name">Pequeño</span>
                  <span class="preset-pct">90%</span>
                </button>
                <button type="button" class="btn-font-preset is-active" data-scale="100">
                  <span class="preset-name">Normal</span>
                  <span class="preset-pct">100%</span>
                </button>
                <button type="button" class="btn-font-preset" data-scale="115">
                  <span class="preset-name">Grande</span>
                  <span class="preset-pct">115%</span>
                </button>
                <button type="button" class="btn-font-preset" data-scale="130">
                  <span class="preset-name">Muy Grande</span>
                  <span class="preset-pct">130%</span>
                </button>
                <button type="button" class="btn-font-preset" data-scale="145">
                  <span class="preset-name">Gigante</span>
                  <span class="preset-pct">145%</span>
                </button>
              </div>
            </div>

            <!-- Vista Previa en Vivo -->
            <div class="font-size-preview-box">
              <div class="preview-tag">
                <i data-lucide="eye"></i>
                <span>Vista Previa en Vivo</span>
              </div>
              <div class="preview-content-box">
                <div class="preview-row-top">
                  <span class="preview-client">Arantxa Flores</span>
                  <span class="preview-status">✓ Pagado</span>
                </div>
                <div class="preview-perfume">Altazor (100ml) • 2 un.</div>
                <div class="preview-row-bottom">
                  <span class="preview-inst">Colegio San Pedro</span>
                  <span class="preview-price">$28.000</span>
                </div>
              </div>
            </div>

            <!-- Acciones de Pie: Restablecer y Feedback de Guardado -->
            <div class="font-size-footer-actions">
              <button type="button" id="btnResetFontSize" class="btn-font-reset">
                <i data-lucide="rotate-ccw"></i>
                <span>Restablecer Tamaño Normal (100%)</span>
              </button>
              <div id="fontSavedIndicator" class="font-saved-pill" hidden>
                <i data-lucide="check"></i> Guardado en este navegador
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer-close">
        <button type="button" class="btn-secondary" data-action="close-balances-modal">Cerrar</button>
      </div>
    </div>
  </div>
`;

let currentLoadedBalancesConfig = null;

async function syncBalancesModalInputs() {
  try {
    if (!currentLoadedBalancesConfig) {
      currentLoadedBalancesConfig = (await getBalancesConfig()) || DEFAULT_BALANCES_CONFIG;
    }
  } catch (e) {
    currentLoadedBalancesConfig = DEFAULT_BALANCES_CONFIG;
  }

  const cfg = currentLoadedBalancesConfig;
  const getNumCfg = (v, fb) => (v !== undefined && v !== null && v !== "" && Number.isFinite(Number(v))) ? Number(v) : fb;
  const inputShipping = document.getElementById("cfgEnvioGratisMinimo");
  if (inputShipping) inputShipping.value = getNumCfg(cfg.envioGratisMinimo, 120000);

  const inputCostoEnvio = document.getElementById("cfgCostoEnvioFijo");
  if (inputCostoEnvio) inputCostoEnvio.value = getNumCfg(cfg.costoEnvioFijo, 6000);

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
}

export function openSettingsModal() {
  let modal = document.getElementById("modalBalances");
  if (!modal) {
    ensureSettingsModalDOM();
    modal = document.getElementById("modalBalances");
  }
  if (!modal) return;

  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    const tabFont = document.getElementById("tabBalancesFontSize");
    if (tabFont) tabFont.hidden = true;
    const tabConfig = document.getElementById("tabBalancesConfig");
    if (tabConfig) tabConfig.hidden = false;
    document.querySelectorAll(".btn-balance-tab").forEach(b => {
      b.classList.toggle("is-active", b.dataset.tab === "tabBalancesConfig");
    });
  }

  modal.hidden = false;
  syncBalancesModalInputs();

  // Sincronizar escala actual en los controles si está en desktop
  let savedScale = 100;
  try {
    const raw = localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    if (raw) savedScale = Number(raw) || 100;
  } catch (e) {}
  applyAppFontSize(savedScale, false);

  ensureLucideIconsReady();
}

export function closeSettingsModal() {
  const modal = document.getElementById("modalBalances");
  if (modal) modal.hidden = true;
}

function ensureSettingsModalDOM() {
  if (document.getElementById("modalBalances")) return;
  document.body.insertAdjacentHTML("beforeend", SETTINGS_MODAL_HTML);
  ensureLucideIconsReady();
}

function initSettingsModal() {
  ensureSettingsModalDOM();

  // Restaurar tamaño de letra guardado al iniciar
  let initialScale = 100;
  try {
    const raw = localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    if (raw) initialScale = Number(raw) || 100;
  } catch (e) {}
  applyAppFontSize(initialScale, false);

  // Escuchar estado de autenticación para mostrar correo
  onAuthStatusChange(user => {
    const emailEl = document.getElementById("authVentasEmailText");
    if (emailEl) {
      emailEl.textContent = user && user.email ? user.email : "Administrador activo";
    }
  });

  // Interceptar clicks de apertura del modal en cualquier botón de Ajustes/Tuerca
  document.addEventListener("click", e => {
    const target = e.target;

    // Si hace click en botón o enlace de ajustes/tuerca
    const settingsTrigger = target.closest(
      '#btnOpenSettingsModal, #btnOpenBalancesModal, [data-action="open-settings-modal"], a[href*="config=settings"], button[title*="Ajustes"], a[title*="Ajustes"]'
    );

    if (settingsTrigger) {
      e.preventDefault();
      e.stopPropagation();
      openSettingsModal();
      return;
    }

    // Cerrar modal
    if (target.closest('[data-action="close-balances-modal"]')) {
      closeSettingsModal();
      return;
    }

    const modal = document.getElementById("modalBalances");
    if (modal && target === modal) {
      closeSettingsModal();
      return;
    }

    // Pestañas internas
    const tabBtn = target.closest(".btn-balance-tab");
    if (tabBtn) {
      const targetId = tabBtn.dataset.tab;
      document.querySelectorAll(".btn-balance-tab").forEach(b => b.classList.toggle("is-active", b === tabBtn));
      document.querySelectorAll(".balance-tab-content").forEach(content => {
        content.hidden = content.id !== targetId;
      });
      ensureLucideIconsReady();
      return;
    }

    // Presets de tamaño de letra
    const presetBtn = target.closest(".btn-font-preset");
    if (presetBtn && presetBtn.dataset.scale) {
      applyAppFontSize(Number(presetBtn.dataset.scale), true);
      return;
    }

    // Restablecer tamaño de letra
    const resetBtn = target.closest("#btnResetFontSize");
    if (resetBtn) {
      applyAppFontSize(100, true);
      return;
    }
  });

  // Tecla ESC para cerrar modal
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      const modal = document.getElementById("modalBalances");
      if (modal && !modal.hidden) {
        closeSettingsModal();
      }
    }
  });

  // Controles de Slider y Stepper de tamaño de letra
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

  // Guardar configuración de envíos en Firestore
  const formShipping = document.getElementById("formShippingConfig");
  if (formShipping) {
    formShipping.addEventListener("submit", async e => {
      e.preventDefault();
      const saveBtn = document.getElementById("btnSaveShippingConfig");
      const originalText = saveBtn ? saveBtn.innerHTML : "";
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Guardando...";
      }

      try {
        const parseNum = (v, fb) => (v !== undefined && v !== null && v !== "" && Number.isFinite(Number(v))) ? Number(v) : fb;
        const valEnvioGratis = parseNum(document.getElementById("cfgEnvioGratisMinimo")?.value, 120000);
        const valCostoEnvio = parseNum(document.getElementById("cfgCostoEnvioFijo")?.value, 6000);
        await saveBalancesConfig({
          envioGratisMinimo: valEnvioGratis,
          costoEnvioFijo: valCostoEnvio
        });

        currentLoadedBalancesConfig = {
          ...currentLoadedBalancesConfig,
          envioGratisMinimo: valEnvioGratis,
          costoEnvioFijo: valCostoEnvio
        };

        if (saveBtn) {
          saveBtn.innerHTML = "✓ Configuración Guardada";
          setTimeout(() => {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
            ensureLucideIconsReady();
          }, 2000);
        }
      } catch (err) {
        console.error("Error al guardar config de envíos:", err);
        alert("Error al guardar la configuración.");
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = originalText;
        }
      }
    });
  }

  // Guardar datos bancarios en Firestore
  const formBank = document.getElementById("formBankConfig");
  if (formBank) {
    formBank.addEventListener("submit", async e => {
      e.preventDefault();
      const saveBtn = document.getElementById("btnSaveBankConfig");
      const originalText = saveBtn ? saveBtn.innerHTML : "";
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Guardando...";
      }

      try {
        const bankData = {
          titular: document.getElementById("bankTitular")?.value || "",
          rut: document.getElementById("bankRut")?.value || "",
          banco: document.getElementById("bankBanco")?.value || "",
          tipoCuenta: document.getElementById("bankTipoCuenta")?.value || "",
          numeroCuenta: document.getElementById("bankNumeroCuenta")?.value || "",
          email: document.getElementById("bankEmail")?.value || ""
        };

        await saveBalancesConfig({
          datosBancarios: bankData
        });

        currentLoadedBalancesConfig = {
          ...currentLoadedBalancesConfig,
          datosBancarios: bankData
        };

        if (saveBtn) {
          saveBtn.innerHTML = "✓ Datos de Cuenta Guardados";
          setTimeout(() => {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
            ensureLucideIconsReady();
          }, 2000);
        }
      } catch (err) {
        console.error("Error al guardar datos bancarios:", err);
        alert("Error al guardar datos de cuenta.");
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = originalText;
        }
      }
    });
  }

  // Botón Salir (Logout)
  const logoutBtn = document.getElementById("btnVentasLogout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await logoutUser();
        window.location.replace("catalogo.html");
      } catch (err) {
        console.error("Error al cerrar sesión:", err);
        window.location.replace("catalogo.html");
      }
    });
  }

  // Si la URL contiene el parámetro para abrir ajustes automáticamente
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("config") || urlParams.get("settings")) {
      setTimeout(openSettingsModal, 250);
    }
  } catch (e) {}
}

// Iniciar al cargar el DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSettingsModal);
} else {
  initSettingsModal();
}
