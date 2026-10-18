/** Audit metadata and media references without exposing media URLs. */
export function auditProplayerCatalog(records) {
  const errors = [];
  if (!Array.isArray(records)) {
    return { records: 0, references: 0, uniqueAssets: 0, repeatedReferences: 0, noReference: 0, errors: ["catalog_not_array"] };
  }

  const positions = new Set();
  const assets = new Set();
  const referencedAssets = new Set();
  const states = {};
  let references = 0;

  records.forEach((record, index) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      errors.push(`invalid_record:${index + 1}`);
      return;
    }
    if (record.pos != null) {
      if (positions.has(record.pos)) errors.push(`duplicate_position:${index + 1}`);
      positions.add(record.pos);
    }
    if (record.estado_media) states[record.estado_media] = (states[record.estado_media] || 0) + 1;

    const file = typeof record.video_archivo_local === "string" ? record.video_archivo_local : "";
    const urlValue = typeof record.video_url === "string" ? record.video_url : "";
    if (file) {
      if (file !== file.split(/[\\/]/).pop() || !/^[\w.-]+\.mp4$/i.test(file)) {
        errors.push(`invalid_media_filename:${index + 1}`);
      }
      assets.add(file);
    }
    if (urlValue) {
      references += 1;
      try {
        const url = new URL(urlValue);
        const urlFile = decodeURIComponent(url.pathname.split("/").pop() || "");
        if (url.protocol !== "https:") errors.push(`non_https_media_url:${index + 1}`);
        if (!file || urlFile !== file) errors.push(`media_url_filename_mismatch:${index + 1}`);
        if (file) referencedAssets.add(file);
      } catch {
        errors.push(`invalid_media_url:${index + 1}`);
      }
    }
  });

  return {
    records: records.length,
    references,
    uniqueAssets: assets.size,
    uniqueReferencedAssets: referencedAssets.size,
    repeatedReferences: Math.max(0, references - referencedAssets.size),
    noReference: records.length - references,
    states,
    errors,
  };
}
