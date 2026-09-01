import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  // Thay vì đếm tổng số user, chỉ kiểm tra xem admin@system.com đã có chưa
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@system.com" }
  });
  
  if (existingAdmin) {
    return NextResponse.json({ message: "Tài khoản admin@system.com đã tồn tại." }, { status: 403 });
  }

  const hashedPassword = await bcrypt.hash("123456", 10);
  
  const admin = await prisma.user.create({
    data: {
      name: "Quản trị viên",
      email: "admin@system.com",
      password: hashedPassword,
      role: "ADMIN"
    }
  });

  return NextResponse.json({ 
    message: "Tạo tài khoản thành công!", 
    email: admin.email, 
    password: "123456" 
  });
}