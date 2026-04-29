import { Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t py-6 bg-background">
      <div className="container flex flex-col items-center gap-4 text-center text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Mail size={16} />
          <a href="mailto:Infijium@gmail.com" className="hover:text-foreground transition-colors">
            Infijium@gmail.com
          </a>
        </div>
        <p>© {new Date().getFullYear()} GigaStudio Video Platform</p>
      </div>
    </footer>
  );
}