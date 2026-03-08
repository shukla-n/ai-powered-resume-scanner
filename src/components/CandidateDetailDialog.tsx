import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Mail, Phone, Linkedin, GraduationCap, Briefcase } from "lucide-react";

interface MatchScore {
  technical_score: number | null;
  soft_skills_score: number | null;
  experience_score: number | null;
  leadership_score: number | null;
  education_score: number | null;
  overall_score: number | null;
  fit_summary: string | null;
  contact_info: any;
}

interface Candidate {
  id: string;
  name: string;
  email: string | null;
  university: string | null;
  total_years_experience: number | null;
}

interface Props {
  candidate: Candidate;
  matchScore: MatchScore | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CandidateDetailDialog({ candidate, matchScore, open, onOpenChange }: Props) {
  const radarData = matchScore ? [
    { metric: "Technical Proficiency", value: matchScore.technical_score || 0, fullMark: 100 },
    { metric: "Leadership", value: matchScore.leadership_score || 0, fullMark: 100 },
    { metric: "Education Match", value: matchScore.education_score || 0, fullMark: 100 },
    { metric: "Project Impact", value: matchScore.experience_score || 0, fullMark: 100 },
    { metric: "Soft Skills", value: matchScore.soft_skills_score || 0, fullMark: 100 },
  ] : [];

  const overallScore = matchScore?.overall_score || 0;
  const scoreColor = overallScore >= 80 ? "score-badge-high" : overallScore >= 50 ? "score-badge-medium" : "score-badge-low";
  const contactInfo = matchScore?.contact_info || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-xl">{candidate.name}</span>
            {matchScore && (
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${scoreColor}`}>
                {overallScore}% Match
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Radar Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Skill Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {matchScore ? (
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    />
                    <Radar
                      name="Score"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                  No analysis available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary & Contact */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">AI Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">
                  {matchScore?.fit_summary || "No AI summary available. Upload a resume and analyze it against a job description."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Candidate Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {candidate.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{candidate.email}</span>
                  </div>
                )}
                {contactInfo.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{contactInfo.phone}</span>
                  </div>
                )}
                {contactInfo.linkedin && (
                  <div className="flex items-center gap-2 text-sm">
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                    <span>{contactInfo.linkedin}</span>
                  </div>
                )}
                {candidate.university && (
                  <div className="flex items-center gap-2 text-sm">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span>{candidate.university}</span>
                  </div>
                )}
                {candidate.total_years_experience != null && (
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{candidate.total_years_experience} years experience</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
