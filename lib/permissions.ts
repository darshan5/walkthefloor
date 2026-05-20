export const PERMISSIONS = {
  CHECKLISTS_VIEW: "checklists.view",
  CHECKLISTS_COMPLETE: "checklists.complete",
  CHECKLISTS_MANAGE: "checklists.manage",
  CHECKLISTS_REPORTS: "checklists.reports",

  AUDITS_VIEW: "audits.view",
  AUDITS_CONDUCT: "audits.conduct",
  AUDITS_MANAGE: "audits.manage",
  AUDITS_REPORTS: "audits.reports",

  MAINTENANCE_VIEW: "maintenance.view",
  MAINTENANCE_SUBMIT: "maintenance.submit",
  MAINTENANCE_APPROVE: "maintenance.approve",
  MAINTENANCE_MANAGE: "maintenance.manage",
  MAINTENANCE_REPORTS: "maintenance.reports",

  GUEST_SERVICE_VIEW: "guest_service.view",
  GUEST_SERVICE_MANAGE: "guest_service.manage",
  GUEST_SERVICE_REPORTS: "guest_service.reports",

  ADMIN_USERS: "admin.users",
  ADMIN_LOCATIONS: "admin.locations",
  ADMIN_ROLES: "admin.roles",
  ADMIN_DEVICES: "admin.devices",
  ADMIN_ORG: "admin.org",
  ADMIN_EQUIPMENT: "admin.equipment",

  DOCUMENTS_VIEW: "documents.view",
  DOCUMENTS_MANAGE: "documents.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const BUILT_IN_ROLES = {
  FRANCHISEE: {
    name: "Franchisee",
    permissions: Object.values(PERMISSIONS),
  },
  DIRECTOR_OF_OPS: {
    name: "Director of Operations",
    permissions: Object.values(PERMISSIONS).filter((p) => p !== PERMISSIONS.ADMIN_ORG),
  },
  MULTI_UNIT_MANAGER: {
    name: "Multi-unit Manager",
    permissions: [
      PERMISSIONS.CHECKLISTS_VIEW,
      PERMISSIONS.CHECKLISTS_COMPLETE,
      PERMISSIONS.CHECKLISTS_MANAGE,
      PERMISSIONS.CHECKLISTS_REPORTS,
      PERMISSIONS.AUDITS_VIEW,
      PERMISSIONS.AUDITS_CONDUCT,
      PERMISSIONS.AUDITS_MANAGE,
      PERMISSIONS.AUDITS_REPORTS,
      PERMISSIONS.MAINTENANCE_VIEW,
      PERMISSIONS.MAINTENANCE_SUBMIT,
      PERMISSIONS.MAINTENANCE_APPROVE,
      PERMISSIONS.MAINTENANCE_MANAGE,
      PERMISSIONS.MAINTENANCE_REPORTS,
      PERMISSIONS.GUEST_SERVICE_VIEW,
      PERMISSIONS.GUEST_SERVICE_MANAGE,
      PERMISSIONS.GUEST_SERVICE_REPORTS,
      PERMISSIONS.ADMIN_USERS,
      PERMISSIONS.ADMIN_LOCATIONS,
      PERMISSIONS.ADMIN_DEVICES,
      PERMISSIONS.ADMIN_EQUIPMENT,
      PERMISSIONS.DOCUMENTS_VIEW,
      PERMISSIONS.DOCUMENTS_MANAGE,
    ],
  },
  RESTAURANT_GENERAL_MANAGER: {
    name: "Restaurant General Manager",
    permissions: [
      PERMISSIONS.CHECKLISTS_VIEW,
      PERMISSIONS.CHECKLISTS_COMPLETE,
      PERMISSIONS.CHECKLISTS_REPORTS,
      PERMISSIONS.AUDITS_VIEW,
      PERMISSIONS.AUDITS_CONDUCT,
      PERMISSIONS.MAINTENANCE_VIEW,
      PERMISSIONS.MAINTENANCE_SUBMIT,
      PERMISSIONS.MAINTENANCE_REPORTS,
      PERMISSIONS.GUEST_SERVICE_VIEW,
      PERMISSIONS.GUEST_SERVICE_MANAGE,
      PERMISSIONS.GUEST_SERVICE_REPORTS,
      PERMISSIONS.DOCUMENTS_VIEW,
    ],
  },
  TEAM_MEMBER: {
    name: "Team Member",
    permissions: [
      PERMISSIONS.CHECKLISTS_VIEW,
      PERMISSIONS.CHECKLISTS_COMPLETE,
      PERMISSIONS.DOCUMENTS_VIEW,
    ],
  },
} as const;

export function hasPermission(userPermissions: string[], required: string): boolean {
  return userPermissions.includes(required);
}

export function hasAnyPermission(userPermissions: string[], required: string[]): boolean {
  return required.some((p) => userPermissions.includes(p));
}
