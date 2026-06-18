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

    // Typage explicite du retour Alasql pour éviter l'erreur 'any' ou d'indexation sous Next.js Build
    const resMax = db("SELECT MAX(id) AS m FROM notes") as Array<{ m: number | null }>;
    const maxId = resMax[0]?.m;
    const nextId = maxId ? maxId + 1 : 1;

    const sql = "INSERT INTO notes VALUES (?, ?, ?, ?)";
    db(sql, [nextId, Number(sessionId), titre, contenu]);

    return NextResponse.json({ message: "Note créée", id: nextId });
  } catch (err) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
