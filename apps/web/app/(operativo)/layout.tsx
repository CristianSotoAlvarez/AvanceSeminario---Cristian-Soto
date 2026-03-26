"use client";

import { Header } from "@/components/header";

export default function OperativoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header title="Operativo" />
      <main className="flex-1 overflow-y-auto p-6 bg-bg-primary">
        {children}
      </main>
    </div>
  );
}
