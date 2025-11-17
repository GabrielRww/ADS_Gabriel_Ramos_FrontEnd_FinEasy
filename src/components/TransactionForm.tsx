import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Loader2, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface TransactionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  editingTransaction?: {
    id: string;
    type: "receita" | "despesa";
    amount: number;
    currency: string;
    description: string;
    category_id: string;
    date: string;
  };
}

const TransactionForm = ({ onSuccess, onCancel, editingTransaction }: TransactionFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: (editingTransaction?.type || "despesa") as "receita" | "despesa",
    amount: editingTransaction?.amount?.toString() || "",
    currency: editingTransaction?.currency || "BRL",
    description: editingTransaction?.description || "",
    categoryId: editingTransaction?.category_id || "",
    date: editingTransaction?.date || new Date().toISOString().split("T")[0],
  });
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);

  // Fetch exchange rates
  const { data: exchangeRates } = useQuery({
    queryKey: ["exchangeRates"],
    queryFn: async () => {
      const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
      const data = await response.json();
      return {
        USD_BRL: data.rates.BRL,
        EUR_BRL: data.rates.BRL / data.rates.EUR,
      };
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });

  // Calculate converted amount in real-time
  useEffect(() => {
    if (formData.amount && formData.currency !== "BRL" && exchangeRates) {
      const amount = Number(formData.amount);
      if (!isNaN(amount) && amount > 0) {
        const rate = formData.currency === "USD" ? exchangeRates.USD_BRL : exchangeRates.EUR_BRL;
        setConvertedAmount(amount * rate);
      } else {
        setConvertedAmount(null);
      }
    } else {
      setConvertedAmount(null);
    }
  }, [formData.amount, formData.currency, exchangeRates]);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let amountBrl = Number(formData.amount);

      // Convert currency if not BRL
      if (formData.currency !== "BRL" && exchangeRates) {
        const rate = formData.currency === "USD" ? exchangeRates.USD_BRL : exchangeRates.EUR_BRL;
        amountBrl = Number(formData.amount) * rate;
      }

      if (editingTransaction) {
        // Update existing transaction
        const { error } = await supabase
          .from("transactions")
          .update({
            type: formData.type,
            amount: Number(formData.amount),
            currency: formData.currency,
            amount_brl: amountBrl,
            description: formData.description,
            category_id: formData.categoryId || null,
            date: formData.date,
          })
          .eq("id", editingTransaction.id);

        if (error) throw error;
        toast.success("Transação atualizada com sucesso!");
      } else {
        // Insert new transaction
        const { error } = await supabase.from("transactions").insert({
          user_id: user.id,
          type: formData.type,
          amount: Number(formData.amount),
          currency: formData.currency,
          amount_brl: amountBrl,
          description: formData.description,
          category_id: formData.categoryId || null,
          date: formData.date,
        });

        if (error) throw error;
        toast.success("Transação adicionada com sucesso!");
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar transação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editingTransaction ? "Editar Transação" : "Nova Transação"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "receita" | "despesa") =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) =>
                  setFormData({ ...formData, categoryId: value })
                }
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Moeda</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) =>
                  setFormData({ ...formData, currency: value })
                }
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL (Real)</SelectItem>
                  <SelectItem value="USD">USD (Dólar)</SelectItem>
                  <SelectItem value="EUR">EUR (Euro)</SelectItem>
                </SelectContent>
              </Select>
              {convertedAmount && exchangeRates && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>
                    ≈ R$ {formatCurrency(convertedAmount)} 
                    <span className="text-xs ml-1">
                      (Cotação: 1 {formData.currency} = R$ {formatCurrency(formData.currency === "USD" ? exchangeRates.USD_BRL : exchangeRates.EUR_BRL)})
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              type="text"
              placeholder="Ex: Salário, Conta de luz, etc."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              required
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : editingTransaction ? (
                "Atualizar"
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default TransactionForm;