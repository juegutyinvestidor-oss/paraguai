'use client';

import React from 'react';
import { hasPermissionDynamic, type Permission, type UserRole } from '../lib/rbac';

interface PermissionGateProps {
  permission: Permission;
  role?: string;
  rolePermissions?: Record<UserRole, Permission[]>;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export default function PermissionGate({
  permission,
  role,
  rolePermissions,
  fallback = null,
  children,
}: PermissionGateProps) {
  if (!role) return <>{children}</>;
  if (rolePermissions) {
    return <>{hasPermissionDynamic(rolePermissions, role, permission) ? children : fallback}</>;
  }
  return <>{children}</>;
}
