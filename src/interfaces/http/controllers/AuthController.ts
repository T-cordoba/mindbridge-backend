import { Request, Response, NextFunction } from 'express';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { RegisterUser } from '../../../application/use-cases/auth/RegisterUser';
import { LoginUser } from '../../../application/use-cases/auth/LoginUser';
import { DeleteAccount } from '../../../application/use-cases/auth/DeleteAccount';

export class AuthController {
  private _register: RegisterUser;
  private _login: LoginUser;
  private _deleteAccount: DeleteAccount;

  constructor(userRepository: IUserRepository) {
    this._register = new RegisterUser(userRepository);
    this._login = new LoginUser(userRepository);
    this._deleteAccount = new DeleteAccount(userRepository);
  }

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this._register.execute(req.body);
      res.status(201).json({ user });
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this._login.execute(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  me = (req: Request, res: Response): void => {
    res.json({ user: req.user });
  };

  deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this._deleteAccount.execute({ userId: req.user!.id });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}

export default AuthController;
