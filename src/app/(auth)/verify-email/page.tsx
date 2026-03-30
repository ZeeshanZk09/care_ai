"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { verifyEmail } from "@/lib/actions/auth";

function VerifyEmailLogic() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  if (status === "loading") {
    return <p className="text-gray-600">Verifying your email please wait...</p>;
  }

  if (status === "error") {
    return (
      <div className="text-center">
        <p className="text-red-500 mb-4">
          Invalid or expired verification token.
        </p>
        <Link href="/sign-up">
          <Button variant="outline">Back to Sign Up</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-green-600 mb-4 font-semibold">
        Email verified successfully!
      </p>
      <Link href="/sign-in">
        <Button>Continue to Log In</Button>
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 mt-8">
      <h1 className="text-2xl font-bold">Email Verification</h1>

      <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow-sm border flex justify-center">
        <Suspense fallback={<div>Loading...</div>}>
          <VerifyEmailLogic />
        </Suspense>
      </div>
    </div>
  );
}
