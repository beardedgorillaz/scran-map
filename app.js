const STORE_KEY = "scran-map.places";
const OWNER_KEY = "scran-map.owner";
const LONDON = [51.5074, -0.1278];
const GEOCODER = "https://nominatim.openstreetmap.org";
// Restaurants in Greater London on OpenStreetMap, counted 3 Nov 2026.
const LONDON_RESTAURANTS = 9129;
const MOTION = !matchMedia("(prefers-reduced-motion: reduce)").matches;

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/* Pixel art: one letter per pixel, "." is see-through */

const PALETTE = { k: "#20263a", r: "#ef4a6b", h: "#ffc2cd", o: "#f58220", w: "#ffffff", y: "#ffc933", b: "#8fb0d9", g: "#5cc25c", d: "#2c7a39", t: "#3fa34d", l: "#7fdc62", u: "#7a4a21", n: "#6fd053", c: "#eebb63", e: "#a9682a" };
const SPRITES = {
  heart: [
    "..kk...kk..",
    ".krrk.krrk.",
    "krhrrkrrrrk",
    "krhrrrrrrrk",
    "krrrrrrrrrk",
    ".krrrrrrrk.",
    "..krrrrrk..",
    "...krrrk...",
    "....krk....",
    ".....k.....",
  ],
  cone: [
    ".....k.....",
    "....kok....",
    "....kok....",
    "...kwwwk...",
    "...kwwwk...",
    "..koooook..",
    "..koooook..",
    ".kwwwwwwwk.",
    ".kwwwwwwwk.",
    "koooooooook",
    "kkkkkkkkkkk",
  ],
  star: [
    ".....k.....",
    "....kyk....",
    "....kyk....",
    "kkkkyyykkkk",
    "kyyyyyyyyyk",
    ".kyyyyyyyk.",
    "..kyyyyyk..",
    "..kyyyyyk..",
    ".kyykkkyyk.",
    ".kkk...kkk.",
  ],
  meh: [
    "...kkkkk...",
    "..kbbbbbk..",
    ".kbbbbbbbk.",
    "kbbkbbbkbbk",
    "kbbkbbbkbbk",
    "kbbbbbbbbbk",
    "kbbbbbbbbbk",
    "kbbkkkkkbbk",
    ".kbbbbbbbk.",
    "..kbbbbbk..",
    "...kkkkk...",
  ],
  skull: [
    "..kkkkkkk..",
    ".kwwwwwwwk.",
    "kwwwwwwwwwk",
    "kwkkwwwkkwk",
    "kwkkwwwkkwk",
    "kwwwwkwwwwk",
    ".kwwwwwwwk.",
    "..kwkwkwk..",
    "..kwkwkwk..",
    "..kkkkkkk..",
  ],
  coffee: ["...b..b....","..b..b.....","...b..b....","kkkkkkkkk..","kuuuuuuukk.","kwwwwwwwk.k","kwwwwwwwk.k","kwwwwwwwkk.",".kwwwwwk...","..kkkkk....","kkkkkkkkk.."],
  baguette: ["........kkk",".......kcck","......kceck",".....kcecck","....kceckk.","...kcecck..","..kceckk...",".kcecck....","kceckk.....","kcckk......","kkk........"],
  shop: ["..kkkkkkk..",".krwrwrwrk.","krwrwrwrwrk","kkkkkkkkkkk",".kwwwwwwwk.",".kwbbwkkwk.",".kwbbwkkwk.",".kkkkkkkkk."],
  trees: ["nnnnnnnnnnnn","nnnnddddnnnn","nnndttttdnnn","nndtlltttdnn","nndtlttttdnn","nndttttttdnn","nnndttttdnnn","nnnnddddnnnn","nnnnnuunnnnn","nnnnnuunnnnn","nnnnnnnnnnnn","nnnnnnnnnnnn"],
  add: ["...kkkkk...","...kyyyk...","...kyyyk...","kkkkyyykkkk","kyyyyyyyyyk","kyyyyyyyyyk","kyyyyyyyyyk","kkkkyyykkkk","...kyyyk...","...kyyyk...","...kkkkk..."],
  globe: ["...kkkkk...","..kbggbbk..",".kbgggbbbk.","kbbgggbbbbk","kbbbggbbggk","kbbbbbbgggk","kbbggbbbggk","kbgggbbbbbk",".kbggbbbbk.","..kbbbbbk..","...kkkkk..."],
  zoomin: ["..kkkkk....",".kwwwwwk...","kwwwkwwwk..","kwwwkwwwk..","kwkkkkkwk..","kwwwkwwwk..","kwwwkwwwk..",".kwwwwwk...","..kkkkkk...",".......kk..","........kk."],
  zoomout: ["..kkkkk....",".kwwwwwk...","kwwwwwwwk..","kwwwwwwwk..","kwkkkkkwk..","kwwwwwwwk..","kwwwwwwwk..",".kwwwwwk...","..kkkkkk...",".......kk..","........kk."],
  next: ["....kk.....","....kyk....","....kyyk...","kkkkkyyyk..","kyyyyyyyyk.","kyyyyyyyyyk","kyyyyyyyyk.","kkkkkyyyk..","....kyyk...","....kyk....","....kk....."],
  gear: ["....kkk....",".kk.kwk.kk.",".kwkkwkkwk.","..kwwwwwk..","kkkwkkkwkkk","kwwwk.kwwwk","kkkwkkkwkkk","..kwwwwwk..",".kwkkwkkwk.",".kk.kwk.kk.","....kkk...."],
};
const spriteCache = {};

function sprite(name) {
  if (!spriteCache[name]) {
    const rows = SPRITES[name];
    const rects = rows.flatMap((row, y) => [...row].map((c, x) =>
      c === "." ? "" : `<rect x="${x}" y="${y}" width="1" height="1" fill="${PALETTE[c]}"/>`)).join("");
    spriteCache[name] = `<svg class="sprite" viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
  }
  return spriteCache[name];
}

const SYMBOLS = {
  love: { label: "Love it", plural: "Loves", art: "heart" },
  good: { label: "Liked it", plural: "Liked", art: "star" },
  fine: { label: "It was fine", plural: "Fine", art: "meh" },
  nope: { label: "Never again", plural: "Never again", art: "skull" },
  want: { label: "Want to try", plural: "Want to try", art: "cone" },
};
const rated = (p) => p.status !== "want";
const KINDS = {
  restaurant: { label: "Restaurant", art: "shop" },
  bakery: { label: "Bakery", art: "baguette" },
  cafe: { label: "Café", art: "coffee" },
};
const kindKey = (p) => (KINDS[p.type] ? p.type : "restaurant");
const kindOf = (p) => KINDS[kindKey(p)];
const isRestaurant = (p) => kindKey(p) === "restaurant";
const isCoffee = (p) => p.type === "cafe" || !!p.goodCoffee;
const inFilter = (p, key) => key === "all" || (key === "bakery" ? p.type === "bakery" : key === "coffee" ? isCoffee(p) : p.status === key);
const matchesFilter = (p) => inFilter(p, filter);
const FILTER_ORDER = ["all", "love", "good", "fine", "nope", "want", "bakery", "coffee"];
const FILTER_NAMES = { all: "All places", bakery: "Bakeries", coffee: "Cafés and good coffee" };
const filterName = (key) => FILTER_NAMES[key] || SYMBOLS[key].plural;
const FILTER_ART = { bakery: "baguette", coffee: "coffee" };
// Kind and coffee marks shown beside the feeling symbol, skipping the plain restaurant.
const extraMarks = (p) => [...(isRestaurant(p) ? [] : [kindOf(p).art]), ...(p.goodCoffee && p.type !== "cafe" ? ["coffee"] : [])];
const typing = () => mode === "form" || mode === "review";

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function niceDate(value) {
  return value ? new Date(`${value}T12:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Date not set";
}

/* Saved places */

// Visitors see the published places.js and can't change anything. Opening the
// site once with #edit (or having saved places already) makes this browser an
// editor, and #view previews the visitor version. This only decides what the
// page offers: edits stay in this browser until a new places.js is uploaded.
const hash = location.hash.slice(1);
let isEditor = hash === "edit";
try {
  isEditor = isEditor || localStorage.getItem(OWNER_KEY) === "1" || localStorage.getItem(STORE_KEY) !== null;
  if (isEditor) localStorage.setItem(OWNER_KEY, "1");
} catch { /* without storage, only #edit unlocks editing */ }
const readOnly = !isEditor || hash === "view";
document.body.classList.toggle("read-only", readOnly);
window.addEventListener("hashchange", () => location.reload());

// Places saved before the two ratings and symbols existed had one score out of 10.
function migrate(p) {
  const out = { ...p };
  if (p.status === "been") {
    const score = p.score ?? 6;
    out.status = score >= 8 ? "love" : score >= 6 ? "good" : "fine";
    out.pref = out.food = Math.max(1, Math.round(score / 2));
  }
  if (!SYMBOLS[out.status]) out.status = "want";
  if (out.dishes) {
    out.note = [out.note, `Order: ${out.dishes}`].filter(Boolean).join("\n");
    delete out.dishes;
  }
  if (out.location == null) out.location = [out.area, out.city].filter(Boolean).join(", ");
  delete out.score;
  if (!Array.isArray(out.past)) out.past = [];
  return out;
}

let places = load().map(migrate);
let filter = "all";
let revealed = false;
const RANKS = [[0, "Hungry Rookie"], [5, "Snack Scout"], [15, "Menu Hunter"], [40, "Table Regular"], [100, "Supper Star"], [250, "Feast Legend"], [1000, "Grand Gourmet"]];
let goal = "city";
let navId = null;
try { goal = localStorage.getItem("scran-map.goal") || "city"; } catch { /* keep the default */ }
let mode = "list";
let cursorId = null;
let selectedId = null;
let draft = null;
let draftMarker = null;
let lookupSeq = 0;
let pendingLookup = null;
let saving = false;
let autoLocation = "";
let sliding = false;

function load() {
  if (readOnly) return window.SEED_PLACES || [];
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* fall through to the starting list */ }
  return window.SEED_PLACES || [];
}

function save() {
  if (readOnly) return false;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(places));
    return true;
  } catch {
    toast("Your browser's storage is full, so this change wasn't saved. Remove some photos and try again.");
    return false;
  }
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 4000);
}

/* Top screen */

const map = L.map("map", { zoomSnap: 0.5, zoomControl: false }).setView(LONDON, 12);
L.control.zoom({ position: "bottomright" }).addTo(map);
const canDrawStyledMap = !!document.createElement("canvas").getContext("webgl");
if (canDrawStyledMap) {
  const town = L.maplibreGL({
    style: window.SCRAN_MAP_STYLE,
    pixelRatio: 0.5, // drawn at half resolution for chunky handheld pixels
    attribution: '<a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  town.getMaplibreMap().on("styleimagemissing", (e) => {
    if (e.id !== "trees") return;
    const rows = SPRITES.trees;
    const data = new Uint8Array(rows.length * rows[0].length * 4);
    rows.join("").split("").forEach((c, i) => {
      const hex = PALETTE[c];
      data.set([1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)), i * 4);
      data[i * 4 + 3] = 255;
    });
    e.target.addImage("trees", { width: rows[0].length, height: rows.length, data }, { pixelRatio: 0.5 });
  });
} else {
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
}
const pins = L.layerGroup().addTo(map);

function pinIcon(p, cls = "") {
  const below = kindOf(p).art;
  const cup = p.goodCoffee && p.type !== "cafe" ? `<span class="pin-coffee">${sprite("coffee")}</span>` : "";
  return L.divIcon({ className: "pin-icon", html: `<span class="pin ${cls}"><span class="pin-bubble">${sprite(SYMBOLS[p.status].art)}${cup}</span><span class="pin-shop pin-shop--${below}">${sprite(below)}</span></span>`, iconSize: [30, 44], iconAnchor: [15, 42] });
}

function renderPins() {
  pins.clearLayers();
  for (const p of visible()) {
    const on = p.id === selectedId || p.id === cursorId;
    L.marker([p.lat, p.lng], {
      icon: pinIcon(p, on ? "pin--on" : ""),
      title: `${p.name}: ${isRestaurant(p) ? "" : `${kindOf(p).label}, `}${SYMBOLS[p.status].label}${p.goodCoffee ? ", good coffee" : ""}`,
      alt: p.name,
      zIndexOffset: on ? 1000 : 0,
    }).on("click", () => { if (!typing()) showDetail(p.id); }).addTo(pins);
  }
}

function floatUp(p, html) {
  const icon = L.divIcon({ className: "float-icon", html: `<span>${html}</span>`, iconSize: [40, 20], iconAnchor: [20, 50] });
  const marker = L.marker([p.lat, p.lng], { icon, interactive: false, keyboard: false, zIndexOffset: 3000 }).addTo(map);
  setTimeout(() => marker.remove(), 1400);
}

// Little icons rise from the shops now and then, like customers reacting.
if (MOTION) {
  setInterval(() => {
    const shown = visible();
    if (document.hidden || typing() || !shown.length) return;
    const p = shown[Math.floor(Math.random() * shown.length)];
    floatUp(p, sprite(SYMBOLS[p.status].art));
  }, 2400);
}

function rankName(count) {
  return RANKS.filter(([at]) => count >= at).pop()[1];
}

// The top padding keeps shops clear of the status bar.
function fitPlaces(list) {
  if (list.length) map.fitBounds(list.map((p) => [p.lat, p.lng]), { paddingTopLeft: [36, 110], paddingBottomRight: [36, 24], maxZoom: 15, animate: MOTION });
}

function fitVisible() {
  fitPlaces(visible());
}

function renderHud() {
  const been = places.filter(rated);
  const [name, done, total] = goal === "city"
    ? ["LONDON", been.filter((p) => p.city === "London" && isRestaurant(p)).length, LONDON_RESTAURANTS]
    : ["MY LIST", been.length, places.length];
  const pct = total ? Math.min(100, (done / total) * 100) : 0;
  const pctText = pct > 0 && pct < 1 ? `${pct.toFixed(2)}%` : `${Math.floor(pct)}%`;
  const switchTo = goal === "city" ? "my list" : "all of London";
  const now = new Date();
  const chip = mode === "form"
    ? `<span class="hud-chip hud-chip--tip">${draft?.lat != null ? "Drag the pin to adjust it" : "Tap the map to place the pin"}</span>`
    : `<span class="hud-chip">Y${now.getFullYear()} M${now.getMonth() + 1} W${Math.ceil(now.getDate() / 7)}</span>
       <span class="hud-chip">Rank: ${rankName(been.length)}</span>
       ${readOnly ? '<span class="hud-chip">View only</span>' : ""}
       ${filter === "all" ? "" : `<span class="hud-chip hud-chip--tip">${esc(filterName(filter))}: ${visible().length}</span>`}`;
  $("#hud").innerHTML = `
    <button id="goal" class="hp" type="button" title="Restaurants covered. Tap to switch to ${switchTo}." aria-label="${name}: ${done} of ${total} restaurants covered, ${pctText}. Switch to ${switchTo}.">
      <span class="hp-name">${name}</span>
      <span class="hp-bar"><span class="hp-fill" style="width:${done ? `max(3px, ${pct}%)` : "0"}"></span></span>
      <span class="hp-num">${pctText} ${done.toLocaleString("en-GB")}/${total.toLocaleString("en-GB")}</span>
    </button>
    <div class="hud-row">${chip}</div>`;
  $("#goal").addEventListener("click", () => {
    goal = goal === "city" ? "list" : "city";
    try { localStorage.setItem("scran-map.goal", goal); } catch { /* lasts until reload */ }
    renderHud();
  });
}

map.on("click", (e) => {
  if (mode === "form") setDraftSpot(e.latlng.lat, e.latlng.lng, true);
});

/* Bottom screen: the shelf of cards */

const visible = () => places.filter(matchesFilter);
const shelf = () => [...visible()].sort((a, b) => (b.added ?? 0) - (a.added ?? 0));
const safePhoto = (src) => typeof src === "string" && src.startsWith("data:image/") ? src : "";

function serial(p) {
  const code = p.area || (p.city || "XXX").slice(0, 3).toUpperCase();
  return `SCR-${code}-${p.area ? "UKV" : "INT"}`;
}

function cardInner(p) {
  const s = SYMBOLS[p.status];
  const photo = safePhoto(p.photo);
  return `
    <span class="card-grip"></span>
    <span class="card-label">
      <span class="card-art">
        ${photo ? `<img src="${esc(photo)}" alt=""><span class="card-badge">${sprite(s.art)}</span>` : sprite(s.art)}
        ${p.example ? '<span class="card-sticker">EXAMPLE</span>' : ""}
        ${extraMarks(p).length ? `<span class="card-types">${extraMarks(p).map((art) => `<span class="card-type">${sprite(art)}</span>`).join("")}</span>` : ""}
        ${rated(p) ? `<span class="card-scores"><span>${sprite("heart")}${esc(p.pref)}</span><span>${sprite("star")}${esc(p.food)}</span>${p.past?.length ? `<span>x${p.past.length + 1}</span>` : ""}</span>` : ""}
      </span>
      <span class="card-foot">
        <span class="card-name">${esc(p.name)}</span>
        <span class="card-serial">${esc(serial(p))}</span>
      </span>
    </span>`;
}

function renderDeck() {
  const count = (key) => places.filter((p) => inFilter(p, key)).length;
  const tabs = FILTER_ORDER.map((key) => `
    <button type="button" data-filter="${key}" aria-pressed="${filter === key}" title="${filterName(key)}" aria-label="${filterName(key)}">
      ${key === "all" ? `ALL ${places.length}` : `${sprite(FILTER_ART[key] || SYMBOLS[key].art)}${count(key)}`}
    </button>`).join("");
  const examples = places.filter((p) => p.example).length;
  const cards = shelf();
  const navButtons = [readOnly ? ["log", "shop", "Browse cards"] : ["start", "add", "Add place"], ["y", "globe", "Whole map"], ["next", "next", "Next place"], ["r", "zoomin", "Zoom in"], ["l", "zoomout", "Zoom out"], ["select", "gear", "Options"]];

  $("#deck").innerHTML = `
    <div class="tabs">${tabs}</div>
    ${revealed ? `
      ${examples && !readOnly ? `<div class="notice"><span>${examples} example ${examples === 1 ? "card" : "cards"}</span><button id="clear-examples" class="link" type="button">Remove examples</button></div>` : ""}
      <div class="shelf">
        <div class="shelf-bar"><span>Log: ${cards.length} ${cards.length === 1 ? "card" : "cards"}</span><button id="hide-cards" class="link" type="button">Close log</button></div>
        ${cards.length
          ? `<ul class="grid">${cards.map((p) => `<li class="slot${p.id === cursorId ? " is-cursor" : ""}" data-slot="${esc(p.id)}"><button class="card card--${p.status}" type="button" data-id="${esc(p.id)}" title="${esc(p.name)}" aria-label="${esc(p.name)}: ${isRestaurant(p) ? "" : `${kindOf(p).label}, `}${esc(SYMBOLS[p.status].label)}${p.goodCoffee ? ", good coffee" : ""}">${cardInner(p)}</button></li>`).join("")}</ul>`
          : `<p class="empty">${places.length ? "No cards with this symbol yet." : readOnly ? "No places here yet." : "Your log is empty. Press Start to add your first place."}</p>`}
      </div>` : `
      <nav class="nav" aria-label="Map controls">
        ${navButtons.map(([key, art, text]) => `<button type="button" data-nav="${key}">${sprite(art)}<span>${text}</span></button>`).join("")}
      </nav>`}`;

  $("#deck").querySelectorAll("[data-nav]").forEach((b) => b.addEventListener("click", () => press(b.dataset.nav)));
  $("#deck").querySelectorAll("[data-filter]").forEach((b) => b.addEventListener("click", () => setFilter(b.dataset.filter)));
  $("#deck").querySelectorAll("[data-id]").forEach((b) => {
    b.addEventListener("click", () => { flyToPlace(b.dataset.id); showDetail(b.dataset.id); });
    b.addEventListener("focus", () => setCursor(b.dataset.id, false));
  });
  $("#hide-cards")?.addEventListener("click", () => setRevealed(false));
  $("#clear-examples")?.addEventListener("click", () => {
    places = places.filter((p) => !p.example);
    save();
    refresh();
  });
}

function setRevealed(next) {
  revealed = next;
  if (!next) cursorId = null;
  refresh();
  if (next && MOTION) {
    document.querySelectorAll(".deck .slot").forEach((slot, i) => {
      slot.animate(
        [{ transform: "translateY(-16px) scale(0.8)", opacity: 0 }, { transform: "none", opacity: 1 }],
        { duration: 240, delay: Math.min(i, 12) * 35, easing: "cubic-bezier(.2,.8,.3,1)", fill: "backwards" },
      );
    });
  }
}

function refresh() {
  if (!places.some((p) => p.id === cursorId)) cursorId = null;
  renderDeck();
  renderPins();
  renderHud();
  renderHints();
}

function setFilter(next) {
  filter = next;
  if (!visible().some((p) => p.id === cursorId)) cursorId = null;
  refresh();
  fitVisible();
}

function setCursor(id, focus = true) {
  if (cursorId === id && !focus) return;
  cursorId = id;
  document.querySelectorAll(".deck .slot").forEach((s) => s.classList.toggle("is-cursor", s.dataset.slot === id));
  renderPins();
  if (focus) {
    const card = $(`.deck [data-id="${CSS.escape(id)}"]`);
    card?.focus({ preventScroll: true });
    card?.scrollIntoView({ block: "nearest" });
    const p = places.find((x) => x.id === id);
    map.panTo([p.lat, p.lng], { animate: MOTION });
  }
}

function flyToPlace(id) {
  const p = places.find((x) => x.id === id);
  const zoom = Math.max(map.getZoom(), 15);
  if (MOTION) map.flyTo([p.lat, p.lng], zoom, { duration: 0.6 });
  else map.setView([p.lat, p.lng], zoom);
}

function renderHints() {
  const sets = {
    list: revealed
      ? [["A", "Open"], ["B", "Close log"], ["X", "Filter"], ["Y", "Whole map"], ["L R", "Zoom"]]
      : [["D-pad", "Move map"], ["A", "Log"], ["X", "Filter"], ["L R", "Zoom"]],
    detail: [["◂▸", "Next card"], ...(readOnly ? [] : [["A", "Review"]]), ["B", "Put back"], ["L R", "Zoom"]],
    review: [["A", "Save"], ["B", "Cancel"]],
    form: [["A", "Save"], ["B", "Cancel"], ["L R", "Zoom"]],
    options: [["B", "Back"]],
  };
  $("#hints").innerHTML = sets[mode].map(([k, v]) => `<span><b>${k}</b>${v}</span>`).join("");
}

/* Sliding a card out */

const overlay = $("#overlay");
const deck = $("#deck");
const SLIDE = { duration: MOTION ? 320 : 0, easing: "cubic-bezier(.2,.8,.3,1)", fill: "both" };

function slideFrames(card, slot) {
  const to = card.getBoundingClientRect();
  const from = slot?.getBoundingClientRect();
  const start = from
    ? `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})`
    : "translateY(110%)";
  return [{ transform: start }, { transform: "none" }];
}

function openOverlay() {
  overlay.hidden = false;
  deck.inert = true;
}

function closeOverlay() {
  overlay.getAnimations().forEach((m) => m.cancel()); // a finished fade would otherwise stick
  overlay.hidden = true;
  overlay.innerHTML = "";
  deck.inert = false;
  document.querySelectorAll(".slot.is-out").forEach((s) => s.classList.remove("is-out"));
}

function showDetail(id) {
  if (sliding) return;
  const p = places.find((x) => x.id === id);
  const wasOpen = !overlay.hidden;
  clearDraft();
  mode = "detail";
  selectedId = id;
  cursorId = id;
  document.querySelectorAll(".slot").forEach((s) => s.classList.remove("is-out", "is-cursor"));
  const slot = $(`.deck [data-slot="${CSS.escape(id)}"]`);
  slot?.classList.add("is-cursor");
  slot?.scrollIntoView({ block: "nearest" });

  const s = SYMBOLS[p.status];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name}, ${p.location || p.city || ""}`)}`;
  openOverlay();
  overlay.innerHTML = `
    <article class="detail">
      <div class="slot"><div class="card card--${p.status}">${cardInner(p)}</div></div>
      <div class="sheet-wrap">
        <div class="sheet">
          <h2>${esc(p.name)}</h2>
          <span class="tag">${sprite(s.art)}${esc(s.label)}${isRestaurant(p) ? "" : ` · ${sprite(kindOf(p).art)}${kindOf(p).label}`}${p.goodCoffee ? ` · ${sprite("coffee")}Good coffee` : ""}${p.example ? " · Example" : ""}</span>
          <div><span class="field-label">Location</span><p>${esc(p.location || "Not set")}</p><a class="ext" href="${esc(mapsUrl)}" target="_blank" rel="noopener">Open in Google Maps</a></div>
          ${rated(p) ? `<div>${p.visited ? `<span class="field-label">Latest visit: ${esc(niceDate(p.visited))}</span>` : ""}${ratingRow("Personal", "heart", p.pref)}${ratingRow("Food", "star", p.food)}</div>` : ""}
          ${p.note ? `<div><span class="field-label">Notes</span><p>${esc(p.note)}</p></div>` : ""}
          <div class="actions">
            ${readOnly ? "" : `<button id="review" class="btn btn--primary" type="button">${rated(p) ? "Add review" : "I went! Review it"}</button>`}
            <button id="back" class="btn" type="button">Put back</button>
            ${readOnly ? "" : `<button id="edit" class="btn" type="button">Edit</button>
            <button id="delete" class="btn btn--danger" type="button">Delete</button>`}
          </div>
          ${p.past.length ? `<div><span class="field-label">Earlier visits (${p.past.length})</span>
            <ul class="visits">${p.past.map((v, i) => `<li class="visit">
              <div class="visit-head">
                <span class="visit-symbol">${sprite(SYMBOLS[v.status]?.art || "star")}</span>
                <span>${esc(niceDate(v.visited))}</span>
                <span class="visit-score">${sprite("heart")}${esc(v.pref)}</span>
                <span class="visit-score">${sprite("star")}${esc(v.food)}</span>
                ${readOnly ? "" : `<button class="link" type="button" data-remove-visit="${i}" aria-label="Remove the visit from ${esc(niceDate(v.visited))}">Remove</button>`}
              </div>
              ${v.note ? `<p>${esc(v.note)}</p>` : ""}
            </li>`).join("")}</ul></div>` : ""}
        </div>
      </div>
    </article>`;

  $("#back").addEventListener("click", putBack);
  $("#review")?.addEventListener("click", () => showReview(p));
  overlay.querySelectorAll("[data-remove-visit]").forEach((b) => b.addEventListener("click", () => {
    if (!confirm("Remove this earlier visit?")) return;
    const past = p.past.filter((_, i) => i !== Number(b.dataset.removeVisit));
    places = places.map((x) => (x.id === id ? { ...x, past } : x));
    save();
    renderDeck();
    showDetail(id);
  }));
  $("#edit")?.addEventListener("click", () => showForm(p));
  $("#delete")?.addEventListener("click", () => {
    if (!confirm(`Delete ${p.name}?`)) return;
    places = places.filter((x) => x.id !== id);
    save();
    closeOverlay();
    mode = "list";
    selectedId = null;
    refresh();
  });

  const card = $(".detail .slot");
  const sheet = $(".sheet");
  if (!wasOpen) {
    overlay.animate([{ backgroundColor: "rgb(238 242 247 / 0)" }, { backgroundColor: "rgb(238 242 247 / 1)" }], SLIDE);
    slot?.classList.add("is-out");
    card.animate(slideFrames(card, slot), SLIDE);
    sheet.animate([{ transform: "translateX(-101%)" }, { transform: "none" }], { ...SLIDE, delay: MOTION ? 180 : 0 });
  } else {
    slot?.classList.add("is-out");
    sheet.animate([{ transform: "translateX(-101%)" }, { transform: "none" }], SLIDE);
  }
  $("#back").focus({ preventScroll: true });
  renderPins();
  renderHud();
  renderHints();
}

function ratingRow(label, art, value) {
  const n = Number(value) || 0;
  const icons = [1, 2, 3, 4, 5].map((i) => `<span class="${i <= n ? "" : "off"}">${sprite(art)}</span>`).join("");
  return `<div class="rating" role="img" aria-label="${label}: ${n} out of 5"><span class="field-label">${label}</span><span class="pips">${icons}</span><span class="num">${n}/5</span></div>`;
}

async function putBack() {
  if (sliding || mode !== "detail") return;
  sliding = true;
  const id = selectedId;
  const slot = $(`.deck [data-slot="${CSS.escape(id)}"]`);
  const card = $(".detail .slot");
  const sheet = $(".sheet");
  const fast = { ...SLIDE, duration: MOTION ? 220 : 0 };
  const moves = [
    sheet.animate([{ transform: "none" }, { transform: "translateX(-101%)" }], fast),
    card.animate(slideFrames(card, slot).reverse(), { ...fast, delay: MOTION ? 90 : 0 }),
    overlay.animate([{ backgroundColor: "rgb(238 242 247 / 1)" }, { backgroundColor: "rgb(238 242 247 / 0)" }], { ...fast, delay: MOTION ? 90 : 0 }),
  ];
  await Promise.allSettled(moves.map((m) => m.finished));
  sliding = false;
  closeOverlay();
  mode = "list";
  selectedId = null;
  if (!revealed) cursorId = null;
  renderPins();
  renderHud();
  renderHints();
  $(`.deck [data-id="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
}

/* Add and edit */

function showForm(existing) {
  if (sliding || readOnly) return;
  mode = "form";
  selectedId = null;
  draft = existing ? { ...existing } : { status: "love", pref: 3, food: 3, city: "", area: "", photo: "" };
  autoLocation = "";
  const d = draft;

  openOverlay();
  overlay.innerHTML = `
    <div class="panel-scroll">
      <form id="search" class="search" role="search">
        <input id="q" type="search" placeholder="Search name or address" aria-label="Search for a place" autocomplete="off">
        <button class="btn" type="submit">Search</button>
      </form>
      <div id="results"></div>
      <p id="spot" class="hint"></p>
      <form id="place" class="form" novalidate>
        <label><span class="field-label">Name</span>
          <input id="name" type="text" value="${esc(d.name)}"></label>
        <label><span class="field-label">Location</span>
          <input id="location" type="text" value="${esc(d.location)}" placeholder="Street, area or city"></label>
        <fieldset><legend class="field-label">Type of place</legend>
          <div class="radios">
            ${Object.entries(KINDS).map(([key, k]) => `<label><input type="radio" name="kind" value="${key}"${kindKey(d) === key ? " checked" : ""}><span class="pick">${sprite(k.art)}${k.label}</span></label>`).join("")}
            <label><input id="good-coffee" type="checkbox"${d.goodCoffee ? " checked" : ""}><span class="pick pick--tick">${sprite("coffee")}Good coffee</span></label>
          </div></fieldset>
        <fieldset><legend class="field-label">Symbol on the map</legend>
          <div class="radios">${symbolPicks(d.status)}</div></fieldset>
        <fieldset id="rate-pref" class="rate"><legend class="field-label">Personal rating</legend>
          <div class="radios">${ratePicks("pref", "heart", d.pref)}</div></fieldset>
        <fieldset id="rate-food" class="rate"><legend class="field-label">Food rating</legend>
          <div class="radios">${ratePicks("food", "star", d.food)}</div></fieldset>
        <label><span class="field-label">Notes</span>
          <textarea id="note" rows="3">${esc(d.note)}</textarea></label>
        <label><span class="field-label">Photo for the card (optional)</span>
          <input id="photo" type="file" accept="image/*"></label>
        <img id="preview" class="preview" alt="Selected photo" ${safePhoto(d.photo) ? `src="${esc(d.photo)}"` : "hidden"}>
        <p id="form-error" class="error" role="alert" hidden></p>
        <div class="actions">
          <button class="btn btn--primary" type="submit">Save card</button>
          <button id="cancel" class="btn" type="button">Cancel</button>
        </div>
      </form>
    </div>`;

  const syncStatus = () => {
    const status = $('input[name="status"]:checked').value;
    draft.status = status;
    $("#rate-pref").hidden = $("#rate-food").hidden = status === "want";
    draft.type = $('input[name="kind"]:checked').value;
    draft.goodCoffee = $("#good-coffee").checked;
    draftMarker?.setIcon(pinIcon(draft, "pin--draft"));
  };
  overlay.querySelectorAll('input[name="status"], input[name="kind"], #good-coffee').forEach((i) => i.addEventListener("change", syncStatus));
  wireRatings();
  $("#cancel").addEventListener("click", cancelForm);
  $("#search").addEventListener("submit", runSearch);
  $("#photo").addEventListener("change", pickPhoto);
  $("#place").addEventListener("submit", submitPlace);

  clearDraftMarker();
  if (d.lat != null) setDraftSpot(d.lat, d.lng, false);
  else updateSpotHint();
  syncStatus();
  $(existing ? "#name" : "#q").focus({ preventScroll: true });
  renderPins();
  renderHud();
  renderHints();
}

function symbolPicks(current, keys = Object.keys(SYMBOLS)) {
  return keys.map((key) => `
    <label><input type="radio" name="status" value="${key}"${current === key ? " checked" : ""}><span class="pick">${sprite(SYMBOLS[key].art)}${SYMBOLS[key].label}</span></label>`).join("");
}

function ratePicks(name, art, value) {
  return [1, 2, 3, 4, 5].map((n) => `
    <label class="${n <= (value ?? 3) ? "" : "rate-off"}"><input type="radio" name="${name}" value="${n}"${n === (value ?? 3) ? " checked" : ""} aria-label="${n} out of 5"><span class="pip">${sprite(art)}</span></label>`).join("");
}

function wireRatings() {
  overlay.querySelectorAll(".rate").forEach((set) => set.addEventListener("change", (e) => {
    const value = Number(e.target.value);
    set.querySelectorAll("label").forEach((l, i) => l.classList.toggle("rate-off", i + 1 > value));
  }));
}

/* Going back: a new review for a place already on the map */

function showReview(p) {
  if (sliding || readOnly) return;
  mode = "review";
  selectedId = p.id;
  const firstVisit = !rated(p);
  const visitNumber = firstVisit ? 1 : p.past.length + 2;
  const eaten = Object.keys(SYMBOLS).filter((k) => k !== "want");
  openOverlay();
  overlay.innerHTML = `
    <div class="panel-scroll">
      <div class="options-title">${esc(p.name)}: visit ${visitNumber}</div>
      <form id="review-form" class="form" novalidate>
        <label><span class="field-label">When did you go?</span>
          <input id="review-date" type="date" value="${today()}" max="${today()}"></label>
        <fieldset><legend class="field-label">How do you feel about it now?</legend>
          <div class="radios">${symbolPicks(firstVisit ? "good" : p.status, eaten)}</div></fieldset>
        <fieldset class="rate"><legend class="field-label">Personal rating</legend>
          <div class="radios">${ratePicks("pref", "heart", p.pref)}</div></fieldset>
        <fieldset class="rate"><legend class="field-label">Food rating</legend>
          <div class="radios">${ratePicks("food", "star", p.food)}</div></fieldset>
        <label><span class="field-label">Notes from this visit</span>
          <textarea id="review-note" rows="3">${firstVisit ? esc(p.note) : ""}</textarea></label>
        <div class="actions">
          <button class="btn btn--primary" type="submit">Save review</button>
          <button id="review-cancel" class="btn" type="button">Cancel</button>
        </div>
      </form>
    </div>`;
  wireRatings();
  $("#review-form").addEventListener("submit", submitReview);
  $("#review-cancel").addEventListener("click", cancelReview);
  $("#review-date").focus({ preventScroll: true });
  renderPins();
  renderHud();
  renderHints();
}

function cancelReview() {
  const id = selectedId;
  closeOverlay();
  showDetail(id);
}

function submitReview(e) {
  e?.preventDefault();
  const p = places.find((x) => x.id === selectedId);
  const review = {
    status: $('input[name="status"]:checked').value,
    pref: Number($('input[name="pref"]:checked').value),
    food: Number($('input[name="food"]:checked').value),
    note: $("#review-note").value.trim(),
    visited: $("#review-date").value || today(),
  };
  const firstVisit = !rated(p);
  const beenBefore = places.filter(rated).length;
  // Newest date goes on the card, so logging an old visit later doesn't replace it.
  const visits = firstVisit ? [review, ...p.past] : [review, { status: p.status, pref: p.pref, food: p.food, note: p.note, visited: p.visited || "" }, ...p.past];
  visits.sort((x, y) => (y.visited || "").localeCompare(x.visited || ""));
  const [latest, ...past] = visits;
  const place = { ...p, ...latest, past };
  delete place.example; // reviewing an example makes it the user's own

  const before = places;
  places = places.map((x) => (x.id === p.id ? place : x));
  if (!save()) { places = before; return; }
  closeOverlay();
  if (!matchesFilter(place)) filter = "all";
  renderDeck();
  showDetail(place.id);
  floatUp(place, firstVisit ? "+1" : sprite(SYMBOLS[review.status].art));
  const beenNow = places.filter(rated).length;
  if (rankName(beenNow) !== rankName(beenBefore)) toast(`Rank up! You're now a ${rankName(beenNow)}.`);
  else toast(firstVisit ? `${place.name} joined your log!` : `Visit ${past.length + 1} logged at ${place.name}.`);
}

function cancelForm() {
  const id = draft?.id;
  clearDraft();
  if (id) {
    closeOverlay();
    showDetail(id);
  } else {
    closeOverlay();
    mode = "list";
    refresh();
  }
}

function updateSpotHint() {
  const el = $("#spot");
  if (!el) return;
  el.textContent = draft.lat != null
    ? "Pin placed. Drag it, or tap the map to move it."
    : "Search above, or tap the map on the top screen to place the pin.";
}

function setDraftSpot(lat, lng, lookup) {
  draft.lat = lat;
  draft.lng = lng;
  if (draftMarker) {
    draftMarker.setLatLng([lat, lng]);
  } else {
    draftMarker = L.marker([lat, lng], {
      icon: pinIcon(draft, "pin--draft"),
      draggable: true,
      zIndexOffset: 2000,
      alt: "New place",
    }).addTo(map);
    draftMarker.on("dragend", () => {
      const pos = draftMarker.getLatLng();
      setDraftSpot(pos.lat, pos.lng, true);
    });
  }
  updateSpotHint();
  renderHud();
  if (lookup) pendingLookup = lookUpSpot(lat, lng);
}

function clearDraftMarker() {
  draftMarker?.remove();
  draftMarker = null;
}

function clearDraft() {
  draft = null;
  clearDraftMarker();
}

// OpenStreetMap names a place inside London by its borough, so anything
// mentioning London is grouped under one city.
function parseAddress(result) {
  const a = result.address || {};
  const city = /\blondon\b/i.test(result.display_name || "") ? "London" : a.city || a.town || a.village || a.county || "";
  const area = a.country_code === "gb" && a.postcode ? a.postcode.split(" ")[0].toUpperCase() : "";
  const street = [a.house_number, a.road].filter(Boolean).join(" ");
  return { city, area, location: [street, area, city].filter(Boolean).join(", ") };
}

function applyAddress({ city, area, location }) {
  draft.city = city;
  draft.area = area;
  const input = $("#location");
  // Keep anything typed by hand, but follow the pin if the text came from a lookup.
  if (!input.value.trim() || input.value === autoLocation) {
    input.value = location;
    autoLocation = location;
  }
}

async function lookUpSpot(lat, lng) {
  const seq = ++lookupSeq;
  try {
    const res = await fetch(`${GEOCODER}/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`, { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    if (seq !== lookupSeq || mode !== "form") return;
    applyAddress(parseAddress(data));
  } catch { /* the location stays editable by hand */ }
}

async function runSearch(e) {
  e.preventDefault();
  const q = $("#q").value.trim();
  if (!q) return;
  const box = $("#results");
  box.innerHTML = '<p class="hint">Searching…</p>';
  const b = map.getBounds();
  const url = `${GEOCODER}/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(q)}&viewbox=${b.getWest()},${b.getNorth()},${b.getEast()},${b.getSouth()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const found = await res.json();
    if (mode !== "form") return;
    if (!found.length) {
      box.innerHTML = '<p class="hint">No match. Try adding the street or city, or tap the map to place the pin.</p>';
      return;
    }
    box.innerHTML = `<ul class="results">${found.map((r, i) => `<li><button type="button" data-i="${i}">
      <strong>${esc(r.name || r.display_name.split(",")[0])}</strong>
      <span class="meta">${esc(r.display_name.split(",").slice(1, 4).join(","))}</span>
    </button></li>`).join("")}</ul>`;
    box.querySelectorAll("[data-i]").forEach((btn) => btn.addEventListener("click", () => pickResult(found[btn.dataset.i])));
  } catch {
    box.innerHTML = '<p class="hint">Search is unavailable right now. Tap the map to place the pin.</p>';
  }
}

function pickResult(r) {
  lookupSeq++; // a reverse lookup still in flight must not overwrite this choice
  $("#name").value = r.name || $("#name").value;
  $("#location").value = "";
  applyAddress(parseAddress(r));
  const kind = { bakery: "bakery", cafe: "cafe", coffee: "cafe" }[r.type];
  if (kind) {
    $(`input[name="kind"][value="${kind}"]`).checked = true;
    draft.type = kind;
  }
  setDraftSpot(Number(r.lat), Number(r.lon), false);
  draftMarker.setIcon(pinIcon(draft, "pin--draft"));
  map.flyTo([Number(r.lat), Number(r.lon)], 16, { duration: MOTION ? 0.6 : 0 });
  $("#results").innerHTML = "";
}

async function pickPhoto(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    draft.photo = await shrinkPhoto(file);
    const img = $("#preview");
    img.src = draft.photo;
    img.hidden = false;
  } catch {
    toast("That photo couldn't be read. Try a JPG or PNG.");
    e.target.value = "";
  }
}

// Browser storage holds about 5 MB, so photos are stored small.
function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 500 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("unreadable image")); };
    img.src = url;
  });
}

async function submitPlace(e) {
  e?.preventDefault();
  if (saving) return;
  // A pin dropped a moment ago may still be looking up its city.
  saving = true;
  await pendingLookup;
  saving = false;
  if (mode !== "form") return;
  const error = $("#form-error");
  const name = $("#name").value.trim();
  const problem = !name ? "Give the place a name." : draft.lat == null ? "Search for the place, or tap the map to set its spot." : "";
  error.textContent = problem;
  error.hidden = !problem;
  if (problem) {
    error.scrollIntoView({ block: "nearest" });
    return;
  }

  const status = $('input[name="status"]:checked').value;
  const place = {
    ...draft,
    id: draft.id || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    added: draft.added ?? Date.now(),
    name,
    status,
    type: $('input[name="kind"]:checked').value,
    goodCoffee: $("#good-coffee").checked,
    location: $("#location").value.trim(),
    pref: status === "want" ? undefined : Number($('input[name="pref"]:checked').value),
    food: status === "want" ? undefined : Number($('input[name="food"]:checked').value),
    note: $("#note").value.trim(),
    past: draft.past || [],
    visited: status === "want" ? "" : draft.visited || today(),
  };
  delete place.example; // editing an example makes it the user's own

  const before = places;
  const beenBefore = places.filter(rated).length;
  const firstVisit = status !== "want" && !places.some((p) => p.id === place.id && rated(p));
  const exists = places.some((p) => p.id === place.id);
  places = exists ? places.map((p) => (p.id === place.id ? place : p)) : [...places, place];
  if (!save()) { places = before; return; }
  clearDraft();
  closeOverlay();
  if (!matchesFilter(place)) filter = "all";
  renderDeck();
  showDetail(place.id);
  if (firstVisit) {
    floatUp(place, "+1");
    const beenNow = places.filter(rated).length;
    const promoted = rankName(beenNow) !== rankName(beenBefore);
    toast(promoted ? `Rank up! You're now a ${rankName(beenNow)}.` : `${place.name} joined your log!`);
  }
}

/* Options */

function showOptions() {
  if (sliding || typing()) return;
  clearDraft();
  mode = "options";
  selectedId = null;
  document.querySelectorAll(".slot.is-out").forEach((s) => s.classList.remove("is-out"));
  const cities = [...new Set(places.map((p) => p.city).filter(Boolean))].sort();
  const examples = !readOnly && places.some((p) => p.example);
  openOverlay();
  overlay.innerHTML = `
    <div class="panel-scroll">
      <div class="options-title">Options</div>
      <div class="menu">
        ${cities.map((c) => `<button type="button" data-city="${esc(c)}">Go to ${esc(c)}<small>${places.filter((p) => p.city === c).length} places</small></button>`).join("")}
        ${readOnly ? "" : `<button id="backup" type="button">Back up or publish<small>Download places.js. Upload it to GitHub to update your public map, notes and photos included</small></button>
        <button id="restore" type="button">Restore<small>Replace your places with a backup file</small></button>
        <button id="preview" type="button">See what visitors see<small>Your published list, view only</small></button>`}
        ${readOnly && isEditor ? '<button id="back-to-editing" type="button">Back to editing<small>Return to your own copy</small></button>' : ""}
        ${examples ? '<button id="opt-examples" type="button">Remove examples<small>Clear the sample cards</small></button>' : ""}
        <button id="opt-close" type="button">Back</button>
      </div>
    </div>`;
  overlay.querySelectorAll("[data-city]").forEach((b) => b.addEventListener("click", () => {
    fitPlaces(places.filter((p) => p.city === b.dataset.city));
    leaveOptions();
  }));
  $("#backup")?.addEventListener("click", backUp);
  $("#restore")?.addEventListener("click", () => $("#restore-file").click());
  $("#preview")?.addEventListener("click", () => { location.hash = "view"; });
  $("#back-to-editing")?.addEventListener("click", () => { location.hash = "edit"; });
  $("#opt-examples")?.addEventListener("click", () => {
    places = places.filter((p) => !p.example);
    save();
    leaveOptions();
  });
  $("#opt-close").addEventListener("click", leaveOptions);
  $("#opt-close").focus({ preventScroll: true });
  renderPins();
  renderHud();
  renderHints();
}

function leaveOptions() {
  closeOverlay();
  mode = "list";
  refresh();
}

function backUp() {
  const body = `// Back up of Scran Map. Restore it on the site, or replace places.js with it.\nwindow.SEED_PLACES = ${JSON.stringify(places, null, 2)};\n`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([body], { type: "text/javascript" }));
  a.download = "places.js";
  a.click();
  URL.revokeObjectURL(a.href);
}

$("#restore-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const text = await file.text();
    const list = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
    const valid = Array.isArray(list) && list.every((p) => p.id && p.name && Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (!valid) throw new Error("bad backup");
    if (!confirm(`Replace your ${places.length} places with the ${list.length} in this backup?`)) return;
    places = list.map(migrate);
    save();
    filter = "all";
    leaveOptions();
    fitVisible();
  } catch {
    toast("That file isn't a Scran Map backup. Choose a places.js made with Back up.");
  }
});

/* The controls */

function moveCursor(key) {
  const cards = shelf();
  if (revealed && !cards.length) return;
  if (!revealed) return map.panBy({ left: [-110, 0], right: [110, 0], up: [0, -90], down: [0, 90] }[key], { animate: MOTION });
  const at = cards.findIndex((p) => p.id === cursorId);
  if (at < 0) return setCursor(cards[0].id);
  const grid = $(".deck .grid");
  const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
  const step = { left: -1, right: 1, up: -cols, down: cols }[key];
  const next = at + step;
  if (next >= 0 && next < cards.length) setCursor(cards[next].id);
}

function press(key) {
  if (key === "l") return map.zoomOut();
  if (key === "r") return map.zoomIn();
  if (key === "y") return fitPlaces(visible());
  if (key === "start") {
    if (mode === "review" || readOnly) return;
    if (mode === "detail" || mode === "options") closeOverlay();
    return mode === "form" ? undefined : showForm(null);
  }
  if (key === "log") {
    if (typing() || sliding) return;
    const wasList = mode === "list";
    if (!wasList) closeOverlay();
    mode = "list";
    selectedId = null;
    return setRevealed(wasList ? !revealed : true);
  }
  if (key === "next") {
    if (typing()) return;
    const cards = shelf();
    if (!cards.length) return;
    const next = cards[(cards.findIndex((p) => p.id === navId) + 1) % cards.length];
    navId = next.id;
    flyToPlace(next.id);
    return showDetail(next.id);
  }
  if (key === "select") return mode === "options" ? leaveOptions() : showOptions();

  if (mode === "list") {
    if (["up", "down", "left", "right"].includes(key)) moveCursor(key);
    if (key === "a" && !revealed) setRevealed(true);
    else if (key === "a" && cursorId) { flyToPlace(cursorId); showDetail(cursorId); }
    if (key === "b" && revealed) setRevealed(false);
    if (key === "x") {
      setFilter(FILTER_ORDER[(FILTER_ORDER.indexOf(filter) + 1) % FILTER_ORDER.length]);
    }
  } else if (mode === "detail") {
    if (key === "b") putBack();
    if (key === "a" && !readOnly) showReview(places.find((p) => p.id === selectedId));
    if (key === "up" || key === "down") $(".sheet").scrollBy({ top: key === "up" ? -70 : 70 });
    if (key === "left" || key === "right") {
      const cards = shelf();
      const at = cards.findIndex((p) => p.id === selectedId);
      const next = cards[at + (key === "left" ? -1 : 1)];
      if (next) { flyToPlace(next.id); showDetail(next.id); }
    }
  } else if (mode === "form") {
    if (key === "a") submitPlace();
    if (key === "b") cancelForm();
  } else if (mode === "review") {
    if (key === "a") submitReview();
    if (key === "b") cancelReview();
  } else if (mode === "options" && key === "b") {
    leaveOptions();
  }
}

document.querySelectorAll("[data-key]").forEach((b) => {
  b.addEventListener("mousedown", (e) => e.preventDefault()); // keep focus on the current card
  b.addEventListener("click", () => press(b.dataset.key));
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") return press("b");
  if (e.target.closest("input, textarea, #map")) return;
  const arrow = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" }[e.key];
  if (arrow) {
    e.preventDefault();
    press(arrow);
  }
});

refresh();
fitVisible();
