// External tokenizer for XLang spike: template strings (`...`, double-backtick escape) + macro expressions #{...}.
// D5 spike only — not production code.
import { ExternalTokenizer } from '@lezer/lr'
import { TemplateString, MacroExpr } from './xlang.parser.terms.js'

const BACKTICK = 96

function scanTemplateString(input) {
  input.advance() // consume opening backtick
  while (input.next >= 0) {
    if (input.next === BACKTICK) { // XLang escapes a literal backtick by doubling it (g4 L201)
      if (input.peek(1) === BACKTICK) {
        input.advance(); input.advance()
        continue
      }
      input.advance()
      input.acceptToken(TemplateString)
      return
    }
    input.advance()
  }
}

function scanMacroExpr(input) {
  input.advance(); input.advance() // consume #{
  let depth = 1
  let quote = -1
  while (depth > 0 && input.next >= 0) {
    const ch = input.next
    if (quote >= 0) {
      if (ch === 92) input.advance() // backslash escape
      else if (ch === quote) quote = -1
    } else if (ch === 34 || ch === 39 || ch === BACKTICK) {
      quote = ch
    } else if (ch === 123) {
      depth++
    } else if (ch === 125) {
      depth--
      if (depth === 0) {
        input.advance()
        input.acceptToken(MacroExpr)
        return
      }
    }
    input.advance()
  }
  // EOF before balanced close: do NOT accept (avoid swallowing to EOF)
}

export const xlangExt = new ExternalTokenizer((input, stack) => {
  if (input.next === BACKTICK) return scanTemplateString(input)
  if (input.next === 35 && input.peek(1) === 123) return scanMacroExpr(input)
})
