/**
 * Utility functions for object manipulation
 * Centralizes common object operations to avoid code duplication
 */

/**
 * Obtém valor do objeto usando dot notation (ex: "data.name")
 * Suporta navegação profunda em objetos aninhados
 * 
 * @param obj - Objeto de origem
 * @param path - Caminho usando dot notation (ex: "user.address.city")
 * @returns Valor encontrado ou undefined se o caminho não existir
 * 
 * @example
 * const data = { user: { name: "John", address: { city: "NYC" } } };
 * getValueByPath(data, "user.address.city"); // "NYC"
 * getValueByPath(data, "user.email"); // undefined
 */
export function getValueByPath(obj: any, path: string): any {
  if (!obj || !path) {
    return undefined;
  }

  return path.split('.').reduce((current: any, key: string) => {
    return current?.[key];
  }, obj);
}
