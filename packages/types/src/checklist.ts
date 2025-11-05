export type ChecklistCode = 
  | 'READER_ONBOARDING'
  | 'AUTHOR_ONBOARDING'
  | 'HOST_ONBOARDING';

export interface ChecklistStep {
  key: string;
  title: string;
  completed: boolean;
}

export interface ChecklistProgress {
  completed: number;
  total: number;
  percentage: number;
}

export interface Checklist {
  code: ChecklistCode;
  steps: ChecklistStep[];
  progress: ChecklistProgress;
}

export interface ChecklistProgressRecord {
  id: string;
  userId: string;
  code: string;
  stepKey: string;
  doneAt: Date;
}

export interface CompleteStepRequest {
  code: ChecklistCode;
  stepKey: string;
}
