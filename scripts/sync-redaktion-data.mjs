import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const sourceRoot = process.env.REDAKTION_DATA_DIR ?? "G:\\Projekte\\TTC-Spielbericht-Agent\\data";
const websiteExportPath = process.env.REDAKTION_WEBSITE_EXPORT
  ?? "G:\\Projekte\\TTC-Spielbericht-Agent\\public\\exports\\website-spielberichte.json";
const websiteArtikelExportPath = process.env.REDAKTION_WEBSITE_ARTIKEL_EXPORT
  ?? "G:\\Projekte\\TTC-Spielbericht-Agent\\public\\exports\\website-artikel.json";
const websiteSponsorenExportPath = process.env.REDAKTION_WEBSITE_SPONSOREN_EXPORT
  ?? "G:\\Projekte\\TTC-Spielbericht-Agent\\public\\exports\\website-sponsoren.json";
const websiteGalerieExportPath = process.env.REDAKTION_WEBSITE_GALERIE_EXPORT
  ?? "G:\\Projekte\\TTC-Spielbericht-Agent\\public\\exports\\website-galerie.json";
const targetRoot = join(process.cwd(), "public", "content");
const targetImageRoot = join(targetRoot, "bilder");
const targetSponsorRoot = join(targetRoot, "sponsoren");
const targetGalerieRoot = join(targetRoot, "galerie");

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

async function readWebsiteArticles() {
  try {
    const payload = JSON.parse(await readFile(websiteArtikelExportPath, "utf8"));
    const articles = Array.isArray(payload?.artikel) ? payload.artikel : [];
    return {
      ...payload,
      sourcePath: websiteArtikelExportPath,
      artikel: articles
        .filter((article) => article?.id && String(article.text ?? "").trim())
        .map((article) => ({
          ...article,
          bild: normalizeWebsiteReportImage(article.bild)
        }))
    };
  } catch {
    return {
      exportTyp: "ttc-website-artikel",
      verein: "TTC Ofenstadt Velten",
      sourcePath: websiteArtikelExportPath,
      erstelltAm: new Date().toISOString(),
      anzahl: 0,
      artikel: []
    };
  }
}

async function readWebsiteGalerie() {
  try {
    const payload = JSON.parse(await readFile(websiteGalerieExportPath, "utf8"));
    const dokumente = Array.isArray(payload?.dokumente) ? payload.dokumente : [];
    return {
      ...payload,
      sourcePath: websiteGalerieExportPath,
      dokumente: dokumente
        .filter((dokument) => dokument?.id)
        .map((dokument) => ({
          ...dokument,
          pdf: String(dokument.pdf ?? "").replace(/^\/content\/galerie\//, "content/galerie/")
        }))
    };
  } catch {
    return {
      exportTyp: "ttc-website-galerie",
      verein: "TTC Ofenstadt Velten",
      sourcePath: websiteGalerieExportPath,
      erstelltAm: new Date().toISOString(),
      anzahl: 0,
      dokumente: []
    };
  }
}

async function readWebsiteSponsoren() {
  try {
    const payload = JSON.parse(await readFile(websiteSponsorenExportPath, "utf8"));
    const sponsoren = Array.isArray(payload?.sponsoren) ? payload.sponsoren : [];
    return {
      ...payload,
      sourcePath: websiteSponsorenExportPath,
      sponsoren: sponsoren
        .filter((sponsor) => sponsor?.id && sponsor.logo)
        .map((sponsor) => ({
          ...sponsor,
          logo: String(sponsor.logo ?? "").replace(/^\/content\/sponsoren\//, "content/sponsoren/")
        }))
    };
  } catch {
    return {
      exportTyp: "ttc-website-sponsoren",
      verein: "TTC Ofenstadt Velten",
      sourcePath: websiteSponsorenExportPath,
      erstelltAm: new Date().toISOString(),
      anzahl: 0,
      sponsoren: []
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

async function copyGaleriePdfs(dokumente) {
  await mkdir(targetGalerieRoot, { recursive: true });
  for (const dokument of dokumente) {
    const fileName = dokument.pdfDateiname || basename(String(dokument.pdf ?? ""));
    if (!fileName) continue;
    try {
      await copyFile(join(sourceRoot, "galerie", fileName), join(targetGalerieRoot, basename(fileName)));
      dokument.pdf = `content/galerie/${basename(fileName)}`;
    } catch {
      dokument.pdf = "";
    }
  }
}

async function copySponsorLogos(sponsoren) {
  await mkdir(targetSponsorRoot, { recursive: true });
  for (const sponsor of sponsoren) {
    const fileName = sponsor.logoDateiname || basename(String(sponsor.logo ?? ""));
    if (!fileName) continue;
    try {
      await copyFile(join(sourceRoot, "sponsoren", fileName), join(targetSponsorRoot, basename(fileName)));
      sponsor.logo = `content/sponsoren/${basename(fileName)}`;
    } catch {
      // Einzelne Logos duerfen fehlen; der Sponsor wird dann ohne defektes Bild ausgeliefert.
      sponsor.logo = "";
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
  const websiteArticles = await readWebsiteArticles();
  const websiteSponsoren = await readWebsiteSponsoren();
  const websiteGalerie = await readWebsiteGalerie();

  const summarizedGames = sortByDateDesc(games).filter((game) => !String(game.id ?? "").includes("demo")).map(summarizeGame);
  const gameById = new Map(games.filter(relevantReportMatch).map((game) => [game.id, game]));
  websiteReports.spielberichte = sortByDateDesc(
    websiteReports.spielberichte
      .filter((report) => report?.id && !String(report.id).includes("demo"))
      .map((report) => enrichedWebsiteReport(report, gameById.get(report.id)))
      .filter((report) => report.importStatus === "geprueft" || String(report.text || "").trim())
  );
  websiteReports.anzahl = websiteReports.spielberichte.length;
  websiteArticles.artikel = [...websiteArticles.artikel].sort((a, b) => {
    const left = b.veroeffentlichtAm || b.aktualisiertAm || b.erstelltAm || "";
    const right = a.veroeffentlichtAm || a.aktualisiertAm || a.erstelltAm || "";
    return String(left).localeCompare(String(right));
  });
  websiteArticles.anzahl = websiteArticles.artikel.length;
  websiteSponsoren.sponsoren = [...websiteSponsoren.sponsoren]
    .filter((sponsor) => sponsor.logo)
    .sort((a, b) => Number(a.sortierung ?? 0) - Number(b.sortierung ?? 0) || String(a.name ?? "").localeCompare(String(b.name ?? ""), "de"));

  const normalizedPreviews = sortByDateAsc(previews).map((preview) => ({
    ...preview,
    bild: normalizeImage(preview.bild)
  }));

  await mkdir(targetRoot, { recursive: true });
  await copyGeneratedImages([...summarizedGames, ...normalizedPreviews, ...websiteReports.spielberichte, ...websiteArticles.artikel]);
  await copySponsorLogos(websiteSponsoren.sponsoren);
  await copyGaleriePdfs(websiteGalerie.dokumente);
  websiteSponsoren.sponsoren = websiteSponsoren.sponsoren.filter((sponsor) => sponsor.logo);
  websiteSponsoren.anzahl = websiteSponsoren.sponsoren.length;

  await writeFile(join(targetRoot, "mannschaften.json"), `${JSON.stringify(teams, null, 2)}\n`, "utf8");
  await writeFile(join(targetRoot, "spiele.json"), `${JSON.stringify(summarizedGames, null, 2)}\n`, "utf8");
  await writeFile(join(targetRoot, "spielberichte.json"), `${JSON.stringify(websiteReports, null, 2)}\n`, "utf8");
  await writeFile(join(targetRoot, "artikel.json"), `${JSON.stringify(websiteArticles, null, 2)}\n`, "utf8");
  await writeFile(join(targetRoot, "sponsoren.json"), `${JSON.stringify(websiteSponsoren, null, 2)}\n`, "utf8");
  await writeFile(join(targetRoot, "galerie.json"), `${JSON.stringify(websiteGalerie, null, 2)}\n`, "utf8");
  await writeFile(join(targetRoot, "vorschauen.json"), `${JSON.stringify(normalizedPreviews, null, 2)}\n`, "utf8");
  await writeFile(join(targetRoot, "sync-status.json"), `${JSON.stringify({
    sourceRoot,
    websiteExportPath,
    websiteArtikelExportPath,
    websiteSponsorenExportPath,
    websiteGalerieExportPath,
    syncedAt: new Date().toISOString(),
    teams: teams.length,
    games: summarizedGames.length,
    publicReports: websiteReports.spielberichte.length,
    publicArticles: websiteArticles.artikel.length,
    sponsors: websiteSponsoren.sponsoren.length,
    galleryDocuments: websiteGalerie.dokumente.length,
    previews: normalizedPreviews.length
  }, null, 2)}\n`, "utf8");

  console.log(`Synchronisiert: ${teams.length} Mannschaften, ${summarizedGames.length} Spiele, ${websiteReports.spielberichte.length} freigegebene Spielberichte, ${websiteArticles.artikel.length} freie Artikel, ${websiteSponsoren.sponsoren.length} Sponsoren, ${websiteGalerie.dokumente.length} Galerie-Dokumente, ${normalizedPreviews.length} Vorschauen.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
