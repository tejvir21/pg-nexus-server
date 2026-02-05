const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Database
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/pg-nexus',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this',
    expire: process.env.JWT_EXPIRE || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d',
  },

  // File Upload
  upload: {
    provider: process.env.UPLOAD_PROVIDER || 'local', // 'local' or 'cloudinary'
    maxSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10MB
    allowedTypes: {
      images: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      documents: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
    },
    local: {
      uploadDir: path.join(__dirname, '../../uploads'),
    },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
  },

  // Email
  email: {
    provider: process.env.EMAIL_PROVIDER || 'none', // 'gmail', 'sendgrid', or 'none'
    from: process.env.EMAIL_FROM || 'noreply@pgnexus.com',
    fromName: process.env.EMAIL_FROM_NAME || 'PG Nexus',
    gmail: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
    },
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 min
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // Security
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,

  // Socket.IO
  socket: {
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT, 10) || 60000,
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL, 10) || 25000,
  },

  // Admin
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@pgnexus.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123456',
    name: process.env.ADMIN_NAME || 'System Administrator',
  },
};

// Validate critical configuration
const validateConfig = () => {
  const errors = [];

  if (!config.mongodb.uri || config.mongodb.uri.includes('your-mongodb-uri')) {
    errors.push('MONGODB_URI is not configured');
  }

  if (config.jwt.secret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters');
  }

  if (config.upload.provider === 'cloudinary') {
    if (!config.upload.cloudinary.cloudName || !config.upload.cloudinary.apiKey) {
      errors.push('Cloudinary credentials are missing');
    }
  }

  if (config.email.provider === 'gmail' && !config.email.gmail.pass) {
    errors.push('Gmail app password is missing');
  }

  if (config.email.provider === 'sendgrid' && !config.email.sendgrid.apiKey) {
    errors.push('SendGrid API key is missing');
  }

  if (errors.length > 0 && config.env === 'production') {
    console.error('❌ Configuration Errors:');
    errors.forEach((err) => console.error(`   - ${err}`));
    process.exit(1);
  } else if (errors.length > 0) {
    console.warn('⚠️  Configuration Warnings:');
    errors.forEach((err) => console.warn(`   - ${err}`));
  }
};

validateConfig();

module.exports = config;
