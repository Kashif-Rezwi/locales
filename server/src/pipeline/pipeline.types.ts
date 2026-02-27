export interface JobSubmitDto {
  owner: string;
  repo: string;
  branch?: string;
  targetLocales: string[];
}

export type PipelineEventType =
  | 'log'
  | 'progress'
  | 'step-change'
  | 'complete'
  | 'error'
  | 'heartbeat';

export interface PipelineEvent {
  type: PipelineEventType;
  data: {
    message: string;
    step?: string;
    level?: 'info' | 'warn' | 'error';
    metadata?: any;
    timestamp: string;
  };
}
