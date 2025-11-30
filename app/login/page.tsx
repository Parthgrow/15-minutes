'use client';

import { signIn, useSession } from 'next-auth/react';

export default function LoginPage() {
  const { data: session, status } = useSession();

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/login' });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-green-400 font-mono">Loading...</div>
      </div>
    );
  }

  if (session) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="max-w-md w-full border border-gray-800 rounded-lg p-8 bg-[#111111]">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-green-400 font-mono mb-2">
              Signed In Successfully
            </h1>
            <div className="w-16 h-1 bg-green-400 mx-auto"></div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="space-y-2 text-gray-300 font-mono text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-500">Name:</span>
                <span className="text-gray-200">{session.user?.name || 'N/A'}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-green-500">Email:</span>
                <span className="text-gray-200">{session.user?.email || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-4">
            <button
              onClick={() => signIn('google', { callbackUrl: '/login' })}
              className="w-full bg-green-500 hover:bg-green-600 text-black font-mono font-bold py-2 px-4 rounded transition-colors"
            >
              Sign In Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full border border-gray-800 rounded-lg p-8 bg-[#111111]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-400 font-mono mb-2">
            15 MINUTES
          </h1>
          <p className="text-gray-500 font-mono text-sm">
            Sign in to continue
          </p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="w-full bg-white hover:bg-gray-100 text-gray-900 font-mono font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
