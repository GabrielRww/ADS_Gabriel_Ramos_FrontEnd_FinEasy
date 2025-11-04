import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        navigate("/dashboard");
      } else {
        navigate("/landing");
      }
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  if (loading) {
    return null;
  }

  return null;
};

export default Index;