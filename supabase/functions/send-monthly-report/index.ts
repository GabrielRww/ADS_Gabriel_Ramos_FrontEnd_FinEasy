import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Send email using Resend API
    console.log(`Sending email to ${user.email}...`);
    
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Fineasy <onboarding@resend.dev>",
        to: [user.email!],
        subject: `Relatório Financeiro - ${monthName}`,
        html,
      }),
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