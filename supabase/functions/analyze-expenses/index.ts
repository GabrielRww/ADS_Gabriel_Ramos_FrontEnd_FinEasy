import { serve } from "https:
import { createClient } from "https:

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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY não está configurada");
      return new Response(
        JSON.stringify({ error: "Chave de API não configurada." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Lovable API Key exists:", !!lovableApiKey);

    const supabase = createClient(supabaseUrl, supabaseKey);

    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    
    const { data: transactions, error: transactionsError } = await supabase
      .from("transactions")
      .select("*, categories(*)")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (transactionsError) throw transactionsError;

    
    const { data: creditCards, error: cardsError } = await supabase
      .from("credit_cards")
      .select("*")
      .eq("user_id", user.id);

    if (cardsError) throw cardsError;

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

    
    const receitas = transactions
      .filter((t) => t.type === "receita")
      .reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0);

    const despesasTransacoes = transactions
      .filter((t) => t.type === "despesa")
      .reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0);

    
    const despesasCartoes = creditCards?.reduce((sum, card) => sum + Number(card.used_limit), 0) || 0;
    const despesas = despesasTransacoes + despesasCartoes;

    
    const categoryStats: Record<string, number> = {};
    transactions
      .filter((t) => t.type === "despesa" && t.categories)
      .forEach((t) => {
        const categoryName = t.categories!.name;
        categoryStats[categoryName] = (categoryStats[categoryName] || 0) + Number(t.amount_brl || t.amount);
      });

    
    if (despesasCartoes > 0) {
      categoryStats["Cartões de Crédito"] = despesasCartoes;
    }

    
    const dataForAI = {
      totalReceitas: receitas,
      totalDespesas: despesas,
      despesasTransacoes: despesasTransacoes,
      despesasCartoes: despesasCartoes,
      saldo: receitas - despesas,
      gastoPorCategoria: categoryStats,
      numeroDeTransacoes: transactions.length,
      numeroDeCartoes: creditCards?.length || 0,
    };

    
    const prompt = `Você é um assistente financeiro inteligente. Analise os dados financeiros do usuário e forneça insights úteis e acionáveis sobre seus hábitos de gastos. Seja direto e objetivo, destacando os pontos mais importantes.

Forneça uma análise detalhada destacando:
1. Onde está gastando mais dinheiro (percentuais)
2. Se há categorias com gastos excessivos
3. Análise específica sobre gastos em cartões de crédito
4. Sugestões de economia específicas
5. Pontos positivos e negativos do comportamento financeiro

Dados financeiros:
- Receitas totais: R$ ${dataForAI.totalReceitas.toFixed(2)}
- Despesas totais: R$ ${dataForAI.totalDespesas.toFixed(2)}
  - Despesas em transações: R$ ${dataForAI.despesasTransacoes.toFixed(2)}
  - Despesas em cartões de crédito: R$ ${dataForAI.despesasCartoes.toFixed(2)}
- Saldo: R$ ${dataForAI.saldo.toFixed(2)}
- Número de transações: ${dataForAI.numeroDeTransacoes}
- Número de cartões de crédito: ${dataForAI.numeroDeCartoes}

Gastos por categoria:
${Object.entries(dataForAI.gastoPorCategoria)
  .map(([cat, val]) => `- ${cat}: R$ ${val.toFixed(2)} (${((val / dataForAI.totalDespesas) * 100).toFixed(1)}%)`)
  .join("\n")}`;

    console.log("Sending request to Lovable AI Gateway...");

    const aiResponse = await fetch("https:
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Lovable AI Gateway error:", {
        status: aiResponse.status,
        statusText: aiResponse.statusText,
        error: errorText
      });
      
      if (aiResponse.status === 429) {
        throw new Error("Limite de requisições excedido. Aguarde alguns instantes e tente novamente.");
      }
      if (aiResponse.status === 402) {
        throw new Error("Créditos insuficientes. Adicione créditos ao seu workspace Lovable.");
      }
      if (aiResponse.status === 500) {
        throw new Error("Erro interno do serviço de IA. Por favor, tente novamente em alguns instantes.");
      }
      
      throw new Error(`Erro na API de IA: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices?.[0]?.message?.content || "Não foi possível gerar análise.";

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