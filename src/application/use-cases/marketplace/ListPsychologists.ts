import { IPsychologistRepository } from '../../../domain/repositories/IPsychologistRepository';
import { Psychologist } from '../../../domain/entities/Psychologist';

export class ListPsychologists {
  constructor(private psychologistRepository: IPsychologistRepository) {}

  async execute(): Promise<Psychologist[]> {
    return this.psychologistRepository.findAll();
  }
}

export default ListPsychologists;
