import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

// Alle kleuren komen uit de thema-tokens (CSS-variabelen), niet uit hardcoded waarden.
export const editorTheme = EditorView.theme(
  {
    '&': { backgroundColor: 'var(--color-bg)', color: 'var(--color-fg)', height: '100%', fontSize: '14px' },
    '.cm-content': { fontFamily: 'var(--font-mono)', caretColor: 'var(--color-accent)', padding: '8px 0' },
    '.cm-cursor': { borderLeftColor: 'var(--color-accent)' },
    '&.cm-focused': { outline: 'none' },
    '.cm-gutters': { backgroundColor: 'var(--color-panel)', color: 'var(--color-fg-muted)', border: 'none', borderRight: '1px solid var(--color-line)' },
    '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--color-line) 40%, transparent)' },
    '.cm-activeLineGutter': { backgroundColor: 'var(--color-line)', color: 'var(--color-fg)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: 'color-mix(in srgb, var(--color-accent) 30%, transparent)' },
    '.cm-error-line': { backgroundColor: 'color-mix(in srgb, var(--color-danger) 25%, transparent)', boxShadow: 'inset 3px 0 0 var(--color-danger)' },
    '.cm-matchingBracket': { backgroundColor: 'color-mix(in srgb, var(--color-accent) 25%, transparent)', outline: 'none' },
  },
  { dark: true },
)

export const editorHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.definitionKeyword, t.moduleKeyword], color: 'var(--color-accent)' },
    { tag: [t.string, t.special(t.string)], color: 'var(--color-led-yellow)' },
    { tag: [t.number, t.bool, t.null], color: 'var(--color-wire-orange)' },
    { tag: t.comment, color: 'var(--color-fg-muted)', fontStyle: 'italic' },
    { tag: [t.function(t.variableName), t.function(t.propertyName), t.className], color: 'var(--color-wire-blue)' },
    { tag: [t.standard(t.variableName), t.self], color: 'var(--color-wire-purple)' },
  ]),
)
