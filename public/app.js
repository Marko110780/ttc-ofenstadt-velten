const state = {
  teams: [],
  previews: [],
  reports: [],
  articles: [],
  sponsors: [],
  activeArticleId: "",
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

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isUpcomingPreview(preview) {
  const date = String(preview?.datum || "");
  return date >= todayIso();
}

function previewIdentity(preview) {
  return [
    preview?.teamName,
    preview?.gegner,
    preview?.heimAuswaerts,
    preview?.liga,
    preview?.uhrzeit
  ].map(normalizeText).join("|");
}

function previewScanTime(preview) {
  const time = new Date(preview?.gescanntAm || "").getTime();
  return Number.isNaN(time) ? 0 : time;
}

function shouldReplacePreview(current, candidate) {
  const currentScan = previewScanTime(current);
  const candidateScan = previewScanTime(candidate);
  if (candidateScan !== currentScan) return candidateScan > currentScan;
  return String(candidate.datum || "") < String(current.datum || "");
}

function dedupePreviews(previews) {
  const byIdentity = new Map();
  previews.forEach((preview) => {
    const key = previewIdentity(preview);
    const current = byIdentity.get(key);
    if (!current || shouldReplacePreview(current, preview)) {
      byIdentity.set(key, preview);
    }
  });
  return Array.from(byIdentity.values());
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
  const teaser = decodeText(report.teaser || firstParagraph(report.text));

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
          : `<p>${teaser}</p>`
      }
      <a class="inline-card-link" href="spielberichte.html">Zur Berichtsliste</a>
    </div>
  `;
  return article;
}

function firstParagraph(text) {
  return decodeText(text)
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .find(Boolean) || "";
}

function articleParagraphs(text) {
  return decodeText(text)
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function createArticleItem(item, index) {
  const article = document.createElement("button");
  article.type = "button";
  article.className = index === 0 ? "article-card featured" : "article-card";
  if (state.activeArticleId === item.id) article.classList.add("active");
  const title = decodeText(item.titel || "Aktuelle Meldung");
  const rubrik = decodeText(item.rubrik || "Verein");
  const teaser = decodeText(item.teaser || firstParagraph(item.text));
  const dateText = item.veroeffentlichtAm
    ? new Date(item.veroeffentlichtAm).toLocaleDateString("de-DE")
    : item.aktualisiertAm
      ? new Date(item.aktualisiertAm).toLocaleDateString("de-DE")
      : "";

  article.innerHTML = `
    <div class="card-topline">
      ${sourceBadge(rubrik, index === 0 ? "home" : "ok")}
      ${dateText ? `<span>${dateText}</span>` : ""}
    </div>
    <h3>${title}</h3>
    <p>${teaser}</p>
    <span class="inline-card-link">${state.activeArticleId === item.id ? "Meldung schließen" : "Meldung lesen"}</span>
  `;
  article.addEventListener("click", () => {
    state.activeArticleId = state.activeArticleId === item.id ? "" : item.id;
    renderArticles();
  });
  return article;
}

function renderArticleDetail(item) {
  const target = byId("article-detail");
  if (!target) return;
  if (!item) {
    target.hidden = true;
    target.innerHTML = "";
    return;
  }

  const paragraphs = articleParagraphs(item.text);
  const title = decodeText(item.titel || "Aktuelle Meldung");
  const rubrik = decodeText(item.rubrik || "Verein");
  const dateText = item.veroeffentlichtAm
    ? new Date(item.veroeffentlichtAm).toLocaleDateString("de-DE")
    : "";
  target.hidden = false;
  target.innerHTML = `
    <div class="card-topline">
      ${sourceBadge(rubrik, "home")}
      ${dateText ? `<span>${dateText}</span>` : ""}
    </div>
    <h3>${title}</h3>
    <div class="article-detail-text">
      ${paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}
    </div>
  `;
}

function renderArticles() {
  const articleSection = byId("artikel");
  const visibleArticles = state.articles.slice(0, 3);
  const articleNodes = visibleArticles.map(createArticleItem);
  if (articleSection) articleSection.hidden = articleNodes.length === 0;
  byId("article-list")?.replaceChildren(...articleNodes);
  renderArticleDetail(visibleArticles.find((article) => article.id === state.activeArticleId));
}

function createTeamItem(team) {
  const card = document.createElement(team.sourceUrl ? "a" : "article");
  card.className = "team-item linked-card";
  if (team.sourceUrl) {
    card.href = team.sourceUrl;
    card.target = "_blank";
    card.rel = "noreferrer";
  }
  card.innerHTML = `
    <h3>${decodeText(team.name)}</h3>
    <p>${decodeText(team.liga)}</p>
    <span>${decodeText(team.saison)}</span>
    <strong>myTischtennis öffnen</strong>
  `;
  return card;
}

function createSponsorFigure(sponsor) {
  const figure = document.createElement("figure");
  const image = document.createElement("img");
  image.src = sponsor.logo;
  image.alt = decodeText(sponsor.name);
  figure.appendChild(image);
  if (sponsor.websiteUrl) {
    const link = document.createElement("a");
    link.href = sponsor.websiteUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.setAttribute("aria-label", `${decodeText(sponsor.name)} öffnen`);
    link.appendChild(figure);
    return link;
  }
  return figure;
}

function renderSponsors() {
  const target = byId("sponsor-strip");
  if (!target) return;
  const nodes = state.sponsors.filter((sponsor) => sponsor.logo).map(createSponsorFigure);
  target.replaceChildren(...nodes);
}

function renderHeroMatch() {
  const target = byId("hero-match");
  const next = state.previews[0];
  if (!target) return;
  if (!next) {
    target.innerHTML = `
      <strong>Keine kommenden Spiele</strong>
      <span>Der nächste Termin erscheint nach dem nächsten Redaktions-Snapshot.</span>
    `;
    return;
  }
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

  renderArticles();

  const reportNodes = state.reports.filter(isPublicReport).slice(0, 6).map(createReportItem);
  byId("report-list").replaceChildren(...reportNodes);

  const teamNodes = state.teams.map(createTeamItem);
  byId("team-list").replaceChildren(...teamNodes);

  renderSponsors();
}

async function main() {
  const [teams, previews, reportsPayload, articlesPayload, sponsorsPayload, syncStatus] = await Promise.all([
    loadJson("content/mannschaften.json", []),
    loadJson("content/vorschauen.json", []),
    loadJson("content/spielberichte.json", { spielberichte: [] }),
    loadJson("content/artikel.json", { artikel: [] }),
    loadJson("content/sponsoren.json", { sponsoren: [] }),
    loadJson("content/sync-status.json", null)
  ]);

  state.teams = teams;
  state.previews = dedupePreviews(previews.filter(isUpcomingPreview))
    .sort((a, b) => String(a.datum || "").localeCompare(String(b.datum || "")));
  state.reports = Array.isArray(reportsPayload?.spielberichte) ? reportsPayload.spielberichte : [];
  state.articles = Array.isArray(articlesPayload?.artikel) ? articlesPayload.artikel : [];
  state.sponsors = Array.isArray(sponsorsPayload?.sponsoren) ? sponsorsPayload.sponsoren : [];
  state.syncStatus = syncStatus;
  render();
}

main();



