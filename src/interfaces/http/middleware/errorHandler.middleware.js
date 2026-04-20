const errorHandler = (err, req, res, next) => {
  console.error('[Error]', err.message);

  const knownErrors = {
    'Email already registered': 409,
    'Invalid credentials': 401,
    'Session not found': 404,
    'Psychologist not found': 404,
    'User not found': 404,
    'Session is locked due to crisis detection': 403,
    'Disclaimer must be accepted to use the journal': 400,
    'Session title cannot be empty': 400,
    'Session title exceeds maximum length of 200 characters': 400,
  };

  const status = knownErrors[err.message] || 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  res.status(status).json({ error: message });
};

module.exports = { errorHandler };
