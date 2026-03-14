import { MailService } from '@sendgrid/mail';
import twilio from 'twilio';

// Email notification service using SendGrid
class EmailNotificationService {
  private mailService: MailService | undefined;
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY;
    if (this.apiKey) {
      this.mailService = new MailService();
      this.mailService.setApiKey(this.apiKey);
    }
  }

  async sendAlert(to: string, alert: {
    title: string;
    description: string;
    severity: string;
    supplierName?: string;
  }): Promise<boolean> {
    if (!this.apiKey || !this.mailService) {
      console.warn('SendGrid API key not configured');
      return false;
    }

    try {
      const severityColors = {
        low: '#10b981',    // green
        medium: '#f59e0b', // yellow
        high: '#ef4444',   // red
        critical: '#dc2626' // dark red
      };

      const color = severityColors[alert.severity as keyof typeof severityColors] || '#6b7280';

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🚨 ${alert.title}</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">ValidaFornecedor</p>
          </div>
          <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
            <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">${alert.description}</p>
            ${alert.supplierName ? `<p style="margin: 0; color: #6b7280;"><strong>Fornecedor:</strong> ${alert.supplierName}</p>` : ''}
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              Este é um alerta automático do sistema ValidaFornecedor. 
              <a href="https://validafornecedor.replit.app" style="color: ${color};">Acesse o sistema</a> para mais detalhes.
            </p>
          </div>
        </div>
      `;

      await this.mailService.send({
        to,
        from: 'noreply@validafornecedor.com',
        subject: `[ValidaFornecedor] ${alert.title}`,
        html: htmlContent,
        text: `${alert.title}\n\n${alert.description}${alert.supplierName ? `\n\nFornecedor: ${alert.supplierName}` : ''}`
      });

      return true;
    } catch (error) {
      console.error('Failed to send email notification:', error);
      return false;
    }
  }
}

// WhatsApp notification service using Twilio
class WhatsAppNotificationService {
  private client: ReturnType<typeof twilio> | undefined;
  private accountSid: string | undefined;
  private authToken: string | undefined;
  private twilioPhone: string | undefined;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (this.accountSid && this.authToken) {
      this.client = twilio(this.accountSid, this.authToken);
    }
  }

  async sendAlert(to: string, alert: {
    title: string;
    description: string;
    severity: string;
    supplierName?: string;
  }): Promise<boolean> {
    if (!this.client || !this.twilioPhone) {
      console.warn('Twilio credentials not configured');
      return false;
    }

    try {
      const severityEmojis = {
        low: '🟢',
        medium: '🟡', 
        high: '🔴',
        critical: '🚨'
      };

      const emoji = severityEmojis[alert.severity as keyof typeof severityEmojis] || '⚠️';
      
      const message = `${emoji} *${alert.title}*\n\n${alert.description}${alert.supplierName ? `\n\n*Fornecedor:* ${alert.supplierName}` : ''}\n\n_ValidaFornecedor - Sistema de Validação_`;

      await this.client.messages.create({
        body: message,
        from: `whatsapp:${this.twilioPhone}`,
        to: `whatsapp:${to.replace(/\D/g, '').replace(/^/, '+')}`
      });

      return true;
    } catch (error) {
      console.error('Failed to send WhatsApp notification:', error);
      return false;
    }
  }
}

export const emailService = new EmailNotificationService();
export const whatsappService = new WhatsAppNotificationService();

// Main notification service
export class NotificationService {
  static async sendAlert(
    user: any,
    alert: {
      title: string;
      description: string;
      severity: string;
      supplierName?: string;
    }
  ): Promise<void> {
    // Verificar se o usuário tem plano que permite notificações
    const hasNotificationPlan = user.plan === 'pro' || user.plan === 'enterprise';
    if (!hasNotificationPlan) {
      console.log(`User ${user.email} does not have notification plan, skipping notifications`);
      return;
    }

    const promises: Promise<boolean>[] = [];

    // Send email notification if enabled
    if (user.emailNotifications && user.notificationEmail) {
      promises.push(emailService.sendAlert(user.notificationEmail, alert));
    }

    // Send WhatsApp notification if enabled
    if (user.whatsappNotifications && user.whatsappNumber) {
      promises.push(whatsappService.sendAlert(user.whatsappNumber, alert));
    }

    if (promises.length > 0) {
      try {
        const results = await Promise.allSettled(promises);
        const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
        console.log(`Sent ${successful}/${promises.length} notifications for alert: ${alert.title}`);
      } catch (error) {
        console.error('Failed to send notifications:', error);
      }
    }
  }
}