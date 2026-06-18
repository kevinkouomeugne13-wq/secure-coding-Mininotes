import alasql from "alasql";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

let dbInitialized = false;

export function getDb() {
  const db = alasql;

  if (!dbInitialized) {
    // 1. Création des tables
    db("CREATE TABLE users (id INT, email STRING, password STRING, role STRING)");
    db("CREATE TABLE notes (id INT, userId INT, titre STRING, contenu STRING)");
    db("CREATE TABLE comments (id INT, author STRING, html STRING)");

    // ✅ CORRECTIF : Génération de hashs Bcrypt robustes pour le seed (Faille B)
    const saltRounds = 10;
    const hashAlice = bcrypt.hashSync("azerty123", saltRounds);
    const hashAdmin = bcrypt.hashSync("admin", saltRounds);

    // 2. Insertion des données de test sécurisées
    db("INSERT INTO users VALUES (1, 'alice@mininotes.test', ?, 'user')", [hashAlice]);
    db("INSERT INTO users VALUES (3, 'admin@mininotes.test', ?, 'admin')", [hashAdmin]);

    db("INSERT INTO notes VALUES (1, 1, 'Courses', 'Acheter du pain et du lait')");
    db("INSERT INTO notes VALUES (2, 1, 'Projets', 'Finir le TP de secure coding avant ce soir')");
    db("INSERT INTO notes VALUES (3, 3, 'Codes admin', 'le code du coffre est 4271')");

    db("INSERT INTO comments VALUES (1, 'Formateur Sec', 'Excellent travail sur ce labo !')");
    db("INSERT INTO comments VALUES (2, 'Anonyme', 'Trop cool ton site web')");

    dbInitialized = true;
    console.log("🚀 Base de données Alasql initialisée avec succès (Mots de passe hachés via Bcrypt).");
  }

  return db;
}
