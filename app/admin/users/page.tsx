"use client";
import { useState, useEffect } from "react";

export default function UserManage() {
  const [users, setUsers] = useState<any[]>([]);
  const [fanpages, setFanpages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [formData, setFormData] = useState({ name: "", email: "", password: "", pageIds: [] as string[] });

  const fetchData = async () => {
    const [usersRes, pagesRes] = await Promise.all([
      fetch('/api/admin/users').then(res => res.json()),
      fetch('/api/admin/fanpages').then(res => res.json())
    ]);
    setUsers(usersRes);
    setFanpages(pagesRes);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCheckbox = (pageId: string) => {
    setFormData(prev => ({
      ...prev,
      pageIds: prev.pageIds.includes(pageId)
        ? prev.pageIds.filter(id => id !== pageId)
        : [...prev.pageIds, pageId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: "success", text: "Tạo tài khoản nhân viên thành công!" });
      setFormData({ name: "", email: "", password: "", pageIds: [] });
      fetchData();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Quản lý Nhân sự</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Tạo tài khoản Staff</h2>
          {message.text && (
            <div className={`p-3 mb-4 rounded text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tên nhân viên</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email đăng nhập</label>
              <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
              <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phân quyền Fanpage</label>
              <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded-md bg-gray-50">
                {fanpages.map(page => (
                  <label key={page.id} className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={formData.pageIds.includes(page.id)} onChange={() => handleCheckbox(page.id)} className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">{page.name}</span>
                  </label>
                ))}
                {fanpages.length === 0 && <p className="text-xs text-gray-400">Chưa có Fanpage nào.</p>}
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
              {isLoading ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </form>
        </div>

        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Danh sách Nhân viên</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 uppercase border-b">
                <tr>
                  <th className="px-4 py-3 text-gray-500">Tên</th>
                  <th className="px-4 py-3 text-gray-500">Email</th>
                  <th className="px-4 py-3 text-gray-500">Fanpage quản lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{user.name}</td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.managedPages.map((p: any) => (
                          <span key={p.id} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-md font-medium">
                            {p.name}
                          </span>
                        ))}
                        {user.managedPages.length === 0 && <span className="text-gray-400 text-xs">Chưa có quyền</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}