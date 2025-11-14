import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Target, Calendar, TrendingUp, LineChart as LineChartIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format, differenceInMonths, eachMonthOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

interface FinancialGoal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  monthly_contribution: number;
  completed: boolean;
  created_at: string;
}

interface Transaction {
  id: string;
  date: string;
  type: string;
  amount: number;
  amount_brl: number | null;
}

interface CreditCard {
  id: string;
  used_limit: number;
  created_at: string;
}

interface FinancialGoalsProps {
  transactions?: Transaction[];
  creditCards?: CreditCard[];
}

export const FinancialGoals = ({ transactions: propTransactions = [], creditCards: propCreditCards = [] }: FinancialGoalsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    goal_name: "",
    goal_type: "",
    target_amount: "",
    current_amount: "",
    target_date: "",
    monthly_contribution: "",
  });

  const { data: goals, isLoading } = useQuery({
    queryKey: ["financial-goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_goals")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as FinancialGoal[];
    },
  });

  const { data: fetchedTransactions } = useQuery({
    queryKey: ["transactions-for-goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: propTransactions.length === 0,
  });

  const { data: fetchedCreditCards } = useQuery({
    queryKey: ["credit-cards-for-goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_cards")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: propCreditCards.length === 0,
  });

  const transactions = propTransactions.length > 0 ? propTransactions : (fetchedTransactions || []);
  const creditCards = propCreditCards.length > 0 ? propCreditCards : (fetchedCreditCards || []);

  // Calcula automaticamente o progresso das metas baseado nas transações
  const calculateGoalProgress = (goal: FinancialGoal) => {
    if (!transactions || transactions.length === 0) return goal.current_amount;

    // Filtra transações desde a criação da meta
    const goalDate = new Date(goal.created_at);
    const relevantTransactions = transactions.filter(t => new Date(t.date) >= goalDate);

    // Calcula total de receitas e despesas desde a criação da meta
    const totalReceitas = relevantTransactions
      .filter(t => t.type === "receita")
      .reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0);
    
    const despesasTransacoes = relevantTransactions
      .filter(t => t.type === "despesa")
      .reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0);

    // Adicionar gastos dos cartões de crédito criados após a meta
    const despesasCartoes = creditCards
      .filter(card => new Date(card.created_at) >= goalDate)
      .reduce((sum, card) => sum + Number(card.used_limit), 0);
    
    const totalDespesas = despesasTransacoes + despesasCartoes;

    // O valor atual é: valor inicial + (receitas - despesas) acumuladas
    const economia = totalReceitas - totalDespesas;
    const currentAmount = Number(goal.current_amount || 0) + (economia > 0 ? economia * 0.3 : 0); // 30% da economia vai para as metas
    
    return Math.max(0, currentAmount);
  };

  // Calcula a economia mensal real baseada no histórico
  const calculateRealMonthlySavings = (goal: FinancialGoal) => {
    if (!transactions || transactions.length === 0) return goal.monthly_contribution || 0;

    const goalDate = new Date(goal.created_at);
    const monthsSinceCreation = differenceInMonths(new Date(), goalDate) || 1;
    
    const relevantTransactions = transactions.filter(t => new Date(t.date) >= goalDate);

    const totalReceitas = relevantTransactions
      .filter(t => t.type === "receita")
      .reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0);
    
    const despesasTransacoes = relevantTransactions
      .filter(t => t.type === "despesa")
      .reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0);

    // Adicionar gastos dos cartões de crédito criados após a meta
    const despesasCartoes = creditCards
      .filter(card => new Date(card.created_at) >= goalDate)
      .reduce((sum, card) => sum + Number(card.used_limit), 0);
    
    const totalDespesas = despesasTransacoes + despesasCartoes;
    const totalSavings = totalReceitas - totalDespesas;
    const monthlySavings = totalSavings / monthsSinceCreation;

    // 30% da economia mensal real vai para as metas
    return monthlySavings > 0 ? monthlySavings * 0.3 : goal.monthly_contribution || 0;
  };

  const addGoalMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("financial_goals").insert({
        user_id: user.id,
        goal_name: data.goal_name,
        goal_type: data.goal_type,
        target_amount: parseFloat(data.target_amount),
        current_amount: parseFloat(data.current_amount || "0"),
        target_date: data.target_date || null,
        monthly_contribution: parseFloat(data.monthly_contribution || "0"),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-goals"] });
      toast({ title: "Sucesso", description: "Meta adicionada com sucesso" });
      setShowForm(false);
      setFormData({
        goal_name: "",
        goal_type: "",
        target_amount: "",
        current_amount: "",
        target_date: "",
        monthly_contribution: "",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-goals"] });
      toast({ title: "Sucesso", description: "Meta removida com sucesso" });
    },
  });

  const calculateMonthsToGoal = (goal: FinancialGoal) => {
    const currentProgress = calculateGoalProgress(goal);
    const remaining = goal.target_amount - currentProgress;
    
    const realMonthlySavings = calculateRealMonthlySavings(goal);

    if (realMonthlySavings <= 0) return null;
    
    const monthsNeeded = Math.ceil(remaining / realMonthlySavings);
    return monthsNeeded;
  };

  const getEstimatedDate = (goal: FinancialGoal) => {
    const months = calculateMonthsToGoal(goal);
    if (!months && months !== 0) return "Adicione receitas para calcular";
    if (months === 0) return "Meta alcançada!";
    
    const today = new Date();
    const estimatedDate = new Date(today.setMonth(today.getMonth() + months));
    return format(estimatedDate, "MMMM 'de' yyyy", { locale: ptBR });
  };

  // Calcula o histórico de evolução da meta mês a mês
  const calculateGoalHistory = (goal: FinancialGoal) => {
    if (!transactions || transactions.length === 0) return [];

    const goalDate = new Date(goal.created_at);
    const today = new Date();
    
    // Gera array de meses desde a criação até hoje
    const months = eachMonthOfInterval({ start: goalDate, end: today });
    
    return months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      // Filtra transações até este mês
      const transactionsUntilMonth = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= goalDate && tDate <= monthEnd;
      });

      // Calcula receitas e despesas acumuladas até este mês
      const totalReceitas = transactionsUntilMonth
        .filter(t => t.type === "receita")
        .reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0);
      
      const despesasTransacoes = transactionsUntilMonth
        .filter(t => t.type === "despesa")
        .reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0);

      // Adicionar gastos dos cartões criados até este mês
      const despesasCartoes = creditCards
        .filter(card => {
          const cardDate = new Date(card.created_at);
          return cardDate >= goalDate && cardDate <= monthEnd;
        })
        .reduce((sum, card) => sum + Number(card.used_limit), 0);

      const totalDespesas = despesasTransacoes + despesasCartoes;
      const economia = totalReceitas - totalDespesas;
      const progressAmount = Number(goal.current_amount || 0) + (economia > 0 ? economia * 0.3 : 0);
      
      return {
        month: format(month, "MMM/yy", { locale: ptBR }),
        valor: Math.max(0, Math.min(progressAmount, goal.target_amount)),
        meta: goal.target_amount,
      };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Minhas Metas</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Meta
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Meta Financeira</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <Label>Nome da Meta</Label>
                <Input
                  value={formData.goal_name}
                  onChange={(e) => setFormData({ ...formData, goal_name: e.target.value })}
                  placeholder="Ex: Viagem para Europa"
                />
              </div>

              <div>
                <Label>Tipo de Meta</Label>
                <Select
                  value={formData.goal_type}
                  onValueChange={(value) => setFormData({ ...formData, goal_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Reserva de Emergência">Reserva de Emergência</SelectItem>
                    <SelectItem value="Viagem">Viagem</SelectItem>
                    <SelectItem value="Compra">Compra</SelectItem>
                    <SelectItem value="Investimento">Investimento</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor Alvo (R$)</Label>
                  <Input
                    type="number"
                    value={formData.target_amount}
                    onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Valor Inicial (R$)</Label>
                  <Input
                    type="number"
                    value={formData.current_amount}
                    onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    O progresso será calculado automaticamente
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Alvo (opcional)</Label>
                  <Input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Contribuição Mensal Estimada (R$)</Label>
                  <Input
                    type="number"
                    value={formData.monthly_contribution}
                    onChange={(e) => setFormData({ ...formData, monthly_contribution: e.target.value })}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Opcional: calculamos baseado em suas transações
                  </p>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex gap-2">
                  <TrendingUp className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-primary">Como funciona o cálculo automático?</p>
                    <p className="text-muted-foreground">
                      O sistema analisa suas receitas e despesas desde a criação da meta e calcula automaticamente 
                      quanto você está economizando por mês. O progresso da meta é atualizado conforme você 
                      registra novas transações.
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={() => addGoalMutation.mutate(formData)} disabled={addGoalMutation.isPending}>
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {goals?.map((goal) => {
          const currentAmount = calculateGoalProgress(goal);
          const progress = (currentAmount / goal.target_amount) * 100;
          const remaining = goal.target_amount - currentAmount;
          const monthsToGoal = calculateMonthsToGoal(goal);
          const monthlySavings = calculateRealMonthlySavings(goal);

          return (
            <Card key={goal.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  <CardTitle className="text-lg">{goal.goal_name}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteGoalMutation.mutate(goal.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <Badge>{goal.goal_type}</Badge>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso (calculado automaticamente)</span>
                    <span className="font-bold">
                      R$ {currentAmount.toFixed(2)} / R$ {goal.target_amount.toFixed(2)}
                    </span>
                  </div>
                  <Progress value={Math.min(progress, 100)} />
                  <p className="text-sm text-muted-foreground">
                    Faltam: R$ {remaining > 0 ? remaining.toFixed(2) : "0.00"}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>Economia mensal: R$ {monthlySavings.toFixed(2)}</span>
                </div>

                {/* Gráfico de Evolução */}
                {calculateGoalHistory(goal).length > 1 && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <LineChartIcon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Evolução da Meta</span>
                    </div>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={calculateGoalHistory(goal)}>
                          <defs>
                            <linearGradient id={`colorValor-${goal.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="month" 
                            className="text-xs"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <YAxis 
                            className="text-xs"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Valor']}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="valor" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            fill={`url(#colorValor-${goal.id})`}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="meta" 
                            stroke="hsl(var(--muted-foreground))" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                        <span className="text-muted-foreground">Progresso</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-muted-foreground"></div>
                        <span className="text-muted-foreground">Meta</span>
                      </div>
                    </div>
                  </div>
                )}

                {goal.target_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span className="text-muted-foreground">
                      Meta: {format(new Date(goal.target_date), "dd/MM/yyyy")}
                    </span>
                  </div>
                )}

                <div className="border-t pt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">Estimativa</span>
                  </div>
                  
                  {monthsToGoal !== null && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Você poderá alcançar esta meta em aproximadamente{" "}
                        <span className="font-semibold text-foreground">{monthsToGoal} meses</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Previsão: <span className="font-semibold text-foreground">{getEstimatedDate(goal)}</span>
                      </p>
                      {goal.monthly_contribution > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Com contribuição mensal de R$ {goal.monthly_contribution.toFixed(2)}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!isLoading && goals?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma meta cadastrada</p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              Adicionar Primeira Meta
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};