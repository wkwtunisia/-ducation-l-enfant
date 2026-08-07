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

export const getYouTubeEmbedUrl = (url) => {
  if (!url) return null;
  // Patterns pour youtube
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]+)/,
    /(?:youtu\.be\/)([\w-]+)/,
    /(?:youtube\.com\/embed\/)([\w-]+)/,
    /(?:youtube\.com\/v\/)([\w-]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  return url; // si déjà un embed ou autre, on renvoie tel quel
};