"use client";

import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CreditCard, X, Check, ArrowUpDown, Clock, Crown, Heart, Info, AlertCircle, Plus, HeartHandshake, MessageSquare } from "lucide-react";
import VideoCard, { Video } from "@/components/video-card";
import CreatorCard, { Creator } from "@/components/creator-card";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { db } from "@/lib/mock-db";

// Mock Creators will be replaced by localStorage data
const mockCreators: Creator[] = [];

type SortOption = "date" | "name" | "likes";

interface Ad {
  id: string;
  imageUrl?: string;
  linkUrl?: string;
  htmlContent?: string;
}

interface PollOption {
  id: string;
  label: string;
  votes: number;
}

interface SiteSettings {
  supportEmail: string;
  transferDetails: {
    yoomoney: string;
    card: string;
  };
}

const POLL_STORAGE_KEY = "live_ai_poll";
const SETTINGS_STORAGE_KEY = "live_ai_settings";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isVipUnlocked, setIsVipUnlocked] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [creators, setCreators] = useState<Creator[]>(mockCreators);
  const [sortBy, setSortBy] = useState<SortOption>("likes");
  const [ads, setAds] = useState<Ad[]>([]);
  const [session, setSession] = useState(db.getSession());
  
  // Video State (Loaded from DB)
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  
  // Poll State
  const defaultPollOptions: PollOption[] = [
    { id: "realistic", label: "Фотореализм", votes: 12 },
    { id: "anime", label: "Аниме стиль", votes: 8 },
    { id: "cyberpunk", label: "Киберпанк", votes: 5 },
    { id: "retro", label: "Ретро стиль", votes: 3 },
  ];
  const [pollOptions, setPollOptions] = useState<PollOption[]>(defaultPollOptions);
  const [selectedPollOption, setSelectedPollOption] = useState("");
  const [customTag, setCustomTag] = useState("");
  const [hasVoted, setHasVoted] = useState(false);
  
  // Support Dialog State
  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);

  // Contact Dialog State
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [contactSender, setContactSender] = useState("");
  const [isContactSending, setIsContactSending] = useState(false);

  // Settings State
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    supportEmail: "Infijium@gmail.com",
    transferDetails: {
      yoomoney: "4100119509404270",
      card: "5599 0021 3482 6538"
    }
  });

  // Timer State
  const [accessExpiry, setAccessExpiry] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Handle mounting to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    setSession(db.getSession());
    setAllVideos(db.getVideos()); // Load videos from DB
    
    // Load Creators from localStorage
    const savedCreators = localStorage.getItem("live_ai_creators");
    if (savedCreators) {
      try {
        setCreators(JSON.parse(savedCreators));
      } catch (e) {
        console.error("Failed to parse creators", e);
      }
    }
    
    // Load Poll Data
    const savedPoll = localStorage.getItem(POLL_STORAGE_KEY);
    if (savedPoll) {
      try {
        setPollOptions(JSON.parse(savedPoll));
      } catch (e) {
        console.error("Failed to parse poll data", e);
      }
    }
    
    // Load Settings
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (savedSettings) {
      try {
        setSiteSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    
    // VIP Expiry
    const savedExpiry = localStorage.getItem("vipAccessExpiry");
    if (savedExpiry) {
      const expiryDate = parseInt(savedExpiry, 10);
      if (Date.now() < expiryDate) {
        setAccessExpiry(expiryDate);
        setIsVipUnlocked(true);
      } else {
        localStorage.removeItem("vipAccessExpiry");
      }
    }
    
    // Load Ads
    const savedAds = localStorage.getItem("live_ai_ads");
    if (savedAds) {
      try {
        setAds(JSON.parse(savedAds));
      } catch (e) {
        console.error("Failed to parse ads", e);
      }
    }

    // Check Poll Vote
    const currentSession = db.getSession();
    const savedVote = localStorage.getItem(`poll_vote_${currentSession?.id}`);
    if (savedVote) {
      setHasVoted(true);
      setSelectedPollOption(savedVote);
    }
  }, []);

  // Persist Poll Data to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(POLL_STORAGE_KEY, JSON.stringify(pollOptions));
    }
  }, [pollOptions, mounted]);

  // Timer Interval
  useEffect(() => {
    if (!accessExpiry) return;
    const calculateTimeLeft = () => {
      const now = Date.now();
      const difference = accessExpiry - now;
      if (difference <= 0) {
        localStorage.removeItem("vipAccessExpiry");
        setIsVipUnlocked(false);
        setAccessExpiry(null);
        setTimeLeft("");
        window.location.reload();
        return;
      }
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [accessExpiry]);

  const handleCardClick = (video: Video) => {
    db.incrementVideoViews(video.id); // Increment view count
    setAllVideos(db.getVideos()); // Refresh state to get new view count
    setSelectedVideo(video);
  };
  
  const handleCreatorClick = (creator: Creator) => { window.location.href = `/creator/${creator.id}`; };
  const handleLike = (id: string) => {
    setCreators(prev => prev.map(c => {
      if (c.id === id) return { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 };
      return c;
    }));
  };

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
        setAccessExpiry(expiry);
        setIsVipUnlocked(true);
        handleCloseModal();
      }, 1500);
    } else {
      setPaymentError("Неверный код доступа.");
    }
  };

  const handlePollSubmit = () => {
    if (!session) {
      alert("Пожалуйста, войдите в аккаунт, чтобы участвовать в опросе.");
      return;
    }

    let finalOptionId = selectedPollOption;

    // If custom tag is entered, prioritize it
    if (customTag.trim()) {
      const newId = `custom_${Date.now()}`;
      setPollOptions(prev => [...prev, { id: newId, label: customTag.trim(), votes: 1 }]);
      finalOptionId = newId;
      setCustomTag(""); // Clear input
      setHasVoted(true);
      localStorage.setItem(`poll_vote_${session.id}`, newId);
    } else if (selectedPollOption) {
      // Vote for existing
      setPollOptions(prev => prev.map(opt => 
        opt.id === selectedPollOption ? { ...opt, votes: opt.votes + 1 } : opt
      ));
      setHasVoted(true);
      localStorage.setItem(`poll_vote_${session.id}`, selectedPollOption);
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMessage.trim() || !contactSender.trim()) return;
    
    setIsContactSending(true);
    // Simulate network request
    setTimeout(() => {
      // In a real app, this would be an API call.
      // Opening mail client as a fallback/fallback action:
      window.location.href = `mailto:${siteSettings.supportEmail}?subject=Сообщение от пользователя&body=От: ${contactSender}%0D%0A%0D%0A${contactMessage}`;
      
      setIsContactSending(false);
      setContactMessage("");
      setContactSender("");
      setIsContactDialogOpen(false);
      alert("Спасибо! Ваше сообщение отправлено.");
    }, 1000);
  };

  const sortedCreators = useMemo(() => {
    const sorted = [...creators];
    switch (sortBy) {
      case "date": 
        return sorted.reverse();
      case "name": 
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "likes":
        return sorted.sort((a, b) => {
          const aLiked = a.isLiked ? 1 : 0;
          const bLiked = b.isLiked ? 1 : 0;
          if (aLiked !== bLiked) return bLiked - aLiked;
          return a.name.localeCompare(b.name);
        });
      default: 
        return sorted;
    }
  }, [creators, sortBy]);

  // Sort videos by views desc and take top 5
  const trendingVideos = [...allVideos]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  // Prevent rendering until mounted to avoid Hydration Mismatch
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      {isVipUnlocked && timeLeft && (
        <div className="bg-primary text-primary-foreground py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2 sticky top-[57px] z-30">
          <Crown className="h-4 w-4" />
          <span>VIP Access Active: Time remaining </span>
          <span className="bg-primary-foreground/20 px-2 py-0.5 rounded text-white flex items-center gap-1">
             <Clock className="h-3 w-3" /> {timeLeft}
          </span>
        </div>
      )}

      <div className="container mx-auto mt-6 mb-6 max-w-[1400px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Support Block */}
          <div 
            className="rounded-lg border bg-card p-3 shadow-sm flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setIsSupportDialogOpen(true)}
          >
            <div className="flex items-center gap-2">
              <HeartHandshake className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Поддержать</span>
            </div>
          </div>

          {/* Poll Block */}
          <div className="rounded-lg border bg-card p-3 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <Heart className="h-4 w-4 text-pink-500 shrink-0" />
              <span className="text-sm font-medium whitespace-nowrap truncate">Предложите тег для оживления</span>
            </div>
            
            {hasVoted ? (
              <div className="text-xs text-muted-foreground truncate">
                Вы проголосовали
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handlePollSubmit(); }} className="flex items-center gap-2 w-full max-w-[120px]">
                <Input 
                  type="text" 
                  placeholder="Тег" 
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  disabled={!session}
                  className="h-7 text-xs px-2"
                />
                <Button type="submit" size="sm" className="h-7 w-7 p-0 shrink-0" disabled={!session}>
                  <Plus className="h-3 w-3" />
                </Button>
              </form>
            )}
          </div>

          {/* Contact Developers Block */}
          <div 
            className="rounded-lg border bg-card p-3 shadow-sm flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setIsContactDialogOpen(true)}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">Написать разработчикам</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Layout: Main Content (5 cols) + Sidebar (Ads) */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full p-4 lg:p-8 grid lg:grid-cols-[5fr_1fr] gap-8">
        <div className="space-y-12">
          <section>
            <div className="mb-8">
              <h1 className="text-4xl font-bold tracking-tight mb-2">В тренде</h1>
              <p className="text-muted-foreground">Discover the best video content from our creators</p>
            </div>
            {/* Grid: Top 5 Trending Videos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {trendingVideos.map((video) => (
                <VideoCard key={video.id} video={video} onClick={handleCardClick} />
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold tracking-tight">Popular Creators</h2>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="likes">
                      <div className="flex items-center gap-2">
                        <Heart className="h-3 w-3" />
                        My Likes
                      </div>
                    </SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                    <SelectItem value="date">Newest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {sortedCreators.map((creator) => (
                <CreatorCard key={creator.id} creator={creator} onClick={handleCreatorClick} onLike={handleLike} />
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar: Multiple Vertical Ads */}
        {ads.length > 0 && (
          <aside className="hidden lg:flex flex-col gap-6">
            <div className="sticky top-24 space-y-6">
              {ads.map((ad) => (
                <div key={ad.id} className="w-full">
                  {ad.htmlContent ? (
                    <div dangerouslySetInnerHTML={{ __html: ad.htmlContent }} />
                  ) : ad.imageUrl ? (
                    <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="block group">
                      <div className="rounded-lg overflow-hidden border bg-muted/20 hover:border-primary/50 transition-colors">
                        <img src={ad.imageUrl} alt="Advertisement" className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </aside>
        )}
      </main>

      <Footer />

      {/* Support Dialog */}
      <Dialog open={isSupportDialogOpen} onOpenChange={setIsSupportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Поддержка проекта</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Если хотите поддержать проект или поучаствовать в проекте сделайте перевод на (ЮMoney) {siteSettings.transferDetails.yoomoney} или на карту (ЮMoney) {siteSettings.transferDetails.card}. Сделайте скриншот с переводом и отправьте на <a href={`mailto:${siteSettings.supportEmail}`} className="text-primary hover:underline">{siteSettings.supportEmail}</a>. В теме письма укажите "Поддержка проекта". Мы с вами свяжемся.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Developers Dialog */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Написать разработчикам</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleContactSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sender">Ваше имя / Email</Label>
              <Input 
                id="sender" 
                placeholder="name@example.com" 
                value={contactSender} 
                onChange={(e) => setContactSender(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Сообщение</Label>
              <Textarea 
                id="message" 
                placeholder="Напишите ваше сообщение здесь..." 
                className="min-h-[120px]" 
                value={contactMessage} 
                onChange={(e) => setContactMessage(e.target.value)} 
                required 
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Сообщение будет отправлено на: {siteSettings.supportEmail}
            </p>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isContactSending}>
                {isContactSending ? "Отправка..." : "Отправить"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Video Modal */}
      {selectedVideo && (
        <Dialog open={!!selectedVideo} onOpenChange={handleCloseModal}>
          <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-black border-white/10">
            <button onClick={handleCloseModal} className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors">
              <X size={20} />
            </button>
            {selectedVideo.isVip && !isVipUnlocked ? (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 bg-background h-[500px]">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"><Lock className="h-8 w-8 text-primary" /></div>
                <div>
                  <h2 className="text-2xl font-bold">Unlock Premium Content</h2>
                  <p className="text-muted-foreground mt-2">Для получения кода доступа переведите 350р на (ЮMoney) {siteSettings.transferDetails.yoomoney} или на карту (ЮMoney) {siteSettings.transferDetails.card}. Сделайте скриншот перевода с датой и перешлите на {siteSettings.supportEmail}. Вам придет код доступа на 5 дней.</p>
                </div>
                {paymentSuccess ? (
                  <div className="flex flex-col items-center text-green-600 animate-in fade-in zoom-in duration-300">
                    <Check size={48} className="mb-2" /><p className="font-medium">Access Granted!</p>
                  </div>
                ) : (
                  <form onSubmit={handlePaymentSubmit} className="w-full max-w-sm space-y-4">
                    {paymentError && (
                      <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4" />
                        {paymentError}
                      </div>
                    )}
                    <div className="space-y-2">
                      <Input 
                        type="text" 
                        placeholder="Введите код доступа" 
                        value={promoCode} 
                        onChange={(e) => setPromoCode(e.target.value)} 
                        className="text-center uppercase" 
                      />
                    </div>
                    <Button type="submit" className="w-full" size="lg"><CreditCard className="mr-2 h-4 w-4" />Разблокировать</Button>
                    <p className="text-xs text-muted-foreground">Нужна помощь? Напишите нам на <span className="text-primary">{siteSettings.supportEmail}</span></p>
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