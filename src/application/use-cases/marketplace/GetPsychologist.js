class GetPsychologist {
  constructor(psychologistRepository) {
    this.psychologistRepository = psychologistRepository;
  }

  async execute({ id }) {
    const psychologist = await this.psychologistRepository.findById(id);
    if (!psychologist) throw new Error('Psychologist not found');
    return psychologist;
  }
}

module.exports = GetPsychologist;
