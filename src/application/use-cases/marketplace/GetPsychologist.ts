import { IPsychologistRepository } from '../../../domain/repositories/IPsychologistRepository';
import { Psychologist } from '../../../domain/entities/Psychologist';

export class GetPsychologist {
  constructor(private psychologistRepository: IPsychologistRepository) {}

  async execute({ id }: { id: string }): Promise<Psychologist> {
    const psychologist = await this.psychologistRepository.findById(id);
    if (!psychologist) throw new Error('Psychologist not found');
    return psychologist;
  }
}

export default GetPsychologist;
