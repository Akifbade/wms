import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

async function setupEmail() {
  try {
    // Get or create company
    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({
        data: { name: 'QGO Cargo', email: 'admin@qgocargo.com' }
      });
    }

    console.log('Company:', company.name, company.id);

    // Upsert email settings
    const settings = await prisma.emailSettings.upsert({
      where: { companyId: company.id },
      update: {
        provider: 'gmail',
        isEnabled: true,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: 'akifbade46@gmail.com',
        smtpPassword: 'uitijecdgpodxzsj',
        senderName: 'QGO Cargo WMS',
        senderEmail: 'akifbade46@gmail.com',
        dailyLimit: 500,
      },
      create: {
        companyId: company.id,
        provider: 'gmail',
        isEnabled: true,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: 'akifbade46@gmail.com',
        smtpPassword: 'uitijecdgpodxzsj',
        senderName: 'QGO Cargo WMS',
        senderEmail: 'akifbade46@gmail.com',
        dailyLimit: 500,
      },
    });

    console.log('\n✅ Email settings configured!');
    console.log('   ID:', settings.id);
    console.log('   Enabled:', settings.isEnabled);
    console.log('   Sender:', settings.senderEmail);

    // Test email
    console.log('\n📧 Sending test email...');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'akifbade46@gmail.com',
        pass: 'hdhhvapuvkvysqfq',
      },
    });

    const info = await transporter.sendMail({
      from: '"QGO Cargo WMS" <akifbade46@gmail.com>',
      to: 'akifbade46@gmail.com',
      subject: '✅ WMS Email Notifications Active!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🎉 Email Notifications Active!</h1>
          </div>
          <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333;">Your WMS email notification system is now configured and working!</p>
            <p style="font-size: 14px; color: #666;">You will receive notifications for:</p>
            <ul style="color: #666;">
              <li>📦 Shipment releases</li>
              <li>📋 Contract expiry alerts</li>
              <li>💰 Payment notifications</li>
              <li>⚠️ Low stock alerts</li>
            </ul>
            <p style="font-size: 12px; color: #999; margin-top: 30px;">
              This is an automated message from QGO Cargo WMS.<br>
              Date: ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      `,
    });

    console.log('✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('\n🎉 Check your inbox at akifbade46@gmail.com');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupEmail();
