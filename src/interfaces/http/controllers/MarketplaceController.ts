import { Request, Response, NextFunction } from 'express';
import { IPsychologistRepository } from '../../../domain/repositories/IPsychologistRepository';
import { ListPsychologists } from '../../../application/use-cases/marketplace/ListPsychologists';
import { GetPsychologist } from '../../../application/use-cases/marketplace/GetPsychologist';

export class MarketplaceController {
  private _listPsychologists: ListPsychologists;
  private _getPsychologist: GetPsychologist;

  constructor(psychologistRepository: IPsychologistRepository) {
    this._listPsychologists = new ListPsychologists(psychologistRepository);
    this._getPsychologist = new GetPsychologist(psychologistRepository);
  }

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const psychologists = await this._listPsychologists.execute();
      res.json({ psychologists });
    } catch (err) {
      next(err);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const psychologist = await this._getPsychologist.execute({ id: req.params.id });
      res.json({ psychologist });
    } catch (err) {
      next(err);
    }
  };
}

export default MarketplaceController;
