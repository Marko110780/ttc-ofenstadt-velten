const target = document.querySelector("#galleryDocuments");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pdfHref(value) {
  const path = String(value ?? "").trim();
  if (!path) return "";
  return path.replace(/^\/content\//, "content/");
}

function renderDocuments(documents) {
  if (!target) return;
  if (!documents.length) {
    target.innerHTML = `
      <article class="document-card">
        <span class="badge home">PDF</span>
        <h2>Noch keine Dokumente</h2>
        <p>Die Galerie wird im Redaktionstool vorbereitet.</p>
      </article>`;
    return;
  }

  target.innerHTML = documents.map((document) => {
    const href = pdfHref(document.pdf);
    const action = href
      ? `<a class="secondary-link" href="${escapeHtml(href)}" target="_blank" rel="noopener">PDF öffnen</a>`
      : `<span class="document-missing">PDF noch nicht hinterlegt</span>`;
    return `
      <article class="document-card ${href ? "" : "document-card-muted"}">
        <span class="badge home">${escapeHtml(document.kategorie || "PDF")}</span>
        <h2>${escapeHtml(document.titel)}</h2>
        <p>${escapeHtml(document.beschreibung || "Dokument aus dem Redaktionstool.")}</p>
        ${action}
      </article>`;
  }).join("");
}

async function init() {
  try {
    const response = await fetch("content/galerie.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Galerie konnte nicht geladen werden.");
    const payload = await response.json();
    const documents = Array.isArray(payload?.dokumente) ? payload.dokumente : [];
    renderDocuments(documents);
  } catch {
    renderDocuments([]);
  }
}

init();
