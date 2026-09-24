export async function paystackRequest(path: string, init: RequestInit = {}) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("Missing PAYSTACK_SECRET_KEY environment variable");
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status === false) throw new Error(data.message || `Paystack request failed (${response.status})`);
  return data;
}

export async function verifyPaystackTransaction(reference: string) {
  return (await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`)).data;
}

export async function createPaystackPlan(args: {name:string; amount:number; interval:"monthly"|"annually"; currency?:string; description?:string}) {
  const data = await paystackRequest('/plan', { method:'POST', body: JSON.stringify({ ...args, currency: args.currency || 'NGN', send_invoices:false, send_sms:false }) });
  return data.data;
}

export async function createPaystackSubaccount(args: {business_name:string; bank_code:string; account_number:string; percentage_charge:number; email?:string; name?:string}) {
  const data = await paystackRequest('/subaccount', { method:'POST', body: JSON.stringify({
    business_name: args.business_name, settlement_bank: args.bank_code, account_number: args.account_number,
    percentage_charge: args.percentage_charge, primary_contact_email: args.email, primary_contact_name: args.name,
    settlement_schedule: 'auto'
  }) });
  return data.data;
}

export async function createPaystackSplit(args: {name:string; subaccount:string; creatorShare:number}) {
  const data = await paystackRequest('/split', { method:'POST', body: JSON.stringify({
    name: args.name, type:'percentage', currency:'NGN', bearer_type:'account',
    subaccounts:[{subaccount:args.subaccount, share:args.creatorShare}]
  }) });
  return data.data;
}

export async function chargePaystackAuthorization(args:{authorizationCode:string; email:string; amount:number; splitCode?:string; reference:string; metadata?:Record<string,any>}) {
  const data = await paystackRequest('/transaction/charge_authorization', { method:'POST', body: JSON.stringify({
    authorization_code:args.authorizationCode, email:args.email, amount:String(args.amount), currency:'NGN',
    reference:args.reference, ...(args.splitCode ? {split_code:args.splitCode} : {}), ...(args.metadata ? {metadata:args.metadata} : {})
  }) });
  return data.data;
}

export async function listPaystackBanks() {
  const data = await paystackRequest('/bank?country=nigeria&perPage=100');
  return data.data || [];
}
