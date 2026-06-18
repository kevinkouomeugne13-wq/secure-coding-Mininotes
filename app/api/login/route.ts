import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/sqldb";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const runtime = "nodejs";

// 🛡️ Mécanisme de Rate Limiting très simple en mémoire pour le Labo (Faille I)
const loginAttempts = new Map<string, { count: number; lockUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes de blocage

// 🛡️ Schéma de validation Zod (Faille H)
const loginSchema = z.object({
  email: z.string().email("Format email invalide").max(150),
  password: z.string().min(1, "Mot de passe requis").max(100),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  
  // 1. Vérification du Rate Limit
  const now = Date.now();
  const clientRecord = loginAttempts.get(ip);
  if (clientRecord && clientRecord.lockUntil > now) {
    return NextResponse.json(
      { error: "Trop de tentatives. Veuillez réessayer plus tard." },
      { status: 429 }
    );
  }

  try {
    // 2. Validation du format des données avec Zod
    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const { email, password } = parseResult.data;
    const db = getDb();

    // 3. Extraction de l'utilisateur par l'email uniquement (Requête paramétrée)
    const sql = "SELECT * FROM users WHERE email = ?";
    const rows = db(sql, [email]) as Array<{ id: number; email: string; password: string; role: string }>;

    // 4. Vérification asynchrone sécurisée avec Bcrypt
    let isPasswordValid = false;
    if (rows.length > 0) {
      isPasswordValid = await bcrypt.compare(password, rows[0].password);
    }

    // 5. Gestion des échecs (Anti-Énumération et incrément Rate Limit)
    if (rows.length === 0 || !isPasswordValid) {
      const currentCount = clientRecord ? clientRecord.count + 1 : 1;
      if (currentCount >= MAX_ATTEMPTS) {
        loginAttempts.set(ip, { count: currentCount, lockUntil: now + LOCK_TIME });
      } else {
        loginAttempts.set(ip, { count: currentCount, lockUntil: 0 });
      }

      return NextResponse.json(
        { error: "Identifiants invalides" }, // Message neutre unifié
        { status: 401 }
      );
    }

    // Réinitialisation du compteur en cas de succès
    loginAttempts.delete(ip);

    const user = rows[0];
    const safeUser = { id: user.id, email: user.email, role: user.role };
    const res = NextResponse.json({ message: "Connecté", user: safeUser });

    // Cookie durci
    res.cookies.set("mininotes_session", String(user.id), { 
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/" 
    });
    
    return res;

  } catch (err) {
    return NextResponse.json({ error: "Une erreur est survenue" }, { status: 500 });
  }
}
