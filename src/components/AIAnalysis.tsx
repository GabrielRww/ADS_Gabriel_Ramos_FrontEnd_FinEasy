import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AIAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setAnalysis(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado");
        return;
      }

      const { data, error } = await supabase.functions.invoke("analyze-expenses", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setAnalysis(data.analysis);
      toast.success("Análise gerada com sucesso!");
    } catch (error: any) {
      console.error("Error analyzing expenses:", error);
      if (error.message?.includes("429")) {
        toast.error("Limite de requisições excedido. Tente novamente mais tarde.");
      } else if (error.message?.includes("402")) {
        toast.error("Créditos insuficientes. Adicione créditos ao seu workspace.");
      } else {
        toast.error(error.message || "Erro ao gerar análise");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Análise Inteligente por IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Obtenha insights sobre seus hábitos financeiros usando inteligência artificial.
        </p>
        
        <Button onClick={handleAnalyze} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Analisar Gastos
            </>
          )}
        </Button>

        {analysis && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Análise Financeira:</h4>
            <div className="text-sm whitespace-pre-wrap">{analysis}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIAnalysis;