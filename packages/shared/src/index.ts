export interface Document {
  id: string;
  status: "PENDING" | "READY_FOR_REVIEW" | "VALIDATED";
}
