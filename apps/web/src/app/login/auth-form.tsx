"use client";

import { useState } from "react";
import { GoogleIcon } from "@/components/icons";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// import { useSearchParams } from "next/navigation";
import Spinner from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";

type UserAuthFormProps = React.HTMLAttributes<HTMLDivElement>;

function AuthForm({ className, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [isSent, setIsSent] = useState<boolean>(false);

  // const params = useSearchParams();
  // const redirect =
  //   params.get("r") && decodeURIComponent(params.get("r")!.toString());

  const handleSignInWithProvider = async (provider: string) => {
    setIsLoading(true);
    await signIn(provider, { callbackUrl: "/app" });
    setIsLoading(false);
  };

  const onSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault();

    setIsLoading(true);
    const result = await signIn("email", {
      email,
      redirect: false,
      callbackUrl: "/app",
    });
    if (!result || result?.error || !result.ok) {
      toast.error("Either something went wrong or you're not authorized!");
    } else {
      toast.success("Email sent!");
      setIsSent(true);
    }
    setIsLoading(false);
  };

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      {isSent ? (
        <Alert className="[&>svg+div]:translate-y-0">
          <CheckCircle className="!top-3 h-4 w-4" />
          <AlertTitle className="mb-0">Check your inbox at {email}</AlertTitle>
        </Alert>
      ) : (
        <form onSubmit={onSubmit}>
          <div className="grid gap-2">
            <div className="grid gap-1">
              <Label className="sr-only" htmlFor="email">
                Email
              </Label>
              <Input
                id="email"
                placeholder="name@example.com"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                disabled={isLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button disabled={isLoading}>
              {isLoading && <Spinner size="2xs" className="mr-2" />}
              Sign In with Email
            </Button>
          </div>
        </form>
      )}
      {/* <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={isLoading}
        onClick={() => handleSignInWithProvider("google")}
      >
        {isLoading ? (
          <Spinner size="2xs" className="mr-2" />
        ) : (
          <GoogleIcon className="mr-2 h-4 w-4" />
        )}
        Google
      </Button> */}
    </div>
  );
}

export default AuthForm;
