const state = {
  teams: [],
  previews: [],
  reports: [],
  syncStatus: null
};

const formatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

function byId(id) {
  return document.getElementById(id);
}

async function loadJson(path, fallback) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) return fallback;
    return await response.json();
  } catch {
    return fallback;
  }
}

const textMap = {
  "\u00c3\u00bc": "\u00fc",
  "\u00c3\u0153": "\u00dc",
  "\u00c3\u00b6": "\u00f6",
  "\u00c3\u2013": "\u00d6",
  "\u00c3\u00a4": "\u00e4",
  "\u00c3\u201e": "\u00c4",
  "\u00c3\u0178": "\u00df",
  "\u00c3\u00a9": "\u00e9",
  "\u00c2\u00b7": "\u00b7",
  "\u00e2\u20ac\u201c": "-",
  "\u00e2\u20ac\u017e": "\u201e",
  "\u00e2\u20ac\u0153": "\u201c",
  "\u00e2\u20ac\u2122": "\u2019"
};

function decodeText(value) {
  if (!value) return "";
  return String(value).replace(/\u00c3\u00bc|\u00c3\u0153|\u00c3\u00b6|\u00c3\u2013|\u00c3\u00a4|\u00c3\u201e|\u00c3\u0178|\u00c3\u00a9|\u00c2\u00b7|\u00e2\u20ac\u201c|\u00e2\u20ac\u017e|\u00e2\u20ac\u0153|\u00e2\u20ac\u2122/g, (match) => textMap[match] || match);
}

function normalizeText(value) {
  return decodeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatDate(value) {
  if (!value) return "Termin offen";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return decodeText(value);
  return formatter.format(date);
}

function formatTime(value) {
  if (!value || value === "00:00") return "Uhrzeit zu pr\u00fcfen";
  return `${value} Uhr`;
}

function isGenericHighlight(highlight) {
  const text = normalizeText(highlight);
  return text.includes("aus eingefugtem spielbericht erkannt") || text.includes("aus offiziellem spielbericht");
}

function isPublicReport(report) {
  const id = normalizeText(report.id);
  const importStatus = normalizeText(report.importStatus);
  const character = normalizeText(report.spielcharakter);
  const highlights = report.highlights || [];

  if (id.includes("demo")) return false;
  if (importStatus.includes("ungeprueft")) return false;
  if (importStatus.includes("ungepruft")) return false;
  if (character.includes("noch nicht redaktionell")) return false;
  if (highlights.length > 0 && highlights.every(isGenericHighlight)) return false;

  return true;
}

function sourceBadge(text, tone = "neutral") {
  return `<span class="badge ${tone}">${text}</span>`;
}

function createPreviewCard(preview, index) {
  const article = document.createElement("article");
  article.className = index === 0 ? "preview-card featured" : "preview-card";
  const isHome = preview.heimAuswaerts === "Heimspiel";
  const venueClass = isHome ? "home" : "away";
  const title = `${decodeText(preview.teamName || "TTC Ofenstadt Velten")} ${isHome ? "gegen" : "bei"} ${decodeText(preview.gegner || "Gegner offen")}`;

  article.innerHTML = `
    <div class="card-topline">
      ${sourceBadge(decodeText(preview.heimAuswaerts || "Spiel"), venueClass)}
      <span>${decodeText(preview.liga || "Liga offen")}</span>
    </div>
    <h3>${title}</h3>
    <p class="match-date">${formatDate(preview.datum)} &middot; ${formatTime(preview.uhrzeit)}</p>
    <p>${preview.veroeffentlichungen?.length ? "Vorschau liegt im Redaktions-Snapshot vor." : "Noch nicht redaktionell f\u00fcr alle Kan\u00e4le vorbereitet."}</p>
  `;
  return article;
}

function createReportItem(report) {
  const article = document.createElement("article");
  article.className = "report-item";
  const result = decodeText(report.ergebnis || "ohne Ergebnis");
  const home = decodeText(report.heimMannschaft || "TTC Ofenstadt Velten");
  const away = decodeText(report.gastMannschaft || report.gegner || "Gegner offen");
  const highlights = (report.highlights || []).filter((highlight) => highlight && !isGenericHighlight(highlight)).slice(0, 3);

  article.innerHTML = `
    <div class="report-date">
      <strong>${formatDate(report.datum)}</strong>
      ${sourceBadge("fertig", "ok")}
    </div>
    <div>
      <h3>${home} ${result} ${away}</h3>
      <p class="muted">${decodeText(report.liga || "Liga offen")} &middot; ${decodeText(report.heimAuswaerts || "Spielort offen")}</p>
      ${
        highlights.length
          ? `<ul>${highlights.map((highlight) => `<li>${decodeText(highlight)}</li>`).join("")}</ul>`
          : `<p class="muted">Zu diesem fertigen Bericht sind aktuell keine Highlights hinterlegt.</p>`
      }
      <a class="inline-card-link" href="spielberichte.html">Zur Berichtsliste</a>
    </div>
  `;
  return article;
}

function createTeamItem(team) {
  const article = document.createElement("article");
  article.className = "team-item";
  article.innerHTML = `
    <h3>${decodeText(team.name)}</h3>
    <p>${decodeText(team.liga)}</p>
    <span>${decodeText(team.saison)}</span>
    <a href="mannschaften.html">Details</a>
  `;
  return article;
}

function renderHeroMatch() {
  const target = byId("hero-match");
  const next = state.previews[0];
  if (!target || !next) return;
  target.innerHTML = `
    <strong>${decodeText(next.teamName || "TTC Ofenstadt Velten")}</strong>
    <span>${decodeText(next.heimAuswaerts === "Heimspiel" ? "gegen" : "bei")} ${decodeText(next.gegner)}</span>
    <small>${formatDate(next.datum)} &middot; ${formatTime(next.uhrzeit)}</small>
  `;
}

function render() {
  renderHeroMatch();

  const previewNodes = state.previews.slice(0, 5).map(createPreviewCard);
  byId("preview-list").replaceChildren(...previewNodes);

  const reportNodes = state.reports.filter(isPublicReport).slice(0, 6).map(createReportItem);
  byId("report-list").replaceChildren(...reportNodes);

  const teamNodes = state.teams.map(createTeamItem);
  byId("team-list").replaceChildren(...teamNodes);
}

async function main() {
  const [teams, previews, reports, syncStatus] = await Promise.all([
    loadJson("/content/mannschaften.json", []),
    loadJson("/content/vorschauen.json", []),
    loadJson("/content/spiele.json", []),
    loadJson("/content/sync-status.json", null)
  ]);

  state.teams = teams;
  state.previews = previews;
  state.reports = reports;
  state.syncStatus = syncStatus;
  render();
}

main();


