import { DeleteAccount } from '../application/use-cases/auth/DeleteAccount';

const mockUserRepository = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('DeleteAccount', () => {
  let deleteAccount: DeleteAccount;

  beforeEach(() => {
    jest.clearAllMocks();
    deleteAccount = new DeleteAccount(mockUserRepository as any);
  });

  it('debe lanzar error si el usuario no existe', async () => {
    mockUserRepository.findById.mockResolvedValue(null);
    await expect(
      deleteAccount.execute({ userId: '123' })
    ).rejects.toThrow('User not found');
  });

  it('debe eliminar el usuario si existe', async () => {
    mockUserRepository.findById.mockResolvedValue({ id: '123' });
    mockUserRepository.delete.mockResolvedValue(undefined);
    await expect(
      deleteAccount.execute({ userId: '123' })
    ).resolves.toBeUndefined();
    expect(mockUserRepository.delete).toHaveBeenCalledWith('123');
  });
});