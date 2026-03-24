import DashboardShell from '@/components/DashboardShell';
import { ToastProvider } from '@/lib/toast-context';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <DashboardShell>{children}</DashboardShell>
    </ToastProvider>
  );
}
