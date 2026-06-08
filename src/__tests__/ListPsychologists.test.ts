import { ListPsychologists } from '../application/use-cases/marketplace/ListPsychologists';

const mockPsychologistRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
};

describe('ListPsychologists', () => {
  let listPsychologists: ListPsychologists;

  beforeEach(() => {
    jest.clearAllMocks();
    listPsychologists = new ListPsychologists(mockPsychologistRepository as any);
  });

  it('debe retornar lista de psicólogos', async () => {
    mockPsychologistRepository.findAll.mockResolvedValue([
      { id: '1', name: 'Dr. Test', specialty: 'Ansiedad' },
    ]);
    const result = await listPsychologists.execute();
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('name', 'Dr. Test');
  });

  it('debe retornar lista vacía si no hay psicólogos', async () => {
    mockPsychologistRepository.findAll.mockResolvedValue([]);
    const result = await listPsychologists.execute();
    expect(result).toHaveLength(0);
  });
});