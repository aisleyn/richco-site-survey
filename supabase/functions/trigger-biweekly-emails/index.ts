import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Get all active projects with their vendors
    const { data: projects, error: projectError } = await supabase
      .from("projects")
      .select(
        `
        id,
        name,
        client_id,
        profiles!projects_client_id_fkey (
          id,
          vendor_id,
          vendors!profiles_vendor_id_fkey (
            id,
            name
          )
        )
      `
      )
      .eq("archived", false);

    if (projectError) throw projectError;

    let emailsSent = 0;
    const errors = [];

    // For each project, send email to associated vendor
    for (const project of projects || []) {
      try {
        const vendor = project.profiles?.vendors;
        if (!vendor) continue;

        const vendorEmail = vendor.id; // This needs to be the vendor's contact email
        const flipbookUrl = `${Deno.env.get("APP_URL")}/staff/projects/${project.id}/flipbook`;

        const today = new Date();
        const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

        const response = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-biweekly-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({
              vendorEmail,
              vendorName: vendor.name,
              projectName: project.name,
              flipbookUrl,
              startDate: twoWeeksAgo.toLocaleDateString(),
              endDate: today.toLocaleDateString(),
            }),
          }
        );

        if (response.ok) {
          emailsSent++;
        } else {
          errors.push(`Failed to send email for project ${project.name}`);
        }
      } catch (err) {
        errors.push(`Error processing project ${project.name}: ${String(err)}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        errors: errors.length > 0 ? errors : null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
