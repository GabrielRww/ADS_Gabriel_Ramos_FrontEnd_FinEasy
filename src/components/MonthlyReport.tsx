import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, FileSpreadsheet, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import logoImage from "@/assets/fineasy-logo.png";

interface MonthlyReportProps {
  transactions?: any[];
  creditCards?: any[];
}

const MonthlyReport = ({ transactions = [], creditCards = [] }: MonthlyReportProps) => {
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado");
        setLoading(false);
        return;
      }

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= firstDay && tDate <= lastDay;
      });

      if (monthTransactions.length === 0) {
        toast.error("Nenhuma transação encontrada para este mês");
        setLoading(false);
        return;
      }

      const receitas = monthTransactions
        .filter(t => t.type === "receita")
        .reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0);

      const despesas = monthTransactions
        .filter(t => t.type === "despesa")
        .reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0);

      const saldo = receitas - despesas;

      const categoryStats: Record<string, number> = {};
      monthTransactions
        .filter(t => t.type === "despesa" && t.categories)
        .forEach(t => {
          const categoryName = t.categories.name;
          categoryStats[categoryName] = (categoryStats[categoryName] || 0) + Number(t.amount_brl || t.amount);
        });

      const pdf = new jsPDF();
      const monthName = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Header com cor de fundo
      pdf.setFillColor(59, 130, 246); // Blue
      pdf.rect(0, 0, pageWidth, 40, "F");
      
      // Logo
      const img = new Image();
      img.src = logoImage;
      pdf.addImage(img, "PNG", 15, 10, 25, 25);
      
      // Título
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.text("Relatório Financeiro", 50, 22);
      
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(monthName.charAt(0).toUpperCase() + monthName.slice(1), 50, 30);
      
      // Data de geração
      pdf.setFontSize(9);
      const generatedDate = new Date().toLocaleDateString("pt-BR");
      pdf.text(`Gerado em: ${generatedDate}`, pageWidth - 50, 25);
      
      // Box do Resumo
      let yPos = 55;
      pdf.setDrawColor(59, 130, 246);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(15, yPos, pageWidth - 30, 50, 3, 3);
      
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(31, 41, 55);
      pdf.text("Resumo do Mês", 20, yPos + 10);
      
      // Receitas
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(16, 185, 129);
      pdf.text("Receitas:", 20, yPos + 22);
      pdf.setFont("helvetica", "bold");
      pdf.text(`R$ ${receitas.toFixed(2)}`, 55, yPos + 22);
      
      // Despesas
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(239, 68, 68);
      pdf.text("Despesas:", 20, yPos + 32);
      pdf.setFont("helvetica", "bold");
      pdf.text(`R$ ${despesas.toFixed(2)}`, 55, yPos + 32);
      
      // Saldo com destaque
      pdf.setDrawColor(saldo >= 0 ? 16 : 239, saldo >= 0 ? 185 : 68, saldo >= 0 ? 129 : 68);
      pdf.setLineWidth(1);
      pdf.line(20, yPos + 37, pageWidth - 20, yPos + 37);
      
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(saldo >= 0 ? 16 : 239, saldo >= 0 ? 185 : 68, saldo >= 0 ? 129 : 68);
      pdf.text("Saldo:", 20, yPos + 45);
      pdf.text(`R$ ${saldo.toFixed(2)}`, 55, yPos + 45);
      
      // Box de Gastos por Categoria
      yPos = 115;
      
      const sortedCategories = Object.entries(categoryStats).sort((a, b) => b[1] - a[1]);
      
      pdf.setDrawColor(59, 130, 246);
      pdf.setLineWidth(0.5);
      
      const categoryBoxHeight = Math.min(sortedCategories.length * 8 + 20, 100);
      pdf.roundedRect(15, yPos, pageWidth - 30, categoryBoxHeight, 3, 3);
      
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(31, 41, 55);
      pdf.text("Gastos por Categoria", 20, yPos + 10);
      
      yPos += 20;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(55, 65, 81);
      
      sortedCategories.forEach(([category, amount], index) => {
        const percentage = ((amount / despesas) * 100).toFixed(1);
        
        // Alternar cores de fundo para melhor legibilidade
        if (index % 2 === 0) {
          pdf.setFillColor(249, 250, 251);
          pdf.rect(17, yPos - 4, pageWidth - 34, 7, "F");
        }
        
        pdf.setTextColor(31, 41, 55);
        pdf.text(`${category}:`, 20, yPos);
        
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(59, 130, 246);
        pdf.text(`R$ ${amount.toFixed(2)}`, 80, yPos);
        
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(107, 114, 128);
        pdf.text(`(${percentage}%)`, 120, yPos);
        
        yPos += 8;
      });
      
      // Rodapé
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.5);
      pdf.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
      
      pdf.setFontSize(9);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Total de transações: ${monthTransactions.length}`, 15, pageHeight - 12);
      
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(59, 130, 246);
      const footerText = "Fineasy - Controle Financeiro";
      const footerWidth = pdf.getTextWidth(footerText);
      pdf.text(footerText, pageWidth - footerWidth - 15, pageHeight - 12);
      
      pdf.save(`relatorio-${monthName.replace(/\s/g, '-')}.pdf`);
      toast.success("PDF gerado com sucesso!");
      
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setLoading(false);
    }
  };

  const generateExcel = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado");
        setLoading(false);
        return;
      }

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= firstDay && tDate <= lastDay;
      });

      if (monthTransactions.length === 0) {
        toast.error("Nenhuma transação encontrada para este mês");
        setLoading(false);
        return;
      }

      const receitas = monthTransactions
        .filter(t => t.type === "receita")
        .reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0);

      const despesas = monthTransactions
        .filter(t => t.type === "despesa")
        .reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0);

      const saldo = receitas - despesas;

      const categoryStats: Record<string, number> = {};
      monthTransactions
        .filter(t => t.type === "despesa" && t.categories)
        .forEach(t => {
          const categoryName = t.categories.name;
          categoryStats[categoryName] = (categoryStats[categoryName] || 0) + Number(t.amount_brl || t.amount);
        });

      const monthName = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

      const wb = XLSX.utils.book_new();

      const summaryData = [
        ['Relatório Financeiro', monthName],
        [],
        ['Tipo', 'Valor'],
        ['Receitas', `R$ ${receitas.toFixed(2)}`],
        ['Despesas', `R$ ${despesas.toFixed(2)}`],
        ['Saldo', `R$ ${saldo.toFixed(2)}`],
        [],
        ['Categoria', 'Valor', 'Percentual'],
        ...Object.entries(categoryStats)
          .sort((a, b) => b[1] - a[1])
          .map(([cat, val]) => [cat, `R$ ${val.toFixed(2)}`, `${((val / despesas) * 100).toFixed(1)}%`]),
        [],
        ['Total de transações:', monthTransactions.length],
      ];
      
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

      const transactionsData = [
        ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor'],
        ...monthTransactions.map(t => [
          new Date(t.date).toLocaleDateString('pt-BR'),
          t.description,
          t.categories?.name || 'Sem categoria',
          t.type === 'receita' ? 'Receita' : 'Despesa',
          `R$ ${Number(t.amount_brl || t.amount).toFixed(2)}`,
        ]),
      ];
      
      const wsTransactions = XLSX.utils.aoa_to_sheet(transactionsData);
      XLSX.utils.book_append_sheet(wb, wsTransactions, 'Transações');

      XLSX.writeFile(wb, `relatorio-${monthName.replace(/\s/g, '-')}.xlsx`);
      toast.success("Excel gerado com sucesso!");
      
    } catch (error: any) {
      console.error("Error generating Excel:", error);
      toast.error("Erro ao gerar Excel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Relatório Mensal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Baixe um resumo completo das suas finanças do mês atual em PDF ou Excel.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button 
            onClick={generatePDF} 
            disabled={loading} 
            variant="outline"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Baixar PDF
              </>
            )}
          </Button>
          
          <Button 
            onClick={generateExcel} 
            disabled={loading} 
            variant="outline"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Baixar Excel
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyReport;
