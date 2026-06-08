import { LoginUser } from '../application/use-cases/auth/LoginUser';
import bcrypt from 'bcryptjs';

process.env.JWT_SECRET = 'test_secret';

const mockUserRepository = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('LoginUser', () => {
  let loginUser: LoginUser;

  beforeEach(() => {
    jest.clearAllMocks();
    loginUser = new LoginUser(mockUserRepository as any);
  });

  it('debe lanzar error si el usuario no existe', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    await expect(
      loginUser.execute({ email: 'noexiste@test.com', password: '123456' })
    ).rejects.toThrow('Invalid credentials');
  });

  it('debe lanzar error si la contraseña es incorrecta', async () => {
    const hash = await bcrypt.hash('correcta', 10);
    mockUserRepository.findByEmail.mockResolvedValue({
      id: '1',
      email: 'test@test.com',
      passwordHash: hash,
      role: 'user',
      toPublic: () => ({ id: '1', email: 'test@test.com' }),
    });
    await expect(
      loginUser.execute({ email: 'test@test.com', password: 'incorrecta' })
    ).rejects.toThrow('Invalid credentials');
  });

  it('debe retornar token y usuario si las credenciales son correctas', async () => {
    const hash = await bcrypt.hash('123456', 10);
    mockUserRepository.findByEmail.mockResolvedValue({
      id: '1',
      email: 'test@test.com',
      passwordHash: hash,
      role: 'user',
      toPublic: () => ({ id: '1', email: 'test@test.com' }),
    });
    const result = await loginUser.execute({ email: 'test@test.com', password: '123456' });
    expect(result).toHaveProperty('token');
    expect(result).toHaveProperty('user');
  });
});