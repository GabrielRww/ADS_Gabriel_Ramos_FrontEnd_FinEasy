import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MonthlyReport = () => {
  const [loading, setLoading] = useState(false);

  const handleSendReport = async () => {
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("send-monthly-report", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Function invocation error:", error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success(data?.message || "Relatório enviado com sucesso para seu e-mail!");
    } catch (error: any) {
      console.error("Error sending report:", error);
      
      let errorMessage = "Erro ao enviar relatório";
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Relatório Mensal por E-mail
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Receba um resumo completo das suas finanças do mês atual no seu e-mail.
        </p>
        
        <Button onClick={handleSendReport} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Enviar Relatório
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MonthlyReport;