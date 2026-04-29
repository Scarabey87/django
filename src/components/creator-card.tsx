"use client";

import { User, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Creator {
  id: string;
  name: string;
  avatar: string;
  views: number;
  likes: number;
  isLiked: boolean;
}

interface CreatorCardProps {
  creator: Creator;
  onClick: (creator: Creator) => void;
  onLike: (id: string) => void;
}

// Helper to format numbers (e.g., 1200 -> 1.2K)
function formatViews(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

export default function CreatorCard({ creator, onClick, onLike }: CreatorCardProps) {
  return (
    <div
      className="group relative aspect-[9/16] w-full overflow-hidden rounded-lg bg-muted cursor-pointer transition-transform hover:scale-[1.02]"
      onClick={() => onClick(creator)}
    >
      {/* Background Image (Avatar stretched) */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-300 group-hover:scale-110"
        style={{ backgroundImage: `url(${creator.avatar})` }}
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/20 transition-opacity group-hover:bg-black/10" />

      {/* Center Profile Icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm border-2 border-white/20">
          <User className="h-10 w-10 text-white" />
        </div>
      </div>

      {/* Like Button (Top Right) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onLike(creator.id);
        }}
        className="absolute top-3 right-3 p-2 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-colors z-10"
      >
        <Heart
          className={cn(
            "h-5 w-5 transition-colors",
            creator.isLiked ? "fill-red-500 text-red-500" : "text-white"
          )}
        />
      </button>

      {/* Creator Info (Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10">
        <h3 className="text-sm font-semibold text-white line-clamp-1 text-center mb-1">{creator.name}</h3>
        <div className="flex items-center justify-center gap-2 text-xs text-gray-300">
          <span>{formatViews(creator.views)} views</span>
          <span>•</span>
          <span className={cn("flex items-center gap-1", creator.isLiked && "text-red-400")}>
            <Heart size={10} className={creator.isLiked ? "fill-current" : ""} />
            {formatViews(creator.likes)}
          </span>
        </div>
      </div>
    </div>
  );
}