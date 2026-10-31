export const ROLE_ADMIN = "admin";
export const ROLE_MANAGER = "manager";
export const ROLE_VIEWER = "viewer";


export function getRolePermissions(role) {
  return {
    canEdit: role === ROLE_ADMIN || role === ROLE_MANAGER,
    canSync: role === ROLE_ADMIN || role === ROLE_MANAGER,
    canDelete: role === ROLE_ADMIN,
    canManageCategories: role === ROLE_ADMIN,
  };
}