"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Lock, CreditCard, X, Check, AlertCircle } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VideoCard, { Video } from "@/components/video-card";
import CreatorCard, { Creator } from "@/components/creator-card";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { db } from "@/lib/mock-db";

export default function CreatorPage() {
  const params = useParams();
  const router = useRouter();
  const creatorId = params.id as string;
  
  // State for data
  const [creators, setCreators] = useState<Creator[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [mounted, setMounted] = useState(false);
  
  // Find current creator
  const creatorInfo = creators.find(c => c.id === creatorId);
  
  // Filter videos for this creator
  const creatorVideos = videos.filter(v => v.author === creatorInfo?.name);

  // VIP State (Synced with localStorage to match main app)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isVipUnlocked, setIsVipUnlocked] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // Load Data on Mount
  useEffect(() => {
    setMounted(true);
    
    // Load Creators from localStorage
    const savedCreators = localStorage.getItem("live_ai_creators");
    if (savedCreators) {
      try {
        setCreators(JSON.parse(savedCreators));
      } catch (e) {
        console.error("Failed to parse creators", e);
      }
    }

    // Load Videos from DB
    setVideos(db.getVideos());

    // Check VIP Status from localStorage
    const savedExpiry = localStorage.getItem("vipAccessExpiry");
    if (savedExpiry) {
      const expiryDate = parseInt(savedExpiry, 10);
      if (Date.now() < expiryDate) {
        setIsVipUnlocked(true);
      } else {
        localStorage.removeItem("vipAccessExpiry");
      }
    }
  }, []);

  const handleCardClick = (video: Video) => setSelectedVideo(video);
  
  const handleCloseModal = () => { 
    setSelectedVideo(null); 
    setPaymentSuccess(false); 
    setPromoCode(""); 
    setPaymentError("");
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError("");

    if (!promoCode.trim()) {
      setPaymentError("Введите код доступа.");
      return;
    }

    const savedCodes = localStorage.getItem("live_ai_promo_codes");
    const validCodes = savedCodes ? JSON.parse(savedCodes) : [];
    const validCode = validCodes.find((c: any) => c.code === promoCode.toUpperCase() && c.isActive);

    if (validCode) {
      setPaymentSuccess(true);
      const durationMs = validCode.durationDays * 24 * 60 * 60 * 1000; 
      const expiry = Date.now() + durationMs;
      setTimeout(() => {
        localStorage.setItem("vipAccessExpiry", expiry.toString());
        setIsVipUnlocked(true);
        handleCloseModal();
      }, 1500);
    } else {
      setPaymentError("Неверный код доступа.");
    }
  };

  // Hydration guard
  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!creatorInfo) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <Header />
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Creator not found</h1>
        <p className="text-muted-foreground">The profile you are looking for does not exist.</p>
        <Button onClick={() => router.push("/")}>Go Home</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6 gap-2 pl-0"><ArrowLeft className="h-4 w-4" /> Back</Button>
        <div className="flex items-end gap-6 mb-10 pb-6 border-b">
          <div className="h-32 w-32 rounded-full p-1 bg-gradient-to-tr from-pink-500 to-violet-500">
            <img src={creatorInfo.avatar} alt={creatorInfo.name} className="h-full w-full rounded-full object-cover border-4 border-background" />
          </div>
          <div className="flex-1 pb-2">
            <h1 className="text-4xl font-bold mb-1">@{creatorInfo.name}</h1>
            <p className="text-muted-foreground">Content Creator • {creatorVideos.length} Videos</p>
          </div>
          <div className="pb-4"><Button size="lg" className="rounded-full px-8">Follow</Button></div>
        </div>
        {creatorVideos.length > 0 ? (
          <div>
            <h2 className="text-2xl font-bold mb-6">Videos</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {creatorVideos.map((video) => (
                <VideoCard key={video.id} video={video} onClick={handleCardClick} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground border border-dashed rounded-lg">
            <p>No videos available for this creator yet.</p>
          </div>
        )}
      </main>
      <Footer />
      
      {/* Video Modal */}
      {selectedVideo && (
        <Dialog open={!!selectedVideo} onOpenChange={handleCloseModal}>
          <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-black border-white/10">
            <button onClick={handleCloseModal} className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"><X size={20} /></button>
            {selectedVideo.isVip && !isVipUnlocked ? (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 bg-background h-[500px]">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"><Lock className="h-8 w-8 text-primary" /></div>
                <div>
                  <h2 className="text-2xl font-bold">Unlock Premium Content</h2>
                  <p className="text-muted-foreground mt-2">Для получения кода доступа переведите 350р на (ЮMoney) 4100119509404270 или на карту (ЮMoney) 5599 0021 3482 6538. Сделайте скриншот перевода с датой и перешлите на Infijium@gmail.com. Вам придет код доступа на 5 дней.</p>
                </div>
                {paymentSuccess ? (
                  <div className="flex flex-col items-center text-green-600"><Check size={48} className="mb-2" /><p className="font-medium">Access Granted!</p></div>
                ) : (
                  <form onSubmit={handlePaymentSubmit} className="w-full max-w-sm space-y-4">
                    {paymentError && (
                      <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4" />
                        {paymentError}
                      </div>
                    )}
                    <Input type="text" placeholder="Enter promo code" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} className="text-center uppercase" />
                    <Button type="submit" className="w-full" size="lg"><CreditCard className="mr-2 h-4 w-4" />Unlock Now</Button>
                  </form>
                )}
              </div>
            ) : (
              <div className="relative bg-black aspect-[9/16] w-full">
                <video key={selectedVideo.id} autoPlay muted playsInline controls className="h-full w-full object-contain" poster={selectedVideo.thumbnail}>
                  <source src={selectedVideo.videoUrl} type="video/mp4" />
                </video>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}