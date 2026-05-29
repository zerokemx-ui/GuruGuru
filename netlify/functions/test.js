const bcrypt = require('bcryptjs');

exports.handler = async function (event) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bcrypt_ok: typeof bcrypt.compareSync === 'function',
      test_hash: '$2b$10$1XiAlYke3zS7tsT1klwiBOrHkmpvtlVrOz9DaKQ/b/yJVD6hCjihi',
      test_password: 'admin123',
      result: bcrypt.compareSync('admin123', '$2b$10$1XiAlYke3zS7tsT1klwiBOrHkmpvtlVrOz9DaKQ/b/yJVD6hCjihi'),
    }),
  };
};
