// Keep editorial source data separate from the files served to website visitors.
// Preview cards need match facts, not opponent profiles or cross-channel drafts.
const previewFields = [
  "id", "teamId", "teamName", "datum", "uhrzeit", "gegner",
  "heimAuswaerts", "liga", "gescanntAm", "spielStatus", "websiteSichtbar"
];
const statusFields = [
  "syncedAt", "teams", "games", "publicReports", "publicArticles",
  "sponsors", "galleryDocuments", "previews"
];
const collections = new Map([
  ["spielberichte.json", "spielberichte"], ["artikel.json", "artikel"],
  ["sponsoren.json", "sponsoren"], ["galerie.json", "dokumente"]
]);

function selectScalars(source, fields) {
  const result = {};
  for (const field of fields) {
    const value = source?.[field];
    if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
      result[field] = value;
    }
  }
  return result;
}

export function publicContent(fileName, payload) {
  if (fileName === "vorschauen.json") {
    if (!Array.isArray(payload)) throw new TypeError("Vorschauen müssen eine Liste sein.");
    return payload.filter((preview) => preview && preview.websiteSichtbar !== false)
      .map((preview) => selectScalars(preview, previewFields));
  }
  if (fileName === "sync-status.json") return selectScalars(payload, statusFields);
  const collection = collections.get(fileName);
  if (collection) {
    if (!Array.isArray(payload?.[collection])) throw new TypeError(`Ungültiger Export: ${fileName}`);
    return {
      ...selectScalars(payload, ["exportTyp", "verein", "erstelltAm"]),
      anzahl: payload[collection].length,
      [collection]: payload[collection]
    };
  }
  return payload;
}
