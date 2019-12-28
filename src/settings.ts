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
    for: 15 * 60 * 1000, // 15 minutes,
    limit: 100 // limit each IP to 100 requests per windowMs
  }
};
