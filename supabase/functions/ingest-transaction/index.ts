import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-device-api-key, x-request-signature, x-request-timestamp, x-request-nonce",
};

interface TransactionPayload {
  amount: number;
  transaction_type: "debit" | "credit";
  description?: string;
  merchant?: string;
  source_app?: string;
  raw_notification?: string;
  transaction_time?: string;
  nonce: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Device authentication via API key
    const apiKey = req.headers.get("x-device-api-key");
    const requestTimestamp = req.headers.get("x-request-timestamp");
    const requestNonce = req.headers.get("x-request-nonce");

    if (!apiKey || !requestTimestamp || !requestNonce) {
      return new Response(
        JSON.stringify({ error: "Missing authentication headers" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Replay attack protection: reject requests older than 5 minutes
    const requestTime = parseInt(requestTimestamp);
    const now = Date.now();
    if (isNaN(requestTime) || Math.abs(now - requestTime) > 5 * 60 * 1000) {
      return new Response(
        JSON.stringify({ error: "Request expired or invalid timestamp" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate device API key
    const { data: device, error: deviceError } = await supabaseAdmin
      .from("devices")
      .select("id, user_id, is_active")
      .eq("api_key", apiKey)
      .single();

    if (deviceError || !device || !device.is_active) {
      return new Response(
        JSON.stringify({ error: "Invalid or inactive device" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check nonce for replay protection
    const { data: existingNonce } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("nonce", requestNonce)
      .eq("device_id", device.id)
      .maybeSingle();

    if (existingNonce) {
      return new Response(
        JSON.stringify({ error: "Duplicate request (replay detected)" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: TransactionPayload = await req.json();

    // Input validation
    if (!body.amount || !body.transaction_type || !body.nonce) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: amount, transaction_type, nonce" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["debit", "credit"].includes(body.transaction_type)) {
      return new Response(
        JSON.stringify({ error: "Invalid transaction_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof body.amount !== "number" || body.amount <= 0 || body.amount > 999999999999) {
      return new Response(
        JSON.stringify({ error: "Invalid amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic fraud detection
    let isFlagged = false;
    let flagReason: string | null = null;

    // Flag unusually large transactions
    if (body.amount > 50000000) {
      isFlagged = true;
      flagReason = "Unusually large transaction amount";
    }

    // Flag rapid successive transactions (more than 5 in last minute)
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count: recentCount } = await supabaseAdmin
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("device_id", device.id)
      .gte("created_at", oneMinuteAgo);

    if ((recentCount ?? 0) >= 5) {
      isFlagged = true;
      flagReason = (flagReason ? flagReason + "; " : "") + "Rapid successive transactions detected";
    }

    // Insert transaction
    const { data: transaction, error: insertError } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: device.user_id,
        device_id: device.id,
        amount: body.amount,
        transaction_type: body.transaction_type,
        description: body.description?.substring(0, 500) ?? null,
        merchant: body.merchant?.substring(0, 200) ?? null,
        source_app: body.source_app?.substring(0, 100) ?? null,
        raw_notification: body.raw_notification?.substring(0, 1000) ?? null,
        transaction_time: body.transaction_time ?? new Date().toISOString(),
        is_flagged: isFlagged,
        flag_reason: flagReason,
        nonce: body.nonce,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to store transaction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update device last_seen
    await supabaseAdmin
      .from("devices")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", device.id);

    return new Response(
      JSON.stringify({ success: true, transaction_id: transaction.id, flagged: isFlagged }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
