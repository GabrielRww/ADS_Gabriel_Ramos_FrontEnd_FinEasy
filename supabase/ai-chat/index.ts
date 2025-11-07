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

    // Get messages from request
    const { messages } = await req.json();

    // Calculate financial statistics
    const receitas = transactions
      ?.filter((t) => t.type === "receita")
      .reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0) || 0;

    const despesas = transactions
      ?.filter((t) => t.type === "despesa")
      .reduce((sum, t) => sum + Number(t.amount_brl || t.amount), 0) || 0;

    const categoryStats: Record<string, number> = {};
    transactions
      ?.filter((t) => t.type === "despesa" && t.categories)
      .forEach((t) => {
        const categoryName = t.categories!.name;
        categoryStats[categoryName] = (categoryStats[categoryName] || 0) + Number(t.amount_brl || t.amount);
      });

    const financialContext = `
Contexto Financeiro do Usuário:
- Receitas totais: R$ ${receitas.toFixed(2)}
- Despesas totais: R$ ${despesas.toFixed(2)}
- Saldo: R$ ${(receitas - despesas).toFixed(2)}
- Número de transações: ${transactions?.length || 0}

Gastos por categoria:
${Object.entries(categoryStats)
  .map(([cat, val]) => `- ${cat}: R$ ${val.toFixed(2)} (${((val / despesas) * 100).toFixed(1)}%)`)
  .join("\n")}
`;

    const systemPrompt = `Você é um assistente financeiro inteligente e amigável. Use o contexto financeiro fornecido para responder às perguntas do usuário de forma clara e objetiva.

${financialContext}

Diretrizes:
- Seja direto e útil nas suas respostas
- Use formatação markdown para deixar as respostas mais legíveis
- Destaque informações importantes com **negrito**
- Use listas quando apropriado
- Forneça dicas práticas e acionáveis
- Seja empático e motivador
- Se não houver dados suficientes, diga isso de forma construtiva`;

    console.log("Sending request to Lovable AI Gateway...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
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
      
      throw new Error(`Erro na API de IA: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const response = aiData.choices?.[0]?.message?.content || "Desculpe, não consegui gerar uma resposta.";

    return new Response(
      JSON.stringify({ response }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in ai-chat:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao processar sua mensagem";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});