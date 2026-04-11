export const ROLE_ADMIN = "admin";
export const ROLE_MANAGER = "manager";
export const ROLE_VIEWER = "viewer";

export const PASSWORDS = {
  "SDVADMIN": { username: "Direction SDV", role: ROLE_ADMIN },
  "SDV2026": { username: "Visiteur", role: ROLE_VIEWER }
};

export function getRolePermissions(role) {
  return {
    canEdit: role === ROLE_ADMIN || role === ROLE_MANAGER,
    canSync: role === ROLE_ADMIN || role === ROLE_MANAGER,
    canDelete: role === ROLE_ADMIN,
    canManageCategories: role === ROLE_ADMIN,
  };
}