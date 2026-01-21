import { v } from "convex/values";
import { query, mutation, internalQuery, MutationCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import { getCallTypeDescription, formatUnitStatusCode } from "./callTypes";

// ===================
// Authorization Helper
// ===================

async function requireTenantOwner(
  ctx: MutationCtx,
  tenantId: Id<"tenants">
): Promise<{ userId: Id<"users">; tenantRole: string }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }

  const email = identity.email;
  if (!email) {
    throw new Error("User email not available");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();

  if (!user) {
    throw new Error("User not found");
  }

  if (user.isBanned) {
    throw new Error("User is banned");
  }

  if (user.tenantId !== tenantId) {
    throw new Error("Access denied: user does not belong to this tenant");
  }

  if (user.tenantRole !== "owner") {
    throw new Error("Access denied: requires owner role");
  }

  return { userId: user._id, tenantRole: user.tenantRole };
}

// ===================
// Queries
// ===================

/**
 * List all post templates for a tenant
 */
export const list = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query("postTemplates")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});

/**
 * Get a single post template
 */
export const get = query({
  args: {
    templateId: v.id("postTemplates"),
  },
  handler: async (ctx, { templateId }) => {
    return await ctx.db.get(templateId);
  },
});

/**
 * Get the default template for a tenant
 */
export const getDefault = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    const templates = await ctx.db
      .query("postTemplates")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    return templates.find((t) => t.isDefault) || null;
  },
});

/**
 * Get the best template for a call type
 */
export const getForCallType = query({
  args: {
    tenantId: v.id("tenants"),
    callType: v.string(),
  },
  handler: async (ctx, { tenantId, callType }) => {
    const templates = await ctx.db
      .query("postTemplates")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    // Find template that matches this call type (case-insensitive partial match)
    const callTypeLower = callType.toLowerCase();
    const matchingTemplate = templates.find(
      (t) => t.callTypes.some((ct) =>
        callTypeLower.includes(ct.toLowerCase()) ||
        ct === "*"
      )
    );

    // Fall back to default template
    if (!matchingTemplate) {
      return templates.find((t) => t.isDefault) || null;
    }

    return matchingTemplate;
  },
});

/**
 * Get template for a specific call type (internal use for sync jobs)
 */
export const getForCallTypeInternal = internalQuery({
  args: {
    tenantId: v.id("tenants"),
    callType: v.string(),
  },
  handler: async (ctx, { tenantId, callType }) => {
    const templates = await ctx.db
      .query("postTemplates")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    // Find template that matches this call type (case-insensitive partial match)
    const callTypeLower = callType.toLowerCase();
    const matchingTemplate = templates.find(
      (t) => t.callTypes.some((ct) =>
        callTypeLower.includes(ct.toLowerCase()) ||
        ct === "*"
      )
    );

    // Fall back to default template
    if (matchingTemplate) {
      return matchingTemplate;
    }

    return templates.find((t) => t.isDefault) || null;
  },
});

// ===================
// Mutations
// ===================

/**
 * Create a new post template
 */
export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    callTypes: v.array(v.string()),
    template: v.string(),
    includeUnits: v.boolean(),
    includeMap: v.boolean(),
    hashtags: v.array(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireTenantOwner(ctx, args.tenantId);

    // If this is being set as default, unset other defaults
    if (args.isDefault) {
      const existingTemplates = await ctx.db
        .query("postTemplates")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect();

      for (const template of existingTemplates) {
        if (template.isDefault) {
          await ctx.db.patch(template._id, { isDefault: false });
        }
      }
    }

    const templateId = await ctx.db.insert("postTemplates", {
      tenantId: args.tenantId,
      name: args.name,
      callTypes: args.callTypes,
      template: args.template,
      includeUnits: args.includeUnits,
      includeMap: args.includeMap,
      hashtags: args.hashtags,
      isDefault: args.isDefault || false,
      createdAt: Date.now(),
    });

    // Log the creation
    await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      actorId: userId,
      actorType: "user",
      action: "post_template.created",
      targetType: "postTemplates",
      targetId: templateId,
      details: { name: args.name, isDefault: args.isDefault },
      result: "success",
    });

    return templateId;
  },
});

/**
 * Update a post template
 */
export const update = mutation({
  args: {
    tenantId: v.id("tenants"),
    templateId: v.id("postTemplates"),
    name: v.optional(v.string()),
    callTypes: v.optional(v.array(v.string())),
    template: v.optional(v.string()),
    includeUnits: v.optional(v.boolean()),
    includeMap: v.optional(v.boolean()),
    hashtags: v.optional(v.array(v.string())),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireTenantOwner(ctx, args.tenantId);

    const existingTemplate = await ctx.db.get(args.templateId);
    if (!existingTemplate || existingTemplate.tenantId !== args.tenantId) {
      throw new Error("Template not found");
    }

    // If setting as default, unset other defaults
    if (args.isDefault) {
      const existingTemplates = await ctx.db
        .query("postTemplates")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect();

      for (const template of existingTemplates) {
        if (template._id !== args.templateId && template.isDefault) {
          await ctx.db.patch(template._id, { isDefault: false });
        }
      }
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.callTypes !== undefined) updates.callTypes = args.callTypes;
    if (args.template !== undefined) updates.template = args.template;
    if (args.includeUnits !== undefined) updates.includeUnits = args.includeUnits;
    if (args.includeMap !== undefined) updates.includeMap = args.includeMap;
    if (args.hashtags !== undefined) updates.hashtags = args.hashtags;
    if (args.isDefault !== undefined) updates.isDefault = args.isDefault;

    await ctx.db.patch(args.templateId, updates);

    // Log the update
    await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      actorId: userId,
      actorType: "user",
      action: "post_template.updated",
      targetType: "postTemplates",
      targetId: args.templateId,
      details: { name: args.name || existingTemplate.name },
      result: "success",
    });

    return args.templateId;
  },
});

/**
 * Set a template as the default
 */
export const setDefault = mutation({
  args: {
    tenantId: v.id("tenants"),
    templateId: v.id("postTemplates"),
  },
  handler: async (ctx, { tenantId, templateId }) => {
    const { userId } = await requireTenantOwner(ctx, tenantId);

    const template = await ctx.db.get(templateId);
    if (!template || template.tenantId !== tenantId) {
      throw new Error("Template not found");
    }

    // Unset other defaults
    const existingTemplates = await ctx.db
      .query("postTemplates")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    for (const t of existingTemplates) {
      if (t._id !== templateId && t.isDefault) {
        await ctx.db.patch(t._id, { isDefault: false });
      }
    }

    // Set this as default
    await ctx.db.patch(templateId, { isDefault: true });

    // Log the update
    await ctx.db.insert("auditLogs", {
      tenantId,
      actorId: userId,
      actorType: "user",
      action: "post_template.set_default",
      targetType: "postTemplates",
      targetId: templateId,
      details: { name: template.name },
      result: "success",
    });

    return templateId;
  },
});

/**
 * Delete a post template
 */
export const remove = mutation({
  args: {
    tenantId: v.id("tenants"),
    templateId: v.id("postTemplates"),
  },
  handler: async (ctx, { tenantId, templateId }) => {
    const { userId } = await requireTenantOwner(ctx, tenantId);

    const template = await ctx.db.get(templateId);
    if (!template || template.tenantId !== tenantId) {
      throw new Error("Template not found");
    }

    await ctx.db.delete(templateId);

    // Log the deletion
    await ctx.db.insert("auditLogs", {
      tenantId,
      actorId: userId,
      actorType: "user",
      action: "post_template.deleted",
      targetType: "postTemplates",
      targetId: templateId,
      details: { name: template.name },
      result: "success",
    });

    return templateId;
  },
});

// ===================
// Template Engine
// ===================

interface UnitStatus {
  unitId: string;
  status: string;
  timeDispatched?: number;
  timeAcknowledged?: number;
  timeEnroute?: number;
  timeOnScene?: number;
  timeCleared?: number;
}

export interface UnitLegendEntry {
  UnitKey: string;
  Description: string;
}

interface IncidentData {
  status: string;
  callType: string;
  fullAddress: string;
  units?: string[];
  unitStatuses?: UnitStatus[] | Record<string, { unit: string; status: string; timestamp: number }>;
  callReceivedTime: number;
}

/**
 * Apply a template to an incident
 * Available placeholders:
 * - {{status}} - Current status with emoji (🚨 ACTIVE CALL or ✅ CLEARED)
 * - {{callType}} - Type of incident
 * - {{address}} - Location
 * - {{units}} - Responding units (flat list with descriptions)
 * - {{unitsGrouped}} - Responding units grouped by department/station
 * - {{unitCount}} - Number of units
 * - {{time}} - Incident time
 * - {{updates}} - Recent updates
 * - {{hashtags}} - Configured hashtags
 */
export function applyTemplate(
  template: Doc<"postTemplates">,
  incident: IncidentData,
  updates: Array<{ content: string; createdAt: number }> = [],
  timezone?: string,
  unitLegend?: UnitLegendEntry[]
): string {
  let result = template.template;
  const tz = timezone || "America/New_York";

  // Status with emoji
  const statusEmoji = incident.status === "active" ? "🚨" : "✅";
  const statusText = incident.status === "active" ? "ACTIVE INCIDENT" : "INCIDENT CLOSED";
  result = result.replace(/\{\{status\}\}/gi, `${statusEmoji} ${statusText}`);

  // Call type - expand code to description
  const callTypeDescription = getCallTypeDescription(incident.callType);
  result = result.replace(/\{\{callType\}\}/gi, callTypeDescription);

  // Address
  result = result.replace(/\{\{address\}\}/gi, incident.fullAddress);

  // Units (flat list with descriptions)
  if (template.includeUnits && incident.units && incident.units.length > 0) {
    const unitsList = formatUnits(incident.units, incident.unitStatuses, unitLegend);
    result = result.replace(/\{\{units\}\}/gi, unitsList);
  } else {
    result = result.replace(/\{\{units\}\}/gi, "");
  }

  // Units grouped by department
  if (template.includeUnits && incident.units && incident.units.length > 0) {
    const unitsGrouped = formatUnitsGrouped(incident.units, incident.unitStatuses, unitLegend);
    result = result.replace(/\{\{unitsGrouped\}\}/gi, unitsGrouped);
  } else {
    result = result.replace(/\{\{unitsGrouped\}\}/gi, "");
  }

  // Unit count
  result = result.replace(/\{\{unitCount\}\}/gi, String(incident.units?.length || 0));

  // Time - use tenant timezone
  const time = new Date(incident.callReceivedTime);
  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  });
  result = result.replace(/\{\{time\}\}/gi, timeStr);

  // Updates
  if (updates.length > 0) {
    const updatesText = formatUpdates(updates, tz);
    result = result.replace(/\{\{updates\}\}/gi, updatesText);
  } else {
    result = result.replace(/\{\{updates\}\}/gi, "");
  }

  // Hashtags
  if (template.hashtags.length > 0) {
    const hashtagsText = template.hashtags
      .map((h) => (h.startsWith("#") ? h : `#${h}`))
      .join(" ");
    result = result.replace(/\{\{hashtags\}\}/gi, hashtagsText);
  } else {
    result = result.replace(/\{\{hashtags\}\}/gi, "");
  }

  // Clean up any extra blank lines
  result = result.replace(/\n{3,}/g, "\n\n").trim();

  return result;
}

/**
 * Look up unit description from legend
 * Returns the description if found, otherwise returns the original unit ID
 */
function getUnitDisplayName(unitId: string, unitLegend?: UnitLegendEntry[]): string {
  if (!unitLegend || unitLegend.length === 0) {
    return unitId;
  }

  // Look up the unit in the legend (case-insensitive match)
  const entry = unitLegend.find(
    (e) => e.UnitKey.toLowerCase() === unitId.toLowerCase()
  );

  if (entry && entry.Description) {
    // Return "UnitID (Description)" format for clarity
    return `${unitId} (${entry.Description})`;
  }

  return unitId;
}

/**
 * Format units for display
 */
function formatUnits(
  units: string[],
  unitStatuses?: UnitStatus[] | Record<string, { unit: string; status: string; timestamp: number }>,
  unitLegend?: UnitLegendEntry[]
): string {
  const lines: string[] = [];

  if (unitStatuses && Array.isArray(unitStatuses)) {
    // Group by status
    const statusGroups: Record<string, string[]> = {};
    for (const us of unitStatuses) {
      const status = us.status || "Unknown";
      if (!statusGroups[status]) {
        statusGroups[status] = [];
      }
      statusGroups[status].push(us.unitId);
    }

    for (const [status, statusUnits] of Object.entries(statusGroups)) {
      const displayStatus = formatUnitStatus(status);
      for (const unit of statusUnits) {
        const displayName = getUnitDisplayName(unit, unitLegend);
        lines.push(`• ${displayName} - ${displayStatus}`);
      }
    }
  } else {
    // Simple list
    for (const unit of units) {
      const displayName = getUnitDisplayName(unit, unitLegend);
      lines.push(`• ${displayName}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format unit status for display
 */
function formatUnitStatus(status: string): string {
  return formatUnitStatusCode(status);
}

// ===================
// Unit Grouping by Department
// ===================

// Fire/Rescue unit type suffixes - these get stripped to show department name
const FIRE_UNIT_SUFFIXES = [
  'ENGINE', 'LADDER', 'TRUCK', 'TANKER', 'BRUSH', 'RESCUE',
  'BATTALION', 'CHIEF', 'CAPTAIN', 'UTILITY', 'SQUAD',
  'HAZMAT', 'SPECIAL', 'PUMPER', 'QUINT', 'TOWER',
];

// EMS unit type suffixes - these keep "EMS" in the group name
const EMS_UNIT_SUFFIXES = ['AMBULANCE', 'EMS', 'MEDIC'];

// EMS-related prefixes for descriptions that start with EMS
const EMS_PREFIXES = ['EMS ', 'MEDIC ', 'AMBULANCE '];

/**
 * Extract department/service name from unit description
 *
 * Fire units: "MOORESVILLE ENGINE" → "Mooresville"
 * EMS units: "MOORESVILLE EMS" → "Mooresville EMS"
 * Generic EMS: "EMS SUPERVISOR" → "EMS"
 */
function extractDepartment(description: string): string {
  const upper = description.toUpperCase().trim();

  // Helper to title case a string
  const titleCase = (str: string) => str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Check if description starts with EMS-related prefix (e.g., "EMS SUPERVISOR", "EMS CONVALESCENT")
  for (const prefix of EMS_PREFIXES) {
    if (upper.startsWith(prefix) || upper === prefix.trim()) {
      return 'EMS';
    }
  }

  // Check for EMS suffixes - keep "EMS" in the group name
  for (const suffix of EMS_UNIT_SUFFIXES) {
    if (upper.endsWith(` ${suffix}`)) {
      const dept = description.slice(0, -(suffix.length + 1)).trim();
      if (dept) {
        return `${titleCase(dept)} EMS`;
      }
      return 'EMS';
    }
  }

  // Check for fire/rescue suffixes - strip suffix, return department name
  for (const suffix of FIRE_UNIT_SUFFIXES) {
    if (upper.endsWith(` ${suffix}`)) {
      const dept = description.slice(0, -(suffix.length + 1)).trim();
      if (dept) {
        return titleCase(dept);
      }
    }
  }

  // If no suffix found, return the whole description title-cased
  return titleCase(description);
}

/**
 * Group units by their department
 * Uses legend descriptions if available, otherwise groups under "Other"
 */
function groupUnitsByDepartment(
  units: string[],
  unitLegend?: UnitLegendEntry[]
): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const unit of units) {
    // Skip VTAC (radio channel) units
    if (unit.toUpperCase().includes('VTAC')) continue;

    let department: string = 'Other';

    // Try to get department from legend
    if (unitLegend && unitLegend.length > 0) {
      const entry = unitLegend.find((u) => u.UnitKey.toLowerCase() === unit.toLowerCase());
      if (entry?.Description) {
        department = extractDepartment(entry.Description);
      }
    }

    if (!groups.has(department)) {
      groups.set(department, []);
    }
    groups.get(department)!.push(unit);
  }

  return groups;
}

/**
 * Format units grouped by department for display
 */
function formatUnitsGrouped(
  units: string[],
  unitStatuses?: UnitStatus[] | Record<string, { unit: string; status: string; timestamp: number }>,
  unitLegend?: UnitLegendEntry[]
): string {
  const lines: string[] = [];
  const groups = groupUnitsByDepartment(units, unitLegend);

  // Sort departments alphabetically, but put "Other" last
  const sortedDepts = Array.from(groups.keys()).sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });

  // Build status lookup map for array format
  const statusMap = new Map<string, string>();
  if (unitStatuses && Array.isArray(unitStatuses)) {
    for (const us of unitStatuses) {
      statusMap.set(us.unitId.toLowerCase(), us.status || 'Unknown');
    }
  }

  for (const dept of sortedDepts) {
    const deptUnits = groups.get(dept)!;

    // Add department header
    lines.push(`${dept}:`);

    // Add each unit under this department
    for (const unit of deptUnits) {
      let status = 'Unknown';
      if (unitStatuses && Array.isArray(unitStatuses)) {
        status = statusMap.get(unit.toLowerCase()) || 'Unknown';
      }
      const displayStatus = formatUnitStatus(status);
      lines.push(`• ${unit} - ${displayStatus}`);
    }

    // Add blank line between departments (except after last one)
    if (dept !== sortedDepts[sortedDepts.length - 1]) {
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Format updates for display
 */
function formatUpdates(updates: Array<{ content: string; createdAt: number }>, timezone?: string): string {
  const lines: string[] = [];
  const recentUpdates = updates.slice(0, 5);
  const tz = timezone || "America/New_York";

  for (const update of recentUpdates) {
    const updateTime = new Date(update.createdAt);
    const updateTimeStr = updateTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: tz,
    });
    lines.push(`• [${updateTimeStr}] ${update.content}`);
  }

  if (updates.length > 5) {
    lines.push(`• ... and ${updates.length - 5} more updates`);
  }

  return lines.join("\n");
}

// ===================
// Default Template
// ===================

/**
 * Default template string for when no custom template is configured
 */
export const DEFAULT_TEMPLATE_STRING = `{{status}}

📋 Type: {{callType}}

📍 {{address}}

🚒 Units:
{{units}}

⏰ {{time}}

{{updates}}

{{hashtags}}`;

/**
 * Create a default template object for use when no template exists
 */
export function getDefaultTemplateObject(tenantId: Id<"tenants">): Omit<Doc<"postTemplates">, "_id" | "_creationTime"> {
  return {
    tenantId,
    name: "Default Template",
    callTypes: ["*"],
    template: DEFAULT_TEMPLATE_STRING,
    includeUnits: true,
    includeMap: false,
    hashtags: ["EmergencyAlert", "FirstResponders"],
    isDefault: true,
    createdAt: Date.now(),
  };
}
