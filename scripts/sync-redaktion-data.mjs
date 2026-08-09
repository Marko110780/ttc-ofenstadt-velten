import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const sourceRoot = process.env.REDAKTION_DATA_DIR ?? "G:\\Projekte\\TTC-Spielbericht-Agent\\data";
const websiteExportPath = process.env.REDAKTION_WEBSITE_EXPORT
  ?? "G:\\Projekte\\TTC-Spielbericht-Agent\\public\\exports\\website-spielberichte.json";
const targetRoot = join(process.cwd(), "public", "content");
const targetImageRoot = join(targetRoot, "bilder");

async function readJson(fileName) {
  return JSON.parse(await readFile(join(sourceRoot, fileName), "utf8"));
}

function sortByDateDesc(items) {
  return [...items].sort((a, b) => String(b.datum ?? "").localeCompare(String(a.datum ?? "")));
}

function sortByDateAsc(items) {
  return [...items].sort((a, b) => String(a.datum ?? "").localeCompare(String(b.datum ?? "")));
}

function summarizeGame(game) {
  return {
    id: game.id,
    teamId: game.teamId ?? "",
    datum: game.datum ?? "",
    liga: game.liga ?? "",
    gegner: game.gegner ?? "",
    heimAuswaerts: game.heimAuswaerts ?? "",
    heimMannschaft: game.heimMannschaft ?? "",
    gastMannschaft: game.gastMannschaft ?? "",
    ergebnis: game.ergebnis ?? "",
    spielcharakter: game.spielcharakter ?? "",
    importStatus: game.importStatus ?? "",
    geprueftAm: game.geprueftAm ?? "",
    summen: game.summen ?? {},
    bild: normalizeImage(game.bild),
    highlights: Array.isArray(game.spielverlauf)
      ? game.spielverlauf
          .filter((entry) => entry.analyseHinweis)
          .slice(0, 3)
          .map((entry) => entry.analyseHinweis)
      : []
  };
}

function normalizeImage(image) {
  if (!image?.pfad) return null;
  return {
    ...image,
    pfad: image.pfad.replace(/^\/data\//, "/content/")
  };
}

function normalizeWebsiteReportImage(path) {
  const normalized = String(path ?? "")
    .replace(/^\/data\//, "content/")
    .replace(/^\/content\//, "content/");
  return normalized.endsWith(".svg") ? "" : normalized;
}

function parseScore(value) {
  const [left, right] = String(value ?? "")
    .split(":")
    .map((part) => Number.parseInt(part.trim(), 10));
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return { left, right };
}

function clubSide(match) {
  if (String(match.heimMannschaft ?? "").includes("TTC Ofenstadt Velten")) return "heim";
  if (String(match.gastMannschaft ?? "").includes("TTC Ofenstadt Velten")) return "gast";
  return match.heimAuswaerts === "Heimspiel" ? "heim" : "gast";
}

function clubTeamName(match) {
  return clubSide(match) === "heim"
    ? match.heimMannschaft || "TTC Ofenstadt Velten"
    : match.gastMannschaft || "TTC Ofenstadt Velten";
}

function opponentTeamName(match) {
  return clubSide(match) === "heim"
    ? match.gastMannschaft || match.gegner || "den Gegner"
    : match.heimMannschaft || match.gegner || "den Gegner";
}

function matchOutcome(match) {
  const score = parseScore(match.ergebnis ?? match.summen?.endstand);
  if (!score) return "offen";
  if (score.left === score.right) return "unentschieden";
  const side = clubSide(match);
  const won = side === "heim" ? score.left > score.right : score.right > score.left;
  return won ? "sieg" : "niederlage";
}

function playerNames(players) {
  return players.map((player) => player?.name).filter(Boolean).join(", ");
}

function countClubWins(match) {
  const side = clubSide(match);
  return (match.spielverlauf ?? []).filter((entry) => entry.sieger === side).length;
}

function importantGames(match) {
  const side = clubSide(match);
  return (match.spielverlauf ?? [])
    .filter((entry) => {
      const score = parseScore(entry.satzErgebnis);
      const totalSets = score ? score.left + score.right : 0;
      return entry.sieger === side || totalSets >= 5 || String(entry.zwischenstand ?? "") === String(match.ergebnis ?? "");
    })
    .slice(0, 4);
}

function describeGame(entry) {
  const home = Array.isArray(entry.heim) ? entry.heim.join(" / ") : "Heim";
  const guest = Array.isArray(entry.gast) ? entry.gast.join(" / ") : "Gast";
  const sets = Array.isArray(entry.saetze) && entry.saetze.length ? ` (${entry.saetze.join(", ")})` : "";
  const stand = entry.zwischenstand ? `, Zwischenstand ${entry.zwischenstand}` : "";
  return `${home} gegen ${guest} ${entry.satzErgebnis || ""}${sets}${stand}`.trim();
}

function generatedWebsiteReportText(match) {
  if (!Array.isArray(match.spielverlauf) || !match.spielverlauf.length) return "";

  const club = clubTeamName(match);
  const opponent = opponentTeamName(match);
  const result = match.ergebnis ?? match.summen?.endstand ?? "ohne erfassten Endstand";
  const outcome = matchOutcome(match);
  const venue = match.heimAuswaerts === "Heimspiel" ? "zu Hause" : match.heimAuswaerts === "Auswaertsspiel" || match.heimAuswaerts === "Auswärtsspiel" ? "auswärts" : "im Spiel";
  const resultSentence = outcome === "sieg"
    ? `${club} setzte sich ${venue} gegen ${opponent} mit ${result} durch.`
    : outcome === "niederlage"
      ? `${club} musste sich ${venue} gegen ${opponent} mit ${result} geschlagen geben.`
      : outcome === "unentschieden"
        ? `${club} trennte sich ${venue} von ${opponent} mit einem ${result}.`
        : `${club} spielte ${venue} gegen ${opponent}; der Endstand lautet ${result}.`;

  const clubWins = countClubWins(match);
  const totalGames = match.spielverlauf.length;
  const lineups = [
    match.aufstellungHeim?.length ? `${match.heimMannschaft || "Heim"}: ${playerNames(match.aufstellungHeim)}` : "",
    match.aufstellungGast?.length ? `${match.gastMannschaft || "Gast"}: ${playerNames(match.aufstellungGast)}` : ""
  ].filter(Boolean);
  const keyLines = importantGames(match).map(describeGame);

  return [
    resultSentence,
    "",
    `Der Spielverlauf ist aus dem offiziellen Spielbericht übernommen. Von ${totalGames} ausgetragenen Partien gingen ${clubWins} an den TTC. In den Sätzen wurde ${match.summen?.saetze ?? "kein Satzverhältnis"} notiert, bei den Bällen ${match.summen?.baelle ?? "kein Ballverhältnis"}.`,
    "",
    keyLines.length
      ? `Auffällige Partien im Verlauf waren: ${keyLines.join("; ")}.`
      : "Der detaillierte Verlauf ist in der Übersicht unten einzeln aufgeführt.",
    "",
    lineups.length ? `Die Aufstellungen: ${lineups.join(". ")}.` : "Die Aufstellungen sind im Detailbereich aufgeführt.",
    "",
    "Dieser Bericht wurde aus den geprüften Spieldaten des Redaktionstools für die Website aufbereitet."
  ].join("\n");
}
function isPlaceholderDraftText(text) {
  return String(text ?? "").includes("Bitte Agentenlauf starten");
}

function relevantReportMatch(match) {
  return match?.id && !String(match.id).includes("demo") && match.importStatus === "geprueft";
}

function enrichedWebsiteReport(report, match) {
  if (!match) return report;
  const exportedText = isPlaceholderDraftText(report.text) ? "" : String(report.text ?? "").trim();
  const reportText = exportedText || generatedWebsiteReportText(match);
  return {
    ...report,
    teamId: match.teamId ?? report.teamId ?? "",
    spielcharakter: match.spielcharakter ?? report.spielcharakter ?? "",
    importStatus: match.importStatus ?? report.importStatus ?? "",
    heimMannschaft: match.heimMannschaft ?? report.heimMannschaft ?? "",
    gastMannschaft: match.gastMannschaft ?? report.gastMannschaft ?? "",
    ergebnis: match.ergebnis ?? report.ergebnis ?? match.summen?.endstand ?? "",
    summen: match.summen ?? report.summen ?? null,
    aufstellungHeim: Array.isArray(match.aufstellungHeim) ? match.aufstellungHeim : [],
    aufstellungGast: Array.isArray(match.aufstellungGast) ? match.aufstellungGast : [],
    spielverlauf: Array.isArray(match.spielverlauf) ? match.spielverlauf : [],
    text: reportText,
    bild: normalizeWebsiteReportImage(report.bild || match.bild?.pfad)
  };
}
async function readWebsiteReports() {
  try {
    const payload = JSON.parse(await readFile(websiteExportPath, "utf8"));
    const reports = Array.isArray(payload?.spielberichte) ? payload.spielberichte : [];
    return {
      ...payload,
      sourcePath: websiteExportPath,
      spielberichte: reports
        .filter((report) => report?.id && !String(report.id).includes("demo"))
        .map((report) => ({
          ...report,
          bild: normalizeWebsiteReportImage(report.bild)
        }))
    };
  } catch {
    return {
      exportTyp: "ttc-website-spielberichte",
      verein: "TTC Ofenstadt Velten",
      sourcePath: websiteExportPath,
      erstelltAm: new Date().toISOString(),
      anzahl: 0,
      spielberichte: []
    };
  }
}

async function copyGeneratedImages(items) {
  await mkdir(targetImageRoot, { recursive: true });
  const copied = new Set();
  for (const item of items) {
    const imageValue = typeof item.bild === "string" ? item.bild : item.bild?.pfad;
    const fileName = item.bild?.dateiname ?? basename(String(imageValue ?? ""));
    if (!fileName || copied.has(fileName)) continue;
    copied.add(fileName);
    try {
      await copyFile(join(sourceRoot, "bilder", fileName), join(targetImageRoot, basename(fileName)));
    } catch {
      // Einzelne Bilder duerfen fehlen; Inhalte bleiben trotzdem sichtbar.
    }
  }
}

async function main() {
  const [teams, games, previews] = await Promise.all([
    readJson("mannschaften.json"),
    readJson("spiele.json"),
    readJson("vorschauen.json")
  ]);
  const websiteReports = await readWebsiteReports();

  const summarizedGames = sortByDateDesc(games).filter((game) => !String(game.id ?? "").includes("demo")).map(summarizeGame);
  const gameById = new Map(games.filter(relevantReportMatch).map((game) => [game.id, game]));
  websiteReports.spielberichte = sortByDateDesc(
    websiteReports.spielberichte
      .filter((report) => report?.id && !String(report.id).includes("demo"))
      .map((report) => enrichedWebsiteReport(report, gameById.get(report.id)))
      .filter((report) => report.importStatus === "geprueft" || String(report.text || "").trim())
  );
  websiteReports.anzahl = websiteReports.spielberichte.length;

  const normalizedPreviews = sortByDateAsc(previews).map((preview) => ({
    ...preview,
    bild: normalizeImage(preview.bild)
  }));

  await mkdir(targetRoot, { recursive: true });
  await copyGeneratedImages([...summarizedGames, ...normalizedPreviews, ...websiteReports.spielberichte]);

  await writeFile(join(targetRoot, "mannschaften.json"), `${JSON.stringify(teams, null, 2)}\n`, "utf8");
  await writeFile(join(targetRoot, "spiele.json"), `${JSON.stringify(summarizedGames, null, 2)}\n`, "utf8");
  await writeFile(join(targetRoot, "spielberichte.json"), `${JSON.stringify(websiteReports, null, 2)}\n`, "utf8");
  await writeFile(join(targetRoot, "vorschauen.json"), `${JSON.stringify(normalizedPreviews, null, 2)}\n`, "utf8");
  await writeFile(join(targetRoot, "sync-status.json"), `${JSON.stringify({
    sourceRoot,
    websiteExportPath,
    syncedAt: new Date().toISOString(),
    teams: teams.length,
    games: summarizedGames.length,
    publicReports: websiteReports.spielberichte.length,
    previews: normalizedPreviews.length
  }, null, 2)}\n`, "utf8");

  console.log(`Synchronisiert: ${teams.length} Mannschaften, ${summarizedGames.length} Spiele, ${websiteReports.spielberichte.length} freigegebene Spielberichte, ${normalizedPreviews.length} Vorschauen.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
