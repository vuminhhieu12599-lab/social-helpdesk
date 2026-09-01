import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher'; // Khai báo tĩnh Pusher ở đây

const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("hub.mode") === "subscribe" && searchParams.get("hub.verify_token") === VERIFY_TOKEN) {
    return new NextResponse(searchParams.get("hub.challenge"), { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.object === 'page') {
      for (const entry of body.entry) {
        for (const event of entry.messaging) {
          if (event.message && event.message.text) {
            const customerId = event.sender.id;
            const messageId = event.message.mid;
            
            const fanpage = await prisma.fanpage.findUnique({ where: { pageId: entry.id } });
            if (!fanpage) continue;

            let conversation = await prisma.conversation.findFirst({
              where: { fanpageId: fanpage.id, customerId: customerId }
            });

            if (!conversation) {
              let realName = "Khách hàng mới";
              let avatarUrl = `https://ui-avatars.com/api/?name=Khach+Hang&background=random`;
              
              // Lấy thông tin avatar thật từ Facebook
              try {
                const fbRes = await fetch(`https://graph.facebook.com/${customerId}?fields=name,profile_pic&access_token=${fanpage.accessToken}`);
                const fbData = await fbRes.json();
                if (fbData.name) realName = fbData.name;
                if (fbData.profile_pic) avatarUrl = fbData.profile_pic;
              } catch (e) { 
                console.error("Lỗi lấy thông tin FB:", e); 
              }

              conversation = await prisma.conversation.create({
                data: {
                  fanpageId: fanpage.id,
                  customerId: customerId,
                  customerName: realName,
                  avatarUrl: avatarUrl,
                  isRead: false // Đánh dấu chưa đọc
                }
              });
            } else {
              // Khách cũ nhắn lại: Cập nhật isRead = false
              conversation = await prisma.conversation.update({
                where: { id: conversation.id },
                data: { isRead: false, updatedAt: new Date() }
              });
            }

            // Lưu tin nhắn
            const savedMessage = await prisma.message.upsert({
              where: { messageId: messageId },
              update: {},
              create: {
                conversationId: conversation.id,
                messageId: messageId,
                content: event.message.text,
                senderId: customerId,
                isFromCustomer: true
              }
            });

            // Bắn tín hiệu Real-time
            try {
              await pusherServer.trigger('helpdesk-chat', 'new-message', {
                conversationId: conversation.id,
                message: savedMessage
              });
              console.log("Đã bắn Pusher từ Webhook thành công!"); 
            } catch (err) {
              console.error("Lỗi bắn Pusher từ Webhook:", err);
            }
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