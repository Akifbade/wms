import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, AuthRequest, authorizeRoles } from "../middleware/auth";

const prisma = new PrismaClient();
const router = Router();

// ==================== PLUGIN MANAGEMENT ====================

/**
 * GET /api/plugins
 * List all installed plugins for the company
 */
router.get(
  "/",
  authenticateToken as any,
  async (req: AuthRequest, res) => {
    try {
      const { companyId } = req.user!;

      const plugins = await prisma.systemPlugin.findMany({
        where: { companyId },
        include: {
          auditLogs: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
        orderBy: { installedAt: "desc" },
      });

      res.json(plugins);
    } catch (error) {
      console.error("Error fetching plugins:", error);
      res.status(500).json({ error: "Failed to fetch plugins" });
    }
  }
);

/**
 * POST /api/plugins
 * Install a new plugin (ADMIN only)
 */
router.post(
  "/",
  authenticateToken as any,
  authorizeRoles("ADMIN"),
  async (req: AuthRequest, res) => {
    try {
      const { companyId } = req.user!;
      const { name, description, version, entryPointUrl, checksum } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Plugin name is required" });
      }

      const plugin = await prisma.systemPlugin.create({
        data: {
          name,
          description,
          version: version || "1.0.0",
          status: "INSTALLED",
          entryPointUrl,
          checksum,
          companyId,
        },
      });

      // Log installation
      await prisma.systemPluginLog.create({
        data: {
          pluginId: plugin.id,
          action: "INSTALL",
          status: "SUCCESS",
          message: `Plugin ${name} installed successfully`,
          performedBy: req.user!.id,
          companyId,
        },
      });

      res.status(201).json(plugin);
    } catch (error: any) {
      console.error("Error installing plugin:", error);
      if (error.code === "P2002") {
        return res.status(400).json({ error: "Plugin with this name already exists" });
      }
      res.status(500).json({ error: "Failed to install plugin" });
    }
  }
);

/**
 * PATCH /api/plugins/:pluginId/activate
 * Activate a plugin (ADMIN only)
 */
router.patch(
  "/:pluginId/activate",
  authenticateToken as any,
  authorizeRoles("ADMIN"),
  async (req: AuthRequest, res) => {
    try {
      const { pluginId } = req.params;
      const { companyId } = req.user!;

      const plugin = await prisma.systemPlugin.findFirst({
        where: { id: pluginId, companyId },
      });

      if (!plugin) {
        return res.status(404).json({ error: "Plugin not found" });
      }

      const updated = await prisma.systemPlugin.update({
        where: { id: pluginId },
        data: {
          status: "ACTIVE",
          activatedAt: new Date(),
        },
      });

      // Log activation
      await prisma.systemPluginLog.create({
        data: {
          pluginId,
          action: "ACTIVATE",
          status: "SUCCESS",
          message: `Plugin ${plugin.name} activated`,
          performedBy: req.user!.id,
          companyId,
        },
      });

      res.json(updated);
    } catch (error) {
      console.error("Error activating plugin:", error);
      res.status(500).json({ error: "Failed to activate plugin" });
    }
  }
);

/**
 * PATCH /api/plugins/:pluginId/deactivate
 * Deactivate a plugin (ADMIN only)
 */
router.patch(
  "/:pluginId/deactivate",
  authenticateToken as any,
  authorizeRoles("ADMIN"),
  async (req: AuthRequest, res) => {
    try {
      const { pluginId } = req.params;
      const { companyId } = req.user!;

      const plugin = await prisma.systemPlugin.findFirst({
        where: { id: pluginId, companyId },
      });

      if (!plugin) {
        return res.status(404).json({ error: "Plugin not found" });
      }

      const updated = await prisma.systemPlugin.update({
        where: { id: pluginId },
        data: {
          status: "DISABLED",
          deactivatedAt: new Date(),
        },
      });

      // Log deactivation
      await prisma.systemPluginLog.create({
        data: {
          pluginId,
          action: "DEACTIVATE",
          status: "SUCCESS",
          message: `Plugin ${plugin.name} deactivated`,
          performedBy: req.user!.id,
          companyId,
        },
      });

      res.json(updated);
    } catch (error) {
      console.error("Error deactivating plugin:", error);
      res.status(500).json({ error: "Failed to deactivate plugin" });
    }
  }
);

/**
 * DELETE /api/plugins/:pluginId
 * Uninstall a plugin (ADMIN only)
 */
router.delete(
  "/:pluginId",
  authenticateToken as any,
  authorizeRoles("ADMIN"),
  async (req: AuthRequest, res) => {
    try {
      const { pluginId } = req.params;
      const { companyId } = req.user!;

      const plugin = await prisma.systemPlugin.findFirst({
        where: { id: pluginId, companyId },
      });

      if (!plugin) {
        return res.status(404).json({ error: "Plugin not found" });
      }

      // Log uninstall
      await prisma.systemPluginLog.create({
        data: {
          pluginId,
          action: "UNINSTALL",
          status: "SUCCESS",
          message: `Plugin ${plugin.name} uninstalled`,
          performedBy: req.user!.id,
          companyId,
        },
      });

      // Delete plugin
      await prisma.systemPlugin.delete({
        where: { id: pluginId },
      });

      res.json({ message: "Plugin uninstalled successfully" });
    } catch (error) {
      console.error("Error uninstalling plugin:", error);
      res.status(500).json({ error: "Failed to uninstall plugin" });
    }
  }
);

/**
 * GET /api/plugins/:pluginId/logs
 * Get audit logs for a plugin
 */
router.get("/:pluginId/logs", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const { pluginId } = req.params;
    const { companyId } = req.user!;

    const plugin = await prisma.systemPlugin.findFirst({
      where: { id: pluginId, companyId },
    });

    if (!plugin) {
      return res.status(404).json({ error: "Plugin not found" });
    }

    const logs = await prisma.systemPluginLog.findMany({
      where: { pluginId },
      orderBy: { createdAt: "desc" },
    });

    res.json(logs);
  } catch (error) {
    console.error("Error fetching plugin logs:", error);
    res.status(500).json({ error: "Failed to fetch plugin logs" });
  }
});

export default router;

