"use client";

import { useState, useEffect } from "react";
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
  const [loginUrl, setLoginUrl] = useState<string | null>(null);

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

  // Poll for login URL in development mode
  useEffect(() => {
    if (!isSent || !email) return;

    const pollForUrl = async () => {
      try {
        const response = await fetch(`/api/dev-login-url?email=${encodeURIComponent(email)}`);
        const data = await response.json();
        if (data.url) {
          setLoginUrl(data.url);
        }
      } catch (error) {
        console.error("Failed to fetch login URL:", error);
      }
    };

    // Poll immediately and then every second for up to 10 seconds
    pollForUrl();
    const interval = setInterval(pollForUrl, 1000);
    const timeout = setTimeout(() => clearInterval(interval), 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isSent, email]);

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      {isSent ? (
        <div className="space-y-4">
          <Alert className="[&>svg+div]:translate-y-0">
            <CheckCircle className="!top-3 h-4 w-4" />
            <AlertTitle className="mb-0">Check your inbox at {email}</AlertTitle>
          </Alert>
          {loginUrl && (
            <Alert className="[&>svg+div]:translate-y-0 border-blue-500 bg-blue-50">
              <div className="space-y-2">
                <AlertTitle className="mb-0 text-blue-900">
                  🔓 Development Login Link
                </AlertTitle>
                <p className="text-sm text-blue-800">
                  Click the button below to log in (development mode only):
                </p>
                <Button
                  onClick={() => window.location.href = loginUrl}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Login Now
                </Button>
                <details className="text-xs">
                  <summary className="cursor-pointer text-blue-700 hover:text-blue-900">
                    Show full URL
                  </summary>
                  <code className="mt-2 block break-all rounded bg-blue-100 p-2 text-blue-900">
                    {loginUrl}
                  </code>
                </details>
              </div>
            </Alert>
          )}
        </div>
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
