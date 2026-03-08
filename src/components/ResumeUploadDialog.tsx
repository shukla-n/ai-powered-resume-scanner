import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Loader2, FileText } from "lucide-react";

interface JobRole {
  id: string;
  title: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRole: string;
  onUploaded: () => void;
}

export function ResumeUploadDialog({ open, onOpenChange, selectedRole, onUploaded }: Props) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState(selectedRole);
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setJobId(selectedRole);
  }, [selectedRole]);

  useEffect(() => {
    if (!open) return;

    const loadRoles = async () => {
      const { data, error } = await (supabase as any)
        .from("job_roles")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error(error);
        toast.error("Failed to load job roles");
        return;
      }

      const loadedRoles = (data || []) as JobRole[];
      setRoles(loadedRoles);
      if (loadedRoles.length > 0 && !jobId) {
        setJobId(loadedRoles[0].id);
      }
    };

    loadRoles();
  }, [open]);

  const handleUpload = async () => {
    if (!file || !user || !jobId) {
      toast.error("Please select a PDF and job role");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }

    setUploading(true);
    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: analysisData, error: fnError } = await supabase.functions.invoke("analyze-resume", {
        body: { filePath, jobRoleId: jobId },
      });

      if (fnError) throw fnError;
      if (!analysisData) throw new Error("Analysis response is empty");

      const analysis = analysisData;

      const { data: candidate, error: candError } = await supabase
        .from("candidates")
        .insert({
          user_id: user.id,
          name: analysis.contact_info?.name || file.name.replace(/\.[^/.]+$/, ""),
          email: analysis.contact_info?.email || null,
          university: analysis.contact_info?.university || null,
          total_years_experience: analysis.experience_years || 0,
        })
        .select()
        .single();

      if (candError) throw candError;

      const { error: resumeError } = await supabase.from("resumes").insert({
        candidate_id: candidate.id,
        user_id: user.id,
        raw_text: analysis.resume_text || null,
        file_url: filePath,
      });
      if (resumeError) throw resumeError;

      const radar = analysis.radar_stats || {};
      const scores = analysis.match_scores || {};

      const { error: scoreError } = await supabase.from("match_scores").insert({
        candidate_id: candidate.id,
        job_description_id: jobId,
        user_id: user.id,
        technical_score: scores.technical ?? radar.tech ?? 0,
        soft_skills_score: scores.soft_skills ?? radar.soft_skills ?? 0,
        experience_score: scores.experience ?? radar.projects ?? 0,
        leadership_score: radar.leadership ?? 0,
        education_score: radar.education ?? 0,
        overall_score: scores.overall ?? 0,
        fit_summary: analysis.fit_summary || "",
        contact_info: analysis.contact_info || {},
      });
      if (scoreError) throw scoreError;

      toast.success("Resume analyzed successfully!");
      setFile(null);
      onOpenChange(false);
      onUploaded();
    } catch (err: any) {
      console.error("Resume analysis failed", err);
      toast.error("Resume analysis failed. Please try again.");
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
                {roles.map((j) => (
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
              accept=".pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <div
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-input p-8 transition-colors hover:border-primary/50"
            >
              {file ? (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="font-medium">{file.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to select a resume file</p>
                  <p className="mt-1 text-xs text-muted-foreground">.pdf</p>
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

