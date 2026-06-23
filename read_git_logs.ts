/* eslint-disable */
import * as fs from "fs";
import * as path from "path";

try {
  const logPath = ".workspace/.git/logs/HEAD";
  if (fs.existsSync(logPath)) {
    console.log("=== HEAD LOG ===");
    console.log(fs.readFileSync(logPath, "utf8"));
  } else {
    console.log("HEAD log doesn't exist");
  }
} catch (e: any) {
  console.error("Read logs error:", e.message);
}
