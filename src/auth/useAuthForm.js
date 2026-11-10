import { useCallback, useRef, useState } from 'react'
import { collectErrors } from './validation.js'

/**
 * Small form state helper for the account screens.
 * - `validate` returns { field: message } for the current values.
 * - On a failed check the first invalid field gets focus.
 * - Field errors clear as soon as the user edits that field.
 */
export function useAuthForm(initialValues, validate) {
  const formRef = useRef(null)
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const setField = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev))
  }, [])

  const focusField = useCallback((name) => {
    const field = formRef.current?.elements?.namedItem(name)
    if (field && typeof field.focus === 'function') field.focus()
  }, [])

  /** Applies field errors (e.g. from the API) and focuses the first one. */
  const showFieldErrors = useCallback(
    (fieldErrors) => {
      setErrors(fieldErrors)
      const first = Object.keys(initialValues).find((name) => fieldErrors[name])
      if (first) focusField(first)
    },
    [focusField, initialValues],
  )

  /**
   * Wraps a submit handler: runs client checks, then `action(values)` with a
   * loading state. Returns whatever `action` returns, or undefined on failure.
   */
  const handleSubmit = useCallback(
    (action) => async (event) => {
      event.preventDefault()
      if (submitting) return undefined
      setFormError(null)
      const fieldErrors = collectErrors(validate(values))
      if (Object.keys(fieldErrors).length) {
        showFieldErrors(fieldErrors)
        return undefined
      }
      setErrors({})
      setSubmitting(true)
      try {
        return await action(values)
      } finally {
        setSubmitting(false)
      }
    },
    [showFieldErrors, submitting, validate, values],
  )

  return { formRef, values, setField, errors, showFieldErrors, formError, setFormError, submitting, handleSubmit }
}
