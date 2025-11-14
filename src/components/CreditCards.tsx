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
import { formatCurrency } from "@/lib/utils";

const CardBrandLogo = ({ brand }: { brand: string }) => {
  switch (brand) {
    case "Mastercard":
      return (
        <svg viewBox="0 0 48 32" className="h-6 w-auto">
          <circle cx="15" cy="16" r="12" fill="#EB001B" />
          <circle cx="33" cy="16" r="12" fill="#F79E1B" />
          <path d="M24,8.5a11.9,11.9,0,0,0,0,15,11.9,11.9,0,0,0,0-15Z" fill="#FF5F00" />
        </svg>
      );
    case "Visa":
      return (
        <svg viewBox="0 0 48 16" className="h-5 w-auto">
          <text x="0" y="13" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif">VISA</text>
        </svg>
      );
    case "Elo":
      return (
        <svg viewBox="0 0 48 32" className="h-6 w-auto">
          <circle cx="12" cy="16" r="10" fill="#FFCB05" />
          <circle cx="24" cy="16" r="10" fill="#00A4E0" />
          <circle cx="36" cy="16" r="10" fill="#EE4023" />
        </svg>
      );
    case "American Express":
      return (
        <svg viewBox="0 0 48 16" className="h-5 w-auto">
          <text x="0" y="13" fill="white" fontSize="11" fontWeight="bold" fontFamily="Arial, sans-serif">AMEX</text>
        </svg>
      );
    case "Hipercard":
      return (
        <svg viewBox="0 0 48 16" className="h-5 w-auto">
          <text x="0" y="13" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial, sans-serif">HIPER</text>
        </svg>
      );
    case "Diners Club":
      return (
        <svg viewBox="0 0 32 32" className="h-6 w-auto">
          <circle cx="16" cy="16" r="14" fill="none" stroke="white" strokeWidth="2" />
          <path d="M10,8 L10,24 M22,8 L22,24" stroke="white" strokeWidth="2" />
        </svg>
      );
    case "Discover":
      return (
        <svg viewBox="0 0 48 16" className="h-5 w-auto">
          <text x="0" y="13" fill="white" fontSize="9" fontWeight="bold" fontFamily="Arial, sans-serif">DISCOVER</text>
        </svg>
      );
    default:
      return <CreditCard className="h-6 w-6 opacity-50" />;
  }
};

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

  const bankOptions = [
    { name: "Nubank", brand: "Mastercard", color: "from-purple-600 to-purple-800" },
    { name: "Inter", brand: "Mastercard", color: "from-orange-500 to-orange-700" },
    { name: "C6 Bank", brand: "Mastercard", color: "from-gray-800 to-gray-900" },
    { name: "PicPay", brand: "Visa", color: "from-green-500 to-green-700" },
    { name: "Itaú", brand: "Visa", color: "from-blue-600 to-blue-800" },
    { name: "Bradesco", brand: "Visa", color: "from-red-600 to-red-800" },
    { name: "Santander", brand: "Mastercard", color: "from-red-500 to-red-700" },
    { name: "Banco do Brasil", brand: "Visa", color: "from-yellow-500 to-yellow-700" },
    { name: "Caixa", brand: "Visa", color: "from-blue-500 to-blue-700" },
    { name: "Outro", brand: "", color: "from-gray-600 to-gray-800" },
  ];

  const handleBankSelect = (bankName: string) => {
    const selectedBank = bankOptions.find(b => b.name === bankName);
    if (selectedBank) {
      setFormData({
        ...formData,
        card_name: bankName,
        card_brand: selectedBank.brand,
      });
    }
  };

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

  const calculateCardScore = (usedLimit: number, creditLimit: number): number => {
    const usagePercentage = (usedLimit / creditLimit) * 100;
    
    // Base score calculation based on usage
    let score = 100;
    
    if (usagePercentage > 90) {
      score = 20 + (100 - usagePercentage) * 0.5; // 20-25
    } else if (usagePercentage > 70) {
      score = 30 + (90 - usagePercentage) * 1.5; // 30-60
    } else if (usagePercentage > 50) {
      score = 50 + (70 - usagePercentage) * 1.5; // 50-80
    } else if (usagePercentage > 30) {
      score = 70 + (50 - usagePercentage) * 1; // 70-90
    } else {
      score = 85 + (30 - usagePercentage) * 0.5; // 85-100
    }
    
    // Bonus for having available credit (up to 10 points)
    const availableLimit = creditLimit - usedLimit;
    const bonusPoints = Math.min(10, (availableLimit / creditLimit) * 10);
    
    return Math.min(100, Math.round(score + bonusPoints));
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getCardColors = (brand: string) => {
    const bank = bankOptions.find(b => b.name === brand);
    if (bank) return { bg: bank.color, text: 'text-white', accent: 'bg-white/30' };
    
    const colors: Record<string, { bg: string; text: string; accent: string }> = {
      'Visa': { bg: 'from-blue-700 to-blue-900', text: 'text-white', accent: 'bg-blue-400' },
      'Mastercard': { bg: 'from-red-500 to-orange-600', text: 'text-white', accent: 'bg-orange-300' },
      'Elo': { bg: 'from-yellow-500 to-yellow-700', text: 'text-white', accent: 'bg-yellow-300' },
      'American Express': { bg: 'from-blue-500 to-blue-700', text: 'text-white', accent: 'bg-blue-300' },
      'Hipercard': { bg: 'from-red-700 to-red-900', text: 'text-white', accent: 'bg-red-400' },
      'Diners Club': { bg: 'from-blue-800 to-blue-950', text: 'text-white', accent: 'bg-blue-400' },
      'Discover': { bg: 'from-orange-600 to-orange-800', text: 'text-white', accent: 'bg-orange-300' },
    };
    return colors[brand] || { bg: 'from-gray-600 to-gray-800', text: 'text-white', accent: 'bg-gray-400' };
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
              {/* Preview do Cartão */}
              {formData.card_name && (
                <div className={`relative h-40 bg-gradient-to-br ${bankOptions.find(b => b.name === formData.card_name)?.color || 'from-gray-600 to-gray-800'} p-6 text-white rounded-lg animate-scale-in`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs opacity-80 mb-1">Banco</p>
                      <h3 className="text-xl font-bold">{formData.card_name}</h3>
                    </div>
                    <CardBrandLogo brand={formData.card_brand} />
                  </div>
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <CardBrandLogo brand={formData.card_brand} />
                      </div>
                      <div className="text-right">
                        <p className="text-xs opacity-80">Limite</p>
                        <p className="text-sm font-semibold">
                          R$ {formData.credit_limit ? formatCurrency(parseFloat(formData.credit_limit)) : '0,00'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Banco / Nome do Cartão</Label>
                  <Select
                    value={formData.card_name}
                    onValueChange={handleBankSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankOptions.map((bank) => (
                        <SelectItem key={bank.name} value={bank.name}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded bg-gradient-to-br ${bank.color}`}></div>
                            {bank.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      <SelectItem value="Visa">Visa</SelectItem>
                      <SelectItem value="Mastercard">Mastercard</SelectItem>
                      <SelectItem value="Elo">Elo</SelectItem>
                      <SelectItem value="American Express">American Express</SelectItem>
                      <SelectItem value="Hipercard">Hipercard</SelectItem>
                      <SelectItem value="Diners Club">Diners Club</SelectItem>
                      <SelectItem value="Discover">Discover</SelectItem>
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
          const cardScore = calculateCardScore(card.used_limit, card.credit_limit);
          const recommendations = getRecommendations(card);
          const cardColors = getCardColors(card.card_name);

          return (
            <Card key={card.id} className="overflow-hidden">
              {/* Visual Credit Card */}
              <div className={`relative h-48 bg-gradient-to-br ${cardColors.bg} p-6 text-white rounded-t-lg`}>
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <p className="text-xs opacity-80 mb-1">Nome do Cartão</p>
                    <h3 className="text-xl font-bold">{card.card_name}</h3>
                  </div>
                  <div className="flex gap-2 items-center">
                    <CardBrandLogo brand={card.card_brand} />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCardMutation.mutate(card.id)}
                      className="text-white hover:bg-white/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs opacity-80">Limite Disponível</p>
                      <p className="text-2xl font-bold">R$ {formatCurrency(availableLimit)}</p>
                    </div>
                    <CreditCard className="h-8 w-8 opacity-50" />
                  </div>
                </div>
              </div>

              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Limite Utilizado</span>
                    <span className="font-bold">
                      {usagePercentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={usagePercentage} />
                  <p className="text-xs text-muted-foreground">
                    R$ {formatCurrency(card.used_limit)} de R$ {formatCurrency(card.credit_limit)}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm border-t pt-4">
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
                    <span className={`text-2xl font-bold ${getScoreColor(cardScore)}`}>
                      {cardScore}
                    </span>
                  </div>
                  <Progress value={cardScore} className="mb-2" />
                  
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
