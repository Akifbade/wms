// BACKUP: Statement Email Template - December 15, 2025
// This is a backup before adding PDF attachment feature

export const statementEmailTemplateBackup = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Storage Statement</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f7fa; font-family: Arial, Helvetica, sans-serif;">
  
  <!-- Wrapper Table -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa; padding:30px 0;">
    <tr>
      <td align="center">
        
        <!-- Main Container -->
        <table width="650" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- HEADER with Logo -->
          <tr>
            <td style="background: #0f172a; padding:25px 35px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="140">
                    <img src="http://qgocargo.com/logo.png" alt="QGO Cargo" width="120" height="auto" style="display:block; max-height:50px;" />
                  </td>
                  <td align="right">
                    <p style="margin:0; color:#94a3b8; font-size:12px; text-transform:uppercase; letter-spacing:1px;">Storage Statement</p>
                    <p style="margin:5px 0 0; color:#ffffff; font-size:20px; font-weight:bold;">DATE_PLACEHOLDER</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Customer Info Bar -->
          <tr>
            <td style="background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%); padding:20px 35px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0; color:#ffffff; font-size:18px; font-weight:bold;">📋 COMPANY_NAME_PLACEHOLDER</p>
                    <p style="margin:5px 0 0; color:#dbeafe; font-size:13px;">
                      CONTACT_PLACEHOLDER
                    </p>
                  </td>
                  <td align="right">
                    <table cellpadding="0" cellspacing="0" style="background:STATUS_COLOR; border-radius:8px; padding:10px 20px;">
                      <tr>
                        <td style="color:#ffffff; font-size:11px; text-transform:uppercase;">Status</td>
                      </tr>
                      <tr>
                        <td style="color:#ffffff; font-size:16px; font-weight:bold;">STATUS_TEXT</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN STATS - 4 Colored Cards -->
          <tr>
            <td style="padding:30px 35px 20px;">
              <p style="margin:0 0 15px; color:#1e293b; font-size:14px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">📊 Storage Overview</p>
              <table width="100%" cellpadding="0" cellspacing="10">
                <tr>
                  <!-- Shipments -->
                  <td width="25%" style="background:#3b82f6; border-radius:12px; padding:20px 15px; text-align:center;">
                    <p style="margin:0; color:#ffffff; font-size:28px; font-weight:bold;">SHIPMENT_COUNT</p>
                    <p style="margin:5px 0 0; color:#dbeafe; font-size:11px; text-transform:uppercase;">📦 Shipments</p>
                  </td>
                  <!-- Total CBM -->
                  <td width="25%" style="background:#8b5cf6; border-radius:12px; padding:20px 15px; text-align:center;">
                    <p style="margin:0; color:#ffffff; font-size:28px; font-weight:bold;">TOTAL_CBM</p>
                    <p style="margin:5px 0 0; color:#e9d5ff; font-size:11px; text-transform:uppercase;">📐 Total CBM</p>
                  </td>
                  <!-- Total Boxes -->
                  <td width="25%" style="background:#f59e0b; border-radius:12px; padding:20px 15px; text-align:center;">
                    <p style="margin:0; color:#ffffff; font-size:28px; font-weight:bold;">TOTAL_BOXES</p>
                    <p style="margin:5px 0 0; color:#fef3c7; font-size:11px; text-transform:uppercase;">📦 Boxes</p>
                  </td>
                  <!-- Pallets -->
                  <td width="25%" style="background:#10b981; border-radius:12px; padding:20px 15px; text-align:center;">
                    <p style="margin:0; color:#ffffff; font-size:28px; font-weight:bold;">TOTAL_PALLETS</p>
                    <p style="margin:5px 0 0; color:#d1fae5; font-size:11px; text-transform:uppercase;">🎨 Pallets</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ... rest of template ... -->
          <!-- BILLING RATES BOX, CHARGE PROJECTIONS, BALANCE SUMMARY, SHIPMENTS TABLE, INVOICES TABLE, FOOTER -->

        </table>
        
      </td>
    </tr>
  </table>

</body>
</html>
`;

// Note: This is a backup. Full template is in backend/src/routes/companies.ts
// Route: POST /:profileId/send-statement
// Features:
// - QGO Logo from http://qgocargo.com/logo.png
// - 4 colored stat cards (Shipments, CBM, Boxes, Pallets)
// - Yellow billing rates box
// - 3 charge projection cards (Daily/Monthly/Yearly)
// - Payment summary with color-coded NET BALANCE
// - Shipment details table with notes and pallets
// - Invoice table with status badges
