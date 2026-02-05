# PG Nexus Backend - Complete Setup Guide

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ and npm 9+
- MongoDB Atlas account (free tier works)
- Git

### 2. Installation

```bash
# Clone or extract the backend folder
cd pg-nexus-backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### 3. Configure Environment Variables

Edit `.env` file with your credentials:

#### MongoDB Atlas Setup:
1. Go to https://cloud.mongodb.com/
2. Create account → Create free cluster
3. Click "Connect" → "Connect your application"
4. Copy connection string
5. Replace `<password>` with your database password
6. Paste in `.env` as `MONGODB_URI`

#### JWT Secrets (IMPORTANT):
Generate secure random strings:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Run twice and paste as `JWT_SECRET` and `JWT_REFRESH_SECRET`

#### Email Setup (Gmail):
1. Enable 2FA on Gmail: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Paste 16-character password in `GMAIL_APP_PASSWORD`

#### Optional - Cloudinary (for cloud storage):
1. Sign up at https://cloudinary.com (free tier)
2. Get credentials from Dashboard
3. Set `UPLOAD_PROVIDER=cloudinary` in `.env`

### 4. Start Server

```bash
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm start
```

Server runs on http://localhost:5000

## 📁 Project Structure

```
pg-nexus-backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, validation, error handling
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API endpoints
│   ├── services/        # File upload, email, socket.io
│   ├── utils/           # Helper functions
│   ├── validators/      # Input validation
│   └── server.js        # Entry point
├── uploads/             # Local file storage
├── .env.example         # Environment template
└── package.json         # Dependencies

