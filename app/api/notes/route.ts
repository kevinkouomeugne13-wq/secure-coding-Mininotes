import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/sqldb";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get("mininotes_session")?.value;
  if (!sessionId) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const db = getDb();

  // ⚠️ FAILLE : Injection SQL potentielle via le cookie de session
  const sql = `SELECT * FROM notes WHERE userId = ${sessionId}`;
  console.log("🔎 SQL exécuté :", sql);

  const rows = db(sql);
  return NextResponse.json({ notes: rows });
}

export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get("mininotes_session")?.value;
  if (!sessionId) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  // ⚠️ FAILLE : Pas de validation Zod ni de token anti-CSRF
  const { titre, contenu } = await req.json();
  const db = getDb();

  const nextId =
    (db("SELECT MAX(id) AS m FROM notes")[0] as { m: number }).m + 1;

  // ⚠️ FAILLE : Injection SQL sur les entrées utilisateurs
  const sql = `INSERT INTO notes VALUES (${nextId}, ${sessionId}, '${titre}', '${contenu}')`;
  console.log("🔎 SQL exécuté :", sql);
  db(sql);

  return NextResponse.json({ message: "Note créée", id: nextId });
}
