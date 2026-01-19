import crypto from 'crypto';

/**
 * Constantes de teste seguras
 * Utiliza variáveis de ambiente ou valores gerados dinamicamente
 * para evitar hardcoding de senhas nos testes
 */

/**
 * Gera uma senha de teste aleatória usando crypto seguro
 */
export const generateTestPassword = (): string => {
  const randomBytes = crypto.randomBytes(8).toString('hex');
  return `Test_${randomBytes}_${Date.now()}`;
};

/**
 * Senhas de teste (geradas em runtime ou via env)
 */
export const TEST_PASSWORDS = {
  VALID: process.env.TEST_PASSWORD_VALID || generateTestPassword(),
  ADMIN: process.env.TEST_PASSWORD_ADMIN || generateTestPassword(),
  USER: process.env.TEST_PASSWORD_USER || generateTestPassword(),
  WEAK: process.env.TEST_PASSWORD_WEAK || generateTestPassword(),
  SPECIAL_CHARS: process.env.TEST_PASSWORD_SPECIAL || generateTestPassword(),
  LONG: process.env.TEST_PASSWORD_LONG || 'a'.repeat(200),
  NUMERIC: process.env.TEST_PASSWORD_NUMERIC || generateTestPassword(),
  UNICODE: process.env.TEST_PASSWORD_UNICODE || generateTestPassword(),
};

/**
 * Hashes de teste (simulam bcrypt)
 */
export const TEST_PASSWORD_HASHES = {
  BCRYPT_HASH: '$2a$10$hashedPasswordValue',
  BCRYPT_ALT: '$2b$10$hashedWithDifferentVersion',
  BCRYPT_REHASHED: '$2a$10$rehashedPassword',
  BCRYPT_SPECIAL: '$2a$10$hashedSpecialPassword',
  BCRYPT_LONG: '$2a$10$hashedLongPassword',
  BCRYPT_ROUNDS: '$2a$10$roundsTest',
  BCRYPT_NUMERIC: '$2a$10$hashedNumericPassword',
  BCRYPT_UNICODE: '$2a$10$hashedUnicodePassword',
};

/**
 * Usuários de teste
 */
export const TEST_USERS = {
  ADMIN: {
    username: 'admin_test_user',
    email: 'test@example.com',
    role: 'admin',
  },
  USER: {
    username: 'regular_test_user',
    email: 'user@example.com',
    role: 'user',
  },
};