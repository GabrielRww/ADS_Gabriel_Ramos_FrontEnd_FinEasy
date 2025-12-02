import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https:
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdHljZGh5c2R6YWZrdXl4YmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3OTc5OTEsImV4cCI6MjA3NzM3Mzk5MX0.uiqcn6kRgghsRNVNxRnAhR9o8rNXE3bd4Z0vJ6TC-Pg";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});