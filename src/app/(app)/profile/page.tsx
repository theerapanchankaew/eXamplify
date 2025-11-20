'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Camera } from 'lucide-react';

const profileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters long.'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isWebcamDialogOpen, setWebcamDialogOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);


  const userDocRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc(userDocRef);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: '',
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        username: userProfile.username || '',
      });
    }
  }, [userProfile, form]);

  const handleUpdateProfile = async (data: ProfileFormData) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User not found or service unavailable.',
      });
      return;
    }

    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, { username: data.username });

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: data.username });
      }

      toast({
        title: 'Profile Updated',
        description: 'Your username has been updated successfully.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message,
      });
    }
  };

  const handleDialogOpenChange = async (open: boolean) => {
    setWebcamDialogOpen(open);
    if (open) {
      setCapturedImage(null);
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(mediaStream);
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings.',
        });
      }
    } else {
      // Stop the stream when the dialog is closed
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedImage(dataUrl);
    }
  };

  const handleSavePicture = async () => {
    if (!capturedImage || !auth.currentUser || !firestore) return;
  
    try {
      // The capturedImage is a base64 data URL, which is long.
      // For production, you'd upload this to Firebase Storage and get a URL.
      // For this example, we'll store the data URL directly in Auth and Firestore.
      await updateProfile(auth.currentUser, { photoURL: capturedImage });
  
      // Update Firestore document
      const userDocRef = doc(firestore, 'users', auth.currentUser.uid);
      await updateDoc(userDocRef, { photoURL: capturedImage });
  
      toast({
        title: 'Success',
        description: 'Your profile picture has been updated.',
      });
      handleDialogOpenChange(false); // This will also stop the camera stream
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message,
      });
    }
  };


  if (isUserLoading || isLoadingProfile) {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Profile</h1>
            <Card>
                <CardHeader>
                    <CardTitle>My Profile</CardTitle>
                    <CardDescription>View and manage your profile details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <div className="space-y-2">
                           <Skeleton className="h-6 w-40" />
                           <Skeleton className="h-4 w-60" />
                           <Skeleton className="h-5 w-20" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <Skeleton className="h-10 w-32" />
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!user) {
    return <div>Please log in to view your profile.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>
            View and manage your profile details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Dialog open={isWebcamDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <div className="relative group cursor-pointer">
                  <Avatar className="h-24 w-24" data-ai-hint="person face">
                    <AvatarImage
                      src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`}
                      alt="User Avatar"
                    />
                    <AvatarFallback>
                      {userProfile?.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-8 w-8 text-white" />
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Update Profile Picture</DialogTitle>
                  <DialogDescription>
                    Center your face in the frame and capture a new photo.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {hasCameraPermission === false ? (
                      <Alert variant="destructive">
                        <AlertTitle>Camera Access Required</AlertTitle>
                        <AlertDescription>
                          Please allow camera access in your browser to use this feature.
                        </AlertDescription>
                      </Alert>
                  ) : capturedImage ? (
                    <div className="flex flex-col items-center space-y-4">
                      <img src={capturedImage} alt="Captured" className="rounded-md" />
                    </div>
                  ) : (
                    <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                <DialogFooter>
                  {capturedImage ? (
                    <>
                      <Button variant="outline" onClick={() => setCapturedImage(null)}>Retake</Button>
                      <Button onClick={handleSavePicture}>Save Picture</Button>
                    </>
                  ) : (
                    <Button onClick={handleCapture} disabled={hasCameraPermission !== true}>
                      <Camera className="mr-2 h-4 w-4" />
                      Capture
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="space-y-1">
                <p className="text-2xl font-semibold">{userProfile?.username || user.displayName || 'User'}</p>
                <p className="text-muted-foreground">{user.email}</p>
                {userProfile?.role && <Badge>{userProfile.role}</Badge>}
            </div>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleUpdateProfile)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Your username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Save Changes</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
