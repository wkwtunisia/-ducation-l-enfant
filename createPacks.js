// createPacks.cjs (CommonJS)
const admin = require('firebase-admin');

// Initialisez avec vos credentials (téléchargés depuis la console Firebase)
// Soit via un fichier JSON (remplacez le chemin)
const serviceAccount = require('./serviceAccountKey.json'); // adaptez le chemin

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const defaultPacks = [
  { name: "Pack 7 histoires", price: 5, storyCount: 7, description: "Accès jusqu'à 7 histoires premium" },
  { name: "Pack 17 histoires", price: 10, storyCount: 17, description: "Accès jusqu'à 17 histoires premium" },
  { name: "Pack Illimité", price: 15, storyCount: 999, description: "Accès à toutes les histoires" },
];

defaultPacks.forEach(async (pack) => {
  try {
    const docRef = await db.collection('packs').add(pack);
    console.log(`✅ Pack créé : ${pack.name} (ID: ${docRef.id})`);
  } catch (error) {
    console.error("❌ Erreur :", error);
  }
});

console.log("🚀 Création des packs terminée.");