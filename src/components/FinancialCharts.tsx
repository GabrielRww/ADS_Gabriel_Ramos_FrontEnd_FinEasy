import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Activity, CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  date: string;
  type: string;
  amount: number;
  amount_brl: number | null;
  description: string;
  categories?: {
    name: string;
    color: string;
  };
}

interface CreditCard {
  id: string;
  card_name: string;
  card_brand: string;
  credit_limit: number;
  used_limit: number;
  closing_day: number;
  due_day: number;
  created_at: string;
}

interface FinancialChartsProps {
  transactions: Transaction[];
  creditCards: CreditCard[];
}

const COLORS = ['#8b5cf6', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'];

const FinancialCharts = ({ transactions, creditCards }: FinancialChartsProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState("6");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  
  const monthlyData = useMemo(() => {
    const monthsData: { [key: string]: { receitas: number; despesas: number; saldo: number; date: Date } } = {};

    
    const filteredTransactions = transactions.filter(t => {
      if (selectedCategory !== "all" && t.categories?.name !== selectedCategory) return false;
      
      const transactionDate = new Date(t.date);
      
      
      if (startDate && endDate) {
        return transactionDate >= startDate && transactionDate <= endDate;
      }
      
      
      if (selectedPeriod !== "custom") {
        const months = parseInt(selectedPeriod);
        const now = new Date();
        const monthsAgo = new Date(now.getFullYear(), now.getMonth() - months, 1);
        return transactionDate >= monthsAgo;
      }
      
      return true;
    });

    
    filteredTransactions.forEach(t => {
      const date = new Date(t.date);
      const key = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      if (!monthsData[key]) {
        monthsData[key] = { receitas: 0, despesas: 0, saldo: 0, date: new Date(date.getFullYear(), date.getMonth(), 1) };
      }
      
      const amount = Number(t.amount_brl || t.amount);
      if (t.type === 'receita') {
        monthsData[key].receitas += amount;
      } else {
        monthsData[key].despesas += amount;
      }
    });

    
    creditCards.forEach(card => {
      const cardDate = new Date(card.created_at);
      const key = cardDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      
      let includeCard = false;
      if (startDate && endDate) {
        includeCard = cardDate >= startDate && cardDate <= endDate;
      } else if (selectedPeriod !== "custom") {
        const months = parseInt(selectedPeriod);
        const now = new Date();
        const monthsAgo = new Date(now.getFullYear(), now.getMonth() - months, 1);
        includeCard = cardDate >= monthsAgo;
      } else {
        includeCard = true;
      }
      
      if (includeCard) {
        if (!monthsData[key]) {
          monthsData[key] = { receitas: 0, despesas: 0, saldo: 0, date: new Date(cardDate.getFullYear(), cardDate.getMonth(), 1) };
        }
        monthsData[key].despesas += Number(card.used_limit);
      }
    });

    
    Object.keys(monthsData).forEach(key => {
      monthsData[key].saldo = monthsData[key].receitas - monthsData[key].despesas;
    });

    
    return Object.entries(monthsData)
      .sort(([, a], [, b]) => a.date.getTime() - b.date.getTime())
      .map(([mes, data]) => ({
        mes,
        receitas: Number(data.receitas.toFixed(2)),
        despesas: Number(data.despesas.toFixed(2)),
        saldo: Number(data.saldo.toFixed(2))
      }));
  }, [transactions, selectedPeriod, selectedCategory, creditCards, startDate, endDate]);

  
  const categoryData = useMemo(() => {
    const categories: { [key: string]: number } = {};
    
    const filteredTransactions = transactions.filter(t => t.type === 'despesa');
    
    filteredTransactions.forEach(t => {
      const categoryName = t.categories?.name || 'Outros';
      const amount = Number(t.amount_brl || t.amount);
      categories[categoryName] = (categories[categoryName] || 0) + amount;
    });

    
    const totalCardExpenses = creditCards.reduce((sum, card) => sum + Number(card.used_limit), 0);
    if (totalCardExpenses > 0) {
      categories['Cartões de Crédito'] = totalCardExpenses;
    }

    return Object.entries(categories)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [transactions, creditCards]);

  
  const trend = useMemo(() => {
    if (monthlyData.length < 2) return { direction: 'stable', percentage: 0, message: 'Dados insuficientes' };

    const lastMonth = monthlyData[monthlyData.length - 1];
    const previousMonth = monthlyData[monthlyData.length - 2];

    const lastSaldo = lastMonth.saldo;
    const previousSaldo = previousMonth.saldo;

    if (previousSaldo === 0) return { direction: 'stable', percentage: 0, message: 'Sem histórico anterior' };

    const percentage = ((lastSaldo - previousSaldo) / Math.abs(previousSaldo)) * 100;

    if (percentage > 5) {
      return { 
        direction: 'up', 
        percentage: Math.abs(percentage).toFixed(1), 
        message: 'Você está economizando mais!' 
      };
    } else if (percentage < -5) {
      return { 
        direction: 'down', 
        percentage: Math.abs(percentage).toFixed(1), 
        message: 'Gastos aumentaram no último mês' 
      };
    } else {
      return { 
        direction: 'stable', 
        percentage: Math.abs(percentage).toFixed(1), 
        message: 'Finanças estáveis' 
      };
    }
  }, [monthlyData]);

  
  const categories = useMemo(() => {
    const uniqueCategories = new Set(transactions.map(t => t.categories?.name).filter(Boolean));
    return Array.from(uniqueCategories);
  }, [transactions]);

  return (
    <div className="space-y-6">
      {}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Filtros de Análise
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Período</label>
            <Select value={selectedPeriod} onValueChange={(value) => {
              setSelectedPeriod(value);
              if (value !== "custom") {
                setStartDate(undefined);
                setEndDate(undefined);
              }
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Últimos 3 meses</SelectItem>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Último ano</SelectItem>
                <SelectItem value="24">Últimos 2 anos</SelectItem>
                <SelectItem value="custom">Período personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {selectedPeriod === "custom" && (
            <>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Data inicial</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP", { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Data final</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP", { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Categoria</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat || ''}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {}
      <Card className={`border-2 transition-all ${
        trend.direction === 'up' ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' :
        trend.direction === 'down' ? 'border-red-500/50 bg-red-50/50 dark:bg-red-950/20' :
        'border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20'
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {trend.direction === 'up' && <TrendingUp className="h-5 w-5 text-green-600" />}
              {trend.direction === 'down' && <TrendingDown className="h-5 w-5 text-red-600" />}
              {trend.direction === 'stable' && <Activity className="h-5 w-5 text-blue-600" />}
              Análise de Tendências
            </span>
            <Badge variant={trend.direction === 'up' ? 'default' : trend.direction === 'down' ? 'destructive' : 'secondary'}>
              {trend.percentage}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium">{trend.message}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Comparando os últimos dois meses do período selecionado
          </p>
        </CardContent>
      </Card>

      {}
      <Card>
        <CardHeader>
          <CardTitle>Evolução Mensal - Receitas vs Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="mes" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                formatter={(value: number) => `R$ ${value.toFixed(2)}`}
              />
              <Legend />
              <Bar dataKey="receitas" fill="#10b981" name="Receitas" radius={[8, 8, 0, 0]} />
              <Bar dataKey="despesas" fill="#ef4444" name="Despesas" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {}
      <Card>
        <CardHeader>
          <CardTitle>Evolução do Saldo</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="mes" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                formatter={(value: number) => `R$ ${value.toFixed(2)}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="saldo" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                name="Saldo"
                dot={{ fill: '#8b5cf6', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {}
      {categoryData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FinancialCharts;
