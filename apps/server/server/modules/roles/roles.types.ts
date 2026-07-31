export type Role = {
  name: string;
  description: string;
};

export type Permission = {
  name: string;
  description: string;
};

export type RolePermission = {
  permissions: string[];
};

export type UserRole = {
  role: string;
};
