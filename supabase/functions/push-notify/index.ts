import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { JWT } from "https://esm.sh/google-auth-library@9.0.0";

const serviceAccountKey = Deno.env.get('FCM_SERVICE_ACCOUNT_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

async function getFcmAccessToken(serviceAccountStr: string) {
  const credentials = JSON.parse(serviceAccountStr);
  const jwtClient = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  const tokens = await jwtClient.authorize();
  return {
    accessToken: tokens.access_token,
    projectId: credentials.project_id
  };
}

const formatMoney = (amount: number) => Number(amount || 0).toLocaleString('en-US');

serve(async (req) => {
  try {
    const payload = await req.json();
    const { type, table, record } = payload;
    
    if (type !== 'INSERT') {
      return new Response(JSON.stringify({ message: "Not an insert, skipping." }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const ownerId = record.user_id;
    if (!ownerId) throw new Error("No user_id found in record");

    let title = "إشعار جديد";
    let body = "تحديث جديد في النظام";
    let route = "dashboard";
    let parentId = '';

    if (table === 'invoices') {
      const isBalanceTransfer = record.market === 'رصيد منقول' || (record.description && record.description.includes('رصيد منقول'));
      title = isBalanceTransfer ? "🔄 رصيد منقول" : "📈 مبيعات جديدة";
      let totalAmount = record.total_amount || record.amount || 0;
      
      if (!totalAmount && record.id) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          try {
              const { data: priceItems } = await supabase
                .from('invoice_price_items')
                .select('quantity, price_per_kg')
                .eq('invoice_id', record.id);
                
              const { data: deductions } = await supabase
                .from('invoice_deductions')
                .select('amount')
                .eq('invoice_id', record.id);
                
              const itemsTotal = (priceItems || []).reduce((acc: number, item: any) => acc + ((item.quantity || 0) * (item.price_per_kg || 0)), 0);
              const dedsTotal = (deductions || []).reduce((acc: number, item: any) => acc + (item.amount || 0), 0);
              totalAmount = itemsTotal - dedsTotal;
          } catch (_e) {
              console.error('Error fetching invoice items for total calculation:', _e);
          }
      }
      body = isBalanceTransfer 
          ? `تم ترحيل رصيد جديد بقيمة ${formatMoney(totalAmount)} ج.م إلى حسابات الدورة.`
          : `تم تسجيل فاتورة مبيعات جديدة بقيمة ${formatMoney(totalAmount)} ج.م.`;
      route = "invoices";
    } else if (table === 'expenses') {
      title = "💸 تسجيل مصروف";
      parentId = record.category_id || '';
      let categoryName = "";
      let isLaborFlag = false;
      if (record.category_id) {
          try {
            const { data: cat } = await supabase.from('expense_categories').select('name, is_labor_category').eq('id', record.category_id).single();
            if (cat) {
              categoryName = cat.name;
              isLaborFlag = Boolean(cat.is_labor_category);
            }
          } catch(_e) {}
      }
      const normCatName = (categoryName || '').toLowerCase();
      const normDesc = (record.description || '').toLowerCase();
      
      const isLaborCat = isLaborFlag || normCatName.includes('عمالة') || normCatName.includes('عماله') || normCatName.includes('يومية') || normCatName.includes('يوميه') || normCatName.includes('عامل') || normCatName.includes('عمال') || normCatName.includes('يوميات') || normCatName.includes('أجور') || normCatName.includes('اجور') || normCatName.includes('مزارع') || normCatName.includes('فطار') || normCatName.includes('فطور') || normCatName.includes('نثريات') || normCatName.includes('ضيافة') || normCatName.includes('إكرامية') || normCatName.includes('اكرامية');
      const isLaborDesc = normDesc.includes('عامل') || normDesc.includes('عمالة') || normDesc.includes('عماله') || normDesc.includes('يومية') || normDesc.includes('يوميه') || normDesc.includes('يوميات') || normDesc.includes('عمال') || normDesc.includes('أجور') || normDesc.includes('اجور') || normDesc.includes('مزارع') || normDesc.includes('فطار') || normDesc.includes('فطور') || normDesc.includes('نثريات') || normDesc.includes('ضيافة') || normDesc.includes('إكرامية') || normDesc.includes('اكرامية');

      if (isLaborCat || isLaborDesc) {
        return new Response(JSON.stringify({ message: "Skipped secret labor notification" }), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      body = categoryName 
        ? `تم تسجيل مصروف بقيمة ${formatMoney(record.amount)} ج.م (بند: ${categoryName}).` 
        : `تم تسجيل مصروف عام بقيمة ${formatMoney(record.amount)} ج.م.`;
      route = "expenses";
    } else if (table === 'farmer_withdrawals') {
      title = "👨‍🌾 مسحوبات مزارع";
      let farmerName = "";
      parentId = record.farmer_id || '';
      if (parentId) {
          try {
            const { data: farmer } = await supabase.from('farmers').select('name').eq('id', parentId).single();
            if (farmer) farmerName = farmer.name;
          } catch(_e) {}
      }
      body = farmerName 
        ? `تم تسجيل مسحوبات بقيمة ${formatMoney(record.amount)} ج.م للمزارع (${farmerName}).` 
        : `تم تسجيل مسحوبات بقيمة ${formatMoney(record.amount)} ج.م للمزارع.`;
      route = "farmer_account";
    } else if (table === 'supplier_payments') {
      title = "🤝 دفعة مورد";
      let supplierName = "";
      parentId = record.supplier_id || '';
      if (parentId) {
          try {
            const { data: supplier } = await supabase.from('suppliers').select('name').eq('id', parentId).single();
            if (supplier) supplierName = supplier.name;
          } catch(_e) {}
      }
      body = supplierName 
        ? `تم تسجيل دفعة مسددة بقيمة ${formatMoney(record.amount)} ج.م للمورد (${supplierName}).` 
        : `تم تسجيل دفعة مسددة بقيمة ${formatMoney(record.amount)} ج.م للمورد.`;
      route = "suppliers";
    } else if (table === 'advances') {
      title = "💵 سلفة مسجلة";
      let personName = "";
      parentId = record.person_id || '';
      if (parentId) {
          try {
            const { data: person } = await supabase.from('persons').select('name').eq('id', parentId).single();
            if (person) personName = person.name;
          } catch(_e) {}
      }
      body = personName 
        ? `تم تسجيل سلفة بقيمة ${formatMoney(record.amount)} ج.م على حساب (${personName}).` 
        : `تم تسجيل سلفة بقيمة ${formatMoney(record.amount)} ج.م.`;
      route = "advances";
    }

    const { data: virtualMembers } = await supabase
      .from('virtual_members')
      .select('push_token, role')
      .eq('owner_id', ownerId);

    const tokens: string[] = [];
    if (virtualMembers) {
        virtualMembers.forEach((m: any) => {
            if (m.push_token) {
                tokens.push(m.push_token);
            }
        });
    }

    if (tokens.length === 0) {
      return new Response(JSON.stringify({ message: "No push tokens found for virtual members." }), { status: 200 });
    }

    if (!serviceAccountKey) {
        throw new Error("Missing FCM_SERVICE_ACCOUNT_KEY secret.");
    }

    const { accessToken, projectId } = await getFcmAccessToken(serviceAccountKey);
    const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    const sendPromises = tokens.map(async (token) => {
        const fcmPayload = {
          message: {
            token: token,
            notification: {
              title: title,
              body: body
            },
            data: {
              route: String(route),
              itemId: String(record.id),
              parentId: String(parentId || '')
            },
            android: {
              priority: "high",
              notification: {
                channel_id: "high_priority_notifications"
              }
            },
            apns: {
              headers: {
                "apns-priority": "10"
              }
            }
          }
        };

        const res = await fetch(fcmEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
          body: JSON.stringify(fcmPayload)
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error(`Error sending to token ${token}:`, errorText);
          return { success: false, error: errorText };
        }
        return { success: true, response: await res.json() };
    });

    const results = await Promise.all(sendPromises);

    return new Response(JSON.stringify({ success: true, targets: tokens.length, results }), {
        headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
