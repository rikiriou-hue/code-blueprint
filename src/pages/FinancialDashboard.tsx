import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Smartphone,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Wifi,
  WifiOff,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, startOfDay, subDays } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Transaction {
  id: string;
  amount: number;
  transaction_type: "debit" | "credit";
  description: string | null;
  merchant: string | null;
  source_app: string | null;
  transaction_time: string;
  is_flagged: boolean;
  flag_reason: string | null;
  created_at: string;
  device_id: string;
}

interface Device {
  id: string;
  device_name: string;
  is_active: boolean;
  last_seen_at: string | null;
  api_key: string;
  created_at: string;
}

interface Summary {
  totalDebit: number;
  totalCredit: number;
  transactionCount: number;
  flaggedCount: number;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

const FinancialDashboard = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalDebit: 0, totalCredit: 0, transactionCount: 0, flaggedCount: 0 });
  const [monthlySummary, setMonthlySummary] = useState<Summary>({ totalDebit: 0, totalCredit: 0, transactionCount: 0, flaggedCount: 0 });
  const [loading, setLoading] = useState(true);

  const computeSummary = (txns: Transaction[]): Summary => ({
    totalDebit: txns.filter((t) => t.transaction_type === "debit").reduce((s, t) => s + Number(t.amount), 0),
    totalCredit: txns.filter((t) => t.transaction_type === "credit").reduce((s, t) => s + Number(t.amount), 0),
    transactionCount: txns.length,
    flaggedCount: txns.filter((t) => t.is_flagged).length,
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const today = startOfDay(new Date()).toISOString();
    const monthStart = startOfMonth(new Date()).toISOString();

    const [txnRes, monthTxnRes, devRes] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", user.id).gte("transaction_time", today).order("transaction_time", { ascending: false }),
      supabase.from("transactions").select("*").eq("user_id", user.id).gte("transaction_time", monthStart).order("transaction_time", { ascending: false }),
      supabase.from("devices").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    const todayTxns = (txnRes.data ?? []) as Transaction[];
    const monthTxns = (monthTxnRes.data ?? []) as Transaction[];

    setTransactions(monthTxns);
    setSummary(computeSummary(todayTxns));
    setMonthlySummary(computeSummary(monthTxns));
    setDevices((devRes.data ?? []) as Device[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("transactions-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions" }, (payload) => {
        const newTxn = payload.new as Transaction & { user_id: string };
        if (newTxn.user_id === user.id) {
          setTransactions((prev) => [newTxn, ...prev]);
          // Refresh summaries
          fetchData();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchData]);

  const isDeviceOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;
  };

  const statCards = [
    { label: "Pemasukan Hari Ini", value: formatCurrency(summary.totalCredit), icon: TrendingUp, colorClass: "text-success" },
    { label: "Pengeluaran Hari Ini", value: formatCurrency(summary.totalDebit), icon: TrendingDown, colorClass: "text-destructive" },
    { label: "Transaksi Hari Ini", value: summary.transactionCount.toString(), icon: RefreshCw, colorClass: "text-primary" },
    { label: "Flagged", value: summary.flaggedCount.toString(), icon: Shield, colorClass: summary.flaggedCount > 0 ? "text-warning" : "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Tracker</h1>
          <p className="text-muted-foreground mt-1">Realtime monitoring transaksi dari perangkat Anda.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="glass">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={cn("h-4 w-4", s.colorClass)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transaksi</TabsTrigger>
          <TabsTrigger value="monthly">Ringkasan Bulanan</TabsTrigger>
          <TabsTrigger value="devices">Perangkat</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-lg">Transaksi Terbaru</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">Belum ada transaksi. Hubungkan perangkat Android Anda untuk mulai tracking.</p>
              ) : (
                <div className="space-y-2">
                  {transactions.slice(0, 50).map((txn) => (
                    <div
                      key={txn.id}
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50",
                        txn.is_flagged && "border-warning/50 bg-warning/5"
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full shrink-0",
                          txn.transaction_type === "credit" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                        )}>
                          {txn.transaction_type === "credit" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">
                            {txn.merchant ?? txn.description ?? "Transaksi"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(txn.transaction_time), "dd MMM yyyy, HH:mm", { locale: localeId })}
                            {txn.source_app && <span className="ml-2 text-muted-foreground/60">via {txn.source_app}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {txn.is_flagged && (
                          <Badge variant="outline" className="border-warning text-warning text-xs" title={txn.flag_reason ?? ""}>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Flagged
                          </Badge>
                        )}
                        <span className={cn(
                          "font-semibold text-sm whitespace-nowrap",
                          txn.transaction_type === "credit" ? "text-success" : "text-destructive"
                        )}>
                          {txn.transaction_type === "credit" ? "+" : "-"}{formatCurrency(Number(txn.amount))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Summary Tab */}
        <TabsContent value="monthly">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-success" /> Total Pemasukan (Bulan Ini)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-success">{formatCurrency(monthlySummary.totalCredit)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {monthlySummary.transactionCount} transaksi
                </p>
              </CardContent>
            </Card>
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive" /> Total Pengeluaran (Bulan Ini)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-destructive">{formatCurrency(monthlySummary.totalDebit)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {monthlySummary.flaggedCount > 0 && (
                    <span className="text-warning">{monthlySummary.flaggedCount} flagged</span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-lg">Perangkat Terhubung</CardTitle>
            </CardHeader>
            <CardContent>
              {devices.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">
                  Belum ada perangkat terdaftar. Daftarkan device di halaman pengaturan.
                </p>
              ) : (
                <div className="space-y-3">
                  {devices.map((device) => {
                    const online = isDeviceOnline(device.last_seen_at);
                    return (
                      <div key={device.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div className="flex items-center gap-3">
                          <Smartphone className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{device.device_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {device.last_seen_at
                                ? `Terakhir aktif: ${format(new Date(device.last_seen_at), "dd MMM yyyy, HH:mm", { locale: localeId })}`
                                : "Belum pernah terhubung"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={device.is_active ? "default" : "secondary"} className="text-xs">
                            {device.is_active ? "Aktif" : "Nonaktif"}
                          </Badge>
                          {online ? (
                            <Wifi className="h-4 w-4 text-success" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialDashboard;
