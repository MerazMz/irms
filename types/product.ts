export interface Inventory {
  id: string;
  totalUnits: number;
  reservedUnits: number;

  warehouse: {
    id: string;
    name: string;
    city: string;
  };
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;

  inventories: Inventory[];
}