import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ctjyifxbtmbjtlvpmpei.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0anlpZnhidG1ianRsdnBtcGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjUyMTcsImV4cCI6MjA3NTAwMTIxN30.BS2ZTIiKzJxFsuNCkPJx1mk9cG0v_R97k5vHequqfFg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);