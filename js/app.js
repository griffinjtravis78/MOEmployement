import { supabase } from './supabase.js'

document.addEventListener('alpine:init', () => {
    Alpine.data('moEmploymentApp', () => ({
        currentRole: 'candidate',
        loading: false,
        candidateProfile: null,
        matches: [],
        skillGaps: [],

        // Hiring Manager Form State
        reqTitle: 'Senior Enterprise Systems Architect',
        agency: 'Office of Administration (ITSD)',
        region: 'CENTRAL',
        tier: 'FULL_TIME',
        skills: [
            { id: null, name: 'Enterprise Systems Implementation', weight: 40 },
            { id: null, name: 'SQL & Relational Architecture', weight: 30 },
            { id: null, name: 'Organizational Change Management (OCM)', weight: 30 }
        ],

        totalWeight() {
            return this.skills.reduce((sum, s) => sum + parseInt(s.weight || 0), 0);
        },

        async publishRequisition() {
            if (this.totalWeight() !== 100) {
                alert('Competency weights must equal exactly 100%.');
                return;
            }

            this.loading = true;
            try {
                // 1. Insert Requisition Record
                let { data: reqData, error: reqError } = await supabase
                    .from('requisitions')
                    .insert([{
                        title: this.reqTitle,
                        department: this.agency,
                        region_code: this.region,
                        employment_tier: this.tier,
                        status: 'ACTIVE'
                    }])
                    .select()
                    .single();

                if (reqError) throw reqError;

                const newReqId = reqData.id;

                // 2. Insert Associated Competency Weights
                for (let skill of this.skills) {
                    await supabase.from('requisition_competencies').insert([{
                        requisition_id: newReqId,
                        skill_id: skill.id || '00000000-0000-0000-0000-000000000001',
                        weight: skill.weight
                    }]);
                }

                // 3. Log Telemetry Action
                await this.logTelemetryAction('PUBLISH_REQUISITION', `requisition_${newReqId}`);

                alert('Requisition successfully published and vector match register initialized!');
            } catch (err) {
                console.error('Error publishing requisition:', err);
                alert('Failed to publish requisition. Check console for details.');
            } finally {
                this.loading = false;
            }
        },

        async init() {
            await this.fetchCandidateData();
            this.setupRealtimeListeners();
        },

        async fetchCandidateData() {
            this.loading = true;
            try {
                let { data: profile } = await supabase
                    .from('profiles')
                    .select('*,user_skills(*,skills_ontology(skill_name)),eeoc_disclosures(*)')
                    .eq('role', 'candidate')
                    .limit(1)
                    .maybeSingle();

                if (profile) {
                    this.candidateProfile = profile;
                } else {
                    this.candidateProfile = {
                        full_name: 'Travis J. Griffin, MPA',
                        region_code: 'CENTRAL'
                    };
                }
            } catch (err) {
                console.error('Error fetching candidate data from Supabase:', err);
            } finally {
                this.loading = false;
            }
        },

        async logTelemetryAction(actionType, targetResource, metadata = {}) {
            try {
                await supabase.from('system_production_audit_logs').insert([{
                    actor_id: this.candidateProfile && this.candidateProfile.id ? this.candidateProfile.id : null,
                    action_type: actionType,
                    target_resource: targetResource,
                    metadata: metadata
                }]);
            } catch (err) {
                console.error('Error writing telemetry audit log:', err);
            }
        },

        async fetchSkillGaps(requisitionId) {
            if (!this.candidateProfile || !this.candidateProfile.id) return;
            this.loading = true;
            try {
                let { data } = await supabase.rpc('analyze_candidate_skill_gap', {
                    target_candidate_id: this.candidateProfile.id,
                    target_requisition_id: requisitionId
                });

                if (data) {
                    this.skillGaps = data;
                    await this.logTelemetryAction('ANALYZE_SKILL_GAP', `requisition_${requisitionId}`);
                }
            } catch (err) {
                console.error('Error fetching skill gap analysis:', err);
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
                    await this.logTelemetryAction('RUN_VECTOR_MATCH', `requisition_${requisitionId}`);
                }
            } catch (err) {
                console.error('Error executing vector matching RPC:', err);
            } finally {
                this.loading = false;
            }
        }
    }));
});
