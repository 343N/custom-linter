import { RuleRegistry } from '../core/registry';
import { noTodo } from './noTodo';
import { maxLineLength } from './maxLineLength';

export function registerBuiltInRules(reg: RuleRegistry) {
  reg.register(noTodo);
  reg.register(maxLineLength);
}
