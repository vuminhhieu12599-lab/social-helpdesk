"use client";
import { useEffect, useState } from 'react';

export default function ChatDashboard() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");

  // 1. Tải danh sách hội thoại khi mở trang
  useEffect(() => {
    fetch('/api/chat')
      .then(res => res.json())
      .then(data => {
        console.log("Dữ liệu API trả về:", data);
        if (Array.isArray(data)) {
          setConversations(data);
        } else {
          console.error("API trả về sai định dạng:", data);
        }
      })
      .catch(error => console.error("Lỗi khi gọi API:", error));
  }, []);

  // 2. Tải tin nhắn khi bấm vào một khách hàng
  useEffect(() => {
    if (selectedConv) {
      fetch(`/api/chat?conversationId=${selectedConv.id}`)
        .then(res => res.json())
        .then(data => setMessages(data));
    }
  }, [selectedConv]);

  // 3. Hàm xử lý gửi tin nhắn
  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedConv) return;
    
    const tempText = inputText;
    setInputText(""); // Làm trống ô nhập ngay lập tức

    // Hiển thị tạm tin nhắn lên màn hình cho mượt
    setMessages(prev => [...prev, { id: Date.now().toString(), content: tempText, isFromCustomer: false }]);

    // Gọi API để gửi đi
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: selectedConv.id, text: tempText })
    });
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Cột trái: Danh sách hội thoại */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-blue-600 text-white">
          <h1 className="text-xl font-bold">Hộp thư Fanpage</h1>
        </div>
        <div className="overflow-y-auto flex-1">
          {conversations.map((conv) => (
            <div 
              key={conv.id} 
              onClick={() => setSelectedConv(conv)}
              className={`p-4 border-b cursor-pointer hover:bg-gray-100 transition-colors ${selectedConv?.id === conv.id ? 'bg-blue-50' : ''}`}
            >
              <h3 className="font-semibold text-gray-800">{conv.customerName || "Khách hàng"}</h3>
              <p className="text-sm text-gray-500">Từ page: {conv.fanpage.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cột phải: Khung chat chi tiết */}
      <div className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            <div className="p-4 border-b border-gray-200 bg-white shadow-sm z-10">
              <h2 className="text-lg font-bold text-gray-800">{selectedConv.customerName}</h2>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isFromCustomer ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[70%] p-3 rounded-xl shadow-sm ${msg.isFromCustomer ? 'bg-white text-gray-800 border border-gray-200' : 'bg-blue-600 text-white'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Khu vực nhập tin nhắn */}
            <div className="p-4 bg-white border-t border-gray-200 flex gap-2">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Nhập câu trả lời..." 
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={handleSendMessage}
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition-colors"
              >
                Gửi
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Chọn một cuộc hội thoại để bắt đầu
          </div>
        )}
      </div>
    </div>
  );
}