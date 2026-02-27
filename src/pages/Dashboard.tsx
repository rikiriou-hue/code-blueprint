import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Clock, AlertTriangle, FolderKanban } from "lucide-react";

interface Stats {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  projects: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ total: 0, todo: 0, inProgress: 0, done: 0, projects: 0 });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [tasksRes, projectsRes] = await Promise.all([
        supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("projects").select("id").eq("user_id", user.id),
      ]);

      const tasks = tasksRes.data ?? [];
      setStats({
        total: tasks.length,
        todo: tasks.filter(t => t.status === "todo").length,
        inProgress: tasks.filter(t => t.status === "in_progress").length,
        done: tasks.filter(t => t.status === "done").length,
        projects: projectsRes.data?.length ?? 0,
      });
      setRecentTasks(tasks.slice(0, 5));
    };

    fetchData();
  }, [user]);

  const statCards = [
    { label: "Total Tugas", value: stats.total, icon: CheckSquare, color: "text-primary" },
    { label: "Dalam Proses", value: stats.inProgress, icon: Clock, color: "text-warning" },
    { label: "Belum Dikerjakan", value: stats.todo, icon: AlertTriangle, color: "text-info" },
    { label: "Proyek", value: stats.projects, icon: FolderKanban, color: "text-success" },
  ];

  const priorityStyles: Record<string, string> = {
    urgent: "bg-destructive/10 text-destructive",
    high: "bg-warning/10 text-warning",
    medium: "bg-info/10 text-info",
    low: "bg-muted text-muted-foreground",
  };

  const statusLabels: Record<string, string> = {
    backlog: "Backlog",
    todo: "To Do",
    in_progress: "In Progress",
    done: "Done",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Selamat datang kembali! Berikut ringkasan aktivitas kamu.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="glass">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={cn("h-4 w-4", s.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Tugas Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTasks.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">Belum ada tugas. Buat tugas pertama kamu!</p>
          ) : (
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{statusLabels[task.status] ?? task.status}</p>
                  </div>
                  <span className={cn("text-xs px-2 py-1 rounded-full font-medium", priorityStyles[task.priority] ?? priorityStyles.medium)}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
