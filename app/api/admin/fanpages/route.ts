import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const pages = await prisma.fanpage.findMany({
      include: { addedBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(pages);
  } catch (error) {
    return NextResponse.json({ error: "Lỗi tải dữ liệu" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pageId, name, accessToken, userId } = body;

    if (!pageId || !name || !accessToken || !userId) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const newPage = await prisma.fanpage.create({
      data: {
        pageId,
        name,
        accessToken,
        userId
      }
    });

    return NextResponse.json(newPage);
  } catch (error: any) {
    // Lỗi P2002 của Prisma là lỗi trùng khóa Unique (Page ID đã tồn tại)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Fanpage này đã được kết nối vào hệ thống!" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}