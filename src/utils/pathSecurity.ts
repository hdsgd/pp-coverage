import path from 'path';

/**
 * Sanitiza um nome de arquivo removendo caracteres perigosos e path traversal
 * @param filename Nome do arquivo fornecido pelo usuário
 * @returns Nome de arquivo seguro (somente basename, sem diretórios)
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Nome de arquivo inválido');
  }

  // Normaliza separadores para /
  let sanitized = filename.replace(/\\/g, '/');
  
  // Remove qualquer tentativa de path traversal
  sanitized = sanitized.replace(/\.\.\//g, '');
  
  // Extrai apenas o basename (remove qualquer caminho)
  sanitized = path.basename(sanitized);
  
  // Remove caracteres perigosos
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Previne nomes vazios ou apenas com pontos
  if (!sanitized || /^\.+$/.test(sanitized)) {
    throw new Error('Nome de arquivo inválido após sanitização');
  }
  
  return sanitized;
}

/**
 * Valida se um caminho está dentro de um diretório permitido
 * @param filePath Caminho completo do arquivo
 * @param allowedDir Diretório raiz permitido
 * @returns true se o caminho está dentro do diretório permitido
 */
export function isPathInDirectory(filePath: string, allowedDir: string): boolean {
  const normalizedPath = path.resolve(filePath);
  const normalizedDir = path.resolve(allowedDir);
  
  return normalizedPath.startsWith(normalizedDir);
}

/**
 * Constrói um caminho seguro garantindo que está dentro do diretório permitido
 * @param baseDir Diretório base permitido
 * @param filename Nome do arquivo (será sanitizado)
 * @returns Caminho seguro dentro do diretório base
 * @throws Error se o caminho resultante estiver fora do diretório permitido
 */
export function buildSafePath(baseDir: string, filename: string): string {
  const sanitized = sanitizeFilename(filename);
  const fullPath = path.join(baseDir, sanitized);
  
  if (!isPathInDirectory(fullPath, baseDir)) {
    throw new Error('Acesso negado: caminho fora do diretório permitido');
  }
  
  return fullPath;
}
