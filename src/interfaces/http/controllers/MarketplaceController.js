const ListPsychologists = require('../../../application/use-cases/marketplace/ListPsychologists');
const GetPsychologist = require('../../../application/use-cases/marketplace/GetPsychologist');

class MarketplaceController {
  constructor(psychologistRepository) {
    this.listPsychologists = new ListPsychologists(psychologistRepository);
    this.getPsychologist = new GetPsychologist(psychologistRepository);
  }

  list = async (req, res, next) => {
    try {
      const psychologists = await this.listPsychologists.execute();
      res.json({ psychologists });
    } catch (err) {
      next(err);
    }
  };

  get = async (req, res, next) => {
    try {
      const psychologist = await this.getPsychologist.execute({ id: req.params.id });
      res.json({ psychologist });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = MarketplaceController;
