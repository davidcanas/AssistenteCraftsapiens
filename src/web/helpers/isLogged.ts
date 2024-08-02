function isLogged(req, res, next) {
      if (req.isAuthenticated()) {
        return next();
      } else {
        return res.render("errors/401", { ip: req.ip, user: false});
      }
    }
export default isLogged;