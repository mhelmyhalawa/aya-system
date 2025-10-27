import { supabase, STUDENTS_TABLE } from '../src/lib/supabase-client';

/**
 * Script: migrate-google-driver-id
 * Purpose: Copy legacy column image_drive_id into new google_driver_id where google_driver_id is null.
 * Safe to run multiple times; it only updates rows needing migration.
 */
async function run() {
  console.log('Starting migration: image_drive_id -> google_driver_id');
  const { data, error } = await supabase
    .from(STUDENTS_TABLE)
    .select('id, image_drive_id, google_driver_id');
  if (error) {
    console.error('Fetch error:', error.message);
    process.exit(1);
  }
  if (!data || data.length === 0) {
    console.log('No students found. Nothing to migrate.');
    return;
  }
  const targets = data.filter(r => r.image_drive_id && !r.google_driver_id);
  console.log(`Found ${targets.length} rows to migrate out of ${data.length}`);
  let success = 0;
  for (const row of targets) {
    const { error: updErr } = await supabase
      .from(STUDENTS_TABLE)
      .update({ google_driver_id: row.image_drive_id })
      .eq('id', row.id);
    if (updErr) {
      console.warn('Failed to migrate row', row.id, updErr.message);
    } else {
      success++;
    }
  }
  console.log(`Migration finished. Migrated ${success} / ${targets.length} rows.`);
}

run().catch(e => { console.error('Unexpected migration error:', e); process.exit(1); });
