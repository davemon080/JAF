/* eslint-disable */
import * as fs from "fs";
import * as path from "path";

// 1. Loader for GCP service account token
async function getAccessToken(): Promise<string> {
  const url = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";
  try {
    const res = await fetch(url, { headers: { "Metadata-Flavor": "Google" } });
    if (res.ok) {
      const data: any = await res.json();
      return data.access_token;
    } else {
      throw new Error(`Metadata response not ok: ${res.status}`);
    }
  } catch (err: any) {
    throw new Error(`Failed to retrieve GCP application service account token: ${err.message}`);
  }
}

// 2. JS Object to firestore REST conversions
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

async function runRESTImporter() {
  const backupFilePath = path.join(process.cwd(), "migration_backup.json");
  if (!fs.existsSync(backupFilePath)) {
    console.error("Backup file not found at:", backupFilePath);
    process.exit(1);
  }

  const backupData = JSON.parse(fs.readFileSync(backupFilePath, "utf-8"));
  const collectionsToImport = Object.keys(backupData);

  console.log("Acquiring Cloud Platform admin credentials...");
  const token = await getAccessToken();
  console.log("Credentials authorized!");

  const targetProjectId = "justafriend-5bdb3";
  const targetDatabaseId = "(default)";

  console.log(`Starting secure REST migration to project "${targetProjectId}" [db: ${targetDatabaseId}]...`);

  for (const collName of collectionsToImport) {
    const list = backupData[collName] || [];
    console.log(`Importing ${list.length} documents into "${collName}"...`);

    let successCount = 0;
    let failCount = 0;

    for (const docObj of list) {
      const { _id, ...data } = docObj;
      if (!_id) continue;

      const restPayload = toFirestoreFields(data);
      const url = `https://firestore.googleapis.com/v1/projects/${targetProjectId}/databases/${targetDatabaseId}/documents/${collName}/${_id}`;

      try {
        const res = await fetch(url, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(restPayload)
        });

        if (res.ok) {
          successCount++;
        } else {
          failCount++;
          const errText = await res.text();
          console.error(`Failed to import doc ${_id} to "${collName}":`, errText);
        }
      } catch (err: any) {
        failCount++;
        console.error(`Error sending doc ${_id} in "${collName}":`, err.message);
      }
    }

    console.log(`Finished "${collName}": ${successCount} successful, ${failCount} failed.`);
  }

  console.log("\n=== REST MIGRATION IMPORT COMPLETE ===\n");
}

runRESTImporter().catch((err) => {
  console.error("Fatal REST migration error:", err);
  process.exit(1);
});
