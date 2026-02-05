const nodemailer = require('nodemailer');
const config = require('../config');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  initialize() {
    if (config.email.provider === 'gmail') {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.email.gmail.user,
          pass: config.email.gmail.pass,
        },
      });
    } else if (config.email.provider === 'sendgrid') {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(config.email.sendgrid.apiKey);
      this.sendgridClient = sgMail;
    }
  }

  async send(options) {
    if (config.email.provider === 'none') {
      console.log('Email service disabled. Would have sent:', options.subject);
      return { success: true, message: 'Email service disabled' };
    }

    const { to, subject, html, text } = options;

    try {
      if (config.email.provider === 'gmail') {
        const info = await this.transporter.sendMail({
          from: `${config.email.fromName} <${config.email.from}>`,
          to,
          subject,
          html,
          text,
        });
        return { success: true, messageId: info.messageId };
      } else if (config.email.provider === 'sendgrid') {
        await this.sendgridClient.send({
          to,
          from: {
            email: config.email.from,
            name: config.email.fromName,
          },
          subject,
          html,
          text,
        });
        return { success: true };
      }
    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }

  // Email Templates

  async sendWelcomeEmail(user) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Welcome to PG Nexus!</h2>
        <p>Hi ${user.name},</p>
        <p>Thank you for joining PG Nexus. Your account has been successfully created.</p>
        <p>Role: <strong>${user.role}</strong></p>
        <p>You can now log in and start managing your PG properties.</p>
        <a href="${config.frontendUrl}/login" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          Login to Your Account
        </a>
        <p style="margin-top: 24px; color: #6B7280;">
          Best regards,<br>
          Team PG Nexus
        </p>
      </div>
    `;

    return this.send({
      to: user.email,
      subject: 'Welcome to PG Nexus',
      html,
      text: `Welcome to PG Nexus! Your account has been created successfully. Visit ${config.frontendUrl}/login to get started.`,
    });
  }

  async sendEmailVerification(user, token) {
    const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Verify Your Email</h2>
        <p>Hi ${user.name},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verificationUrl}" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          Verify Email
        </a>
        <p style="margin-top: 24px; color: #6B7280;">
          This link will expire in 24 hours.
        </p>
        <p style="color: #6B7280;">
          If you didn't create an account, please ignore this email.
        </p>
      </div>
    `;

    return this.send({
      to: user.email,
      subject: 'Verify Your Email - PG Nexus',
      html,
      text: `Verify your email: ${verificationUrl}`,
    });
  }

  async sendPasswordReset(user, token) {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Reset Your Password</h2>
        <p>Hi ${user.name},</p>
        <p>You requested to reset your password. Click the button below to proceed:</p>
        <a href="${resetUrl}" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          Reset Password
        </a>
        <p style="margin-top: 24px; color: #6B7280;">
          This link will expire in 10 minutes.
        </p>
        <p style="color: #6B7280;">
          If you didn't request a password reset, please ignore this email.
        </p>
      </div>
    `;

    return this.send({
      to: user.email,
      subject: 'Reset Your Password - PG Nexus',
      html,
      text: `Reset your password: ${resetUrl}`,
    });
  }

  async sendPaymentReminder(tenant, payment) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Payment Reminder</h2>
        <p>Hi ${tenant.fullName},</p>
        <p>This is a friendly reminder that your rent payment is due.</p>
        <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Amount:</strong> ₹${payment.totalAmount}</p>
          <p style="margin: 4px 0;"><strong>Due Date:</strong> ${new Date(payment.dueDate).toLocaleDateString()}</p>
          <p style="margin: 4px 0;"><strong>Month:</strong> ${new Date(payment.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        </div>
        <a href="${config.frontendUrl}/tenant/payments" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          View Payment Details
        </a>
        <p style="margin-top: 24px; color: #6B7280;">
          Please make the payment before the due date to avoid late fees.
        </p>
      </div>
    `;

    return this.send({
      to: tenant.email,
      subject: 'Rent Payment Reminder - PG Nexus',
      html,
      text: `Payment reminder: ₹${payment.totalAmount} due on ${new Date(payment.dueDate).toLocaleDateString()}`,
    });
  }

  async sendComplaintUpdate(tenant, complaint) {
    const statusText = {
      open: 'received',
      'in-progress': 'being worked on',
      resolved: 'resolved',
      closed: 'closed',
    };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Complaint Status Update</h2>
        <p>Hi ${tenant.fullName},</p>
        <p>Your complaint has been updated.</p>
        <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Title:</strong> ${complaint.title}</p>
          <p style="margin: 4px 0;"><strong>Status:</strong> <span style="text-transform: capitalize;">${statusText[complaint.status]}</span></p>
          ${complaint.response ? `<p style="margin: 4px 0;"><strong>Response:</strong> ${complaint.response}</p>` : ''}
        </div>
        <a href="${config.frontendUrl}/tenant/complaints" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          View Complaint Details
        </a>
      </div>
    `;

    return this.send({
      to: tenant.email,
      subject: `Complaint Update: ${complaint.title} - PG Nexus`,
      html,
      text: `Your complaint "${complaint.title}" status: ${complaint.status}`,
    });
  }

  async sendNoticeAlert(tenant, notice) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">New Notice</h2>
        <p>Hi ${tenant.fullName},</p>
        <p>A new notice has been posted for you:</p>
        <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0;">${notice.title}</h3>
          <p style="margin: 8px 0;">${notice.content}</p>
          <p style="margin: 4px 0; color: #6B7280; font-size: 14px;">
            <strong>Category:</strong> <span style="text-transform: capitalize;">${notice.category}</span>
          </p>
        </div>
        <a href="${config.frontendUrl}/tenant/notices" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          View All Notices
        </a>
      </div>
    `;

    return this.send({
      to: tenant.email,
      subject: `New Notice: ${notice.title} - PG Nexus`,
      html,
      text: `New notice: ${notice.title}. ${notice.content}`,
    });
  }
}

module.exports = new EmailService();
