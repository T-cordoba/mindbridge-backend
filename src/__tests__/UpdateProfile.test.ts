import { UpdateProfile } from '../application/use-cases/auth/UpdateProfile';

const mockUserRepository = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('UpdateProfile', () => {
  let updateProfile: UpdateProfile;

  beforeEach(() => {
    jest.clearAllMocks();
    updateProfile = new UpdateProfile(mockUserRepository as any);
  });

  it('debe lanzar error si no hay campos a actualizar', async () => {
    await expect(
      updateProfile.execute({ userId: '123' })
    ).rejects.toThrow('No fields to update');
  });

  it('debe lanzar error si el email ya está en uso por otro usuario', async () => {
    mockUserRepository.findByEmail.mockResolvedValue({ id: '999', email: 'otro@test.com' });
    await expect(
      updateProfile.execute({ userId: '123', email: 'otro@test.com' })
    ).rejects.toThrow('Email already in use');
  });

  it('debe actualizar el nombre correctamente', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.update.mockResolvedValue({ id: '123', name: 'Nuevo Nombre', email: 'test@test.com' });
    const result = await updateProfile.execute({ userId: '123', name: 'Nuevo Nombre' });
    expect(result).toHaveProperty('name', 'Nuevo Nombre');
  });

  it('debe actualizar el email correctamente si no está en uso', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.update.mockResolvedValue({ id: '123', name: 'Test', email: 'nuevo@test.com' });
    const result = await updateProfile.execute({ userId: '123', email: 'nuevo@test.com' });
    expect(result).toHaveProperty('email', 'nuevo@test.com');
  });

  it('debe lanzar error si el usuario no existe', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.update.mockResolvedValue(null);
    await expect(
      updateProfile.execute({ userId: '123', name: 'Test' })
    ).rejects.toThrow('User not found');
  });
});