// ✅ CORRECTIF : Le secret est maintenant chargé depuis les variables d'environnement
export const SESSION_SECRET = process.env.SESSION_SECRET || "fallback_dev_secret_unsafe";
export const APP_NAME = "MiniNotes";
