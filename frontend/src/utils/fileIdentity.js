/**
 * Every upload gets its own identity so two files can share a display name.
 *
 * `documentId` is `<original name>_<yyyy:mm:dd:hh:mm:ss:ms>` and is what the
 * backend stores as the key. `storagePath` is the same idea with a URL-safe
 * timestamp and the extension kept last, so Supabase still serves the object
 * with a sensible name. The original file name is never modified.
 */

const pad = (value, length = 2) => String(value).padStart(length, "0");

export const formatTimestamp = (date, separator = ":") =>
  [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    pad(date.getMilliseconds(), 3),
  ].join(separator);

const splitName = (fileName) => {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) return { base: fileName, ext: "" };
  return { base: fileName.slice(0, dot), ext: fileName.slice(dot) };
};

// Object keys travel through URLs, so keep them to characters that survive it.
const safeSegment = (value) =>
  value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");

export const buildIdentity = (fileName, timeMs) => {
  const date = new Date(timeMs);
  const { base, ext } = splitName(fileName);
  const safeBase = safeSegment(base) || "file";

  return {
    documentId: `${fileName}_${formatTimestamp(date)}`,
    storagePath: `uploads/${safeBase}_${formatTimestamp(date, "-")}${
      ext ? safeSegment(ext) : ""
    }`,
  };
};

/**
 * Identities for a whole selection. Files picked together can land on the same
 * millisecond, so the clock is nudged forward to keep every id distinct.
 */
export const buildIdentities = (files) => {
  let lastUsed = 0;

  return Array.from(files).map((file) => {
    const timeMs = Math.max(Date.now(), lastUsed + 1);
    lastUsed = timeMs;
    return { file, ...buildIdentity(file.name, timeMs) };
  });
};
