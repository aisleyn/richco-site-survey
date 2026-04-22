const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  vendorEmail: string;
  vendorName: string;
  projectName: string;
  flipbookUrl: string;
  startDate: string;
  endDate: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { vendorEmail, vendorName, projectName, flipbookUrl, startDate, endDate } =
      (await req.json()) as EmailRequest;

    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
    if (!sendgridApiKey) {
      throw new Error("SendGrid API key not configured");
    }

    const htmlContent = `
      <p>Dear ${vendorName},</p>

      <p>Please find below a summary of the current repair updates for this biweekly period:</p>

      <strong>Project/Location:</strong> ${projectName}<br>
      <strong>Reporting Period:</strong> ${startDate} – ${endDate}

      <h3>Flipbook Review</h3>
      <p><a href="${flipbookUrl}" style="background-color: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Full Report</a></p>

      <p>Please review and let us know if you have any questions or require additional documentation.</p>

      <p>Best regards,<br>
      Richco Site Survey Team<br>
      <a href="mailto:noreply@richco.com">noreply@richco.com</a></p>
    `;

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${sendgridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: vendorEmail }] }],
        from: { email: "noreply@richco.com", name: "Richco Site Survey" },
        subject: `Biweekly Update: ${projectName}`,
        content: [{ type: "text/html", value: htmlContent }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid error: ${error}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
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
