import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'STAFF' },
      include: { managedPages: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Lỗi tải dữ liệu" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, pageIds } = body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return NextResponse.json({ error: "Email đã tồn tại" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'STAFF',
        managedPages: {
          connect: pageIds.map((id: string) => ({ id }))
        }
      }
    });

    return NextResponse.json(newUser);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}