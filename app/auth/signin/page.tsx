'use client';
import { AuthBackground } from '@/components/auth/AuthBackground';
import SignInForm from './SignInForm';

export default function SignInPage() {
  return (
    <>
      <AuthBackground />
      <div className="relative z-10">
        <SignInForm />
      </div>
    </>
  );
}
