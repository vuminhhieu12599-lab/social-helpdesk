import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Tài khoản nội bộ",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "nhanvien@congty.com" },
        password: { label: "Mật khẩu", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Vui lòng nhập đầy đủ thông tin");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) throw new Error("Tài khoản không tồn tại");

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) throw new Error("Mật khẩu không chính xác");

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login', // Lát nữa chúng ta sẽ tự code giao diện trang này
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };