import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/sqldb";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const db = getDb();

  const sql = "SELECT * FROM users WHERE email = ? AND password = ?";
  console.log("🔎 SQL exécuté de manière sécurisée :", sql, "avec", [email, password]);

  const rows = db(sql, [email, password]) as Array<{ id: number; email: string; role: string }>;

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Identifiants invalides" }, // Message générique anti-énumération
      { status: 401 }
    );
  }

  const user = rows[0];
  
  // On crée une copie de l'utilisateur sans le mot de passe pour éviter la fuite de données
  const safeUser = { id: user.id, email: user.email, role: user.role };
  const res = NextResponse.json({ message: "Connecté", user: safeUser });

  // ✅ DURCISSEMENT CRUCIAL : Sécurisation du cookie de session
  res.cookies.set("mininotes_session", String(user.id), { 
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/" 
  });
  
  return res;
}
