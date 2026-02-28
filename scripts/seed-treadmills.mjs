import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase credentials in .env.local.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const treadmillItems = [
    {
        id: "treadmill_all_out",
        name: "Treadmill (All Out)",
        type: "duration",
        category: "Cardio",
        xp_factor: 0.4,
        standards: { unit: "seconds", scoring: "higher_is_better" }
    },
    {
        id: "treadmill_push_pace",
        name: "Treadmill (Push Pace)",
        type: "duration",
        category: "Cardio",
        xp_factor: 0.2,
        standards: { unit: "seconds", scoring: "higher_is_better" }
    },
    {
        id: "treadmill_base_pace",
        name: "Treadmill (Base Pace)",
        type: "duration",
        category: "Cardio",
        xp_factor: 0.1,
        standards: { unit: "seconds", scoring: "higher_is_better" }
    },
    {
        id: "treadmill_walking_recovery",
        name: "Treadmill (Walking Recovery)",
        type: "duration",
        category: "Cardio",
        xp_factor: 0.05,
        standards: { unit: "seconds", scoring: "higher_is_better" }
    }
];

async function seedTreadmills() {
    console.log("Seeding Treadmill items...");
    for (const item of treadmillItems) {
        const { error } = await supabase.from('catalog').upsert(item, { onConflict: 'id' });
        if (error) {
            console.error(`Failed to insert ${item.id}:`, error.message);
        } else {
            console.log(`Successfully added: ${item.name}`);
        }
    }
    console.log("Done.");
}

seedTreadmills();
