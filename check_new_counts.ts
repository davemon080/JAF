/* eslint-disable */
import { initializeApp } from "firebase/app";
import { initializeFirestore, getDocs, collection } from "firebase/firestore";
import * as fs from "fs";
import * as path from "path";

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

async function checkCounts() {
  for (const collName of COLLECTIONS) {
    try {
      const qSnap = await getDocs(collection(db, collName));
      console.log(`Collection "${collName}" count: ${qSnap.size}`);
    } catch (err: any) {
      console.error(`Error querying "${collName}":`, err.message || err);
    }
  }
}

checkCounts();
