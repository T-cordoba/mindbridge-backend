import { GetEmotionMetrics } from '../application/use-cases/dashboard/GetEmotionMetrics';

const mockMessageRepository = {
  findAssistantMessagesSince: jest.fn(),
};

const mockSessionRepository = {
  findByUserId: jest.fn(),
};

describe('GetEmotionMetrics', () => {
  let getEmotionMetrics: GetEmotionMetrics;

  beforeEach(() => {
    jest.clearAllMocks();
    getEmotionMetrics = new GetEmotionMetrics(mockMessageRepository as any, mockSessionRepository as any);
  });

  it('debe retornar métricas vacías si no hay sesiones', async () => {
    mockSessionRepository.findByUserId.mockResolvedValue({ sessions: [] });
    const result = await getEmotionMetrics.execute({ userId: '123', days: 30 });
    expect(result).toEqual({ emotions: [], alertTrend: [], wellbeingTrend: [], totalSessions: 0 });
  });

  it('debe retornar métricas si hay sesiones con mensajes', async () => {
    mockSessionRepository.findByUserId.mockResolvedValue({
      sessions: [{ id: 'session-1' }],
    });
    mockMessageRepository.findAssistantMessagesSince.mockResolvedValue([
      {
        createdAt: new Date('2024-01-15'),
        alertLevel: 2,
        moodData: [['joy', 8], ['sadness', 3]],
      },
    ]);
    const result = await getEmotionMetrics.execute({ userId: '123', days: 30 });
    expect(result).toHaveProperty('totalSessions', 1);
    expect(result.emotions.length).toBeGreaterThan(0);
    expect(result).toHaveProperty('alertTrend');
    expect(result).toHaveProperty('wellbeingTrend');
  });

  it('debe retornar métricas si hay sesiones pero sin mensajes', async () => {
    mockSessionRepository.findByUserId.mockResolvedValue({
      sessions: [{ id: 'session-1' }],
    });
    mockMessageRepository.findAssistantMessagesSince.mockResolvedValue([]);
    const result = await getEmotionMetrics.execute({ userId: '123', days: 30 });
    expect(result.totalSessions).toBe(1);
    expect(result.emotions).toHaveLength(0);
  });
});