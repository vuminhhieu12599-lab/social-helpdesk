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
        const pageId = entry.id;

        for (const event of entry.messaging) {
          if (event.message && event.message.text) {
            const customerId = event.sender.id;
            const messageId = event.message.mid;
            const text = event.message.text;

            const fanpage = await prisma.fanpage.findUnique({
              where: { pageId: pageId }
            });

            if (!fanpage) continue;

            let conversation = await prisma.conversation.findFirst({
              where: {
                fanpageId: fanpage.id,
                customerId: customerId
              }
            });

            // NẾU LÀ KHÁCH HÀNG MỚI -> LẤY TÊN TỪ FACEBOOK
            if (!conversation) {
              let realName = "Khách hàng mới";
              try {
                // Gọi Graph API của Facebook để hỏi tên
                const fbRes = await fetch(`https://graph.facebook.com/${customerId}?fields=name&access_token=${fanpage.accessToken}`);
                const fbData = await fbRes.json();
                if (fbData.name) {
                  realName = fbData.name; // Gán tên thật
                }
              } catch (e) {
                console.error("Lỗi lấy tên Facebook:", e);
              }

              conversation = await prisma.conversation.create({
                data: {
                  fanpageId: fanpage.id,
                  customerId: customerId,
                  customerName: realName // Lưu tên thật vào Database
                }
              });
            }

            // Lưu tin nhắn
            await prisma.message.upsert({
              where: { messageId: messageId },
              update: {},
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