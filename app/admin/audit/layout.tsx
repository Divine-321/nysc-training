import AuthGuard from "@/app/components/AuthGuard";

const SUPERADMIN_ROLES = ["superadmin"] as const;

export default function AuditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={SUPERADMIN_ROLES}>
      {children}
    </AuthGuard>
  );
}