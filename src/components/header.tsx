"use client";

import Link from "next/link";
import { LayoutDashboard, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { ColorThemeSelector } from "@/components/color-theme-selector";
import { db } from "@/lib/mock-db";
import { useRouter } from "next/navigation";

export default function Header() {
  const router = useRouter();
  const session = db.getSession();

  const handleLogout = () => {
    db.clearSession();
    router.push("/auth/login");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-gradient-x cursor-pointer transition-transform hover:scale-105">
            LIVE-AI.ART
          </span>
        </Link>
        
        <nav className="flex items-center gap-2">
          <ColorThemeSelector />
          <ModeToggle />
          {session ? (
            <>
              {session.role === "admin" && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline">Admin Panel</span>
                  </Button>
                </Link>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {session.name}
                </span>
                <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Login</span>
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}