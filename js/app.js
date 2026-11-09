import { supabase } from './supabase.js'

document.addEventListener('alpine:init', () => {
    Alpine.data('moEmploymentApp', () => ({
        currentRole: 'candidate',
        loading: false,
        candidateProfile: null,
        matches: [],

        async init() {
            await this.fetchCandidateData();
            this.setupRealtimeListeners();
        },

        async fetchCandidateData() {
            this.loading = true;
            try {
                let { data: profile } = await supabase
                    .from('profiles')
                    .select('*, user_skills(*, skills_ontology(skill_name)), eeoc_disclosures(*)')
                    .eq('role', 'candidate')
                    .limit(1)
                    .single();

                if (profile) {
                    this.candidateProfile = profile;
                }
            } catch (err) {
                console.error('Error fetching candidate data from Supabase:', err);
            } finally {
                this.loading = false;
            }
        },

        setupRealtimeListeners() {
            supabase
                .channel('public:applications')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'applications' }, payload => {
                    console.log('New application received:', payload.new);
                    this.fetchCandidateData();
                })
                .subscribe();
        },

        async runVectorMatch(requisitionId) {
            this.loading = true;
            try {
                let { data } = await supabase.rpc('match_candidates_to_requisition', {
                    target_requisition_id: requisitionId,
                    query_region_code: 'CENTRAL',
                    match_threshold: 0.5,
                    match_count: 10
                });

                if (data) {
                    this.matches = data;
                }
            } catch (err) {
                console.error('Error executing vector matching RPC:', err);
            } finally {
                this.loading = false;
            }
        }
    }));
});
