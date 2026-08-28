export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');

  try {
    if (conversationId) {
      // Lấy chi tiết tin nhắn của một cuộc hội thoại
      const messages = await prisma.message.findMany({
        where: { conversationId: conversationId },
        orderBy: { createdAt: 'asc' }
      });
      return NextResponse.json(messages);
    } else {
      // Lấy danh sách khách hàng bên cột trái
      const conversations = await prisma.conversation.findMany({
        include: { fanpage: true },
        orderBy: { updatedAt: 'desc' }
      });
      return NextResponse.json(conversations);
    }
  } catch (error) {
    return NextResponse.json({ error: "Lỗi tải dữ liệu" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversationId, text } = body;

    // Lấy thông tin khách hàng và mã Token của Page
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { fanpage: true }
    });

    if (!conversation) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

    // Gửi lệnh lên Facebook Graph API
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

    // Lưu lại tin nhắn vừa gửi vào Database
    const newMessage = await prisma.message.create({
      data: {
        conversationId,
        messageId: fbData.message_id || `local_${Date.now()}`,
        content: text,
        senderId: conversation.fanpage.pageId,
        isFromCustomer: false
      }
    });

    return NextResponse.json(newMessage);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}