import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/sqldb";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const db = getDb();

  // ✅ CORRECTIF : Utilisation d'une requête paramétrée avec "?"
  const sql = "SELECT * FROM users WHERE email = ? AND password = ?";
  console.log("🔎 SQL exécuté de manière sécurisée :", sql, "avec", [email, password]);

  const rows = db(sql, [email, password]) as Array<{ id: number; email: string; role: string }>;

  if (rows.length === 0) {
    // ⚠️ Note : On garde ce message pour le moment, on s'occupera du durcissement de l'auth globale plus tard
    return NextResponse.json(
      { error: `Aucun compte ${email} avec ce mot de passe` },
      { status: 401 }
    );
  }

  const user = rows[0];
  const res = NextResponse.json({ message: "Connecté", user });

  res.cookies.set("mininotes_session", String(user.id), { httpOnly: false, path: "/" });
  return res;
}
