import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { publicContent } from "../scripts/public-content.mjs";

const preview = {
  id: "jugend", teamName: "TTC Jugend", gegner: "Gast Jugend", datum: "2026-10-16",
  uhrzeit: "17:30", liga: "KL Jug15", heimAuswaerts: "Heimspiel",
  spielStatus: "verlegt", gescanntAm: "2026-10-14T12:00:00Z", websiteSichtbar: true,
  gegnerKontext: { besteSpieler: [{ name: "PRIVATE_PERSON", qttr: 1234, portraitUrl: "https://example.test/private" }] },
  veroeffentlichungen: [{ kanal: "facebook", text: "PRIVATE_DRAFT" }],
  redaktionsnotiz: "PRIVATE_NOTE", bild: { pfad: "/data/private.svg", erstelltVon: "PRIVATE_AUTHOR" },
  unknownFutureField: { private: "PRIVATE_FUTURE" }
};

test("Vorschauen behalten Termine, Absagen und Deduplizierung ohne interne Personen- oder Redaktionsdaten", () => {
  const input = [preview, { ...preview, id: "adult", liga: "KL Erw", spielStatus: "abgesagt" },
    { ...preview, id: "hidden", websiteSichtbar: false }];
  const before = structuredClone(input);
  const result = publicContent("vorschauen.json", input);
  assert.equal(result.length, 2);
  assert.equal(result[0].datum, "2026-10-16");
  assert.equal(result[0].uhrzeit, "17:30");
  assert.equal(result[0].spielStatus, "verlegt");
  assert.equal(result[0].gescanntAm, preview.gescanntAm);
  assert.equal(result[1].spielStatus, "abgesagt");
  assert.equal(result[1].liga, "KL Erw");
  assert.ok(!JSON.stringify(result).includes("PRIVATE_"));
  assert.ok(!JSON.stringify(result).includes("portraitUrl"));
  assert.deepEqual(input, before, "Redaktionsdaten dürfen nicht geändert werden");
  assert.deepEqual(publicContent("vorschauen.json", result), result, "Bereinigung ist wiederholbar");
});

test("Öffentliche Metadaten geben keine Quellpfade oder künftigen internen Felder frei", () => {
  const reports = [{ id: "report", text: "Freigegebener Bericht", aufstellungHeim: [{name: "Freigegebener Name"}] }];
  const result = publicContent("spielberichte.json", {
    exportTyp: "ttc-website-spielberichte", verein: "TTC", erstelltAm: "2026-10-14",
    anzahl: 99, sourcePath: "C:/PRIVATE_SOURCE", intern: "PRIVATE_METADATA", spielberichte: reports
  });
  assert.deepEqual(result.spielberichte, reports, "Freigegebene Berichtsinhalte bleiben vollständig");
  assert.equal(result.anzahl, 1);
  assert.ok(!JSON.stringify(result).includes("PRIVATE_"));
  const status = publicContent("sync-status.json", {sourceRoot:"PRIVATE_ROOT", websiteExportPath:"PRIVATE_PATH", syncedAt:"2026-10-14", previews:2});
  assert.deepEqual(status, {syncedAt:"2026-10-14", previews:2});
  assert.deepEqual(publicContent("vorschauen.json", [{ id:"x", teamName:{secret:"PRIVATE_NESTED"} }]), [{id:"x"}]);
  assert.throws(() => publicContent("vorschauen.json", {}), TypeError);
});

test("Vollständiger Sync schreibt bereinigte Dateien und lässt Quelldaten unangetastet", async () => {
  const folder = await mkdtemp(join(tmpdir(), "ttc-public-export-"));
  try {
    const source = join(folder, "source");
    const target = join(folder, "target");
    await mkdir(source); await mkdir(target);
    const fixtures = {
      "mannschaften.json": [{ id:"team", name:"TTC", liga:"KL", saison:"2026/27", sourceUrl:"https://example.test/team" }],
      "spiele.json": [],
      "vorschauen.json": [preview, { ...preview, id:"hidden", websiteSichtbar:false }],
      "reports.json": { sourcePath:"PRIVATE_SOURCE", spielberichte:[{id:"published",text:"Freigegebener Text",datum:"2026-10-10"}] },
      "articles.json": { sourcePath:"PRIVATE_SOURCE", artikel:[{id:"article",text:"Freigegebene Vereinsnachricht"}] },
      "sponsors.json": { sourcePath:"PRIVATE_SOURCE", sponsoren:[] },
      "gallery.json": { sourcePath:"PRIVATE_SOURCE", dokumente:[] }
    };
    for (const [name, content] of Object.entries(fixtures)) await writeFile(join(source, name), JSON.stringify(content));
    execFileSync(process.execPath, [fileURLToPath(new URL("../scripts/sync-redaktion-data.mjs", import.meta.url))], {
      cwd:target, windowsHide:true, env:{...process.env,
        REDAKTION_DATA_DIR:source, REDAKTION_WEBSITE_EXPORT:join(source,"reports.json"),
        REDAKTION_WEBSITE_ARTIKEL_EXPORT:join(source,"articles.json"),
        REDAKTION_WEBSITE_SPONSOREN_EXPORT:join(source,"sponsors.json"),
        REDAKTION_WEBSITE_GALERIE_EXPORT:join(source,"gallery.json")}
    });
    const read = async name => JSON.parse(await readFile(join(target,"public","content",name),"utf8"));
    assert.equal((await read("vorschauen.json")).length,1);
    assert.equal((await read("vorschauen.json"))[0].spielStatus,"verlegt");
    assert.equal((await read("spielberichte.json")).spielberichte[0].text,"Freigegebener Text");
    assert.equal((await read("artikel.json")).artikel[0].text,"Freigegebene Vereinsnachricht");
    assert.equal((await read("sync-status.json")).previews,1);
    for (const name of ["vorschauen.json","spielberichte.json","artikel.json","sponsoren.json","galerie.json","sync-status.json"]) {
      const text = await readFile(join(target,"public","content",name),"utf8");
      assert.ok(!text.includes("PRIVATE_"),name);
      assert.ok(!text.includes("sourcePath"),name);
      assert.ok(!text.includes("sourceRoot"),name);
    }
    for (const [name, content] of Object.entries(fixtures)) {
      assert.deepEqual(JSON.parse(await readFile(join(source,name),"utf8")),content);
    }
  } finally {
    assert.equal(dirname(resolve(folder)), resolve(tmpdir()));
    assert.ok(basename(folder).startsWith("ttc-public-export-"));
    await rm(folder,{recursive:true,force:true});
  }
});
