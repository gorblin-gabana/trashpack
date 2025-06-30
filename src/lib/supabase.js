import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://drwxoydijhdeabpcdqhc.supabase.co'
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyd3hveWRpamhkZWFicGNkcWhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2ODU1OTcsImV4cCI6MjA2NjI2MTU5N30.G0zZ-IVva7t_ExdFs-_7TPpSgXwgecOlvwlIws4UQ0M"
export const supabase = createClient(supabaseUrl, supabaseKey)
