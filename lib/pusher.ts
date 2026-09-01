import Pusher from 'pusher';

// Dòng log này sẽ in ra Terminal để kiểm tra xem hệ thống đã đọc được file .env chưa
console.log("=> KIỂM TRA PUSHER APP ID:", process.env.PUSHER_APP_ID || "LỖI: KHÔNG TÌM THẤY KEY");

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || "",
  key: process.env.PUSHER_KEY || "",
  secret: process.env.PUSHER_SECRET || "",
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1",
  useTLS: true
});