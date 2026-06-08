import { GetPsychologist } from '../application/use-cases/marketplace/GetPsychologist';

const mockPsychologistRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
};

describe('GetPsychologist', () => {
  let getPsychologist: GetPsychologist;

  beforeEach(() => {
    jest.clearAllMocks();
    getPsychologist = new GetPsychologist(mockPsychologistRepository as any);
  });

  it('debe retornar el psicólogo si existe', async () => {
    mockPsychologistRepository.findById.mockResolvedValue({ id: '1', name: 'Dr. Test' });
    const result = await getPsychologist.execute({ id: '1' });
    expect(result).toHaveProperty('name', 'Dr. Test');
  });

  it('debe lanzar error si el psicólogo no existe', async () => {
    mockPsychologistRepository.findById.mockResolvedValue(null);
    await expect(
      getPsychologist.execute({ id: '999' })
    ).rejects.toThrow();
  });
});