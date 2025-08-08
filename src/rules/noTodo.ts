import * as vscode from 'vscode';
import type { RuleDef } from '../types';

export const noTodo: RuleDef = {
  id: 'no-todo',
  meta: {
    description: 'Disallow TODO: markers',
    defaultSeverity: vscode.DiagnosticSeverity.Warning
  },
  async run({ document, report }) {
    console.log(document.getText())
    const text = document.getText();
    const re = /TODO:/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const start = document.positionAt(m.index);
      const end = document.positionAt(m.index + m[0].length);
      report({
        message: 'Remove TODO before committing.',
        range: new vscode.Range(start, end)
      });
    }
  }
};
