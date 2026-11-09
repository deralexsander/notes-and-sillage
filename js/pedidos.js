/**
 * Lógica y renderizado interactivo del Historial de Pedidos al Proveedor (Parfums)
 * Notes & Sillage
 */

document.addEventListener("DOMContentLoaded", () => {
  const pedidosData = window.HISTORIAL_PEDIDOS || [];

  // Estado local
  let currentMonthFilter = "ALL"; // 'ALL', '2026-10', '2026-11'
  let currentViewMode = "ORDERS";  // 'ORDERS', 'PRODUCTS'
  let searchQuery = "";

  // Elementos DOM
  const kpiTotalInversionEl = document.getElementById("kpiTotalInversion");
  const kpiTotalPedidosEl = document.getElementById("kpiTotalPedidos");
  const kpiTotalUnidadesEl = document.getElementById("kpiTotalUnidades");
  const kpiTotalRegalosEl = document.getElementById("kpiTotalRegalos");
  const kpiPromedioPedidoEl = document.getElementById("kpiPromedioPedido");

  const monthFilterChipsEl = document.getElementById("monthFilterChips");
  const searchInputEl = document.getElementById("searchPedidosInput");
  const viewModeOrdersBtn = document.getElementById("viewModeOrders");
  const viewModeProductsBtn = document.getElementById("viewModeProducts");

  const containerOrdersView = document.getElementById("containerOrdersView");
  const containerProductsView = document.getElementById("containerProductsView");

  const themeToggleBtn = document.getElementById("btnToggleTheme");

  // Inicializar Métricas Generales
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

  // Filtrar Pedidos según mes y búsqueda
  function getFilteredOrders() {
    return pedidosData.filter(order => {
      // Filtro de mes
      if (currentMonthFilter !== "ALL" && order.monthKey !== currentMonthFilter) {
        return false;
      }

      // Filtro de búsqueda
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesOrderMeta = 
          order.title.toLowerCase().includes(q) ||
          (order.webOrderId && order.webOrderId.includes(q)) ||
          order.dateFull.toLowerCase().includes(q) ||
          order.notes.toLowerCase().includes(q);

        const matchesAnyItem = order.items.some(item => 
          item.code.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.size.toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q)
        );

        return matchesOrderMeta || matchesAnyItem;
      }

      return true;
    });
  }

  // Renderizar Vista 1: Por Pedidos (Agrupados por mes)
  function renderOrdersView() {
    containerOrdersView.innerHTML = "";
    const filteredOrders = getFilteredOrders();

    if (filteredOrders.length === 0) {
      containerOrdersView.innerHTML = `
        <div style="text-align: center; padding: 48px 20px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
          <i data-lucide="search-x" style="width: 48px; height: 48px; color: var(--text-dim); margin-bottom: 12px;"></i>
          <h3 style="margin: 0 0 6px 0; color: var(--text-title);">No se encontraron pedidos</h3>
          <p style="color: var(--text-muted); margin: 0; font-size: 0.9rem;">Prueba modificando el término de búsqueda o cambiando el filtro de mes.</p>
        </div>
      `;
      renderIcons();
      return;
    }

    // Agrupar pedidos por mes
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

    // Renderizar cada bloque de mes
    Object.values(monthGroups).forEach(group => {
      const groupTotalPaid = group.orders.reduce((sum, o) => sum + o.totalPaid, 0);
      const groupTotalItems = group.orders.reduce((sum, o) => sum + o.totalItems, 0);

      const monthBlock = document.createElement("div");
      monthBlock.className = "month-section-block";

      monthBlock.innerHTML = `
        <div class="month-section-header">
          <div class="month-section-title-wrap">
            <i data-lucide="calendar" style="color: var(--gold-primary);" aria-hidden="true"></i>
            <h2 class="month-section-title">${group.name}</h2>
          </div>
          <div class="month-stats-badge">
            ${group.orders.length} ${group.orders.length === 1 ? 'pedido' : 'pedidos'} • ${groupTotalItems} unidades • $${groupTotalPaid.toLocaleString("es-CL")}
          </div>
        </div>
        <div class="month-orders-list" id="monthList_${group.key}"></div>
      `;

      const listContainer = monthBlock.querySelector(`#monthList_${group.key}`);

      group.orders.forEach((order, index) => {
        const orderCard = document.createElement("div");
        orderCard.className = "order-accordion-card is-expanded";
        orderCard.dataset.orderId = order.id;

        // Filtrar ítems si hay búsqueda activa
        const displayedItems = searchQuery
          ? order.items.filter(it => 
              it.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
              it.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              it.size.toLowerCase().includes(searchQuery.toLowerCase()) ||
              it.status.toLowerCase().includes(searchQuery.toLowerCase())
            )
          : order.items;

        const tableRowsHtml = displayedItems.map((item, itemIdx) => {
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
              <span class="order-number-badge">${order.title}</span>
              <div class="order-title-info">
                <h3>${order.title} ${order.webOrderId ? `<span style="font-weight: 400; color: var(--text-muted); font-size: 0.9rem;">(Web #${order.webOrderId})</span>` : ''}</h3>
                <div class="order-subtitle">
                  <span class="order-subtitle-item">
                    <i data-lucide="clock" style="width: 14px; height: 14px;"></i>
                    ${order.dateFull}
                  </span>
                  <span class="order-subtitle-item">
                    <i data-lucide="tag" style="width: 14px; height: 14px;"></i>
                    ${order.method}
                  </span>
                  <span class="item-status-badge status-facturado">${order.status}</span>
                </div>
              </div>
            </div>
            <div class="order-header-right">
              <div class="order-summary-pills">
                <span class="order-items-counter">${order.totalItems} un.${order.giftItems > 0 ? ` (${order.giftItems} regalo)` : ''}</span>
                <span class="order-price-val">$${order.totalPaid.toLocaleString("es-CL")}</span>
              </div>
              <div class="accordion-chevron-icon" title="Expandir / Contraer">
                <i data-lucide="chevron-down" style="width: 18px; height: 18px;"></i>
              </div>
            </div>
          </div>
          <div class="order-card-body">
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

  // Renderizar Vista 2: Por Producto Consolidado
  function renderProductsView() {
    containerProductsView.innerHTML = "";
    const filteredOrders = getFilteredOrders();

    // Consolidar productos
    const productMap = {};

    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        // Ignorar membresías si se desea, o mantenerlas clasificadas
        const key = item.code;
        if (!productMap[key]) {
          productMap[key] = {
            code: item.code,
            name: item.name,
            totalQty: 0,
            qty100: 0,
            qty50: 0,
            qty20: 0,
            qtyOther: 0,
            totalCost: 0,
            giftQty: 0,
            ordersIncluded: new Set()
          };
        }

        productMap[key].totalQty += item.qty;
        productMap[key].totalCost += item.subtotal;
        if (item.isGift) productMap[key].giftQty += item.qty;

        if (item.size.includes("100")) {
          productMap[key].qty100 += item.qty;
        } else if (item.size.includes("50")) {
          productMap[key].qty50 += item.qty;
        } else if (item.size.includes("20")) {
          productMap[key].qty20 += item.qty;
        } else {
          productMap[key].qtyOther += item.qty;
        }

        productMap[key].ordersIncluded.add(`${order.monthName.split(' ')[0]} #${order.orderNumber}`);
      });
    });

    const productsList = Object.values(productMap);
    // Ordenar de mayor cantidad pedida a menor
    productsList.sort((a, b) => b.totalQty - a.totalQty);

    if (productsList.length === 0) {
      containerProductsView.innerHTML = `
        <div style="text-align: center; padding: 48px 20px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
          <i data-lucide="search-x" style="width: 48px; height: 48px; color: var(--text-dim); margin-bottom: 12px;"></i>
          <h3 style="margin: 0 0 6px 0; color: var(--text-title);">No se encontraron productos</h3>
          <p style="color: var(--text-muted); margin: 0; font-size: 0.9rem;">Prueba con otro término de búsqueda.</p>
        </div>
      `;
      renderIcons();
      return;
    }

    const tableRows = productsList.map((prod, idx) => {
      const orderTags = Array.from(prod.ordersIncluded).map(t => `<span class="order-tag">${t}</span>`).join(" ");

      return `
        <tr>
          <td style="color: var(--text-dim); font-size: 0.8rem;">#${idx + 1}</td>
          <td><span class="code-cell-badge">${prod.code}</span></td>
          <td>
            <strong style="color: var(--text-title);">${prod.name}</strong>
            ${prod.giftQty > 0 ? `<span class="item-status-badge status-regalo" style="margin-left: 6px;">🎁 ${prod.giftQty} de Regalo</span>` : ''}
          </td>
          <td style="text-align: center;">${prod.qty100 > 0 ? `<span class="size-pill" style="font-weight: 700;">${prod.qty100}</span>` : '<span style="color: var(--text-dim);">-</span>'}</td>
          <td style="text-align: center;">${prod.qty50 > 0 ? `<span class="size-pill" style="font-weight: 700;">${prod.qty50}</span>` : '<span style="color: var(--text-dim);">-</span>'}</td>
          <td style="text-align: center;">${prod.qty20 > 0 ? `<span class="size-pill" style="font-weight: 700;">${prod.qty20}</span>` : '<span style="color: var(--text-dim);">-</span>'}</td>
          <td style="text-align: center;"><span class="qty-badge" style="background: var(--gold-muted); color: var(--gold-primary); font-size: 0.9rem;">${prod.totalQty}</span></td>
          <td style="font-family: var(--font-mono); font-weight: 700; color: var(--text-title);">$${prod.totalCost.toLocaleString("es-CL")}</td>
          <td><div class="order-tags-list">${orderTags}</div></td>
        </tr>
      `;
    }).join("");

    containerProductsView.innerHTML = `
      <div class="consolidated-card">
        <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
          <div>
            <h3 style="margin: 0 0 4px 0; font-size: 1.1rem; color: var(--text-title);">Fragancias y Productos Más Pedidos</h3>
            <p style="margin: 0; font-size: 0.84rem; color: var(--text-muted);">Consolidado total de unidades por tamaño e historial de pedidos</p>
          </div>
          <span class="month-stats-badge">${productsList.length} productos diferentes</span>
        </div>
        <div class="consolidated-table-wrap">
          <table class="consolidated-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Código</th>
                <th>Perfume / Producto</th>
                <th style="text-align: center;">100 ML</th>
                <th style="text-align: center;">50 ML</th>
                <th style="text-align: center;">20 ML</th>
                <th style="text-align: center;">Total Unid.</th>
                <th>Inversión Total</th>
                <th>Pedidos en que se pidió</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </div>
    `;

    renderIcons();
  }

  // Renderizar la vista activa
  function updateActiveView() {
    if (currentViewMode === "ORDERS") {
      containerOrdersView.hidden = false;
      containerProductsView.hidden = true;
      renderOrdersView();
    } else {
      containerOrdersView.hidden = true;
      containerProductsView.hidden = false;
      renderProductsView();
    }
  }

  // Inicializar Lucide Icons
  function renderIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  // Event Listeners: Filtros de Mes
  if (monthFilterChipsEl) {
    monthFilterChipsEl.addEventListener("click", e => {
      const btn = e.target.closest("[data-month-filter]");
      if (!btn) return;

      monthFilterChipsEl.querySelectorAll("[data-month-filter]").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");

      currentMonthFilter = btn.dataset.monthFilter;
      updateActiveView();
    });
  }

  // Event Listeners: Selector de Vista
  if (viewModeOrdersBtn && viewModeProductsBtn) {
    viewModeOrdersBtn.addEventListener("click", () => {
      viewModeOrdersBtn.classList.add("is-active");
      viewModeProductsBtn.classList.remove("is-active");
      currentViewMode = "ORDERS";
      updateActiveView();
    });

    viewModeProductsBtn.addEventListener("click", () => {
      viewModeProductsBtn.classList.add("is-active");
      viewModeOrdersBtn.classList.remove("is-active");
      currentViewMode = "PRODUCTS";
      updateActiveView();
    });
  }

  // Event Listener: Búsqueda en vivo
  if (searchInputEl) {
    searchInputEl.addEventListener("input", e => {
      searchQuery = e.target.value.trim();
      updateActiveView();
    });
  }

  // Event Listener: Acordeones de pedidos
  document.addEventListener("click", e => {
    const header = e.target.closest('[data-action="toggle-accordion"]');
    if (!header) return;

    const card = header.closest(".order-accordion-card");
    if (card) {
      card.classList.toggle("is-expanded");
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

  // Inicialización
  initMetrics();
  updateActiveView();
});
