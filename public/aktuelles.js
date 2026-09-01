const formatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

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

function formatDate(value) {
  if (!value) return "Termin offen";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return decodeText(value);
  return formatter.format(date);
}

function formatTime(value) {
  if (!value || value === "00:00") return "Uhrzeit zu prüfen";
  return `${value} Uhr`;
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

function articleParagraphs(text) {
  return decodeText(text)
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function createArticleItem(article, index) {
  const item = document.createElement("article");
  item.className = index === 0 ? "news-feature-card featured" : "news-feature-card";
  const title = decodeText(article.titel || "Aktuelle Meldung");
  const rubrik = decodeText(article.rubrik || "Verein");
  const dateText = article.veroeffentlichtAm
    ? new Date(article.veroeffentlichtAm).toLocaleDateString("de-DE")
    : "";

  item.innerHTML = `
    <span class="badge ${index === 0 ? "home" : "ok"}">${rubrik}</span>
    <h2>${title}</h2>
    ${dateText ? `<p class="muted">${dateText}</p>` : ""}
    <div class="article-detail-text">
      ${articleParagraphs(article.text).map((paragraph) => `<p>${paragraph}</p>`).join("")}
    </div>
  `;
  return item;
}

function createMatchItem(preview) {
  const article = document.createElement("article");
  article.className = "news-match-card";
  const isHome = preview.heimAuswaerts === "Heimspiel";
  const channelCount = preview.veroeffentlichungen?.length || 0;
  const channelText = channelCount === 1
    ? "Für 1 Kanal vorbereitet."
    : channelCount > 1
      ? `Für ${channelCount} Kanäle vorbereitet.`
      : "Noch nicht redaktionell für Kanäle vorbereitet.";

  article.innerHTML = `
    <div class="card-topline">
      <span class="badge ${isHome ? "home" : "away"}">${decodeText(preview.heimAuswaerts || "Spiel")}</span>
      <span>${decodeText(preview.liga || "Liga offen")}</span>
    </div>
    <h2>${decodeText(preview.teamName || "TTC Ofenstadt Velten")} ${isHome ? "gegen" : "bei"} ${decodeText(preview.gegner || "Gegner offen")}</h2>
    <p class="muted">${formatDate(preview.datum)} · ${formatTime(preview.uhrzeit)}</p>
    <p>${channelText}</p>
  `;

  return article;
}

async function main() {
  const articleTarget = document.getElementById("news-article-list");
  const matchTarget = document.getElementById("news-match-list");
  const [previews, articlesPayload] = await Promise.all([
    loadJson("content/vorschauen.json", []),
    loadJson("content/artikel.json", { artikel: [] })
  ]);

  const articles = Array.isArray(articlesPayload.artikel)
    ? articlesPayload.artikel.filter((article) => String(article.text || "").trim())
    : [];
  const sortedArticles = articles
    .sort((a, b) => String(b.veroeffentlichtAm || b.aktualisiertAm || "").localeCompare(String(a.veroeffentlichtAm || a.aktualisiertAm || "")))
    .slice(0, 4);

  if (articleTarget) {
    if (sortedArticles.length) {
      articleTarget.replaceChildren(...sortedArticles.map(createArticleItem));
    } else {
      articleTarget.innerHTML = "<p class=\"muted\">Noch keine veröffentlichten Artikel aus dem Redaktionstool vorhanden.</p>";
    }
  }

  const sortedPreviews = previews
    .sort((a, b) => String(a.datum || "").localeCompare(String(b.datum || "")))
    .slice(0, 8);

  if (!matchTarget) return;
  if (!sortedPreviews.length) {
    matchTarget.innerHTML = "<p class=\"muted\">Keine kommenden Spiele im Redaktionsstand gefunden.</p>";
    return;
  }

  matchTarget.replaceChildren(...sortedPreviews.map(createMatchItem));
}

main();
