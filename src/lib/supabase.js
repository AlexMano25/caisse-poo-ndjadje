import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vnxrspaeptbspoxpzxbn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZueHJzcGFlcHRic3BveHB6eGJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjU2NzcsImV4cCI6MjA4Nzk0MTY3N30.Zv1ehyZeH8iGzbr7xTuoodil1IjNjRgHJ-DRhuBYe-0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
