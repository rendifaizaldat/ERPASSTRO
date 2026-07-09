import { useState, useEffect } from "react";
import { wmsProjector } from "../instances";

export interface GlobalCategory {
  id: string; // Ini akan berisi kode unik seperti 201SA
  coaId?: string; // Ikatan ke Parent COA (misal: 1-1201)
  name: string;
  status?: "ACTIVE" | "ARCHIVED";
  createdAt?: string;
  updatedAt?: string;
}

export interface GlobalProduct {
  id: string;
  categoryId: string;
  name: string;
  baseUom: string;
  status: "ACTIVE" | "ARCHIVED";
}

export interface Region {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface Branch {
  id: string;
  companyId: string;
  regionId: string;
  name: string;
  code: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
}

export interface RegionalItem {
  id: string;
  regionId: string;
  branchId: string | null;
  globalId: string | null;
  localName: string;
  localCategory?: string;
  uom: string;
  purchasePrice: number;
  margin: number;
  sellingPrice: number;
  mergeStatus: "UNMERGED" | "MERGED";
  status: "ACTIVE" | "ARCHIVED";
}

export interface Vendor {
  id: string;
  regionId: string;
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  certifications: string[];
  contractFileUrl: string;
  isActive: boolean;
}

export function useKatalog(isInitialized: boolean) {
  const [categories, setCategories] = useState<GlobalCategory[]>([]);
  const [masterProducts, setMasterProducts] = useState<GlobalProduct[]>([]);
  const [outletProducts, setOutletProducts] = useState<RegionalItem[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [uomOptions, setUomOptions] = useState<string[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    if (!isInitialized) return;

    // Set initial state from projector
    const state = wmsProjector.getState();
    setCategories(state.categories as GlobalCategory[]);
    setRegions(state.regions as Region[]);
    setBranches(state.branches as Branch[]);
    setVendors(state.vendors as Vendor[]);
    setMasterProducts(state.products as GlobalProduct[]);

    // UOM Options can be statically defined or fetched, but for now we set some default or leave empty.
    setUomOptions(["PCS", "KG", "GRAM", "LITER", "BOTOL"]);

    // Subscribe to projector changes
    const subscription = wmsProjector.state$.subscribe((newState) => {
        setCategories(newState.categories as GlobalCategory[]);
        setRegions(newState.regions as Region[]);
        setBranches(newState.branches as Branch[]);
        setVendors(newState.vendors as Vendor[]);
        setMasterProducts(newState.products as GlobalProduct[]);
    });

    return () => subscription.unsubscribe();
  }, [isInitialized]);

  return {
    categories,
    masterProducts,
    outletProducts,
    regions,
    branches,
    uomOptions,
    vendors,
  };
}
