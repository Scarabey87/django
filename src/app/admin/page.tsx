"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Video } from "@/components/video-card";
import { Creator } from "@/components/creator-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Key, Users, Video as VideoIcon, Copy, CheckCircle2, Upload, AlertCircle, Shield, Save, RectangleHorizontal, Pencil, Code, User as UserIcon, BarChart2, RotateCcw, Settings, Clock } from "lucide-react";
import { db, User } from "@/lib/mock-db";
import { uploadVideo } from "@/app/actions/upload-video";

const POLL_STORAGE_KEY = "live_ai_poll";
const SETTINGS_STORAGE_KEY = "live_ai_settings";
const PROMO_CODES_STORAGE_KEY = "live_ai_promo_codes";

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

// Updated Promo Code Interface
interface PromoCode {
  id: string;
  code: string;
  durationDays: number; // Duration of VIP access after redemption
  isActive: boolean;
  validUntil?: number; // Timestamp when the code itself expires
}

export default function AdminPage() {
  const router = useRouter();
  const session = db.getSession();

  useEffect(() => {
    if (!session || session.role !== "admin") {
      router.push("/");
    }
  }, [session, router]);

  // Video State
  const [videos, setVideos] = useState<Video[]>([]);
  const [newVideo, setNewVideo] = useState<Partial<Video & { file: File | null }>>({ title: "", author: "", thumbnail: "", isVip: false, videoUrl: "", file: null });
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState("");

  // Creator State
  const [creators, setCreators] = useState<Creator[]>([]);
  const [newCreator, setNewCreator] = useState<Partial<Creator>>({ name: "", avatar: "" });
  const [isCreatorDialogOpen, setIsCreatorDialogOpen] = useState(false);

  // Promo Code State
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newCodeDuration, setNewCodeDuration] = useState(1);
  const [newCodeValidity, setNewCodeValidity] = useState(30); // Default validity: 30 days
  const [isCodeDialogOpen, setIsCodeDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Ads State
  const [ads, setAds] = useState<Ad[]>([]);
  const [newAd, setNewAd] = useState<Partial<Ad>>({ imageUrl: "", linkUrl: "", htmlContent: "" });
  const [isAdDialogOpen, setIsAdDialogOpen] = useState(false);

  // Users State
  const [users, setUsers] = useState<User[]>([]);
  const [unsavedRoleChanges, setUnsavedRoleChanges] = useState(false);
  
  // Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");

  // Polls State
  const [polls, setPolls] = useState<PollOption[]>([]);

  // Settings State
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    supportEmail: "Infijium@gmail.com",
    transferDetails: {
      yoomoney: "4100119509404270",
      card: "5599 0021 3482 6538"
    }
  });

  // Initialize Data
  useEffect(() => {
    // Load Videos from DB
    setVideos(db.getVideos());
    
    // Load Creators from localStorage
    const savedCreators = localStorage.getItem("live_ai_creators");
    if (savedCreators) {
      setCreators(JSON.parse(savedCreators));
    } else {
      // Seed initial data if empty
      setCreators([
        { id: "1", name: "travel_mike", avatar: "https://i.pravatar.cc/150?u=1", views: 12500, likes: 3400, isLiked: false },
        { id: "2", name: "dance_queen", avatar: "https://i.pravatar.cc/150?u=2", views: 45200, likes: 12000, isLiked: true },
      ]);
    }

    // Load Promo Codes & Clean up expired ones
    const savedCodesRaw = localStorage.getItem(PROMO_CODES_STORAGE_KEY);
    if (savedCodesRaw) {
      try {
        const parsedCodes: PromoCode[] = JSON.parse(savedCodesRaw);
        const now = Date.now();
        // Filter: Keep if active AND (no expiry set OR expiry is in future)
        const activeCodes = parsedCodes.filter(
          (c) => c.isActive && (!c.validUntil || c.validUntil > now)
        );
        
        // If any codes were removed, update storage immediately
        if (activeCodes.length !== parsedCodes.length) {
          localStorage.setItem(PROMO_CODES_STORAGE_KEY, JSON.stringify(activeCodes));
        }
        
        // If empty, seed some defaults
        if (activeCodes.length === 0) {
           const defaults: PromoCode[] = [
            { 
              id: "1", 
              code: "WELCOME2024", 
              durationDays: 1, 
              isActive: true,
              validUntil: Date.now() + (365 * 24 * 60 * 60 * 1000) // Valid for 1 year
            },
            { 
              id: "2", 
              code: "TRYVIP", 
              durationDays: 7, 
              isActive: false,
              validUntil: Date.now() + (365 * 24 * 60 * 60 * 1000)
            },
          ];
          setCodes(defaults);
          localStorage.setItem(PROMO_CODES_STORAGE_KEY, JSON.stringify(defaults));
        } else {
          setCodes(activeCodes);
        }
      } catch (e) {
        console.error("Failed to parse codes", e);
      }
    }

    // Load ads from localStorage
    const savedAds = localStorage.getItem("live_ai_ads");
    if (savedAds) {
      setAds(JSON.parse(savedAds));
    }

    setUsers(db.getUsers());

    // Load Polls (Read Only)
    const savedPolls = localStorage.getItem(POLL_STORAGE_KEY);
    if (savedPolls) {
      try {
        setPolls(JSON.parse(savedPolls));
      } catch (e) {
        console.error("Failed to parse polls", e);
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
  }, []);

  // Persist Creators
  useEffect(() => {
    localStorage.setItem("live_ai_creators", JSON.stringify(creators));
  }, [creators]);

  // Persist ads
  useEffect(() => {
    localStorage.setItem("live_ai_ads", JSON.stringify(ads));
  }, [ads]);

  // Video Actions
  const handleDeleteVideo = (id: string) => {
    db.deleteVideo(id);
    setVideos(db.getVideos());
  };

  const handleToggleVip = (id: string) => {
    const video = videos.find(v => v.id === id);
    if (video) {
      db.updateVideo(id, { isVip: !video.isVip });
      setVideos(db.getVideos());
    }
  };
  
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    setFormError(""); // Clear form error when interacting
    if (file) {
      if (file.size > 300 * 1024 * 1024) {
        setUploadError("File size exceeds 300MB limit.");
        setNewVideo({ ...newVideo, file: null, videoUrl: "" });
        return;
      }
      // We don't create blob URL anymore, we store the file object
      setNewVideo({ ...newVideo, file: file, videoUrl: "" }); 
    }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setUploadError("");

    if (!newVideo.title || !newVideo.author) {
      setFormError("Please fill in Title and select an Author.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    let finalVideoUrl = newVideo.videoUrl;

    // If there is a file, upload it
    if (newVideo.file) {
      const formData = new FormData();
      formData.append("file", newVideo.file);

      setUploadProgress(30);
      
      try {
        const result = await uploadVideo(formData);
        
        if (result.error) {
          setUploadError(result.error);
          setIsUploading(false);
          setUploadProgress(0);
          return;
        }

        finalVideoUrl = result.url;
        setUploadProgress(70);
      } catch (err) {
        setUploadError("Upload failed. Check server console.");
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }
    } else if (!finalVideoUrl) {
       setFormError("Please provide a Video URL or upload a file.");
       setIsUploading(false);
       setUploadProgress(0);
       return;
    }

    // Finalize saving
    setTimeout(() => {
      const video: Video = {
        id: Math.random().toString(36).substr(2, 9),
        title: newVideo.title!,
        author: newVideo.author!,
        thumbnail: newVideo.thumbnail || `https://picsum.photos/seed/${Math.random()}/300/533`,
        isVip: newVideo.isVip || false,
        videoUrl: finalVideoUrl,
        views: 0,
      };

      db.addVideo(video);
      setVideos(db.getVideos());
      
      setUploadProgress(100);
      
      setTimeout(() => {
        setIsUploading(false);
        setNewVideo({ title: "", author: "", thumbnail: "", isVip: false, videoUrl: "", file: null });
        setIsVideoDialogOpen(false);
        setUploadProgress(0);
        setFormError("");
      }, 500);
    }, 500);
  };

  // Creator Actions
  const handleDeleteCreator = (id: string) => setCreators(creators.filter((c) => c.id !== id));
  
  const handleCreatorFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewCreator({ ...newCreator, avatar: URL.createObjectURL(file) });
    }
  };

  const handleAddCreator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCreator.name) return;
    const creator: Creator = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCreator.name,
      avatar: newCreator.avatar || `https://i.pravatar.cc/150?u=${Date.now()}`,
      views: 0, likes: 0, isLiked: false,
    };
    setCreators([...creators, creator]);
    setNewCreator({ name: "", avatar: "" });
    setIsCreatorDialogOpen(false);
  };

  // Promo Code Actions
  const handleDeleteCode = (id: string) => setCodes(codes.filter((c) => c.id !== id));
  const handleToggleCode = (id: string) => setCodes(codes.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c)));
  
  const handleAddCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    
    const now = Date.now();
    // Calculate validUntil timestamp if validity days > 0, otherwise undefined (infinite)
    const validUntil = newCodeValidity > 0 
      ? now + (newCodeValidity * 24 * 60 * 60 * 1000) 
      : undefined;

    const newPromoCode: PromoCode = { 
      id: Math.random().toString(36).substr(2, 9), 
      code: newCode.toUpperCase(), 
      durationDays: newCodeDuration, 
      isActive: true,
      validUntil
    };
    
    setCodes([...codes, newPromoCode]);
    localStorage.setItem(PROMO_CODES_STORAGE_KEY, JSON.stringify([...codes, newPromoCode]));
    
    setNewCode("");
    setNewCodeDuration(1);
    setNewCodeValidity(30);
    setIsCodeDialogOpen(false);
  };

  const copyToClipboard = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Ad Actions
  const handleDeleteAd = (id: string) => setAds(ads.filter(a => a.id !== id));
  const handleAddAd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAd.htmlContent && !newAd.imageUrl) return;
    setAds([...ads, { id: Math.random().toString(36).substr(2, 9), imageUrl: newAd.imageUrl, linkUrl: newAd.linkUrl, htmlContent: newAd.htmlContent }]);
    setNewAd({ imageUrl: "", linkUrl: "", htmlContent: "" });
    setIsAdDialogOpen(false);
  };

  // User Actions
  const handleRoleChange = (userId: string, newRole: User["role"]) => {
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    setUnsavedRoleChanges(true);
  };

  const handleSaveRoles = () => {
    users.forEach(user => {
      const original = db.getUsers().find(u => u.id === user.id);
      if (original && original.role !== user.role) {
        db.updateUserRole(user.id, user.role);
      }
    });
    setUnsavedRoleChanges(false);
    alert("User roles updated successfully.");
  };

  // Edit User Actions
  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword(""); // Don't pre-fill password
    setIsEditUserDialogOpen(true);
  };

  const handleSaveUserDetails = () => {
    if (!editingUser) return;
    
    const updates: { name?: string; email?: string; password?: string } = {
      name: editName,
      email: editEmail,
    };
    if (editPassword.trim()) {
      updates.password = editPassword;
    }

    db.updateUser(editingUser.id, updates);
    
    // Update local state
    setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...updates } : u));
    setIsEditUserDialogOpen(false);
    setEditingUser(null);
  };

  // Poll Actions
  const handleResetPolls = () => {
    if(confirm("Are you sure you want to reset all poll votes?")) {
      const resetPolls = polls.map(p => ({ ...p, votes: 0 }));
      setPolls(resetPolls);
      // Explicitly save to localStorage when admin performs action
      localStorage.setItem(POLL_STORAGE_KEY, JSON.stringify(resetPolls));
    }
  };

  // Settings Actions
  const handleSaveSettings = () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(siteSettings));
    alert("Settings saved successfully.");
  };

  if (!session || session.role !== "admin") return null;

  const totalVotes = polls.reduce((acc, curr) => acc + curr.votes, 0);
  const maxVotes = Math.max(...polls.map(p => p.votes), 1);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage content, creators, and access</p>
        </div>

        <Tabs defaultValue="videos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-[850px]">
            <TabsTrigger value="videos" className="gap-2"><VideoIcon className="h-4 w-4" /> Videos</TabsTrigger>
            <TabsTrigger value="creators" className="gap-2"><Users className="h-4 w-4" /> Creators</TabsTrigger>
            <TabsTrigger value="codes" className="gap-2"><Key className="h-4 w-4" /> Codes</TabsTrigger>
            <TabsTrigger value="ads" className="gap-2"><RectangleHorizontal className="h-4 w-4" /> Ads</TabsTrigger>
            <TabsTrigger value="polls" className="gap-2"><BarChart2 className="h-4 w-4" /> Polls</TabsTrigger>
            <TabsTrigger value="users" className="gap-2"><Shield className="h-4 w-4" /> Users</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" /> Settings</TabsTrigger>
          </TabsList>

          {/* Videos Tab */}
          <TabsContent value="videos">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Video Management</h2>
              <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
                <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Add Video</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New Video</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddVideo} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="video-title">Title</Label>
                      <Input id="video-title" placeholder="Video Title" value={newVideo.title} onChange={e => { setNewVideo({...newVideo, title: e.target.value}); setFormError(""); }} disabled={isUploading} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="video-author">Author</Label>
                      <Select 
                        value={newVideo.author} 
                        onValueChange={(value) => { setNewVideo({...newVideo, author: value}); setFormError(""); }}
                        disabled={isUploading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a creator" />
                        </SelectTrigger>
                        <SelectContent>
                          {creators.map((creator) => (
                            <SelectItem key={creator.id} value={creator.name}>
                              {creator.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="video-thumbnail">Thumbnail URL</Label>
                      <Input id="video-thumbnail" placeholder="https://example.com/image.jpg" value={newVideo.thumbnail} onChange={e => setNewVideo({...newVideo, thumbnail: e.target.value})} disabled={isUploading} />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or upload file to /public/uploads</span></div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="video-file">Video File (Max 300MB)</Label>
                      <Input id="video-file" type="file" accept="video/*" onChange={handleVideoFileChange} className="cursor-pointer" disabled={isUploading} />
                      {uploadError && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{uploadError}</p>}
                    </div>

                    {isUploading && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Uploading...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">VIP Content</span>
                      <Switch checked={newVideo.isVip} onCheckedChange={c => setNewVideo({...newVideo, isVip: c})} disabled={isUploading} />
                    </div>

                    {formError && (
                       <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span>{formError}</span>
                      </div>
                    )}

                    <Button type="submit" className="w-full" disabled={isUploading}>
                      {isUploading ? (
                        <>
                           <Upload className="mr-2 h-4 w-4 animate-bounce" />
                           Uploading...
                        </>
                      ) : (
                        "Create Video"
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader><TableRow><TableHead>Thumb</TableHead><TableHead>Title</TableHead><TableHead>Author</TableHead><TableHead>Views</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {videos.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No videos.</TableCell></TableRow> :
                  videos.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell><div className="h-12 w-12 rounded bg-muted overflow-hidden">{v.thumbnail && <img src={v.thumbnail} className="w-full h-full object-cover" />}</div></TableCell>
                      <TableCell>{v.title}</TableCell>
                      <TableCell>@{v.author}</TableCell>
                      <TableCell>{v.views}</TableCell>
                      <TableCell><Switch checked={v.isVip} onCheckedChange={() => handleToggleVip(v.id)} /> {v.isVip && <Badge variant="secondary" className="ml-2">VIP</Badge>}</TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleDeleteVideo(v.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Creators Tab */}
          <TabsContent value="creators">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Creator Management</h2>
              <Dialog open={isCreatorDialogOpen} onOpenChange={setIsCreatorDialogOpen}>
                <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Add Creator</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New Creator</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddCreator} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="creator-name">Name</Label>
                      <Input id="creator-name" placeholder="Name (e.g. john_doe)" value={newCreator.name} onChange={e => setNewCreator({...newCreator, name: e.target.value})} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="creator-avatar">Avatar</Label>
                      <div className="flex items-center gap-4">
                        {newCreator.avatar && (
                          <Avatar className="h-12 w-12 border">
                            <AvatarImage src={newCreator.avatar} />
                            <AvatarFallback><UserIcon className="h-6 w-6"/></AvatarFallback>
                          </Avatar>
                        )}
                        <Input id="creator-avatar" type="file" accept="image/*" onChange={handleCreatorFileChange} className="cursor-pointer" />
                      </div>
                    </div>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or paste URL</span></div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="creator-avatar-url">Avatar URL</Label>
                      <Input id="creator-avatar-url" placeholder="https://example.com/avatar.jpg" value={newCreator.avatar} onChange={e => setNewCreator({...newCreator, avatar: e.target.value})} />
                    </div>

                    <Button type="submit" className="w-full">Create Creator</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader><TableRow><TableHead>Avatar</TableHead><TableHead>Name</TableHead><TableHead>Stats</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {creators.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No creators.</TableCell></TableRow> :
                  creators.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell><Avatar className="h-10 w-10"><AvatarImage src={c.avatar} /><AvatarFallback>{c.name.charAt(0)}</AvatarFallback></Avatar></TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell><div className="text-xs text-muted-foreground"><p>{c.views} views</p><p>{c.likes} likes</p></div></TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleDeleteCreator(c.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Promo Codes Tab */}
          <TabsContent value="codes">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Access Codes</h2>
              <Dialog open={isCodeDialogOpen} onOpenChange={setIsCodeDialogOpen}>
                <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Generate Code</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Generate Promo Code</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddCode} className="space-y-4">
                    <Input placeholder="Enter code text" value={newCode} onChange={e => setNewCode(e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Duration (Days)</label>
                        <Input type="number" min="1" value={newCodeDuration} onChange={e => setNewCodeDuration(Number(e.target.value))} />
                        <p className="text-xs text-muted-foreground">VIP access length</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Validity (Days)</label>
                        <Input type="number" min="0" value={newCodeValidity} onChange={e => setNewCodeValidity(Number(e.target.value))} />
                        <p className="text-xs text-muted-foreground">Code lifespan (0 = infinite)</p>
                      </div>
                    </div>
                    <Button type="submit" className="w-full">Create Code</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {codes.map((code) => (
                <div key={code.id} className="rounded-lg border bg-card p-4 flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{code.code}</p>
                      <p className="text-xs text-muted-foreground">VIP Access: {code.durationDays} day(s)</p>
                      <p className="text-xs text-muted-foreground">Status: {code.isActive ? "Active" : "Inactive"}</p>
                      {code.validUntil && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expires: {new Date(code.validUntil).toLocaleDateString()}
                        </p>
                      )}
                      {!code.validUntil && (
                        <p className="text-xs text-green-600 font-medium">Infinite validity</p>
                      )}
                    </div>
                    <Switch checked={code.isActive} onCheckedChange={() => handleToggleCode(code.id)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => copyToClipboard(code.id, code.code)}>
                      {copiedId === code.id ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                      {copiedId === code.id ? "Copied!" : "Copy"}
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDeleteCode(code.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              {codes.length === 0 && <div className="col-span-full text-center py-10 text-muted-foreground border rounded-lg bg-card">No promo codes generated yet.</div>}
            </div>
          </TabsContent>

          {/* Ads Tab */}
          <TabsContent value="ads">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Advertisement Management</h2>
              <Dialog open={isAdDialogOpen} onOpenChange={setIsAdDialogOpen}>
                <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Add Ad Block</Button></DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>Add New Advertisement</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddAd} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="htmlContent">HTML Code (Custom Widget/Script)</Label>
                      <Textarea 
                        id="htmlContent" 
                        placeholder="<script>... or <iframe>..." 
                        value={newAd.htmlContent} 
                        onChange={e => setNewAd({...newAd, htmlContent: e.target.value})}
                        className="font-mono text-xs min-h-[150px]"
                      />
                      <p className="text-xs text-muted-foreground">If HTML is provided, it will be used instead of the Image/Link fields below.</p>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or Image Banner</span></div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="imageUrl">Image URL</Label>
                      <Input id="imageUrl" placeholder="https://example.com/ad-image.jpg" value={newAd.imageUrl} onChange={e => setNewAd({...newAd, imageUrl: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="linkUrl">Target Link</Label>
                      <Input id="linkUrl" placeholder="https://example.com" value={newAd.linkUrl} onChange={e => setNewAd({...newAd, linkUrl: e.target.value})} />
                    </div>
                    <Button type="submit" className="w-full">Add Advertisement</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ads.map((ad) => (
                <div key={ad.id} className="rounded-lg border bg-card p-4 flex flex-col gap-4 relative overflow-hidden group">
                  {ad.htmlContent ? (
                    <div className="aspect-video w-full rounded bg-muted overflow-hidden relative p-2">
                       <div className="h-full w-full overflow-hidden">
                        <Badge className="absolute top-2 right-2 z-10"><Code className="h-3 w-3 mr-1"/>HTML</Badge>
                        <div dangerouslySetInnerHTML={{ __html: ad.htmlContent }} className="transform scale-50 origin-top-left w-[200%] h-[200%]" />
                       </div>
                    </div>
                  ) : ad.imageUrl ? (
                    <div className="aspect-video w-full rounded bg-muted overflow-hidden relative">
                      <img src={ad.imageUrl} alt="Ad" className="w-full h-full object-cover" />
                      <a href={ad.linkUrl} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="bg-white/90 text-black text-xs font-bold px-2 py-1 rounded">Visit Link</span>
                      </a>
                    </div>
                  ) : (
                    <div className="aspect-video w-full rounded bg-muted flex items-center justify-center text-muted-foreground text-sm">
                      Empty Ad
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start mt-auto">
                    <div className="text-xs text-muted-foreground break-all flex-1 mr-2">
                      {ad.htmlContent ? (
                         <p className="font-medium text-foreground">Custom HTML Content</p>
                      ) : (
                        <p className="font-medium text-foreground mb-1">{ad.linkUrl}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 shrink-0" onClick={() => handleDeleteAd(ad.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              {ads.length === 0 && <div className="col-span-full text-center py-10 text-muted-foreground border rounded-lg bg-card">No active advertisements.</div>}
            </div>
          </TabsContent>

          {/* Polls Tab */}
          <TabsContent value="polls">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Poll Results</h2>
              <Button variant="outline" onClick={handleResetPolls} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset Votes
              </Button>
            </div>
            
            <div className="rounded-md border bg-card p-6 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Votes</p>
                  <p className="text-3xl font-bold">{totalVotes}</p>
                </div>
                <div className="h-px flex-1 bg-border mx-6" />
                <div className="text-right">
                   <p className="text-sm font-medium text-muted-foreground">Options</p>
                   <p className="text-3xl font-bold">{polls.length}</p>
                </div>
              </div>

              <div className="space-y-4">
                {polls.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No poll data available.</p>
                ) : (
                  [...polls]
                    .sort((a, b) => b.votes - a.votes)
                    .map((option) => {
                      const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                      const relativeWidth = Math.max((option.votes / maxVotes) * 100, 2); // Min 2% for visibility
                      
                      return (
                        <div key={option.id} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{option.label}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground">{option.votes} votes</span>
                              <span className="font-bold w-12 text-right">{percentage}%</span>
                            </div>
                          </div>
                          <Progress value={relativeWidth} className="h-3" />
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">User Management</h2>
              <Button onClick={handleSaveRoles} disabled={!unsavedRoleChanges} className="gap-2">
                <Save className="h-4 w-4" />
                Save Roles
              </Button>
            </div>
            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8"><AvatarImage src={user.avatar} /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Select value={user.role} onValueChange={(val: "user" | "admin" | "vip") => handleRoleChange(user.id, val)}>
                          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="vip">VIP</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold mb-6">Site Settings</h2>
              <div className="space-y-6 rounded-lg border bg-card p-6">
                <div className="space-y-2">
                  <Label htmlFor="support-email">Support Email</Label>
                  <Input 
                    id="support-email" 
                    type="email" 
                    value={siteSettings.supportEmail} 
                    onChange={(e) => setSiteSettings({...siteSettings, supportEmail: e.target.value})} 
                  />
                  <p className="text-xs text-muted-foreground">Email address where user support messages and notifications are sent.</p>
                </div>
                
                <div className="h-px bg-border" />

                <div className="space-y-2">
                  <Label htmlFor="yoomoney-number">YooMoney Account Number</Label>
                  <Input 
                    id="yoomoney-number" 
                    value={siteSettings.transferDetails.yoomoney} 
                    onChange={(e) => setSiteSettings({...siteSettings, transferDetails: {...siteSettings.transferDetails, yoomoney: e.target.value}})} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="card-number">Card Number (YooMoney)</Label>
                  <Input 
                    id="card-number" 
                    value={siteSettings.transferDetails.card} 
                    onChange={(e) => setSiteSettings({...siteSettings, transferDetails: {...siteSettings.transferDetails, card: e.target.value}})} 
                  />
                </div>

                <div className="pt-4">
                  <Button onClick={handleSaveSettings} className="gap-2">
                    <Save className="h-4 w-4" />
                    Save Settings
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit User Dialog */}
        <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">New Password (leave empty to keep current)</Label>
                <Input id="password" type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditUserDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveUserDetails}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}