import { Request, Response, NextFunction } from 'express';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { RegisterUser } from '../../../application/use-cases/auth/RegisterUser';
import { LoginUser } from '../../../application/use-cases/auth/LoginUser';
import { DeleteAccount } from '../../../application/use-cases/auth/DeleteAccount';
import { UpdateProfile } from '../../../application/use-cases/auth/UpdateProfile';
import { uploadAvatar as uploadAvatarToStorage } from '../../../infrastructure/storage/SupabaseStorageService';

export class AuthController {
  private _register: RegisterUser;
  private _login: LoginUser;
  private _deleteAccount: DeleteAccount;
  private _updateProfile: UpdateProfile;
  private _userRepository: IUserRepository;

  constructor(userRepository: IUserRepository) {
    this._userRepository = userRepository;
    this._register = new RegisterUser(userRepository);
    this._login = new LoginUser(userRepository);
    this._deleteAccount = new DeleteAccount(userRepository);
    this._updateProfile = new UpdateProfile(userRepository);
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

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this._userRepository.findById(req.user!.id);
      if (!user) { res.status(404).json({ error: 'User not found' }); return; }
      res.json({ user: user.toPublic() });
    } catch (err) {
      next(err);
    }
  };

  deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this._deleteAccount.execute({ userId: req.user!.id });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this._updateProfile.execute({ userId: req.user!.id, ...req.body });
      res.json({ user: user.toPublic() });
    } catch (err) {
      next(err);
    }
  };

  uploadAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
      const publicUrl = await uploadAvatarToStorage(req.file.buffer, req.file.mimetype);
      const updated = await this._userRepository.update(req.user!.id, { avatarUrl: publicUrl });
      res.json({ user: updated?.toPublic(), avatarUrl: publicUrl });
    } catch (err) {
      next(err);
    }
  };
}

export default AuthController;
