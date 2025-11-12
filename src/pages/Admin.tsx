import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UsersList } from "@/components/admin/UsersList";
import { AccessLogs } from "@/components/admin/AccessLogs";
import { UserPreferences } from "@/components/admin/UserPreferences";
import { useToast } from "@/hooks/use-toast";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: userRole, isLoading } = useUserRole();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Acesso negado",
          description: "Você precisa estar logado para acessar esta página.",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }
      setUser(user);

      // Log access
      await supabase.from("user_access_logs").insert({
        user_id: user.id,
        action: "admin_page_access",
        ip_address: null,
        user_agent: navigator.userAgent,
      });
    };

    checkAuth();
  }, [navigate, toast]);

  useEffect(() => {
    // Check if user is admin
    if (!isLoading && userRole !== 'admin') {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [userRole, isLoading, navigate, toast]);

  if (isLoading || !user) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (userRole !== 'admin') {
    return null;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Painel Administrativo</h1>
        <p className="text-muted-foreground">
          Gerencie usuários, permissões e visualize logs de acesso
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Área Restrita</AlertTitle>
        <AlertDescription>
          Esta página é acessível apenas para administradores. Todas as ações são registradas.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="logs">Histórico de Acesso</TabsTrigger>
          <TabsTrigger value="preferences">Preferências</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Usuários</CardTitle>
              <CardDescription>
                Visualize e gerencie os usuários do sistema e suas permissões
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsersList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Acesso</CardTitle>
              <CardDescription>
                Visualize todos os acessos ao sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AccessLogs />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Usuários</CardTitle>
              <CardDescription>
                Visualize as preferências de exibição dos usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserPreferences />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
