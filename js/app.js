let products = window.CatalogData?.products || [];
let standardPrices = window.CatalogData?.standardPrices || { "100ml": 17000, "50ml": 11000, "20ml": 6500 };
let VENDEDOR_WHATSAPP = window.CatalogData?.vendedorWhatsApp || "56968787862";

function syncCatalogData() {
  if (window.CatalogData) {
    if (Array.isArray(window.CatalogData.products)) {
      products = window.CatalogData.products;
    }
    if (window.CatalogData.standardPrices) {
      standardPrices = window.CatalogData.standardPrices;
    }
    if (window.CatalogData.vendedorWhatsApp) {
      VENDEDOR_WHATSAPP = window.CatalogData.vendedorWhatsApp;
    }
  }
}

// Metadatos y encabezados visuales para separar cada categoría
const categoryMeta = {
  "mas-comprados": {
    title: "Los Más Comprados",
    desc: "Nuestras fragancias más elegidas y pedidas por los clientes",
    badge: "Tendencias & Favoritos"
  },
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
  },
  "crema": {
    title: "Cremas y Tratamientos",
    desc: "Tratamiento y cuidado de la piel",
    badge: "Crema"
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
        { name: "Floral Verde", colors: ["c-floral", "c-verde"], codes: ["F-36", "F-48", "F-52", "F-60"] },
        { name: "Floral Maderoso", colors: ["c-floral", "c-maderoso"], codes: ["F-22", "F-24", "F-65"] }
      ] },
      { title: "Ligero / Cálido", groups: [
        { name: "Floral Frutal", colors: ["c-floral", "c-frutal"], codes: ["F-07", "F-09", "F-13", "F-27", "F-25", "F-31", "F-32", "F-38", "F-39", "F-45", "F-55", "F-62", "F-66", "F-61", "Q 07"] },
        { name: "Floral Aldehídico", colors: ["c-floral", "c-aldehidico"], codes: ["F-05"] },
        { name: "Cítrico Gourmand", colors: ["c-citrico"], codes: ["F-30"] },
        { name: "Gourmand Vainilla", colors: ["c-oriental", "c-frutal"], codes: ["Q 06"] }
      ] },
      { title: "Intenso / Fresco", groups: [
        { name: "Floral Floral", colors: ["c-floral"], codes: ["F-18", "F-20", "F-26", "F-29"] },
        { name: "Chypre Floral", colors: ["c-chypre", "c-floral"], codes: ["F-01", "F-34", "F-47", "F-56", "F-59"] },
        { name: "Chypre Frutal", colors: ["c-chypre", "c-frutal"], codes: ["F-06", "F-10", "F-11", "F-51", "Q 01"] },
        { name: "Chypre Oriental", colors: ["c-chypre", "c-oriental"], codes: ["F-57"] },
        { name: "Oriental Cítrico", colors: ["c-oriental", "c-citrico"], codes: ["F-14"] }
      ] },
      { title: "Intenso / Cálido", groups: [
        { name: "Floral Oriental", colors: ["c-floral", "c-oriental"], codes: ["F-03", "F-12", "F-23", "F-35", "F-46", "F-54", "F-63", "F-64"] },
        { name: "Floral Especiado", colors: ["c-floral", "c-especiado"], codes: ["F-21"] },
        { name: "Oriental Floral", colors: ["c-oriental", "c-floral"], codes: ["F-19", "F-33", "F-42", "F-43", "F-44", "F-58", "Q 02", "Q 04", "Q 05", "Q 08"] },
        { name: "Oriental Frutal", colors: ["c-oriental", "c-frutal"], codes: ["F-15", "F-37", "F-40", "F-41", "F-49"] },
        { name: "Oriental Dulce", colors: ["c-oriental", "c-frutal"], codes: ["Q 03"] },
        { name: "Oriental Maderoso", colors: ["c-oriental", "c-maderoso"], codes: ["F-04", "F-53", "F-08", "Q 09"] }
      ] }
    ]
  },
  hombre: {
    title: "Mapa de Fragancias Masculinas",
    quadrants: [
      { title: "Ligero / Fresco", groups: [
        { name: "Cítrico Fresco", colors: ["c-citrico"], codes: ["H-26", "Q 55"] },
        { name: "Cítrico Aromático", colors: ["c-citrico", "c-aromatico"], codes: ["Q 53"] },
        { name: "Fougère Fresco", colors: ["c-fougere"], codes: ["H-01"] },
        { name: "Fougère Frutal", colors: ["c-fougere", "c-frutal"], codes: ["H-07"] },
        { name: "Fougère Aromático", colors: ["c-fougere", "c-aromatico"], codes: ["H-02", "H-04", "H-11", "H-13", "H-44", "H-15"] }
      ] },
      { title: "Ligero / Cálido", groups: [
        { name: "Maderoso Frutal", colors: ["c-maderoso", "c-frutal"], codes: ["H-06", "H-27", "H-34"] },
        { name: "Maderoso Verde", colors: ["c-maderoso", "c-verde"], codes: ["H-14"] },
        { name: "Maderoso Floral", colors: ["c-maderoso", "c-floral"], codes: ["H-19", "H-35"] },
        { name: "Maderoso Aromático", colors: ["c-maderoso", "c-aromatico"], codes: ["H-05", "H-08", "H-09", "H-10", "H-21", "H-30", "Q 51", "Q 56"] }
      ] },
      { title: "Intenso / Fresco", groups: [
        { name: "Maderoso Cítrico", colors: ["c-maderoso", "c-citrico"], codes: ["H-20", "H-22", "H-37", "H-41"] },
        { name: "Chypre Frutal", colors: ["c-chypre", "c-frutal"], codes: ["Q 54"] },
        { name: "Chypre Aromático", colors: ["c-chypre", "c-aromatico"], codes: ["H-03"] },
        { name: "Chypre Maderoso", colors: ["c-chypre", "c-maderoso"], codes: ["H-12"] },
        { name: "Fougère Maderoso", colors: ["c-fougere", "c-maderoso"], codes: ["H-18", "H-31", "H-32"] }
      ] },
      { title: "Intenso / Cálido", groups: [
        { name: "Cuero", colors: ["c-cuero"], codes: ["Q 52"] },
        { name: "Oriental Frutal", colors: ["c-oriental", "c-frutal"], codes: ["H-16", "H-17", "H-29", "H-39", "Q 57"] },
        { name: "Fougère Oriental", colors: ["c-fougere", "c-oriental"], codes: ["H-33", "H-36", "H-38", "H-40", "H-45"] },
        { name: "Oriental Especiado", colors: ["c-oriental", "c-especiado"], codes: ["H-43", "Q 58"] },
        { name: "Oriental Maderoso", colors: ["c-oriental", "c-maderoso"], codes: ["H-23", "H-24", "H-25", "H-28", "H-42"] },
        { name: "Oriental Vainilla", colors: ["c-oriental", "c-frutal"], codes: ["Q 59"] }
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
let otherPresentationVisible = {};
const maleAromaImageBase = "img/Fragancias%20Masculinas/Inspiraci%C3%B3n%20visual%20por%20aroma";
const malePresentationImageBase = "img/Fragancias%20Masculinas/Presentaci%C3%B3n%20general";
const malePresentationImages = {
  "100ml": "perfume-parfums-d-parfums-hombre-100ml-eau-de-toilette-essenciel.webp",
  "50ml": "perfume-parfums-d-parfums-hombre-50ml-eau-de-toilette-essenciel.webp",
  "20ml": "perfume-parfums-d-parfums-hombre-20ml-eau-de-toilette-essenciel.webp"
};
const femaleAromaImageBase = "img/Fragancias%20Femeninas/Inspiraci%C3%B3n%20visual%20por%20aroma";
const femalePresentationImageBase = "img/Fragancias%20Femeninas/Presentaci%C3%B3n%20general";
const femalePresentationImages = {
  "100ml": "perfume-parfums-d-parfums-mujer-100ml-eau-de-toilette-essenciel.webp",
  "50ml": "perfume-parfums-d-parfums-mujer-50ml-eau-de-toilette-essenciel.webp",
  "20ml": "perfume-parfums-d-parfums-mujer-20ml-eau-de-toilette-essenciel.webp"
};
const missingImageSrc = "img/no-img/no-encontrado.webp";

function getAromaImagePath(product) {
  const code = product.code.split("/")[0].trim();
  const normalizedCode = code.replace(/\s+/g, "").toUpperCase();

  if (product.cat === "hombre") {
    return `${maleAromaImageBase}/${code}/parfums_${code.replace("-", "")}.webp`;
  }
  if (product.cat === "mujer") {
    const femaleCode = code.split("/")[0].trim();
    return `${femaleAromaImageBase}/${femaleCode}/parfums_${femaleCode.replace("-", "").toLowerCase()}.webp`;
  }
  if (product.cat === "red-black") {
    const number = normalizedCode.slice(1);
    const folder = product.badge === "BLACK" ? "Black%20parfums" : "Red%20parfums";
    return `img/${folder}/Inspiraci%C3%B3n%20visual%20por%20aroma/Q-${number}/parfums_${normalizedCode.toLowerCase()}.webp`;
  }
  if (product.cat === "teen") {
    const number = normalizedCode.slice(1);
    const folder = Number(number) <= 6 ? "girl" : "boy";
    return `img/teen/${folder}/Inspiraci%C3%B3n%20visual%20por%20aroma/J-${number}/parfums_${normalizedCode.toLowerCase()}.webp`;
  }
  if (product.cat === "colonia-h" || product.cat === "colonia-m") {
    const number = normalizedCode.slice(1);
    const folder = product.cat === "colonia-h" ? "Colonias%20Hombre" : "colonias%20mujer";
    return `img/${folder}/Inspiraci%C3%B3n%20visual%20por%20aroma/S-${number}/parfums_${normalizedCode.toLowerCase()}.webp`;
  }
  if (product.cat === "splash") {
    return "img/colonia%20splash/Inspiraci%C3%B3n%20visual%20por%20aroma/B-101/parfums_b101.webp";
  }
  return "";
}

function getPresentationImage(product) {
  if (product.cat === "red-black") {
    return product.badge === "BLACK"
      ? { src: "img/Black%20parfums/Presentaci%C3%B3n%20general/black-parfums-empaque.webp", alt: "Envase y empaque Black Parfums" }
      : { src: "img/Red%20parfums/Presentaci%C3%B3n%20general/red-parfums-empaque.webp", alt: "Envase y empaque Red Parfums" };
  }
  if (product.cat === "teen") {
    if (/^J0[0-6]$/.test(product.code)) {
      return { src: `img/teen/girl/Presentaci%C3%B3n%20general/${product.code.replace("J", "J-")}.webp`, alt: `Perfume ${product.name} de la línea Teen` };
    }
    if (/^J0[7-9]$/.test(product.code)) {
      return { src: "img/teen/boy/Presentaci%C3%B3n%20general/teen-boy.webp", alt: "Empaque de la línea Teen masculina" };
    }
    return null;
  }
  if (product.cat === "hombre") {
    const size = selectedSizes[product.id] || "100ml";
    return { src: `${malePresentationImageBase}/${malePresentationImages[size]}`, alt: `Presentación general de ${size} para la línea masculina` };
  }
  if (product.cat === "mujer") {
    const size = selectedSizes[product.id] || "100ml";
    return { src: `${femalePresentationImageBase}/${femalePresentationImages[size]}`, alt: `Presentación general de ${size} para la línea femenina` };
  }
  if (product.cat === "colonia-h") {
    return { src: "img/Colonias%20Hombre/Presentaci%C3%B3n%20general/colonia-parfums-d-parfums-hombre-400ml-eau-de-cologne-essenciel.webp", alt: "Envase de colonia masculina de 400 ml" };
  }
  if (product.cat === "colonia-m") {
    return { src: "img/colonias%20mujer/Presentaci%C3%B3n%20general/colonia-parfums-d-parfums-mujer-400ml-eau-de-cologne-essenciel.webp", alt: "Envase de colonia femenina de 400 ml" };
  }
  if (product.cat === "splash") {
    return { src: "img/colonia%20splash/Presentaci%C3%B3n%20general/colonia-splash-parfums-b101-500ml.webp", alt: "Envase de colonia Splash de 500 ml" };
  }
  if (product.cat === "crema") {
    const code = (product.code || "").toUpperCase().replace(/\s+/g, "");
    if (code.includes("T-03") || code.includes("T03")) {
      return { src: "img/cremas/Presentaci%C3%B3n%20general/crema-perfection-t03-50ml.webp", alt: "Crema Perfection Essien 50 ml" };
    }
    if (code.includes("T-04") || code.includes("T04")) {
      return { src: "img/cremas/Presentaci%C3%B3n%20general/crema-propoleo-t04-50ml.webp", alt: "Crema de Propóleo Essien 50 ml" };
    }
    return { src: "img/cremas/Presentaci%C3%B3n%20general/crema-perfection-t03-50ml.webp", alt: "Crema y tratamiento facial 50 ml" };
  }
  return null;
}

function isPresentationVisible(product) {
  if (product.cat === "hombre") return Boolean(malePresentationVisible[product.id]);
  if (product.cat === "mujer") return Boolean(femalePresentationVisible[product.id]);
  return Boolean(otherPresentationVisible[product.id]);
}

function setPresentationVisible(product, visible) {
  if (product.cat === "hombre") malePresentationVisible[product.id] = visible;
  else if (product.cat === "mujer") femalePresentationVisible[product.id] = visible;
  else otherPresentationVisible[product.id] = visible;
}

function updateImageToggleButton(card, visible) {
  const button = card.querySelector(".aroma-image-btn");
  if (!button) return;
  const label = visible ? "Ver aroma" : "Ver frasco";
  button.textContent = label;
  button.setAttribute("aria-label", label);
  button.title = label;
}

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
  const targetProducts = products.filter(product => product.cat === gender || product.cat === "red-black");
  return targetProducts.find(product =>
    normalizeProductCode(product.code.split("/")[0]) === normalizedCode || getProductCodeVariants(product.code).includes(normalizedCode)
  ) || products.find(product =>
    normalizeProductCode(product.code.split("/")[0]) === normalizedCode || getProductCodeVariants(product.code).includes(normalizedCode)
  );
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
function buildProductCard(p, rankNumber) {
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
        <div class="size-option ${currentSize === '100ml' ? 'active' : ''}" data-action="select-size" data-product-id="${p.id}" data-size="100ml">100 ml</div>
        <div class="size-option ${currentSize === '50ml' ? 'active' : ''}" data-action="select-size" data-product-id="${p.id}" data-size="50ml">50 ml</div>
        <div class="size-option ${currentSize === '20ml' ? 'active' : ''}" data-action="select-size" data-product-id="${p.id}" data-size="20ml">20 ml</div>
      </div>
    `;
  }

  const categoryBadge = categoryMeta[p.cat]?.badge || "";
  const productBadge = p.cat === "teen" ? categoryBadge : p.badge;

  let rankBadgeHtml = "";
  if (typeof rankNumber === "number" && rankNumber >= 1 && rankNumber <= 4) {
    const rankIcons = ["🥇", "🥈", "🥉", "⭐"];
    rankBadgeHtml = `<span class="card-badge badge-rank-top rank-${rankNumber}">${rankIcons[rankNumber - 1]} #${rankNumber} Más Vendido</span>`;
  }

  const presentationVisible = isPresentationVisible(p);
  const presentationImage = getPresentationImage(p);
  const aromaImagePath = getAromaImagePath(p);
  const presentationSize = presentationVisible && (p.cat === "hombre" || p.cat === "mujer")
    ? selectedSizes[p.id] || "100ml"
    : "";
  const productImage = !presentationVisible && aromaImagePath
    ? { src: aromaImagePath, alt: `Imagen de inspiración olfativa para ${p.name}` }
    : presentationImage;
  const view = addButtonView(p.id);
  const aromaImageButton = aromaImagePath && presentationImage
    ? `<button class="aroma-image-btn" type="button" data-action="toggle-product-image" data-product-id="${p.id}" aria-label="${presentationVisible ? "Ver aroma" : "Ver frasco"}" title="${presentationVisible ? "Ver aroma" : "Ver frasco"}">${presentationVisible ? "Ver aroma" : "Ver frasco"}</button>`
    : "";

  return `
      <div class="card${p.cat === "hombre" ? " card-male" : p.cat === "mujer" ? " card-female" : ""}" data-product-card="${p.id}">
      <div>
        <div class="card-top">
          <div class="card-identity">
            <span class="card-code">${p.code}</span>
            ${dotsHtml}
          </div>
          <div class="card-badges-group">
            ${rankBadgeHtml}
            ${productBadge ? `<span class="card-badge ${badgeClass}">${productBadge}</span>` : `<span class="card-badge badge-std">${categoryBadge}</span>`}
          </div>
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
          <button class="add-btn${view.added ? " is-added" : ""}" data-action="add-to-cart" data-product-id="${p.id}">
            ${view.html}
          </button>
        </div>
      </div>
    </div>
  `;
}

// ==========================================================================
// SECCIÓN DINÁMICA: LOS MÁS COMPRADOS (Top 4 fragancias basadas en ventas)
// ==========================================================================
let topSellingProducts = [];
let isRefreshingTopSellers = false;

function findProductForSale(saleItem, allProducts) {
  if (!allProducts || allProducts.length === 0) return null;

  const rawCode = (saleItem.code || "").trim();
  const rawName = (saleItem.name || saleItem.fragrance || "").trim();

  // 1. Coincidencia por código
  if (rawCode && rawCode !== "-") {
    const normCode = normalizeProductCode(rawCode);
    if (normCode) {
      const matchByCode = allProducts.find(p => {
        const pNorm = normalizeProductCode(p.code.split("/")[0]);
        return pNorm === normCode || getProductCodeVariants(p.code).includes(normCode);
      });
      if (matchByCode) return matchByCode;
    }
  }

  // 2. Coincidencia por nombre normalizado
  if (rawName) {
    const normName = normalizeSearchText(rawName);
    if (normName) {
      const matchExact = allProducts.find(p => normalizeSearchText(p.name) === normName);
      if (matchExact) return matchExact;

      const matchIncludes = allProducts.find(p => {
        const pNorm = normalizeSearchText(p.name);
        return pNorm && (pNorm.includes(normName) || normName.includes(pNorm));
      });
      if (matchIncludes) return matchIncludes;
    }
  }

  return null;
}

function computeTopSellingProducts(sales, catalogProducts, limit = 4) {
  if (!Array.isArray(catalogProducts) || catalogProducts.length === 0) return [];

  const scores = new Map();

  (sales || []).forEach(sale => {
    const estadoGeneral = (sale.estado || "").toLowerCase().trim();
    if (estadoGeneral === "cancelado") return;

    const items = Array.isArray(sale.items) && sale.items.length > 0
      ? sale.items
      : [{
          code: sale.codigo || sale.code || "",
          name: sale.fragancia || sale.name || "",
          qty: sale.cantidad || sale.qty || 1,
          estado: sale.estado || ""
        }];

    items.forEach(item => {
      const itemEstado = (item.estado || estadoGeneral).toLowerCase().trim();
      if (itemEstado === "cancelado") return;

      const qty = Number(item.qty) || 1;
      const matched = findProductForSale(item, catalogProducts);
      if (matched) {
        scores.set(matched.id, (scores.get(matched.id) || 0) + qty);
      }
    });
  });

  // Ordenar productos que tienen ventas registradas de mayor a menor
  const sorted = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => catalogProducts.find(p => p.id === id))
    .filter(Boolean);

  const result = [...sorted];

  // Si hay menos de `limit` productos con ventas, completar con los más icónicos y pedidos
  if (result.length < limit) {
    const popularFallbacks = ["Santal 33", "Sauvage", "Baccarat Rouge", "Club de Nuit", "Aventus", "Eros", "Light Blue", "La Vida es Bella"];
    for (const pop of popularFallbacks) {
      if (result.length >= limit) break;
      const found = catalogProducts.find(p =>
        !result.some(r => r.id === p.id) &&
        normalizeSearchText(p.name).includes(normalizeSearchText(pop))
      );
      if (found) result.push(found);
    }

    for (const p of catalogProducts) {
      if (result.length >= limit) break;
      if (!result.some(r => r.id === p.id)) {
        result.push(p);
      }
    }
  }

  return result.slice(0, limit);
}

function initTopSellingProducts() {
  if (!products || products.length === 0) return;

  // 1. Cargar desde localStorage si ya existe para render inmediato
  try {
    const cached = localStorage.getItem("notes_top_sellers_cache");
    if (cached) {
      const cachedIds = JSON.parse(cached);
      if (Array.isArray(cachedIds) && cachedIds.length >= 4) {
        const matched = cachedIds
          .map(id => products.find(p => p.id === id || p.code === id))
          .filter(Boolean);
        if (matched.length >= 4) {
          topSellingProducts = matched.slice(0, 4);
        }
      }
    }
  } catch (e) {}

  // 2. Si no hay suficientes en caché, calcular los 4 predeterminados
  if (topSellingProducts.length < 4) {
    topSellingProducts = computeTopSellingProducts([], products, 4);
  }

  // 3. Sincronizar con Firestore en segundo plano
  refreshTopSellingProducts();
}

async function refreshTopSellingProducts() {
  if (isRefreshingTopSellers) return;
  isRefreshingTopSellers = true;

  try {
    let sales = [];
    if (typeof window.getSalesHistory === "function") {
      sales = await window.getSalesHistory();
    }
    if (Array.isArray(sales) && sales.length > 0 && products.length > 0) {
      const newTop = computeTopSellingProducts(sales, products, 4);
      if (newTop.length > 0) {
        const currentIds = topSellingProducts.map(p => p.id).join(",");
        const newIds = newTop.map(p => p.id).join(",");
        topSellingProducts = newTop;
        try {
          localStorage.setItem("notes_top_sellers_cache", JSON.stringify(newTop.map(p => p.id)));
        } catch (e) {}
        if (currentIds !== newIds && currentCategory === "all") {
          renderProducts();
        }
      }
    }
  } catch (err) {
    console.warn("Aviso al refrescar top 4 más vendidos:", err);
  } finally {
    isRefreshingTopSellers = false;
  }
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
    // 1. SECCIÓN DESTACADA: LOS MÁS COMPRADOS (Top 4 fragancias basadas en gráficos y ventas reales)
    if (topSellingProducts && topSellingProducts.length > 0) {
      appendCategoryHeading(container, "mas-comprados");
      topSellingProducts.forEach((p, idx) => {
        container.insertAdjacentHTML("beforeend", buildProductCard(p, idx + 1));
      });
      appendCategoryDisclaimer(container);
    }

    const order = ["red-black", "mujer", "hombre", "teen", "colonia-m", "colonia-h", "splash", "crema"];
    
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
  const cards = document.querySelectorAll(`[data-product-card="${productId}"]`);
  if (!product || cards.length === 0) {
    renderProducts();
    return;
  }

  cards.forEach(card => {
    card.querySelectorAll(".size-option").forEach(option => {
      option.classList.toggle("active", option.dataset.size === size);
    });

    const priceTag = card.querySelector(".price-tag");
    if (priceTag) priceTag.textContent = `$${standardPrices[size].toLocaleString("es-CL")}`;

    if (product.cat === "mujer") {
      updateImageToggleButton(card, true);

      const imageName = femalePresentationImages[size];
      if (imageName) {
        updateCardImage(card.querySelector(".card-product-image"), {
          src: `${femalePresentationImageBase}/${imageName}`,
          alt: `Presentación general de ${size} para la línea femenina`,
          size
        });
      }
    } else if (product.cat === "hombre") {
      updateImageToggleButton(card, true);

      const imageName = malePresentationImages[size];
      if (imageName) {
        updateCardImage(card.querySelector(".card-product-image"), {
          src: `${malePresentationImageBase}/${imageName}`,
          alt: `Presentación general de ${size} para la línea masculina`,
          size
        });
      }
    }
  });
}

function toggleProductImage(productId) {
  const product = products.find(item => item.id === productId);
  const cards = document.querySelectorAll(`[data-product-card="${productId}"]`);
  if (!product || cards.length === 0) return;

  const showPresentation = !isPresentationVisible(product);
  const nextImage = showPresentation
    ? getPresentationImage(product)
    : { src: getAromaImagePath(product), alt: `Imagen de inspiración olfativa para ${product.name}` };
  if (!nextImage?.src) return;

  setPresentationVisible(product, showPresentation);

  cards.forEach(card => {
    updateImageToggleButton(card, showPresentation);

    updateCardImage(card.querySelector(".card-product-image"), {
      src: nextImage.src,
      alt: nextImage.alt,
      size: showPresentation && (product.cat === "hombre" || product.cat === "mujer")
        ? selectedSizes[product.id] || "100ml"
        : undefined
    });
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

  refreshAddButtons();

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
  initCustomerMemory();
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

// Validación de los 8 dígitos del número de teléfono (+56 9 ya prefijado)
function isValidRealPhoneNumber(phoneStr) {
  if (!phoneStr) return false;
  const digits = phoneStr.replace(/\D/g, "");

  // Deben ser exactamente los 8 dígitos móviles tras el +56 9
  if (digits.length !== 8) return false;

  // Rechazar números con todos los dígitos idénticos (ej. 00000000, 11111111, 99999999)
  if (/^(\d)\1+$/.test(digits)) return false;

  // Rechazar secuencias ficticias que sean el número completo
  const fakeExact = ["12345678", "87654321", "01234567", "01234568", "23456789", "98765432"];
  if (fakeExact.includes(digits)) return false;

  return true;
}

// Envío a WhatsApp
function sendToWhatsApp() {
  if (cart.length === 0) return;

  const customerNameInput = document.getElementById("customerName");
  const customerNameError = document.getElementById("customerNameError");
  const customerName = customerNameInput.value.trim().replace(/\s+/g, " ");
  const nameParts = customerName.split(" ").filter(Boolean);

  // Validación de nombre y apellido: al menos 2 palabras, mínimo 2 letras por palabra, sin números
  const isValidName = nameParts.length >= 2 &&
    nameParts.every(part => part.length >= 2) &&
    !/\d/.test(customerName) &&
    /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'\-]+$/.test(customerName);

  if (!isValidName) {
    customerNameInput.setAttribute("aria-invalid", "true");
    if (customerNameError) {
      customerNameError.textContent = "Ingresa tu nombre y apellido (ej. Ana Pérez).";
      customerNameError.hidden = false;
    }
    customerNameInput.focus();
    return;
  }
  customerNameInput.removeAttribute("aria-invalid");
  if (customerNameError) customerNameError.hidden = true;

  const customerPhoneInput = document.getElementById("customerPhone");
  const customerPhoneError = document.getElementById("customerPhoneError");
  const customerPhone = customerPhoneInput ? customerPhoneInput.value.trim() : "";
  const phoneGroup = customerPhoneInput ? customerPhoneInput.closest(".phone-input-group") : null;
  const phoneDigits = customerPhone.replace(/\D/g, "");

  // Validación de número de teléfono real (los 8 dígitos)
  if (!isValidRealPhoneNumber(customerPhone)) {
    if (customerPhoneInput) {
      customerPhoneInput.setAttribute("aria-invalid", "true");
      customerPhoneInput.focus();
    }
    if (phoneGroup) phoneGroup.setAttribute("aria-invalid", "true");
    if (customerPhoneError) {
      if (phoneDigits.length !== 8) {
        customerPhoneError.textContent = "Ingresa los 8 dígitos de tu número de teléfono (ej. 1234 5678).";
      } else {
        customerPhoneError.textContent = "Ingresa un número de teléfono real y válido.";
      }
      customerPhoneError.hidden = false;
    }
    return;
  }
  if (customerPhoneInput) customerPhoneInput.removeAttribute("aria-invalid");
  if (phoneGroup) phoneGroup.removeAttribute("aria-invalid");
  if (customerPhoneError) customerPhoneError.hidden = true;

  const fullPhoneNumber = `+56 9 ${phoneDigits.slice(0, 4)} ${phoneDigits.slice(4)}`;

  // Actualizar memoria si el checkbox está activo (guardar datos en el navegador si quiere)
  const rememberCheckbox = document.getElementById("rememberCustomerData");
  if (rememberCheckbox && rememberCheckbox.checked) {
    localStorage.setItem("notes_remember_customer", "true");
    localStorage.setItem("notes_customer_name", customerName);
    localStorage.setItem("notes_customer_phone", phoneDigits.length > 4 ? phoneDigits.slice(0, 4) + " " + phoneDigits.slice(4) : phoneDigits);
  } else {
    localStorage.setItem("notes_remember_customer", "false");
    localStorage.removeItem("notes_customer_name");
    localStorage.removeItem("notes_customer_phone");
  }

  // Feedback visual en el botón de enviar
  const sendBtn = document.querySelector('[data-action="send-whatsapp"]');
  if (sendBtn) {
    const originalContent = sendBtn.innerHTML;
    sendBtn.innerHTML = `<i data-lucide="check" aria-hidden="true"></i> ¡Pedido validado!`;
    sendBtn.disabled = true;
    renderLucideIcons();
    setTimeout(() => {
      sendBtn.innerHTML = originalContent;
      sendBtn.disabled = false;
      renderLucideIcons();
    }, 2500);
  }
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

// Globo de ayuda (cambios y cancelaciones)
function setHelpOpen(open) {
  document.getElementById("helpBubble").hidden = !open;
  document.getElementById("helpFab").setAttribute("aria-expanded", String(open));
}

const changeActionLabels = { keep: "Se mantiene", change: "Cambiar", cancel: "Cancelar" };
let changeFlow = null;

// Estado de los botones "Agregar" de las tarjetas según el modo activo
function addButtonView(productId) {
  if (changeFlow) {
    if (changeFlow.pickFor) return { added: false, html: "Elegir este" };
    const count = changeFlow.items.filter(item => item.id === productId).reduce((sum, item) => sum + item.qty, 0);
    return { added: count > 0, html: count > 0 ? `Lo pedí (${count})` : "Lo pedí" };
  }
  const added = cart.some(item => item.id === productId);
  return { added, html: added ? "Agregado" : '<span class="add-btn-plus">+</span> Agregar' };
}

function refreshAddButtons() {
  document.querySelectorAll(".card[data-product-card]").forEach(card => {
    const addButton = card.querySelector(".add-btn");
    if (!addButton) return;
    const view = addButtonView(card.dataset.productCard);
    addButton.classList.toggle("is-added", view.added);
    addButton.innerHTML = view.html;
  });
}

function renderChangeBar() {
  const bar = document.getElementById("changeBar");
  bar.hidden = !changeFlow;
  document.body.classList.toggle("change-mode", Boolean(changeFlow));
  if (!changeFlow) return;

  const text = document.getElementById("changeBarText");
  const next = document.getElementById("changeBarNext");
  const picking = Boolean(changeFlow.pickFor);
  const total = changeFlow.items.reduce((sum, item) => sum + item.qty, 0);

  if (picking) {
    const target = changeFlow.units.find(unit => unit.uid === changeFlow.pickFor);
    text.textContent = `Elige en el catálogo el perfume nuevo para [${target.code}] ${target.name}`;
    next.textContent = "Volver";
    next.disabled = false;
  } else {
    text.textContent = total === 0
      ? "Cambio o cancelación: toca «Lo pedí» en los perfumes que pediste"
      : `Cambio o cancelación: ${total} ${total === 1 ? "perfume marcado" : "perfumes marcados"}`;
    next.textContent = "Continuar";
    next.disabled = total === 0;
  }
}

function openChangeFlow() {
  setHelpOpen(false);
  closeCartModal();
  changeFlow = { step: 2, items: [], units: [], name: "", pickFor: null, nextUid: 1 };
  renderChangeBar();
  refreshAddButtons();
}

// Cierra el asistente por completo y vuelve al catálogo normal
function exitChangeFlow() {
  document.getElementById("changeOverlay").hidden = true;
  changeFlow = null;
  renderChangeBar();
  refreshAddButtons();
  updateCartBar();
}

// Oculta el panel y deja al cliente mirando el catálogo sin perder lo marcado
function showCatalogForChange() {
  document.getElementById("changeOverlay").hidden = true;
  renderChangeBar();
  refreshAddButtons();
}

// Cada unidad pedida tiene su propia decisión (mantener, cambiar o cancelar)
function syncChangeUnits() {
  const previous = changeFlow.units;
  changeFlow.units = changeFlow.items.flatMap(item => {
    const existing = previous.filter(unit => unit.itemKey === item.itemKey).slice(0, item.qty);
    const created = Array.from({ length: item.qty - existing.length }, () => ({
      uid: changeFlow.nextUid++,
      itemKey: item.itemKey,
      id: item.id,
      code: item.code,
      name: item.name,
      size: item.size,
      action: "keep",
      replacement: ""
    }));
    return [...existing, ...created];
  });
}

function openChangeReview(step) {
  changeFlow.pickFor = null;
  changeFlow.step = step;
  syncChangeUnits();
  renderChangeBar();
  refreshAddButtons();
  renderChangeFlow();
  document.getElementById("changeOverlay").hidden = false;
  document.getElementById("changeBody").scrollTop = 0;
}

function handleChangeCatalogTap(productId) {
  const p = products.find(item => item.id === productId);
  if (!p) return;
  const size = p.tiered ? (selectedSizes[productId] || "100ml") : p.fixedSize;
  if (p.tiered && !selectedSizes[productId]) selectSize(productId, size);

  if (changeFlow.pickFor) {
    const target = changeFlow.units.find(unit => unit.uid === changeFlow.pickFor);
    if (target) target.replacement = `[${p.code}] ${p.name} (${size})`;
    openChangeReview(2);
    return;
  }

  const itemKey = `${p.id}_${size}`;
  const existing = changeFlow.items.find(item => item.itemKey === itemKey);
  if (existing) {
    existing.qty += 1;
  } else {
    changeFlow.items.push({ itemKey, id: p.id, code: p.code, name: p.name, size, qty: 1 });
  }
  renderChangeBar();
  refreshAddButtons();
}

function startPickReplacement(uid) {
  changeFlow.pickFor = uid;
  document.getElementById("changeOverlay").hidden = true;
  renderChangeBar();
  refreshAddButtons();
}

function changeUnitLine(unit, position, total) {
  return `<div class="cart-item-name">[${escapeHTML(unit.code)}] ${escapeHTML(unit.name)}</div>
    <div class="cart-item-meta">Tamaño: ${escapeHTML(unit.size)}${total > 1 ? ` | Unidad ${position} de ${total}` : ""}</div>`;
}

// Posición de cada unidad dentro de las de su mismo producto y tamaño
function unitPositions() {
  const counters = {};
  const totals = {};
  changeFlow.units.forEach(unit => { totals[unit.itemKey] = (totals[unit.itemKey] || 0) + 1; });
  return changeFlow.units.map(unit => {
    counters[unit.itemKey] = (counters[unit.itemKey] || 0) + 1;
    return { unit, position: counters[unit.itemKey], total: totals[unit.itemKey] };
  });
}

function changeCanContinue() {
  const { units } = changeFlow;
  return units.some(unit => unit.action !== "keep") &&
    units.every(unit => unit.action !== "change" || unit.replacement);
}

function renderChangeFlow() {
  const body = document.getElementById("changeBody");
  const label = document.getElementById("changeStepLabel");
  const { step } = changeFlow;

  if (step === 2) {
    label.textContent = "Paso 1 de 2 · ¿Qué quieres hacer con cada perfume?";
    body.innerHTML = `
      <button type="button" class="change-cancel-all-btn" data-action="change-cancel-all">Cancelar todo el pedido</button>
      ${unitPositions().map(({ unit, position, total }) => `
        <div class="change-item-card">
          <div class="change-item-head">
            <div class="cart-item-info">${changeUnitLine(unit, position, total)}</div>
            <button class="delete-item-btn" data-action="change-remove-unit" data-uid="${unit.uid}" aria-label="Quitar de la lista, no lo pedí" title="Quitar de la lista, no lo pedí"><i data-lucide="trash-2" aria-hidden="true"></i></button>
          </div>
          <div class="change-choice-row">
            ${["keep", "change", "cancel"].map(value => `
              <button type="button" class="change-choice${unit.action === value ? " is-active" : ""}" data-action="change-set-action" data-uid="${unit.uid}" data-value="${value}" aria-pressed="${unit.action === value}">${changeActionLabels[value]}</button>`).join("")}
          </div>
          ${unit.action === "change" ? `
            <div class="change-replacement${unit.replacement ? "" : " is-empty"}">${unit.replacement ? `Nuevo: ${escapeHTML(unit.replacement)}` : "Aún no elegiste el perfume nuevo"}</div>
            <button type="button" class="change-pick-btn" data-action="change-pick" data-uid="${unit.uid}">${unit.replacement ? "Elegir otro en el catálogo" : "Elegir el nuevo en el catálogo"}</button>` : ""}
        </div>`).join("")}`;
  } else {
    label.textContent = "Paso 2 de 2 · Revisa y envía tu solicitud";
    const affected = unitPositions().filter(({ unit }) => unit.action !== "keep");
    const kept = changeFlow.units.filter(unit => unit.action === "keep");
    body.innerHTML = `
      <div class="cart-items-list change-review">
        ${affected.map(({ unit, position, total }) => `
          <div class="cart-item-row">
            <div class="cart-item-info">
              ${changeUnitLine(unit, position, total)}
              <span class="change-status ${unit.action === "change" ? "is-change" : "is-cancel"}">${changeActionLabels[unit.action]}</span>
              ${unit.action === "change" ? `<div class="cart-item-meta">Por: ${escapeHTML(unit.replacement)}</div>` : ""}
            </div>
          </div>`).join("")}
      </div>
      ${kept.length ? `<p class="change-kept-note">Se mantienen sin cambios: ${[...new Set(kept.map(unit => `[${unit.code}] ${unit.name}`))].map(escapeHTML).join(", ")}.</p>` : ""}
      <div class="customer-name-field">
        <label for="changeName">Nombre y apellido</label>
        <input id="changeName" type="text" maxlength="80" autocomplete="name" aria-describedby="changeNameError" placeholder="Ej. Ana Pérez" value="${escapeAttr(changeFlow.name)}" required>
        <p id="changeNameError" class="customer-name-error" role="alert" hidden>Escribe tu nombre y apellido para continuar.</p>
      </div>`;
  }

  renderChangeFooter();
  renderLucideIcons();
}

function renderChangeFooter() {
  const footer = document.getElementById("changeFooter");
  const { step } = changeFlow;
  const canContinue = changeCanContinue();

  if (step === 2) {
    footer.innerHTML = `<div class="cart-actions-row">
      <button class="change-back-btn" data-action="change-to-catalog">Seguir en el catálogo</button>
      <button class="whatsapp-send-btn is-next" data-action="change-next" ${canContinue ? "" : "disabled"}>Continuar</button></div>`;
  } else {
    footer.innerHTML = `<div class="cart-actions-row">
      <button class="change-back-btn" data-action="change-back">Atrás</button>
      <button class="whatsapp-send-btn" data-action="send-change"><i data-lucide="message-circle" aria-hidden="true"></i>Enviar por WhatsApp</button></div>`;
  }
}

function removeChangeUnit(uid) {
  const unit = changeFlow.units.find(entry => entry.uid === uid);
  if (!unit) return;
  const item = changeFlow.items.find(entry => entry.itemKey === unit.itemKey);
  changeFlow.units = changeFlow.units.filter(entry => entry !== unit);
  if (item) {
    item.qty -= 1;
    if (item.qty <= 0) changeFlow.items = changeFlow.items.filter(entry => entry !== item);
  }
  if (changeFlow.units.length === 0) {
    showCatalogForChange();
    return;
  }
  renderChangeFlow();
}

function setChangeAction(uid, value) {
  const unit = changeFlow.units.find(entry => entry.uid === uid);
  if (!unit) return;
  unit.action = value;
  if (value !== "change") unit.replacement = "";
  renderChangeFlow();
}

function goToChangeStep(step) {
  changeFlow.step = step;
  renderChangeFlow();
  document.getElementById("changeBody").scrollTop = 0;
}

function sendChangeToWhatsApp() {
  const nameInput = document.getElementById("changeName");
  const nameError = document.getElementById("changeNameError");
  const name = nameInput.value.trim().replace(/\s+/g, " ");
  changeFlow.name = name;
  if (name.split(" ").filter(Boolean).length < 2) {
    nameInput.setAttribute("aria-invalid", "true");
    nameError.hidden = false;
    nameInput.focus();
    return;
  }
  nameInput.removeAttribute("aria-invalid");
  nameError.hidden = true;

  performChangeSend();
}

function performChangeSend() {
  if (!changeFlow) return;
  const name = changeFlow.name;
  const { units } = changeFlow;
  const hasChange = units.some(unit => unit.action === "change");
  const hasCancel = units.some(unit => unit.action === "cancel");
  const allCancel = units.every(unit => unit.action === "cancel");
  let request;
  if (allCancel) request = "cancelar este pedido";
  else if (hasChange && hasCancel) request = "cambiar y cancelar parte de este pedido";
  else if (hasChange) request = "cambiar este pedido";
  else request = "cancelar parte de este pedido";

  // Une unidades idénticas para que el mensaje quede corto
  const lines = [];
  units.forEach(unit => {
    const key = `${unit.itemKey}|${unit.action}|${unit.replacement}`;
    const line = lines.find(entry => entry.key === key);
    if (line) line.qty += 1;
    else lines.push({ key, unit, qty: 1 });
  });

  let msg = `¡Hola! Soy ${name} y quiero ${request}:\n\n`;
  lines.forEach(({ unit, qty }, index) => {
    let status = "se mantiene";
    if (unit.action === "cancel") status = "CANCELAR";
    if (unit.action === "change") status = `CAMBIAR por: ${unit.replacement}`;
    msg += `${index + 1}. [${unit.code}] ${unit.name} (${unit.size}) x${qty} → ${status}\n`;
  });

  exitChangeFlow();
  // Envío a WhatsApp desactivado temporalmente para pruebas visuales y rediseño de estructura
}

const changeOverlay = document.getElementById("changeOverlay");

changeOverlay.addEventListener("input", event => {
  if (!changeFlow) return;
  if (event.target.id === "changeName") {
    event.target.removeAttribute("aria-invalid");
    document.getElementById("changeNameError").hidden = true;
  }
});

document.addEventListener("click", event => {
  if (!event.target.closest("#helpWrap")) setHelpOpen(false);
});

// Event Delegation táctil
document.addEventListener("error", event => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !image.dataset.fallbackSrc || image.dataset.fallbackApplied) return;

  image.dataset.fallbackApplied = "true";
  image.src = image.dataset.fallbackSrc;
  image.alt = "Imagen no disponible";
}, true);

document.addEventListener("click", event => {
  // Cerrar al hacer clic en el fondo oscuro
  if (event.target && event.target.id === "cartModalOverlay") {
    closeCartModal();
    return;
  }
  if (event.target && event.target.id === "changeOverlay") {
    showCatalogForChange();
    return;
  }

  const control = event.target.closest("[data-action]");
  if (!control) return;

  switch (control.dataset.action) {
    case "open-change":
      openChangeFlow();
      break;
    case "close-change":
      showCatalogForChange();
      break;
    case "exit-change":
      exitChangeFlow();
      break;
    case "change-review":
      openChangeReview(2);
      break;
    case "change-to-catalog":
      showCatalogForChange();
      break;
    case "change-pick":
      startPickReplacement(Number(control.dataset.uid));
      break;
    case "change-remove-unit":
      removeChangeUnit(Number(control.dataset.uid));
      break;
    case "change-set-action":
      setChangeAction(Number(control.dataset.uid), control.dataset.value);
      break;
    case "change-cancel-all":
      changeFlow.units.forEach(unit => { unit.action = "cancel"; unit.replacement = ""; });
      goToChangeStep(3);
      break;
    case "change-next":
      if (!control.disabled) goToChangeStep(changeFlow.step + 1);
      break;
    case "change-back":
      goToChangeStep(changeFlow.step - 1);
      break;
    case "send-change":
      sendChangeToWhatsApp();
      break;
    case "toggle-help":
      setHelpOpen(document.getElementById("helpBubble").hidden);
      break;
    case "close-help":
      setHelpOpen(false);
      break;
    case "map-gender":
      showMapGender(control.dataset.gender);
      window.scrollTo({ top: 0, behavior: "smooth" });
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
    case "toggle-product-image":
      toggleProductImage(control.dataset.productId);
      break;
    case "add-to-cart":
      if (changeFlow) handleChangeCatalogTap(control.dataset.productId);
      else addToCart(control.dataset.productId);
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

// Cerrar modales con tecla Escape
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    setHelpOpen(false);
    closeCartModal();
    if (changeFlow && !document.getElementById("changeOverlay").hidden) showCatalogForChange();
  }
});

function resetCategoryBarScroll() {
  const categoryBar = document.getElementById("categoryBar");
  if (categoryBar) {
    categoryBar.scrollLeft = 0;
  }
}

// Píldoras de categoría
document.querySelectorAll(".pill-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".pill-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentCategory = btn.dataset.category;
    renderProducts();
    if (btn.dataset.category === "all") {
      resetCategoryBarScroll();
    } else {
      btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
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
  if (currentCategory === "all") resetCategoryBarScroll();
  input.focus();
}

window.addEventListener("resize", () => {
  const isDesktop = window.matchMedia("(min-width: 641px)").matches;
  if (currentCategory === "mapa" && isDesktop !== mapViewportMode) renderMap();
});

// Memoria de datos de cliente
function initCustomerMemory() {
  const nameInput = document.getElementById("customerName");
  const phoneInput = document.getElementById("customerPhone");
  const rememberCheck = document.getElementById("rememberCustomerData");
  if (!nameInput || !phoneInput || !rememberCheck) return;

  const rememberSaved = localStorage.getItem("notes_remember_customer");
  if (rememberSaved === "false") {
    rememberCheck.checked = false;
  } else {
    rememberCheck.checked = true;
    const savedName = localStorage.getItem("notes_customer_name");
    const savedPhone = localStorage.getItem("notes_customer_phone");
    if (savedName) nameInput.value = savedName;
    if (savedPhone) {
      let digits = savedPhone.replace(/\D/g, "");
      if (digits.startsWith("569")) digits = digits.slice(3);
      else if (digits.startsWith("56")) digits = digits.slice(2);
      else if (digits.length === 9 && digits.startsWith("9")) digits = digits.slice(1);
      digits = digits.slice(0, 8);
      phoneInput.value = digits.length > 4 ? digits.slice(0, 4) + " " + digits.slice(4) : digits;
    }
  }

  const saveIfChecked = () => {
    if (rememberCheck.checked) {
      localStorage.setItem("notes_remember_customer", "true");
      localStorage.setItem("notes_customer_name", nameInput.value.trim());
      localStorage.setItem("notes_customer_phone", phoneInput.value.trim());
    }
  };

  nameInput.addEventListener("input", saveIfChecked);

  phoneInput.addEventListener("input", event => {
    let digits = event.target.value.replace(/\D/g, "");
    if (digits.startsWith("569")) digits = digits.slice(3);
    else if (digits.startsWith("56")) digits = digits.slice(2);
    else if (digits.length === 9 && digits.startsWith("9")) digits = digits.slice(1);
    digits = digits.slice(0, 8);

    event.target.value = digits.length > 4 ? digits.slice(0, 4) + " " + digits.slice(4) : digits;

    event.currentTarget.removeAttribute("aria-invalid");
    const group = event.target.closest(".phone-input-group");
    if (group) group.removeAttribute("aria-invalid");
    const phoneErr = document.getElementById("customerPhoneError");
    if (phoneErr) phoneErr.hidden = true;

    saveIfChecked();
  });

  rememberCheck.addEventListener("change", () => {
    if (rememberCheck.checked) {
      localStorage.setItem("notes_remember_customer", "true");
      localStorage.setItem("notes_customer_name", nameInput.value.trim());
      localStorage.setItem("notes_customer_phone", phoneInput.value.trim());
    } else {
      localStorage.setItem("notes_remember_customer", "false");
      localStorage.removeItem("notes_customer_name");
      localStorage.removeItem("notes_customer_phone");
    }
  });
}

// Gestión de Tema Claro / Oscuro (Sol y Luna)
let themeInitialized = false;

function initTheme() {
  const toggleBtn = document.getElementById("themeToggleBtn");
  if (!toggleBtn) return;

  const updateToggleLabels = () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    toggleBtn.setAttribute("aria-label", isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
    toggleBtn.setAttribute("title", isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
  };

  updateToggleLabels();

  if (!themeInitialized) {
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
      renderLucideIcons();
    });
    themeInitialized = true;
  }
}

// Gestión de Autenticación de Usuarios (Firebase Auth)
let authModalInitialized = false;

function initAuthModal() {
  const btnOpenAuthModal = document.getElementById("btnOpenAuthModal");
  const authBtnLabel = document.getElementById("authBtnLabel");
  const headerSalesLink = document.getElementById("headerSalesLink");
  const authModalOverlay = document.getElementById("authModalOverlay");
  const btnCloseAuthModal = document.getElementById("btnCloseAuthModal");
  const authLoginFormView = document.getElementById("authLoginFormView");
  const authLoggedInView = document.getElementById("authLoggedInView");
  const authErrorAlert = document.getElementById("authErrorAlert");
  const authErrorMessage = document.getElementById("authErrorMessage");
  const authLoginForm = document.getElementById("authLoginForm");
  const authEmailInput = document.getElementById("authEmailInput");
  const authPasswordInput = document.getElementById("authPasswordInput");
  const btnToggleAuthPassword = document.getElementById("btnToggleAuthPassword");
  const authEyeOpen = document.getElementById("authEyeOpen");
  const authEyeClosed = document.getElementById("authEyeClosed");
  const btnSubmitAuthLogin = document.getElementById("btnSubmitAuthLogin");
  const authBtnSpinner = document.getElementById("authBtnSpinner");
  const authBtnText = document.getElementById("authBtnText");
  const authLoggedEmailDisplay = document.getElementById("authLoggedEmailDisplay");
  const btnAuthLogout = document.getElementById("btnAuthLogout");

  if (!authModalOverlay) return;

  function clearAuthError() {
    if (authErrorAlert) authErrorAlert.hidden = true;
    if (authErrorMessage) authErrorMessage.textContent = "";
  }

  function showAuthError(msg) {
    if (authErrorMessage) authErrorMessage.textContent = msg;
    if (authErrorAlert) authErrorAlert.hidden = false;
    renderLucideIcons();
  }

  function updateAuthState(user) {
    if (user && user.email) {
      // Usuario autenticado / registrado: muestra el botón de ventas y oculta el de ingreso
      if (headerSalesLink) {
        headerSalesLink.hidden = false;
      }
      if (btnOpenAuthModal) {
        btnOpenAuthModal.hidden = true;
      }
      if (authLoggedEmailDisplay) {
        authLoggedEmailDisplay.textContent = user.email;
      }
      if (authLoginFormView) authLoginFormView.hidden = true;
      if (authLoggedInView) authLoggedInView.hidden = false;
    } else {
      // Usuario no autenticado: muestra el botón de ingreso y oculta el de ventas
      if (headerSalesLink) {
        headerSalesLink.hidden = true;
      }
      if (btnOpenAuthModal) {
        btnOpenAuthModal.hidden = false;
      }
      if (authLoginFormView) authLoginFormView.hidden = false;
      if (authLoggedInView) authLoggedInView.hidden = true;
    }
    renderLucideIcons();
  }

  // Escuchar estado de autenticación en Firebase
  if (typeof window.onAuthStatusChange === "function") {
    window.onAuthStatusChange(user => {
      updateAuthState(user);
    });
  } else {
    // Si la función aún está cargándose en el módulo
    const checkInterval = setInterval(() => {
      if (typeof window.onAuthStatusChange === "function") {
        clearInterval(checkInterval);
        window.onAuthStatusChange(user => {
          updateAuthState(user);
        });
      }
    }, 150);
    setTimeout(() => clearInterval(checkInterval), 5000);
  }

  if (authModalInitialized) return;

  // Abrir Modal
  if (btnOpenAuthModal) {
    btnOpenAuthModal.addEventListener("click", () => {
      clearAuthError();
      authModalOverlay.hidden = false;
      renderLucideIcons();
      if (!authLoggedInView || authLoggedInView.hidden) {
        setTimeout(() => {
          if (authEmailInput) authEmailInput.focus();
        }, 120);
      }
    });
  }

  // Cerrar Modal
  function closeAuthModal() {
    authModalOverlay.hidden = true;
    clearAuthError();
  }

  if (btnCloseAuthModal) {
    btnCloseAuthModal.addEventListener("click", closeAuthModal);
  }

  authModalOverlay.addEventListener("click", event => {
    if (event.target === authModalOverlay) {
      closeAuthModal();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !authModalOverlay.hidden) {
      closeAuthModal();
    }
  });

  // Mostrar / Ocultar contraseña
  if (btnToggleAuthPassword && authPasswordInput) {
    btnToggleAuthPassword.addEventListener("click", () => {
      const isPass = authPasswordInput.type === "password";
      authPasswordInput.type = isPass ? "text" : "password";
      if (authEyeOpen && authEyeClosed) {
        authEyeOpen.style.display = isPass ? "none" : "";
        authEyeClosed.style.display = isPass ? "" : "none";
      }
      btnToggleAuthPassword.setAttribute("title", isPass ? "Ocultar contraseña" : "Mostrar contraseña");
      renderLucideIcons();
    });
  }

  // Enviar Formulario de Login
  if (authLoginForm) {
    authLoginForm.addEventListener("submit", async event => {
      event.preventDefault();
      clearAuthError();

      const email = (authEmailInput?.value || "").trim();
      const password = authPasswordInput?.value || "";

      if (!email || !password) {
        showAuthError("Ingresa tu correo y contraseña.");
        return;
      }

      // Estado de carga en el botón
      if (btnSubmitAuthLogin) btnSubmitAuthLogin.disabled = true;
      if (authBtnSpinner) authBtnSpinner.hidden = false;
      if (authBtnText) authBtnText.textContent = "Verificando...";

      try {
        if (typeof window.loginWithEmail !== "function") {
          throw new Error("El módulo de autenticación de Firebase no está listo. Recarga la página.");
        }

        const res = await window.loginWithEmail(email, password);
        if (res.success) {
          clearAuthError();
          if (authPasswordInput) authPasswordInput.value = "";
          updateAuthState(res.user);
          // Opcional: Cerrar modal tras login o mantener la confirmación
          authModalOverlay.hidden = true;
        } else {
          showAuthError(res.message || "Error al iniciar sesión.");
        }
      } catch (err) {
        showAuthError(err.message || "Ocurrió un error inesperado al conectar.");
      } finally {
        if (btnSubmitAuthLogin) btnSubmitAuthLogin.disabled = false;
        if (authBtnSpinner) authBtnSpinner.hidden = true;
        if (authBtnText) authBtnText.textContent = "Ingresar";
        renderLucideIcons();
      }
    });
  }

  // Cerrar Sesión
  if (btnAuthLogout) {
    btnAuthLogout.addEventListener("click", async () => {
      try {
        if (typeof window.logoutUser === "function") {
          await window.logoutUser();
        }
        updateAuthState(null);
        closeAuthModal();
      } catch (err) {
        console.error("Error al cerrar sesión:", err);
      }
    });
  }

  authModalInitialized = true;
}

// Render y arranque reactivo con Firebase
let appInitialized = false;

function initApp() {
  syncCatalogData();
  if (!appInitialized) {
    initCustomerMemory();
    appInitialized = true;
  }
  initTheme();
  initAuthModal();
  initTopSellingProducts();
  renderProducts();
  renderLucideIcons();
  if (currentCategory === "all") {
    resetCategoryBarScroll();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initCustomerMemory();
  initTheme();
  initAuthModal();
  if (currentCategory === "all") resetCategoryBarScroll();
});

window.addEventListener("pageshow", () => {
  initAuthModal();
  if (currentCategory === "all") resetCategoryBarScroll();
});

window.addEventListener("catalog:ready", () => {
  initApp();
});

window.addEventListener("catalog:updated", () => {
  initApp();
});

// Sincronización entre pestañas y Firestore en segundo plano para Los Más Comprados
window.addEventListener("storage", e => {
  if (e.key === "notes_sales_updated" || e.key === "notes_top_sellers_cache") {
    refreshTopSellingProducts();
  }
});

// Reintentos automáticos por si Firebase termina de inicializar instantes después
if (typeof window.getSalesHistory !== "function") {
  setTimeout(refreshTopSellingProducts, 700);
  setTimeout(refreshTopSellingProducts, 2200);
}

// Si CatalogData ya tiene productos al momento de ejecutar app.js
if (window.CatalogData && Array.isArray(window.CatalogData.products) && window.CatalogData.products.length > 0) {
  initApp();
}