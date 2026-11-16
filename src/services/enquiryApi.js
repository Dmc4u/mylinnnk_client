import { apiRequest } from '../auth/authApi.js'

/**
 * POST /api/v1/enquiries: a contact message or a quote request (no account needed). The API emails
 * it to the support inbox and answers { received, reference }.
 */
export const enquiryApi = {
  send: (enquiry) => apiRequest('/enquiries', { method: 'POST', body: enquiry }),
}
