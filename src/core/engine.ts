// src/core/engine.ts
import * as vscode from 'vscode';
import { RuleRegistry } from './registry';
import type { Issue, RuleDef } from '../types';

const DIAG_SOURCE = 'mylinter';

export class Engine {
  private collection: vscode.DiagnosticCollection;
  private fixMap: WeakMap<vscode.Diagnostic, (edit: vscode.WorkspaceEdit) => void> = new WeakMap();

  constructor(
    private registry: RuleRegistry,
    private getConfig: () => {
      enabled: boolean;
      languages: string[];
      enableRules: string[];
      ruleOptions: Record<string, unknown>;
    }
  ) {
    this.collection = vscode.languages.createDiagnosticCollection(DIAG_SOURCE);
  }

  dispose() {
    this.collection.dispose();
  }

  supports(doc: vscode.TextDocument) {
    const cfg = this.getConfig();
    if (!cfg.enabled) return false;
    if (!cfg.languages || cfg.languages.length === 0) return true;
    return cfg.languages.includes(doc.languageId);
  }

  private activeRulesFor(doc: vscode.TextDocument): RuleDef[] {
    const cfg = this.getConfig();
    let rules = this.registry.getAll();

    if (cfg.enableRules && cfg.enableRules.length > 0) {
      rules = rules.filter((r) => cfg.enableRules.includes(r.id));
    }
    // filter by per-rule languages if provided
    rules = rules.filter((r) => !r.meta?.languages || r.meta.languages.includes(doc.languageId));
    return rules;
  }

  async lint(doc: vscode.TextDocument) {
    if (!this.supports(doc)) return;

    const diags: vscode.Diagnostic[] = [];
    // reset fixes map for this lint run
    this.fixMap = new WeakMap();

    for (const rule of this.activeRulesFor(doc)) {
      const reported: Issue[] = [];
      const options = this.getConfig().ruleOptions?.[rule.id];
      const report = (issue: Issue) => reported.push(issue);

      try {
        await rule.run({ document: doc, options, report });
      } catch (e: any) {
        // surface rule crash
        const range = new vscode.Range(0, 0, 0, 0);
        reported.push({
          message: `[${rule.id}] error: ${e?.message ?? String(e)}`,
          severity: vscode.DiagnosticSeverity.Information,
          range
        });
      }

      for (const iss of reported) {
        const diag = new vscode.Diagnostic(
          iss.range,
          iss.message,
          iss.severity ?? rule.meta?.defaultSeverity ?? vscode.DiagnosticSeverity.Warning
        );
        diag.source = DIAG_SOURCE;
        diag.code = rule.id;
        diags.push(diag);
        if (iss.fix) this.fixMap.set(diag, iss.fix);
      }
    }

    this.collection.set(doc.uri, diags);
  }

  codeActionsProvider(): vscode.CodeActionProvider {
    return {
      provideCodeActions: (
        _doc: vscode.TextDocument,
        _range: vscode.Range,
        context: vscode.CodeActionContext,
        _token: vscode.CancellationToken
      ): vscode.CodeAction[] => {
        const actions: vscode.CodeAction[] = [];
        for (const d of context.diagnostics) {
          const fixer = this.fixMap.get(d);
          if (!fixer) continue;
          const act = new vscode.CodeAction(`Fix: ${d.message}`, vscode.CodeActionKind.QuickFix);
          act.diagnostics = [d];
          act.edit = new vscode.WorkspaceEdit();
          fixer(act.edit);
          actions.push(act);
        }
        return actions;
      }
    };
  }
}
