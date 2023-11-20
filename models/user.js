const bcrypt = require('bcryptjs');
const db = require('../config/database');

class User {
    constructor(username, email, password) {
        this.username = username;
        this.email = email;
        this.password = password;
    }

    save() {
        const hashedPassword = bcrypt.hashSync(this.password, 12);
        return new Promise((resolve, reject) => {
            db.query(
                'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                [this.username, this.email, hashedPassword],
                (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                }
            );
        });
    }

    static findByEmail(email) {
        return new Promise((resolve, reject) => {
            db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results[0]);
                }
            });
        });
    }
}

module.exports = User;
