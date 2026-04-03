export type WompiWebhookPayload = {
  event: string;
  data: {
    transaction?: {
      id?: string;
      amount_in_cents?: number;
      reference?: string;
      customer_email?: string;
      currency?: string;
      payment_method_type?: string;
      redirect_url?: string;
      status?: string;
      status_message?: string;
      shipping_address?: Record<string, string | number | boolean | null> | null;
      payment_link_id?: string | null;
      payment_source_id?: string | null;
      created_at?: string;
      finalized_at?: string | null;
    };
  };
  environment: "test" | "prod";
  signature: {
    properties: string[];
    checksum: string;
  };
  timestamp: number;
  sent_at: string;
};

export interface CheckoutCustomer {
  fullName: string;
  documentType: DocumentType;
  documentNumber: string;
  address: string;
  email: string;
  phone: string;
  city: string;
}

export interface CheckoutItem {
  productId: string;
  quantity: number;
}

export interface CreateWompiCheckoutBody {
  customer: CheckoutCustomer;
  items: CheckoutItem[];
}