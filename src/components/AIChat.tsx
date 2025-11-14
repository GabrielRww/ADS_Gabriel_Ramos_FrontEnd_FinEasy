import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Brain, Send, Loader2, Sparkles, Bot, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "Como posso economizar mais dinheiro?",
  "Quais são meus maiores gastos?",
  "Estou gastando muito em alguma categoria?",
  "Como está minha saúde financeira?",
  "Dê dicas para reduzir despesas",
];

const AIChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (question?: string) => {
    const messageText = question || input;
    if (!messageText.trim() || loading) return;

    const userMessage: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado");
        return;
      }

      const { data, error } = await supabase.functions.invoke("ai-chat", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          messages: [...messages, userMessage],
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error in AI chat:", error);
      if (error.message?.includes("429")) {
        toast.error("Limite de requisições excedido. Tente novamente mais tarde.");
      } else if (error.message?.includes("402")) {
        toast.error("Créditos insuficientes. Adicione créditos ao seu workspace.");
      } else {
        toast.error(error.message || "Erro ao enviar mensagem");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-[600px] overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader className="border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent backdrop-blur-sm">
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 backdrop-blur-sm">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Assistente Financeiro IA
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12 animate-fade-in">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                <Sparkles className="h-16 w-16 mx-auto text-primary relative z-10" />
              </div>
              <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Olá! Sou seu assistente financeiro
              </h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Pergunte-me qualquer coisa sobre suas finanças
              </p>
              <div className="space-y-3 max-w-md mx-auto">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-4">
                  Perguntas sugeridas:
                </p>
                {SUGGESTED_QUESTIONS.map((question, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="w-full text-left justify-start hover:bg-primary/10 hover:border-primary/30 hover:scale-[1.02] transition-all duration-200 group"
                    onClick={() => handleSendMessage(question)}
                    disabled={loading}
                  >
                    <Sparkles className="h-3 w-3 mr-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex gap-3 animate-fade-in ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5">
                  <AvatarFallback className="bg-transparent">
                    <Bot className="h-4 w-4 text-primary" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground"
                    : "bg-card border border-border/50"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                )}
              </div>
              {message.role === "user" && (
                <Avatar className="h-8 w-8 border-2 border-primary bg-gradient-to-br from-primary to-primary/80">
                  <AvatarFallback className="bg-transparent text-primary-foreground">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start animate-fade-in">
              <Avatar className="h-8 w-8 border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5">
                <AvatarFallback className="bg-transparent">
                  <Bot className="h-4 w-4 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-card border border-border/50 rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Pensando...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t bg-gradient-to-b from-transparent to-background/50 backdrop-blur-sm p-4">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua pergunta sobre finanças..."
              disabled={loading}
              className="flex-1 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-colors"
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={loading || !input.trim()}
              size="icon"
              className="bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIChat;
