export default () => ({
    port: parseInt(process.env.PORT || '3001', 10),
    database: {
      uri: process.env.MONGODB_URI,
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    },
    services: {
      courseService: {
        apiKey: process.env.SERVICE_API_KEYS_COURSE,
        url: process.env.COURSE_SERVICE_URL,
      },
      paymentService: {
        apiKey: process.env.SERVICE_API_KEYS_PAYMENT,
        url: process.env.PAYMENT_SERVICE_URL,
      },
      notificationService: {
        apiKey: process.env.SERVICE_API_KEYS_NOTIFICATION,
        url: process.env.NOTIFICATION_SERVICE_URL,
      },
    }
  });