export type FeatureId = 'R1' | 'R2' | 'R3' | 'R4';
export type TierNumber = 1 | 2 | 3 | 4;

export interface TestCase {
  id: string;
  name: string;
  feature: FeatureId;
  tier: TierNumber;
  fn: () => Promise<void> | void;
}

export interface TestResult {
  id: string;
  name: string;
  feature: FeatureId;
  tier: TierNumber;
  status: 'passed' | 'failed';
  durationMs: number;
  error?: Error;
}

export interface FilterOptions {
  tier?: TierNumber;
  feature?: FeatureId;
  grep?: string;
}

export interface SuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: TestResult[];
}
