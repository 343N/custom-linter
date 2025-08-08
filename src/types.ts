import * as vscode from 'vscode';

export type Issue = {
  message: string;
  code?: string;
  severity?: vscode.DiagnosticSeverity;
  range: vscode.Range;
  fix?: (edit: vscode.WorkspaceEdit) => void;
};

export type RuleContext = {
  document: vscode.TextDocument;
  options?: unknown;
  report: (issue: Issue) => void;
};

export type RuleDef = {
  id: string; // e.g. "no-todo"
  meta?: {
    description?: string;
    defaultSeverity?: vscode.DiagnosticSeverity;
    languages?: string[]; // if omitted, follows global filter
  };
  run: (ctx: RuleContext) => void | Promise<void>;
};
