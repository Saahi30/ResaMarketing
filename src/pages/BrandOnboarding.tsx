import { useState, useRef } from "react";
import { supabase } from "../utils/supabase";
import { useNavigate } from "react-router-dom";

const industryOptions = [
  "Fashion", "Tech", "Food", "Fitness", "Beauty", "Travel", "Education", "Finance", "Entertainment", "Other"
];
const companySizeOptions = [
  "1-10", "11-50", "51-200", "201-1000", "1000+"
];
const countryOptions = [
  "USA", "UK", "India", "Canada", "Australia", "Germany", "France", "Other"
];
const collaborationTypes = [
  "Sponsorship", "Product Gifting", "Affiliate", "Event", "UGC"
];
const creatorCategories = [
  "Tech", "Beauty", "Fitness", "Gaming", "Food", "Travel", "Education", "Fashion", "Music", "Comedy"
];
const brandValues = [
  "Sustainability", "Diversity", "Innovation", "Quality", "Community", "Transparency"
];
const toneOptions = [
  "Fun", "Professional", "Educational", "Bold", "Friendly", "Minimalist"
];

const steps = [
  "Brand Info",
  "Contact Info",
  "Social Links",
  "Collab Preferences",
  "Review & Submit"
];

export default function BrandOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<any>({});
  const [brand, setBrand] = useState<any>({
    brand_name: "",
    logo_url: "",
    website_url: "",
    industry: "",
    company_size: "",
    location: "",
    description: "",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    role: "",
    instagram_url: "",
    facebook_url: "",
    twitter_url: "",
    linkedin_url: "",
    youtube_url: "",
    collaboration_types: [],
    preferred_creator_categories: [],
    brand_values: [],
    preferred_tone: [],
  });

  // Stepper navigation
  const nextStep = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  // Logo upload handler
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  // Validation logic
  const validateStep = () => {
    let stepErrors: any = {};
    if (step === 0) {
      if (!brand.brand_name) stepErrors.brand_name = "Brand name is required.";
      if (!logo && !brand.logo_url) stepErrors.logo = "Brand logo is required.";
      if (!brand.industry) stepErrors.industry = "Industry is required.";
      if (!brand.company_size) stepErrors.company_size = "Company size is required.";
      if (!brand.location) stepErrors.location = "Location is required.";
      if (!brand.description) stepErrors.description = "Description is required.";
    }
    if (step === 1) {
      if (!brand.contact_person) stepErrors.contact_person = "Contact person is required.";
      if (!brand.contact_email) stepErrors.contact_email = "Contact email is required.";
    }
    if (step === 2) {
      if (!brand.instagram_url && !brand.facebook_url && !brand.twitter_url && !brand.linkedin_url && !brand.youtube_url) {
        stepErrors.social = "At least one social link is recommended.";
      }
    }
    if (step === 3) {
      if (!brand.collaboration_types.length) stepErrors.collaboration_types = "Select at least one collaboration type.";
      if (!brand.preferred_creator_categories.length) stepErrors.preferred_creator_categories = "Select at least one creator category.";
    }
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const tryNextStep = () => {
    if (validateStep()) nextStep();
  };

  // Logo upload to Supabase Storage
  async function uploadLogo(userId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/brand-logo.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('brand-logos').upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('brand-logos').getPublicUrl(filePath);
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
      let logoUrl = brand.logo_url;
      if (logo) {
        logoUrl = await uploadLogo(userId, logo);
      }
      // Save to brands table
      const { error: brandError } = await supabase.from('brands').upsert({
        user_id: userId,
        brand_name: brand.brand_name,
        logo_url: logoUrl,
        website_url: brand.website_url,
        industry: brand.industry,
        company_size: brand.company_size,
        location: brand.location,
        description: brand.description,
        contact_person: brand.contact_person,
        contact_email: brand.contact_email,
        contact_phone: brand.contact_phone,
        role: brand.role,
        instagram_url: brand.instagram_url,
        facebook_url: brand.facebook_url,
        twitter_url: brand.twitter_url,
        linkedin_url: brand.linkedin_url,
        youtube_url: brand.youtube_url,
        collaboration_types: brand.collaboration_types,
        preferred_creator_categories: brand.preferred_creator_categories,
        brand_values: brand.brand_values,
        preferred_tone: brand.preferred_tone,
      });
      if (brandError) throw brandError;
      setIsSubmitting(false);
      navigate('/brand/dashboard');
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit brand onboarding data.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 mt-8">
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-300 text-center">
          You can provide more specific information about your brand's needs, vision, and campaign requirements after signup, when creating a campaign.
        </div>
        {/* Stepper */}
        <div className="flex justify-between mb-8">
          {steps.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${i <= step ? "bg-purple-600" : "bg-gray-300"}`}>{i + 1}</div>
              <span className={`mt-2 text-xs ${i === step ? "text-purple-600 font-semibold" : "text-gray-500"}`}>{label}</span>
            </div>
          ))}
        </div>
        {/* Step 1: Brand Info */}
        {step === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Brand Name</label>
              <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={brand.brand_name} onChange={e => setBrand((b: any) => ({ ...b, brand_name: e.target.value }))} />
              {errors.brand_name && <div className="text-red-500 text-xs mt-1">{errors.brand_name}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Brand Logo</label>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoChange} className="w-full" />
              {logoPreview && <img src={logoPreview} alt="Logo Preview" className="w-20 h-20 rounded-full object-cover mt-2" />}
              {errors.logo && <div className="text-red-500 text-xs mt-1">{errors.logo}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Website URL</label>
              <input type="url" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={brand.website_url} onChange={e => setBrand((b: any) => ({ ...b, website_url: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Industry/Category</label>
              <select className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={brand.industry} onChange={e => setBrand((b: any) => ({ ...b, industry: e.target.value }))}>
                <option value="">Select industry</option>
                {industryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              {errors.industry && <div className="text-red-500 text-xs mt-1">{errors.industry}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Company Size</label>
              <select className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={brand.company_size} onChange={e => setBrand((b: any) => ({ ...b, company_size: e.target.value }))}>
                <option value="">Select size</option>
                {companySizeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              {errors.company_size && <div className="text-red-500 text-xs mt-1">{errors.company_size}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location/Country</label>
              <select className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={brand.location} onChange={e => setBrand((b: any) => ({ ...b, location: e.target.value }))}>
                <option value="">Select country</option>
                {countryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              {errors.location && <div className="text-red-500 text-xs mt-1">{errors.location}</div>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Short Description / About the Brand</label>
              <textarea className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" rows={3} value={brand.description} onChange={e => setBrand((b: any) => ({ ...b, description: e.target.value }))} />
              {errors.description && <div className="text-red-500 text-xs mt-1">{errors.description}</div>}
            </div>
            <div className="md:col-span-2 flex justify-between mt-4">
              <button className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2 rounded-lg font-semibold" onClick={prevStep} type="button" disabled={step === 0}>Back</button>
              <button className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold" onClick={tryNextStep} type="button">Next</button>
            </div>
          </div>
        )}
        {/* Step 2: Contact Info */}
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Contact Person Name</label>
              <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={brand.contact_person} onChange={e => setBrand((b: any) => ({ ...b, contact_person: e.target.value }))} />
              {errors.contact_person && <div className="text-red-500 text-xs mt-1">{errors.contact_person}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Email</label>
              <input type="email" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={brand.contact_email} onChange={e => setBrand((b: any) => ({ ...b, contact_email: e.target.value }))} />
              {errors.contact_email && <div className="text-red-500 text-xs mt-1">{errors.contact_email}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Phone</label>
              <input type="tel" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={brand.contact_phone} onChange={e => setBrand((b: any) => ({ ...b, contact_phone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role/Position</label>
              <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={brand.role} onChange={e => setBrand((b: any) => ({ ...b, role: e.target.value }))} />
            </div>
            <div className="md:col-span-2 flex justify-between mt-4">
              <button className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2 rounded-lg font-semibold" onClick={prevStep} type="button">Back</button>
              <button className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold" onClick={tryNextStep} type="button">Next</button>
            </div>
          </div>
        )}
        {/* Step 3: Social Links */}
        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Instagram URL</label>
              <input type="url" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={brand.instagram_url} onChange={e => setBrand((b: any) => ({ ...b, instagram_url: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Facebook URL</label>
              <input type="url" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={brand.facebook_url} onChange={e => setBrand((b: any) => ({ ...b, facebook_url: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Twitter/X URL</label>
              <input type="url" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={brand.twitter_url} onChange={e => setBrand((b: any) => ({ ...b, twitter_url: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">LinkedIn URL</label>
              <input type="url" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={brand.linkedin_url} onChange={e => setBrand((b: any) => ({ ...b, linkedin_url: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">YouTube URL</label>
              <input type="url" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={brand.youtube_url} onChange={e => setBrand((b: any) => ({ ...b, youtube_url: e.target.value }))} />
            </div>
            {errors.social && <div className="text-red-500 text-xs mt-1 md:col-span-2">{errors.social}</div>}
            <div className="md:col-span-2 flex justify-between mt-4">
              <button className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2 rounded-lg font-semibold" onClick={prevStep} type="button">Back</button>
              <button className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold" onClick={tryNextStep} type="button">Next</button>
            </div>
          </div>
        )}
        {/* Step 4: Collaboration Preferences */}
        {step === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Collaboration Types</label>
              <div className="flex flex-wrap gap-2">
                {collaborationTypes.map(opt => (
                  <label key={opt} className="flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={brand.collaboration_types.includes(opt)} onChange={e => {
                      setBrand((b: any) => ({
                        ...b,
                        collaboration_types: e.target.checked
                          ? [...b.collaboration_types, opt]
                          : b.collaboration_types.filter((v: string) => v !== opt)
                      }));
                    }} />
                    {opt}
                  </label>
                ))}
              </div>
              {errors.collaboration_types && <div className="text-red-500 text-xs mt-1">{errors.collaboration_types}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Preferred Creator Categories</label>
              <div className="flex flex-wrap gap-2">
                {creatorCategories.map(opt => (
                  <label key={opt} className="flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={brand.preferred_creator_categories.includes(opt)} onChange={e => {
                      setBrand((b: any) => ({
                        ...b,
                        preferred_creator_categories: e.target.checked
                          ? [...b.preferred_creator_categories, opt]
                          : b.preferred_creator_categories.filter((v: string) => v !== opt)
                      }));
                    }} />
                    {opt}
                  </label>
                ))}
              </div>
              {errors.preferred_creator_categories && <div className="text-red-500 text-xs mt-1">{errors.preferred_creator_categories}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Brand Values</label>
              <div className="flex flex-wrap gap-2">
                {brandValues.map(opt => (
                  <label key={opt} className="flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={brand.brand_values.includes(opt)} onChange={e => {
                      setBrand((b: any) => ({
                        ...b,
                        brand_values: e.target.checked
                          ? [...b.brand_values, opt]
                          : b.brand_values.filter((v: string) => v !== opt)
                      }));
                    }} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Preferred Tone/Style</label>
              <div className="flex flex-wrap gap-2">
                {toneOptions.map(opt => (
                  <label key={opt} className="flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={brand.preferred_tone.includes(opt)} onChange={e => {
                      setBrand((b: any) => ({
                        ...b,
                        preferred_tone: e.target.checked
                          ? [...b.preferred_tone, opt]
                          : b.preferred_tone.filter((v: string) => v !== opt)
                      }));
                    }} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 flex justify-between mt-4">
              <button className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2 rounded-lg font-semibold" onClick={prevStep} type="button">Back</button>
              <button className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold" onClick={tryNextStep} type="button">Next</button>
            </div>
          </div>
        )}
        {/* Step 5: Review & Submit */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Review & Submit</h2>
            <div className="mb-6 space-y-2">
              <div><b>Brand Name:</b> {brand.brand_name}</div>
              <div><b>Industry:</b> {brand.industry}</div>
              <div><b>Company Size:</b> {brand.company_size}</div>
              <div><b>Location:</b> {brand.location}</div>
              <div><b>Description:</b> {brand.description}</div>
              <div><b>Contact Person:</b> {brand.contact_person}</div>
              <div><b>Contact Email:</b> {brand.contact_email}</div>
              <div><b>Contact Phone:</b> {brand.contact_phone}</div>
              <div><b>Role/Position:</b> {brand.role}</div>
              <div><b>Instagram:</b> {brand.instagram_url}</div>
              <div><b>Facebook:</b> {brand.facebook_url}</div>
              <div><b>Twitter/X:</b> {brand.twitter_url}</div>
              <div><b>LinkedIn:</b> {brand.linkedin_url}</div>
              <div><b>YouTube:</b> {brand.youtube_url}</div>
              <div><b>Collaboration Types:</b> {brand.collaboration_types.join(", ")}</div>
              <div><b>Preferred Creator Categories:</b> {brand.preferred_creator_categories.join(", ")}</div>
              <div><b>Brand Values:</b> {brand.brand_values.join(", ")}</div>
              <div><b>Preferred Tone/Style:</b> {brand.preferred_tone.join(", ")}</div>
            </div>
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