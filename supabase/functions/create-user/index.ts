import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  funcao?: string;
  nivelAcesso: "Usuário" | "Supervisão" | "Gestão" | "Admin";
  permissoes?: Record<string, boolean>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verificar autenticação do usuário que está fazendo a requisição
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado - token não fornecido");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Cliente com token do usuário para verificar permissões
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verificar se o usuário que está criando é admin
    const { data: { user: callerUser }, error: callerError } = await supabaseUser.auth.getUser();
    if (callerError || !callerUser) {
      throw new Error("Não autorizado - usuário inválido");
    }

    // Buscar perfil do usuário que está criando
    const { data: callerProfile, error: profileError } = await supabaseUser
      .from("profiles")
      .select("nivelAcesso, permissoes")
      .eq("id", callerUser.id)
      .single();

    if (profileError || !callerProfile) {
      throw new Error("Perfil não encontrado");
    }

    // Verificar se é admin
    const isAdmin = 
      callerProfile.nivelAcesso === "Admin" || 
      (callerProfile.permissoes as any)?.is_admin === true;

    if (!isAdmin) {
      throw new Error("Apenas administradores podem criar usuários");
    }

    // Parse do body
    const body: CreateUserRequest = await req.json();
    const { email, password, fullName, funcao, nivelAcesso, permissoes } = body;

    if (!email || !password || !fullName) {
      throw new Error("Email, senha e nome são obrigatórios");
    }

    if (password.length < 6) {
      throw new Error("A senha deve ter no mínimo 6 caracteres");
    }

    // Cliente com service role para criar usuário
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verificar se email já existe
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some((u) => u.email === email);
    if (emailExists) {
      throw new Error("Já existe um usuário com este email");
    }

    // Criar usuário com admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Email já confirmado
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError) {
      console.error("Erro ao criar usuário:", createError);
      throw new Error(createError.message);
    }

    if (!newUser.user) {
      throw new Error("Erro ao criar usuário - resposta inválida");
    }

    // Definir permissões padrão baseadas no nível de acesso
    const defaultPermissions = getDefaultPermissions(nivelAcesso);
    const finalPermissoes = permissoes ? { ...defaultPermissions, ...permissoes } : defaultPermissions;

    // Atualizar perfil (o trigger on_auth_user_created já cria o perfil básico)
    // Aguardar um pouco para o trigger executar
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: fullName,
        email: email,
        funcao: funcao || null,
        nivelAcesso: nivelAcesso,
        permissoes: finalPermissoes,
        force_password_change: true, // Forçar troca de senha no primeiro acesso
      })
      .eq("id", newUser.user.id);

    if (updateError) {
      console.error("Erro ao atualizar perfil:", updateError);
      // Não falhar, o perfil pode não ter sido criado ainda pelo trigger
      // Tentar criar o perfil
      const { error: insertError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: newUser.user.id,
          full_name: fullName,
          email: email,
          funcao: funcao || null,
          nivelAcesso: nivelAcesso,
          permissoes: finalPermissoes,
          force_password_change: true,
        });

      if (insertError) {
        console.error("Erro ao inserir perfil:", insertError);
      }
    }

    console.log(`Usuário criado com sucesso: ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Usuário criado com sucesso",
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          fullName: fullName,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Erro:", error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

function getDefaultPermissions(nivel: string): Record<string, boolean> {
  const basePermissions = {
    dashboard: true,
    kanban: true,
    tasks: true,
    crm: false,
    projects: false,
    team: false,
    settings: false,
    is_admin: false,
    can_view_customers: true,
    can_manage_customers: false,
  };

  switch (nivel) {
    case "Admin":
      return {
        dashboard: true,
        kanban: true,
        tasks: true,
        crm: true,
        projects: true,
        team: true,
        settings: true,
        is_admin: true,
        can_view_customers: true,
        can_manage_customers: true,
      };
    case "Gestão":
      return { ...basePermissions, projects: true, team: true, crm: true, can_manage_customers: true };
    case "Supervisão":
      return { ...basePermissions, projects: true };
    case "Usuário":
    default:
      return basePermissions;
  }
}
