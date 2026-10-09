const products = window.CatalogData.products;
const standardPrices = window.CatalogData.standardPrices;
const VENDEDOR_WHATSAPP = window.CatalogData.vendedorWhatsApp;

// Metadatos y encabezados visuales para separar cada categoría
const categoryMeta = {
  "red-black": {
    title: "Línea Exclusiva Red & Black",
    desc: "Inspiraciones de nicho y alta gama en frasco",
    badge: "Alta Gama"
  },
  "mujer": {
    title: "Perfumería Fina Femenina",
    desc: "Perfumes tradicionales de diseñador",
    badge: "Perfume Mujer"
  },
  "hombre": {
    title: "Perfumería Fina Masculina",
    desc: "Perfumes tradicionales de diseñador",
    badge: "Perfume Hombre"
  },
  "teen": {
    title: "Perfumes Juveniles Teen",
    desc: "Perfumes juveniles de celebridades y artistas",
    badge: "Perfume"
  },
  "colonia-m": {
    title: "Colonias Corporales Dama",
    desc: "Refrescantes corporales de uso diario",
    badge: "Colonia Corporal"
  },
  "colonia-h": {
    title: "Colonias Corporales Hombre",
    desc: "Refrescantes corporales de uso diario",
    badge: "Colonia Corporal"
  },
  "splash": {
    title: "Colonia Splash Refrescante",
    desc: "Loción corporal fresca cítrica-frutal",
    badge: "Splash"
  }
};

const mapLayout = {
  mujer: {
    title: "Mapa de Fragancias Femeninas",
    quadrants: [
      { title: "Ligero / Fresco", groups: [
        { name: "Cítrico Maderoso", colors: ["c-citrico", "c-maderoso"], codes: ["F-28", "F-50"] },
        { name: "Cítrico Floral", colors: ["c-citrico", "c-floral"], codes: ["F-17"] },
        { name: "Floral Fresco", colors: ["c-floral"], codes: ["F-16"] },
        { name: "Floral Verde", colors: ["c-floral", "c-verde"], codes: ["F-36", "F-48", "F-52", "F-60"] }
      ] },
      { title: "Ligero / Cálido", groups: [
        { name: "Floral Frutal", colors: ["c-floral", "c-frutal"], codes: ["F-07", "F-09", "F-13", "F-27", "F-25", "F-31", "F-32", "F-38", "F-39", "F-45", "F-55", "F-62", "F-66", "F-61"] },
        { name: "Floral Aldehídico", colors: ["c-floral", "c-aldehidico"], codes: ["F-05"] },
        { name: "Cítrico Gourmand", colors: ["c-citrico"], codes: ["F-30"] }
      ] },
      { title: "Intenso / Fresco", groups: [
        { name: "Floral Floral", colors: ["c-floral"], codes: ["F-18", "F-20", "F-26", "F-29"] },
        { name: "Chypre Floral", colors: ["c-chypre", "c-floral"], codes: ["F-01", "F-34", "F-47", "F-56", "F-59"] },
        { name: "Chypre Frutal", colors: ["c-chypre", "c-frutal"], codes: ["F-06", "F-10", "F-11", "F-51"] },
        { name: "Chypre Oriental", colors: ["c-chypre", "c-oriental"], codes: ["F-57"] }
      ] },
      { title: "Intenso / Cálido", groups: [
        { name: "Floral Oriental", colors: ["c-floral", "c-oriental"], codes: ["F-03", "F-12", "F-23", "F-35", "F-46", "F-54", "F-63", "F-64"] },
        { name: "Oriental Floral", colors: ["c-oriental", "c-floral"], codes: ["F-19", "F-33", "F-42", "F-43", "F-44", "F-58"] },
        { name: "Oriental Frutal", colors: ["c-oriental", "c-frutal"], codes: ["F-15", "F-37", "F-40", "F-41", "F-49"] },
        { name: "Oriental Maderoso", colors: ["c-oriental", "c-maderoso"], codes: ["F-04", "F-53", "F-08"] }
      ] }
    ]
  },
  hombre: {
    title: "Mapa de Fragancias Masculinas",
    quadrants: [
      { title: "Ligero / Fresco", groups: [
        { name: "Cítrico Fresco", colors: ["c-citrico"], codes: ["H-26"] },
        { name: "Fougère Fresco", colors: ["c-fougere"], codes: ["H-01"] },
        { name: "Fougère Frutal", colors: ["c-fougere", "c-frutal"], codes: ["H-07"] },
        { name: "Fougère Aromático", colors: ["c-fougere", "c-aromatico"], codes: ["H-02", "H-04", "H-11", "H-13", "H-44", "H-15"] }
      ] },
      { title: "Ligero / Cálido", groups: [
        { name: "Maderoso Frutal", colors: ["c-maderoso", "c-frutal"], codes: ["H-06", "H-27", "H-34"] },
        { name: "Maderoso Verde", colors: ["c-maderoso", "c-verde"], codes: ["H-14"] },
        { name: "Maderoso Floral", colors: ["c-maderoso", "c-floral"], codes: ["H-19", "H-35"] },
        { name: "Maderoso Aromático", colors: ["c-maderoso", "c-aromatico"], codes: ["H-05", "H-08", "H-09", "H-10", "H-21", "H-30"] }
      ] },
      { title: "Intenso / Fresco", groups: [
        { name: "Maderoso Cítrico", colors: ["c-maderoso", "c-citrico"], codes: ["H-20", "H-22", "H-37", "H-41"] },
        { name: "Chypre Aromático", colors: ["c-chypre", "c-aromatico"], codes: ["H-03"] },
        { name: "Chypre Maderoso", colors: ["c-chypre", "c-maderoso"], codes: ["H-12"] },
        { name: "Fougère Maderoso", colors: ["c-fougere", "c-maderoso"], codes: ["H-18", "H-31", "H-32"] }
      ] },
      { title: "Intenso / Cálido", groups: [
        { name: "Oriental Frutal", colors: ["c-oriental", "c-frutal"], codes: ["H-16", "H-17", "H-29", "H-39"] },
        { name: "Fougère Oriental", colors: ["c-fougere", "c-oriental"], codes: ["H-33", "H-36", "H-38", "H-40", "H-45"] },
        { name: "Oriental Especiado", colors: ["c-oriental", "c-especiado"], codes: ["H-43"] },
        { name: "Oriental Maderoso", colors: ["c-oriental", "c-maderoso"], codes: ["H-23", "H-24", "H-25", "H-28", "H-42"] }
      ] }
    ]
  }
};

// Estado general de la aplicación
let cart = [];
let currentCategory = "all";
let activeMapGender = "mujer";
let mapViewportMode = null;
let searchQuery = "";
let selectedSizes = {};
let malePresentationVisible = {};
let femalePresentationVisible = {};
const maleAromaImageBase = "img/Fragancias%20Masculinas/Inspiraci%C3%B3n%20visual%20por%20aroma";
const malePresentationImageBase = "img/Fragancias%20Masculinas/Presentaci%C3%B3n%20general";
const malePresentationImages = {
  "100ml": "frasco-perfume-hombre-100ml-parfums-d-parfums-eau-de-toilette-essenciel.webp",
  "50ml": "perfume-parfums-d-parfums-de-andre-hombre-50ml-eau-de-toilette-essenciel.webp",
  "20ml": "perfume-parfums-d-parfums-hombre-20ml-eau-de-toilette-essenciel..webp"
};
const femaleAromaImageBase = "img/Fragancias%20Femeninas/Inspiraci%C3%B3n%20visual%20por%20aroma";
const femalePresentationImageBase = "img/Fragancias%20Femeninas/Presentaci%C3%B3n%20general";
const femalePresentationImages = {
  "100ml": "perfume-parfums-d-parfums-mujer-100ml-eau-de-toilette-essenciel.webp",
  "50ml": "perfume-parfums-d-parfums-mujer-50ml-eau-de-toilette-essenciel.webp",
  "20ml": "perfume-parfums-d-parfums-mujer-20ml-eau-de-toilette-essenciel.webp"
};
const missingImageSrc = "img/no-img/no-encontrado.webp";

function normalizeSearchText(value) {
  return value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeAttr(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function productMatchesQuery(p, rawQuery, allProducts) {
  const query = normalizeSearchText(rawQuery);
  if (!query) return true;
  const compactQuery = query.replace(/\s+/g, "");
  const codeQuery = normalizeProductCode(rawQuery);
  const queryWords = query.split(/\s+/).filter(Boolean);
  const exactCodeQuery = /^[a-z]+\d+$/.test(codeQuery);
  const hasExactCodeMatch = exactCodeQuery && allProducts.some(item =>
    getProductCodeVariants(item.code).includes(codeQuery)
  );
  if (hasExactCodeMatch) return getProductCodeVariants(p.code).includes(codeQuery);
  const searchableText = normalizeSearchText([p.code, p.name, p.sub, p.notes].filter(Boolean).join(" "));
  const searchableWords = searchableText.split(" ");
  return searchableText.replace(/\s+/g, "").includes(compactQuery) ||
    queryWords.every(word => searchableWords.some(searchableWord => searchableWord.startsWith(word)));
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

// Sugiere el nombre de la base de datos más parecido a lo escrito
function findSearchSuggestion(rawQuery, allProducts) {
  const query = normalizeSearchText(rawQuery);
  if (query.length < 3) return "";
  const queryWords = query.split(/\s+/);
  const vocabulary = new Set();
  allProducts.forEach(p => normalizeSearchText([p.name, p.sub].filter(Boolean).join(" ")).split(" ")
    .forEach(word => { if (word.length >= 3 || /^\d+$/.test(word)) vocabulary.add(word); }));

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
    const match = allProducts.find(p => productMatchesQuery(p, correctedQuery, allProducts));
    if (match) return match.name;
  }

  // Comparación contra el nombre completo
  const compact = query.replace(/\s+/g, "");
  let bestName = "", bestDistance = Math.max(2, Math.floor(compact.length / 4)) + 1;
  allProducts.forEach(p => {
    const distance = editDistance(compact, normalizeSearchText(p.name).replace(/\s+/g, ""));
    if (distance < bestDistance) { bestName = p.name; bestDistance = distance; }
  });
  return bestName;
}

function normalizeProductCode(value) {
  return normalizeSearchText(value)
    .replace(/\s+/g, "")
    .replace(/([a-z]+)0+(\d+)/g, "$1$2");
}

function getProductCodeVariants(code) {
  return code.split(/[\/,;|]/).map(normalizeProductCode).filter(Boolean);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function renderLucideIcons() {
  window.lucide?.createIcons();
}

function findMapProduct(code, gender) {
  const normalizedCode = normalizeProductCode(code);
  const genderProducts = products.filter(product => product.cat === gender);
  return genderProducts.find(product =>
    normalizeProductCode(product.code.split("/")[0]) === normalizedCode
  ) || genderProducts.find(product => getProductCodeVariants(product.code).includes(normalizedCode));
}

function renderMap(gender = activeMapGender) {
  const config = mapLayout[gender];
  const container = document.getElementById(`mapContainer${gender === "mujer" ? "Mujer" : "Hombre"}`);
  const query = normalizeSearchText(searchQuery);
  const codeQuery = normalizeProductCode(searchQuery);
  const isDesktop = window.matchMedia("(min-width: 641px)").matches;
  mapViewportMode = isDesktop;

  const quadrants = config.quadrants.map((quadrant, index) => {
    const groups = quadrant.groups.map(group => {
      const productsInGroup = group.codes.map(code => ({
        code,
        product: findMapProduct(code, gender)
      })).filter(item => item.product);
      const groupMatches = query && normalizeSearchText(group.name).includes(query);
      const matches = productsInGroup.filter(({ code, product }) => {
        if (!query || groupMatches) return true;
        const searchableText = normalizeSearchText([product.code, product.name, product.sub].join(" "));
        return searchableText.includes(query) ||
          normalizeProductCode(code).includes(codeQuery);
      });

      if (matches.length === 0) return "";

      const dots = group.colors.map(color => `<span class="dot ${color}" aria-hidden="true"></span>`).join("");
      const items = matches.map(({ code, product }) => `
        <button class="map-product" type="button" data-action="map-product" data-product-id="${product.id}">
          <span class="map-product-code">${escapeHTML(code)}</span>
          <span class="map-product-name">${escapeHTML(product.name)}</span>
        </button>
      `).join("");

      return `
        <section class="map-group">
          <h3 class="quadrant-group-name">${dots}${escapeHTML(group.name)}</h3>
          <div class="quadrant-items">${items}</div>
        </section>
      `;
    }).filter(Boolean);

    if (groups.length === 0) return "";
    const count = groups.reduce((total, groupHtml) => total + (groupHtml.match(/class="map-product"/g) || []).length, 0);

    return `
      <details class="quadrant" ${isDesktop || query || index === 0 ? "open" : ""}>
        <summary class="quadrant-summary">
          <span class="quadrant-tag">${escapeHTML(quadrant.title)}</span>
          <span class="quadrant-count">${count} ${count === 1 ? "fragancia" : "fragancias"}</span>
        </summary>
        <div class="quadrant-groups">${groups.join("")}</div>
      </details>
    `;
  }).filter(Boolean);

  container.innerHTML = `
    <h2 class="compass-title">${config.title}</h2>
    <p class="compass-desc">Ligero a intenso · Fresco a cálido</p>
    <div class="compass-grid">
      ${quadrants.length ? quadrants.join("") : `<p class="map-empty">No se encontraron fragancias para esa búsqueda.</p>`}
    </div>
  `;
}

function showMapProduct(productId) {
  const product = products.find(item => item.id === productId);
  if (!product) return;

  currentCategory = product.cat;
  searchQuery = product.code.split("/")[0].trim();
  document.getElementById("searchInput").value = searchQuery;
  document.querySelector(".search-clear-btn").hidden = false;
  document.querySelectorAll(".pill-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.category === currentCategory);
  });
  renderProducts();
  document.querySelector(`[data-product-card="${product.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function appendRedBlackProducts(container, items) {
  ["RED", "BLACK"].forEach(badge => {
    const group = items.filter(product => product.badge === badge);
    if (group.length === 0) return;

    const heading = document.createElement("div");
    heading.className = `catalog-subgroup-title subgroup-${badge.toLowerCase()}`;
    heading.textContent = badge;
    container.appendChild(heading);

    group.forEach(product => {
      container.insertAdjacentHTML("beforeend", buildProductCard(product));
    });
  });
}

function appendTeenProducts(container, items) {
  [
    { title: "FEMENINO", matches: product => /^J0[0-6]$/.test(product.code) },
    { title: "MASCULINO", matches: product => !/^J0[0-6]$/.test(product.code) }
  ].forEach(({ title, matches }) => {
    const group = items.filter(matches);
    if (group.length === 0) return;

    const heading = document.createElement("div");
    heading.className = `catalog-subgroup-title subgroup-${title.toLowerCase()}`;
    heading.textContent = title;
    container.appendChild(heading);

    group.forEach(product => {
      container.insertAdjacentHTML("beforeend", buildProductCard(product));
    });
  });
}

function appendCategoryHeading(container, categoryKey) {
  const meta = categoryMeta[categoryKey];
  if (!meta) return;

  const heading = document.createElement("div");
  heading.className = `catalog-category-heading category-${categoryKey}`;
  heading.innerHTML = `
    <p class="category-heading-kicker">${escapeHTML(meta.badge)}</p>
    <h2>${escapeHTML(meta.title)}</h2>
    <p class="category-heading-desc">${escapeHTML(meta.desc)}</p>
  `;
  container.appendChild(heading);
}

function appendCategoryDisclaimer(container) {
  const disclaimer = document.createElement("p");
  disclaimer.className = "catalog-category-disclaimer";
  disclaimer.textContent = "Parfums D’ Parfums no tiene conexión alguna con las marcas registradas a las que se hace referencia";
  container.appendChild(disclaimer);
}

// Función constructora para cada tarjeta de producto
function buildProductCard(p) {
  let badgeClass = "badge-std";
  if (p.badge === "RED") badgeClass = "badge-red";
  if (p.badge === "BLACK") badgeClass = "badge-black";

  let dotsHtml = "";
  if (p.colors && p.colors.length > 0) {
    dotsHtml = `<div class="color-dots">${p.colors.map(c => `<span class="dot ${c}"></span>`).join("")}</div>`;
  }
  const productName = escapeHTML(p.name);
  const aromaNotes = p.notes && p.colors?.length
    ? p.notes.split(/\s+/).map((word, index) =>
        `<span class="aroma-note-tone aroma-${p.colors[index % p.colors.length]}">${escapeHTML(word)}</span>`
      ).join(" ")
    : escapeHTML(p.notes || "");

  let selectorHtml = "";
  let price = p.price;
  let currentSize = p.fixedSize || "100ml";

  if (p.tiered) {
    currentSize = selectedSizes[p.id] || "100ml";
    price = standardPrices[currentSize];

    selectorHtml = `
      <div class="size-selector">
        <div class="size-option ${selectedSizes[p.id] === '100ml' ? 'active' : ''}" data-action="select-size" data-product-id="${p.id}" data-size="100ml">100 ml</div>
        <div class="size-option ${selectedSizes[p.id] === '50ml' ? 'active' : ''}" data-action="select-size" data-product-id="${p.id}" data-size="50ml">50 ml</div>
        <div class="size-option ${selectedSizes[p.id] === '20ml' ? 'active' : ''}" data-action="select-size" data-product-id="${p.id}" data-size="20ml">20 ml</div>
      </div>
    `;
  }

  const categoryBadge = categoryMeta[p.cat]?.badge || "";
  const productBadge = p.cat === "teen" ? categoryBadge : p.badge;
  const redBlackImage = p.cat === "red-black"
    ? p.badge === "BLACK"
      ? { src: "img/Black%20parfums/Captura%20desde%202026-10-07%2019-08-20.webp", alt: "Envase y empaque Black Parfums" }
      : { src: "img/Red%20parfums/red-parfums-empaque.webp", alt: "Envase y empaque Red Parfums" }
    : null;
  const teenImage = p.cat === "teen"
    ? /^J0[0-6]$/.test(p.code)
      ? { src: `img/teen/girl/${p.code.replace("J", "J-")}.webp`, alt: `Perfume ${p.name} de la línea Teen` }
      : /^J0[7-9]$/.test(p.code)
        ? { src: "img/teen/boy/teen%20boy.webp", alt: "Empaque de la línea Teen masculina" }
        : null
    : null;
  const maleSizeSelected = p.cat === "hombre" && Boolean(malePresentationVisible[p.id]);
  const maleImage = p.cat === "hombre"
    ? {
        src: maleSizeSelected
          ? `${malePresentationImageBase}/${malePresentationImages[selectedSizes[p.id]]}`
          : `${maleAromaImageBase}/${p.code}/parfums_${p.code.replace("-", "")}.webp`,
        alt: maleSizeSelected
          ? `Presentación general de ${selectedSizes[p.id]} para la línea masculina`
          : `Imagen de inspiración olfativa para ${p.name}`
      }
    : null;
  const femaleSizeSelected = p.cat === "mujer" && Boolean(femalePresentationVisible[p.id]);
  const presentationSize = maleSizeSelected || femaleSizeSelected ? selectedSizes[p.id] : "";
  const femaleCode = p.code.split("/")[0].trim();
  const femaleImage = p.cat === "mujer"
    ? {
        src: femaleSizeSelected
          ? `${femalePresentationImageBase}/${femalePresentationImages[selectedSizes[p.id]]}`
          : `${femaleAromaImageBase}/${femaleCode}/parfums_${femaleCode.replace("-", "").toLowerCase()}.webp`,
        alt: femaleSizeSelected
          ? `Presentación general de ${selectedSizes[p.id]} para la línea femenina`
          : `Imagen de inspiración olfativa para ${p.name}`
      }
    : null;
  const cologneImage = p.cat === "colonia-h"
    ? { src: "img/Colonias%20Hombre/colonia-parfums-d-parfums-hombre-400ml-eau-de-_cologne_-essenciel.webp", alt: "Envase de colonia masculina S-400 de 400 ml" }
    : p.cat === "colonia-m"
      ? { src: "img/colonias%20mujer/colonia-parfums-d-parfums-mujer-400ml-eau-de-_cologne_-essenciel.webp", alt: "Envase de colonia femenina S-400 de 400 ml" }
      : p.cat === "splash"
        ? { src: "img/colonia%20splash/500_Colonia_Inglesa_Parfums.webp", alt: "Envase de colonia Splash de 500 ml" }
        : null;
  const productImage = redBlackImage || teenImage || maleImage || femaleImage || cologneImage;
  const productInCart = cart.some(item => item.id === p.id);
  const aromaImageVisible = p.cat === "hombre"
    ? malePresentationVisible[p.id]
    : p.cat === "mujer"
      ? femalePresentationVisible[p.id]
      : false;
  const aromaImageButton = p.cat === "hombre" || p.cat === "mujer"
    ? `<button class="aroma-image-btn${aromaImageVisible ? "" : " is-hidden"}" type="button" data-action="show-aroma" data-product-id="${p.id}" aria-label="Volver a la imagen del aroma" aria-hidden="${!aromaImageVisible}" title="Volver a la imagen del aroma" ${aromaImageVisible ? "" : "disabled"}>Ver aroma</button>`
    : "";

  return `
      <div class="card${p.cat === "hombre" ? " card-male" : p.cat === "mujer" ? " card-female" : ""}" data-product-card="${p.id}">
      <div>
        <div class="card-top">
          <div class="card-identity">
            <span class="card-code">${p.code}</span>
            ${dotsHtml}
          </div>
          ${productBadge ? `<span class="card-badge ${badgeClass}">${productBadge}</span>` : `<span class="card-badge badge-std">${categoryBadge}</span>`}
        </div>
        ${productImage ? `<div class="card-img-wrapper card-img-wrapper-${p.cat}"><img class="card-product-image" src="${productImage.src}" alt="${productImage.alt}" data-size="${presentationSize}" data-fallback-src="${missingImageSrc}" loading="lazy">${aromaImageButton}</div>` : ""}
        <div class="card-title">${productName}</div>
        <div class="card-subtitle">${p.sub}${p.fixedSize ? ` · ${p.fixedSize}` : ""}</div>
        ${p.notes ? `<div class="card-notes">${aromaNotes}</div>` : ''}
      </div>
      <div>
        ${selectorHtml}
        <div class="card-purchase-row">
          <div class="price-tag">$${price.toLocaleString("es-CL")}</div>
          <button class="add-btn${productInCart ? " is-added" : ""}" data-action="add-to-cart" data-product-id="${p.id}">
            ${productInCart ? "Agregado" : "<span>+</span> Agregar"}
          </button>
        </div>
      </div>
    </div>
  `;
}

// Renderizado principal con separación por categorías
function renderProducts() {
  const container = document.getElementById("catalogList");
  const mapSection = document.getElementById("mapSection");

  if (currentCategory === "mapa") {
    container.hidden = true;
    mapSection.hidden = false;
    renderMap();
    return;
  } else {
    container.hidden = false;
    mapSection.hidden = true;
  }

  container.innerHTML = "";

  const query = normalizeSearchText(searchQuery);
  const filtered = products.filter(p =>
    (currentCategory === "all" || p.cat === currentCategory) && productMatchesQuery(p, searchQuery, products)
  );

  if (filtered.length === 0) {
    const suggestion = findSearchSuggestion(searchQuery, products);
    const suggestionHtml = suggestion
      ? `<div class="search-suggestion">¿Quisiste decir <button type="button" class="search-suggestion-btn" data-action="apply-suggestion" data-suggestion="${escapeAttr(suggestion)}">${escapeAttr(suggestion)}</button>?</div>`
      : "";
    container.innerHTML = `<div class="empty-state">No se encontraron fragancias con esa búsqueda.${suggestionHtml}</div>`;
    return;
  }

  // Si está en 'Todos' y sin búsqueda activa: separar por secciones visualmente distinguidas
  if (currentCategory === "all" && !query) {
    const order = ["red-black", "mujer", "hombre", "teen", "colonia-m", "colonia-h", "splash"];
    
    order.forEach(catKey => {
      const items = filtered.filter(p => p.cat === catKey);
      if (items.length === 0) return;

      appendCategoryHeading(container, catKey);

      if (catKey === "red-black") {
        appendRedBlackProducts(container, items);
      } else if (catKey === "teen") {
        appendTeenProducts(container, items);
      } else {
        items.forEach(p => {
          container.insertAdjacentHTML("beforeend", buildProductCard(p));
        });
      }
      appendCategoryDisclaimer(container);
    });
  } else {
    // Si seleccionó una categoría específica o buscó por texto
    if (currentCategory !== "all") appendCategoryHeading(container, currentCategory);

    if (currentCategory === "red-black") {
      appendRedBlackProducts(container, filtered);
    } else if (currentCategory === "teen") {
      appendTeenProducts(container, filtered);
    } else {
      filtered.forEach(p => {
        container.insertAdjacentHTML("beforeend", buildProductCard(p));
      });
    }
    if (currentCategory !== "all") appendCategoryDisclaimer(container);
  }
}

function selectSize(productId, size) {
  selectedSizes[productId] = size;
  const product = products.find(item => item.id === productId);
  if (product?.cat === "hombre") malePresentationVisible[productId] = true;
  if (product?.cat === "mujer") femalePresentationVisible[productId] = true;
  const card = document.querySelector(`[data-product-card="${productId}"]`);
  if (!product || !card) {
    renderProducts();
    return;
  }

  card.querySelectorAll(".size-option").forEach(option => {
    option.classList.toggle("active", option.dataset.size === size);
  });

  const priceTag = card.querySelector(".price-tag");
  if (priceTag) priceTag.textContent = `$${standardPrices[size].toLocaleString("es-CL")}`;

  if (product.cat === "mujer") {
    const aromaButton = card.querySelector(".aroma-image-btn");
    if (aromaButton) {
      aromaButton.disabled = false;
      aromaButton.setAttribute("aria-hidden", "false");
      aromaButton.classList.remove("is-hidden");
    }

    const imageName = femalePresentationImages[size];
    if (!imageName) return;

    updateCardImage(card.querySelector(".card-product-image"), {
      src: `${femalePresentationImageBase}/${imageName}`,
      alt: `Presentación general de ${size} para la línea femenina`,
      size
    });
    return;
  }

  if (product.cat !== "hombre") return;

  const aromaButton = card.querySelector(".aroma-image-btn");
  if (aromaButton) {
    aromaButton.disabled = false;
    aromaButton.setAttribute("aria-hidden", "false");
    aromaButton.classList.remove("is-hidden");
  }

  const imageName = malePresentationImages[size];
  if (!imageName) return;

  updateCardImage(card.querySelector(".card-product-image"), {
    src: `${malePresentationImageBase}/${imageName}`,
    alt: `Presentación general de ${size} para la línea masculina`,
    size
  });
}

function showAromaImage(productId) {
  const product = products.find(item => item.id === productId);
  const card = document.querySelector(`[data-product-card="${productId}"]`);
  if (!product || !card || (product.cat !== "hombre" && product.cat !== "mujer")) return;

  const aromaImage = product.cat === "hombre" ? malePresentationVisible : femalePresentationVisible;
  const aromaImageBase = product.cat === "hombre" ? maleAromaImageBase : femaleAromaImageBase;
  const productCode = product.code.split("/")[0].trim();
  const imageCode = product.cat === "hombre"
    ? productCode.replace("-", "")
    : productCode.replace("-", "").toLowerCase();
  aromaImage[productId] = false;
  const aromaButton = card.querySelector(".aroma-image-btn");
  if (aromaButton) {
    aromaButton.disabled = true;
    aromaButton.setAttribute("aria-hidden", "true");
    aromaButton.classList.add("is-hidden");
  }

  updateCardImage(card.querySelector(".card-product-image"), {
    src: `${aromaImageBase}/${productCode}/parfums_${imageCode}.webp`,
    alt: `Imagen de inspiración olfativa para ${product.name}`
  });
}

function updateCardImage(image, { src, alt, size }) {
  if (!image) return;
  if (size) image.dataset.size = size;
  else delete image.dataset.size;

  const imageVersion = Number(image.dataset.imageVersion || 0) + 1;
  image.dataset.imageVersion = String(imageVersion);
  const loadedImage = new Image();
  loadedImage.onload = () => {
    if (image.dataset.imageVersion !== String(imageVersion)) return;
    image.src = loadedImage.src;
    image.alt = alt;
    delete image.dataset.fallbackApplied;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      image.animate([{ opacity: 0.25 }, { opacity: 1 }], {
        duration: 280,
        easing: "ease-out"
      });
    }
  };
  loadedImage.onerror = () => {
    if (image.dataset.imageVersion !== String(imageVersion)) return;
    image.src = missingImageSrc;
    image.alt = "Imagen no disponible";
    delete image.dataset.size;
    image.dataset.fallbackApplied = "true";
  };
  loadedImage.src = src;
}

// Agregar al carrito
function addToCart(productId) {
  const p = products.find(x => x.id === productId);
  if (p.tiered && !selectedSizes[productId]) selectSize(productId, "100ml");
  const size = p.tiered ? (selectedSizes[productId] || "100ml") : p.fixedSize;
  const price = p.tiered ? standardPrices[size] : p.price;
  const itemKey = `${p.id}_${size}`;

  const existingIndex = cart.findIndex(item => item.itemKey === itemKey);

  if (existingIndex > -1) {
    cart[existingIndex].qty += 1;
  } else {
    cart.push({
      itemKey: itemKey,
      id: p.id,
      code: p.code,
      name: p.name,
      size: size,
      unitPrice: price,
      qty: 1
    });
  }

  updateCartBar();
}

// Modificar cantidades en el carrito
function changeQty(itemKey, delta) {
  const index = cart.findIndex(item => item.itemKey === itemKey);
  if (index > -1) {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) {
      cart.splice(index, 1);
    }
  }
  updateCartBar();
  renderCartModalItems();
  if (cart.length === 0) closeCartModal();
}

// Eliminar producto específico
function removeItem(itemKey) {
  cart = cart.filter(item => item.itemKey !== itemKey);
  updateCartBar();
  renderCartModalItems();
  if (cart.length === 0) closeCartModal();
}

// Vaciar carrito
function clearCart() {
  cart = [];
  updateCartBar();
  closeCartModal();
}

// Actualizar barra flotante
function updateCartBar() {
  const cartBar = document.getElementById("cartBar");
  const countEl = document.getElementById("cartCount");
  const totalEl = document.getElementById("cartTotal");
  const productIdsInCart = new Set(cart.map(item => item.id));

  document.querySelectorAll(".card[data-product-card]").forEach(card => {
    const addButton = card.querySelector(".add-btn");
    if (!addButton) return;

    const productInCart = productIdsInCart.has(card.dataset.productCard);
    addButton.classList.toggle("is-added", productInCart);
    addButton.innerHTML = productInCart ? "Agregado" : "<span>+</span> Agregar";
  });

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);

  if (totalItems > 0) {
    cartBar.hidden = false;
    countEl.textContent = `${totalItems} ${totalItems === 1 ? 'producto' : 'productos'}`;
    totalEl.textContent = `$${totalPrice.toLocaleString("es-CL")}`;
  } else {
    cartBar.hidden = true;
  }
}

// Abrir y cerrar modal de carrito
function openCartModal() {
  if (cart.length === 0) return;
  renderCartModalItems();
  document.getElementById("cartModalOverlay").hidden = false;
}

function closeCartModal() {
  document.getElementById("cartModalOverlay").hidden = true;
}

// Renderizar contenido del modal de carrito
function renderCartModalItems() {
  const listEl = document.getElementById("cartItemsList");
  const modalTotalEl = document.getElementById("modalTotalVal");
  listEl.innerHTML = "";

  const totalPrice = cart.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);
  modalTotalEl.textContent = `$${totalPrice.toLocaleString("es-CL")}`;

  cart.forEach(item => {
    const itemRow = document.createElement("div");
    itemRow.className = "cart-item-row";

    const subtotal = item.unitPrice * item.qty;

    itemRow.innerHTML = `
      <div class="cart-item-info">
        <div class="cart-item-name">[${item.code}] ${item.name}</div>
        <div class="cart-item-meta">Tamaño: ${item.size} | Unit: $${item.unitPrice.toLocaleString("es-CL")}</div>
        <div class="cart-item-price">Subtotal: $${subtotal.toLocaleString("es-CL")}</div>
      </div>
      <div class="qty-controls">
        <button class="qty-btn" data-action="change-qty" data-item-key="${item.itemKey}" data-delta="-1" aria-label="Restar una unidad" title="Restar una unidad">
          <i data-lucide="minus" aria-hidden="true"></i>
        </button>
        <span class="qty-val">${item.qty}</span>
        <button class="qty-btn" data-action="change-qty" data-item-key="${item.itemKey}" data-delta="1" aria-label="Sumar una unidad" title="Sumar una unidad">
          <i data-lucide="plus" aria-hidden="true"></i>
        </button>
        <button class="delete-item-btn" data-action="remove-item" data-item-key="${item.itemKey}" aria-label="Quitar producto" title="Quitar producto">
          <i data-lucide="trash-2" aria-hidden="true"></i>
        </button>
      </div>
    `;

    listEl.appendChild(itemRow);
  });

  renderLucideIcons();
}

// Envío a WhatsApp
function sendToWhatsApp() {
  if (cart.length === 0) return;

  const customerNameInput = document.getElementById("customerName");
  const customerNameError = document.getElementById("customerNameError");
  const customerName = customerNameInput.value.trim().replace(/\s+/g, " ");
  const nameParts = customerName.split(" ").filter(Boolean);
  if (nameParts.length < 2) {
    customerNameInput.setAttribute("aria-invalid", "true");
    customerNameError.hidden = false;
    customerNameInput.focus();
    return;
  }
  customerNameInput.removeAttribute("aria-invalid");
  customerNameError.hidden = true;

  let msg = `¡Hola! Soy ${customerName} y quiero solicitar el siguiente pedido:\n\n`;
  cart.forEach((item, index) => {
    const subtotal = item.unitPrice * item.qty;
    msg += `${index + 1}. [${item.code}] ${item.name} (${item.size})\n   Cantidad: ${item.qty} x $${item.unitPrice.toLocaleString("es-CL")} = $${subtotal.toLocaleString("es-CL")}\n`;
  });

  const total = cart.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);
  msg += `\n*TOTAL A PAGAR: $${total.toLocaleString("es-CL")}*`;

  const url = `https://wa.me/${VENDEDOR_WHATSAPP}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

function showMapGender(gender) {
  activeMapGender = gender;
  const btnM = document.getElementById("btnMapMujer");
  const btnH = document.getElementById("btnMapHombre");
  const boxM = document.getElementById("mapContainerMujer");
  const boxH = document.getElementById("mapContainerHombre");

  if (gender === 'mujer') {
    btnM.classList.add("active");
    btnH.classList.remove("active");
    boxM.hidden = false;
    boxH.hidden = true;
  } else {
    btnH.classList.add("active");
    btnM.classList.remove("active");
    boxH.hidden = false;
    boxM.hidden = true;
  }
  renderMap(gender);
}

// Event Delegation táctil
document.addEventListener("error", event => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !image.dataset.fallbackSrc || image.dataset.fallbackApplied) return;

  image.dataset.fallbackApplied = "true";
  image.src = image.dataset.fallbackSrc;
  image.alt = "Imagen no disponible";
}, true);

document.addEventListener("click", event => {
  const control = event.target.closest("[data-action]");
  if (!control) return;
  if (control.dataset.action === "close-cart" && event.target !== control) return;

  switch (control.dataset.action) {
    case "map-gender":
      showMapGender(control.dataset.gender);
      break;
    case "map-product":
      showMapProduct(control.dataset.productId);
      break;
    case "apply-suggestion": {
      const input = document.getElementById("searchInput");
      input.value = control.dataset.suggestion;
      input.dispatchEvent(new Event("input"));
      break;
    }
    case "clear-search":
      clearSearch();
      break;
    case "open-cart":
      openCartModal();
      break;
    case "close-cart":
      closeCartModal();
      break;
    case "select-size":
      selectSize(control.dataset.productId, control.dataset.size);
      break;
    case "show-aroma":
      showAromaImage(control.dataset.productId);
      break;
    case "add-to-cart":
      addToCart(control.dataset.productId);
      break;
    case "change-qty":
      changeQty(control.dataset.itemKey, Number(control.dataset.delta));
      break;
    case "remove-item":
      removeItem(control.dataset.itemKey);
      break;
    case "clear-cart":
      clearCart();
      break;
    case "send-whatsapp":
      sendToWhatsApp();
      break;
  }
});

// Píldoras de categoría
document.querySelectorAll(".pill-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".pill-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentCategory = btn.dataset.category;
    renderProducts();
  });
});

// Buscador
document.getElementById("customerName").addEventListener("input", event => {
  event.currentTarget.removeAttribute("aria-invalid");
  document.getElementById("customerNameError").hidden = true;
});

document.getElementById("searchInput").addEventListener("input", (e) => {
  searchQuery = e.target.value;
  document.querySelector(".search-clear-btn").hidden = searchQuery.length === 0;
  if (currentCategory === "mapa") {
    renderMap();
  } else {
    renderProducts();
  }
});

function clearSearch() {
  const input = document.getElementById("searchInput");
  input.value = "";
  searchQuery = "";
  document.querySelector(".search-clear-btn").hidden = true;
  if (currentCategory === "mapa") {
    renderMap();
  } else {
    renderProducts();
  }
  input.focus();
}

window.addEventListener("resize", () => {
  const isDesktop = window.matchMedia("(min-width: 641px)").matches;
  if (currentCategory === "mapa" && isDesktop !== mapViewportMode) renderMap();
});

// Render inicial
renderProducts();
renderLucideIcons();