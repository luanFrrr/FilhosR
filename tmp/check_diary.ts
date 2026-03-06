
import { db } from "../server/db";
import { diaryEntries } from "../shared/schema";
import { count } from "drizzle-orm";

async function check() {
  try {
    const [result] = await db.select({ total: count() }).from(diaryEntries);
    console.log("TOTAL DIARY ENTRIES:", result.total);
    
    const sample = await db.select().from(diaryEntries).limit(5);
    console.log("SAMPLE DATA:", JSON.stringify(sample, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error("DIAGNOSTIC ERROR:", err);
    process.exit(1);
  }
}

check();
