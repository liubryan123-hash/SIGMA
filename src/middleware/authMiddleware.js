const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  // Intentar obtener el token del header Authorization
  let token = req.header('Authorization')?.split(' ')[1];
  
  // Si no hay header, intentar obtener de query params (para descargas directas)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(403).json({
      error: 'Acceso denegado. No se encontro un token de autorizacion.',
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload;
    return next();
  } catch (error) {
    return res.status(401).json({
      error: 'El token es invalido o ya expiro. Vuelve a iniciar sesion.',
    });
  }
};

const verificarSuperAdmin = (req, res, next) => {
  if (req.usuario?.rol === 'superadmin') {
    return next();
  }

  return res.status(403).json({
    error: 'Accion reservada para superadmin.',
  });
};

const verificarRoles = (...rolesPermitidos) => (req, res, next) => {
  if (!req.usuario) {
    return res.status(401).json({ error: 'No hay una sesion valida para esta accion.' });
  }

  if (rolesPermitidos.includes(req.usuario.rol)) {
    return next();
  }

  return res.status(403).json({
    error: `Accion no permitida para el rol "${req.usuario.rol}".`,
  });
};

module.exports = { verificarToken, verificarSuperAdmin, verificarRoles };
