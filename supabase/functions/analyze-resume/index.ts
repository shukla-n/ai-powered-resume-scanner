import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import pdfParse from "npm:pdf-parse@1.1.1";
import { Buffer } from "node:buffer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type AnalysisOutput = {
  contact_info: {
    name?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    university?: string;
  };
  experience_years: number;
  radar_stats: {
    tech: number;
    leadership: number;
    education: number;
    projects: number;
    soft_skills: number;
  };
  match_scores: {
    technical: number;
    soft_skills: number;
    experience: number;
    overall: number;
  };
  fit_summary: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !LOVABLE_API_KEY) {
      throw new Error("Missing required server configuration");
    }

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: authError } = await anonClient.auth.getUser();
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { resumeText, filePath, jobRoleId } = await req.json();

    let extractedText: string = resumeText || "";

    if (!extractedText) {
      if (!filePath) {
        return new Response(JSON.stringify({ error: "Resume file path is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: fileBlob, error: downloadError } = await serviceClient.storage
        .from("resumes")
        .download(filePath);

      if (downloadError || !fileBlob) {
        throw new Error("Failed to download uploaded resume");
      }

      const bytes = await fileBlob.arrayBuffer();
      if (filePath.toLowerCase().endsWith(".pdf")) {
        const parsed = await pdfParse(Buffer.from(bytes));
        extractedText = parsed.text || "";
      } else {
        extractedText = new TextDecoder().decode(bytes);
      }
    }

    if (!extractedText.trim()) {
      return new Response(JSON.stringify({ error: "Could not extract resume text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let roleTitle = "General Role";
    if (jobRoleId) {
      const { data: roleData } = await serviceClient
        .from("job_roles")
        .select("title")
        .eq("id", jobRoleId)
        .maybeSingle();
      roleTitle = roleData?.title || roleTitle;
    }

    const systemPrompt = "You are a resume analysis expert. Evaluate resume fit for the selected role and return structured tool output only.";
    const userPrompt = `Analyze this resume for the selected job role and return JSON only.\n\nJob role: ${roleTitle}\n\nResume text:\n${extractedText.substring(0, 14000)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_resume",
              description: "Return structured resume analysis with scoring and summary",
              parameters: {
                type: "object",
                properties: {
                  contact_info: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      email: { type: "string" },
                      phone: { type: "string" },
                      linkedin: { type: "string" },
                      university: { type: "string" },
                    },
                    required: ["email", "phone", "linkedin"],
                    additionalProperties: false,
                  },
                  experience_years: { type: "number" },
                  radar_stats: {
                    type: "object",
                    properties: {
                      tech: { type: "number" },
                      leadership: { type: "number" },
                      education: { type: "number" },
                      projects: { type: "number" },
                      soft_skills: { type: "number" },
                    },
                    required: ["tech", "leadership", "education", "projects", "soft_skills"],
                    additionalProperties: false,
                  },
                  match_scores: {
                    type: "object",
                    properties: {
                      technical: { type: "number" },
                      soft_skills: { type: "number" },
                      experience: { type: "number" },
                      overall: { type: "number" },
                    },
                    required: ["technical", "soft_skills", "experience", "overall"],
                    additionalProperties: false,
                  },
                  fit_summary: { type: "string" },
                },
                required: ["contact_info", "experience_years", "radar_stats", "match_scores", "fit_summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_resume" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) throw new Error("AI did not return structured analysis");

    const analysis = JSON.parse(toolCall.function.arguments) as AnalysisOutput;

    return new Response(JSON.stringify({ ...analysis, resume_text: extractedText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-resume error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

