"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function FanpageManage() {
  const { data: session } = useSession();
  const [pages, setPages] = useState<any[]>([]);
  const [formData, setFormData] = useState({ pageId: "", name: "", accessToken: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const fetchPages = () => {
    fetch('/api/admin/fanpages')
      .then(res => res.json())
      .then(data => setPages(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch('/api/admin/fanpages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userId: (session?.user as any)?.id // Truyền ID của Admin đang đăng nhập
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Có lỗi xảy ra");

      setMessage({ type: "success", text: "Thêm Fanpage thành công!" });
      setFormData({ pageId: "", name: "", accessToken: "" }); // Reset form
      fetchPages(); // Load lại bảng
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Quản lý Fanpage</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Form thêm Fanpage */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Thêm kết nối mới</h2>
          
          {message.text && (
            <div className={`p-3 mb-4 rounded text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tên Fanpage</label>
              <input 
                type="text" required
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="VD: Shop Thời Trang"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Page ID (Facebook)</label>
              <input 
                type="text" required
                value={formData.pageId} onChange={e => setFormData({...formData, pageId: e.target.value})}
                placeholder="Nhập dãy số ID của Page"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Page Access Token</label>
              <textarea 
                required rows={3}
                value={formData.accessToken} onChange={e => setFormData({...formData, accessToken: e.target.value})}
                placeholder="Dán token lấy từ Facebook Developer vào đây"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              ></textarea>
            </div>
            <button 
              type="submit" disabled={isLoading}
              className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Đang lưu...' : 'Lưu Fanpage'}
            </button>
          </form>
        </div>

        {/* Bảng danh sách Fanpage */}
        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Fanpage đang hoạt động</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">Tên Page</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Page ID</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Người thêm</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Ngày thêm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pages.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      Chưa có Fanpage nào được kết nối.
                    </td>
                  </tr>
                ) : (
                  pages.map((page) => (
                    <tr key={page.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-800">{page.name}</td>
                      <td className="px-4 py-3 text-gray-600">{page.pageId}</td>
                      <td className="px-4 py-3 text-gray-600">{page.addedBy?.name}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(page.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}