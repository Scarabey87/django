"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2, Mail } from "lucide-react";
import { db } from "@/lib/mock-db";
import Link from "next/link";

const MAX_ATTEMPTS = 3;
const LOCKOUT_TIME_MS = 30 * 1000; // 30 seconds lockout

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  // Brute force protection state
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState("");

  // Check for existing lockout on mount
  useEffect(() => {
    const storedAttempts = parseInt(localStorage.getItem("login_attempts") || "0", 10);
    const storedLockout = parseInt(localStorage.getItem("lockout_until") || "0", 10);
    
    if (storedLockout && Date.now() < storedLockout) {
      setLockoutUntil(storedLockout);
      setAttempts(storedAttempts);
    } else {
      // Reset if lockout expired
      localStorage.removeItem("login_attempts");
      localStorage.removeItem("lockout_until");
    }
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockoutUntil) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      if (now >= lockoutUntil) {
        setLockoutUntil(null);
        setAttempts(0);
        localStorage.removeItem("login_attempts");
        localStorage.removeItem("lockout_until");
      } else {
        const seconds = Math.ceil((lockoutUntil - now) / 1000);
        setTimeLeft(`${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (lockoutUntil && Date.now() < lockoutUntil) {
      setError("Too many attempts. Please wait.");
      setIsLoading(false);
      return;
    }

    const user = db.login(email, password);

    if (user) {
      // Success
      db.setSession(user);
      localStorage.removeItem("login_attempts");
      localStorage.removeItem("lockout_until");
      router.push("/");
    } else {
      // Failure
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      localStorage.setItem("login_attempts", newAttempts.toString());

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockTime = Date.now() + LOCKOUT_TIME_MS;
        setLockoutUntil(lockTime);
        localStorage.setItem("lockout_until", lockTime.toString());
        setError(`Too many failed attempts. Account locked for 30 seconds.`);
      } else {
        setError(`Invalid credentials. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
      }
    }
    setIsLoading(false);
  };

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    setError("");
    // Simulate network delay
    setTimeout(() => {
      const user = db.googleLogin();
      db.setSession(user);
      localStorage.removeItem("login_attempts");
      localStorage.removeItem("lockout_until");
      router.push("/");
    }, 1500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Card className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <AlertCircle className="h-6 w-6 text-primary" />
          </Card>
          <CardTitle className="text-2xl text-center">Login</CardTitle>
          <CardDescription className="text-center">
            Enter your email and password to access LIVE-AI.ART
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!lockoutUntil}
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={!!lockoutUntil}
              />
            </div>
            
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
                {lockoutUntil && <span className="ml-auto font-mono">{timeLeft}</span>}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || !!lockoutUntil}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
          
          <div className="relative my-6">
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
            variant="outline" 
            className="w-full gap-2" 
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Sign in with Gmail
          </Button>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account? <Link href="/auth/register" className="text-primary hover:underline">Register</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}