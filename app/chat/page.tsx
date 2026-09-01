"use client";
import { useEffect, useState, useRef } from 'react';
import Navigation from '@/components/Navigation';
import PusherClient from 'pusher-js';

const formatTime = (dateString: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

export default function ChatDashboard() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Dùng Ref để lưu trạng thái ID đang chọn (tránh lỗi stale-state trong Pusher callback)
  const selectedConvIdRef = useRef<string | null>(null);

  const [allTags, setAllTags] = useState<any[]>([]);
  const [filterTagId, setFilterTagId] = useState<string>("");
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(COLORS[0]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const fetchConvs = () => {
    fetch(`/api/chat?t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setConversations(data); })
      .catch(err => console.error(err));
  };

  const fetchMessages = (convId: string) => {
    fetch(`/api/chat?conversationId=${convId}&t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
          setMessages(data);
          setConversations(prev => prev.map(c => c.id === convId ? { ...c, isRead: true, unreadCount: 0 } : c));
      });
  };

  // 1. Tải dữ liệu lần đầu
  useEffect(() => {
    fetch('/api/tags').then(res => res.json()).then(data => { if(Array.isArray(data)) setAllTags(data); });
    fetchConvs();
  }, []);

  // 2. Tải tin nhắn khi đổi hội thoại
  useEffect(() => {
    selectedConvIdRef.current = selectedConv?.id || null;
    if (selectedConv) {
      fetchMessages(selectedConv.id);
    }
  }, [selectedConv]);

  // 3. LẮNG NGHE PUSHER REAL-TIME
  useEffect(() => {
    PusherClient.logToConsole = true;
    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe('helpdesk-chat');
    channel.bind('new-message', (data: { conversationId: string, message: any }) => {
      // Gọi lại danh sách hội thoại để cập nhật preview tin nhắn mới nhất & số lượng chưa đọc
      fetchConvs();

      // Nếu tin nhắn mới thuộc về đoạn chat ĐANG MỞ -> Nhét thẳng vào màn hình
      if (selectedConvIdRef.current === data.conversationId) {
        setMessages(prev => {
          // Tránh bị duplicate tin nhắn
          const exists = prev.find(m => m.id === data.message.id);
          if (exists) return prev;
          return [...prev, data.message];
        });
        
        // Đánh dấu đã đọc ngay lập tức vì đang mở tab
        fetch(`/api/chat?conversationId=${data.conversationId}`);
      }
    });

    return () => {
      pusher.unsubscribe('helpdesk-chat');
    };
  }, []);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedConv) return;
    const tempText = inputText;
    setInputText("");
    
    // 1. OPTIMISTIC UI: Hiển thị tin nhắn ngay lập tức lên màn hình cho nhân viên
    const tempMessage = {
      id: `temp_${Date.now()}`,
      content: tempText,
      isFromCustomer: false,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMessage]);

    // 2. Gửi ngầm xuống Database
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: selectedConv.id, text: tempText })
    });
  };

  // Logic Tạo Thẻ Mới
  const handleCreateTag = async () => {
    if(!newTagName.trim()) return;
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTagName, color: newTagColor })
    });
    const data = await res.json();
    if(!data.error) {
      setAllTags([...allTags, data]);
      setNewTagName("");
    } else alert(data.error);
  };

  // Logic Gắn/Gỡ Thẻ cho Hội thoại
  const toggleTag = async (tag: any, isAttached: boolean) => {
    const action = isAttached ? 'remove' : 'add';
    
    // Cập nhật UI ngay lập tức
    const updatedTags = isAttached 
      ? selectedConv.tags.filter((t: any) => t.id !== tag.id)
      : [...(selectedConv.tags || []), tag];
      
    setSelectedConv({ ...selectedConv, tags: updatedTags });
    setConversations(prev => prev.map(c => c.id === selectedConv.id ? { ...c, tags: updatedTags } : c));

    await fetch('/api/chat/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: selectedConv.id, tagId: tag.id, action })
    });
  };

  // Lọc hội thoại theo thẻ
  const filteredConversations = conversations.filter(conv => {
    if (!filterTagId) return true;
    return conv.tags?.some((t: any) => t.id === filterTagId);
  });

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Navigation />

      <div className="w-[350px] bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-200 bg-blue-600 text-white flex justify-between items-center">
          <h1 className="text-xl font-bold">Hộp thư</h1>
        </div>
        
        {/* Bộ lọc Thẻ */}
        <div className="p-2 border-b border-gray-200 bg-gray-50">
          <select 
            className="w-full p-2 text-sm border-gray-300 rounded bg-white outline-none focus:ring-1 focus:ring-blue-500"
            value={filterTagId}
            onChange={(e) => setFilterTagId(e.target.value)}
          >
            <option value="">Tất cả khách hàng</option>
            {allTags.map(tag => (
              <option key={tag.id} value={tag.id}>Lọc: {tag.name}</option>
            ))}
          </select>
        </div>

        <div className="overflow-y-auto flex-1 bg-white">
          {filteredConversations.map((conv) => {
            const latestMsg = conv.messages?.[0];
            const isUnread = !conv.isRead && selectedConv?.id !== conv.id;
            return (
              <div key={conv.id} onClick={() => setSelectedConv(conv)}
                className={`p-3 border-b flex gap-3 cursor-pointer transition-colors ${selectedConv?.id === conv.id ? 'bg-gray-100 border-l-4 border-l-gray-400' : isUnread ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}
              >
                <div className="relative flex-shrink-0">
                  <img 
                    src={conv.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.customerName || 'KH')}&background=random`} 
                    alt="Avatar" 
                    className="w-12 h-12 rounded-full object-cover border border-gray-200" 
                  />
                  {isUnread && conv.unreadCount > 0 && (
                    <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white shadow-sm">{conv.unreadCount > 5 ? '5+' : conv.unreadCount}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className={`font-semibold truncate text-sm ${isUnread ? 'text-blue-800' : 'text-gray-700'}`}>{conv.customerName}</h3>
                    <span className={`text-xs flex-shrink-0 ml-2 ${isUnread ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>{latestMsg ? formatTime(latestMsg.createdAt) : ''}</span>
                  </div>
                  <p className={`text-sm truncate mb-1 ${isUnread ? 'font-bold text-black' : 'text-gray-500'}`}>{latestMsg?.content || "..."}</p>
                  
                  {/* Hiển thị Tag thu nhỏ dưới tin nhắn */}
                  {conv.tags && conv.tags.length > 0 && (
                    <div className="flex gap-1 overflow-hidden mt-1">
                      {conv.tags.map((t: any) => (
                        <span key={t.id} style={{ backgroundColor: t.color }} className="w-2 h-2 rounded-full inline-block flex-shrink-0"></span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {selectedConv ? (
          <>
            <div className="p-4 border-b border-gray-200 bg-white shadow-sm z-10 flex items-center gap-3">
              <img 
                src={selectedConv.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedConv.customerName || 'KH')}&background=random`} 
                alt="Avatar" 
                className="w-10 h-10 rounded-full object-cover border border-gray-200" 
              />
              <div>
                <h2 className="text-lg font-bold text-gray-800">{selectedConv.customerName}</h2>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">{selectedConv.fanpage?.name || 'Fanpage'}</span>
                  {selectedConv.tags?.map((t: any) => (
                    <span key={t.id} style={{ backgroundColor: t.color }} className="text-[10px] text-white px-2 py-0.5 rounded-md font-semibold">{t.name}</span>
                  ))}
                </div>
              </div>
              
              {/* Menu Gắn thẻ */}
              <div className="ml-auto relative">
                <button onClick={() => setShowTagMenu(!showTagMenu)} className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  🏷️ Gắn thẻ
                </button>
                
                {showTagMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 shadow-xl rounded-lg p-3 z-50">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Thẻ hiện có</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1 mb-3">
                      {allTags.map(tag => {
                        const isAttached = selectedConv.tags?.some((t:any) => t.id === tag.id);
                        return (
                          <div key={tag.id} onClick={() => toggleTag(tag, isAttached)} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer">
                            <div className="flex items-center gap-2">
                              <span style={{ backgroundColor: tag.color }} className="w-3 h-3 rounded-full"></span>
                              <span className="text-sm text-gray-700">{tag.name}</span>
                            </div>
                            {isAttached && <span className="text-blue-600 text-xs font-bold">✓</span>}
                          </div>
                        );
                      })}
                      {allTags.length === 0 && <p className="text-xs text-gray-400">Chưa có thẻ nào</p>}
                    </div>
                    
                    <div className="border-t pt-3">
                      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Tạo thẻ mới</h4>
                      <input type="text" value={newTagName} onChange={e=>setNewTagName(e.target.value)} placeholder="Tên thẻ (VD: Khách VIP)" className="w-full text-sm border p-1.5 rounded mb-2 outline-none focus:border-blue-500" />
                      <div className="flex gap-1 mb-2">
                        {COLORS.map(c => (
                          <div key={c} onClick={() => setNewTagColor(c)} style={{ backgroundColor: c }} className={`w-5 h-5 rounded-full cursor-pointer border-2 ${newTagColor === c ? 'border-gray-800' : 'border-transparent'}`}></div>
                        ))}
                      </div>
                      <button onClick={handleCreateTag} className="w-full bg-blue-600 text-white text-xs py-1.5 rounded font-semibold hover:bg-blue-700">Tạo mới</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4" onClick={() => setShowTagMenu(false)}>
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isFromCustomer ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[70%] p-3 rounded-2xl shadow-sm text-[15px] ${msg.isFromCustomer ? 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm' : 'bg-blue-600 text-white rounded-tr-sm'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-200 flex gap-2">
              <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Nhập tin nhắn..." className="flex-1 px-4 py-2 bg-gray-100 border-none rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={handleSendMessage} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700">Gửi</button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
            <p>Chọn một cuộc hội thoại để bắt đầu</p>
          </div>
        )}
      </div>
    </div>
  );
}