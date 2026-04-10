import { InvoiceStatus } from "../../generated/prisma/enums";
import { WompiWebhookPayload } from "../../types/wompi";
import crypto from "crypto";

function getValueByPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;

  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function validateWompiWebhook(
  payload: WompiWebhookPayload,
  eventsSecret: string
): boolean {
  const properties = payload.signature?.properties ?? [];
  const receivedChecksum = String(payload.signature?.checksum ?? "").toUpperCase();
  const timestamp = payload.timestamp;

  if (!properties.length || !receivedChecksum || !timestamp || !eventsSecret) {
    return false;
  }

  const concatenatedValues = properties
    .map((propertyPath) => {
      const value = getValueByPath(payload.data, propertyPath);
      return value === undefined || value === null ? "" : String(value);
    })
    .join("");

  const stringToSign = `${concatenatedValues}${timestamp}${eventsSecret.trim()}`;

  const calculatedChecksum = crypto
    .createHash("sha256")
    .update(stringToSign, "utf8")
    .digest("hex")
    .toUpperCase();

  return calculatedChecksum === receivedChecksum;
}


export function mapWompiStatusToInvoiceStatus(status: string): InvoiceStatus {
  switch (status) {
    case "APPROVED":
      return InvoiceStatus.PAID;
    case "DECLINED":
      return InvoiceStatus.DECLINED;
    case "VOIDED":
    case "CANCELLED":
      return InvoiceStatus.CANCELLED;
    case "ERROR":
      return InvoiceStatus.ERROR;
    case "EXPIRED":
      return InvoiceStatus.EXPIRED;
    default:
      return InvoiceStatus.PENDING;
  }
}
