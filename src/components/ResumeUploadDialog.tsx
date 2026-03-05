import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Loader2, FileText } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: { id: string; title: string }[];
  selectedJob: string;
  onUploaded: () => void;
}

export function ResumeUploadDialog({ open, onOpenChange, jobs, selectedJob, onUploaded }: Props) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState(selectedJob);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file || !user || !jobId) {
      toast.error("Please select a file and job role");
      return;
    }

    setUploading(true);
    try {
      // Read file text
      const text = await file.text();

      // Upload file to storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, file);
      if (uploadError) throw uploadError;

      // Call the edge function to analyze
      const { data: analysisData, error: fnError } = await supabase.functions.invoke("analyze-resume", {
        body: { resumeText: text, jobDescriptionId: jobId },
      });

      if (fnError) throw fnError;

      const analysis = analysisData;

      // Create candidate
      const { data: candidate, error: candError } = await supabase.from("candidates").insert({
        user_id: user.id,
        name: analysis.contact_info?.name || file.name.replace(/\.[^/.]+$/, ""),
        email: analysis.contact_info?.email || null,
        university: analysis.contact_info?.university || null,
        total_years_experience: analysis.experience_years || 0,
      }).select().single();

      if (candError) throw candError;

      // Store resume
      await supabase.from("resumes").insert({
        candidate_id: candidate.id,
        user_id: user.id,
        raw_text: text,
        file_url: filePath,
      });

      // Store match scores
      const radar = analysis.radar_stats || {};
      await supabase.from("match_scores").insert({
        candidate_id: candidate.id,
        job_description_id: jobId,
        user_id: user.id,
        technical_score: radar.tech || 0,
        soft_skills_score: radar.soft_skills || 0,
        experience_score: radar.experience || 0,
        leadership_score: radar.leadership || 0,
        education_score: radar.education || 0,
        overall_score: Math.round(
          ((radar.tech || 0) + (radar.soft_skills || 0) + (radar.experience || 0) +
            (radar.leadership || 0) + (radar.education || 0)) / 5
        ),
        fit_summary: analysis.fit_summary || "",
        contact_info: analysis.contact_info || {},
      });

      toast.success("Resume analyzed successfully!");
      setFile(null);
      onOpenChange(false);
      onUploaded();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to analyze resume");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Resume</DialogTitle>
          <DialogDescription>Upload a candidate resume for AI analysis</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Job Role</Label>
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger>
                <SelectValue placeholder="Select job role" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Resume File</Label>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <div
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-input p-8 cursor-pointer hover:border-primary/50 transition-colors"
            >
              {file ? (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="font-medium">{file.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to select a resume file</p>
                  <p className="text-xs text-muted-foreground mt-1">.txt, .pdf, .doc, .docx</p>
                </>
              )}
            </div>
          </div>

          <Button onClick={handleUpload} disabled={uploading || !file || !jobId} className="w-full">
            {uploading ? <Loader2 className="animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Analyzing..." : "Upload & Analyze"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
