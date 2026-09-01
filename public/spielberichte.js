const formatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const state = {
  reports: [],
  filteredReports: [],
  openReportIds: new Set()
};

function fixEncoding(value) {
  if (!value) return "";
  try {
    return decodeURIComponent(escape(String(value)));
  } catch {
    return String(value);
  }
}

function normalizeText(value) {
  return fixEncoding(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(value) {
  return fixEncoding(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "Datum offen";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return formatter.format(date);
}

function seasonFor(report) {
  const year = Number.parseInt(String(report.datum || "").slice(0, 4), 10);
  if (!Number.isFinite(year)) return "Ohne Saison";
  return `${year}/${year + 1}`;
}

function reportSearchText(report) {
  return normalizeText([
    report.titel,
    report.mannschaft,
    report.liga,
    report.gegner,
    report.heimAuswaerts,
    report.ergebnis,
    report.teaser,
    report.text
  ].join(" "));
}

async function loadReports() {
  const response = await fetch("content/spielberichte.json", { cache: "no-store" });
  if (!response.ok) return [];
  const payload = await response.json();
  return Array.isArray(payload?.spielberichte) ? payload.spielberichte : [];
}

function createStatCard(label, value) {
  return `
    <article class="stat-card">
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
    </article>
  `;
}

function renderStats(reports) {
  const target = document.getElementById("report-stats");
  const teams = new Set(reports.map((report) => fixEncoding(report.mannschaft)).filter(Boolean));
  const seasons = new Set(reports.map(seasonFor));
  const withText = reports.filter((report) => String(report.text || "").trim()).length;

  target.innerHTML = [
    createStatCard("Berichte", reports.length),
    createStatCard("Mannschaften", teams.size),
    createStatCard("Saisons", seasons.size),
    createStatCard("Mit Langtext", withText)
  ].join("");
}

function renderSeasonOptions(reports) {
  const select = document.getElementById("season-filter");
  const seasons = [...new Set(reports.map(seasonFor))].sort((a, b) => b.localeCompare(a, "de"));
  select.innerHTML = `<option value="">Alle Saisons</option>${seasons
    .map((season) => `<option value="${escapeHtml(season)}">${escapeHtml(season)}</option>`)
    .join("")}`;
}

function renderParagraphs(report) {
  const body = String(report.text || "").trim() || String(report.teaser || "").trim();
  const paragraphs = body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (String(report.text || "").trim()) {
    return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
  }

  return renderGeneratedSummary(report, paragraphs[0] || "");
}

function ttcSide(report) {
  if (String(report.heimMannschaft || "").includes("TTC Ofenstadt Velten")) return "heim";
  if (String(report.gastMannschaft || "").includes("TTC Ofenstadt Velten")) return "gast";
  return "";
}

function resultLabel(report) {
  const [home, away] = String(report.ergebnis || "").split(":").map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(home) || !Number.isFinite(away)) return "Spielbericht";
  if (home === away) return "Unentschieden";
  const side = ttcSide(report);
  const ttcWon = side === "heim" ? home > away : side === "gast" ? away > home : false;
  return ttcWon ? "TTC-Sieg" : "TTC-Niederlage";
}

function renderGeneratedSummary(report, teaser) {
  const sums = report.summen || {};
  const home = report.heimMannschaft || "Heimmannschaft offen";
  const away = report.gastMannschaft || "Gastmannschaft offen";
  const score = report.ergebnis || "ohne erfassten Endstand";
  const balls = sums.baelle ? ` Die Ballpunkte wurden mit ${sums.baelle} notiert.` : "";
  const sets = sums.saetze ? ` In den Saetzen stand es ${sums.saetze}.` : "";
  const character = report.spielcharakter ? ` Einordnung: ${report.spielcharakter}.` : "";

  return `
    <p>${escapeHtml(teaser || `${home} gegen ${away} endete ${score}.`)}</p>
    <p>${escapeHtml(`${resultLabel(report)}: ${home} gegen ${away} endete ${score}.${sets}${balls}${character}`)}</p>
    ${report.spielverlauf?.length ? "" : `<p class="muted">Der ausfuehrliche redaktionelle Langtext wurde fuer diesen Bericht noch nicht exportiert.</p>`}
  `;
}

function renderLineup(players) {
  if (!Array.isArray(players) || !players.length) return "<span>nicht erfasst</span>";
  return players
    .map((player) => `<span>${escapeHtml(player.position ? `${player.position}. ${player.name}` : player.name)}</span>`)
    .join("");
}

function sideNames(entry, side) {
  const names = Array.isArray(entry?.[side]) ? entry[side] : [];
  return names.map(escapeHtml).join(" / ") || "offen";
}

function renderMatchTimeline(report) {
  const rows = Array.isArray(report.spielverlauf) ? report.spielverlauf : [];
  if (!rows.length) return "";

  return `
    <div class="match-detail-section">
      <h3>Spielverlauf</h3>
      <div class="match-timeline">
        ${rows.map((entry) => `
          <article class="match-timeline-row">
            <div>
              <strong>${escapeHtml(entry.typ || "Spiel")}</strong>
              <span>${escapeHtml(entry.paarung || "")}</span>
            </div>
            <p>${sideNames(entry, "heim")} gegen ${sideNames(entry, "gast")}</p>
            <span>${escapeHtml(entry.satzErgebnis || "")} ${entry.saetze?.length ? `(${escapeHtml(entry.saetze.join(", "))})` : ""}</span>
            <small>Zwischenstand: ${escapeHtml(entry.zwischenstand || "offen")}</small>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function renderLineups(report) {
  if (!report.aufstellungHeim?.length && !report.aufstellungGast?.length) return "";
  return `
    <div class="match-detail-section lineup-grid">
      <div>
        <h3>${escapeHtml(report.heimMannschaft || "Heim")}</h3>
        ${renderLineup(report.aufstellungHeim)}
      </div>
      <div>
        <h3>${escapeHtml(report.gastMannschaft || "Gast")}</h3>
        ${renderLineup(report.aufstellungGast)}
      </div>
    </div>
  `;
}

function renderInlineDetail(report) {
  const sums = report.summen || {};
  return `
    <div class="published-report-inline-detail" id="details-${escapeHtml(report.id)}">
      ${report.bild ? `<img class="published-report-detail-image" src="${escapeHtml(report.bild)}" alt="">` : ""}
      <div class="report-meta-grid">
        <span><strong>Heim</strong>${escapeHtml(report.heimMannschaft || "offen")}</span>
        <span><strong>Gast</strong>${escapeHtml(report.gastMannschaft || "offen")}</span>
        <span><strong>Quelle</strong>${escapeHtml(report.quellen?.[0]?.name || "Redaktionstool")}</span>
      </div>
      <div class="published-report-text">${renderParagraphs(report)}</div>
      ${renderLineups(report)}
      ${renderMatchTimeline(report)}
    </div>
  `;
}
function createReportCard(report) {
  const article = document.createElement("article");
  article.className = "report-detail-card status-ready published-report-card";
  article.dataset.reportId = report.id;
  const sums = report.summen || {};
  const isOpen = state.openReportIds.has(report.id);

  article.innerHTML = `
    ${report.bild ? `<img class="published-report-image" src="${escapeHtml(report.bild)}" alt="">` : ""}
    <div class="card-topline">
      <span class="badge ok">Fertiger Bericht</span>
      <span>${formatDate(report.datum)}</span>
    </div>
    <h2>${escapeHtml(report.titel || "Spielbericht")}</h2>
    <p class="muted">${escapeHtml(report.liga || "Liga offen")} &middot; ${escapeHtml(report.heimAuswaerts || "Spielort offen")}</p>
    <div class="report-meta-grid">
      <span><strong>Endstand</strong>${escapeHtml(report.ergebnis || "nicht erfasst")}</span>
      <span><strong>Bälle</strong>${escapeHtml(sums.baelle || "nicht erfasst")}</span>
      <span><strong>Sätze</strong>${escapeHtml(sums.saetze || "nicht erfasst")}</span>
    </div>
    <p>${escapeHtml(report.teaser || "Der Bericht ist freigegeben und kann geöffnet werden.")}</p>
    <button class="button primary report-open-button" type="button" data-report-id="${escapeHtml(report.id)}" aria-expanded="${String(isOpen)}">
      ${isOpen ? "Details ausblenden" : "Details ansehen"}
    </button>
    ${isOpen ? renderInlineDetail(report) : ""}
  `;
  return article;
}

function renderList() {
  const target = document.getElementById("reports-page-list");
  if (!state.filteredReports.length) {
    target.innerHTML = '<p class="muted">Für diese Auswahl sind keine freigegebenen Spielberichte vorhanden.</p>';
    return;
  }

  target.replaceChildren(...state.filteredReports.map(createReportCard));
  target.querySelectorAll(".report-open-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleDetail(button.dataset.reportId);
    });
  });
}

function toggleDetail(reportId) {
  if (state.openReportIds.has(reportId)) {
    state.openReportIds.delete(reportId);
  } else {
    state.openReportIds.add(reportId);
  }
  renderList();
  const card = document.querySelector(`[data-report-id="${CSS.escape(reportId)}"]`);
  card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function applyFilters() {
  const query = normalizeText(document.getElementById("report-search").value.trim());
  const season = document.getElementById("season-filter").value;

  state.filteredReports = state.reports.filter((report) => {
    const matchesQuery = !query || reportSearchText(report).includes(query);
    const matchesSeason = !season || seasonFor(report) === season;
    return matchesQuery && matchesSeason;
  });

  for (const reportId of [...state.openReportIds]) {
    if (!state.filteredReports.some((report) => report.id === reportId)) {
      state.openReportIds.delete(reportId);
    }
  }

  renderList();
}

function openHashDetail() {
  const match = window.location.hash.match(/^#bericht\/(.+)$/);
  if (!match) return;
  const reportIdOrSlug = decodeURIComponent(match[1]);
  const report = state.reports.find((item) => item.id === reportIdOrSlug || item.slug === reportIdOrSlug);
  if (!report) return;
  state.openReportIds.add(report.id);
  renderList();
  document.querySelector(`[data-report-id="${CSS.escape(report.id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function main() {
  const target = document.getElementById("reports-page-list");
  state.reports = (await loadReports())
    .filter((report) => report?.id && !String(report.id).includes("demo"))
    .sort((a, b) => String(b.datum || "").localeCompare(String(a.datum || "")));
  state.filteredReports = [...state.reports];

  if (!state.reports.length) {
    target.innerHTML = '<p class="muted">Aktuell sind noch keine fertigen Spielberichte veröffentlicht.</p>';
    return;
  }

  renderStats(state.reports);
  renderSeasonOptions(state.reports);
  renderList();
  openHashDetail();

  document.getElementById("report-search").addEventListener("input", applyFilters);
  document.getElementById("season-filter").addEventListener("change", applyFilters);
  window.addEventListener("hashchange", openHashDetail);
}

main();
