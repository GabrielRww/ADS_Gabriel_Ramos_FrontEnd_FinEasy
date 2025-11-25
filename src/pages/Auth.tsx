import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Sparkles } from "lucide-react";
import fineasyLogo from "@/assets/fineasy-logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const isRecoveryRef = useRef(false);
 
  useEffect(() => {
    // Detectar modo de recuperação pela URL (quando vindo do link do e-mail)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const urlParams = new URLSearchParams(window.location.search);
    const type = hashParams.get("type");
    const mode = urlParams.get("mode");

    if (type === "recovery" || mode === "reset") {
      isRecoveryRef.current = true;
      setIsUpdatingPassword(true);
    }

    // Ouvir mudanças de autenticação primeiro (inclui PASSWORD_RECOVERY)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event, "Session:", session);
      
      // Evento disparado pelo link de recuperação do Supabase
      if (event === "PASSWORD_RECOVERY") {
        isRecoveryRef.current = true;
        setIsUpdatingPassword(true);
        toast.success("Digite sua nova senha abaixo.");
        return;
      }
      
      if (session && event === "SIGNED_IN") {
        // Se estamos em modo de recuperação, não redirecionar automaticamente
        if (isRecoveryRef.current || isUpdatingPassword) {
          return;
        }

        // Deferir a checagem de papel para não bloquear o evento de auth
        setTimeout(async () => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .single();
          
          if (roleData?.role === 'admin') {
            navigate("/admin");
          } else {
            navigate("/dashboard");
          }
        }, 0);
      }
    });
 
    // Verificar sessão existente (mas evitar redirecionar em modo recuperação)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session && !isUpdatingPassword && !isRecoveryRef.current) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        
        if (roleData?.role === 'admin') {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      }
    });
 
    return () => subscription.unsubscribe();
  }, [navigate, isUpdatingPassword]);
 
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
 
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: fullName,
          },
        },
      });
 
      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("Este e-mail já está cadastrado. Tente fazer login.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Conta criada com sucesso! Verifique seu e-mail para confirmar.");
      }
    } catch (error) {
      toast.error("Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };
 
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
 
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
 
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("E-mail ou senha incorretos.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Login realizado com sucesso!");
      }
    } catch (error) {
      toast.error("Erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };
 
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
 
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });
 
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
        setIsResettingPassword(false);
        setEmail("");
      }
    } catch (error) {
      toast.error("Erro ao enviar e-mail de recuperação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };
 
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
 
    if (newPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
 
    setLoading(true);
 
    try {
      // Verificar se temos sessão válida primeiro
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast.error("Sessão expirada. Por favor, solicite um novo link de recuperação.");
        setIsUpdatingPassword(false);
        setLoading(false);
        return;
      }
 
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
 
      if (error) {
        if (error.message.includes("session")) {
          toast.error("Sessão expirada. Por favor, solicite um novo link de recuperação.");
          setIsUpdatingPassword(false);
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Senha atualizada com sucesso! Faça login com sua nova senha.");
        setIsUpdatingPassword(false);
        setNewPassword("");
        setConfirmPassword("");
        // Deslogar após reset para forçar login com a nova senha
        await supabase.auth.signOut();
        // Limpar URL e voltar para login
        window.history.replaceState({}, document.title, '/auth');
      }
    } catch (error) {
      toast.error("Erro ao atualizar senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <div className="min-h-screen flex items-center justify-center bg-background transition-colors duration-300 p-4 relative">
      <Link to="/landing" className="absolute top-4 left-4">
        <Button variant="ghost" size="sm" className="hover:scale-110 transition-transform">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </Link>
 
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <Card variant="glass-strong" className="w-full max-w-md animate-fade-in shadow-2xl border-2">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center animate-fade-in">
            <img 
              src={fineasyLogo} 
              alt="Fineasy Logo" 
              className="w-16 h-16 hover:scale-110 transition-transform duration-300"
            />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center justify-center gap-2">
              <Sparkles className="text-primary h-6 w-6" />
              Fineasy
            </CardTitle>
            <CardDescription className="mt-2">
              {isUpdatingPassword ? "Redefinir sua senha" : "Entre ou crie sua conta"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="animate-fade-in">
          {isUpdatingPassword ? (
            <div className="space-y-4">
              <div className="text-center space-y-2 mb-4">
                <h3 className="text-lg font-semibold">Nova Senha</h3>
                <p className="text-sm text-muted-foreground">
                  Digite sua nova senha abaixo
                </p>
              </div>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="transition-all focus:scale-[1.02]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="transition-all focus:scale-[1.02]"
                  />
                  <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
                </div>
                <Button type="submit" className="w-full hover-scale" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    "Atualizar Senha"
                  )}
                </Button>
              </form>
            </div>
          ) : (
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" className="transition-all">Entrar</TabsTrigger>
                <TabsTrigger value="signup" className="transition-all">Criar Conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                {isResettingPassword ? (
                  <div className="space-y-4 animate-fade-in">
                    <div className="text-center space-y-2 mb-4">
                      <h3 className="text-lg font-semibold">Recuperar Senha</h3>
                      <p className="text-sm text-muted-foreground">
                        Digite seu e-mail para receber o link de recuperação
                      </p>
                    </div>
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">E-mail</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="transition-all focus:scale-[1.02]"
                        />
                      </div>
                      <Button type="submit" className="w-full hover-scale" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          "Enviar E-mail de Recuperação"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        onClick={() => {
                          setIsResettingPassword(false);
                          setEmail("");
                        }}
                      >
                        Voltar para o Login
                      </Button>
                    </form>
                  </div>
                ) : (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">E-mail</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="transition-all focus:scale-[1.02]"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Senha</Label>
                        <button
                          type="button"
                          onClick={() => setIsResettingPassword(true)}
                          className="text-xs text-primary hover:underline transition-all"
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="transition-all focus:scale-[1.02]"
                      />
                    </div>
                    <Button type="submit" className="w-full hover-scale" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        "Entrar"
                      )}
                    </Button>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="transition-all focus:scale-[1.02]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="transition-all focus:scale-[1.02]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="transition-all focus:scale-[1.02]"
                    />
                    <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
                  </div>
                  <Button type="submit" className="w-full hover-scale" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      "Criar Conta"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
 
export default Auth;
