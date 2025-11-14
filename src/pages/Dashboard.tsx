import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, Plus, TrendingDown, TrendingUp, Wallet, Shield, User as UserIcon, Eye } from "lucide-react";
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
import { BarChart3, History, Brain, Mail } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground p-4 shadow-lg border-b border-primary-foreground/10">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Controle Financeiro</h1>
              {userRole && (
                <Badge 
                  variant={userRole === 'admin' ? 'default' : userRole === 'user' ? 'secondary' : 'outline'}
                  className="flex items-center gap-1"
                >
                  {userRole === 'admin' && <Shield className="h-3 w-3" />}
                  {userRole === 'user' && <UserIcon className="h-3 w-3" />}
                  {userRole === 'admin' ? 'Admin' : 'Usuário'}
                </Badge>
              )}
            </div>
            <p className="text-sm opacity-90">Olá, {profile?.full_name || user.email}</p>
          </div>
          <Button variant="secondary" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>

      <div className="container mx-auto p-4 space-y-6">
        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-2 border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Atual
              </CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {saldo.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {saldo >= 0 ? 'Situação positiva' : 'Atenção ao saldo'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-500/20 hover:border-green-500/40 transition-all hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receitas
              </CardTitle>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                R$ {receitas.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total de entradas
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-500/20 hover:border-red-500/40 transition-all hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Despesas
              </CardTitle>
              <div className="p-2 bg-red-500/10 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
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
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Relatório Email</span>
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
            <MonthlyReport />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;