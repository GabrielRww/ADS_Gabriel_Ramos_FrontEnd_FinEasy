import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, Plus, TrendingDown, TrendingUp, Wallet, Shield, User as UserIcon, Eye, TrendingUpIcon } from "lucide-react";
import { toast } from "sonner";
import TransactionForm from "@/components/TransactionForm";
import TransactionHistory from "@/components/TransactionHistory";
import AIChat from "@/components/AIChat";
import MonthlyReport from "@/components/MonthlyReport";
import FinancialCharts from "@/components/FinancialCharts";
import { CreditCards } from "@/components/CreditCards";
import { FinancialGoals } from "@/components/FinancialGoals";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, History, Brain, Download } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const { data: userRole } = useUserRole();

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        
        // Check if user is admin and redirect to admin page
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        
        if (roleData?.role === 'admin') {
          navigate("/admin");
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        
        // Check if user is admin and redirect to admin page
        setTimeout(async () => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .single();
          
          if (roleData?.role === 'admin') {
            navigate("/admin");
          }
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const { data: transactions = [], refetch } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, categories(*)")
        .order("date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: creditCards = [] } = useQuery({
    queryKey: ["credit-cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_cards")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/");
  };

  // Calculate totals
  const receitas = transactions
    .filter((t) => t.type === "receita")
    .reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0);

  // Incluir gastos dos cartões de crédito nas despesas
  const despesasTransacoes = transactions
    .filter((t) => t.type === "despesa")
    .reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0);
  
  const despesasCartoes = creditCards.reduce((sum, card) => sum + Number(card.used_limit), 0);
  
  const despesas = despesasTransacoes + despesasCartoes;

  const saldo = receitas - despesas;

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Controle Financeiro
                  </h1>
                  {userRole && (
                    <Badge 
                      variant={userRole === "admin" ? "default" : "secondary"}
                      className="flex items-center gap-1 animate-fade-in"
                    >
                      {userRole === "admin" && <Shield className="h-3 w-3" />}
                      {userRole === "user" && <UserIcon className="h-3 w-3" />}
                      {userRole === "admin" ? "Admin" : "Usuário"}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Olá, {profile?.full_name || user.email}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => navigate("/exchange-history")}
                className="hover:bg-primary/10 transition-colors"
              >
                <TrendingUpIcon className="mr-2 h-4 w-4" />
                Cotações
              </Button>
              <ThemeToggle />
              <Button variant="outline" onClick={handleLogout} className="hover:bg-destructive hover:text-destructive-foreground transition-colors">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6 animate-fade-in">
        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card variant="glass" className="border-2 border-primary/20 hover:border-primary/40 transition-all hover:shadow-xl hover:scale-[1.02] duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Atual
              </CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold transition-colors ${saldo >= 0 ? "text-success" : "text-destructive"}`}>
                R$ {saldo.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {saldo >= 0 ? "Situação positiva" : "Atenção ao saldo"}
              </p>
            </CardContent>
          </Card>

          <Card variant="glass" className="border-2 border-success/20 hover:border-success/40 transition-all hover:shadow-xl hover:scale-[1.02] duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receitas
              </CardTitle>
              <div className="p-2 bg-success/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                R$ {receitas.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total de entradas
              </p>
            </CardContent>
          </Card>

          <Card variant="glass" className="border-2 border-destructive/20 hover:border-destructive/40 transition-all hover:shadow-xl hover:scale-[1.02] duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Despesas
              </CardTitle>
              <div className="p-2 bg-destructive/10 rounded-lg">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">
                R$ {despesas.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total de saídas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Add Transaction Button */}
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Transação
          </Button>
        </div>

        {/* Transaction Form */}
        {showForm && (
          <TransactionForm
            onSuccess={() => {
              setShowForm(false);
              setEditingTransaction(null);
              refetch();
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingTransaction(null);
            }}
            editingTransaction={editingTransaction}
          />
        )}

        {/* Tabs Navigation */}
        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto">
            <TabsTrigger value="transactions" className="flex items-center gap-2 py-3">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Transações</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2 py-3">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Relatórios</span>
            </TabsTrigger>
            <TabsTrigger value="cards" className="flex items-center gap-2 py-3">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Cartões</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center gap-2 py-3">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Metas</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2 py-3">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Análise IA</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2 py-3">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Relatorios</span>
            </TabsTrigger>
          </TabsList>

          {/* Transaction History Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <TransactionHistory 
              transactions={transactions} 
              onUpdate={refetch}
              onEdit={(transaction) => {
                setEditingTransaction(transaction);
                setShowForm(true);
              }}
            />
          </TabsContent>

          {/* Reports and Charts Tab */}
          <TabsContent value="reports" className="space-y-6">
            <FinancialCharts transactions={transactions} creditCards={creditCards} />
          </TabsContent>

          {/* Credit Cards Tab */}
          <TabsContent value="cards" className="space-y-6">
            <CreditCards />
          </TabsContent>

          {/* Financial Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            <FinancialGoals transactions={transactions} creditCards={creditCards} />
          </TabsContent>

          {/* AI Analysis Tab */}
          <TabsContent value="ai" className="space-y-6">
            <AIChat />
          </TabsContent>

          {/* Monthly Report Tab */}
          <TabsContent value="email" className="space-y-6">
            <MonthlyReport transactions={transactions} creditCards={creditCards} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;