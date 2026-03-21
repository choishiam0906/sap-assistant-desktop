import type { DomainPack } from "../types/domain.js";
import { sapDomainPack } from "./sap/index.js";
import { generalDomainPack } from "./general/index.js";

/**
 * DomainPackRegistry — 등록된 도메인 팩을 관리하고 활성 팩을 제공한다.
 *
 * 현재는 SAP이 기본 활성 팩이며, 향후 Salesforce, ServiceNow 등을
 * register()로 추가할 수 있다.
 */
class DomainPackRegistryImpl {
  private readonly packs = new Map<string, DomainPack>();
  private activePackId = "sap";

  constructor() {
    this.register(sapDomainPack);
    this.register(generalDomainPack);
  }

  register(pack: DomainPack): void {
    this.packs.set(pack.id, pack);
  }

  getActive(): DomainPack {
    return this.packs.get(this.activePackId) ?? generalDomainPack;
  }

  setActive(id: string): void {
    if (!this.packs.has(id)) {
      throw new Error(`DomainPack '${id}' is not registered`);
    }
    this.activePackId = id;
  }

  listPacks(): DomainPack[] {
    return [...this.packs.values()];
  }
}

export const domainPackRegistry = new DomainPackRegistryImpl();
