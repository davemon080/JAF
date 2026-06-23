/* eslint-disable */
import { initializeApp } from "firebase/app";
import { initializeFirestore, getDocs, collection } from "firebase/firestore";
import * as fs from "fs";
import * as path from "path";

// Read current firebase config
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

console.log("Using config projectID:", firebaseConfig.projectId);
console.log("Using databaseId:", firebaseConfig.firestoreDatabaseId);

const app = initializeApp(firebaseConfig);
const dbId =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

const db = dbId
  ? initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
        useFetchStreams: false,
      },
      dbId,
    )
  : initializeFirestore(app, {
      experimentalForceLongPolling: true,
      useFetchStreams: false,
    });

const COLLECTIONS = [
  "products",
  "zones",
  "coupons",
  "orders",
  "settings",
  "users",
  "messages",
  "traffic_events",
  "ads",
];

async function runExporter() {
  const backup: Record<string, any[]> = {};

  for (const collName of COLLECTIONS) {
    console.log(`Fetching documents from: ${collName}...`);
    try {
      const qSnap = await getDocs(collection(db, collName));
      const list: any[] = [];
      qSnap.forEach((docSnap) => {
        list.push({
          _id: docSnap.id,
          ...docSnap.data(),
        });
      });
      backup[collName] = list;
      console.log(`Successfully fetched ${list.length} documents from ${collName}.`);
    } catch (err: any) {
      console.error(`Error fetching collection ${collName}:`, err.message || err);
    }
  }

  const backupFilePath = path.join(process.cwd(), "migration_backup.json");
  fs.writeFileSync(backupFilePath, JSON.stringify(backup, null, 2), "utf-8");
  console.log(`\nEXPORT COMPLETE! File saved to: ${backupFilePath}\n`);
  process.exit(0);
}

runExporter().catch((err) => {
  console.error("Fatal export error:", err);
  process.exit(1);
});
