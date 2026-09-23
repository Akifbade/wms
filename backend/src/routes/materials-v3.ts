import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, authorizeRoles, AuthRequest } from "../middleware/auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import { sendNotification } from "../services/emailService";

const prisma = new PrismaClient();
const router = Router();

/* ============================================================
   MATERIAL SYSTEM V3 — SIMPLE LEDGER
   ------------------------------------------------------------
   ONE source of truth for stock: mat_v3_ledger
     PURCHASE  IN   (bought)
     ISSUE     OUT  (given to a job)
     RETURN    IN   (good stock came back)
     ADJUST    IN/OUT (admin correction)
     VOID_PURCHASE OUT (reversal)
   Damaged qty lives on the job line for reporting only —
   it never comes back to stock (no ledger entry).

   Purchase cost  = what we paid supplier (stock value)
   Charge price   = our per-material job rate (billing)
   ============================================================ */

// ---------- helpers ----------
const okNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function ensureDirs() {
  ["uploads", "uploads/packing-lists"].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}
ensureDirs();

const packingStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/packing-lists"),
  filename: (_req, file, cb) => {
    const suffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `PACKLIST-${suffix}${path.extname(file.originalname)}`);
  },
});
const packingUpload = multer({
  storage: packingStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const okExt = /jpeg|jpg|png|gif|webp|pdf/;
    if (okExt.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error("Only image and PDF files are allowed"));
  },
});

async function audit(
  companyId: string,
  entityType: string,
  entityId: string | null,
  action: string,
  before: any,
  after: any,
  reason: string | null,
  user: any
) {
  try {
    await prisma.matV3Audit.create({
      data: {
        companyId,
        entityType,
        entityId,
        action,
        beforeJson: before ? JSON.stringify(before) : null,
        afterJson: after ? JSON.stringify(after) : null,
        reason: reason || null,
        userId: user?.id || null,
        userName: user?.name || user?.email || null,
      },
    });
  } catch (e: any) {
    console.error("[mat-v3] audit failed:", e.message);
  }
}

/** Signed stock for a material: IN adds, OUT subtracts. */
async function stockOf(companyId: string, materialId: string) {
  const rows = await prisma.matV3Ledger.findMany({
    where: { companyId, materialId },
    select: { direction: true, quantity: true },
  });
  return rows.reduce((n, r) => n + (r.direction === "IN" ? r.quantity : -r.quantity), 0);
}

/** Stock snapshot for every material in a company. */
async function stockMap(companyId: string) {
  const rows = await prisma.matV3Ledger.findMany({
    where: { companyId },
    select: { materialId: true, direction: true, quantity: true },
  });
  const map: Record<string, number> = {};
  for (const r of rows) {
    map[r.materialId] = (map[r.materialId] || 0) + (r.direction === "IN" ? r.quantity : -r.quantity);
  }
  return map;
}

/** Weighted-average purchase cost per material (for stock value). */
async function avgCostMap(companyId: string) {
  const items = await prisma.matV3PurchaseItem.findMany({
    where: { companyId, purchase: { status: "ACTIVE" } },
    select: { materialId: true, quantity: true, totalCost: true },
  });
  const acc: Record<string, { q: number; c: number }> = {};
  for (const i of items) {
    const a = (acc[i.materialId] ||= { q: 0, c: 0 });
    a.q += i.quantity || 0;
    a.c += i.totalCost || 0;
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(acc)) out[k] = v.q > 0 ? v.c / v.q : 0;
  return out;
}

/**
 * Normalise one purchase line.
 * Two ways to buy:
 *   plain  -> quantity (base units) x unitCost
 *   pack   -> packQty (boxes) x unitsPerPack (pieces in a box) @ packCost per box
 * In pack mode the per-base-unit cost is derived automatically.
 */
function normalizePurchaseLine(i: any) {
  const packQty = okNum(i.packQty);
  const unitsPerPack = okNum(i.unitsPerPack);
  const packCost = okNum(i.packCost);
  const packUnit = i.packUnit ? String(i.packUnit).trim() : null;

  if (packQty > 0 && unitsPerPack > 0) {
    const quantity = Math.round(packQty * unitsPerPack);
    const totalCost = packCost > 0 ? packQty * packCost : okNum(i.totalCost);
    const unitCost = quantity > 0 ? totalCost / quantity : 0;
    return {
      materialId: String(i.materialId || ""),
      quantity,
      unitCost,
      totalCost,
      packUnit,
      packQty,
      unitsPerPack,
      packCost: packCost > 0 ? packCost : totalCost / packQty,
    };
  }

  const quantity = okNum(i.quantity);
  const unitCost = okNum(i.unitCost);
  return {
    materialId: String(i.materialId || ""),
    quantity,
    unitCost,
    totalCost: quantity * unitCost,
    packUnit: null,
    packQty: null,
    unitsPerPack: null,
    packCost: null,
  };
}

/** "5 BOX x 24 PCS @ 9.000" style description for the ledger note. */
function describePurchaseLine(l: any, materialName: string) {
  if (l.packUnit && l.packQty && l.unitsPerPack) {
    return `${materialName}: ${l.packQty} ${l.packUnit} x ${l.unitsPerPack} = ${l.quantity} units @ ${(l.packCost || 0).toFixed(3)}/${l.packUnit}`;
  }
  return `${materialName}: ${l.quantity} units @ ${(l.unitCost || 0).toFixed(3)}`;
}

async function nextPackingListNumber(companyId: string) {
  const year = new Date().getFullYear();
  const count = await prisma.matV3PackingList.count({ where: { companyId } });
  for (let i = 1; i < 500; i++) {
    const candidate = `PL-${year}-${String(count + i).padStart(4, "0")}`;
    const clash = await prisma.matV3PackingList.findFirst({ where: { companyId, listNumber: candidate } });
    if (!clash) return candidate;
  }
  return `PL-${year}-${Date.now().toString().slice(-6)}`;
}

async function nextPurchaseNumber(companyId: string) {
  const year = new Date().getFullYear();
  const count = await prisma.matV3Purchase.count({ where: { companyId } });
  for (let i = 1; i < 500; i++) {
    const candidate = `PUR-${year}-${String(count + i).padStart(4, "0")}`;
    const clash = await prisma.matV3Purchase.findFirst({ where: { companyId, purchaseNumber: candidate } });
    if (!clash) return candidate;
  }
  return `PUR-${year}-${Date.now().toString().slice(-6)}`;
}

/** Ensure a packing list exists for a job (one per job). */
async function ensurePackingList(companyId: string, jobId: string, userId?: string) {
  const existing = await prisma.matV3PackingList.findFirst({ where: { companyId, jobId } });
  if (existing) return existing;
  const job = await prisma.movingJob.findFirst({ where: { id: jobId, companyId } });
  if (!job) throw new Error("Job not found");
  const listNumber = await nextPackingListNumber(companyId);
  return prisma.matV3PackingList.create({
    data: { companyId, jobId, listNumber, createdById: userId || null },
  });
}

/** Build the full job material picture: days, lines, totals. */
async function jobMaterialView(companyId: string, jobId: string) {
  const list = await prisma.matV3PackingList.findFirst({ where: { companyId, jobId } });
  const lines = list
    ? await prisma.matV3JobLine.findMany({
        where: { companyId, jobId },
        orderBy: [{ dayNumber: "asc" }, { createdAt: "asc" }],
      })
    : [];
  const materials = await prisma.packingMaterial.findMany({
    where: { companyId },
    select: { id: true, sku: true, name: true, unit: true, unitCost: true, sellingPrice: true },
  });
  const mById = Object.fromEntries(materials.map((m) => [m.id, m]));

  const enriched = lines.map((l) => {
    const m = mById[l.materialId];
    const rate = l.chargeUnitPrice || m?.sellingPrice || 0;
    const used = Math.max(0, (l.qtyIssued || 0) - (l.qtyReturned || 0) - (l.qtyDamaged || 0));
    return {
      ...l,
      materialName: m?.name || "Unknown",
      materialSku: m?.sku || "",
      unit: m?.unit || "PCS",
      usedQty: used,
      chargeRate: rate,
      usedAmount: used * rate,
      purchaseCost: used * (m?.unitCost || 0),
    };
  });

  // group per day
  const dayKeys = Array.from(new Set(enriched.map((l) => l.dayNumber))).sort((a, b) => a - b);
  const days = dayKeys.map((d) => {
    const dayLines = enriched.filter((l) => l.dayNumber === d);
    return {
      dayNumber: d,
      workDate: dayLines[0]?.workDate || null,
      lines: dayLines,
      summary: {
        issued: dayLines.reduce((s, l) => s + l.qtyIssued, 0),
        returned: dayLines.reduce((s, l) => s + l.qtyReturned, 0),
        damaged: dayLines.reduce((s, l) => s + l.qtyDamaged, 0),
        used: dayLines.reduce((s, l) => s + l.usedQty, 0),
        amount: dayLines.reduce((s, l) => s + l.usedAmount, 0),
      },
    };
  });

  const totals = {
    issued: enriched.reduce((s, l) => s + l.qtyIssued, 0),
    returned: enriched.reduce((s, l) => s + l.qtyReturned, 0),
    damaged: enriched.reduce((s, l) => s + l.qtyDamaged, 0),
    used: 0,
    chargeAmount: 0,
    purchaseCost: 0,
  };

  // Per-material roll-up for the whole job (a Day-2 return reduces Day-1 usage).
  const byMaterial: Record<string, any> = {};
  for (const l of enriched) {
    const a = (byMaterial[l.materialId] ||= {
      materialId: l.materialId,
      materialName: l.materialName,
      materialSku: l.materialSku,
      unit: l.unit,
      issued: 0,
      returned: 0,
      damaged: 0,
      chargeRate: 0,
      purchaseRate: 0,
    });
    a.issued += l.qtyIssued;
    a.returned += l.qtyReturned;
    a.damaged += l.qtyDamaged;
    if (l.chargeRate > 0) a.chargeRate = l.chargeRate;
    a.purchaseRate = mById[l.materialId]?.unitCost || 0;
  }

  const materialSummary = Object.values(byMaterial).map((a: any) => {
    const used = Math.max(0, a.issued - a.returned - a.damaged);
    const amount = used * a.chargeRate;
    return {
      ...a,
      used,
      amount,
      purchaseCost: used * a.purchaseRate,
      /** issued but the crew has not reported any return/damage yet */
      unreported: a.issued > 0 && a.returned === 0 && a.damaged === 0,
    };
  });

  totals.used = materialSummary.reduce((s: number, a: any) => s + a.used, 0);
  totals.chargeAmount = materialSummary.reduce((s: number, a: any) => s + a.amount, 0);
  totals.purchaseCost = materialSummary.reduce((s: number, a: any) => s + a.purchaseCost, 0);

  const finance = await prisma.matV3JobFinance.findFirst({ where: { companyId, jobId } });

  // Tamper-evidence: every print of the sheet, in order. Copy 1 is the original
  // handover sheet; 2+ are stamped DUPLICATE so a hand-made sheet can't pass.
  const prints = list
    ? await prisma.matV3ListPrint.findMany({
        where: { companyId, packingListId: list.id },
        orderBy: { printNumber: "asc" },
      })
    : [];

  return {
    packingList: list,
    prints,
    printCount: list?.printCount || 0,
    /** issued quantities are frozen once the sheet has been printed */
    issuedLocked: !!list?.lockedAt,
    days,
    lines: enriched,
    materialSummary,
    unreported: materialSummary.filter((a: any) => a.unreported),
    totals,
    finance: finance
      ? {
          ...finance,
          materialsTotal:
            finance.materialsChargeMode === "MANUAL" && finance.manualMaterialsTotal != null
              ? finance.manualMaterialsTotal
              : totals.chargeAmount,
        }
      : {
          materialsChargeMode: "AUTO",
          materialsTotal: totals.chargeAmount,
          laborCost: 0,
          transportCost: 0,
          otherCost: 0,
          discount: 0,
          materialsLocked: false,
        },
    materialsLocked: !!finance?.materialsLocked,
  };
}

/* ============================================================
   MATERIALS MASTER
   ============================================================ */

router.get("/materials", authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const materials = await prisma.packingMaterial.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    });
    const stock = await stockMap(companyId);
    const costs = await avgCostMap(companyId);

    // Remember how each material was last bought (pack unit / units per pack) for auto-fill
    const recentItems = await prisma.matV3PurchaseItem.findMany({
      where: { companyId },
      orderBy: { id: "desc" },
      take: 500,
      select: { materialId: true, packUnit: true, unitsPerPack: true, packCost: true, unitCost: true },
    });
    const lastPack: Record<string, any> = {};
    for (const it of recentItems) {
      if (!lastPack[it.materialId] && it.packUnit && it.unitsPerPack) {
        lastPack[it.materialId] = {
          packUnit: it.packUnit,
          unitsPerPack: it.unitsPerPack,
          packCost: it.packCost,
        };
      }
    }

    res.json(
      materials.map((m) => {
        const onHand = stock[m.id] || 0;
        const unitCost = costs[m.id] || m.unitCost || 0;
        return {
          id: m.id,
          sku: m.sku,
          name: m.name,
          unit: m.unit,
          category: m.category,
          minStockLevel: m.minStockLevel,
          purchaseUnitCost: unitCost,
          chargeUnitPrice: m.sellingPrice || 0,
          onHand,
          stockValue: onHand * unitCost,
          lowStock: m.minStockLevel > 0 && onHand <= m.minStockLevel,
          isActive: m.isActive,
          lastPack: lastPack[m.id] || null,
        };
      })
    );
  } catch (e: any) {
    console.error("[mat-v3] materials list:", e);
    res.status(500).json({ error: "Failed to load materials" });
  }
});

router.post("/materials", authenticateToken as any, authorizeRoles("ADMIN", "MANAGER") as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { sku, name, unit, category, minStockLevel, purchaseUnitCost, chargeUnitPrice, openingQty } = req.body;
    if (!name || !sku) return res.status(400).json({ error: "SKU and name are required" });

    const created = await prisma.packingMaterial.create({
      data: {
        sku: String(sku).trim(),
        name: String(name).trim(),
        unit: unit || "PCS",
        category: category || "General",
        minStockLevel: okNum(minStockLevel),
        unitCost: okNum(purchaseUnitCost),
        sellingPrice: okNum(chargeUnitPrice),
        companyId,
      },
    });

    const opening = okNum(openingQty);
    if (opening > 0) {
      await prisma.matV3Ledger.create({
        data: {
          companyId,
          materialId: created.id,
          entryType: "ADJUST",
          direction: "IN",
          quantity: opening,
          unitCost: created.unitCost || 0,
          notes: "Opening stock",
          reason: "Opening stock at material creation",
          createdById: req.user!.id,
        },
      });
    }
    await audit(companyId, "MATERIAL", created.id, "CREATE", null, created, null, req.user);
    res.status(201).json(created);
  } catch (e: any) {
    console.error("[mat-v3] material create:", e);
    res.status(500).json({ error: "Failed to create material" });
  }
});

router.put("/materials/:id", authenticateToken as any, authorizeRoles("ADMIN", "MANAGER") as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const before = await prisma.packingMaterial.findFirst({ where: { id: req.params.id, companyId } });
    if (!before) return res.status(404).json({ error: "Material not found" });
    const { sku, name, unit, category, minStockLevel, purchaseUnitCost, chargeUnitPrice, isActive } = req.body;
    const updated = await prisma.packingMaterial.update({
      where: { id: before.id },
      data: {
        sku: sku !== undefined ? String(sku).trim() : undefined,
        name: name !== undefined ? String(name).trim() : undefined,
        unit: unit ?? undefined,
        category: category ?? undefined,
        minStockLevel: minStockLevel !== undefined ? okNum(minStockLevel) : undefined,
        unitCost: purchaseUnitCost !== undefined ? okNum(purchaseUnitCost) : undefined,
        sellingPrice: chargeUnitPrice !== undefined ? okNum(chargeUnitPrice) : undefined,
        isActive: isActive !== undefined ? !!isActive : undefined,
      },
    });
    await audit(companyId, "MATERIAL", before.id, "UPDATE", before, updated, req.body?.reason || null, req.user);
    res.json(updated);
  } catch (e: any) {
    console.error("[mat-v3] material update:", e);
    res.status(500).json({ error: "Failed to update material" });
  }
});

router.delete("/materials/:id", authenticateToken as any, authorizeRoles("ADMIN") as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const material = await prisma.packingMaterial.findFirst({ where: { id: req.params.id, companyId } });
    if (!material) return res.status(404).json({ error: "Material not found" });
    const entries = await prisma.matV3Ledger.count({ where: { companyId, materialId: material.id } });
    if (entries > 0) {
      return res.status(400).json({
        error: "This material has stock history and cannot be deleted. Turn it inactive instead.",
        entries,
      });
    }
    await prisma.packingMaterial.delete({ where: { id: material.id } });
    await audit(companyId, "MATERIAL", material.id, "DELETE", material, null, req.body?.reason || null, req.user);
    res.json({ success: true });
  } catch (e: any) {
    console.error("[mat-v3] material delete:", e);
    res.status(500).json({ error: "Failed to delete material" });
  }
});

/* ============================================================
   PURCHASES  (one simple system)
   ============================================================ */

router.get("/purchases", authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const purchases = await prisma.matV3Purchase.findMany({
      where: { companyId },
      include: { items: true },
      orderBy: { purchaseDate: "desc" },
    });
    const materials = await prisma.packingMaterial.findMany({
      where: { companyId },
      select: { id: true, name: true, sku: true, unit: true },
    });
    const mById = Object.fromEntries(materials.map((m) => [m.id, m]));
    res.json(
      purchases.map((p) => ({
        ...p,
        items: p.items.map((i) => ({
          ...i,
          materialName: mById[i.materialId]?.name || "Unknown",
          materialSku: mById[i.materialId]?.sku || "",
          unit: mById[i.materialId]?.unit || "PCS",
        })),
      }))
    );
  } catch (e: any) {
    console.error("[mat-v3] purchases list:", e);
    res.status(500).json({ error: "Failed to load purchases" });
  }
});

router.post("/purchases", authenticateToken as any, authorizeRoles("ADMIN", "MANAGER") as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { vendorName, invoiceNumber, purchaseDate, notes, items } = req.body;
    if (!vendorName) return res.status(400).json({ error: "Vendor name is required" });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "At least one material line is required" });

    const clean = items
      .map((i: any) => normalizePurchaseLine(i))
      .filter((i: any) => i.materialId && i.quantity > 0);

    if (clean.length === 0) {
      return res.status(400).json({ error: "Each line needs a material and quantity greater than 0" });
    }

    const purchaseNumber = (req.body.purchaseNumber && String(req.body.purchaseNumber).trim()) || (await nextPurchaseNumber(companyId));
    const dup = await prisma.matV3Purchase.findFirst({ where: { companyId, purchaseNumber } });
    if (dup) return res.status(400).json({ error: `Purchase number ${purchaseNumber} already exists` });

    const total = clean.reduce((s: number, i: any) => s + i.totalCost, 0);
    const matNames = await prisma.packingMaterial.findMany({
      where: { companyId, id: { in: clean.map((c: any) => c.materialId) } },
      select: { id: true, name: true },
    });
    const nameById = Object.fromEntries(matNames.map((m) => [m.id, m.name]));

    const created = await prisma.$transaction(async (tx) => {
      const purchase = await tx.matV3Purchase.create({
        data: {
          companyId,
          purchaseNumber,
          vendorName: String(vendorName).trim(),
          invoiceNumber: invoiceNumber || null,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          notes: notes || null,
          totalAmount: total,
          createdById: req.user!.id,
        },
      });
      for (const line of clean) {
        await tx.matV3PurchaseItem.create({
          data: {
            purchaseId: purchase.id,
            materialId: line.materialId,
            quantity: line.quantity,
            unitCost: line.unitCost,
            totalCost: line.totalCost,
            packUnit: line.packUnit,
            packQty: line.packQty,
            unitsPerPack: line.unitsPerPack,
            packCost: line.packCost,
            companyId,
          },
        });
        await tx.matV3Ledger.create({
          data: {
            companyId,
            materialId: line.materialId,
            entryType: "PURCHASE",
            direction: "IN",
            quantity: line.quantity,
            unitCost: line.unitCost,
            purchaseId: purchase.id,
            notes: describePurchaseLine(line, nameById[line.materialId] || "Material"),
            createdById: req.user!.id,
          },
        });
      }
      return tx.matV3Purchase.findUnique({ where: { id: purchase.id }, include: { items: true } });
    });

    await audit(companyId, "PURCHASE", created!.id, "CREATE", null, created, null, req.user);
    res.status(201).json(created);
  } catch (e: any) {
    console.error("[mat-v3] purchase create:", e);
    res.status(500).json({ error: "Failed to create purchase" });
  }
});

router.put("/purchases/:id", authenticateToken as any, authorizeRoles("ADMIN") as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const reason = String(req.body?.reason || "").trim();
    if (!reason) return res.status(400).json({ error: "Reason is required for admin purchase edit" });

    const before = await prisma.matV3Purchase.findFirst({
      where: { id: req.params.id, companyId },
      include: { items: true },
    });
    if (!before) return res.status(404).json({ error: "Purchase not found" });
    if (before.status === "VOID") return res.status(400).json({ error: "This purchase is already void" });

    const { vendorName, invoiceNumber, purchaseDate, notes, items } = req.body;
    const clean = Array.isArray(items)
      ? items.map((i: any) => normalizePurchaseLine(i)).filter((i: any) => i.materialId && i.quantity > 0)
      : null;

    // Simulate the new ledger to guarantee nothing goes negative
    const affected = new Set<string>([...before.items.map((i) => i.materialId), ...(clean || []).map((i: any) => i.materialId)]);
    const currentStock = await stockMap(companyId);
    const deltas: Record<string, number> = {};
    for (const it of before.items) deltas[it.materialId] = (deltas[it.materialId] || 0) - it.quantity;
    if (clean) for (const it of clean) deltas[it.materialId] = (deltas[it.materialId] || 0) + it.quantity;

    for (const mid of affected) {
      if ((currentStock[mid] || 0) + (deltas[mid] || 0) < 0) {
        return res.status(400).json({ error: "Cannot apply this change — stock would go negative (material already used)." });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.matV3Ledger.deleteMany({ where: { companyId, purchaseId: before.id } });
      const total = clean ? clean.reduce((s: number, i: any) => s + i.totalCost, 0) : before.totalAmount;

      const matNames = await tx.packingMaterial.findMany({
        where: { companyId, id: { in: (clean || before.items).map((c: any) => c.materialId) } },
        select: { id: true, name: true },
      });
      const nameById = Object.fromEntries(matNames.map((m) => [m.id, m.name]));

      await tx.matV3Purchase.update({
        where: { id: before.id },
        data: {
          vendorName: vendorName ?? undefined,
          invoiceNumber: invoiceNumber ?? undefined,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
          notes: notes ?? undefined,
          totalAmount: total,
        },
      });

      if (clean) {
        await tx.matV3PurchaseItem.deleteMany({ where: { purchaseId: before.id } });
        for (const line of clean) {
          await tx.matV3PurchaseItem.create({
            data: {
              purchaseId: before.id,
              materialId: line.materialId,
              quantity: line.quantity,
              unitCost: line.unitCost,
              totalCost: line.totalCost,
              packUnit: line.packUnit,
              packQty: line.packQty,
              unitsPerPack: line.unitsPerPack,
              packCost: line.packCost,
              companyId,
            },
          });
          await tx.matV3Ledger.create({
            data: {
              companyId,
              materialId: line.materialId,
              entryType: "PURCHASE",
              direction: "IN",
              quantity: line.quantity,
              unitCost: line.unitCost,
              purchaseId: before.id,
              notes: `${describePurchaseLine(line, nameById[line.materialId] || "Material")} (edited)`,
              reason,
              createdById: req.user!.id,
            },
          });
        }
      } else {
        // vendor/date only edit — rebuild ledger from existing items
        const itemsNow = await tx.matV3PurchaseItem.findMany({ where: { purchaseId: before.id } });
        for (const it of itemsNow) {
          await tx.matV3Ledger.create({
            data: {
              companyId,
              materialId: it.materialId,
              entryType: "PURCHASE",
              direction: "IN",
              quantity: it.quantity,
              unitCost: it.unitCost,
              purchaseId: before.id,
              notes: `${describePurchaseLine(it, nameById[it.materialId] || "Material")} (edited)`,
              reason,
              createdById: req.user!.id,
            },
          });
        }
      }
      return tx.matV3Purchase.findUnique({ where: { id: before.id }, include: { items: true } });
    });

    await audit(companyId, "PURCHASE", before.id, "UPDATE", before, updated, reason, req.user);
    res.json(updated);
  } catch (e: any) {
    console.error("[mat-v3] purchase update:", e);
    res.status(500).json({ error: "Failed to update purchase" });
  }
});

router.delete("/purchases/:id", authenticateToken as any, authorizeRoles("ADMIN") as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const reason = String(req.body?.reason || "").trim();
    if (!reason) return res.status(400).json({ error: "Reason is required for admin purchase void" });

    const before = await prisma.matV3Purchase.findFirst({
      where: { id: req.params.id, companyId },
      include: { items: true },
    });
    if (!before) return res.status(404).json({ error: "Purchase not found" });
    if (before.status === "VOID") return res.status(400).json({ error: "Already void" });

    const currentStock = await stockMap(companyId);
    for (const it of before.items) {
      if ((currentStock[it.materialId] || 0) - it.quantity < 0) {
        return res.status(400).json({
          error: "Cannot void — this purchased stock has already been issued/used. Edit the quantity instead.",
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const it of before.items) {
        await tx.matV3Ledger.create({
          data: {
            companyId,
            materialId: it.materialId,
            entryType: "VOID_PURCHASE",
            direction: "OUT",
            quantity: it.quantity,
            unitCost: it.unitCost,
            purchaseId: before.id,
            notes: `Void of purchase ${before.purchaseNumber}`,
            reason,
            createdById: req.user!.id,
          },
        });
      }
      await tx.matV3Purchase.update({
        where: { id: before.id },
        data: { status: "VOID", voidReason: reason },
      });
    });

    await audit(companyId, "PURCHASE", before.id, "VOID", before, { status: "VOID" }, reason, req.user);
    res.json({ success: true, status: "VOID" });
  } catch (e: any) {
    console.error("[mat-v3] purchase void:", e);
    res.status(500).json({ error: "Failed to void purchase" });
  }
});

/* ============================================================
   STOCK SNAPSHOT + ADJUST
   ============================================================ */

router.get("/stock", authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const materials = await prisma.packingMaterial.findMany({ where: { companyId }, orderBy: { name: "asc" } });
    const stock = await stockMap(companyId);
    const costs = await avgCostMap(companyId);

    const ledger = await prisma.matV3Ledger.findMany({
      where: { companyId },
      select: { materialId: true, entryType: true, direction: true, quantity: true },
    });
    const roll: Record<string, any> = {};
    for (const l of ledger) {
      const a = (roll[l.materialId] ||= { purchased: 0, issued: 0, returned: 0, adjusted: 0 });
      if (l.entryType === "PURCHASE") a.purchased += l.quantity;
      else if (l.entryType === "ISSUE") a.issued += l.quantity;
      else if (l.entryType === "RETURN") a.returned += l.quantity;
      else if (l.entryType === "ADJUST" || l.entryType === "VOID_PURCHASE") a.adjusted += l.direction === "IN" ? l.quantity : -l.quantity;
    }

    const damages = await prisma.matV3JobLine.groupBy({
      by: ["materialId"],
      where: { companyId },
      _sum: { qtyDamaged: true },
    });
    const dmgMap = Object.fromEntries(damages.map((d) => [d.materialId, d._sum.qtyDamaged || 0]));

    res.json(
      materials.map((m) => {
        const r = roll[m.id] || { purchased: 0, issued: 0, returned: 0, adjusted: 0 };
        const onHand = stock[m.id] || 0;
        const unitCost = costs[m.id] || m.unitCost || 0;
        return {
          id: m.id,
          sku: m.sku,
          name: m.name,
          unit: m.unit,
          category: m.category,
          minStockLevel: m.minStockLevel,
          purchased: r.purchased,
          issued: r.issued,
          returned: r.returned,
          damaged: dmgMap[m.id] || 0,
          adjusted: r.adjusted,
          onHand,
          purchaseUnitCost: unitCost,
          chargeUnitPrice: m.sellingPrice || 0,
          stockValue: onHand * unitCost,
          lowStock: m.minStockLevel > 0 && onHand <= m.minStockLevel,
        };
      })
    );
  } catch (e: any) {
    console.error("[mat-v3] stock:", e);
    res.status(500).json({ error: "Failed to load stock" });
  }
});

router.post("/stock/adjust", authenticateToken as any, authorizeRoles("ADMIN") as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { materialId, quantity, reason, direction } = req.body;
    const qty = Math.abs(okNum(quantity));
    const dir = direction === "OUT" ? "OUT" : "IN";
    const why = String(reason || "").trim();
    if (!materialId || qty <= 0) return res.status(400).json({ error: "Material and quantity are required" });
    if (!why) return res.status(400).json({ error: "Reason is required for stock adjustment" });

    if (dir === "OUT" && (await stockOf(companyId, materialId)) - qty < 0) {
      return res.status(400).json({ error: "Cannot reduce below zero stock" });
    }

    const entry = await prisma.matV3Ledger.create({
      data: {
        companyId,
        materialId,
        entryType: "ADJUST",
        direction: dir,
        quantity: qty,
        notes: why,
        reason: why,
        createdById: req.user!.id,
      },
    });
    await audit(companyId, "STOCK", materialId, "ADJUST", null, entry, why, req.user);
    res.status(201).json(entry);
  } catch (e: any) {
    console.error("[mat-v3] adjust:", e);
    res.status(500).json({ error: "Failed to adjust stock" });
  }
});

/* ============================================================
   MOVING JOB — MATERIALS (multi-day)
   ============================================================ */

/**
 * Guard: the crew's hand-written sheet is the proof behind every number, and the
 * paper only comes back to the office at the end. So nothing may be entered or
 * changed until that signed sheet is attached to the job.
 * An admin can override with { force: true }.
 */
async function requireSignedSheet(list: any, req: AuthRequest, res: Response): Promise<boolean> {
  if (list?.attachmentUrl) return true;
  if (req.body?.force && req.user!.role === "ADMIN") return true;
  res.status(400).json({
    error:
      "Attach the photo of the signed packing list sheet first — that paper is the proof for these numbers.",
    needsAttachment: true,
  });
  return false;
}

router.get("/jobs/:jobId/materials", authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    let view = await jobMaterialView(companyId, req.params.jobId);
    if (!view.packingList) {
      // auto-create the packing list the first time materials are viewed
      await ensurePackingList(companyId, req.params.jobId, req.user!.id);
      view = await jobMaterialView(companyId, req.params.jobId);
    }
    res.json(view);
  } catch (e: any) {
    console.error("[mat-v3] job materials:", e);
    res.status(500).json({ error: e.message || "Failed to load job materials" });
  }
});

/** Print-ready packing list payload (blank form the crew carries). */
router.get("/jobs/:jobId/packing-list", authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const list = await ensurePackingList(companyId, req.params.jobId, req.user!.id);
    const job = await prisma.movingJob.findFirst({ where: { id: req.params.jobId, companyId } });
    const lines = await prisma.matV3JobLine.findMany({
      where: { companyId, jobId: req.params.jobId },
      orderBy: [{ dayNumber: "asc" }, { createdAt: "asc" }],
    });
    const materials = await prisma.packingMaterial.findMany({
      where: { companyId },
      select: { id: true, name: true, sku: true, unit: true, sellingPrice: true },
    });
    const company = await prisma.company.findFirst({ where: { id: companyId }, select: { name: true } });
    const mById = Object.fromEntries(materials.map((m) => [m.id, m]));
    res.json({
      packingList: list,
      job,
      companyName: company?.name || "QGO Cargo",
      availableMaterials: materials.map((m) => ({ ...m, chargeUnitPrice: m.sellingPrice || 0 })),
      lines: lines.map((l) => ({
        ...l,
        materialName: mById[l.materialId]?.name || "Unknown",
        materialSku: mById[l.materialId]?.sku || "",
        unit: mById[l.materialId]?.unit || "PCS",
        usedQty: Math.max(0, l.qtyIssued - l.qtyReturned - l.qtyDamaged),
      })),
    });
  } catch (e: any) {
    console.error("[mat-v3] packing list:", e);
    res.status(500).json({ error: "Failed to load packing list" });
  }
});

/**
 * Record a print of the packing list sheet.
 * Copy 1 = the original handover sheet (this also freezes the issued quantities).
 * Copy 2+ = stamped DUPLICATE, reason required, and shown in the job.
 * A sheet made by hand has no entry here — that is what makes it detectable.
 */
router.post(
  "/jobs/:jobId/packing-list/print",
  authenticateToken as any,
  authorizeRoles("ADMIN", "MANAGER", "SUPERVISOR") as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const companyId = req.user!.companyId;
      const list = await ensurePackingList(companyId, req.params.jobId, req.user!.id);
      const reason = (req.body?.reason || "").trim();
      const printNumber = (list.printCount || 0) + 1;
      const isDuplicate = printNumber > 1;

      if (isDuplicate && !reason) {
        return res.status(400).json({
          error: `This sheet was already printed (copy #${printNumber - 1}). A reprint needs a reason.`,
          needsReason: true,
          printNumber,
        });
      }

      const me = await prisma.user.findFirst({ where: { id: req.user!.id }, select: { name: true } });

      const record = await prisma.matV3ListPrint.create({
        data: {
          companyId,
          packingListId: list.id,
          jobId: req.params.jobId,
          listNumber: list.listNumber,
          printNumber,
          isDuplicate,
          printedById: req.user!.id,
          printedByName: me?.name || "",
          reason: reason || null,
        },
      });

      const updated = await prisma.matV3PackingList.update({
        where: { id: list.id },
        data: {
          printCount: printNumber,
          firstPrintedAt: list.firstPrintedAt || new Date(),
          firstPrintedById: list.firstPrintedById || req.user!.id,
          // freeze the outbound quantities from the very first print
          lockedAt: list.lockedAt || new Date(),
        },
      });

      await prisma.matV3Audit.create({
        data: {
          companyId,
          entityType: "PACKING_LIST",
          entityId: list.id,
          action: isDuplicate ? "PACKING_LIST_REPRINT" : "PACKING_LIST_PRINT",
          afterJson: JSON.stringify({
            jobId: req.params.jobId,
            listNumber: list.listNumber,
            printNumber,
            isDuplicate,
            reason: reason || null,
          }),
          reason: reason || null,
          userId: req.user!.id,
          userName: me?.name || "",
        },
      });

      res.json({
        printNumber,
        isDuplicate,
        listNumber: list.listNumber,
        printedAt: record.createdAt,
        printedByName: me?.name || "",
        reason: reason || null,
        lockedAt: updated.lockedAt,
      });
    } catch (e: any) {
      console.error("[mat-v3] packing list print:", e);
      res.status(500).json({ error: e.message || "Failed to record print" });
    }
  }
);

router.post("/jobs/:jobId/packing-list/attachment", authenticateToken as any, packingUpload.single("file") as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const list = await ensurePackingList(companyId, req.params.jobId, req.user!.id);
    const before = { ...list };
    const url = `/uploads/packing-lists/${req.file.filename}`;
    const updated = await prisma.matV3PackingList.update({
      where: { id: list.id },
      data: { attachmentUrl: url, attachmentName: req.file.originalname },
    });
    await audit(companyId, "PACKING_LIST", list.id, "UPDATE", before, updated, "Packing list attachment uploaded", req.user);
    res.json({ success: true, packingList: updated, url });
  } catch (e: any) {
    console.error("[mat-v3] packing attach:", e);
    res.status(500).json({ error: "Failed to attach packing list" });
  }
});

/** Add a material line for a day (issue out of stock). */
router.post("/jobs/:jobId/lines", authenticateToken as any, authorizeRoles("ADMIN", "MANAGER") as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { materialId, dayNumber, workDate, qtyIssued, qtyReturned, qtyDamaged, chargeUnitPrice, notes } = req.body;
    if (!materialId) return res.status(400).json({ error: "Material is required" });

    const list = await ensurePackingList(companyId, req.params.jobId, req.user!.id);
    if (list.status === "CLOSED") return res.status(400).json({ error: "Job materials are closed. Reopen first." });
    if (!(await requireSignedSheet(list, req, res))) return;

    const issued = okNum(qtyIssued);
    const returned = okNum(qtyReturned);
    const damaged = okNum(qtyDamaged);
    if (issued <= 0 && returned <= 0 && damaged <= 0) {
      return res.status(400).json({ error: "Enter issued, returned or damaged quantity" });
    }

    // How much of this material is still out on site for this job?
    const priorLines = await prisma.matV3JobLine.findMany({
      where: { companyId, jobId: req.params.jobId, materialId },
      select: { qtyIssued: true, qtyReturned: true, qtyDamaged: true },
    });
    const outstandingBefore = priorLines.reduce(
      (s, l) => s + ((l.qtyIssued || 0) - (l.qtyReturned || 0) - (l.qtyDamaged || 0)),
      0
    );
    const maxReturnable = outstandingBefore + issued;
    if (returned + damaged > maxReturnable) {
      return res.status(400).json({
        error: `Only ${maxReturnable} ${'unit(s)'} of this material can be returned — that is what is still out on site for this job.`,
        outstanding: outstandingBefore,
      });
    }

    const material = await prisma.packingMaterial.findFirst({ where: { id: materialId, companyId } });
    if (!material) return res.status(404).json({ error: "Material not found" });

    if (issued > 0) {
      const have = await stockOf(companyId, materialId);
      if (issued > have) {
        return res.status(400).json({ error: `Insufficient stock for ${material.name}. Available: ${have} ${material.unit}, requested: ${issued}` });
      }
    }

    const line = await prisma.$transaction(async (tx) => {
      const created = await tx.matV3JobLine.create({
        data: {
          companyId,
          jobId: req.params.jobId,
          packingListId: list.id,
          dayNumber: okNum(dayNumber) || 1,
          workDate: workDate ? new Date(workDate) : new Date(),
          materialId,
          qtyIssued: issued,
          qtyReturned: returned,
          qtyDamaged: damaged,
          chargeUnitPrice: okNum(chargeUnitPrice) || material.sellingPrice || 0,
          notes: notes || null,
          createdById: req.user!.id,
        },
      });
      if (issued > 0) {
        await tx.matV3Ledger.create({
          data: {
            companyId,
            materialId,
            entryType: "ISSUE",
            direction: "OUT",
            quantity: issued,
            unitCost: material.unitCost || 0,
            jobId: req.params.jobId,
            dayNumber: created.dayNumber,
            packingListId: list.id,
            jobLineId: created.id,
            notes: `Issued to job (day ${created.dayNumber})`,
            createdById: req.user!.id,
          },
        });
      }
      if (returned > 0) {
        await tx.matV3Ledger.create({
          data: {
            companyId,
            materialId,
            entryType: "RETURN",
            direction: "IN",
            quantity: returned,
            unitCost: material.unitCost || 0,
            jobId: req.params.jobId,
            dayNumber: created.dayNumber,
            packingListId: list.id,
            jobLineId: created.id,
            notes: `Returned from job (day ${created.dayNumber})`,
            createdById: req.user!.id,
          },
        });
      }
      return created;
    });

    await audit(companyId, "JOB_LINE", line.id, "CREATE", null, line, null, req.user);
    res.status(201).json(line);
  } catch (e: any) {
    console.error("[mat-v3] job line create:", e);
    res.status(500).json({ error: "Failed to add material line" });
  }
});

/** Update a line: returns / damaged / rate. Ledger adjusts in place. */
router.put("/jobs/:jobId/lines/:lineId", authenticateToken as any, authorizeRoles("ADMIN", "MANAGER") as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const line = await prisma.matV3JobLine.findFirst({ where: { id: req.params.lineId, companyId, jobId: req.params.jobId } });
    if (!line) return res.status(404).json({ error: "Line not found" });
    const before = { ...line };

    const list = await prisma.matV3PackingList.findUnique({ where: { id: line.packingListId } });
    if (list?.status === "CLOSED") {
      const role = req.user!.role;
      const reason = String(req.body?.reason || "").trim();
      if (role !== "ADMIN") return res.status(400).json({ error: "Job materials are closed. Only admin can change." });
      if (!reason) return res.status(400).json({ error: "Reason is required to edit closed job materials" });
    }

    if (!(await requireSignedSheet(list, req, res))) return;

    // NOTE: no print-lock on the out quantity here.
    // The real flow is: the BLANK sheet is printed and taken to the warehouse,
    // the crew writes everything by hand, and only when the material comes back
    // does the supervisor enter the numbers. So printing happens BEFORE entry and
    // must never block it. What protects the numbers is:
    //   - the sheet carries a system-issued list number + a logged print record
    //   - the signed sheet photo must be attached before anything is entered
    //   - closing the job locks the entry (admin + reason to change afterwards)

    const issued = req.body.qtyIssued !== undefined ? okNum(req.body.qtyIssued) : line.qtyIssued;
    const returned = req.body.qtyReturned !== undefined ? okNum(req.body.qtyReturned) : line.qtyReturned;
    const damaged = req.body.qtyDamaged !== undefined ? okNum(req.body.qtyDamaged) : line.qtyDamaged;

    // Outstanding for this material on this job, excluding the line being edited
    const otherLines = await prisma.matV3JobLine.findMany({
      where: { companyId, jobId: line.jobId, materialId: line.materialId, id: { not: line.id } },
      select: { qtyIssued: true, qtyReturned: true, qtyDamaged: true },
    });
    const otherOutstanding = otherLines.reduce(
      (s, l) => s + ((l.qtyIssued || 0) - (l.qtyReturned || 0) - (l.qtyDamaged || 0)),
      0
    );
    if (returned + damaged > otherOutstanding + issued) {
      return res.status(400).json({
        error: `Returned + damaged cannot exceed what is out on site for this job (${otherOutstanding + issued}).`,
      });
    }

    const material = await prisma.packingMaterial.findFirst({ where: { id: line.materialId, companyId } });
    const deltaIssue = issued - line.qtyIssued;
    const deltaReturn = returned - line.qtyReturned;

    if (deltaIssue > 0) {
      const have = await stockOf(companyId, line.materialId);
      if (deltaIssue > have) return res.status(400).json({ error: `Insufficient stock. Available: ${have}` });
    }
    if (deltaIssue < 0) {
      // taking stock back out of the job — would reduce stock further
      const have = await stockOf(companyId, line.materialId);
      if (have + deltaIssue < 0) return res.status(400).json({ error: "Stock would go negative" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.matV3JobLine.update({
        where: { id: line.id },
        data: {
          dayNumber: req.body.dayNumber !== undefined ? okNum(req.body.dayNumber) || line.dayNumber : undefined,
          workDate: req.body.workDate ? new Date(req.body.workDate) : undefined,
          qtyIssued: issued,
          qtyReturned: returned,
          qtyDamaged: damaged,
          chargeUnitPrice: req.body.chargeUnitPrice !== undefined ? okNum(req.body.chargeUnitPrice) : undefined,
          notes: req.body.notes !== undefined ? req.body.notes : undefined,
          updatedById: req.user!.id,
        },
      });

      // ISSUE ledger row
      const issueRow = await tx.matV3Ledger.findFirst({ where: { companyId, jobLineId: line.id, entryType: "ISSUE" } });
      if (issued > 0) {
        if (issueRow) await tx.matV3Ledger.update({ where: { id: issueRow.id }, data: { quantity: issued } });
        else
          await tx.matV3Ledger.create({
            data: {
              companyId,
              materialId: line.materialId,
              entryType: "ISSUE",
              direction: "OUT",
              quantity: issued,
              unitCost: material?.unitCost || 0,
              jobId: line.jobId,
              dayNumber: u.dayNumber,
              packingListId: line.packingListId,
              jobLineId: line.id,
              notes: `Issued to job (day ${u.dayNumber})`,
              createdById: req.user!.id,
            },
          });
      } else if (issueRow && deltaIssue !== 0) {
        await tx.matV3Ledger.delete({ where: { id: issueRow.id } });
      }

      // RETURN ledger row
      const returnRow = await tx.matV3Ledger.findFirst({ where: { companyId, jobLineId: line.id, entryType: "RETURN" } });
      if (returned > 0) {
        if (returnRow) await tx.matV3Ledger.update({ where: { id: returnRow.id }, data: { quantity: returned } });
        else
          await tx.matV3Ledger.create({
            data: {
              companyId,
              materialId: line.materialId,
              entryType: "RETURN",
              direction: "IN",
              quantity: returned,
              unitCost: material?.unitCost || 0,
              jobId: line.jobId,
              dayNumber: u.dayNumber,
              packingListId: line.packingListId,
              jobLineId: line.id,
              notes: `Returned from job (day ${u.dayNumber})`,
              createdById: req.user!.id,
            },
          });
      } else if (returnRow) {
        await tx.matV3Ledger.delete({ where: { id: returnRow.id } });
      }

      return u;
    });

    await audit(companyId, "JOB_LINE", line.id, "UPDATE", before, updated, req.body?.reason || null, req.user);
    res.json(updated);
  } catch (e: any) {
    console.error("[mat-v3] job line update:", e);
    res.status(500).json({ error: "Failed to update line" });
  }
});

router.delete("/jobs/:jobId/lines/:lineId", authenticateToken as any, authorizeRoles("ADMIN", "MANAGER") as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const line = await prisma.matV3JobLine.findFirst({ where: { id: req.params.lineId, companyId, jobId: req.params.jobId } });
    if (!line) return res.status(404).json({ error: "Line not found" });
    const list = await prisma.matV3PackingList.findUnique({ where: { id: line.packingListId } });
    if (list?.status === "CLOSED" && req.user!.role !== "ADMIN") {
      return res.status(400).json({ error: "Job materials are closed. Only admin can change." });
    }
    // Printed lines are NOT protected here — the sheet is printed blank before
    // the material leaves, and entry happens afterwards. Closing is what locks.
    await prisma.$transaction(async (tx) => {
      await tx.matV3Ledger.deleteMany({ where: { companyId, jobLineId: line.id } });
      await tx.matV3JobLine.delete({ where: { id: line.id } });
    });
    await audit(companyId, "JOB_LINE", line.id, "DELETE", line, null, req.body?.reason || null, req.user);
    res.json({ success: true });
  } catch (e: any) {
    console.error("[mat-v3] job line delete:", e);
    res.status(500).json({ error: "Failed to delete line" });
  }
});

/* ============================================================
   JOB FINANCE (manual pricing) + CLOSE
   ============================================================ */

router.put("/jobs/:jobId/finance", authenticateToken as any, authorizeRoles("ADMIN", "MANAGER") as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const existing = await prisma.matV3JobFinance.findFirst({ where: { companyId, jobId: req.params.jobId } });
    if (existing?.materialsLocked && req.user!.role !== "ADMIN") {
      return res.status(400).json({ error: "Job materials are locked. Only admin can change pricing." });
    }
    const data = {
      materialsChargeMode: req.body.materialsChargeMode === "MANUAL" ? "MANUAL" : "AUTO",
      manualMaterialsTotal: req.body.manualMaterialsTotal !== undefined ? okNum(req.body.manualMaterialsTotal) : undefined,
      laborCost: req.body.laborCost !== undefined ? okNum(req.body.laborCost) : undefined,
      transportCost: req.body.transportCost !== undefined ? okNum(req.body.transportCost) : undefined,
      otherCost: req.body.otherCost !== undefined ? okNum(req.body.otherCost) : undefined,
      discount: req.body.discount !== undefined ? okNum(req.body.discount) : undefined,
      notes: req.body.notes !== undefined ? req.body.notes : undefined,
      updatedById: req.user!.id,
    };
    const before = existing ? { ...existing } : null;
    const saved = existing
      ? await prisma.matV3JobFinance.update({ where: { id: existing.id }, data })
      : await prisma.matV3JobFinance.create({ data: { companyId, jobId: req.params.jobId, ...data } });
    await audit(companyId, "FINANCE", saved.id, existing ? "UPDATE" : "CREATE", before, saved, req.body?.reason || null, req.user);
    res.json(saved);
  } catch (e: any) {
    console.error("[mat-v3] finance save:", e);
    res.status(500).json({ error: "Failed to save job pricing" });
  }
});

router.get("/jobs/:jobId/report", authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const view = await jobMaterialView(companyId, req.params.jobId);
    const job = await prisma.movingJob.findFirst({ where: { id: req.params.jobId, companyId } });
    const f = view.finance as any;
    const materialsTotal = f.materialsTotal || 0;
    const costTotal = (f.laborCost || 0) + (f.transportCost || 0) + (f.otherCost || 0);
    const grand = materialsTotal + costTotal - (f.discount || 0);
    res.json({
      job,
      packingList: view.packingList,
      days: view.days,
      totals: view.totals,
      finance: f,
      calculation: {
        materialsTotal,
        laborCost: f.laborCost || 0,
        transportCost: f.transportCost || 0,
        otherCost: f.otherCost || 0,
        discount: f.discount || 0,
        costTotal,
        grandTotal: grand,
        purchaseCostOfUsed: view.totals.purchaseCost,
        materialProfit: materialsTotal - view.totals.purchaseCost,
      },
      materialsLocked: view.materialsLocked,
    });
  } catch (e: any) {
    console.error("[mat-v3] job report:", e);
    res.status(500).json({ error: "Failed to build job report" });
  }
});

router.post("/jobs/:jobId/close", authenticateToken as any, authorizeRoles("ADMIN", "MANAGER") as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const list = await ensurePackingList(companyId, req.params.jobId, req.user!.id);
    const view = await jobMaterialView(companyId, req.params.jobId);
    const unreported = (view as any).unreported || [];
    if (unreported.length > 0 && !req.body?.force) {
      const names = unreported.map((u: any) => `${u.materialName} (${u.issued} ${u.unit} issued)`).join(', ');
      return res.status(400).json({
        error: `No returns recorded yet for: ${names}. Enter the crew's returns/damage first, or confirm force close.`,
        unreported: unreported.map((u: any) => ({ materialId: u.materialId, name: u.materialName, issued: u.issued })),
      });
    }
    const f = view.finance as any;
    // The signed sheet is the proof behind these numbers. Without it there is
    // nothing to check against later, so closing needs the photo/scan
    // (an admin can still force it through).
    if (!list.attachmentUrl && !req.body?.force) {
      return res.status(400).json({
        error:
          "Attach the signed packing list (photo or scan) before closing — that is the proof for these numbers.",
        needsAttachment: true,
      });
    }
    const financeRow = await prisma.matV3JobFinance.findFirst({ where: { companyId, jobId: req.params.jobId } });
    if (financeRow) {
      await prisma.matV3JobFinance.update({
        where: { id: financeRow.id },
        data: { materialsLocked: true, lockedAt: new Date(), lockedById: req.user!.id },
      });
    } else {
      await prisma.matV3JobFinance.create({
        data: {
          companyId,
          jobId: req.params.jobId,
          materialsLocked: true,
          lockedAt: new Date(),
          lockedById: req.user!.id,
          materialsChargeMode: "AUTO",
        },
      });
    }

    const updatedList = await prisma.matV3PackingList.update({
      where: { id: list.id },
      data: { status: "CLOSED", closedAt: new Date(), closedById: req.user!.id },
    });

    await audit(companyId, "PACKING_LIST", list.id, "CLOSE", list, updatedList, req.body?.reason || "Job closed", req.user);

    const job = await prisma.movingJob.findFirst({ where: { id: req.params.jobId, companyId } });
    const company = await prisma.company.findFirst({ where: { id: companyId }, select: { name: true } });
    const materialsTotal = f.materialsTotal || 0;
    const grand = materialsTotal + (f.laborCost || 0) + (f.transportCost || 0) + (f.otherCost || 0) - (f.discount || 0);

    let emailSent = false;
    try {
      const materialLines = ((view as any).materialSummary || [])
        .map((a: any) => `${a.materialName}: issued ${a.issued}, returned ${a.returned}, damaged ${a.damaged}, used ${a.used}`)
        .join('\n');
      await sendNotification(companyId, "MOVING_JOB_COMPLETED", {
        jobCode: job?.jobCode || "",
        jobTitle: job?.jobTitle || "",
        clientName: job?.clientName || "",
        completedBy: (req.user as any)?.name || "System",
        materialsUsed: view.totals.used,
        materialsTotal,
        grandTotal: grand,
        packingListNumber: list.listNumber,
        materialBreakdown: materialLines,
        companyName: company?.name || "WMS",
      });
      emailSent = true;
      await prisma.matV3JobFinance.updateMany({
        where: { companyId, jobId: req.params.jobId },
        data: { lastEmailAt: new Date() },
      });
    } catch (err: any) {
      console.error("[mat-v3] close email failed:", err.message);
    }

    await audit(companyId, "FINANCE", req.params.jobId, "EMAIL", null, { emailSent }, "Job close report email", req.user);

    res.json({ success: true, packingList: updatedList, emailSent, totals: view.totals });
  } catch (e: any) {
    console.error("[mat-v3] job close:", e);
    res.status(500).json({ error: "Failed to close job materials" });
  }
});

router.post("/jobs/:jobId/reopen", authenticateToken as any, authorizeRoles("ADMIN") as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const reason = String(req.body?.reason || "").trim();
    if (!reason) return res.status(400).json({ error: "Reason is required to reopen" });
    const list = await prisma.matV3PackingList.findFirst({ where: { companyId, jobId: req.params.jobId } });
    if (!list) return res.status(404).json({ error: "No packing list for this job" });
    const before = { ...list };
    const updated = await prisma.matV3PackingList.update({
      where: { id: list.id },
      data: { status: "OPEN", closedAt: null, closedById: null },
    });
    await prisma.matV3JobFinance.updateMany({ where: { companyId, jobId: req.params.jobId }, data: { materialsLocked: false } });
    await audit(companyId, "PACKING_LIST", list.id, "REOPEN", before, updated, reason, req.user);
    res.json({ success: true, packingList: updated });
  } catch (e: any) {
    console.error("[mat-v3] reopen:", e);
    res.status(500).json({ error: "Failed to reopen" });
  }
});

/* ============================================================
   STATEMENT  (stock ledger, bank-book style)
   ============================================================ */

router.get("/statement", authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { startDate, endDate, materialId } = req.query as any;
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    const materials = await prisma.packingMaterial.findMany({
      where: { companyId, ...(materialId ? { id: materialId } : {}) },
      orderBy: { name: "asc" },
    });
    const ledger = await prisma.matV3Ledger.findMany({
      where: { companyId, ...(materialId ? { materialId } : {}) },
      orderBy: { createdAt: "asc" },
    });
    const jobs = await prisma.movingJob.findMany({ where: { companyId }, select: { id: true, jobCode: true, jobTitle: true } });
    const jobById = Object.fromEntries(jobs.map((j) => [j.id, j]));
    const purchases = await prisma.matV3Purchase.findMany({ where: { companyId }, select: { id: true, purchaseNumber: true, vendorName: true } });
    const pById = Object.fromEntries(purchases.map((p) => [p.id, p]));
    const lines = await prisma.matV3JobLine.findMany({
      where: { companyId },
      select: { id: true, dayNumber: true, qtyDamaged: true, materialId: true, jobId: true },
    });
    const lineById = Object.fromEntries(lines.map((l) => [l.id, l]));
    const costs = await avgCostMap(companyId);

    const statements = materials.map((m) => {
      const rows = ledger.filter((l) => l.materialId === m.id);
      const opening = rows
        .filter((r) => (start ? r.createdAt < start : false))
        .reduce((s, r) => s + (r.direction === "IN" ? r.quantity : -r.quantity), 0);

      const inRange = rows.filter((r) => (!start || r.createdAt >= start) && (!end || r.createdAt <= end));

      let running = opening;
      const transactions = inRange.map((r) => {
        const delta = r.direction === "IN" ? r.quantity : -r.quantity;
        const before = running;
        running += delta;
        const job = r.jobId ? jobById[r.jobId] : null;
        const po = r.purchaseId ? pById[r.purchaseId] : null;
        const jl = r.jobLineId ? lineById[r.jobLineId] : null;
        return {
          id: r.id,
          date: r.createdAt,
          type: r.entryType,
          direction: r.direction,
          inQty: r.direction === "IN" ? r.quantity : 0,
          outQty: r.direction === "OUT" ? r.quantity : 0,
          stockBefore: before,
          stockAfter: running,
          unitCost: r.unitCost,
          amount: r.quantity * (r.unitCost || 0),
          jobId: r.jobId,
          jobCode: job?.jobCode || null,
          jobTitle: job?.jobTitle || null,
          dayNumber: r.dayNumber ?? jl?.dayNumber ?? null,
          purchaseNumber: po?.purchaseNumber || null,
          vendorName: po?.vendorName || null,
          notes: r.notes,
          reason: r.reason,
        };
      });

      const purchased = inRange.filter((r) => r.entryType === "PURCHASE").reduce((s, r) => s + r.quantity, 0);
      const issued = inRange.filter((r) => r.entryType === "ISSUE").reduce((s, r) => s + r.quantity, 0);
      const returned = inRange.filter((r) => r.entryType === "RETURN").reduce((s, r) => s + r.quantity, 0);
      const damaged = inRange.reduce((s, r) => {
        const jl = r.jobLineId ? lineById[r.jobLineId] : null;
        return s + (r.entryType === "ISSUE" && jl && r.direction === "OUT" ? 0 : 0);
      }, 0);
      const damagedTotal = lines
        .filter((l) => l.materialId === m.id && (!start || true))
        .reduce((s, l) => s + (l.qtyDamaged || 0), 0);
      const adjusted = inRange
        .filter((r) => r.entryType === "ADJUST" || r.entryType === "VOID_PURCHASE")
        .reduce((s, r) => s + (r.direction === "IN" ? r.quantity : -r.quantity), 0);

      const unitCost = costs[m.id] || m.unitCost || 0;
      return {
        materialId: m.id,
        sku: m.sku,
        name: m.name,
        unit: m.unit,
        category: m.category,
        minStockLevel: m.minStockLevel,
        purchaseUnitCost: unitCost,
        chargeUnitPrice: m.sellingPrice || 0,
        opening,
        purchased,
        issued,
        returned,
        damaged: damagedTotal,
        adjusted,
        closing: opening + purchased + returned + adjusted - issued,
        stockNow: rows.reduce((s, r) => s + (r.direction === "IN" ? r.quantity : -r.quantity), 0),
        closingValue: (opening + purchased + returned + adjusted - issued) * unitCost,
        lowStock: m.minStockLevel > 0 && rows.reduce((s, r) => s + (r.direction === "IN" ? r.quantity : -r.quantity), 0) <= m.minStockLevel,
        transactions,
      };
    });

    const totals = statements.reduce(
      (a, s) => {
        a.opening += s.opening;
        a.purchased += s.purchased;
        a.issued += s.issued;
        a.returned += s.returned;
        a.damaged += s.damaged;
        a.closing += s.closing;
        a.closingValue += s.closingValue;
        return a;
      },
      { opening: 0, purchased: 0, issued: 0, returned: 0, damaged: 0, closing: 0, closingValue: 0 }
    );

    res.json({
      range: { startDate: start, endDate: end },
      statements,
      totals,
      lowStockCount: statements.filter((s) => s.lowStock).length,
    });
  } catch (e: any) {
    console.error("[mat-v3] statement:", e);
    res.status(500).json({ error: "Failed to build statement" });
  }
});

/* ============================================================
   AUDIT TRAIL + ACTIVITY
   ============================================================ */

router.get("/audit", authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { startDate, endDate, entityType, limit } = req.query as any;
    const where: any = { companyId };
    if (entityType) where.entityType = entityType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        where.createdAt.lte = e;
      }
    }
    const rows = await prisma.matV3Audit.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(okNum(limit) || 300, 1000),
    });
    res.json(rows);
  } catch (e: any) {
    console.error("[mat-v3] audit list:", e);
    res.status(500).json({ error: "Failed to load audit" });
  }
});

/** Everything happening on jobs — issues, returns, damage, closes, emails. */
router.get("/job-activity", authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { startDate, endDate, jobId } = req.query as any;
    const where: any = { companyId, ...(jobId ? { jobId } : {}) };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        where.createdAt.lte = e;
      }
    }
    const ledger = await prisma.matV3Ledger.findMany({
      where: { ...where, jobId: jobId || { not: null } },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const materials = await prisma.packingMaterial.findMany({ where: { companyId }, select: { id: true, name: true, sku: true, unit: true } });
    const mById = Object.fromEntries(materials.map((m) => [m.id, m]));
    const jobs = await prisma.movingJob.findMany({ where: { companyId }, select: { id: true, jobCode: true, jobTitle: true, clientName: true } });
    const jById = Object.fromEntries(jobs.map((j) => [j.id, j]));
    const users = await prisma.user.findMany({ where: { companyId }, select: { id: true, name: true } });
    const uById = Object.fromEntries(users.map((u) => [u.id, u]));

    res.json(
      ledger.map((l) => ({
        id: l.id,
        date: l.createdAt,
        entryType: l.entryType,
        direction: l.direction,
        quantity: l.quantity,
        dayNumber: l.dayNumber,
        materialName: mById[l.materialId]?.name || "Unknown",
        materialSku: mById[l.materialId]?.sku || "",
        unit: mById[l.materialId]?.unit || "PCS",
        jobId: l.jobId,
        jobCode: l.jobId ? jById[l.jobId]?.jobCode : null,
        jobTitle: l.jobId ? jById[l.jobId]?.jobTitle : null,
        clientName: l.jobId ? jById[l.jobId]?.clientName : null,
        performedBy: l.createdById ? uById[l.createdById]?.name || null : null,
        notes: l.notes,
        reason: l.reason,
      }))
    );
  } catch (e: any) {
    console.error("[mat-v3] job activity:", e);
    res.status(500).json({ error: "Failed to load job activity" });
  }
});

export default router;
