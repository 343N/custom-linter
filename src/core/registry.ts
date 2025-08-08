import type { RuleDef } from '../types';

export class RuleRegistry {
  private rules = new Map<string, RuleDef>();

  register(rule: RuleDef) {
    if (this.rules.has(rule.id)) throw new Error(`Rule already registered: ${rule.id}`);
    this.rules.set(rule.id, rule);
  }

  getAll(): RuleDef[] {
    return [...this.rules.values()];
  }

  getById(id: string): RuleDef | undefined {
    return this.rules.get(id);
  }
}
