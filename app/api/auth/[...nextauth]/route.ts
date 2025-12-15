import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { randomUUID } from 'crypto';
import { db } from '@/lib/firebase/config';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      try {
        // Generate UUID for user
        const userId = randomUUID();

        // Check if user already exists by email
        let existingUserDoc = null;
        if (user.email) {
          const usersSnapshot = await db
            .collection('users')
            .where('email', '==', user.email)
            .limit(1)
            .get();

          if (!usersSnapshot.empty) {
            existingUserDoc = usersSnapshot.docs[0];
          }
        }

        const finalUserId = existingUserDoc?.data()?.id || userId;

        const userData = {
          id: finalUserId,
          name: user.name || null,
          email: user.email || null,
          updatedAt: new Date(),
        };

        if (existingUserDoc) {
          // Update existing user
          // await existingUserDoc.ref.update(userData);
        } else {
          // Create new user with createdAt
          const userRef = db.collection('users').doc(userId);
          await userRef.set({
            ...userData,
            createdAt: new Date(),
          });
        }

        // Store userId on user object for jwt callback
        user.id = finalUserId;

        return true; // Allow sign in
      } catch (error) {
        console.error('Error saving user to Firebase:', error);
        return true;
      }
    },
    async jwt({ token, user }) {
      // On sign in, persist userId to token
      if (user?.id) {
        token.userId = user.id;
      }
      // Remove image from token if present
      if (token.picture) {
        delete token.picture;
      }
      return token;
    },
    async session({ session, token }) {
      // Add userId to session
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      // Remove image from session if present
      if (session.user && 'image' in session.user) {
        delete (session.user as { image?: string }).image;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login', // Custom sign-in page
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
