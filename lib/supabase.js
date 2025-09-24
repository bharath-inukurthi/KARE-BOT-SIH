import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Try to get environment variables from different sources
let SUPABASE_URL;
let SUPABASE_ANON_KEY;


  // First try to get from @env
  const env = require('@env');
  SUPABASE_URL = env.SUPABASE_URL;
  SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;

// Initialize the Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
