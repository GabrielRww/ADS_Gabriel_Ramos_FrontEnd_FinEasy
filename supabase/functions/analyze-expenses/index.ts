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
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from("transactions")
      .select("*, categories(*)")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (transactionsError) throw transactionsError;

    if (!transactions || transactions.length === 0) {
      return new Response(
        JSON.stringify({ 
          analysis: "Você ainda não possui transações registradas. Adicione algumas transações para receber análises inteligentes sobre seus gastos!" 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate statistics
    const receitas = transactions
      .filter((t) => t.type === "receita")
      .reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0);

    const despesas = transactions
      .filter((t) => t.type === "despesa")
      .reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0);

    // Group by category
    const categoryStats: Record<string, number> = {};
    transactions
      .filter((t) => t.type === "despesa" && t.categories)
      .forEach((t) => {
        const categoryName = t.categories!.name;
        categoryStats[categoryName] = (categoryStats[categoryName] || 0) + Number(t.amount_brl || t.amount);
      });

    // Prepare data for AI
    const dataForAI = {
      totalReceitas: receitas,
      totalDespesas: despesas,
      saldo: receitas - despesas,
      gastoPorCategoria: categoryStats,
      numeroDeTransacoes: transactions.length,
    };

    // Call Google Gemini AI for analysis
    const prompt = `Você é um assistente financeiro inteligente. Analise os dados financeiros do usuário e forneça insights úteis e acionáveis sobre seus hábitos de gastos. Seja direto e objetivo, destacando os pontos mais importantes.

Analise meus dados financeiros e me dê insights:

Receitas totais: R$ ${dataForAI.totalReceitas.toFixed(2)}
Despesas totais: R$ ${dataForAI.totalDespesas.toFixed(2)}
Saldo: R$ ${dataForAI.saldo.toFixed(2)}
Número de transações: ${dataForAI.numeroDeTransacoes}

Gastos por categoria:
${Object.entries(dataForAI.gastoPorCategoria)
  .map(([cat, val]) => `- ${cat}: R$ ${val.toFixed(2)} (${((val / dataForAI.totalDespesas) * 100).toFixed(1)}%)`)
  .join("\n")}

Forneça uma análise detalhada destacando:
1. Onde estou gastando mais dinheiro (percentuais)
2. Se há categorias com gastos excessivos
3. Sugestões de economia
4. Pontos positivos e negativos do meu comportamento financeiro`;

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${googleApiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Google Gemini API error:", aiResponse.status, errorText);
      throw new Error(`Google Gemini API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar análise.";

    return new Response(
      JSON.stringify({ analysis }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-expenses:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao analisar despesas";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});