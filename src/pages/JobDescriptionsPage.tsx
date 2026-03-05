import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface JobDescription {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
}

export default function JobDescriptionsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchJobs = async () => {
    if (!user) return;
    const { data } = await supabase.from("job_descriptions").select("*").order("created_at", { ascending: false });
    if (data) setJobs(data);
    setLoading(false);
  };

  useEffect(() => { fetchJobs(); }, [user]);

  const handleCreate = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("job_descriptions").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Job description created");
      setTitle("");
      setDescription("");
      setDialogOpen(false);
      fetchJobs();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("job_descriptions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      fetchJobs();
    }
  };

  return (
    <DashboardLayout
      headerActions={
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> New Job Role
        </Button>
      }
    >
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Job Descriptions</h1>
          <p className="text-sm text-muted-foreground">Manage the job roles you're screening for</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>No job descriptions yet. Create one to start screening.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <Card key={job.id}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <CardTitle className="text-base">{job.title}</CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(job.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">{job.description || "No description provided."}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Job Role</DialogTitle>
            <DialogDescription>Add a new job description to screen candidates against</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input placeholder="e.g. Frontend Intern" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe the role requirements..." value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
            </div>
            <Button onClick={handleCreate} disabled={saving || !title.trim()} className="w-full">
              {saving ? <Loader2 className="animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Job Role
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
