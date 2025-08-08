import * as vscode from 'vscode';
import type { RuleDef } from '../types';

export const maxLineLength: RuleDef = {
  id: 'max-line-length',
  meta: {
    description: 'Flag lines longer than configured max',
    defaultSeverity: vscode.DiagnosticSeverity.Error,
    languages: ['javascript', 'typescript', 'markdown']
  },
  run({ document, report, options }) {
    const max = (options as any)?.max ?? 100;
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      if (line.text.length > max) {
        const range = new vscode.Range(i, max, i, line.text.length);
        report({
          message: `Line exceeds ${max} chars`,
          range,
          fix: (edit) => {
            const pos = new vscode.Position(i, max);
            edit.insert(document.uri, pos, '\n');
          }
        });
      }
    }
  }
};
