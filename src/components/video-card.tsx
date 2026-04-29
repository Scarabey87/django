"use client";

import { Lock, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Video {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  isVip: boolean;
  videoUrl: string;
}

interface VideoCardProps {
  video: Video;
  onClick: (video: Video) => void;
}

export default function VideoCard({ video, onClick }: VideoCardProps) {
  return (
    <div
      className="group relative aspect-[9/16] w-full overflow-hidden rounded-lg bg-muted cursor-pointer transition-transform hover:scale-[1.02]"
      onClick={() => onClick(video)}
    >
      {/* Thumbnail Image */}
      <div
        className={cn(
          "absolute inset-0 bg-cover bg-center transition-all duration-300",
          video.isVip && "group-hover:blur-[15px] group-hover:scale-110"
        )}
        style={{ backgroundImage: `url(${video.thumbnail})` }}
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/20 transition-opacity group-hover:bg-black/10" />

      {/* VIP Badge */}
      {video.isVip && (
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <Lock size={12} />
          <span>VIP</span>
        </div>
      )}

      {/* Play Button */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white">
          <Play className="ml-1" size={24} fill="currentColor" />
        </div>
      </div>

      {/* Video Info (Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
        <h3 className="text-sm font-semibold text-white line-clamp-1">{video.title}</h3>
        <p className="text-xs text-gray-300">@{video.author}</p>
      </div>
    </div>
  );
}