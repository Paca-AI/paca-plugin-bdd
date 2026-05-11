// Domain types for the com.paca.bdd plugin frontend.
// These mirror the JSON produced by the backend plugin handlers.

export interface BDDScenario {
  id: string;
  task_id: string;
  title: string;
  given: string;
  when: string;
  then: string;
  created_at: string;
  updated_at: string;
}
