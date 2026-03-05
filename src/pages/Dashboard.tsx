import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ResumeUploadDialog } from "@/components/ResumeUploadDialog";
import { CandidateTable } from "@/components/CandidateTable";
import { CandidateDetailDialog } from "@/components/CandidateDetailDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Users, TrendingUp, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface Candidate {
  id: string;
  name: string;
  email: string | null;
  university: string | null;
  total_years_experience: number | null;
  created_at: string;
}

interface MatchScore {
  id: string;
  candidate_id: string;
  job_description_id: string;
  technical_score: number | null;
  soft_skills_score: number | null;
  experience_score: number | null;
  leadership_score: number | null;
  education_score: number | null;
  overall_score: number | null;
  fit_summary: string | null;
  contact_info: any;
}

interface JobDescription {
  id: string;
  title: string;
  description: string | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [matchScores, setMatchScores] = useState<MatchScore[]>([]);
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [candidatesRes, jobsRes, scoresRes] = await Promise.all([
      supabase.from("candidates").select("*").order("created_at", { ascending: false }),
      supabase.from("job_descriptions").select("*").order("created_at", { ascending: false }),
      supabase.from("match_scores").select("*"),
    ]);

    if (candidatesRes.data) setCandidates(candidatesRes.data);
    if (jobsRes.data) {
      setJobs(jobsRes.data);
      if (jobsRes.data.length > 0 && !selectedJob) setSelectedJob(jobsRes.data[0].id);
    }
    if (scoresRes.data) setMatchScores(scoresRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const filteredScores = matchScores.filter((s) => s.job_description_id === selectedJob);
  const candidatesWithScores = candidates.map((c) => {
    const score = filteredScores.find((s) => s.candidate_id === c.id);
    return { ...c, matchScore: score };
  });

  const totalCandidates = candidates.length;
  const avgScore = filteredScores.length > 0
    ? Math.round(filteredScores.reduce((sum, s) => sum + (s.overall_score || 0), 0) / filteredScores.length)
    : 0;
  const highMatches = filteredScores.filter((s) => (s.overall_score || 0) >= 80).length;

  const stats = [
    { label: "Total Candidates", value: totalCandidates, icon: Users, color: "text-primary" },
    { label: "Avg Match Score", value: `${avgScore}%`, icon: TrendingUp, color: "text-success" },
    { label: "High Matches (80%+)", value: highMatches, icon: FileText, color: "text-warning" },
  ];

  return (
    <DashboardLayout
      headerActions={
        <Button onClick={() => setUploadOpen(true)} size="sm">
          <Upload className="h-4 w-4" />
          Upload Resume
        </Button>
      }
    >
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Screen and analyze candidate resumes with AI</p>
          </div>
          {jobs.length > 0 && (
            <Select value={selectedJob} onValueChange={setSelectedJob}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select job role" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-secondary ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <CandidateTable
          candidates={candidatesWithScores}
          loading={loading}
          onCandidateClick={(c) => setSelectedCandidate(c)}
        />
      </div>

      <ResumeUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        jobs={jobs}
        selectedJob={selectedJob}
        onUploaded={fetchData}
      />

      {selectedCandidate && (
        <CandidateDetailDialog
          candidate={selectedCandidate}
          matchScore={filteredScores.find((s) => s.candidate_id === selectedCandidate.id) || null}
          open={!!selectedCandidate}
          onOpenChange={(open) => { if (!open) setSelectedCandidate(null); }}
        />
      )}
    </DashboardLayout>
  );
}
