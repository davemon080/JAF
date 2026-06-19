export interface DeliveryZone {
  id: string;
  label: string;
  fee: number;
  estimate: string;
}

export const DEFAULT_ZONES: DeliveryZone[] = [
  { id: "lafia", label: "Lafia", fee: 2000, estimate: "1–2 business days" },
  { id: "abuja", label: "Abuja", fee: 3500, estimate: "1–3 business days" },
];
