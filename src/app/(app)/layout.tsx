import { Sidebar, MobileNav } from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col md:pl-60">
        <MobileNav />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
