import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/sqldb";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // ✅ 1. Protection Anti-CSRF : Vérification de l'origine de la requête
  const origin = req.headers.get("origin");
  const host = req.headers.get("host"); // ex: localhost:3000

  if (!origin || !origin.includes(host || "")) {
    return NextResponse.json(
      { error: "Action bloquée par la politique anti-CSRF (Origine non autorisée)" },
      { status: 403 }
    );
  }

  // 2. Vérification de la session
  const sessionId = req.cookies.get("mininotes_session")?.value;
  if (!sessionId) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const form = await req.formData();
  const nouvelEmail = String(form.get("email") ?? "");

  const db = getDb();
  db("UPDATE users SET email = ? WHERE id = ?", [nouvelEmail, Number(sessionId)]);

  return NextResponse.json({ message: `Email du compte ${sessionId} changé en ${nouvelEmail}` });
}
