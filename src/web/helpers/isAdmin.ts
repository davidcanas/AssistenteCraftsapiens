import client from '../../main';

function isAdmin(req, res, next) {
  if (req.user && client.allowedUsers.includes(req.user.id)) {
    return next();
  }

  return res.status(401).render('errors/401', { ip: req.ip, user: req.user});
}

export default isAdmin;