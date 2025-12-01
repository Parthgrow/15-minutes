import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { randomUUID } from 'crypto';
import { db } from '@/lib/firebase/config';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      try {
        // Use singleton Firestore instance
        
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

        const userData = {
          id: existingUserDoc?.data()?.id || userId,
          name: user.name || null,
          email: user.email || null,
          updatedAt: new Date(),
        };

        if (existingUserDoc) {
          // Update existing user
          await existingUserDoc.ref.update(userData);
        } else {
          // Create new user with createdAt
          const userRef = db.collection('users').doc(userId);
          await userRef.set({
            ...userData,
            createdAt: new Date(),
          });
        }

        return true; // Allow sign in
      } catch (error) {
        console.error('Error saving user to Firebase:', error);
        // Still allow sign in even if Firebase save fails
        return true;
      }
    },
    async session({ session }) {
      // Remove image from session if present
      if (session.user && 'image' in session.user) {
        delete (session.user as { image?: string }).image;
      }
      return session;
    },
    async jwt({ token }) {
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
