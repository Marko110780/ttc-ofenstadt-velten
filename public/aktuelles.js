const formatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const textMap = {
  "Ã¼": "Ã¼",
  "ÃƒÅ“": "Ãœ",
  "Ã¶": "Ã¶",
  "Ã–": "Ã–",
  "Ã¤": "Ã¤",
  "Ã„": "Ã„",
  "ÃŸ": "ÃŸ",
  "-": "-",
  "ÃƒÆ’Ã‚Â¼": "Ã¼",
  "ÃƒÆ’Ã…â€œ": "Ãœ",
  "ÃƒÆ’Ã‚Â¶": "Ã¶",
  "ÃƒÆ’-": "Ã–",
  "ÃƒÆ’Ã‚Â¤": "Ã¤",
  "ÃƒÆ’â€ž": "Ã„",
  "ÃƒÆ’Ã…Â¸": "ÃŸ"
};

function decodeText(value) {
  if (!value) return "";
  return String(value).replace(/Ã¼|ÃƒÅ“|Ã¶|Ã–|Ã¤|Ã„|ÃŸ|-|ÃƒÆ’Ã‚Â¼|ÃƒÆ’Ã…â€œ|ÃƒÆ’Ã‚Â¶|ÃƒÆ’-|ÃƒÆ’Ã‚Â¤|ÃƒÆ’â€ž|ÃƒÆ’Ã…Â¸/g, (match) => textMap[match] || match);
}

function formatDate(value) {
  if (!value) return "Termin offen";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return decodeText(value);
  return formatter.format(date);
}

function formatTime(value) {
  if (!value || value === "00:00") return "Uhrzeit zu prÃ¼fen";
  return `${value} Uhr`;
}

async function loadPreviews() {
  const response = await fetch("content/vorschauen.json", { cache: "no-store" });
  if (!response.ok) return [];
  return response.json();
}

function createMatchItem(preview) {
  const article = document.createElement("article");
  article.className = "news-match-card";
  const isHome = preview.heimAuswaerts === "Heimspiel";
  const channelCount = preview.veroeffentlichungen?.length || 0;

  article.innerHTML = `
    <div class="card-topline">
      <span class="badge ${isHome ? "home" : "away"}">${decodeText(preview.heimAuswaerts || "Spiel")}</span>
      <span>${decodeText(preview.liga || "Liga offen")}</span>
    </div>
    <h2>${decodeText(preview.teamName || "TTC Ofenstadt Velten")} ${isHome ? "gegen" : "bei"} ${decodeText(preview.gegner || "Gegner offen")}</h2>
    <p class="muted">${formatDate(preview.datum)} Â· ${formatTime(preview.uhrzeit)}</p>
    <p>${channelCount ? `FÃ¼r ${channelCount} Kanal/KanÃ¤le vorbereitet.` : "Noch nicht redaktionell fÃ¼r KanÃ¤le vorbereitet."}</p>
  `;

  return article;
}

async function main() {
  const target = document.getElementById("news-match-list");
  const previews = await loadPreviews();
  const sorted = previews.sort((a, b) => String(a.datum || "").localeCompare(String(b.datum || ""))).slice(0, 8);

  if (!sorted.length) {
    target.innerHTML = "<p class=\"muted\">Keine kommenden Spiele im lokalen Snapshot gefunden.</p>";
    return;
  }

  target.replaceChildren(...sorted.map(createMatchItem));
}

main();


