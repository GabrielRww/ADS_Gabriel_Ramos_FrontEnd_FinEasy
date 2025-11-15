import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, TrendingUp, PieChart, Calendar, DollarSign, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import fineasyLogo from "@/assets/fineasy-logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Header with Theme Toggle */}
      <header className="fixed top-0 right-0 z-50 p-4">
        <ThemeToggle />
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
          <div className="flex justify-center mb-8">
            <img 
              src={fineasyLogo} 
              alt="Fineasy Logo" 
              className="w-24 h-24 animate-fade-in hover:scale-110 transition-transform duration-300"
            />
          </div>
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Fineasy
          </h1>
          <p className="text-2xl font-semibold mb-6 text-foreground">
            Controle Financeiro Inteligente
          </p>
          <p className="text-xl text-muted-foreground mb-8">
            Gerencie suas finanças de forma simples e inteligente. Controle suas receitas, despesas e alcance seus objetivos financeiros.
          </p>
          <Link to="/auth">
            <Button size="lg" className="text-lg px-8 py-6 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl group">
              Começar Agora 
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card variant="glass" className="p-6 hover:shadow-xl transition-all hover:-translate-y-2 animate-fade-in">
            <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4 animate-scale-in">
              <DollarSign className="text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Controle de Receitas e Despesas</h3>
            <p className="text-sm text-muted-foreground">
              Registre facilmente todas as suas entradas e saídas financeiras
            </p>
          </Card>

          <Card variant="glass" className="p-6 hover:shadow-xl transition-all hover:-translate-y-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4 animate-scale-in" style={{ animationDelay: "0.1s" }}>
              <TrendingUp className="text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Saldo em Tempo Real</h3>
            <p className="text-sm text-muted-foreground">
              Visualize seu saldo atualizado instantaneamente
            </p>
          </Card>

          <Card variant="glass" className="p-6 hover:shadow-xl transition-all hover:-translate-y-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4 animate-scale-in" style={{ animationDelay: "0.2s" }}>
              <PieChart className="text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Categorias Inteligentes</h3>
            <p className="text-sm text-muted-foreground">
              Organize seus gastos por categoria e veja onde está gastando mais
            </p>
          </Card>

          <Card variant="glass" className="p-6 hover:shadow-xl transition-all hover:-translate-y-2 animate-fade-in" style={{ animationDelay: "0.3s" }}>
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
        <div className="relative overflow-hidden rounded-2xl p-10 border-2 border-primary/20 animate-fade-in bg-gradient-to-br from-primary/5 via-background to-primary/10">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-50"></div>
          <div className="relative z-10">
            <h2 className="text-4xl font-bold mb-8 text-center flex items-center justify-center gap-3 animate-scale-in">
              <Sparkles className="text-primary w-8 h-8 animate-pulse" />
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Funcionalidades Avançadas
              </span>
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="group relative p-6 rounded-xl border-2 border-primary/10 bg-card/80 backdrop-blur-sm hover:border-primary/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 animate-fade-in">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 mb-4 group-hover:scale-110 transition-transform animate-scale-in">
                    <span className="text-5xl">📧</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors">
                    Relatórios por E-mail
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Receba resumos mensais automáticos com análises detalhadas das suas finanças
                  </p>
                </div>
              </div>

              <div className="group relative p-6 rounded-xl border-2 border-primary/10 bg-card/80 backdrop-blur-sm hover:border-primary/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 mb-4 group-hover:scale-110 transition-transform animate-scale-in" style={{ animationDelay: "0.1s" }}>
                    <span className="text-5xl">💱</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors">
                    Conversão de Moedas
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Registre transações em diferentes moedas com conversão automática e em tempo real
                  </p>
                </div>
              </div>

              <div className="group relative p-6 rounded-xl border-2 border-primary/10 bg-card/80 backdrop-blur-sm hover:border-primary/40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-600/20 mb-4 group-hover:scale-110 transition-transform animate-scale-in" style={{ animationDelay: "0.2s" }}>
                    <span className="text-5xl">🤖</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors">
                    Análise por IA
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Obtenha insights inteligentes e recomendações personalizadas sobre seus hábitos
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-primary/5 py-16 animate-fade-in">
        <div className="container mx-auto px-4">
          <Card variant="glass-strong" className="p-12 text-center bg-gradient-to-br from-primary/10 to-accent/10 border-none max-w-3xl mx-auto">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
            <h2 className="text-3xl font-bold mb-4">Pronto para controlar suas finanças?</h2>
            <p className="text-muted-foreground mb-8">Comece gratuitamente e organize sua vida financeira hoje mesmo!</p>
            <Link to="/auth">
              <Button size="lg" variant="default" className="text-lg px-8 py-6 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl group">
                Criar Conta Grátis
                <ArrowRight className="ml-2 inline group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Landing;