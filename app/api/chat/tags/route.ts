import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { conversationId, tagId, action } = await request.json();

    const updateData = action === 'add' 
      ? { connect: { id: tagId } } 
      : { disconnect: { id: tagId } };

    const updatedConv = await prisma.conversation.update({
      where: { id: conversationId },
      data: { tags: updateData },
      include: { tags: true }
    });

    return NextResponse.json(updatedConv.tags);
  } catch (error) {
    return NextResponse.json({ error: "Lỗi xử lý thẻ" }, { status: 500 });
  }
}