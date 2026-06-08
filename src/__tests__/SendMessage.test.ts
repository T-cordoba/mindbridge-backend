import { SendMessage } from '../application/use-cases/journal/SendMessage';
const mockSessionRepository = {
  findById: jest.fn(),
  update: jest.fn(),
  findLastCompletedByUserId: jest.fn(),
};

const mockMessageRepository = {
  findBySessionId: jest.fn(),
  create: jest.fn(),
};

const mockAiService = {
  chat: jest.fn(),
  generateTitle: jest.fn(),
  generateSummary: jest.fn(),
};

describe('SendMessage', () => {
    let sendMessage: SendMessage;
    beforeEach(() => {
        jest.clearAllMocks();
        sendMessage = new SendMessage(mockSessionRepository as any, mockMessageRepository as any, mockAiService as any);    });

    it('debe enviar un mensaje correctamente', async () => {
    mockSessionRepository.findById.mockResolvedValue({ 
        id: 'sess1', 
        userId: '123', 
        messageCount: 0,
        isBlocked: false,
        maxAlertLevel: 0,
        summary: null
    });
    mockMessageRepository.findBySessionId.mockResolvedValue([]);
    mockMessageRepository.create.mockResolvedValue({ id: 'msg1', content: 'Hello' });
    mockAiService.chat.mockResolvedValue({ 
        respuesta: 'Hola', 
        animo: [['joy', 5]], 
        alerta: 0 
    });
    mockAiService.generateTitle.mockResolvedValue('Nueva sesión');

    const result = await sendMessage.execute({ sessionId: 'sess1', userId: '123', content: 'Hello' });
    expect(result).toHaveProperty('userMessage');
    expect(result).toHaveProperty('assistantMessage');
    });

    it('debe lanzar error si la sesión no existe', async () => {
        mockSessionRepository.findById.mockResolvedValue(null);
        await expect(
            sendMessage.execute({ sessionId: 'sess1', userId: '123', content: 'Hello' })
        ).rejects.toThrow('Session not found');
    });

    it('debe lanzar error si el mensaje está vacío', async () => {
    await expect(
        sendMessage.execute({ sessionId: 'sess1', userId: '123', content: '' })
    ).rejects.toThrow('Message cannot be empty');
});

it('debe lanzar error si la sesion esta bloqueada', async () => {
    mockSessionRepository.findById.mockResolvedValue({ 
        id: 'sess1', 
        userId: '123', 
        messageCount: 0,
        isBlocked: true,
        maxAlertLevel: 0,
        summary: null
    });
    await expect(
        sendMessage.execute({ sessionId: 'sess1', userId: '123', content: 'Hello' })
    ).rejects.toThrow('Session is locked due to crisis detection');
});

it('debe lanzar error si el mensaje es muy largo', async () => {
    mockSessionRepository.findById.mockResolvedValue({
        id: 'sess1',
        userId: '123',
        messageCount: 0,
        isBlocked: false,
        maxAlertLevel: 0,
        summary: null
    });

    await expect(
        sendMessage.execute({
            sessionId: 'sess1',
            userId: '123',
            content: 'A'.repeat(4001)
        })
    ).rejects.toThrow('Message exceeds maximum length of 4000 characters');
});

});
