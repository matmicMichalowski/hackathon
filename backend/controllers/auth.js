const { validationResult } = require('express-validator/check');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');

exports.signup = (req, res, next) => {
  const errors = validationResult(req);
  console.log({ errors })
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed.');
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;
  const login = req.body.login;
  const pupils = req.body.pupils;
  bcrypt
    .hash(password, 12)
    .then(hashedPw => {
      const user = new User({
        email: email,
        password: hashedPw,
        login: login,
        name: name,
        pupils: pupils
      });
      return user.save();
    })
    .then(result => {
      res.status(201).json({ message: 'User created!', userId: result._id });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;
  User.findOne({ $or: [{ login: email }, { email: email }] }).select('+password')
    .then(user => {
      if (!user) {
        const error = new Error('A user with this email/login could not be found.');
        error.statusCode = 401;
        throw error;
      }
      loadedUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then(isEqual => {
      if (!isEqual) {
        const error = new Error('Wrong password!');
        error.statusCode = 401;
        throw error;
      }
      const token = jwt.sign(
        {
          status: loadedUser.status,
          name: loadedUser.name,
          email: loadedUser.email,
          userId: loadedUser._id.toString()
        },
        'secretjwt',
        { expiresIn: '1h' }
      );
      res.status(200).json({ token: token, userId: loadedUser._id.toString(), name: loadedUser.name, email: loadedUser.email });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
