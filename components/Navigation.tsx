"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session) return null;

  // Lấy role từ session (đã được ép kiểu any ở NextAuth config)
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const navItems = [
    { name: "Hộp thư", href: "/chat", icon: "💬" },
    ...(isAdmin ? [
      { name: "Quản lý Fanpage", href: "/admin/fanpages", icon: "📄" },
      { name: "Quản lý Nhân sự", href: "/admin/users", icon: "👥" }
    ] : [])
  ];

  return (
    <div className="w-[80px] md:w-[220px] bg-gray-900 text-white flex flex-col h-screen flex-shrink-0">
      <div className="p-4 font-bold text-center border-b border-gray-700 hidden md:block text-blue-400">
        VN Helpdesk
      </div>
      
      <div className="flex-1 py-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.name} href={item.href}>
              <span className={`flex items-center px-4 py-3 cursor-pointer transition-colors ${isActive ? 'bg-blue-600' : 'hover:bg-gray-800'}`}>
                <span className="text-xl">{item.icon}</span>
                <span className="ml-3 hidden md:block text-sm font-medium">{item.name}</span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-gray-700">
        <div className="hidden md:block text-xs text-gray-400 mb-2 truncate">
          {session.user?.email}
          <br/>
          <span className="text-[10px] uppercase text-blue-400 font-bold">{isAdmin ? 'Quản trị viên' : 'Nhân viên'}</span>
        </div>
        <button 
          onClick={() => signOut({ callbackUrl: '/login' })} 
          className="w-full bg-gray-800 hover:bg-red-600 text-white py-2 rounded text-sm font-semibold transition-colors flex justify-center items-center gap-2"
        >
          <span className="md:hidden">🚪</span>
          <span className="hidden md:block">Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}