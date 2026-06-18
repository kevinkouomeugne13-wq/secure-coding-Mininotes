import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/sqldb";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get("mininotes_session")?.value;
  if (!sessionId) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const db = getDb();

  // ✅ CORRECTIF : Requête paramétrée pour le GET
  const sql = "SELECT * FROM notes WHERE userId = ?";
  console.log("🔎 SQL exécuté de manière sécurisée :", sql, "avec", [sessionId]);

  const rows = db(sql, [Number(sessionId)]);
  return NextResponse.json({ notes: rows });
}

export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get("mininotes_session")?.value;
  if (!sessionId) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const { titre, contenu } = await req.json();
  const db = getDb();

  const nextId =
    (db("SELECT MAX(id) AS m FROM notes")[0] as { m: number }).m + 1;

  // ✅ CORRECTIF : Requête paramétrée avec "?" pour l'INSERT (Anti-SQLi)
  const sql = "INSERT INTO notes VALUES (?, ?, ?, ?)";
  console.log("🔎 SQL exécuté de manière sécurisée :", sql, "avec", [nextId, sessionId, titre, contenu]);
  
  db(sql, [nextId, Number(sessionId), titre, contenu]);

  return NextResponse.json({ message: "Note créée", id: nextId });
}
