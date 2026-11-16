/**
 * The choices on /contact and /request-quote. Must match the API's ENQUIRY_OPTIONS
 * (mylinnnk_api/services/enquiryService.js); an API test compares the two.
 */
export const ENQUIRY_OPTIONS = Object.freeze({
  contactCategories: {
    'general': 'General question',
    'account': 'Account & sign-in',
    'payments': 'Payments & billing',
    'publishing': 'Publishing my page',
    'problem': 'Report a problem',
    'feedback': 'Feedback & ideas',
    'other': 'Something else',
  },
  occasions: {
    'wedding': 'Wedding',
    'birthday': 'Birthday',
    'anniversary': 'Anniversary',
    'baby': 'Baby or family news',
    'graduation': 'Graduation or milestone',
    'memorial': 'Memorial or tribute',
    'business': 'Business page',
    'portfolio': 'Portfolio',
    'event': 'Event',
    'community': 'Community or organisation',
    'story': 'Personal story',
    'other': 'Something else',
  },
  services: {
    'custom-design': 'Custom page design',
    'template-customisation': 'Customising a template',
    'content-help': 'Writing and content help',
    'several-pages': 'Several pages or a bigger project',
    'publishing-advice': 'Help choosing a publishing plan',
    'other': 'Something else',
  },
  budgets: {
    'not-sure': 'Not sure yet',
    'starter': 'Starter: a single, simple page',
    'standard': 'Standard: a polished page with custom touches',
    'premium': 'Premium: fully bespoke or several pages',
  },
  timelines: {
    'asap': 'As soon as possible',
    '2-weeks': 'Within 2 weeks',
    '1-month': 'Within a month',
    'flexible': 'I’m flexible',
  },
})

/** [[value, label], …] for a SelectField. */
export const optionList = (group) => Object.entries(ENQUIRY_OPTIONS[group])
