/** A practice question of the study spaces (certs/bank-*.ts and the generators in certs/gen.ts). */
import type { CertId } from './facts.js';
export interface Q {
  id: string; cert: CertId;
  /** the duty letter and task code of the published content outline it practises (facts.ts) */
  domain: string; task: string; topic: string;
  stem: string; options: [string, string, string, string]; answer: 0 | 1 | 2 | 3;
  /** why the answer is right, and where it helps why the tempting one is wrong */
  why: string;
  /** a calculation question */ math?: boolean;
  /** the Field Tools calculator that does this arithmetic */ tool?: string;
  /** generated from a template with numbers drawn for this attempt */ generated?: boolean;
}
