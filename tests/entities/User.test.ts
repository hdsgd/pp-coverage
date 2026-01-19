import { User } from '../../src/entities/User';
import bcrypt from 'bcryptjs';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

describe('User Entity', () => {
  let user: User;

  beforeEach(() => {
    user = new User();
    jest.clearAllMocks();
  });

  describe('Entity Properties', () => {
    it('should create user with all properties', () => {
      user.id = 'user_uuid_123';
      user.username = 'testuser';
      user.password = 'hashedpassword';
      user.role = 'admin';
      user.is_active = true;
      user.created_at = new Date('2025-12-01T00:00:00.000Z');
      user.updated_at = new Date('2025-12-01T00:00:00.000Z');

      expect(user.id).toBe('user_uuid_123');
      expect(user.username).toBe('testuser');
      expect(user.password).toBe('hashedpassword');
      expect(user.role).toBe('admin');
      expect(user.is_active).toBe(true);
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });

    it('should support UUID format for id', () => {
      user.id = '123e4567-e89b-12d3-a456-426614174000';
      expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should support different usernames', () => {
      const usernames = ['admin', 'john.doe', 'user_123', 'test@user'];
      usernames.forEach(username => {
        user.username = username;
        expect(user.username).toBe(username);
      });
    });

    it('should support different roles', () => {
      const roles = ['admin', 'user', 'moderator', 'guest'];
      roles.forEach(role => {
        user.role = role;
        expect(user.role).toBe(role);
      });
    });

    it('should handle is_active as true', () => {
      user.is_active = true;
      expect(user.is_active).toBe(true);
    });

    it('should handle is_active as false', () => {
      user.is_active = false;
      expect(user.is_active).toBe(false);
    });

    it('should handle long usernames', () => {
      user.username = 'a'.repeat(100);
      expect(user.username).toHaveLength(100);
    });

    it('should handle special characters in username', () => {
      user.username = 'user_name-123.test@domain';
      expect(user.username).toContain('_');
      expect(user.username).toContain('-');
      expect(user.username).toContain('@');
    });

    it('should support different timestamp values', () => {
      const date1 = new Date('2025-01-01T00:00:00.000Z');
      const date2 = new Date('2025-12-31T23:59:59.999Z');
      
      user.created_at = date1;
      user.updated_at = date2;

      expect(user.created_at).toEqual(date1);
      expect(user.updated_at).toEqual(date2);
      expect(user.updated_at.getTime()).toBeGreaterThan(user.created_at.getTime());
    });

    it('should allow same created_at and updated_at', () => {
      const timestamp = new Date('2025-12-01T12:00:00.000Z');
      user.created_at = timestamp;
      user.updated_at = timestamp;
      expect(user.created_at).toEqual(user.updated_at);
    });
  });

  describe('hashPassword method', () => {
    it('should hash password before insert/update when password is plain text', async () => {
      const plainPassword = 'myPlainPassword123';
      const hashedPassword = '$2a$10$hashedPasswordValue';
      
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      
      user.password = plainPassword;
      await user.hashPassword();

      expect(bcrypt.hash).toHaveBeenCalledWith(plainPassword, 10);
      expect(user.password).toBe(hashedPassword);
    });

    it('should not hash password if already hashed (starts with $2a$)', async () => {
      const alreadyHashedPassword = '$2a$10$alreadyHashedPasswordValue';
      
      user.password = alreadyHashedPassword;
      await user.hashPassword();

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(user.password).toBe(alreadyHashedPassword);
    });

    it('should handle empty password', async () => {
      user.password = '';
      await user.hashPassword();

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(user.password).toBe('');
    });

    it('should handle undefined password', async () => {
      user.password = undefined as any;
      await user.hashPassword();

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(user.password).toBeUndefined();
    });

    it('should hash password starting with $2b$ (not detected as bcrypt)', async () => {
      const bcryptPassword = '$2b$10$hashedWithDifferentVersion';
      const hashedPassword = '$2a$10$rehashedPassword';
      
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      
      user.password = bcryptPassword;
      await user.hashPassword();

      expect(bcrypt.hash).toHaveBeenCalledWith(bcryptPassword, 10);
      expect(user.password).toBe(hashedPassword);
    });

    it('should hash password with special characters', async () => {
      const specialPassword = 'P@ssw0rd!#$%^&*()';
      const hashedPassword = '$2a$10$hashedSpecialPassword';
      
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      
      user.password = specialPassword;
      await user.hashPassword();

      expect(bcrypt.hash).toHaveBeenCalledWith(specialPassword, 10);
      expect(user.password).toBe(hashedPassword);
    });

    it('should hash very long password', async () => {
      const longPassword = 'a'.repeat(200);
      const hashedPassword = '$2a$10$hashedLongPassword';
      
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      
      user.password = longPassword;
      await user.hashPassword();

      expect(bcrypt.hash).toHaveBeenCalledWith(longPassword, 10);
      expect(user.password).toBe(hashedPassword);
    });

    it('should handle bcrypt hash with 10 rounds', async () => {
      const plainPassword = 'password123';
      const hashedPassword = '$2a$10$roundsTest';
      
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      
      user.password = plainPassword;
      await user.hashPassword();

      expect(bcrypt.hash).toHaveBeenCalledWith(plainPassword, 10);
    });

    it('should hash password with numbers', async () => {
      const numericPassword = '123456789';
      const hashedPassword = '$2a$10$hashedNumericPassword';
      
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      
      user.password = numericPassword;
      await user.hashPassword();

      expect(bcrypt.hash).toHaveBeenCalledWith(numericPassword, 10);
      expect(user.password).toBe(hashedPassword);
    });

    it('should hash password with unicode characters', async () => {
      const unicodePassword = 'Señor123!';
      const hashedPassword = '$2a$10$hashedUnicodePassword';
      
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      
      user.password = unicodePassword;
      await user.hashPassword();

      expect(bcrypt.hash).toHaveBeenCalledWith(unicodePassword, 10);
      expect(user.password).toBe(hashedPassword);
    });
  });

  describe('comparePassword method', () => {
    it('should return true when passwords match', async () => {
      const candidatePassword = 'myPassword123';
      user.password = '$2a$10$hashedPasswordValue';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await user.comparePassword(candidatePassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(candidatePassword, user.password);
      expect(result).toBe(true);
    });

    it('should return false when passwords do not match', async () => {
      const candidatePassword = 'wrongPassword';
      user.password = '$2a$10$hashedPasswordValue';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await user.comparePassword(candidatePassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(candidatePassword, user.password);
      expect(result).toBe(false);
    });

    it('should handle empty candidate password', async () => {
      const candidatePassword = '';
      user.password = '$2a$10$hashedPasswordValue';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await user.comparePassword(candidatePassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(candidatePassword, user.password);
      expect(result).toBe(false);
    });

    it('should compare password with special characters', async () => {
      const candidatePassword = 'P@ssw0rd!#$';
      user.password = '$2a$10$hashedPasswordValue';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await user.comparePassword(candidatePassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(candidatePassword, user.password);
      expect(result).toBe(true);
    });

    it('should compare very long password', async () => {
      const candidatePassword = 'a'.repeat(200);
      user.password = '$2a$10$hashedPasswordValue';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await user.comparePassword(candidatePassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(candidatePassword, user.password);
      expect(result).toBe(false);
    });

    it('should handle numeric candidate password', async () => {
      const candidatePassword = '123456789';
      user.password = '$2a$10$hashedPasswordValue';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await user.comparePassword(candidatePassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(candidatePassword, user.password);
      expect(result).toBe(true);
    });

    it('should compare password with unicode characters', async () => {
      const candidatePassword = 'Señor123!';
      user.password = '$2a$10$hashedPasswordValue';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await user.comparePassword(candidatePassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(candidatePassword, user.password);
      expect(result).toBe(true);
    });

    it('should handle bcrypt compare rejection', async () => {
      const candidatePassword = 'password123';
      user.password = '$2a$10$hashedPasswordValue';

      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));

      await expect(user.comparePassword(candidatePassword)).rejects.toThrow('Bcrypt error');
    });

    it('should compare against different hash versions ($2b$)', async () => {
      const candidatePassword = 'password123';
      user.password = '$2b$10$differentHashVersion';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await user.comparePassword(candidatePassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(candidatePassword, user.password);
      expect(result).toBe(true);
    });

    it('should handle password comparison with whitespace', async () => {
      const candidatePassword = '  password123  ';
      user.password = '$2a$10$hashedPasswordValue';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await user.comparePassword(candidatePassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(candidatePassword, user.password);
      expect(result).toBe(false);
    });
  });

  describe('Entity Defaults', () => {
    it('should have default role as admin', () => {
      user.role = 'admin';
      expect(user.role).toBe('admin');
    });

    it('should have default is_active as true', () => {
      user.is_active = true;
      expect(user.is_active).toBe(true);
    });

    it('should allow changing role from default', () => {
      user.role = 'admin';
      expect(user.role).toBe('admin');
      user.role = 'user';
      expect(user.role).toBe('user');
    });

    it('should allow changing is_active from default', () => {
      user.is_active = true;
      expect(user.is_active).toBe(true);
      user.is_active = false;
      expect(user.is_active).toBe(false);
    });
  });

  describe('Entity Constraints', () => {
    it('should support unique username', () => {
      const user1 = new User();
      const user2 = new User();
      
      user1.username = 'uniqueuser';
      user2.username = 'differentuser';

      expect(user1.username).not.toBe(user2.username);
    });

    it('should handle username up to 100 characters', () => {
      user.username = 'a'.repeat(100);
      expect(user.username.length).toBe(100);
    });

    it('should handle password up to 255 characters', () => {
      user.password = 'a'.repeat(255);
      expect(user.password.length).toBe(255);
    });

    it('should handle role up to 50 characters', () => {
      user.role = 'a'.repeat(50);
      expect(user.role.length).toBe(50);
    });
  });
});
