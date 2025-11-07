import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to generate PDF
async function generatePDF(
  monthName: string,
  receitas: number,
  despesas: number,
  saldo: number,
  categoryStats: Record<string, number>,
  transactions: any[]
): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let yPosition = 800;
  const leftMargin = 50;
  
  // Title
  page.drawText('Relatório Financeiro', {
    x: leftMargin,
    y: yPosition,
    size: 24,
    font: boldFont,
    color: rgb(0.39, 0.4, 0.95),
  });
  
  yPosition -= 30;
  page.drawText(monthName, {
    x: leftMargin,
    y: yPosition,
    size: 16,
    font: font,
  });
  
  yPosition -= 50;
  
  // Summary
  page.drawText('Resumo do Mês', {
    x: leftMargin,
    y: yPosition,
    size: 14,
    font: boldFont,
  });
  
  yPosition -= 25;
  page.drawText(`Receitas: R$ ${receitas.toFixed(2)}`, {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: font,
    color: rgb(0.06, 0.73, 0.51),
  });
  
  yPosition -= 20;
  page.drawText(`Despesas: R$ ${despesas.toFixed(2)}`, {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: font,
    color: rgb(0.94, 0.27, 0.27),
  });
  
  yPosition -= 20;
  page.drawText(`Saldo: R$ ${saldo.toFixed(2)}`, {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: saldo >= 0 ? rgb(0.06, 0.73, 0.51) : rgb(0.94, 0.27, 0.27),
  });
  
  yPosition -= 40;
  
  // Category breakdown
  page.drawText('Gastos por Categoria', {
    x: leftMargin,
    y: yPosition,
    size: 14,
    font: boldFont,
  });
  
  yPosition -= 25;
  const sortedCategories = Object.entries(categoryStats).sort((a, b) => b[1] - a[1]);
  
  for (const [category, amount] of sortedCategories) {
    const percentage = ((amount / despesas) * 100).toFixed(1);
    page.drawText(`${category}: R$ ${amount.toFixed(2)} (${percentage}%)`, {
      x: leftMargin,
      y: yPosition,
      size: 10,
      font: font,
    });
    yPosition -= 18;
  }
  
  yPosition -= 20;
  page.drawText(`Total de transações: ${transactions.length}`, {
    x: leftMargin,
    y: yPosition,
    size: 10,
    font: font,
    color: rgb(0.42, 0.45, 0.5),
  });
  
  const pdfBytes = await pdfDoc.save();
  const base64 = btoa(String.fromCharCode(...pdfBytes));
  return base64;
}

// Helper function to generate Excel
function generateExcel(
  monthName: string,
  receitas: number,
  despesas: number,
  saldo: number,
  categoryStats: Record<string, number>,
  transactions: any[]
): string {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['Relatório Financeiro', monthName],
    [],
    ['Tipo', 'Valor'],
    ['Receitas', receitas.toFixed(2)],
    ['Despesas', despesas.toFixed(2)],
    ['Saldo', saldo.toFixed(2)],
    [],
    ['Categoria', 'Valor', 'Percentual'],
    ...Object.entries(categoryStats)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, val]) => [cat, val.toFixed(2), `${((val / despesas) * 100).toFixed(1)}%`]),
    [],
    ['Total de transações:', transactions.length],
  ];
  
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

  // Transactions sheet
  const transactionsData = [
    ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor'],
    ...transactions.map(t => [
      new Date(t.date).toLocaleDateString('pt-BR'),
      t.description,
      t.categories?.name || 'Sem categoria',
      t.type === 'receita' ? 'Receita' : 'Despesa',
      Number(t.amount_brl || t.amount).toFixed(2),
    ]),
  ];
  
  const wsTransactions = XLSX.utils.aoa_to_sheet(transactionsData);
  XLSX.utils.book_append_sheet(wb, wsTransactions, 'Transações');

  // Generate Excel file as base64
  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return btoa(String.fromCharCode(...new Uint8Array(excelBuffer)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting send-monthly-report function");
    
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { format = "pdf" } = await req.json();
    console.log(`Report format requested: ${format}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      throw new Error("Configuração do servidor incompleta");
    }

    if (!resendApiKey) {
      console.error("Missing RESEND_API_KEY");
      throw new Error("API de e-mail não configurada. Configure a chave RESEND_API_KEY.");
    }

    console.log("Environment variables loaded successfully");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const token = authHeader.replace("Bearer ", "");
    console.log("Authenticating user...");
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("User authentication failed:", userError);
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`User authenticated: ${user.email}`);

    // Get user profile
    console.log("Fetching user profile...");
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Get current month transactions
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    console.log(`Fetching transactions from ${firstDay} to ${lastDay}...`);
    
    const { data: transactions, error: transactionsError } = await supabase
      .from("transactions")
      .select("*, categories(*)")
      .eq("user_id", user.id)
      .gte("date", firstDay)
      .lte("date", lastDay)
      .order("date", { ascending: false });

    if (transactionsError) {
      console.error("Error fetching transactions:", transactionsError);
      throw transactionsError;
    }

    console.log(`Found ${transactions?.length || 0} transactions`);

    if (!transactions || transactions.length === 0) {
      console.log("No transactions found for this month");
      return new Response(
        JSON.stringify({ error: "Nenhuma transação encontrada para este mês. Adicione algumas transações primeiro." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate totals
    const receitas = transactions
      .filter((t) => t.type === "receita")
      .reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0);

    const despesas = transactions
      .filter((t) => t.type === "despesa")
      .reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0);

    const saldo = receitas - despesas;

    // Group by category
    const categoryStats: Record<string, number> = {};
    transactions
      .filter((t) => t.type === "despesa" && t.categories)
      .forEach((t) => {
        const categoryName = t.categories!.name;
        categoryStats[categoryName] = (categoryStats[categoryName] || 0) + Number(t.amount_brl || t.amount);
      });

    // Create HTML email
    const monthName = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    const categoriesHtml = Object.entries(categoryStats)
      .sort((a, b) => b[1] - a[1])
      .map(
        ([cat, val]) =>
          `<tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${cat}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">
              R$ ${val.toFixed(2)}
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">
              ${((val / despesas) * 100).toFixed(1)}%
            </td>
          </tr>`
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Relatório Mensal - ${monthName}</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #6366f1;">Relatório Financeiro - ${monthName}</h1>
          
          <p>Olá ${profile?.full_name || user.email}!</p>
          
          <p>Aqui está o resumo das suas finanças de ${monthName}:</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0;">Resumo do Mês</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; font-weight: bold;">Receitas:</td>
                <td style="padding: 10px; text-align: right; color: #10b981; font-weight: bold;">
                  R$ ${receitas.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold;">Despesas:</td>
                <td style="padding: 10px; text-align: right; color: #ef4444; font-weight: bold;">
                  R$ ${despesas.toFixed(2)}
                </td>
              </tr>
              <tr style="border-top: 2px solid #6366f1;">
                <td style="padding: 10px; font-weight: bold;">Saldo:</td>
                <td style="padding: 10px; text-align: right; color: ${saldo >= 0 ? "#10b981" : "#ef4444"}; font-weight: bold; font-size: 18px;">
                  R$ ${saldo.toFixed(2)}
                </td>
              </tr>
            </table>
          </div>
          
          <h3>Gastos por Categoria</h3>
          <table style="width: 100%; border-collapse: collapse; background-color: white;">
            <thead>
              <tr style="background-color: #6366f1; color: white;">
                <th style="padding: 10px; text-align: left;">Categoria</th>
                <th style="padding: 10px; text-align: right;">Valor</th>
                <th style="padding: 10px; text-align: right;">%</th>
              </tr>
            </thead>
            <tbody>
              ${categoriesHtml}
            </tbody>
          </table>
          
          <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
            Total de transações: ${transactions.length}
          </p>
          
          <div style="margin-top: 30px; padding: 15px; background-color: #eff6ff; border-left: 4px solid #6366f1;">
            <p style="margin: 0;"><strong>Dica:</strong> ${
              saldo < 0
                ? "Suas despesas superaram suas receitas este mês. Considere revisar seus gastos!"
                : "Parabéns! Você conseguiu economizar este mês. Continue assim!"
            }</p>
          </div>
          
          <p style="margin-top: 30px; text-align: center; color: #6b7280; font-size: 12px;">
            Este é um relatório automático gerado pelo seu sistema de controle financeiro.
          </p>
        </body>
      </html>
    `;

    // Generate attachment based on format
    let attachment = null;
    
    if (format === "pdf") {
      console.log("Generating PDF...");
      const pdfContent = await generatePDF(monthName, receitas, despesas, saldo, categoryStats, transactions);
      attachment = {
        filename: `relatorio-${monthName.replace(/\s/g, '-')}.pdf`,
        content: pdfContent,
      };
    } else if (format === "excel") {
      console.log("Generating Excel...");
      const excelContent = await generateExcel(monthName, receitas, despesas, saldo, categoryStats, transactions);
      attachment = {
        filename: `relatorio-${monthName.replace(/\s/g, '-')}.xlsx`,
        content: excelContent,
      };
    }

    // Send email using Resend API
    console.log(`Sending email to ${user.email}...`);
    
    const emailBody: any = {
      from: "Fineasy <onboarding@resend.dev>",
      to: [user.email!],
      subject: `Relatório Financeiro ${format.toUpperCase()} - ${monthName}`,
      html,
    };

    if (attachment) {
      emailBody.attachments = [attachment];
    }
    
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailBody),
    });

    const emailData = await emailResponse.json();
    
    if (!emailResponse.ok) {
      console.error("Resend API error:", emailData);
      throw new Error(`Erro ao enviar e-mail: ${emailData.message || JSON.stringify(emailData)}`);
    }

    console.log("Email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ message: "Relatório enviado com sucesso para seu e-mail!" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-monthly-report:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao enviar relatório";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});