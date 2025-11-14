import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Loader2, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { BOOK_GENRES } from '@repo/types';

const profileSchema = z.object({
  penName: z.string().max(100).optional().or(z.literal('')),
  bio: z.string().min(50, 'Bio must be at least 50 characters').max(5000),
  genres: z.array(z.string()).min(1, 'Select at least one genre').max(5, 'Maximum 5 genres'),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

const verificationSchema = z.object({
  type: z.enum(['AMAZON_LINK', 'GOODREADS_LINK', 'PUBLISHER_PAGE', 'ISBN', 'OTHER']),
  value: z.string().min(1, 'Proof value is required'),
  notes: z.string().max(1000).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type VerificationFormData = z.infer<typeof verificationSchema>;

export default function AuthorVerification() {
  const { toast } = useToast();
  const [step, setStep] = useState<'profile' | 'verification'>('profile');

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/author-profiles'],
    retry: false,
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      penName: profile?.data?.penName || '',
      bio: profile?.data?.bio || '',
      genres: profile?.data?.genres || [],
      website: profile?.data?.website || '',
    },
  });

  const verificationForm = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      type: 'GOODREADS_LINK',
      value: '',
      notes: '',
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) =>
      apiRequest('/api/author-profiles', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({
        title: 'Profile saved',
        description: 'Your author profile has been saved successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/author-profiles'] });
      if (profile?.data?.verificationStatus === 'UNVERIFIED') {
        setStep('verification');
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save profile',
        variant: 'destructive',
      });
    },
  });

  const submitVerificationMutation = useMutation({
    mutationFn: (data: VerificationFormData) =>
      apiRequest('/api/author-profiles/submit-verification', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({
        title: 'Verification submitted',
        description: 'Your verification has been submitted for review.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/author-profiles'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit verification',
        variant: 'destructive',
      });
    },
  });

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" data-testid="loader-verification" />
      </div>
    );
  }

  const verificationStatus = profile?.data?.verificationStatus || 'UNVERIFIED';
  const canSubmitVerification = verificationStatus !== 'PENDING' && verificationStatus !== 'VERIFIED';

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Author Verification</h1>
        <p className="text-muted-foreground">
          Complete your author profile and submit verification to publish pitches and participate in swaps.
        </p>
      </div>

      {/* Status Card */}
      {profile?.data && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Verification Status
              {verificationStatus === 'VERIFIED' && <CheckCircle className="w-5 h-5 text-green-600" data-testid="icon-verified" />}
              {verificationStatus === 'PENDING' && <Clock className="w-5 h-5 text-yellow-600" data-testid="icon-pending" />}
              {verificationStatus === 'REJECTED' && <XCircle className="w-5 h-5 text-red-600" data-testid="icon-rejected" />}
              {verificationStatus === 'UNVERIFIED' && <AlertCircle className="w-5 h-5 text-gray-600" data-testid="icon-unverified" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  verificationStatus === 'VERIFIED'
                    ? 'default'
                    : verificationStatus === 'PENDING'
                    ? 'secondary'
                    : 'destructive'
                }
                data-testid={`status-${verificationStatus.toLowerCase()}`}
              >
                {verificationStatus}
              </Badge>
              {verificationStatus === 'VERIFIED' && (
                <p className="text-sm text-muted-foreground">
                  Verified on {new Date(profile.data.verifiedAt).toLocaleDateString()}
                </p>
              )}
              {verificationStatus === 'REJECTED' && profile.data.rejectionReason && (
                <p className="text-sm text-destructive">{profile.data.rejectionReason}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Form */}
      {step === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Author Profile</CardTitle>
            <CardDescription>Tell us about yourself and your writing.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit((data) => saveProfileMutation.mutate(data))} className="space-y-6">
                <FormField
                  control={profileForm.control}
                  name="penName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pen Name (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your pen name"
                          {...field}
                          data-testid="input-penname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us about your writing background, published works, and what makes you a unique author..."
                          rows={5}
                          {...field}
                          data-testid="input-bio"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="genres"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Genres (select 1-5)</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value[0] || ''}
                          onValueChange={(value) => {
                            if (!field.value.includes(value) && field.value.length < 5) {
                              field.onChange([...field.value, value]);
                            }
                          }}
                        >
                          <SelectTrigger data-testid="select-genres">
                            <SelectValue placeholder="Select genres" />
                          </SelectTrigger>
                          <SelectContent>
                            {BOOK_GENRES.map((genre) => (
                              <SelectItem key={genre} value={genre}>
                                {genre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {field.value.map((genre) => (
                          <Badge
                            key={genre}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => field.onChange(field.value.filter((g) => g !== genre))}
                            data-testid={`badge-genre-${genre.toLowerCase()}`}
                          >
                            {genre} ×
                          </Badge>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://yourwebsite.com"
                          {...field}
                          data-testid="input-website"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={saveProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {saveProfileMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Profile
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Verification Form */}
      {step === 'verification' && canSubmitVerification && (
        <Card>
          <CardHeader>
            <CardTitle>Submit Verification Proof</CardTitle>
            <CardDescription>
              Provide proof of your published works to verify your author status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...verificationForm}>
              <form onSubmit={verificationForm.handleSubmit((data) => submitVerificationMutation.mutate(data))} className="space-y-6">
                <FormField
                  control={verificationForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proof Type</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger data-testid="select-proof-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AMAZON_LINK">Amazon Author Page</SelectItem>
                            <SelectItem value="GOODREADS_LINK">Goodreads Author Page</SelectItem>
                            <SelectItem value="PUBLISHER_PAGE">Publisher Page</SelectItem>
                            <SelectItem value="ISBN">ISBN Number</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={verificationForm.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proof Value (URL or ISBN)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://... or ISBN number"
                          {...field}
                          data-testid="input-proof-value"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={verificationForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional context for reviewers..."
                          rows={3}
                          {...field}
                          data-testid="input-proof-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('profile')}
                    data-testid="button-back-profile"
                  >
                    Back to Profile
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitVerificationMutation.isPending}
                    data-testid="button-submit-verification"
                  >
                    {submitVerificationMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Submit for Verification
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
