/**
 * Utilidades para formatação e conversão de datas
 * Consolidação de funções duplicadas usadas em múltiplos serviços
 */

/**
 * Converte data de YYYY-MM-DD para DD/MM/YYYY se necessário
 * @param dateString Data no formato YYYY-MM-DD ou DD/MM/YYYY
 * @returns Data no formato DD/MM/YYYY
 */
export function convertDateFormat(dateString: string): string {
  // Se já está no formato DD/MM/YYYY, retorna como está
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    return dateString;
  }
  
  // Se está no formato YYYY-MM-DD, converte
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  }
  
  return dateString;
}

/**
 * Converte data para formato ISO (YYYY-MM-DD)
 * @param dateStr Data em DD/MM/YYYY ou YYYY-MM-DD
 * @returns Data no formato YYYY-MM-DD
 */
export function convertToISODate(dateStr: string): string {
  // Se está em DD/MM/YYYY
  const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = ddmmyyyy.exec(dateStr);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }
  // Se já está em YYYY-MM-DD ou outro formato ISO
  return dateStr;
}

/**
 * Converte uma data em string para formato YYYYMMDD
 * Aceita entradas: YYYY-MM-DD, DD/MM/YYYY, YYYYMMDD
 * @param input Data em qualquer formato suportado
 * @returns Data no formato YYYYMMDD (sem separadores) ou string vazia se não conseguir parsear
 */
export function toYYYYMMDD(input: any): string {
  if (!input) return "";
  const s = String(input).trim();
  
  // YYYYMMDD
  if (/^\d{8}$/.test(s)) return s;
  
  // YYYY-MM-DD
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) return `${iso[1]}${iso[2]}${iso[3]}`;
  
  // DD/MM/YYYY
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (br) return `${br[3]}${br[2]}${br[1]}`;
  
  // Tentar Date.parse
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}${mm}${dd}`;
  }
  
  return "";
}
