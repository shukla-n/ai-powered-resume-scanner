import { useState, useEffect, useCallback } from "react";
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

interface JobRole {
  id: string;
  title: string;
  description: string | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [matchScores, setMatchScores] = useState<MatchScore[]>([]);
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [candidatesRes, rolesRes, scoresRes] = await Promise.all([
      supabase.from("candidates").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("job_roles").select("*").order("created_at", { ascending: true }),
      supabase.from("match_scores").select("*").order("created_at", { ascending: false }),
    ]);

    if (candidatesRes.error || rolesRes.error || scoresRes.error) {
      console.error(candidatesRes.error || rolesRes.error || scoresRes.error);
      toast.error("Failed to load dashboard data");
    }

    if (candidatesRes.data) setCandidates(candidatesRes.data);
    if (rolesRes.data) {
      setRoles(rolesRes.data as JobRole[]);
      if (rolesRes.data.length > 0 && !selectedRole) setSelectedRole(rolesRes.data[0].id);
    }
    if (scoresRes.data) setMatchScores(scoresRes.data);

    setLoading(false);
  }, [user, selectedRole]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredScores = selectedRole
    ? matchScores.filter((s) => s.job_description_id === selectedRole)
    : matchScores;

  const candidatesWithScores = candidates.map((c) => {
    const score = filteredScores.find((s) => s.candidate_id === c.id);
    return { ...c, matchScore: score };
  });

  const totalCandidates = candidates.length;
  const avgScore = filteredScores.length > 0
    ? Math.round(filteredScores.reduce((sum, s) => sum + (s.overall_score || 0), 0) / filteredScores.length)
    : 0;
  const highMatches = filteredScores.filter((s) => (s.overall_score || 0) > 80).length;

  const stats = [
    { label: "Total Candidates", value: totalCandidates, icon: Users, color: "text-primary" },
    { label: "Avg Match Score", value: `${avgScore}%`, icon: TrendingUp, color: "text-success" },
    { label: "High Matches (>80)", value: highMatches, icon: FileText, color: "text-warning" },
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Screen and analyze candidate resumes with AI</p>
          </div>
          {roles.length > 0 && (
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Select job role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>{role.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
        selectedRole={selectedRole}
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

