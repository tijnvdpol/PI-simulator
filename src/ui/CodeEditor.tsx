import { indentUnit } from '@codemirror/language'
import { python } from '@codemirror/lang-python'
import { EditorState, StateEffect, StateField } from '@codemirror/state'
import { Decoration, EditorView, keymap, type DecorationSet } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { indentWithTab } from '@codemirror/commands'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { editorHighlight, editorTheme } from './editorTheme'

const setErrorLine = StateEffect.define<number | null>()
const errorLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes)
    for (const e of tr.effects) {
      if (e.is(setErrorLine)) {
        if (e.value === null || e.value < 1 || e.value > tr.state.doc.lines) return Decoration.none
        return Decoration.set([Decoration.line({ class: 'cm-error-line' }).range(tr.state.doc.line(e.value).from)])
      }
    }
    return deco
  },
  provide: (f) => EditorView.decorations.from(f),
})

export interface CodeEditorHandle { goToLine(line: number): void }
export interface CodeEditorProps { value: string; onChange: (v: string) => void; errorLine?: number | null }

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor({ value, onChange, errorLine = null }, ref) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup, python(), indentUnit.of('    '), keymap.of([indentWithTab]),
          editorTheme, editorHighlight, errorLineField,
          EditorView.contentAttributes.of({ 'aria-label': 'Python-code' }),
          EditorView.updateListener.of((u) => { if (u.docChanged) onChangeRef.current(u.state.doc.toString()) }),
        ],
      }),
    })
    view.current = v
    return () => { v.destroy(); view.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Code die van buiten verandert (voorbeeld of project geopend).
  useEffect(() => {
    const v = view.current
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } })
  }, [value])

  useEffect(() => { view.current?.dispatch({ effects: setErrorLine.of(errorLine) }) }, [errorLine])

  useImperativeHandle(ref, () => ({
    goToLine(line) {
      const v = view.current
      if (!v || line < 1 || line > v.state.doc.lines) return
      const pos = v.state.doc.line(line).from
      v.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'center' }) })
      v.focus()
    },
  }))

  return <div ref={host} className="min-h-0 flex-1 overflow-hidden" data-testid="code-editor" />
})
