import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LogOut, 
  Plus, 
  TrendingDown, 
  TrendingUp, 
  Wallet, 
  Shield, 
  User as UserIcon, 
  Eye,
  BarChart3,
  History,
  Brain,
  Mail
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";

// Components
import TransactionForm from "@/components/TransactionForm";
import TransactionHistory from "@/components/TransactionHistory";
import AIChat from "@/components/AIChat";
import MonthlyReport from "@/components/MonthlyReport";
import FinancialCharts from "@/components/FinancialCharts";

// Types
interface Transaction {
  id: string;
  type: "receita" | "despesa";
  amount: number;
  amount_brl?: number;
  date: string;
  categories?: {
    name: string;
  };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const { data: userRole } = useUserRole();

  // Authentication Effect
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Data Queries
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

  // Calculate Financial Totals
  const financialSummary = {
    receitas: transactions
      .filter((t) => t.type === "receita")
      .reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0),
    
    despesas: transactions
      .filter((t) => t.type === "despesa")
      .reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0),
  };

  const saldo = financialSummary.receitas - financialSummary.despesas;

  // Event Handlers
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/");
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingTransaction(null);
    refetch();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTransaction(null);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  // Role Badge Component
  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { icon: Shield, text: "Admin", variant: "default" as const },
      user: { icon: UserIcon, text: "Usuário", variant: "secondary" as const },
      guest: { icon: Eye, text: "Convidado", variant: "outline" as const },
    };

    const config = roleConfig[role as keyof typeof roleConfig];
    if (!config) return null;

    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  // Loading State
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header Section */}
      <header className="bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground p-4 shadow-lg border-b border-primary-foreground/10">
        <div className="container mx-auto flex justify-between items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Controle Financeiro</h1>
              {userRole && getRoleBadge(userRole)}
            </div>
            <p className="text-sm opacity-90">
              Olá, {profile?.full_name || user.email}
            </p>
          </div>
          <Button variant="secondary" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6">
        {/* Financial Summary Cards */}
        <section className="grid md:grid-cols-3 gap-4">
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
                R$ {financialSummary.receitas.toFixed(2)}
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
                R$ {financialSummary.despesas.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total de saídas
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Add Transaction Button */}
        <section className="flex justify-end">
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Transação
          </Button>
        </section>

        {/* Transaction Form */}
        {showForm && (
          <section>
            <TransactionForm
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
              editingTransaction={editingTransaction}
            />
          </section>
        )}

        {/* Main Content Tabs */}
        <section>
          <Tabs defaultValue="transactions" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto">
              <TabsTrigger value="transactions" className="flex items-center gap-2 py-3">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Transações</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2 py-3">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Relatórios</span>
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

            <TabsContent value="transactions" className="space-y-6">
              <TransactionHistory 
                transactions={transactions} 
                onUpdate={refetch}
                onEdit={handleEditTransaction}
              />
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <FinancialCharts transactions={transactions} />
            </TabsContent>

            <TabsContent value="ai" className="space-y-6">
              <AIChat />
            </TabsContent>

            <TabsContent value="email" className="space-y-6">
              <MonthlyReport />
            </TabsContent>
          </Tabs>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;