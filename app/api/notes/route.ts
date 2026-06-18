import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/sqldb";
import { z } from "zod";

export const runtime = "nodejs";

// 🛡️ Schéma de validation Zod (Faille H)
const noteSchema = z.object({
  titre: z.string().min(1, "Le titre est requis").max(100, "Titre trop long"),
  contenu: z.string().max(2000, "Contenu trop long"),
});

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get("mininotes_session")?.value;
  if (!sessionId) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const db = getDb();

  const sql = "SELECT * FROM notes WHERE userId = ?";
  const rows = db(sql, [Number(sessionId)]);
  return NextResponse.json({ notes: rows });
}

export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get("mininotes_session")?.value;
  if (!sessionId) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    // 🛡️ Validation de l'entrée avec Zod
    const parseResult = noteSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Format des données invalide" }, { status: 400 });
    }

    const { titre, contenu } = parseResult.data;
    const db = getDb();

    const nextId =
      (db("SELECT MAX(id) AS m FROM notes")[0] as { m: number }).m + 1;

    const sql = "INSERT INTO notes VALUES (?, ?, ?, ?)";
    db(sql, [nextId, Number(sessionId), titre, contenu]);

    return NextResponse.json({ message: "Note créée", id: nextId });
  } catch (err) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
