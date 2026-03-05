import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Loader2 } from "lucide-react";

interface CandidateWithScore {
  id: string;
  name: string;
  email: string | null;
  university: string | null;
  total_years_experience: number | null;
  created_at: string;
  matchScore?: {
    overall_score: number | null;
  } | null;
}

interface CandidateTableProps {
  candidates: CandidateWithScore[];
  loading: boolean;
  onCandidateClick: (candidate: CandidateWithScore) => void;
}

function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return <Badge variant="secondary">Pending</Badge>;
  const cls = score >= 80 ? "score-badge-high" : score >= 50 ? "score-badge-medium" : "score-badge-low";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {score}%
    </span>
  );
}

export function CandidateTable({ candidates, loading, onCandidateClick }: CandidateTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground">No candidates yet. Upload a resume to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Candidate</TableHead>
            <TableHead>University</TableHead>
            <TableHead>Experience</TableHead>
            <TableHead>AI Match Score</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((c) => (
            <TableRow key={c.id} className="cursor-pointer" onClick={() => onCandidateClick(c)}>
              <TableCell>
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.email || "—"}</p>
                </div>
              </TableCell>
              <TableCell className="text-sm">{c.university || "—"}</TableCell>
              <TableCell className="text-sm">{c.total_years_experience != null ? `${c.total_years_experience} yrs` : "—"}</TableCell>
              <TableCell><ScoreBadge score={c.matchScore?.overall_score} /></TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onCandidateClick(c); }}>
                  <Eye className="h-4 w-4 mr-1" /> Quick View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
