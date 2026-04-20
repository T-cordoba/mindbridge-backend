const GetEmotionMetrics = require('../../../application/use-cases/dashboard/GetEmotionMetrics');

class DashboardController {
  constructor(messageRepository, sessionRepository) {
    this.getEmotionMetrics = new GetEmotionMetrics(messageRepository, sessionRepository);
  }

  metrics = async (req, res, next) => {
    try {
      const days = parseInt(req.query.days || '30', 10);
      const data = await this.getEmotionMetrics.execute({ userId: req.user.id, days });
      res.json(data);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = DashboardController;
