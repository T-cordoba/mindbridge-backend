import { RegisterUser } from '../application/use-cases/auth/RegisterUser';

const mockUserRepository = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('RegisterUser', () => {
  let registerUser: RegisterUser;

  beforeEach(() => {
    jest.clearAllMocks();
    registerUser = new RegisterUser(mockUserRepository as any);
  });

  it('debe lanzar error si el disclaimer no fue aceptado', async () => {
    await expect(
      registerUser.execute({ email: 'test@test.com', password: '123456', disclaimerAccepted: false })
    ).rejects.toThrow('Disclaimer must be accepted to use the journal');
  });

  it('debe lanzar error si el email ya existe', async () => {
    mockUserRepository.findByEmail.mockResolvedValue({ id: '1', email: 'test@test.com' });
    await expect(
      registerUser.execute({ email: 'test@test.com', password: '123456', disclaimerAccepted: true })
    ).rejects.toThrow('Email already registered');
  });

  it('debe registrar el usuario correctamente', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.create.mockResolvedValue({
      toPublic: () => ({ id: '1', email: 'test@test.com', name: null }),
    });
    const result = await registerUser.execute({
      email: 'test@test.com',
      password: '123456',
      disclaimerAccepted: true,
    });
    expect(result).toEqual({ id: '1', email: 'test@test.com', name: null });
  });
});