import { Parser } from 'nearley';
import Grammar from './grammar.ne';

export function createParser() {
  return new Parser(Grammar.ParserRules, Grammar.ParserStart);
}
