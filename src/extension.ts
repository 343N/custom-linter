import * as vscode from 'vscode';
import { RuleRegistry } from './core/registry';
import { Engine } from './core/engine';
import { registerBuiltInRules } from './rules';
import type { RuleDef } from './types';

export type MyLinterAPI = {
  registerRule: (rule: RuleDef) => void;
};

let registry: RuleRegistry;
let engine: Engine;

export function activate(context: vscode.ExtensionContext): MyLinterAPI {
  registry = new RuleRegistry();
  registerBuiltInRules(registry);

  const getConfig = () => ({
    enabled: vscode.workspace.getConfiguration('mylinter').get<boolean>('enabled', true),
    languages: vscode.workspace.getConfiguration('mylinter').get<string[]>('languages', []),
    enableRules: vscode.workspace.getConfiguration('mylinter').get<string[]>('enableRules', []),
    ruleOptions: vscode.workspace.getConfiguration('mylinter').get<Record<string, unknown>>('ruleOptions', {})
  });

  engine = new Engine(registry, getConfig);
  context.subscriptions.push({ dispose: () => engine.dispose() });

  // events
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(doc => engine.lint(doc)),
    vscode.workspace.onDidChangeTextDocument(e => engine.lint(e.document)),
    vscode.workspace.onDidSaveTextDocument(doc => engine.lint(doc)),
    vscode.workspace.onDidChangeConfiguration(() => {
      // re-lint open docs when settings change
      vscode.workspace.textDocuments.forEach(doc => engine.lint(doc));
    })
  );

  // quick fixes
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      getConfig().languages.length ? getConfig().languages : ['*'],
      engine.codeActionsProvider(),
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    )
  );

  // initial pass
  vscode.workspace.textDocuments.forEach(doc => engine.lint(doc));

  // --- PUBLIC API so other extensions can add rules dynamically ---
  const api: MyLinterAPI = {
    registerRule(rule: RuleDef) {
      registry.register(rule);
      console.log(`Registered rule: ${rule.id}`);
      // re-lint currently open docs with the new rule
      vscode.workspace.textDocuments.forEach(doc => engine.lint(doc));
    }
  };

  console.log("EXTENSION STARTED: MyLinter");

  return api;
}

export function deactivate() {}
