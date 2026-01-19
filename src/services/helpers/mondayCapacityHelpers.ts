/**
 * Helper functions extracted from MondayService for better testability
 * These functions handle capacity adjustment and touchpoint management
 */

export interface SubitemData {
  id?: string;
  name?: string;
  id_original?: string;
  conectar_quadros87__1?: string;
  conectar_quadros_mkkcjhuc?: string;
  data__1?: string;
  conectar_quadros_mkkbt3fq?: string;
  conectar_quadros_mkkcnyr3?: string;
  n_meros_mkkchcmk?: number;
  [key: string]: any;
}

export interface TimeSlot {
  name: string;
  max_value?: number;
  item_id?: string;
}

/**
 * Calculate available capacity for a specific time slot
 */
export function calculateAvailableCapacity(
  maxValue: number,
  dbReserved: number,
  stagedReserved: number,
  hour: string
): number {
  // Special hours that share capacity limit
  const splitHours = ['08:00', '08:30'];
  const effectiveMaxValue = splitHours.includes(hour) ? maxValue / 2 : maxValue;
  
  return Math.max(0, effectiveMaxValue - (dbReserved + stagedReserved));
}

/**
 * Find next available time slot from the list
 */
export function findNextTimeSlot(
  timeSlots: TimeSlot[],
  currentHour: string
): string | null {
  const idx = timeSlots.findIndex(s => (s.name || '').trim() === currentHour);
  const nextIndex = idx >= 0 ? idx + 1 : 0;
  
  if (nextIndex >= timeSlots.length) {
    return null;
  }
  
  return (timeSlots[nextIndex].name || '').trim();
}

/**
 * Split demand between current and next time slot
 */
export function splitDemandBetweenSlots(
  item: SubitemData,
  available: number,
  totalDemand: number,
  nextHour: string
): { current: SubitemData; next: SubitemData } {
  const currentItem = {
    ...item,
    n_meros_mkkchcmk: available
  };
  
  const nextItem = {
    ...item,
    conectar_quadros_mkkcnyr3: nextHour,
    n_meros_mkkchcmk: totalDemand - available
  };
  
  return { current: currentItem, next: nextItem };
}

/**
 * Validate if a subitem has all required fields for processing
 */
export function validateSubitemData(item: SubitemData): boolean {
  const canalNome = String(item.conectar_quadros87__1 || item.conectar_quadros_mkkcjhuc || '').trim();
  const dataStr = String(item.data__1 || item.conectar_quadros_mkkbt3fq || '').trim();
  const horaAtual = String(item.conectar_quadros_mkkcnyr3 || '').trim();
  const demanda = Number(item.n_meros_mkkchcmk || 0);
  
  return !!(canalNome && dataStr && horaAtual && demanda > 0);
}

/**
 * Create a staging key for capacity tracking
 */
export function createStagingKey(canal: string, data: string, hora: string): string {
  return `${canal}|${data}|${hora}`;
}

/**
 * Format date string to YYYYMMDD
 */
export function formatDateToYYYYMMDD(dateStr: string): string {
  if (!dateStr) return '';
  
  // Already in YYYYMMDD format
  if (/^\d{8}$/.test(dateStr)) {
    return dateStr;
  }
  
  // DD/MM/YYYY or DD-MM-YYYY format
  if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split(/[/-]/);
    return `${year}${month}${day}`;
  }
  
  // YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr.replaceAll("-", '');
  }
  
  return dateStr;
}

/**
 * Extract column value based on type
 */
export function extractSimpleColumnValue(column: any, columnType?: string): any {
  if (!column) return null;
  
  // If value is a string, try to parse it
  if (typeof column.value === 'string') {
    try {
      const parsed = JSON.parse(column.value);
      if (columnType === 'people' && parsed.personsAndTeams) {
        return parsed.personsAndTeams.map((p: any) => ({
          id: p.id,
          kind: p.kind
        }));
      }
      if (columnType === 'board-relation' && parsed.linkedPulseIds) {
        return parsed.linkedPulseIds.map((lp: any) => lp.linkedPulseId);
      }
      return parsed;
    } catch {
      return column.text || column.value || null;
    }
  }
  
  // Return text representation if available
  return column.text || column.value || null;
}

/**
 * Check if time slots share capacity limit
 */
export function isSharedCapacityHour(hour: string): boolean {
  const sharedHours = ['08:00', '08:30'];
  return sharedHours.includes(hour);
}

/**
 * Calculate effective max value for shared capacity hours
 */
export function getEffectiveMaxValue(maxValue: number, hour: string): number {
  return isSharedCapacityHour(hour) ? maxValue / 2 : maxValue;
}
