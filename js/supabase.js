import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://ocnsoqsvkhedkgecndvy.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_Cnyh4_2nA0SX2gv36Td-wA_R1Vlqasw'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
