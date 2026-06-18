import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/sqldb";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Récupération de la session
  const sessionId = req.cookies.get("mininotes_session")?.value;
  if (!sessionId) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();

  // ✅ CORRECTIF : On valide l'ID de la note ET la propriété de l'utilisateur (Anti-IDOR)
  const rows = db("SELECT * FROM notes WHERE id = ? AND userId = ?", [Number(id), Number(sessionId)]);
  
  if (!rows.length) {
    // Mode furtif : on renvoie une 404 même si la note existe chez quelqu'un d'autre 
    // pour éviter de divulguer l'existence d'une ressource.
    return NextResponse.json({ error: "Note introuvable ou accès refusé" }, { status: 404 });
  }

  return NextResponse.json({ note: rows[0] });
}
