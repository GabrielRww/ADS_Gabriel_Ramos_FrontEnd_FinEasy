import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, CheckCircle, XCircle } from "lucide-react";

const AdminSetup = () => {
  const [email, setEmail] = useState("gabrieelramoswendl4nd@gmail.com");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [adminPromoted, setAdminPromoted] = useState(false);

  const createAdminAccount = async () => {
    setLoading(true);
    try {
      console.log("Tentando criar conta para:", email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: "Gabriel Ramos - Admin"
          }
        }
      });

      console.log("Resultado signup:", { data, error });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          toast.info("Conta já existe! Tentando fazer login e promover...");
          setAccountCreated(true);
          await promoteToAdmin();
          return;
        }
        throw error;
      }

      if (data.user) {
        toast.success("Conta criada com sucesso!");
        setAccountCreated(true);
        
        
        setTimeout(() => {
          promoteToAdmin();
        }, 1000);
      }
      
    } catch (error: unknown) {
      console.error('Erro ao criar conta:', error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao criar conta";
      toast.error(`Erro: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const promoteToAdmin = async () => {
    setLoading(true);
    try {
      console.log("Tentando fazer login...");
      
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      console.log("Resultado login:", { loginData, loginError });

      if (loginError) {
        
        console.log("Erro no login, tentando obter sessão atual...");
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData.session?.user) {
          console.log("Usuário encontrado na sessão atual");
          const userId = sessionData.session.user.id;
          await createAdminRole(userId);
          return;
        }
        
        
        console.log("Tentando criar role através do email...");
        await createAdminRoleByEmail();
        return;
      }
      
      if (!loginData.user) {
        throw new Error("Usuário não encontrado após login");
      }

      const userId = loginData.user.id;
      await createAdminRole(userId);
      
    } catch (error: unknown) {
      console.error('Erro ao promover usuário:', error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao promover usuário";
      toast.error(`Erro: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const createAdminRole = async (userId: string) => {
    console.log("User ID obtido:", userId);

    
    console.log("Verificando role existente...");
    const { data: existingRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    console.log("Role existente:", { existingRole, roleError });

    if (existingRole) {
      console.log("Atualizando role existente...");
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', userId);

      if (updateError) {
        throw new Error(`Erro ao atualizar role: ${updateError.message}`);
      }
    } else {
      console.log("Criando novo role...");
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (insertError) {
        throw new Error(`Erro ao inserir role: ${insertError.message}`);
      }
    }

    toast.success("✅ Usuário promovido para administrador com sucesso!");
    toast.info("🚀 Você pode agora acessar /admin para gerenciar o sistema.");
    setAdminPromoted(true);
  };

  const createAdminRoleByEmail = async () => {
    try {
      
      const { data, error } = await supabase.rpc('create_admin_by_email', {
        admin_email: email
      });

      if (error) {
        throw error;
      }

      toast.success("✅ Usuário promovido para administrador com sucesso!");
      toast.info("🚀 Faça login normalmente em /auth com suas credenciais.");
      setAdminPromoted(true);
    } catch (error) {
      console.error('Erro ao criar admin por email:', error);
      toast.error("Erro ao promover usuário. Tente fazer login manualmente em /auth primeiro.");
    }
  };

  const testConnection = async () => {
    try {
      const { data, error } = await supabase.from('user_roles').select('count', { count: 'exact' });
      if (error) throw error;
      toast.success("✅ Conexão com banco funcionando!");
    } catch (error) {
      console.error('Erro de conexão:', error);
      toast.error("❌ Erro de conexão com banco de dados");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Setup Administrativo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Use este componente apenas para criar o primeiro administrador. 
              Remova-o após o setup inicial por segurança.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={testConnection}
            variant="outline"
            className="w-full"
          >
            Testar Conexão com Banco
          </Button>
          
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email do administrador</Label>
            <Input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-password">Senha</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {accountCreated ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-400" />}
              <span className={accountCreated ? "text-green-700" : "text-gray-500"}>
                Conta criada
              </span>
            </div>
            <div className="flex items-center gap-2">
              {adminPromoted ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-400" />}
              <span className={adminPromoted ? "text-green-700" : "text-gray-500"}>
                Promovido para admin
              </span>
            </div>
          </div>

          {!accountCreated ? (
            <Button 
              onClick={createAdminAccount} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Criando conta..." : "1. Criar Conta de Administrador"}
            </Button>
          ) : !adminPromoted ? (
            <Button 
              onClick={promoteToAdmin} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Promovendo..." : "2. Promover para Admin"}
            </Button>
          ) : (
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.href = '/admin'}
                className="w-full"
              >
                🚀 Acessar Painel Admin
              </Button>
              <Button 
                onClick={() => window.location.href = '/dashboard'}
                variant="outline"
                className="w-full"
              >
                📊 Ir para Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSetup;