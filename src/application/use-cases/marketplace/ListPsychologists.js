class ListPsychologists {
  constructor(psychologistRepository) {
    this.psychologistRepository = psychologistRepository;
  }

  async execute() {
    return this.psychologistRepository.findAll();
  }
}

module.exports = ListPsychologists;
