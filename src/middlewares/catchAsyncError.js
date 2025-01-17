const CatchAsyncError = (theFunc) => {
  return async (req, res, next) => {
    try {
      await theFunc(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { CatchAsyncError };