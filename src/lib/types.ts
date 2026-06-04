export type FieldType = "signature" | "initials" | "date" | "text";

export interface DocumentField {
  id: string;
  type: FieldType;
  page: number;       // 1-indexed
  x: number;          // % of page width
  y: number;          // % of page height
  width: number;      // % of page width
  height: number;     // % of page height
  value?: string;     // filled value (dataUrl for sig/initials, ISO string for date, text for text)
  label?: string;     // optional custom label
}

export interface Document {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  storageUrl: string;
  storagePath: string;
  status: "draft" | "prepared" | "signed" | "completed";
  fields: DocumentField[];
  createdAt: Date;
  updatedAt: Date;
  signedAt?: Date;
  signerName?: string;
  pageCount?: number;
  fileSize?: number;
}
