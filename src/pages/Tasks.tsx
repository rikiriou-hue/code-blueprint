import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, CheckCircle2, Circle, Clock, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

type TaskStatus = "backlog" | "todo" | "in_progress" | "done";
type TaskPriority = "low" | "medium" | "high" | "urgent";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  project_id: string | null;
  created_at: string;
}

const statusConfig: { value: TaskStatus; label: string; icon: typeof Circle; color: string }[] = [
  { value: "backlog", label: "Backlog", icon: Archive, color: "text-muted-foreground" },
  { value: "todo", label: "To Do", icon: Circle, color: "text-info" },
  { value: "in_progress", label: "In Progress", icon: Clock, color: "text-warning" },
  { value: "done", label: "Done", icon: CheckCircle2, color: "text-success" },
];

const Tasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");

  const fetchTasks = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setTasks((data as Task[]) ?? []);
  };

  useEffect(() => { fetchTasks(); }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title,
      description: description || null,
      status,
      priority,
      due_date: dueDate || null,
    });
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tugas dibuat!" });
      setTitle(""); setDescription(""); setStatus("todo"); setPriority("medium"); setDueDate("");
      setOpen(false);
      fetchTasks();
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await supabase.from("tasks").update({
      status: newStatus,
      completed_at: newStatus === "done" ? new Date().toISOString() : null,
    }).eq("id", taskId);
    fetchTasks();
  };

  const handleDelete = async (taskId: string) => {
    await supabase.from("tasks").delete().eq("id", taskId);
    fetchTasks();
  };

  const filteredTasks = filterStatus === "all" ? tasks : tasks.filter(t => t.status === filterStatus);

  const priorityBadge: Record<string, string> = {
    urgent: "bg-destructive/10 text-destructive",
    high: "bg-warning/10 text-warning",
    medium: "bg-info/10 text-info",
    low: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tugas</h1>
          <p className="text-muted-foreground mt-1">Kelola semua tugas kamu di sini.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Tugas Baru</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Tugas Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Judul</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nama tugas..." required />
              </div>
              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detail tugas..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={v => setStatus(v as TaskStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusConfig.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioritas</Label>
                  <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tenggat</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
              <Button type="submit" className="w-full">Simpan</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant={filterStatus === "all" ? "default" : "secondary"} onClick={() => setFilterStatus("all")}>Semua</Button>
        {statusConfig.map(s => (
          <Button key={s.value} size="sm" variant={filterStatus === s.value ? "default" : "secondary"} onClick={() => setFilterStatus(s.value)}>
            {s.label}
          </Button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-12 text-center text-muted-foreground">
              Belum ada tugas. Klik "Tugas Baru" untuk memulai!
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => {
            const sc = statusConfig.find(s => s.value === task.status)!;
            const Icon = sc.icon;
            return (
              <div key={task.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:shadow-sm transition-all group">
                <button onClick={() => handleStatusChange(task.id, task.status === "done" ? "todo" : "done")} className="shrink-0">
                  <Icon className={cn("h-5 w-5 transition-colors", sc.color)} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cn("font-medium text-sm", task.status === "done" && "line-through text-muted-foreground")}>{task.title}</p>
                  {task.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>}
                </div>
                {task.due_date && (
                  <span className="text-xs text-muted-foreground hidden sm:block">{new Date(task.due_date).toLocaleDateString("id-ID")}</span>
                )}
                <span className={cn("text-xs px-2 py-1 rounded-full font-medium hidden sm:block", priorityBadge[task.priority])}>
                  {task.priority}
                </span>
                <Select value={task.status} onValueChange={v => handleStatusChange(task.id, v as TaskStatus)}>
                  <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusConfig.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDelete(task.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Tasks;
