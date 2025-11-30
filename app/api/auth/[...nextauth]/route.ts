import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      // Remove image from session if present
      if (session.user) {
        delete (session.user as any).image;
      }
      return session;
    },
    async jwt({ token, account, profile }) {
      // Remove image from token if present
      if (token.picture) {
        delete token.picture;
      }
      return token;
    },
  },
  pages: {
    signIn: '/login', // Custom sign-in page
  },
});

export { handler as GET, handler as POST };
