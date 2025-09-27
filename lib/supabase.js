import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Try to get environment variables from different sources
let SUPABASE_URL;
let SUPABASE_ANON_KEY;

try {
  // First try to get from @env
  const { SUPABASE_URL: envUrl, SUPABASE_ANON_KEY: envKey } = require('@env');
  SUPABASE_URL = envUrl;
  SUPABASE_ANON_KEY = envKey;
} catch (error) {
  console.log('@env not available, using process.env');
  SUPABASE_URL = process.env.SUPABASE_URL;
  SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
}

// Fallback values if environment variables are not set
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase environment variables not found. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file');
  SUPABASE_URL = SUPABASE_URL || 'https://placeholder.supabase.co';
  SUPABASE_ANON_KEY = SUPABASE_ANON_KEY || 'placeholder_key';
}

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
