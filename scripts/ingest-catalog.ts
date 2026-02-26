import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv'; // Load env vars

// Load .env.local since Next.js often uses it
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config(); // fallback to .env 

// --- Configuration ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Missing Supabase credentials in environment variables.");
    console.error("Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Path to the JSON catalog in the backend directory
const CATALOG_PATH = path.join(process.cwd(), '../backend/app/data/activity_catalog.json');

async function ingestCatalog() {
    console.log(`🚀 Starting catalog ingestion from ${CATALOG_PATH}`);

    if (!fs.existsSync(CATALOG_PATH)) {
        console.error(`❌ Catalog file not found at ${CATALOG_PATH}`);
        process.exit(1);
    }

    try {
        const rawData = fs.readFileSync(CATALOG_PATH, 'utf-8');
        const catalog = JSON.parse(rawData);

        console.log(`📦 Found ${catalog.length} exercises to ingest.`);

        let successCount = 0;
        let errorCount = 0;

        for (const item of catalog) {
            // Format the item for the Postgres table if necessary
            // Assuming the table schema mirrors the JSON structure closely
            const payload = {
                id: item.id,
                name: item.name,
                type: item.type,
                category: item.category,
                xp_factor: item.xp_factor || 1.0,
                standards: item.standards || {}
            };

            const { data, error } = await supabase
                .from('catalog')
                .upsert(payload, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Failed to upsert ${item.id}:`, error.message);
                errorCount++;
            } else {
                successCount++;
                if (successCount % 50 === 0) {
                    console.log(`✅ Upserted ${successCount}/${catalog.length} items...`);
                }
            }
        }

        console.log("\n--- Ingestion Complete ---");
        console.log(`✅ Successfully ingested: ${successCount}`);
        if (errorCount > 0) {
            console.log(`❌ Errors: ${errorCount}`);
        }

    } catch (error) {
        console.error("❌ Fatal Error during ingestion:", error);
    }
}

// Run the ingestion
ingestCatalog();
