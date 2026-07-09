import { LedgerEvent } from "../../ledger/src/engine";
import { WmsEvent } from "../../protocol/src/wms-events";
import { BehaviorSubject, Observable } from "rxjs";

export interface WmsState {
  companies: any[];
  regions: any[];
  branches: any[];
  coas: any[];
  categories: any[];
  vendors: any[];
  products: any[];
}

export class WmsProjectionEngine {
  private state: WmsState = {
    companies: [],
    regions: [],
    branches: [],
    coas: [],
    categories: [],
    vendors: [],
    products: [],
  };

  private stateSubject = new BehaviorSubject<WmsState>(this.state);
  public state$: Observable<WmsState> = this.stateSubject.asObservable();

  public getState(): WmsState {
    return this.state;
  }

  public processEvent(event: LedgerEvent): void {
    const wmsEvent = event.payload as WmsEvent;

    switch (wmsEvent.type) {
      case "COMPANY_CREATED":
      case "COMPANY_UPDATED": {
        const payload = wmsEvent.payload;
        const index = this.state.companies.findIndex(c => c.id === payload.id);
        if (index >= 0) {
          this.state.companies[index] = { ...this.state.companies[index], ...payload };
        } else {
          this.state.companies.push(payload);
        }
        break;
      }
      case "COMPANY_DELETED": {
        const payload = wmsEvent.payload;
        const index = this.state.companies.findIndex(c => c.id === payload.id);
        if (index >= 0) {
           this.state.companies[index].isActive = false; // Soft delete
        }
        break;
      }

      case "REGION_CREATED":
      case "REGION_UPDATED": {
        const payload = wmsEvent.payload;
        const index = this.state.regions.findIndex(c => c.id === payload.id);
        if (index >= 0) {
          this.state.regions[index] = { ...this.state.regions[index], ...payload };
        } else {
          this.state.regions.push(payload);
        }
        break;
      }
      case "REGION_DELETED": {
         const payload = wmsEvent.payload;
         const index = this.state.regions.findIndex(c => c.id === payload.id);
         if (index >= 0) {
            this.state.regions[index].isActive = false;
         }
         break;
      }

      case "BRANCH_CREATED":
      case "BRANCH_UPDATED": {
        const payload = wmsEvent.payload;
        const index = this.state.branches.findIndex(c => c.id === payload.id);
        if (index >= 0) {
          this.state.branches[index] = { ...this.state.branches[index], ...payload };
        } else {
          this.state.branches.push(payload);
        }
        break;
      }
      case "BRANCH_DELETED": {
         const payload = wmsEvent.payload;
         const index = this.state.branches.findIndex(c => c.id === payload.id);
         if (index >= 0) {
            this.state.branches[index].isActive = false;
         }
         break;
      }

      case "COA_CREATED":
      case "COA_UPDATED": {
        const payload = wmsEvent.payload;
        const index = this.state.coas.findIndex(c => c.id === payload.id);
        if (index >= 0) {
          this.state.coas[index] = { ...this.state.coas[index], ...payload };
        } else {
          this.state.coas.push(payload);
        }
        break;
      }
      case "COA_DELETED": {
        const payload = wmsEvent.payload;
        const index = this.state.coas.findIndex(c => c.id === payload.id);
        if (index >= 0) {
           this.state.coas[index].status = "ARCHIVED"; // Soft delete
        }
        break;
      }

      case "GLOBAL_CATEGORY_CREATED":
      case "GLOBAL_CATEGORY_UPDATED": {
        const payload = wmsEvent.payload;
        const index = this.state.categories.findIndex(c => c.id === payload.id);
        if (index >= 0) {
          this.state.categories[index] = { ...this.state.categories[index], ...payload };
        } else {
          this.state.categories.push(payload);
        }
        break;
      }
      case "GLOBAL_CATEGORY_DELETED": {
        const payload = wmsEvent.payload;
        const index = this.state.categories.findIndex(c => c.id === payload.id);
        if (index >= 0) {
           this.state.categories[index].status = "ARCHIVED"; // Soft delete
        }
        break;
      }

      case "VENDOR_CREATED":
      case "VENDOR_UPDATED": {
        const payload = wmsEvent.payload;
        const index = this.state.vendors.findIndex(c => c.id === payload.id);
        if (index >= 0) {
          this.state.vendors[index] = { ...this.state.vendors[index], ...payload };
        } else {
          this.state.vendors.push(payload);
        }
        break;
      }
      case "VENDOR_DELETED": {
        const payload = wmsEvent.payload;
        const index = this.state.vendors.findIndex(c => c.id === payload.id);
        if (index >= 0) {
           this.state.vendors[index].isActive = false; // Soft delete
        }
        break;
      }

      case "GLOBAL_PRODUCT_CREATED":
      case "GLOBAL_PRODUCT_UPDATED": {
        const payload = wmsEvent.payload;
        const index = this.state.products.findIndex(c => c.id === payload.id);
        if (index >= 0) {
          this.state.products[index] = { ...this.state.products[index], ...payload };
        } else {
          this.state.products.push(payload);
        }
        break;
      }

      default:
        // Ignore other events for now
        break;
    }

    // Create new object for immutability and emit
    this.state = { ...this.state };
    this.stateSubject.next(this.state);
  }
}
