// Type declarations for lesson.mjs.
export interface ReportItem { level: 'error' | 'warning'; path: string; message: string }
export class Report {
  constructor(file?: string);
  file: string;
  items: ReportItem[];
  notes?: string[];
  error(path: string, message: string): void;
  warn(path: string, message: string): void;
  readonly errors: ReportItem[];
  readonly warnings: ReportItem[];
  readonly ok: boolean;
}
export const SCHEMA_VERSION: 1;
export const FEELS: readonly string[];
export const ROLES: readonly string[];
export const TOPICS: readonly string[];
export const PLAN_FOCUSES: readonly string[];
export function validateLick(lesson: unknown, r?: Report): Report;
export function validateStandard(lesson: unknown, r?: Report): Report;
export function validateLesson(lesson: unknown, file?: string): Report;
