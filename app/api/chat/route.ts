import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import { pusherServer } from '@/lib/pusher'; // Khai báo tĩnh Pusher ở đây

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const isAdmin = token.role === 'ADMIN';
  const userId = token.id as string;

  const searchParams = request.nextUrl.searchParams;
  const conversationId = searchParams.get('conversationId');

  try {
    if (conversationId) {
      const messages = await prisma.message.findMany({
        where: { conversationId: conversationId },
        orderBy: { createdAt: 'asc' }
      });
      
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { isRead: true }
      });

      return NextResponse.json(messages);
    } else {
      // Phân quyền dữ liệu Fanpage
      const fanpageCondition = isAdmin ? {} : {
        managers: { some: { id: userId } }
      };

      const conversations = await prisma.conversation.findMany({
        where: { fanpage: fanpageCondition },
        include: { 
          fanpage: true,
          tags: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 10 
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      const formattedConvs = conversations.map(conv => {
        let unreadCount = 0;
        if (!conv.isRead) {
          for (const msg of conv.messages) {
            if (msg.isFromCustomer) unreadCount++;
            else break; 
          }
        }
        if (!conv.isRead && unreadCount === 0) unreadCount = 1;

        return { ...conv, unreadCount };
      });

      return NextResponse.json(formattedConvs);
    }
  } catch (error) {
    return NextResponse.json({ error: "Lỗi tải dữ liệu" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  try {
    const body = await request.json();
    const { conversationId, text } = body;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { fanpage: true }
    });

    if (!conversation) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

    const fbResponse = await fetch(`https://graph.facebook.com/v19.0/${conversation.fanpage.pageId}/messages?access_token=${conversation.fanpage.accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: conversation.customerId },
        message: { text: text }
      })
    });

    const fbData = await fbResponse.json();
    if (fbData.error) throw new Error(fbData.error.message);

    const newMessage = await prisma.message.create({
      data: {
        conversationId,
        messageId: fbData.message_id || `local_${Date.now()}`,
        content: text,
        senderId: conversation.fanpage.pageId,
        isFromCustomer: false
      }
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    // Bắn tín hiệu Real-time
    try {
      console.log(`=> Đang bắn Pusher tới hội thoại: ${conversationId}`);
      const pushRes = await pusherServer.trigger('helpdesk-chat', 'new-message', {
        conversationId: conversationId,
        message: newMessage
      });
      console.log("=> Bắn Pusher THÀNH CÔNG! Status:", pushRes.status);
    } catch (err) {
      console.error("=> LỖI BẮN PUSHER TỪ API:", err);
    }

    return NextResponse.json(newMessage);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}