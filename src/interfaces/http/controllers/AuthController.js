const RegisterUser = require('../../../application/use-cases/auth/RegisterUser');
const LoginUser = require('../../../application/use-cases/auth/LoginUser');
const DeleteAccount = require('../../../application/use-cases/auth/DeleteAccount');

class AuthController {
  constructor(userRepository) {
    this._register = new RegisterUser(userRepository);
    this._login = new LoginUser(userRepository);
    this._deleteAccount = new DeleteAccount(userRepository);
  }

  register = async (req, res, next) => {
    try {
      const user = await this._register.execute(req.body);
      res.status(201).json({ user });
    } catch (err) {
      next(err);
    }
  };

  login = async (req, res, next) => {
    try {
      const result = await this._login.execute(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  me = (req, res) => {
    res.json({ user: req.user });
  };

  deleteAccount = async (req, res, next) => {
    try {
      await this._deleteAccount.execute({ userId: req.user.id });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = AuthController;
