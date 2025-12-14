import nodemailer from 'nodemailer';

async function testEmail() {
  console.log('📧 Testing Gmail SMTP connection...\n');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'akifbade46@gmail.com',
      pass: 'uitijecdgpodxzsj',
    },
  });

  try {
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP Connection successful!\n');

    // Send test email
    console.log('📤 Sending test email...');

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

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.code === 'EAUTH') {
      console.log('\n⚠️ App Password issue. Check:');
      console.log('   1. 2-Step Verification is enabled');
      console.log('   2. App Password is correct (16 chars, no spaces)');
    }
  }
}

testEmail();
