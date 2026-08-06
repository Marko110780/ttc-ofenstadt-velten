async function loadTeams() {
  const response = await fetch("content/mannschaften.json", { cache: "no-store" });
  if (!response.ok) return [];
  return response.json();
}

function teamTypeLabel(team) {
  return team.altersbereich === "jugend" ? "Jugend" : "Erwachsene";
}

function createTeamCard(team) {
  const card = document.createElement("a");
  card.className = "team-detail-card linked-card";
  card.href = team.sourceUrl;
  card.target = "_blank";
  card.rel = "noreferrer";
  card.innerHTML = `
    <div class="card-topline">
      <span class="badge ${team.altersbereich === "jugend" ? "away" : "home"}">${teamTypeLabel(team)}</span>
      <span>${team.saison}</span>
    </div>
    <h2>${team.name}</h2>
    <p>${team.liga}</p>
    <span class="inline-card-link">myTischtennis öffnen</span>
  `;
  return card;
}

async function main() {
  const target = document.getElementById("team-overview");
  const teams = await loadTeams();

  if (!teams.length) {
    target.innerHTML = "<p class=\"muted\">Keine Mannschaftsdaten gefunden.</p>";
    return;
  }

  target.replaceChildren(...teams.map(createTeamCard));
}

main();
