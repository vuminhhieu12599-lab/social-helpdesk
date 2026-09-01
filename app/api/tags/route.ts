import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json(tags);
  } catch (error) {
    return NextResponse.json({ error: "Lỗi tải thẻ" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, color } = await request.json();
    if (!name) return NextResponse.json({ error: "Thiếu tên thẻ" }, { status: 400 });

    const newTag = await prisma.tag.create({
      data: { name, color: color || '#3B82F6' } // Mặc định màu xanh blue
    });
    return NextResponse.json(newTag);
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: "Thẻ này đã tồn tại" }, { status: 400 });
    return NextResponse.json({ error: "Lỗi tạo thẻ" }, { status: 500 });
  }
}