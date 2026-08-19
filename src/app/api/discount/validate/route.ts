import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { code, email, cart_total } = await req.json() as {
    code: string;
    email?: string;
    cart_total: number;
  };

  if (!code || !cart_total) {
    return NextResponse.json({ valid: false, error: "Kod och ordervärde krävs." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: dc, error } = await supabase
    .from("discount_codes")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .single();

  if (error || !dc) {
    return NextResponse.json({ valid: false, error: "Koden finns inte." });
  }
  if (!dc.is_active) {
    return NextResponse.json({ valid: false, error: "Koden är inaktiverad." });
  }
  if (dc.expires_at && new Date(dc.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: "Koden har gått ut." });
  }
  if (dc.max_uses !== null && dc.uses_count >= dc.max_uses) {
    return NextResponse.json({ valid: false, error: "Koden har använts för många gånger." });
  }
  if (dc.assigned_to_email && dc.assigned_to_email !== email) {
    return NextResponse.json({ valid: false, error: "Koden gäller inte för ditt konto." });
  }
  if (dc.min_order_value > 0 && cart_total < dc.min_order_value) {
    return NextResponse.json({
      valid: false,
      error: `Minsta ordervärde är ${dc.min_order_value} kr för den här koden.`,
    });
  }

  const discount_amount = dc.type === "percentage"
    ? Math.round((cart_total * dc.value) / 100)
    : Math.min(dc.value, cart_total);

  return NextResponse.json({
    valid: true,
    code: dc.code,
    type: dc.type,
    value: dc.value,
    discount_amount,
    applies_to: dc.applies_to,
    applies_to_value: dc.applies_to_value,
    final_total: cart_total - discount_amount,
  });
}
