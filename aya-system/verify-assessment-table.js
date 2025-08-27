// verify-assessment-table.js
// This script verifies the assessment table structure in Supabase

import { supabase } from './src/lib/supabase-client.js';

async function verifyAssessmentTable() {
  console.log('Verifying assessments table structure...');
  
  try {
    // First, let's check if the table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('assessments')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.error('Error checking assessments table:', tableError.message);
      console.log('You may need to run the fix_assessments_table.sql script');
      return;
    }
    
    console.log('✅ Assessments table exists and is accessible');
    
    // Now, let's check the column structure by attempting to query each column
    const columnsToCheck = [
      'id', 'student_id', 'date', 'type', 'from_surah', 'from_ayah', 
      'to_surah', 'to_ayah', 'tajweed_score', 'memorization_score', 
      'recitation_score', 'total_score', 'notes', 'recorded_by', 
      'created_at', 'description'
    ];
    
    for (const column of columnsToCheck) {
      const query = {};
      query[column] = column === 'id' ? 'is.not.null' : 'is.null';
      
      const { error } = await supabase
        .from('assessments')
        .select('id')
        .or(query)
        .limit(1);
      
      if (error) {
        console.error(`❌ Column '${column}' check failed: ${error.message}`);
      } else {
        console.log(`✅ Column '${column}' exists`);
      }
    }
    
    console.log('Assessment table verification complete.');
    
  } catch (error) {
    console.error('Unexpected error during verification:', error);
  }
}

verifyAssessmentTable();
