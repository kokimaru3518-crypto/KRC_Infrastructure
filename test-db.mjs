import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ctkjzwdoxblmlnyvswse.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0a2p6d2RveGJsbWxueXZzd3NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NDYyNTQsImV4cCI6MjA5NDEyMjI1NH0.5BILQZK2O7ETXkqFfX2J8nWcGKKUiymHO80r6cmOsOI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data: insertData, error: insertError } = await supabase.from('users').insert({
        user_id: crypto.randomUUID(),
        user_name: 'admin',
        password: 'admin'
    });
    console.log('Insert Error:', insertError);

    const { data, error } = await supabase.from('users').select('*');
    console.log('Query Data:', data);
    console.log('Query Error:', error);
}

test();
