import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Target, Calendar, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export const FinancialGoals = () => {
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

  const { data: transactions } = useQuery({
    queryKey: ["transactions-for-goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("type", "despesa")
        .order("date", { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data;
    },
  });

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
    const remaining = goal.target_amount - goal.current_amount;
    
    // Calcular gasto médio mensal
    const totalExpenses = transactions?.reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0) || 0;
    const avgMonthlyExpense = totalExpenses / (transactions?.length || 1);
    
    // Estimativa: considerando que a pessoa consegue economizar 20% do que gasta
    const estimatedMonthlySavings = goal.monthly_contribution > 0 
      ? goal.monthly_contribution 
      : avgMonthlyExpense * 0.2;

    if (estimatedMonthlySavings <= 0) return null;
    
    const monthsNeeded = Math.ceil(remaining / estimatedMonthlySavings);
    return monthsNeeded;
  };

  const getEstimatedDate = (goal: FinancialGoal) => {
    const months = calculateMonthsToGoal(goal);
    if (!months) return "Defina uma contribuição mensal";
    
    const today = new Date();
    const estimatedDate = new Date(today.setMonth(today.getMonth() + months));
    return format(estimatedDate, "MMMM 'de' yyyy", { locale: ptBR });
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
                  <Label>Valor Atual (R$)</Label>
                  <Input
                    type="number"
                    value={formData.current_amount}
                    onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                    placeholder="0.00"
                  />
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
                  <Label>Contribuição Mensal (R$)</Label>
                  <Input
                    type="number"
                    value={formData.monthly_contribution}
                    onChange={(e) => setFormData({ ...formData, monthly_contribution: e.target.value })}
                    placeholder="0.00"
                  />
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
          const progress = (goal.current_amount / goal.target_amount) * 100;
          const remaining = goal.target_amount - goal.current_amount;
          const monthsToGoal = calculateMonthsToGoal(goal);

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
                    <span>Progresso</span>
                    <span className="font-bold">
                      R$ {goal.current_amount.toFixed(2)} / R$ {goal.target_amount.toFixed(2)}
                    </span>
                  </div>
                  <Progress value={progress} />
                  <p className="text-sm text-muted-foreground">
                    Faltam: R$ {remaining.toFixed(2)}
                  </p>
                </div>

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
