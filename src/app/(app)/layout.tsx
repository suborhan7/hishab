import { AppShell } from "@/components/app-shell";
import { requireAuth } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireAuth();
  return <AppShell>{children}</AppShell>;
}
