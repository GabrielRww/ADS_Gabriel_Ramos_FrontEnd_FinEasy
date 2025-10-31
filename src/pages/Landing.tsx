import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, TrendingUp, PieChart, Calendar, DollarSign, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import fineasyLogo from "@/assets/fineasy-logo.png";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-primary/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
          <div className="flex justify-center mb-8">
            <img 
              src={fineasyLogo} 
              alt="Fineasy Logo" 
              className="w-24 h-24 animate-scale-in hover-scale"
            />
          </div>
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Fineasy
          </h1>
          <p className="text-2xl font-semibold mb-6 text-foreground/80">
            Controle Financeiro Inteligente
          </p>
          <p className="text-xl text-muted-foreground mb-8">
            Gerencie suas finanças de forma simples e inteligente. Controle suas receitas, despesas e alcance seus objetivos financeiros.
          </p>
          <Link to="/auth">
            <Button size="lg" className="text-lg px-8 py-6 hover-scale group">
              Começar Agora 
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="p-6 hover:shadow-lg transition-all hover:-translate-y-2 animate-fade-in">
            <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4 animate-scale-in">
              <DollarSign className="text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Controle de Receitas e Despesas</h3>
            <p className="text-sm text-muted-foreground">
              Registre facilmente todas as suas entradas e saídas financeiras
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all hover:-translate-y-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4 animate-scale-in" style={{ animationDelay: "0.1s" }}>
              <TrendingUp className="text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Saldo em Tempo Real</h3>
            <p className="text-sm text-muted-foreground">
              Visualize seu saldo atualizado instantaneamente
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all hover:-translate-y-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4 animate-scale-in" style={{ animationDelay: "0.2s" }}>
              <PieChart className="text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Categorias Inteligentes</h3>
            <p className="text-sm text-muted-foreground">
              Organize seus gastos por categoria e veja onde está gastando mais
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all hover:-translate-y-2 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4 animate-scale-in" style={{ animationDelay: "0.3s" }}>
              <Calendar className="text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Histórico Completo</h3>
            <p className="text-sm text-muted-foreground">
              Acesse todo o histórico de transações com filtros por data e tipo
            </p>
          </Card>
        </div>

        {/* Additional Features */}
        <div className="bg-card rounded-lg p-8 border animate-fade-in">
          <h2 className="text-3xl font-bold mb-6 text-center flex items-center justify-center gap-2">
            <Sparkles className="text-primary" />
            Funcionalidades Avançadas
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center hover-scale transition-all">
              <div className="text-4xl mb-3 animate-scale-in">📧</div>
              <h3 className="font-semibold mb-2">Relatórios por E-mail</h3>
              <p className="text-sm text-muted-foreground">
                Receba resumos mensais automáticos no seu e-mail
              </p>
            </div>
            <div className="text-center hover-scale transition-all">
              <div className="text-4xl mb-3 animate-scale-in" style={{ animationDelay: "0.1s" }}>💱</div>
              <h3 className="font-semibold mb-2">Conversão de Moedas</h3>
              <p className="text-sm text-muted-foreground">
                Registre transações em diferentes moedas com conversão automática
              </p>
            </div>
            <div className="text-center hover-scale transition-all">
              <div className="text-4xl mb-3 animate-scale-in" style={{ animationDelay: "0.2s" }}>🤖</div>
              <h3 className="font-semibold mb-2">Análise por IA</h3>
              <p className="text-sm text-muted-foreground">
                Obtenha insights inteligentes sobre seus hábitos financeiros
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-primary/5 py-16 animate-fade-in">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Pronto para controlar suas finanças?</h2>
          <p className="text-muted-foreground mb-8">Comece gratuitamente e organize sua vida financeira hoje mesmo!</p>
          <Link to="/auth">
            <Button size="lg" variant="default" className="text-lg px-8 py-6 hover-scale group">
              Criar Conta Grátis
              <ArrowRight className="ml-2 inline group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Landing;