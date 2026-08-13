async function loadJson(path, fallback) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) return fallback;
    return await response.json();
  } catch {
    return fallback;
  }
}

function createSponsorCard(sponsor) {
  const card = document.createElement(sponsor.websiteUrl ? "a" : "article");
  card.className = "sponsor-detail-card";
  if (sponsor.websiteUrl) {
    card.href = sponsor.websiteUrl;
    card.target = "_blank";
    card.rel = "noreferrer";
  }

  const image = document.createElement("img");
  image.src = sponsor.logo;
  image.alt = sponsor.name;
  card.appendChild(image);

  if (sponsor.beschreibung || sponsor.kategorie) {
    const meta = document.createElement("div");
    meta.className = "sponsor-card-meta";
    meta.innerHTML = `
      <strong>${sponsor.name}</strong>
      ${sponsor.kategorie ? `<span>${sponsor.kategorie}</span>` : ""}
      ${sponsor.beschreibung ? `<p>${sponsor.beschreibung}</p>` : ""}
    `;
    card.appendChild(meta);
  }

  return card;
}

async function main() {
  const target = document.querySelector("#sponsors-page-shell");
  if (!target) return;
  const payload = await loadJson("content/sponsoren.json", { sponsoren: [] });
  const sponsoren = Array.isArray(payload.sponsoren) ? payload.sponsoren.filter((sponsor) => sponsor.logo) : [];
  target.replaceChildren(...sponsoren.map(createSponsorCard));
}

main();
