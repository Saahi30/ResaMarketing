import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabase";
import { useNavigate } from "react-router-dom";
import React from "react";

const platformOptions = [
  { key: "youtube", label: "YouTube", icon: "yt" },
  { key: "instagram", label: "Instagram", icon: "ig" },
  { key: "facebook", label: "Facebook", icon: "fb" },
  { key: "tiktok", label: "TikTok", icon: "tt" },
];

const steps = [
  "Role",
  "Personal Details",
  "Platforms",
  "Platform Details",
  "Pricing",
  "Profile Image",
  "Review & Submit",
];

const currencyOptions = ["USD", "INR", "EUR", "GBP", "AUD", "CAD"]; // Add more as needed
const ageOptions = ["13-17", "18-24", "25-34", "35-44", "45+"];
const genderOptions = ["Male", "Female", "Other", "Prefer not to say"];
const categoryOptions = [
  "Beauty & Fashion",
  "Tech & Gadgets",
  "Gaming",
  "Fitness & Health",
  "Food & Cooking",
  "Travel & Adventure",
  "Education",
  "Finance & Business",
  "Music & Dance",
  "Comedy & Entertainment",
  "Other"
];

const MAX_IMAGE_SIZE_MB = 3;
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string;

function extractYouTubeIdentifier(url: string): { type: 'id' | 'username' | 'handle', value: string } | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts[0] === 'channel') {
      return { type: 'id', value: parts[1] };
    }
    if (parts[0] === 'c') {
      return { type: 'username', value: parts[1] };
    }
    if (parts[0] && parts[0].startsWith('@')) {
      return { type: 'handle', value: parts[0] };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchYouTubeChannelData(identifier: { type: 'id' | 'username' | 'handle', value: string }, apiKey: string): Promise<any> {
  let url = '';
  if (identifier.type === 'id') {
    url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${identifier.value}&key=${apiKey}`;
  } else if (identifier.type === 'username') {
    url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forUsername=${identifier.value}&key=${apiKey}`;
  } else if (identifier.type === 'handle') {
    url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${identifier.value}&key=${apiKey}`;
  } else {
    throw new Error('Invalid YouTube channel URL');
  }
  const res = await fetch(url);
  const data = await res.json();
  if (data.items && data.items.length > 0) {
    if (identifier.type === 'handle') {
      const channelId = data.items[0]?.snippet?.channelId || data.items[0]?.id?.channelId;
      if (channelId) {
        return fetchYouTubeChannelData({ type: 'id', value: channelId }, apiKey);
      }
    }
    return data.items[0];
  }
  throw new Error('Channel not found');
}

export default function Onboarding() {
  const navigate = useNavigate();
  // Stepper state
  const [step, setStep] = useState(0);
  // Role
  const [role, setRole] = useState("");
  // Personal details
  const [personal, setPersonal] = useState({
    username: "",
    email: "",
    age: "",
    gender: "",
    country: "",
    category: "",
    customCategory: "",
    bio: ""
  });
  // Platforms
  const [platforms, setPlatforms] = useState<string[]>([]);
  // Platform details
  const [platformDetails, setPlatformDetails] = useState<any>({
    youtube: { channelUrl: "" },
    instagram: { username: "", followers: "", posts: "" },
    facebook: { username: "" },
    tiktok: { username: "" },
  });
  // Pricing
  const [pricing, setPricing] = useState<any>({
    youtube: {
      video: { avg: "", currency: "" },
      inVideoPlacement: { avg: "", currency: "" },
      community: { avg: "", currency: "" },
      short: { avg: "", currency: "" },
    },
    instagram: { post: { avg: "", currency: "" }, story: { avg: "", currency: "" }, reel: { avg: "", currency: "" } },
    facebook: { post: { avg: "", currency: "" } },
    tiktok: { video: { avg: "", currency: "" } },
  });
  const [errors, setErrors] = useState<any>({});
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [bioLoading, setBioLoading] = useState(false);

  // Prefill email and name from session, and check onboarding status
  useEffect(() => {
    async function fetchUserAndCheckOnboarding() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (user) {
        // Fetch user profile from users table
        const { data: userProfile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        if (userProfile) {
          // If all required fields are present, redirect to dashboard
          setInfoMessage("Profile already exists... signing in");
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1500);
          return;
        }
        // Prefill username/email if available
        setPersonal((p) => ({
          ...p,
          username: String(userProfile?.username || (user.user_metadata && user.user_metadata.full_name) || ''),
          email: String(userProfile?.email || user.email || ''),
        }));
        if (userProfile?.role) setRole(userProfile.role);
      }
    }
    fetchUserAndCheckOnboarding();
  }, [navigate]);

  // Stepper navigation
  const nextStep = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  // Platform selection handler
  const togglePlatform = (key: string) => {
    setPlatforms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  // Render platform icons
  const renderIcon = (key: string): React.ReactNode => {
    if (key === "youtube")
      return <img src="/youtube.png" alt="YouTube" className="w-6 h-6 object-contain inline-block align-middle" />;
    if (key === "instagram")
      return <img src="/instagram.png" alt="Instagram" className="w-6 h-6 object-contain inline-block align-middle" />;
    if (key === "facebook")
      return <img src="/facebook.png" alt="Facebook" className="w-6 h-6 object-contain inline-block align-middle" />;
    if (key === "tiktok")
      return <img src="/tiktok.png" alt="TikTok" className="w-6 h-6 object-contain inline-block align-middle" />;
    return null;
  };

  // Review data for display
  const reviewData = (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-lg mb-1">Role</h3>
        <div className="text-gray-700 dark:text-gray-300">{role}</div>
      </div>
      <div>
        <h3 className="font-semibold text-lg mb-1">Personal Details</h3>
        <div className="text-gray-700 dark:text-gray-300">Name: {personal.username}</div>
        <div className="text-gray-700 dark:text-gray-300">Email: {personal.email}</div>
        <div className="text-gray-700 dark:text-gray-300">Age: {personal.age}</div>
        <div className="text-gray-700 dark:text-gray-300">Gender: {personal.gender}</div>
        <div className="text-gray-700 dark:text-gray-300">Country: {personal.country}</div>
        {role === "creator" && (
          <>
            <div className="text-gray-700 dark:text-gray-300">Category: {personal.category}</div>
            {personal.category === "Other" && (
              <div className="text-gray-700 dark:text-gray-300">Custom Category: {personal.customCategory}</div>
            )}
          </>
        )}
        {role === "creator" && (
          <>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Creator Bio / About Me <span className="text-xs text-gray-500">(max 2500 words)</span>
              </label>
              <textarea
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                rows={6}
                maxLength={15000}
                value={personal.bio}
                onChange={e => {
                  const words = e.target.value.split(/\s+/);
                  if (words.length <= 2500) {
                    setPersonal(p => ({ ...p, bio: e.target.value }));
                  }
                }}
                placeholder="Tell us about yourself, your philosophy, marketing style, restrictions, etc."
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {personal.bio.trim().split(/\s+/).filter(Boolean).length} / 2500 words
                </span>
                <button
                  type="button"
                  className={`px-4 py-1 rounded bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-semibold flex items-center gap-2 ${bioLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                  onClick={async () => {
                    if (!personal.bio.trim()) return;
                    setBioLoading(true);
                    try {
                      const res = await fetch('/api/gemini-refine', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: personal.bio }),
                      });
                      const data = await res.json();
                      setPersonal(p => ({ ...p, bio: data.refined || p.bio }));
                    } catch {
                      // Optionally show an error
                    }
                    setBioLoading(false);
                  }}
                  disabled={bioLoading || !personal.bio.trim()}
                >
                  {bioLoading ? (
                    <span className="animate-spin mr-2">⏳</span>
                  ) : (
                    <span>Refine with Gemini</span>
                  )}
                </button>
              </div>
              {errors.bio && <div className="text-red-500 text-xs mt-1">{errors.bio}</div>}
            </div>
          </>
        )}
      </div>
      <div>
        <h3 className="font-semibold text-lg mb-1">Platforms</h3>
        <div className="flex gap-2">
          {platforms.map((p) => (
            <span key={p} className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">
              {renderIcon(p) ?? <></>} {platformOptions.find((opt) => opt.key === p)?.label}
            </span>
          ))}
        </div>
      </div>
      {platforms.map((p) => (
        <div key={p}>
          <h3 className="font-semibold text-lg mb-1">{platformOptions.find((opt) => opt.key === p)?.label} Details</h3>
          {Object.entries(platformDetails[p]).map(([k, v]) => (
            <div key={k} className="text-gray-700 dark:text-gray-300">{k}: {String(v)}</div>
          ))}
          <h3 className="font-semibold text-lg mb-1 mt-2">{platformOptions.find((opt) => opt.key === p)?.label} Pricing</h3>
          {Object.entries(pricing[p]).map(([k, v]) => {
            const price = v as any;
            return (
              <div key={k} className="text-gray-700 dark:text-gray-300">
                {k}: {price.avg} {price.currency}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  // Validation logic for each step
  const validateStep = () => {
    let stepErrors: any = {};
    if (step === 0) {
      if (!role) stepErrors.role = "Please select a role.";
    }
    if (step === 1) {
      if (!personal.username) stepErrors.username = "Name is required.";
      if (!personal.email) stepErrors.email = "Email is required.";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(personal.email)) stepErrors.email = "Invalid email.";
      if (!personal.age) stepErrors.age = "Age is required.";
      if (!personal.gender) stepErrors.gender = "Gender is required.";
      if (!personal.country) stepErrors.country = "Country is required.";
      if (role === "creator") {
        if (!personal.category) stepErrors.category = "Category is required.";
        if (personal.category === "Other" && !personal.customCategory) stepErrors.customCategory = "Please enter your category.";
        const wordCount = personal.bio.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount > 2500) stepErrors.bio = "Bio must be 2500 words or less.";
      }
    }
    if (step === 2) {
      if (platforms.length === 0) stepErrors.platforms = "Select at least one platform.";
    }
    if (step === 3) {
      platforms.forEach((p) => {
        if (p === "youtube" && !platformDetails.youtube.channelUrl) stepErrors.youtube = "YouTube channel URL/ID required.";
        if (p === "instagram") {
          if (!platformDetails.instagram.username) stepErrors.iguser = "Instagram username required.";
          if (!platformDetails.instagram.followers || isNaN(Number(platformDetails.instagram.followers))) stepErrors.igfollowers = "Valid followers required.";
          if (Number(platformDetails.instagram.followers) < 0) stepErrors.igfollowers = "Followers must be 0 or more.";
          if (!platformDetails.instagram.posts || isNaN(Number(platformDetails.instagram.posts))) stepErrors.igposts = "Valid posts required.";
          if (Number(platformDetails.instagram.posts) < 0) stepErrors.igposts = "Posts must be 0 or more.";
        }
        if (p === "facebook" && !platformDetails.facebook.username) stepErrors.fbuser = "Facebook username required.";
        if (p === "tiktok" && !platformDetails.tiktok.username) stepErrors.ttuser = "TikTok username required.";
      });
    }
    if (step === 4) {
      if (!selectedCurrency) stepErrors.currency = "Please select a currency.";
      platforms.forEach((p) => {
        if (p === "youtube") {
          if (!pricing.youtube.video.avg || isNaN(Number(pricing.youtube.video.avg)) || Number(pricing.youtube.video.avg) < 0) stepErrors.ytvideo = "YouTube video average price required.";
          if (!pricing.youtube.inVideoPlacement.avg || isNaN(Number(pricing.youtube.inVideoPlacement.avg)) || Number(pricing.youtube.inVideoPlacement.avg) < 0) stepErrors.ytinvideo = "YouTube in-video placement average price required.";
          if (!pricing.youtube.community.avg || isNaN(Number(pricing.youtube.community.avg)) || Number(pricing.youtube.community.avg) < 0) stepErrors.ytcommunity = "YouTube community post average price required.";
          if (!pricing.youtube.short.avg || isNaN(Number(pricing.youtube.short.avg)) || Number(pricing.youtube.short.avg) < 0) stepErrors.ytshort = "YouTube short average price required.";
        }
        if (p === "instagram") {
          if (!pricing.instagram.post.avg || isNaN(Number(pricing.instagram.post.avg)) || Number(pricing.instagram.post.avg) < 0) stepErrors.igpost = "Instagram post average price required.";
          if (!pricing.instagram.story.avg || isNaN(Number(pricing.instagram.story.avg)) || Number(pricing.instagram.story.avg) < 0) stepErrors.igstory = "Instagram story average price required.";
          if (!pricing.instagram.reel.avg || isNaN(Number(pricing.instagram.reel.avg)) || Number(pricing.instagram.reel.avg) < 0) stepErrors.igreel = "Instagram reel average price required.";
        }
        // Add similar checks for other price types as needed
      });
    }
    if (step === 5) {
      if (!profileImage) stepErrors.profileImage = "Profile image is required.";
    }
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  // Update tryNextStep to handle brand redirection
  const tryNextStep = () => {
    // Only validate role on the first step
    if (step === 0) {
      if (!role) {
        setErrors((prev: any) => ({ ...prev, role: "Please select a role." }));
        return;
      }
      if (role === "brand") {
        navigate("/brand-onboarding");
        return;
      }
    }
    // ... existing code for other steps ...
    const valid = validateStep();
    if (valid) nextStep();
  };

  // Profile image upload handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        setSubmitError("Profile image must be less than 3 MB.");
        setProfileImage(null);
        setProfileImagePreview("");
        return;
      }
      setProfileImage(file);
      setProfileImagePreview(URL.createObjectURL(file));
      setSubmitError("");
    }
  };

  // Helper to upload profile image to Supabase Storage
  async function uploadProfileImage(userId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/profile.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('profile-pictures').upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;
    // Get public URL
    const { data } = supabase.storage.from('profile-pictures').getPublicUrl(filePath);
    return data.publicUrl;
  }

  // Submit handler
  async function handleSubmit() {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      // Get user ID
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) throw new Error("User not authenticated");
      let profileImageUrl = "";
      if (profileImage) {
        profileImageUrl = await uploadProfileImage(userId, profileImage);
      }
      // 1. Upsert to users table (including role)
      const categoryToSave = role === "creator" ? (personal.category === "Other" ? personal.customCategory : personal.category) : null;
      const { error: userError } = await supabase.from('users').upsert({
        id: userId,
        profile_image: profileImageUrl,
        username: personal.username,
        age: personal.age,
        gender: personal.gender,
        country: personal.country,
        role: role,
        email: personal.email,
        category: categoryToSave,
        bio: personal.bio,
      });
      if (userError) throw userError;
      // 2. Save to social_profiles table for each selected platform
      for (const platform of platforms) {
        let details: any = {};
        if (platform === 'youtube') {
          details = {
            channel_url: platformDetails.youtube.channelUrl,
            channel_id: platformDetails.youtube.channelId,
            channel_name: platformDetails.youtube.channelName,
            profile_image: platformDetails.youtube.profileImage,
            subscriber_count: platformDetails.youtube.subscriberCount ? Number(platformDetails.youtube.subscriberCount) : null,
            pricing: pricing.youtube,
          };
        } else if (platform === 'instagram') {
          details = {
            username: platformDetails.instagram.username,
            followers: Number(platformDetails.instagram.followers),
            posts: Number(platformDetails.instagram.posts),
            pricing: pricing.instagram,
          };
        } else if (platform === 'facebook') {
          details = {
            username: platformDetails.facebook.username,
            pricing: pricing.facebook,
          };
        } else if (platform === 'tiktok') {
          details = {
            username: platformDetails.tiktok.username,
            pricing: pricing.tiktok,
          };
        }
        // Upsert into social_profiles
        const { error: spError } = await supabase.from('social_profiles').upsert({
          user_id: userId,
          platform,
          ...details,
        }, { onConflict: 'user_id,platform' });
        if (spError) throw spError;
      }
      // 3. Redirect based on role
      setIsSubmitting(false);
      if (role === 'brand') {
        window.location.href = '/brand/dashboard';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit onboarding data.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      {infoMessage && (
        <div className="text-blue-600 text-center my-4">{infoMessage}</div>
      )}
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 mt-8">
        {/* Stepper */}
        <div className="flex justify-between mb-8">
          {steps.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${i <= step ? "bg-purple-600" : "bg-gray-300"}`}>{i + 1}</div>
              <span className={`mt-2 text-xs ${i === step ? "text-purple-600 font-semibold" : "text-gray-500"}`}>{label}</span>
            </div>
          ))}
        </div>

        {/* Step 1: Role Selection */}
        {step === 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Are you a Brand or a Creator?</h2>
            <div className="flex gap-6 justify-center mb-8">
              <button
                className={`px-8 py-4 rounded-xl border-2 font-semibold text-lg transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400 flex items-center gap-3 ${role === "brand" ? "bg-purple-600 text-white border-purple-600" : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 hover:bg-purple-50"}`}
                onClick={() => setRole("brand")}
                type="button"
              >
                <img src="/Brand.png" alt="Brand" className="w-7 h-7 object-contain mr-2" />
                Brand
              </button>
              <button
                className={`px-8 py-4 rounded-xl border-2 font-semibold text-lg transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400 flex items-center gap-3 ${role === "creator" ? "bg-purple-600 text-white border-purple-600" : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 hover:bg-purple-50"}`}
                onClick={() => setRole("creator")}
                type="button"
              >
                <img src="/cc.png" alt="Content Creator" className="w-7 h-7 object-contain mr-2" />
                Creator
              </button>
            </div>
            {errors.role && <div className="text-red-500 text-sm mb-4">{errors.role}</div>}
            <div className="flex justify-end">
              <button className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold" onClick={tryNextStep} type="button">Next</button>
            </div>
          </div>
        )}

        {/* Step 2: Personal Details */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Personal Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={personal.username} onChange={e => setPersonal(p => ({ ...p, username: e.target.value }))} />
                {errors.username && <div className="text-red-500 text-xs mt-1">{errors.username}</div>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={personal.email} onChange={e => setPersonal(p => ({ ...p, email: e.target.value }))} />
                {errors.email && <div className="text-red-500 text-xs mt-1">{errors.email}</div>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Age</label>
                <select className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={personal.age} onChange={e => setPersonal(p => ({ ...p, age: e.target.value }))}>
                  <option value="">Select age range</option>
                  {ageOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                {errors.age && <div className="text-red-500 text-xs mt-1">{errors.age}</div>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gender</label>
                <select className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={personal.gender} onChange={e => setPersonal(p => ({ ...p, gender: e.target.value }))}>
                  <option value="">Select gender</option>
                  {genderOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                {errors.gender && <div className="text-red-500 text-xs mt-1">{errors.gender}</div>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Country</label>
                <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={personal.country} onChange={e => setPersonal(p => ({ ...p, country: e.target.value }))} />
                {errors.country && <div className="text-red-500 text-xs mt-1">{errors.country}</div>}
              </div>
              {role === "creator" && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Content Category</label>
                  <select className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={personal.category} onChange={e => setPersonal(p => ({ ...p, category: e.target.value }))}>
                    <option value="">Select category</option>
                    {categoryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  {personal.category === "Other" && (
                    <input type="text" className="w-full mt-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Enter your category" value={personal.customCategory} onChange={e => setPersonal(p => ({ ...p, customCategory: e.target.value }))} />
                  )}
                  {errors.category && <div className="text-red-500 text-xs mt-1">{errors.category}</div>}
                  {errors.customCategory && <div className="text-red-500 text-xs mt-1">{errors.customCategory}</div>}
                </div>
              )}
            </div>
            <div className="flex justify-between">
              <button className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2 rounded-lg font-semibold" onClick={prevStep} type="button">Back</button>
              <button className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold" onClick={tryNextStep} type="button">Next</button>
            </div>
          </div>
        )}

        {/* Step 3: Platform Selection */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Which platforms do you use?</h2>
            <div className="flex flex-wrap gap-4 mb-6">
              {platformOptions.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 font-semibold text-lg transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400 ${platforms.includes(opt.key) ? "bg-purple-600 text-white border-purple-600" : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 hover:bg-purple-50"}`}
                  onClick={() => togglePlatform(opt.key)}
                >
                  {renderIcon(opt.key)} {opt.label}
                </button>
              ))}
            </div>
            {errors.platforms && <div className="text-red-500 text-sm mb-4">{errors.platforms}</div>}
            <div className="flex justify-between">
              <button className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2 rounded-lg font-semibold" onClick={prevStep} type="button">Back</button>
              <button className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold" onClick={tryNextStep} type="button">Next</button>
            </div>
          </div>
        )}

        {/* Step 4: Platform Details */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Platform Details</h2>
            <div className="space-y-6 mb-6">
              {platforms.includes("youtube") && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1">YouTube Channel URL/ID</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    value={platformDetails.youtube.channelUrl}
                    onChange={async e => {
                      const url = e.target.value;
                      setPlatformDetails((d: any) => ({ ...d, youtube: { ...d.youtube, channelUrl: url } }));
                      setErrors((prev: any) => ({ ...prev, youtube: undefined }));
                      if (!url) return;
                      const identifier = extractYouTubeIdentifier(url);
                      if (!identifier) {
                        setErrors((prev: any) => ({ ...prev, youtube: 'Please enter a valid YouTube channel URL (e.g., https://www.youtube.com/channel/UC...)' }));
                        return;
                      }
                      try {
                        const channelData = await fetchYouTubeChannelData(identifier, YOUTUBE_API_KEY);
                        setPlatformDetails((d: any) => ({
                          ...d,
                          youtube: {
                            ...d.youtube,
                            channelId: channelData.id,
                            channelName: channelData.snippet.title,
                            profileImage: channelData.snippet.thumbnails.default.url,
                            subscriberCount: channelData.statistics.subscriberCount,
                          }
                        }));
                      } catch (err: any) {
                        let message = 'Could not fetch channel data.';
                        if (err instanceof Error && err.message === 'Channel not found') {
                          message = 'No channel found for this URL.';
                        } else if (err instanceof Error && err.message) {
                          message = err.message;
                        }
                        setErrors((prev: any) => ({ ...prev, youtube: message }));
                      }
                    }}
                  />
                  {errors.youtube && <div className="text-red-500 text-xs mt-1">{errors.youtube}</div>}
                </div>
              )}
              {platforms.includes("instagram") && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Instagram Username</label>
                    <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={platformDetails.instagram.username} onChange={e => setPlatformDetails((d: any) => ({ ...d, instagram: { ...d.instagram, username: e.target.value } }))} />
                    {errors.iguser && <div className="text-red-500 text-xs mt-1">{errors.iguser}</div>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Followers</label>
                    <input type="number" min="0" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={platformDetails.instagram.followers} onChange={e => setPlatformDetails((d: any) => ({ ...d, instagram: { ...d.instagram, followers: e.target.value } }))} />
                    {errors.igfollowers && <div className="text-red-500 text-xs mt-1">{errors.igfollowers}</div>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Posts</label>
                    <input type="number" min="0" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={platformDetails.instagram.posts} onChange={e => setPlatformDetails((d: any) => ({ ...d, instagram: { ...d.instagram, posts: e.target.value } }))} />
                    {errors.igposts && <div className="text-red-500 text-xs mt-1">{errors.igposts}</div>}
                  </div>
                </div>
              )}
              {platforms.includes("facebook") && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1">Facebook Username</label>
                  <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={platformDetails.facebook.username} onChange={e => setPlatformDetails((d: any) => ({ ...d, facebook: { ...d.facebook, username: e.target.value } }))} />
                  {errors.fbuser && <div className="text-red-500 text-xs mt-1">{errors.fbuser}</div>}
                </div>
              )}
              {platforms.includes("tiktok") && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1">TikTok Username</label>
                  <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={platformDetails.tiktok.username} onChange={e => setPlatformDetails((d: any) => ({ ...d, tiktok: { ...d.tiktok, username: e.target.value } }))} />
                  {errors.ttuser && <div className="text-red-500 text-xs mt-1">{errors.ttuser}</div>}
                </div>
              )}
            </div>
            <div className="flex justify-between">
              <button className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2 rounded-lg font-semibold" onClick={prevStep} type="button">Back</button>
              <button className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold" onClick={tryNextStep} type="button">Next</button>
            </div>
          </div>
        )}

        {/* Step 5: Pricing */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Set Your Pricing</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Currency</label>
              <select className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={selectedCurrency} onChange={e => {
                setSelectedCurrency(e.target.value);
                // Set currency for all deliverables
                setPricing((pr: any) => {
                  const updated = { ...pr };
                  platforms.forEach((p) => {
                    Object.keys(pr[p]).forEach((d) => {
                      updated[p][d].currency = e.target.value;
                    });
                  });
                  return updated;
                });
              }}>
                <option value="">Select currency</option>
                {currencyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              {errors.currency && <div className="text-red-500 text-xs mt-1">{errors.currency}</div>}
            </div>
            <div className="space-y-6 mb-6">
              {platforms.map((p) => (
                <div key={p}>
                  <h3 className="font-semibold text-lg mb-2">{platformOptions.find(opt => opt.key === p)?.label} Deliverables</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(pricing[p]).map((deliverable) => (
                      <div key={deliverable}>
                        <label className="block text-sm font-medium mb-1 capitalize">{deliverable.replace(/([A-Z])/g, ' $1')}</label>
                        <input type="number" min="0" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={pricing[p][deliverable].avg} onChange={e => setPricing((pr: any) => ({ ...pr, [p]: { ...pr[p], [deliverable]: { ...pr[p][deliverable], avg: e.target.value, currency: selectedCurrency } } }))} placeholder="Average price" />
                        {errors[`${p.slice(0,2)}${deliverable}`] && <div className="text-red-500 text-xs mt-1">{errors[`${p.slice(0,2)}${deliverable}`]}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <button className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2 rounded-lg font-semibold" onClick={prevStep} type="button">Back</button>
              <button className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold" onClick={tryNextStep} type="button">Next</button>
            </div>
          </div>
        )}

        {/* Step 6: Profile Image Upload */}
        {step === 5 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Upload Your Profile Image</h2>
            <div className="flex flex-col items-center mb-6">
              {profileImagePreview ? (
                <img src={profileImagePreview} alt="Profile Preview" className="w-32 h-32 rounded-full object-cover mb-4 border-4 border-purple-200" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4 text-4xl text-gray-400">?</div>
              )}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden"
              />
              <button
                type="button"
                className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold"
                onClick={() => fileInputRef.current?.click()}
              >
                {profileImage ? "Change Image" : "Upload Image"}
              </button>
              {errors.profileImage && <div className="text-red-500 text-xs mt-2">{errors.profileImage}</div>}
              {submitError && <div className="text-red-500 text-xs mt-2">{submitError}</div>}
            </div>
            <div className="flex justify-between">
              <button className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2 rounded-lg font-semibold" onClick={prevStep} type="button">Back</button>
              <button className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold" onClick={tryNextStep} type="button">Next</button>
            </div>
          </div>
        )}

        {/* Step 7: Review & Submit */}
        {step === 6 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Review & Submit</h2>
            <div className="mb-6">{reviewData}</div>
            {submitError && <div className="text-red-500 text-xs mb-2">{submitError}</div>}
            <div className="flex justify-between items-center">
              <button className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2 rounded-lg font-semibold" onClick={prevStep} type="button">Back</button>
              <button
                className={`bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 ${isSubmitting ? "opacity-60 cursor-not-allowed" : ""}`}
                onClick={handleSubmit}
                type="button"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="animate-spin mr-2">⏳</span>
                ) : (
                  <span>Submit</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}