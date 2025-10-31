import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Transaction {
  id: string;
  type: "receita" | "despesa";
  amount: number;
  amount_brl: number | null;
  currency: string;
  description: string;
  date: string;
  categories: {
    name: string;
    icon: string;
    color: string;
  } | null;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  onUpdate: () => void;
}

const TransactionHistory = ({ transactions, onUpdate }: TransactionHistoryProps) => {
  const [filterType, setFilterType] = useState<"all" | "receita" | "despesa">("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;

    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);

      if (error) throw error;

      toast.success("Transação excluída com sucesso!");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir transação");
    }
  };

  // Get unique months from transactions
  const months = Array.from(
    new Set(
      transactions.map((t) => {
        const date = new Date(t.date);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      })
    )
  ).sort((a, b) => b.localeCompare(a));

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterMonth !== "all") {
      const date = new Date(t.date);
      const transactionMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (transactionMonth !== filterMonth) return false;
    }
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Transações</CardTitle>
        <div className="flex gap-4 mt-4">
          <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="receita">Receitas</SelectItem>
              <SelectItem value="despesa">Despesas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {months.map((month) => {
                const [year, monthNum] = month.split("-");
                const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                return (
                  <SelectItem key={month} value={month}>
                    {date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTransactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma transação encontrada
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {new Date(transaction.date).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      {transaction.categories && (
                        <span
                          className="px-2 py-1 rounded text-sm"
                          style={{ backgroundColor: `${transaction.categories.color}20` }}
                        >
                          {transaction.categories.icon} {transaction.categories.name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {transaction.type === "receita" ? (
                          <>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="text-green-600">Receita</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-4 w-4 text-red-500" />
                            <span className="text-red-600">Despesa</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <div>
                        <div
                          className={
                            transaction.type === "receita" ? "text-green-600" : "text-red-600"
                          }
                        >
                          R$ {(transaction.amount_brl || transaction.amount).toFixed(2)}
                        </div>
                        {transaction.currency !== "BRL" && (
                          <div className="text-xs text-muted-foreground">
                            {transaction.currency} {transaction.amount.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(transaction.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionHistory;