import Navigation from '@/components/Navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Navigation />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}