import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

export const AccessLogs = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["access-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_access_logs")
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead>User Agent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs?.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">
                  {(log.profiles as any)?.full_name || 'Usuário desconhecido'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{log.action}</Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                </TableCell>
                <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                  {log.user_agent}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
};
