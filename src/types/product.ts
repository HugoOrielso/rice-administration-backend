export interface UpdateProductInput {
  name?: string;
  slug?: string;

  imageUrl?: string | null;
  details?: string | null;

  price?: number;
  stock?: number;
  minStock?: number;

  packageLabel?: string | null;
  unitsPerPackage?: number | null;
  unitWeightGrams?: number | null;

  isActive?: boolean;
}