import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, Plus, Copy, Eye, EyeOff, Trash2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Device {
  id: string;
  device_name: string;
  device_fingerprint: string;
  api_key: string;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
}

const DeviceManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [deviceFingerprint, setDeviceFingerprint] = useState("");
  const [creating, setCreating] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const fetchDevices = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("devices").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setDevices((data ?? []) as Device[]);
    setLoading(false);
  };

  useEffect(() => { fetchDevices(); }, [user]);

  const createDevice = async () => {
    if (!user || !deviceName.trim() || !deviceFingerprint.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("devices").insert({
      user_id: user.id,
      device_name: deviceName.trim(),
      device_fingerprint: deviceFingerprint.trim(),
    });

    if (error) {
      toast({ title: "Gagal mendaftarkan device", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Device terdaftar!", description: "Salin API key untuk konfigurasi di Android app." });
      setDeviceName("");
      setDeviceFingerprint("");
      setShowForm(false);
      fetchDevices();
    }
    setCreating(false);
  };

  const toggleDevice = async (id: string, active: boolean) => {
    await supabase.from("devices").update({ is_active: active }).eq("id", id);
    fetchDevices();
  };

  const deleteDevice = async (id: string) => {
    if (!confirm("Hapus device ini? Semua transaksi dari device ini juga akan terhapus.")) return;
    await supabase.from("devices").delete().eq("id", id);
    toast({ title: "Device dihapus" });
    fetchDevices();
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "API Key disalin ke clipboard" });
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kelola Perangkat</h1>
          <p className="text-muted-foreground mt-1">Daftarkan dan kelola perangkat Android yang terhubung.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Device
        </Button>
      </div>

      {showForm && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Daftarkan Device Baru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="device-name">Nama Device</Label>
              <Input id="device-name" placeholder="e.g. Samsung Galaxy S24" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="device-fp">Device Fingerprint</Label>
              <Input id="device-fp" placeholder="Unique identifier dari Android app" value={deviceFingerprint} onChange={(e) => setDeviceFingerprint(e.target.value)} maxLength={200} />
              <p className="text-xs text-muted-foreground">Gunakan Android ID atau fingerprint unik dari companion app.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={createDevice} disabled={creating || !deviceName.trim() || !deviceFingerprint.trim()}>
                {creating ? "Mendaftarkan..." : "Daftarkan"}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Perangkat Terdaftar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : devices.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Belum ada perangkat terdaftar.</p>
          ) : (
            <div className="space-y-4">
              {devices.map((device) => (
                <div key={device.id} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{device.device_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Didaftarkan: {format(new Date(device.created_at), "dd MMM yyyy", { locale: localeId })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{device.is_active ? "Aktif" : "Nonaktif"}</span>
                        <Switch checked={device.is_active} onCheckedChange={(v) => toggleDevice(device.id, v)} />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDevice(device.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
                    <code className="text-xs flex-1 font-mono truncate">
                      {visibleKeys.has(device.id) ? device.api_key : "••••••••••••••••••••••••"}
                    </code>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleKeyVisibility(device.id)}>
                      {visibleKeys.has(device.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyKey(device.api_key)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeviceManagement;
