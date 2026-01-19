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
  let sanitized = filename.replaceAll('\\', '/');
  
  // Remove qualquer tentativa de path traversal (limitado para evitar ReDoS)
  sanitized = sanitized.replaceAll('../', '');
  sanitized = sanitized.replaceAll('..\\', '');
  
  // Extrai apenas o basename (remove qualquer caminho)
  sanitized = path.basename(sanitized);
  
  // Remove caracteres perigosos - regex simplificado sem backtracking
  sanitized = sanitized.replaceAll(/[^\w.-]/g, '_');
  
  // Previne nomes vazios ou apenas com pontos
  if (!sanitized || /^\.+$/.test(sanitized)) {
    throw new Error('Nome de arquivo inválido após sanitização');
  }
  
  return sanitized;
}

/**
 * Verifica se um caminho está dentro de um diretório base
 * @param targetPath Caminho a ser verificado
 * @param baseDir Diretório base permitido
 * @returns true se está dentro, false caso contrário
 */
export function isPathInDirectory(targetPath: string, baseDir: string): boolean {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  return resolvedTarget.startsWith(resolvedBase + path.sep) || resolvedTarget === resolvedBase;
}

/**
 * Constrói um caminho seguro dentro de uma pasta base
 * @param baseDir Diretório base permitido
 * @param userPath Caminho fornecido pelo usuário
 * @returns Caminho absoluto seguro dentro do baseDir
 */
export function buildSafePath(baseDir: string, userPath: string): string {
  if (!baseDir) {
    throw new Error('Base directory é obrigatório');
  }
  
  if (!userPath) {
    throw new Error('Nome de arquivo inválido');
  }

  // Sanitiza o nome do arquivo
  const sanitizedFile = sanitizeFilename(userPath);
  
  // Resolve o caminho absoluto
  const resolvedBase = path.resolve(baseDir);
  const resolvedPath = path.resolve(resolvedBase, sanitizedFile);
  
  // Verifica se o caminho resolvido está dentro do baseDir
  if (!isPathInDirectory(resolvedPath, baseDir)) {
    throw new Error('Acesso negado: caminho fora do diretório permitido');
  }
  
  return resolvedPath;
}