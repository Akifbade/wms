-- Sync physical report URLs from localhost to VPS
UPDATE material_returns SET physicalReportUrl='/uploads/physical-reports/REPORT-1765648304676-709103779.png' WHERE id='cmj4leva90001a3mlmrlblqku';
UPDATE material_returns SET physicalReportUrl='/uploads/physical-reports/REPORT-1765652462118-596842702.png' WHERE id='cmj4nvz7n0001i4l4seuoeq9r';
UPDATE material_returns SET physicalReportUrl='/uploads/physical-reports/REPORT-1765654182390-668098822.jpg' WHERE id='cmj4owuiz0007ftu532phya2e';

-- Verify the updates
SELECT id, physicalReportUrl FROM material_returns WHERE physicalReportUrl IS NOT NULL;
