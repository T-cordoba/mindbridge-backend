import { Psychologist } from '../entities/Psychologist';

export abstract class IPsychologistRepository {
  abstract findAll(): Promise<Psychologist[]>;
  abstract findById(id: string): Promise<Psychologist | null>;
}
