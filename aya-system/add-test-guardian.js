// Script for adding a test guardian to the database

import { supabaseAdmin } from './lib/supabase-client';

// Function to add a test guardian
async function addTestGuardian() {
  try {
    const newGuardian = {
      id: crypto.randomUUID(),
      full_name: 'أحمد محمد علي',
      phone_number: '0500000000',
      email: 'test@example.com',
      address: 'الرياض، المملكة العربية السعودية'
    };

    console.log('Adding test guardian:', newGuardian);

    const { data, error } = await supabaseAdmin
      .from('guardians')
      .insert([newGuardian])
      .select();

    if (error) {
      console.error('Error adding test guardian:', error);
      return;
    }

    console.log('Test guardian added successfully:', data);
  } catch (err) {
    console.error('Exception while adding test guardian:', err);
  }
}

// Execute the function
addTestGuardian()
  .then(() => console.log('Script completed'))
  .catch(err => console.error('Script failed:', err));
