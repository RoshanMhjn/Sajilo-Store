import { useEffect, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

async function request(path: string) {
  const response = await fetch(`/api${path}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("store_auth_token") ?? ""}`,
    },
  });
  if (!response.ok)
    throw new Error(
      (await response.json().catch(() => null))?.error ??
        "Could not load audit logs",
    );
  return response.json();
}

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    request(
      `/audit-logs?page=${page}&limit=20&search=${encodeURIComponent(search)}`,
    )
      .then((data) => {
        setLogs(data.items);
        setTotal(data.total);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load audit logs",
        ),
      )
      .finally(() => setLoading(false));
  }, [page, search]);

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground">
            Review sensitive changes and financial actions.
          </p>
        </div>
        <Badge variant="outline">{total} events</Badge>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search actions"
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">
              Loading audit events...
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-destructive">{error}</div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No audit events match your search.
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => (
                <button
                  key={log.id}
                  className="w-full text-left px-6 py-4 hover:bg-muted/50"
                  onClick={() => setSelected(log)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium capitalize">
                      {log.action.replaceAll("_", " ")} {log.entityType}
                    </div>
                    <time className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </time>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {log.userName ?? "System"}{" "}
                    {log.entityId ? `· #${log.entityId}` : ""}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {total > 20 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page * 20 >= total}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit event details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-muted-foreground">User</div>
                  <div>{selected.userName ?? "System"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Time</div>
                  <div>{new Date(selected.createdAt).toLocaleString()}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-medium mb-2">Before</div>
                  <pre className="rounded-md bg-muted p-3 overflow-auto text-xs">
                    {JSON.stringify(selected.oldValue ?? {}, null, 2)}
                  </pre>
                </div>
                <div>
                  <div className="font-medium mb-2">After</div>
                  <pre className="rounded-md bg-muted p-3 overflow-auto text-xs">
                    {JSON.stringify(selected.newValue ?? {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
