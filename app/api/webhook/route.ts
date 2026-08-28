import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.object === 'page') {
      for (const entry of body.entry) {
        const pageId = entry.id; // ID của Fanpage trên Facebook

        for (const event of entry.messaging) {
          if (event.message && event.message.text) {
            const customerId = event.sender.id;
            const messageId = event.message.mid;
            const text = event.message.text;

            // 1. Kiểm tra Fanpage đã tồn tại trong hệ thống chưa
            console.log("Tìm fanpage với ID:", pageId);
            const fanpage = await prisma.fanpage.findUnique({
              where: { pageId: pageId }
            });

            if (!fanpage) continue; // Bỏ qua nếu chưa khai báo Page trong DB

            // 2. Tìm hoặc tạo mới Cuộc hội thoại
            let conversation = await prisma.conversation.findFirst({
              where: {
                fanpageId: fanpage.id,
                customerId: customerId
              }
            });

            if (!conversation) {
              conversation = await prisma.conversation.create({
                data: {
                  fanpageId: fanpage.id,
                  customerId: customerId,
                  customerName: "Khách hàng mới" 
                }
              });
            }

            // 3. Lưu nội dung tin nhắn
            await prisma.message.upsert({
              where: { messageId: messageId },
              update: {}, // Chống trùng lặp tin nhắn
              create: {
                conversationId: conversation.id,
                messageId: messageId,
                content: text,
                senderId: customerId,
                isFromCustomer: true
              }
            });
          }
        }
      }
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    }
    return new NextResponse("Not Found", { status: 404 });
  } catch (error) {
    console.error("Lỗi Webhook:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}