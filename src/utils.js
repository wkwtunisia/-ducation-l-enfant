// src/utils.js
export const getLocalizedValue = (value, lang = "fr") => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (lang && value[lang]) return value[lang];
    const keys = Object.keys(value);
    if (keys.length > 0) return value[keys[0]];
    return "";
  }
  return String(value);
};