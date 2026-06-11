import { useListNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

const typeConfig: Record<string, { icon: any; color: string }> = {
  info: { icon: Info, color: "text-blue-600" },
  alert: { icon: AlertTriangle, color: "text-orange-600" },
  success: { icon: CheckCircle, color: "text-green-600" },
  sale: { icon: ShoppingCart, color: "text-purple-600" },
};

export default function Notifications() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useListNotifications();
  const markReadMut = useMarkNotificationRead();
  const markAllMut = useMarkAllNotificationsRead();

  const notifications = (data as any[]) ?? [];
  const unread = notifications.filter(n => !n.isRead).length;

  async function handleMarkRead(id: number) {
    try {
      await markReadMut.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
    } catch {}
  }

  async function handleMarkAll() {
    try {
      await markAllMut.mutateAsync();
      await qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      toast({ title: "All notifications marked as read" });
    } catch { toast({ variant: "destructive", title: "Failed to mark all read" }); }
  }

  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">{unread} unread</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAll} disabled={markAllMut.isPending}>
            <CheckCheck className="h-4 w-4 mr-2" />Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">All caught up</p>
          <p className="text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => {
            const cfg = typeConfig[n.type] ?? typeConfig.info;
            const Icon = cfg.icon;
            return (
              <Card key={n.id} className={cn("transition-colors", !n.isRead && "border-primary/30 bg-primary/5")} data-testid={`notification-${n.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("mt-0.5 shrink-0", cfg.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm font-medium", !n.isRead && "font-semibold")}>{n.title}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(n.createdAt).toLocaleDateString()}</span>
                          {!n.isRead && (
                            <button
                              onClick={() => handleMarkRead(n.id)}
                              className="text-xs text-primary hover:underline"
                              data-testid={`button-mark-read-${n.id}`}
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
