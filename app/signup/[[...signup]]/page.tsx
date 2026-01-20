import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

const SIGNUPS_DISABLED = process.env.NEXT_PUBLIC_SIGNUPS_DISABLED === "true";

export default function SignUpPage() {
  if (SIGNUPS_DISABLED) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="mb-8">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Vanguard" width={40} height={40} className="rounded" />
            <span className="text-2xl font-bold">Vanguard</span>
          </Link>
        </div>
        <div className="w-full max-w-md text-center space-y-6 p-8 border rounded-xl shadow-lg bg-card">
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-4">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Signups Temporarily Paused</h1>
            <p className="text-muted-foreground">
              We&apos;re not accepting new signups at the moment. Please check back soon or contact us for more information.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild>
              <Link href="/login">Sign In to Existing Account</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Vanguard" width={40} height={40} className="rounded" />
          <span className="text-2xl font-bold">Vanguard</span>
        </Link>
      </div>
      <SignUp
        forceRedirectUrl="/onboarding"
        appearance={{
          elements: {
            rootBox: "w-full max-w-md",
            card: "shadow-lg border rounded-xl",
          },
        }}
      />
    </div>
  );
}
