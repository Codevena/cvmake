import type { ZodIssue } from 'zod';

export class YAMLParseError extends Error {
  readonly path: string;
  readonly line?: number | undefined;
  readonly column?: number | undefined;
  constructor(path: string, message: string, line?: number, column?: number) {
    super(`${path}: ${message}`);
    this.name = 'YAMLParseError';
    this.path = path;
    this.line = line;
    this.column = column;
  }
}

export class ValidationError extends Error {
  readonly path: string;
  readonly issues: ZodIssue[];
  constructor(path: string, issues: ZodIssue[]) {
    super(`${path}: ${issues.length} validation issue(s)`);
    this.name = 'ValidationError';
    this.path = path;
    this.issues = issues;
  }
}
