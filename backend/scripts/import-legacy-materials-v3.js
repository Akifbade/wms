/**
 * Material V3 — one-time legacy import (staging/prod safe, idempotent)
 *
 * WHY: the new Materials V3 system starts empty, so every existing job showed an
 * empty Materials tab while the old report still had data, and V3 stock read 0.
 *
 * WHAT IT DOES
 *  1. Removes throwaway V3 test data (optional, --clean-test)
 *  2. Sets an OPENING BALANCE per material so V3 stock equals the real current
 *     stock (packingMaterial.totalQuantity) - the number every screen already shows
 *  3. Imports old material_issues + material_returns into V3 job lines so each
 *     job's material history is visible and costed. Grouped by issue date into
 *     Day 1, Day 2, Day 3 ...
 *
 * IMPORTANT: imported lines are DISPLAY + costing only. No ledger rows are written
 * for them, because the opening balance already represents the resulting stock.
 * That keeps stock exactly right and avoids double counting.
 *
 * Usage:  node import-legacy-materials-v3.js [--clean-test]
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const COMPANY_ID = process.argv.includes('--company')
  ? process.argv[process.argv.indexOf('--company') + 1]
  : null;

const CLEAN_TEST = process.argv.includes('--clean-test');

async function resolveCompany() {
  if (COMPANY_ID) return COMPANY_ID;
  const c = await prisma.company.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!c) throw new Error('No company found');
  return c.id;
}

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

async function main() {
  const companyId = await resolveCompany();
  console.log('Company:', companyId);
  console.log('Mode:', CLEAN_TEST ? 'clean test data + import' : 'import only');

  /* ---------- 1. optional: drop throwaway test rows ---------- */
  if (CLEAN_TEST) {
    const testPurchases = await prisma.matV3Purchase.findMany({
      where: { companyId, vendorName: { contains: 'TEST' } },
      select: { id: true, purchaseNumber: true },
    });
    for (const tp of testPurchases) {
      await prisma.matV3Ledger.deleteMany({ where: { companyId, purchaseId: tp.id } });
      await prisma.matV3PurchaseItem.deleteMany({ where: { purchaseId: tp.id } });
      await prisma.matV3Purchase.delete({ where: { id: tp.id } });
      console.log('  removed test purchase', tp.purchaseNumber);
    }
    // test job lines: the seeded test job has notes/1-day lines with no legacy match
    const orphanLists = await prisma.matV3PackingList.findMany({ where: { companyId } });
    for (const l of orphanLists) {
      const oldIssueCount = await prisma.materialIssue.count({ where: { companyId, jobId: l.jobId } });
      const lineCount = await prisma.matV3JobLine.count({ where: { companyId, packingListId: l.id } });
      if (oldIssueCount === 0 && lineCount > 0) {
        await prisma.matV3JobLine.deleteMany({ where: { companyId, packingListId: l.id } });
        console.log('  removed test job lines for packing list', l.listNumber);
      }
      if (oldIssueCount === 0 && lineCount === 0) {
        await prisma.matV3PackingList.delete({ where: { id: l.id } });
        console.log('  removed empty packing list', l.listNumber);
      }
    }
  }

  /* ---------- 2. opening balance = real current stock ---------- */
  const materials = await prisma.packingMaterial.findMany({
    where: { companyId },
    select: { id: true, sku: true, name: true, unit: true, totalQuantity: true, unitCost: true },
  });

  let openingCount = 0;
  for (const m of materials) {
    const already = await prisma.matV3Ledger.findFirst({
      where: { companyId, materialId: m.id, reason: 'OPENING_BALANCE' },
    });
    if (already) continue;

    // whatever the new system already recorded (e.g. real purchases made after go-live)
    const rows = await prisma.matV3Ledger.findMany({
      where: { companyId, materialId: m.id },
      select: { direction: true, quantity: true },
    });
    const v3net = rows.reduce((n, r) => n + (r.direction === 'IN' ? r.quantity : -r.quantity), 0);

    const opening = (m.totalQuantity || 0) - v3net;
    if (opening <= 0) continue;

    await prisma.matV3Ledger.create({
      data: {
        companyId,
        materialId: m.id,
        entryType: 'ADJUST',
        direction: 'IN',
        quantity: opening,
        unitCost: m.unitCost || 0,
        notes: `Opening stock for ${m.name}`,
        reason: 'OPENING_BALANCE',
      },
    });
    openingCount++;
  }
  console.log('Opening balances created:', openingCount);

  /* ---------- 3. import legacy job material history ---------- */
  const jobsWithIssues = await prisma.materialIssue.groupBy({
    by: ['jobId'],
    where: { companyId, jobId: { not: null } },
  });

  let importedJobs = 0;
  let importedLines = 0;
  let skipped = 0;

  for (const g of jobsWithIssues) {
    const jobId = g.jobId;
    if (!jobId) continue;

    // idempotent: skip jobs that already have V3 lines
    const existing = await prisma.matV3JobLine.count({ where: { companyId, jobId } });
    if (existing > 0) {
      skipped++;
      continue;
    }

    const issues = await prisma.materialIssue.findMany({
      where: { companyId, jobId },
      orderBy: { issuedAt: 'asc' },
    });
    if (issues.length === 0) continue;

    // packing list per job
    let list = await prisma.matV3PackingList.findFirst({ where: { companyId, jobId } });
    if (!list) {
      const count = await prisma.matV3PackingList.count({ where: { companyId } });
      let listNumber = '';
      for (let i = 1; i < 500; i++) {
        const cand = `PL-${new Date().getFullYear()}-${String(count + i).padStart(4, '0')}`;
        const clash = await prisma.matV3PackingList.findFirst({ where: { companyId, listNumber: cand } });
        if (!clash) {
          listNumber = cand;
          break;
        }
      }
      list = await prisma.matV3PackingList.create({
        data: { companyId, jobId, listNumber, notes: 'Imported from old material records' },
      });
    }

    // group issues by calendar date -> day 1, 2, 3 ...
    const dates = Array.from(new Set(issues.map((i) => dayKey(i.issuedAt)))).sort();
    const dayOf = (d) => dates.indexOf(dayKey(d)) + 1;

    const matIds = Array.from(new Set(issues.map((i) => i.materialId)));
    const mats = await prisma.packingMaterial.findMany({
      where: { id: { in: matIds } },
      select: { id: true, sellingPrice: true },
    });
    const rateById = Object.fromEntries(mats.map((m) => [m.id, m.sellingPrice || 0]));

    // create one line per issue
    const lineByIssue = {};
    for (const iss of issues) {
      const line = await prisma.matV3JobLine.create({
        data: {
          companyId,
          jobId,
          packingListId: list.id,
          dayNumber: dayOf(iss.issuedAt),
          workDate: iss.issuedAt,
          materialId: iss.materialId,
          qtyIssued: iss.quantity || 0,
          qtyReturned: 0,
          qtyDamaged: 0,
          chargeUnitPrice: rateById[iss.materialId] || 0,
          notes: 'Imported from old records',
          createdById: iss.issuedById || null,
        },
      });
      lineByIssue[iss.id] = line;
      importedLines++;
    }

    // apply returns onto their issue line (or the material's latest line)
    const returns = await prisma.materialReturn.findMany({ where: { companyId, jobId } });
    for (const r of returns) {
      let line = r.issueId ? lineByIssue[r.issueId] : null;
      if (!line) {
        const cands = Object.values(lineByIssue).filter((l) => l.materialId === r.materialId);
        line = cands.length ? cands[cands.length - 1] : null;
      }
      if (!line) continue;

      const room = Math.max(0, line.qtyIssued - line.qtyReturned - line.qtyDamaged);
      const good = Math.min(r.quantityGood || 0, room);
      const dmg = Math.min(r.quantityDamaged || 0, Math.max(0, room - good));

      const updated = await prisma.matV3JobLine.update({
        where: { id: line.id },
        data: { qtyReturned: line.qtyReturned + good, qtyDamaged: line.qtyDamaged + dmg },
      });
      lineByIssue[Object.keys(lineByIssue).find((k) => lineByIssue[k].id === line.id)] = updated;
    }

    importedJobs++;
  }

  console.log('Jobs imported:', importedJobs, '| lines:', importedLines, '| skipped (already had V3 lines):', skipped);

  /* ---------- 4. verify ---------- */
  const after = await prisma.packingMaterial.findMany({
    where: { companyId },
    select: { id: true, sku: true, name: true, totalQuantity: true },
    orderBy: { name: 'asc' },
  });
  let mismatch = 0;
  for (const m of after) {
    const rows = await prisma.matV3Ledger.findMany({
      where: { companyId, materialId: m.id },
      select: { direction: true, quantity: true },
    });
    const v3 = rows.reduce((n, r) => n + (r.direction === 'IN' ? r.quantity : -r.quantity), 0);
    if (v3 !== (m.totalQuantity || 0)) {
      mismatch++;
      console.log(`  MISMATCH ${m.sku}: V3=${v3} real=${m.totalQuantity}`);
    }
  }
  console.log('Stock check:', mismatch === 0 ? 'ALL MATCH ✅' : `${mismatch} mismatched`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
