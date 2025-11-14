import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, CreditCard, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface CreditCardData {
  id: string;
  card_name: string;
  card_brand: string;
  credit_limit: number;
  used_limit: number;
  closing_day: number;
  due_day: number;
  score: number;
}

export const CreditCards = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    card_name: "",
    card_brand: "",
    credit_limit: "",
    used_limit: "",
    closing_day: "",
    due_day: "",
  });

  const { data: cards, isLoading } = useQuery({
    queryKey: ["credit-cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_cards")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as CreditCardData[];
    },
  });

  const addCardMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("credit_cards").insert({
        user_id: user.id,
        card_name: data.card_name,
        card_brand: data.card_brand,
        credit_limit: parseFloat(data.credit_limit),
        used_limit: parseFloat(data.used_limit || "0"),
        closing_day: parseInt(data.closing_day),
        due_day: parseInt(data.due_day),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
      toast({ title: "Sucesso", description: "Cartão adicionado com sucesso" });
      setShowForm(false);
      setFormData({
        card_name: "",
        card_brand: "",
        credit_limit: "",
        used_limit: "",
        closing_day: "",
        due_day: "",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("credit_cards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
      toast({ title: "Sucesso", description: "Cartão removido com sucesso" });
    },
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getRecommendations = (card: CreditCardData) => {
    const recommendations = [];
    const usagePercentage = (card.used_limit / card.credit_limit) * 100;

    if (usagePercentage > 70) {
      recommendations.push("Reduza o uso do cartão para abaixo de 70% do limite");
    }
    if (usagePercentage < 30) {
      recommendations.push("Seu uso está ótimo! Continue assim para manter o score alto");
    }
    if (card.score < 50) {
      recommendations.push("Pague suas faturas em dia para melhorar seu score");
    }

    return recommendations;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Meus Cartões</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Cartão
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Novo Cartão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Cartão</Label>
                  <Input
                    value={formData.card_name}
                    onChange={(e) => setFormData({ ...formData, card_name: e.target.value })}
                    placeholder="Ex: Meu Nubank"
                  />
                </div>
                <div>
                  <Label>Bandeira</Label>
                  <Select
                    value={formData.card_brand}
                    onValueChange={(value) => setFormData({ ...formData, card_brand: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nubank">Nubank</SelectItem>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="C6 Bank">C6 Bank</SelectItem>
                      <SelectItem value="PicPay">PicPay</SelectItem>
                      <SelectItem value="Itaú">Itaú</SelectItem>
                      <SelectItem value="Bradesco">Bradesco</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Limite Total (R$)</Label>
                  <Input
                    type="number"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Limite Utilizado (R$)</Label>
                  <Input
                    type="number"
                    value={formData.used_limit}
                    onChange={(e) => setFormData({ ...formData, used_limit: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Dia de Fechamento</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.closing_day}
                    onChange={(e) => setFormData({ ...formData, closing_day: e.target.value })}
                    placeholder="15"
                  />
                </div>
                <div>
                  <Label>Dia de Vencimento</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.due_day}
                    onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                    placeholder="25"
                  />
                </div>
              </div>

              <Button onClick={() => addCardMutation.mutate(formData)} disabled={addCardMutation.isPending}>
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {cards?.map((card) => {
          const usagePercentage = (card.used_limit / card.credit_limit) * 100;
          const availableLimit = card.credit_limit - card.used_limit;
          const recommendations = getRecommendations(card);

          return (
            <Card key={card.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  <CardTitle className="text-lg">{card.card_name}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteCardMutation.mutate(card.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <Badge>{card.card_brand}</Badge>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Limite Utilizado</span>
                    <span className="font-bold">
                      R$ {card.used_limit.toFixed(2)} / R$ {card.credit_limit.toFixed(2)}
                    </span>
                  </div>
                  <Progress value={usagePercentage} />
                  <p className="text-sm text-muted-foreground">
                    Disponível: R$ {availableLimit.toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Fecha dia</p>
                    <p className="font-semibold">{card.closing_day}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Vence dia</p>
                    <p className="font-semibold">{card.due_day}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm font-medium">Score do Cartão</span>
                    </div>
                    <span className={`text-2xl font-bold ${getScoreColor(card.score)}`}>
                      {card.score.toFixed(0)}
                    </span>
                  </div>
                  <Progress value={card.score} className="mb-2" />
                  
                  {recommendations.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-medium">Recomendações:</p>
                      {recommendations.map((rec, idx) => (
                        <p key={idx} className="text-xs text-muted-foreground">• {rec}</p>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!isLoading && cards?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum cartão cadastrado</p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              Adicionar Primeiro Cartão
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};