/* eslint-disable */
import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, setDoc, collection } from "firebase/firestore";
import * as fs from "fs";
import * as path from "path";

// New Firebase Project Config provided by the user
const newFirebaseConfig = {
  apiKey: "AIzaSyC_afyWB1jtRH3KO6CSpAN7Zfy36k3TZ1Q",
  authDomain: "justafriend-5bdb3.firebaseapp.com",
  databaseURL: "https://justafriend-5bdb3-default-rtdb.firebaseio.com",
  projectId: "justafriend-5bdb3",
  storageBucket: "justafriend-5bdb3.firebasestorage.app",
  messagingSenderId: "859313340983",
  appId: "1:859313340983:web:a25428079a27c077a475b2",
  measurementId: "G-CWTJ1X6Q04",
};

console.log("Initializing NEW Firebase App:", newFirebaseConfig.projectId);

const app = initializeApp(newFirebaseConfig);
const dbId =
  newFirebaseConfig.firestoreDatabaseId && newFirebaseConfig.firestoreDatabaseId !== "(default)"
    ? newFirebaseConfig.firestoreDatabaseId
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

async function runImporter() {
  const backupFilePath = path.join(process.cwd(), "migration_backup.json");
  if (!fs.existsSync(backupFilePath)) {
    console.error("Backup file not found at:", backupFilePath);
    process.exit(1);
  }

  const backupData = JSON.parse(fs.readFileSync(backupFilePath, "utf-8"));
  const collectionsToImport = Object.keys(backupData);

  console.log(`Starting migration to new Firestore database...`);

  for (const collName of collectionsToImport) {
    const list = backupData[collName] || [];
    console.log(`Importing ${list.length} documents into "${collName}" with parallel writes...`);

    // Chunk requests into blocks of 30 to prevent overloading
    const chunkSize = 30;
    let successCount = 0;

    for (let i = 0; i < list.length; i += chunkSize) {
      const chunk = list.slice(i, i + chunkSize);
      const promises = chunk.map(async (docObj) => {
        const { _id, ...data } = docObj;
        if (!_id) return;
        try {
          await setDoc(doc(db, collName, _id), data);
          successCount++;
        } catch (err: any) {
          console.error(`Error importing document ${_id} in "${collName}":`, err.message || err);
        }
      });
      await Promise.all(promises);
    }

    console.log(
      `Successfully imported ${successCount}/${list.length} documents into "${collName}".`,
    );
  }

  console.log("\nMIGRATION IMPORT COMPLETE!\n");
  process.exit(0);
}

runImporter().catch((err) => {
  console.error("Fatal import error:", err);
  process.exit(1);
});
