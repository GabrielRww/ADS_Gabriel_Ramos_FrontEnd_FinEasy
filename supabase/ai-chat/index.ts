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

    // Get user's credit cards
    const { data: creditCards, error: cardsError } = await supabase
      .from("credit_cards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (cardsError) throw cardsError;

    // Get user's financial goals
    const { data: financialGoals, error: goalsError } = await supabase
      .from("financial_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (goalsError) throw goalsError;

    // Get user's categories
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (categoriesError) throw categoriesError;

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

    // Credit cards statistics
    const totalCreditLimit = creditCards?.reduce((sum, card) => sum + Number(card.credit_limit), 0) || 0;
    const totalUsedLimit = creditCards?.reduce((sum, card) => sum + Number(card.used_limit), 0) || 0;
    const totalAvailableLimit = totalCreditLimit - totalUsedLimit;
    const creditUsagePercentage = totalCreditLimit > 0 ? (totalUsedLimit / totalCreditLimit) * 100 : 0;

    const cardsContext = creditCards?.length ? `
Cartões de Crédito (${creditCards.length} cartões):
${creditCards.map((card) => {
  const available = Number(card.credit_limit) - Number(card.used_limit);
  const usage = (Number(card.used_limit) / Number(card.credit_limit)) * 100;
  return `- ${card.card_name} (${card.card_brand}): Limite R$ ${Number(card.credit_limit).toFixed(2)} | Usado R$ ${Number(card.used_limit).toFixed(2)} | Disponível R$ ${available.toFixed(2)} | Uso: ${usage.toFixed(1)}% | Fechamento: dia ${card.closing_day} | Vencimento: dia ${card.due_day}`;
}).join("\n")}
- Total de limite: R$ ${totalCreditLimit.toFixed(2)}
- Total utilizado: R$ ${totalUsedLimit.toFixed(2)}
- Total disponível: R$ ${totalAvailableLimit.toFixed(2)}
- Uso geral dos cartões: ${creditUsagePercentage.toFixed(1)}%
` : "Nenhum cartão de crédito cadastrado.";

    // Financial goals statistics
    const goalsContext = financialGoals?.length ? `
Metas Financeiras (${financialGoals.length} metas):
${financialGoals.map((goal) => {
  const progress = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
  const remaining = Number(goal.target_amount) - Number(goal.current_amount);
  const status = goal.completed ? "✓ Concluída" : "Em progresso";
  return `- ${goal.goal_name} (${goal.goal_type}): ${status} | Meta R$ ${Number(goal.target_amount).toFixed(2)} | Atual R$ ${Number(goal.current_amount).toFixed(2)} | Faltam R$ ${remaining.toFixed(2)} | Progresso: ${progress.toFixed(1)}%${goal.target_date ? ` | Data alvo: ${goal.target_date}` : ''}${goal.monthly_contribution ? ` | Contribuição mensal: R$ ${Number(goal.monthly_contribution).toFixed(2)}` : ''}`;
}).join("\n")}
` : "Nenhuma meta financeira cadastrada.";

    // Categories context
    const categoriesContext = categories?.length ? `
Categorias (${categories.length} categorias):
${categories.map((cat) => `- ${cat.icon} ${cat.name}`).join(", ")}
` : "Nenhuma categoria cadastrada.";

    const financialContext = `
Contexto Financeiro Completo do Usuário:

TRANSAÇÕES:
- Receitas totais: R$ ${receitas.toFixed(2)}
- Despesas totais: R$ ${despesas.toFixed(2)}
- Saldo: R$ ${(receitas - despesas).toFixed(2)}
- Número de transações: ${transactions?.length || 0}

Gastos por categoria:
${Object.entries(categoryStats)
  .map(([cat, val]) => `- ${cat}: R$ ${val.toFixed(2)} (${((val / despesas) * 100).toFixed(1)}%)`)
  .join("\n")}

${cardsContext}

${goalsContext}

${categoriesContext}
`;

    const systemPrompt = `Você é um assistente financeiro inteligente e amigável chamado FineasyAI. Você tem acesso completo aos dados financeiros do usuário e pode ajudá-lo com análises detalhadas.

${financialContext}

Suas Capacidades:
- Analisar transações, receitas e despesas
- Avaliar o uso de cartões de crédito e dar recomendações
- Acompanhar o progresso de metas financeiras
- Sugerir otimizações de gastos por categoria
- Alertar sobre possíveis problemas financeiros (ex: uso alto do crédito, metas atrasadas)
- Fornecer insights e dicas personalizadas

Diretrizes:
- Seja direto, útil e proativo nas suas respostas
- Use formatação markdown para deixar as respostas mais legíveis
- Destaque informações importantes com **negrito**
- Use listas e tabelas quando apropriado
- Forneça dicas práticas e acionáveis baseadas nos dados reais do usuário
- Seja empático e motivador, especialmente quando há desafios financeiros
- Se não houver dados suficientes, diga isso de forma construtiva
- Quando analisar cartões, sempre mencione o score e o uso percentual
- Para metas, sempre mostre o progresso e quanto falta para alcançar
- Seja específico com números e datas dos dados reais do usuário`;

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
