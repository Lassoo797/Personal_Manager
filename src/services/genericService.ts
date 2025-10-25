// ... (existujúci kód v genericService.ts) ...

/**
 * Vytvára generický servis pre prácu s PocketBase kolekciou.
 * @param collectionName Názov kolekcie v PocketBase.
 * @param mapper Funkcia, ktorá mapuje PocketBase záznam na typ definovaný v aplikácii.
 * @param preUpdateHook Voliteľná funkcia na transformáciu dát pred operáciou update.
 */
export function createPocketBaseService<T, TCreate, TUpdate>(
  collectionName: string,
  mapper: (record: Record) => T,
  preUpdateHook?: (data: TUpdate) => any
) {
  // ... (existujúci kód v createPocketBaseService) ...
  
    /**
     * Aktualizuje existujúci záznam.
     * @param id ID záznamu na aktualizáciu.
     * @param data Dáta na aktualizáciu.
     * @param options Voliteľné PocketBase options.
     */
    update: async (id: string, data: TUpdate, options: PocketBaseOptions = {}): Promise<T> => {
      const payload = preUpdateHook ? preUpdateHook(data) : data;
      const record = await collection.update(id, payload, options);
      return mapper(record);
    },

  // ... (zvyšok kódu v createPocketBaseService) ...
}
