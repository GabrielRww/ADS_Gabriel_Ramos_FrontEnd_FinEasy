import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Loader2, FileText, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MonthlyReport = () => {
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<"pdf" | "excel">("pdf");

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
        body: { format },
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
          Receba um resumo completo das suas finanças do mês atual no seu e-mail em PDF ou Excel.
        </p>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Formato do Relatório</label>
          <Select value={format} onValueChange={(value: "pdf" | "excel") => setFormat(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  PDF
                </div>
              </SelectItem>
              <SelectItem value="excel">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={handleSendReport} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Enviar Relatório {format.toUpperCase()}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MonthlyReport;