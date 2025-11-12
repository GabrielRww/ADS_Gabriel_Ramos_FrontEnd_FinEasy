import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X } from "lucide-react";

export const UserPreferences = () => {
  const { data: preferences, isLoading } = useQuery({
    queryKey: ["user-preferences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_preferences")
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .order("created_at", { ascending: false });

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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuário</TableHead>
            <TableHead>Tema</TableHead>
            <TableHead>Idioma</TableHead>
            <TableHead>Moeda</TableHead>
            <TableHead>Formato de Data</TableHead>
            <TableHead>Notificações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {preferences?.map((pref) => (
            <TableRow key={pref.id}>
              <TableCell className="font-medium">
                {(pref.profiles as any)?.full_name || 'Usuário desconhecido'}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{pref.theme}</Badge>
              </TableCell>
              <TableCell>{pref.language}</TableCell>
              <TableCell>{pref.currency_display}</TableCell>
              <TableCell>{pref.date_format}</TableCell>
              <TableCell>
                {pref.notifications_enabled ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-red-500" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
