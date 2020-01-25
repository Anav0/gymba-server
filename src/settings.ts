export default {
  cookies: {
    validFor: 14,
    unit: "days"
  },
  user: {
    validFor: 7,
    unit: "days"
  },
  validationEmail: {
    validFor: 7,
    unit: "days"
  },
  validationEmailResend: {
    validFor: 1,
    unit: "minutes"
  },
  rateLimit: {
    for: 1 * 60 * 1000, // 1 minutes,
    limit: 500 // limit each IP to 100 requests per windowMs
  }
};
