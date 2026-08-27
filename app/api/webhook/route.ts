import { NextResponse } from 'next/server';

// Lấy mã xác minh từ biến môi trường
const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

// 1. Hàm GET: Dành riêng cho Facebook gọi tới để xác minh Webhook
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Kiểm tra nếu Facebook đang muốn xác minh (subscribe) và mã token khớp
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED_SUCCESSFULLY");
    // Phải trả về đúng mã challenge mà Facebook gửi tới
    return new NextResponse(challenge, { status: 200 });
  } else {
    // Kẻ gian gọi tới hoặc sai token sẽ bị chặn
    return new NextResponse("Forbidden", { status: 403 });
  }
}

// 2. Hàm POST: Dành để nhận tin nhắn của khách hàng sau này
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Đảm bảo đây là dữ liệu từ Fanpage
    if (body.object === 'page') {
      console.log("Incoming Message Data:", JSON.stringify(body, null, 2));
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    }
    
    return new NextResponse("Not Found", { status: 404 });
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}