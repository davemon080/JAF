/* eslint-disable */
import * as fs from "fs";
import * as path from "path";

const apiKey = "AIzaSyC_afyWB1jtRH3KO6CSpAN7Zfy36k3TZ1Q";
const projectId = "justafriend-5bdb3";
const databaseId = "justafriend";

// Converts JS Object to Firestore REST field format
function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === "string") {
    return { stringValue: val };
  }
  if (typeof val === "number") {
    if (Number.isInteger(val)) {
      return { integerValue: val.toString() };
    }
    return { doubleValue: val };
  }
  if (typeof val === "boolean") {
    return { booleanValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((item) => toFirestoreValue(item))
      }
    };
  }
  if (typeof val === "object") {
    const fields: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      fields[key] = toFirestoreValue(val[key]);
    }
    return {
      mapValue: { fields }
    };
  }
  return { nullValue: null };
}

function toFirestoreFields(obj: Record<string, any>): any {
  const fields: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    fields[key] = toFirestoreValue(obj[key]);
  }
  return { fields };
}

async function runAuthMigration() {
  console.log("Authenticating as 'adminjaf@gmail.com' in the new Firebase project...");
  let idToken = "";

  try {
    const signinUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
    const signinRes = await fetch(signinUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "adminjaf@gmail.com",
        password: "secureAdminPassword123!",
        returnSecureToken: true
      })
    });
    const signinData: any = await signinRes.json();
    if (signinRes.ok) {
      console.log("Authentication successful!");
      idToken = signinData.idToken;
    } else {
      console.error("Authentication failed:", signinData.error?.message);
      process.exit(1);
    }
  } catch (err: any) {
    console.error("Authentication request error:", err.message);
    process.exit(1);
  }

  const backupFilePath = path.join(process.cwd(), "migration_backup.json");
  if (!fs.existsSync(backupFilePath)) {
    console.error("Backup file not found at:", backupFilePath);
    process.exit(1);
  }

  const backupData = JSON.parse(fs.readFileSync(backupFilePath, "utf-8"));
  const collectionsToImport = Object.keys(backupData);

  console.log(`Starting secure, authenticated migration to project "${projectId}" [db: ${databaseId}]...`);

  for (const collName of collectionsToImport) {
    const list = backupData[collName] || [];
    console.log(`Importing ${list.length} documents into "${collName}"...`);

    let successCount = 0;
    let failCount = 0;

    // chunk writes in batches to be gentle but fast
    const chunkSize = 20;
    for (let i = 0; i < list.length; i += chunkSize) {
      const chunk = list.slice(i, i + chunkSize);
      const promises = chunk.map(async (docObj) => {
        const { _id, ...data } = docObj;
        if (!_id) return;

        const restPayload = toFirestoreFields(data);
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${collName}/${_id}`;

        try {
          const res = await fetch(url, {
            method: "PATCH",
            headers: {
              "Authorization": `Bearer ${idToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(restPayload)
          });

          if (res.ok) {
            successCount++;
          } else {
            failCount++;
            const errText = await res.text();
            console.error(`Failed to import doc ${_id} to "${collName}":`, errText.substring(0, 200));
          }
        } catch (err: any) {
          failCount++;
          console.error(`Network error on doc ${_id} in "${collName}":`, err.message);
        }
      });

      await Promise.all(promises);
    }

    console.log(`Finished "${collName}": ${successCount} successful, ${failCount} failed.`);
  }

  console.log("\n=== AUTHENTICATED MIGRATION IMPORT COMPLETE ===\n");
}

runAuthMigration().catch((err) => {
  console.error("Fatal migration error:", err);
  process.exit(1);
});
