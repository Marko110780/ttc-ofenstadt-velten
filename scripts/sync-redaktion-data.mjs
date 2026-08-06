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

function isPlaceholderDraftText(text) {
  return String(text ?? "").includes("Bitte Agentenlauf starten");
}

function relevantReportMatch(match) {
  return match?.id && !String(match.id).includes("demo") && match.importStatus === "geprueft";
}

function enrichedWebsiteReport(report, match) {
  if (!match) return report;
  const reportText = isPlaceholderDraftText(report.text) ? "" : String(report.text ?? "").trim();
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
