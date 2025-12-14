import nodemailer from 'nodemailer';

async function sendTestReleaseEmail() {
  console.log('📧 Sending test release notification...\n');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'akifbade46@gmail.com',
      pass: 'uitijecdgpodxzsj',
    },
  });

  const info = await transporter.sendMail({
    from: '"QGO Cargo WMS" <akifbade46@gmail.com>',
    to: 'akifbade46@gmail.com',
    subject: '📦 Shipment Released - TEST-SHP-001 - 🎉 Fully Released',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">📦 Shipment Released</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Shipment Code:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">TEST-SHP-001</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Client:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">Ahmed Ali (Test Customer)</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Boxes Released:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">5 of 5</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Released By:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">Admin User</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Released At:</strong></td>
              <td style="padding: 10px 0;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
          <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin-top: 15px;">
            <strong>💰 Total Charges: KWD 125.500</strong>
          </div>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
            This is an automated notification from QGO Cargo WMS.
          </p>
        </div>
      </div>
    `,
  });

  console.log('✅ Release notification email sent!');
  console.log('   Message ID:', info.messageId);
  console.log('\n🎉 Check your Gmail inbox for the test shipment release email!');
}

sendTestReleaseEmail().catch(console.error);
