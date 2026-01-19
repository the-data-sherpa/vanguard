import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Vanguard" width={40} height={40} className="rounded" />
          <span className="text-2xl font-bold">Vanguard</span>
        </Link>
      </div>
      <SignIn
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
