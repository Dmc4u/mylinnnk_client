import { useCallback, useReducer } from 'react'

/**
 * Bounded undo/redo history of page snapshots.
 * - `apply(fn, key)` runs a pure page operation. Consecutive edits with the
 *   same `key` within COALESCE_MS merge into one history entry, so typing a
 *   sentence is one undo step, not one per keystroke.
 * - A new edit clears the redo stack.
 * Snapshots hold only serialisable page data (media ids, never object URLs).
 */
const LIMIT = 100
const COALESCE_MS = 900

function reducer(state, action) {
  switch (action.type) {
    case 'apply': {
      const next = action.fn(state.present)
      if (next === state.present) return state
      const now = Date.now()
      const merge = action.key && action.key === state.lastKey && now - state.lastTime < COALESCE_MS
      return {
        past: merge ? state.past : [...state.past, state.present].slice(-LIMIT),
        present: next,
        future: [],
        lastKey: action.key ?? null,
        lastTime: now,
        revision: state.revision + 1,
      }
    }
    case 'undo': {
      if (!state.past.length) return state
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future].slice(0, LIMIT),
        lastKey: null,
        lastTime: 0,
        revision: state.revision + 1,
      }
    }
    case 'redo': {
      if (!state.future.length) return state
      return {
        past: [...state.past, state.present].slice(-LIMIT),
        present: state.future[0],
        future: state.future.slice(1),
        lastKey: null,
        lastTime: 0,
        revision: state.revision + 1,
      }
    }
    case 'reset':
      return init(action.page)
    default:
      return state
  }
}

const init = (page) => ({ past: [], present: page, future: [], lastKey: null, lastTime: 0, revision: 0 })

export default function useEditorHistory(initialPage) {
  const [state, dispatch] = useReducer(reducer, initialPage, init)
  const apply = useCallback((fn, key) => dispatch({ type: 'apply', fn, key }), [])
  const undo = useCallback(() => dispatch({ type: 'undo' }), [])
  const redo = useCallback(() => dispatch({ type: 'redo' }), [])
  const reset = useCallback((page) => dispatch({ type: 'reset', page }), [])
  return {
    page: state.present,
    revision: state.revision,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    apply,
    undo,
    redo,
    reset,
  }
}
